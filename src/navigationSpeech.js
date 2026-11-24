import { Capacitor, registerPlugin } from '@capacitor/core'

const nativeSpeech = registerPlugin('NavigationSpeech')
const android = Capacitor.getPlatform() === 'android'

export function canSpeakDirections() {
  return android ? Capacitor.isPluginAvailable('NavigationSpeech')
    : Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance)
}

export function speakDirection(text, onUnavailable) {
  if (android) {
    let active = true
    nativeSpeech.speak({ text }).then(
      () => { if (active) onUnavailable(false) },
      () => { if (active) onUnavailable(true) },
    )
    return () => {
      active = false
      nativeSpeech.stop().catch(() => {})
    }
  }

  const synthesis = window.speechSynthesis
  const utterance = new window.SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.onstart = () => onUnavailable(false)
  utterance.onerror = ({ error }) => {
    if (error !== 'canceled' && error !== 'interrupted') onUnavailable(true)
  }
  synthesis.speak(utterance)
  return () => {
    utterance.onstart = null
    utterance.onerror = null
    synthesis.cancel()
  }
}
