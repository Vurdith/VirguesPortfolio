"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { CornerMarks } from "@/components/CornerMarks";
import { CONSTELLATION_FORM_S, IntroConstellation } from "@/components/IntroConstellation";
import { useUiSounds } from "@/hooks/useUiSounds";
import { setIntroPhase } from "@/lib/introPhase";

// Just the snap: phones get a smaller file of the same film, everything else the full 1080p cut.
const INTRO_VIDEO = "/intro-snap-hq.mp4";
const INTRO_VIDEO_SMALL = "/intro-snap-720.mp4";
const INTRO_POSTER = "/intro-snap-poster.webp";
// The rest of the film's soundtrack after the snap, re-timed to the constellation: the snap rings
// out at its own speed, the quiet stretch is squeezed, and the swell breaks at CONSTELLATION_FORM_S.
const INTRO_TAIL = "/intro-snap-tail.m4a";
/** The tail opens with the film's last 50ms (a fade-in under the film's fade-out), so start it early. */
const TAIL_LEAD = 0.05;
/** Roughly how long play() takes to be heard. */
const TAIL_LATENCY = 0.03;
const EASE = [0.22, 1, 0.36, 1] as const;
const VIDEO_VOLUME = 0.8;

// The intro plays in full on every page load; this only stops it replaying when you navigate
// back to the home page inside the same visit.
let introSeenInRuntime = false;

function markIntroSeen() {
  introSeenInRuntime = true;
}

/** Phones, data-saver, slow links and small machines get the 720p film so it can start and keep up. */
function prefersSmallVideo() {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string; downlink?: number };
    deviceMemory?: number;
  };
  const connection = nav.connection;
  if (connection?.saveData) return true;
  if (connection?.effectiveType && connection.effectiveType !== "4g") return true;
  if (typeof connection?.downlink === "number" && connection.downlink > 0 && connection.downlink < 4) return true;
  if (nav.deviceMemory && nav.deviceMemory <= 4) return true;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return true;
  return false;
}

// How long the film gets to start, and to stall mid-play, before the intro moves on without it.
const START_TIMEOUT_MS = 8000;
const STALL_TIMEOUT_MS = 4000;
const MAX_INTRO_MS = 12000;

