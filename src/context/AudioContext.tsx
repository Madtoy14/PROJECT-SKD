import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Howl } from 'howler';

interface AudioContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playBGM: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const bgmRef = useRef<Howl | null>(null);

  useEffect(() => {
    // Initialize the ambient BGM with a royalty-free lo-fi placeholder URL
    bgmRef.current = new Howl({
      src: ['https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3'], // Placeholder lo-fi URL
      loop: true,
      volume: 0.3,
      html5: true, // Use HTML5 Audio to allow playing large files
    });

    return () => {
      if (bgmRef.current) {
        bgmRef.current.unload();
      }
    };
  }, []);

  const playBGM = () => {
    if (bgmRef.current && !bgmRef.current.playing()) {
      bgmRef.current.play();
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (bgmRef.current) {
        bgmRef.current.mute(nextMuted);
      }
      return nextMuted;
    });
  };

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, playBGM }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
