import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceNoteOptions {
  onResult?: (transcript: string) => void;
  language?: string;
}

interface VoiceNoteState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  clear: () => void;
}

export function useVoiceNote(options: UseVoiceNoteOptions = {}): VoiceNoteState {
  const { onResult, language = 'en-US' } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const start = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition not supported on this browser');
      return;
    }

    // Haptic feedback on start
    if ('vibrate' in navigator) navigator.vibrate(40);

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setInterimTranscript('');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text + ' ';
        } else {
          interim += text;
        }
      }
      if (final) {
        setTranscript((prev) => (prev + final).trim());
        onResult?.((transcript + final).trim());
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      setError(event.error === 'not-allowed' ? 'Microphone permission denied' : event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      if ('vibrate' in navigator) navigator.vibrate([20, 10, 20]);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, language, onResult, transcript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const clear = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  return { isListening, isSupported, transcript, interimTranscript, error, start, stop, clear };
}
