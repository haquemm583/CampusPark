package com.pixelpeople.campuspark.react;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NavigationSpeechPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
