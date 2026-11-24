package com.pixelpeople.campuspark.react;

import android.media.AudioAttributes;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

@CapacitorPlugin(name = "NavigationSpeech")
public class NavigationSpeechPlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private TextToSpeech engine;
    private PluginCall pending;
    private boolean initialized;
    private boolean available;

    @Override
    public void load() {
        main.post(() -> {
            engine = new TextToSpeech(getContext(), status -> main.post(() -> finishInitialization(status)));
        });
    }

    private void finishInitialization(int status) {
        if (engine == null) return;
        available = status == TextToSpeech.SUCCESS && engine.setLanguage(Locale.US) >= 0;
        initialized = true;
        if (available) {
            engine.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build());
        }
        speakPending();
    }

    @PluginMethod
    public void speak(PluginCall call) {
        main.post(() -> {
            clearPending();
            pending = call;
            if (initialized) speakPending();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        main.post(() -> {
            stopSpeech();
            call.resolve();
        });
    }

    private void speakPending() {
        if (pending == null) return;
        PluginCall call = pending;
        pending = null;
        if (!available || engine == null) {
            call.unavailable("The device has no English text-to-speech voice.");
            return;
        }
        String text = call.getString("text", "");
        if (engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, call.getCallbackId()) == TextToSpeech.SUCCESS) {
            call.resolve();
        } else {
            call.reject("Could not speak the navigation direction.");
        }
    }

    private void clearPending() {
        // A newer maneuver or a mute action supersedes any request waiting for initialization.
        if (pending == null) return;
        pending.resolve();
        pending = null;
    }

    private void stopSpeech() {
        clearPending();
        if (engine != null) engine.stop();
    }

    @Override
    protected void handleOnPause() {
        main.post(this::stopSpeech);
    }

    @Override
    protected void handleOnDestroy() {
        main.post(() -> {
            stopSpeech();
            if (engine != null) engine.shutdown();
            engine = null;
        });
    }
}
