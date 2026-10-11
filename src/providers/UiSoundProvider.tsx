"use client";

import * as React from "react";

type UiSoundApi = {
  muted: boolean;
  toggleMuted: () => void;
  /** Turns sound on unless the visitor has already made a choice (used by the intro). */
  enableByDefault: () => void;
  playHover: () => void;
  playClick: () => void;
  playClose: () => void;
  /** Very short, quiet tick for rapid UI motion such as scrambling text. */
  playTick: () => void;
  /** Low, slow swell played when a new section comes into focus. */
  playSwell: () => void;
  /** Lowers the ambient music while something louder (like the intro video) plays. */
  setMusicDucked: (ducked: boolean) => void;
};

const STORAGE_KEY = "ui:soundMuted";
const MUSIC_SRC = "/music/ambient.mp3";
const MUSIC_VOLUME = 0.06;
const MUSIC_DUCKED_VOLUME = 0.012;
const MUSIC_FADE_MS = 600;
const TICK_COOLDOWN_MS = 45;
const SWELL_COOLDOWN_MS = 900;
const HOVER_COOLDOWN_MS = 60;

/** Elements that make a UI sound when hovered or clicked. Opt out with data-sound="off". */
const SOUND_TARGETS = 'a[href], button, summary, [role="button"], [role="radio"]';

export const UiSoundContext = React.createContext<UiSoundApi | null>(null);

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function storeMuted(muted: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(muted));
  } catch {
    // Storage can be blocked; the preference just won't persist.
  }
}

function soundTargetFor(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null;
  const target = node.closest<HTMLElement>(SOUND_TARGETS);
  if (!target || target.dataset.sound === "off") return null;
  if (target instanceof HTMLButtonElement && target.disabled) return null;
  return target;
}

export function UiSoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = React.useState(true);

  // Refs keep the play functions stable, so consumers don't re-render when the mute state flips.
  const mutedRef = React.useRef(true);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const musicRef = React.useRef<HTMLAudioElement | null>(null);
  const lastHoverRef = React.useRef(0);
  const lastTickRef = React.useRef(0);
  const lastSwellRef = React.useRef(0);
  const duckedRef = React.useRef(false);
  const fadeFrameRef = React.useRef<number | null>(null);
  const hasChoiceRef = React.useRef(false);

  const getAudioContext = React.useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctor = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
      if (!Ctor) return null;
      audioCtxRef.current = new Ctor();
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const getMusic = React.useCallback(() => {
    if (!musicRef.current) {
      const audio = new Audio();
      audio.preload = "none";
      audio.src = MUSIC_SRC;
      audio.loop = true;
      audio.volume = duckedRef.current ? MUSIC_DUCKED_VOLUME : MUSIC_VOLUME;
      musicRef.current = audio;
    }
    return musicRef.current;
  }, []);

  const playTone = React.useCallback(
    (freq: number, duration: number, volume: number, delayMs = 0) => {
      if (mutedRef.current) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const start = ctx.currentTime + delayMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    },
    [getAudioContext],
  );

  const playHover = React.useCallback(() => {
    const now = performance.now();
    if (now - lastHoverRef.current < HOVER_COOLDOWN_MS) return;
    lastHoverRef.current = now;
    playTone(880, 0.08, 0.04);
  }, [playTone]);

  const playClick = React.useCallback(() => playTone(220, 0.15, 0.08), [playTone]);

  const playTick = React.useCallback(() => {
    const now = performance.now();
    if (now - lastTickRef.current < TICK_COOLDOWN_MS) return;
    lastTickRef.current = now;
    playTone(1760, 0.025, 0.012);
  }, [playTone]);

  const playSwell = React.useCallback(() => {
    if (mutedRef.current) return;
    const now = performance.now();
    if (now - lastSwellRef.current < SWELL_COOLDOWN_MS) return;
    lastSwellRef.current = now;

    const ctx = getAudioContext();
    if (!ctx) return;

    // A root and a fifth fade in slowly and out again: felt more than heard.
    const start = ctx.currentTime;
    const peak = start + 0.45;
    const end = start + 1.5;
    for (const [freq, volume] of [
      [98, 0.05],
      [147, 0.025],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, peak);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(end);
    }
  }, [getAudioContext]);

  const fadeMusicTo = React.useCallback((target: number) => {
    const music = musicRef.current;
    if (!music) return;
    if (fadeFrameRef.current !== null) cancelAnimationFrame(fadeFrameRef.current);

    const from = music.volume;
    const startedAt = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - startedAt) / MUSIC_FADE_MS, 1);
      music.volume = from + (target - from) * t;
      fadeFrameRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    fadeFrameRef.current = requestAnimationFrame(step);
  }, []);

  const setMusicDucked = React.useCallback(
    (ducked: boolean) => {
      duckedRef.current = ducked;
      fadeMusicTo(ducked ? MUSIC_DUCKED_VOLUME : MUSIC_VOLUME);
    },
    [fadeMusicTo],
  );

  const playClose = React.useCallback(() => {
    playTone(440, 0.1, 0.06);
    playTone(330, 0.15, 0.04, 50);
  }, [playTone]);

  const applyMuted = React.useCallback(
    (next: boolean, persist: boolean) => {
      mutedRef.current = next;
      setMuted(next);
      if (persist) {
        hasChoiceRef.current = true;
        storeMuted(next);
      }

      if (next) {
        musicRef.current?.pause();
        return;
      }
      getAudioContext();
      // Browsers may block this until the next gesture; the next toggle or click retries.
      getMusic()
        .play()
        .catch(() => {});
    },
    [getAudioContext, getMusic],
  );

  const toggleMuted = React.useCallback(() => applyMuted(!mutedRef.current, true), [applyMuted]);

  const enableByDefault = React.useCallback(() => {
    if (!hasChoiceRef.current && mutedRef.current) applyMuted(false, false);
  }, [applyMuted]);

  // There is no on-page sound switch any more, so forget any choice saved by an older version.
  React.useEffect(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // One delegated listener pair replaces per-element hover/click handlers across the site.
  React.useEffect(() => {
    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = soundTargetFor(event.target);
      if (!target) return;
      // Skip movement between children of the same target.
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
      playHover();
    };

    const onClick = (event: MouseEvent) => {
      // A click is a user gesture: retry music that autoplay rules blocked earlier.
      const music = musicRef.current;
      if (!mutedRef.current && music?.paused) music.play().catch(() => {});

      if (soundTargetFor(event.target)) playClick();
    };

    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("click", onClick, { passive: true });
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("click", onClick);
    };
  }, [playHover, playClick]);

  const value = React.useMemo<UiSoundApi>(
    () => ({
      muted,
      toggleMuted,
      enableByDefault,
      playHover,
      playClick,
      playClose,
      playTick,
      playSwell,
      setMusicDucked,
    }),
    [
      muted,
      toggleMuted,
      enableByDefault,
      playHover,
      playClick,
      playClose,
      playTick,
      playSwell,
      setMusicDucked,
    ],
  );

  return <UiSoundContext.Provider value={value}>{children}</UiSoundContext.Provider>;
}
