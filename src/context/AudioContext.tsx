import { createContext, useContext, useState, useRef } from 'react';

// Howler hanya di-import secara lazy saat dibutuhkan untuk hindari
// AudioContext error spam sebelum ada interaksi user
interface AudioContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playBGM: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const bgmRef = useRef<any>(null); // lazy — dibuat saat pertama kali playBGM dipanggil

  // Lazy init: Howl dibuat hanya saat user pertama kali berinteraksi
  // Ini menghindari AudioContext error spam di console
  const getOrCreateBGM = async (): Promise<any> => {
    if (bgmRef.current) return bgmRef.current;

    const { Howl } = await import('howler');
    bgmRef.current = new Howl({
      src: ['https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3'],
      loop: true,
      volume: 0.3,
      html5: true,
    });
    return bgmRef.current;
  };

  const playBGM = async () => {
    try {
      const bgm = await getOrCreateBGM();
      if (!bgm.playing()) {
        bgm.mute(isMuted);
        bgm.play();
      }
    } catch {
      // Audio tidak tersedia — abaikan tanpa crash
    }
  };

  const toggleMute = async () => {
    setIsMuted(prev => {
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
