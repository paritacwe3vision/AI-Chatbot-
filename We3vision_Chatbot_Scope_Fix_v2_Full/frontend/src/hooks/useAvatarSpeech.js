import { useCallback, useEffect, useRef } from 'react'
import { SpeechPlayer } from '../services/speechPlayer.js'

export function useAvatarSpeech(enabled, dispatch) {
  const playerRef = useRef(null)
  if (!playerRef.current) {
    playerRef.current = new SpeechPlayer({
      onSpeaking: speaking => dispatch({ type: 'SET_SPEAKING', payload: speaking }),
      onError: error => dispatch({ type: 'SET_ERROR', payload: error }),
    })
  }
  const player = playerRef.current
  useEffect(() => { player.enabled = enabled; if (!enabled) player.stop() }, [enabled, player])
  useEffect(() => () => player.dispose(), [player])
  const stopTTS = useCallback(() => player.stop(), [player])
  const unlockAudioForAutomaticSpeech = useCallback(() => player.unlock(), [player])
  const enqueueStreamingSpeech = useCallback((text, lang) => player.enqueue(text, lang), [player])
  const speakText = useCallback((text, lang, onEnd) => {
    player.stop(); player.unlock(); player.enqueue(text, lang, onEnd)
  }, [player])
  return { player, stopTTS, unlockAudioForAutomaticSpeech, enqueueStreamingSpeech, speakText }
}
