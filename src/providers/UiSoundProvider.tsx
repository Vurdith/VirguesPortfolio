"use client";

import * as React from "react";

type UiSoundApi = {
  muted: boolean;
  toggleMuted: () => void;
  playHover: () => void;
  playClick: () => void;
  playClose: () => void;
};

const STORAGE_KEY = "ui:soundMuted";

export const UiSoundContext = React.createContext<UiSoundApi | null>(null);

export function UiSoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = React.useState(true);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const musicRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) setMuted(raw === "true");
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    // Sync music state with mute
    if (musicRef.current) {
      if (muted) {
        musicRef.current.pause();
      } else {
        musicRef.current.play().catch(() => {
          // Browser blocked auto-play, wait for next interaction
        });
      }
    }
  }, [muted]);

  const initAudio = React.useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }

    // Initialize music track if not already
    if (!musicRef.current) {
      const audio = new Audio("/music/ambient.mp3");
      audio.loop = true;
      audio.volume = 0.06; // 50% quieter (was 0.12)
      musicRef.current = audio;
      if (!muted) {
        audio.play().catch(() => {});
      }
    }

    return audioCtxRef.current;
  }, [muted]);

  const playTone = React.useCallback(
    (freq: number, type: OscillatorType, duration: number, volume: number) => {
      if (muted) return;
      const ctx = initAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    },
    [muted, initAudio]
  );

  const playHover = React.useCallback(() => {
    playTone(880, "sine", 0.08, 0.04);
  }, [playTone]);

  const playClick = React.useCallback(() => {
    playTone(220, "sine", 0.15, 0.08);
  }, [playTone]);

  const playClose = React.useCallback(() => {
    const ctx = initAudio();
    if (muted) return;
    playTone(440, "sine", 0.1, 0.06);
    setTimeout(() => playTone(330, "sine", 0.15, 0.04), 50);
  }, [playTone, muted, initAudio]);

  const toggleMuted = React.useCallback(() => {
    setMuted((v) => {
      const next = !v;
      if (!next) initAudio();
      return next;
    });
  }, [initAudio]);

  const value = React.useMemo<UiSoundApi>(
    () => ({
      muted,
      toggleMuted,
      playHover,
      playClick,
      playClose,
    }),
    [muted, toggleMuted, playHover, playClick, playClose]
  );

  return <UiSoundContext.Provider value={value}>{children}</UiSoundContext.Provider>;
}