export function LoadingScene() {
  const [visible, setVisible] = React.useState(true);
  const [videoDone, setVideoDone] = React.useState(false);
  const [canEnter, setCanEnter] = React.useState(false);
  const videoFinishedRef = React.useRef(false);
  const playbackStartedRef = React.useRef(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const tailRef = React.useRef<HTMLAudioElement | null>(null);
  const tailStartedRef = React.useRef(false);
  const [tailPlaying, setTailPlaying] = React.useState(false);
  const reduceMotion = useReducedMotion() ?? false;
  const { enableByDefault, setMusicDucked } = useUiSounds();

  const finishVideo = React.useCallback(() => {
    if (videoFinishedRef.current) return;

    videoFinishedRef.current = true;
    videoRef.current?.pause();
    setVideoDone(true);
    setIntroPhase("loader");
    enableByDefault();
  }, [enableByDefault]);

  // A film playing with sound carries straight on into its tail. One that was cut short (error,
  // stall, timeout) or ran muted just stops.
  const startTail = React.useCallback((from: number) => {
    const video = videoRef.current;
    const tail = tailRef.current;
    if (tailStartedRef.current || videoFinishedRef.current || !video || !tail || video.muted) return;
    tailStartedRef.current = true;
    tail.volume = VIDEO_VOLUME;
    tail.currentTime = from;
    setTailPlaying(true);
    tail.play().catch(() => setTailPlaying(false));
  }, []);

  // Watch the film's last moments frame by frame so the tail starts under its fade-out, not after.
  React.useEffect(() => {
    if (videoDone) return;
    let frame = 0;
    const watch = () => {
      const video = videoRef.current;
      if (video && !video.paused && Number.isFinite(video.duration) && video.duration - video.currentTime <= TAIL_LEAD + TAIL_LATENCY) {
        startTail(0);
        return;
      }
      frame = window.requestAnimationFrame(watch);
    };
    frame = window.requestAnimationFrame(watch);
    return () => window.cancelAnimationFrame(frame);
  }, [videoDone, startTail]);

  const endVideo = React.useCallback(() => {
    // Missed the early start (a hidden tab throttles frames): skip the overlap and go now.
    startTail(TAIL_LEAD);
    finishVideo();
  }, [startTail, finishVideo]);

  /** The constellation keeps time by the tail while it plays, so the swell and the picture agree. */
  const tailClock = React.useCallback(() => {
    const tail = tailRef.current;
    if (!tail || tail.paused || tail.ended) return null;
    return tail.currentTime - TAIL_LEAD;
  }, []);

  // The intro has its own soundtrack, so keep the ambient bed out of its way until it is over.
  const duckMusic = visible && (!videoDone || tailPlaying);
  React.useEffect(() => {
    if (!duckMusic) return;
    setMusicDucked(true);
    return () => setMusicDucked(false);
  }, [duckMusic, setMusicDucked]);

  // Coming back to the home page within the same visit goes straight to the site. Otherwise the
  // page behind the intro stays quiet until the film is over.
  React.useLayoutEffect(() => {
    if (introSeenInRuntime) {
      videoFinishedRef.current = true;
      videoRef.current?.pause();
      setIntroPhase("done");
      setVisible(false);
    } else {
      setIntroPhase("video");
    }
    return () => setIntroPhase("done");
  }, []);

  // Starts the film once. Sound first; browsers that refuse it get it muted, and anything that
  // still refuses skips the film instead of leaving the poster on screen.
  const startPlayback = React.useCallback(() => {
    const video = videoRef.current;
    if (!video || videoFinishedRef.current || playbackStartedRef.current) return;
    playbackStartedRef.current = true;

    video.volume = VIDEO_VOLUME;
    video.muted = false;
    video
      .play()
      .catch(() => {
        video.muted = true;
        return video.play();
      })
      .catch(finishVideo);
  }, [finishVideo]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || videoFinishedRef.current) return;
    const alreadySmall = video.currentSrc.includes("720") || window.matchMedia("(max-width: 767px)").matches;
    if (!alreadySmall && prefersSmallVideo()) {
      video.src = INTRO_VIDEO_SMALL;
      video.load();
    }
    startPlayback();
  }, [startPlayback]);

  // A film that never starts, or freezes, must not hold the whole site hostage: watch it and
  // move on. Errors raised before React attached its listeners are missed, so poll the element.
  React.useEffect(() => {
    if (videoDone) return;
    const STEP = 500;
    let waited = 0;
    let stalledFor = 0;
    let lastTime = -1;
    let retried = false;

    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      waited += STEP;

      if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        finishVideo();
        return;
      }

      if (!video.paused && video.currentTime > 0.05) {
        stalledFor = video.currentTime === lastTime ? stalledFor + STEP : 0;
        lastTime = video.currentTime;
        if (stalledFor >= STALL_TIMEOUT_MS) finishVideo();
      } else {
        // Not playing yet: one more muted attempt halfway, then give up.
        if (!retried && waited >= START_TIMEOUT_MS / 2) {
          retried = true;
          video.muted = true;
          video.play().catch(() => {});
        }
        if (waited >= START_TIMEOUT_MS) finishVideo();
      }

      if (waited >= MAX_INTRO_MS) finishVideo();
    }, STEP);
    return () => window.clearInterval(timer);
  }, [videoDone, finishVideo]);

  React.useEffect(() => {
    const unmuteAfterGesture = () => {
      const video = videoRef.current;
      if (!video || videoDone) return;

      video.muted = false;
      video.volume = VIDEO_VOLUME;
      video.play().catch(() => {});
    };

    window.addEventListener("pointerdown", unmuteAfterGesture, { once: true });
    window.addEventListener("keydown", unmuteAfterGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unmuteAfterGesture);
      window.removeEventListener("keydown", unmuteAfterGesture);
    };
  }, [videoDone]);

  const enterSite = React.useCallback(() => {
    if (!canEnter) return;
    markIntroSeen();
    setIntroPhase("done");
    setVisible(false);
  }, [canEnter]);

  // Enter or Space works from anywhere once the button is showing.
  React.useEffect(() => {
    if (!canEnter || !visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        enterSite();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEnter, visible, enterSite]);

  // The name forms after the snap; the way in appears as soon as it is whole.
  React.useEffect(() => {
    if (!videoDone) return;
    const timer = window.setTimeout(() => setCanEnter(true), reduceMotion ? 0 : CONSTELLATION_FORM_S * 1000);
    return () => window.clearTimeout(timer);
  }, [videoDone, reduceMotion]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden bg-void"
          initial={{ opacity: 1 }}
          // The fade-out must not swallow the first click on the page underneath.
          exit={{
            opacity: 0,
            pointerEvents: "none",
            transition: { duration: 0.24, ease: EASE },
          }}
        >
          <AnimatePresence>
            {!videoDone ? (
              <motion.video
                ref={videoRef}
                key="intro-video"
                className="h-full w-full object-cover"
                poster={INTRO_POSTER}
                autoPlay
                playsInline
                preload="auto"
                onEnded={endVideo}
                onError={finishVideo}
                onCanPlay={startPlayback}
                onPlay={(event) => {
                  if (!videoFinishedRef.current) return;
                  event.currentTarget.pause();
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.18, ease: EASE },
                }}
              >
                {/* A failing <source> reports on itself, not on the <video>, so listen here too. */}
                <source src={INTRO_VIDEO_SMALL} type="video/mp4" media="(max-width: 767px)" onError={finishVideo} />
                <source src={INTRO_VIDEO} type="video/mp4" onError={finishVideo} />
              </motion.video>
            ) : null}
          </AnimatePresence>

          <audio
            ref={tailRef}
            src={INTRO_TAIL}
            preload="auto"
            onEnded={() => setTailPlaying(false)}
            onError={() => setTailPlaying(false)}
          />

          {videoDone ? (
            <>
              <IntroConstellation reduceMotion={reduceMotion} clock={tailClock} />
              <p className="sr-only">Virguê</p>
              <div className="absolute inset-x-0 top-[67%] flex justify-center">
                <AnimatePresence>
                  {canEnter ? (
                    <motion.button
                      key="enter"
                      type="button"
                      initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.5, ease: EASE }}
                      onClick={enterSite}
                      className="group relative border border-line/20 bg-void/55 px-8 py-3 text-[11px] tracking-[0.3em] text-ink transition-colors hover:border-line/40 hover:bg-void"
                    >
                      ENTER SITE
                      <CornerMarks
                        size={2}
                        tone="border-line/40"
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>
            </>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
