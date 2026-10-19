import {useCallback, useEffect, useRef, useState} from 'react';

/**
 * Browser voice preview and live microphone level, shared by every studio.
 * `onState` receives 'speaking' | 'listening' | 'idle' so the studio can move the mascot.
 */
export default function useVoice({onState, onNotice}) {
  const [speaking, setSpeaking] = useState(false);
  const [mic, setMic] = useState(false);
  const [level, setLevel] = useState(0);
  const audio = useRef({});
  const utterance = useRef(null);
  // Word timing for renderers that approximate lip shapes from text.
  const speechCue = useRef({active: false});
  const mounted = useRef(true);
  const cb = useRef({onState, onNotice});
  cb.current = {onState, onNotice};

  const stopMic = useCallback(() => {
    audio.current.stream?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(audio.current.frame);
    audio.current.ctx?.close();
    audio.current = {};
    if (mounted.current) {
      setMic(false);
      setLevel(0);
    }
  }, []);

  const stopSpeech = useCallback(() => {
    speechCue.current = {active: false};
    if (utterance.current) {
      utterance.current.onend = null;
      utterance.current.onerror = null;
      utterance.current = null;
      window.speechSynthesis?.cancel();
    }
    if (mounted.current) setSpeaking(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopMic();
      stopSpeech();
    };
  }, [stopMic, stopSpeech]);

  async function toggleMic() {
    if (mic) {
      stopMic();
      cb.current.onState?.('idle');
      return;
    }
    stopSpeech();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      if (!mounted.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      const ctx = new AudioContext();
      await ctx.resume();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const values = new Uint8Array(analyser.fftSize);
      audio.current = {stream, ctx};
      const tick = () => {
        analyser.getByteTimeDomainData(values);
        const rms = Math.sqrt(values.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / values.length);
        setLevel(Math.min(1, rms * 7));
        audio.current.frame = requestAnimationFrame(tick);
      };
      tick();
      setMic(true);
      cb.current.onState?.('listening');
    } catch {
      stopMic();
      cb.current.onNotice?.('Microphone access is unavailable. Check browser permissions and try again.');
    }
  }

  function speak(text, {rate = 0.92, pitch = 1.1} = {}) {
    if (speaking) {
      stopSpeech();
      cb.current.onState?.('idle');
      return;
    }
    if (!window.speechSynthesis) {
      cb.current.onNotice?.('This browser does not support speech synthesis.');
      return;
    }
    stopMic();
    const u = new SpeechSynthesisUtterance(text);
    utterance.current = u;
    u.rate = rate;
    u.pitch = pitch;
    const finish = () => {
      utterance.current = null;
      speechCue.current = {active: false};
      if (mounted.current) {
        setSpeaking(false);
        cb.current.onState?.('idle');
      }
    };
    u.onstart = () => {
      speechCue.current = {active: true, text, index: 0, stamp: performance.now()};
      if (mounted.current) cb.current.onState?.('speaking');
    };
    u.onboundary = e => {
      if (e.name === 'word') speechCue.current = {active: true, text, index: e.charIndex, stamp: performance.now()};
    };
    u.onend = finish;
    u.onerror = e => {
      finish();
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        cb.current.onNotice?.('Voice playback is unavailable in this browser. Try a different browser or use the mouth controls.');
      }
    };
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }

  return {speaking, mic, level, speechCue, speak, toggleMic, stopAll: () => (stopMic(), stopSpeech())};
}
