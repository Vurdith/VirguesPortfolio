"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { CornerMarks } from "@/components/CornerMarks";
import { useUiSounds } from "@/hooks/useUiSounds";
import { setIntroPhase } from "@/lib/introPhase";

// Phones get a smaller file of the same film; everything else gets the full 1080p original.
const INTRO_VIDEO = "/intro-loader-hq.mp4";
const INTRO_VIDEO_SMALL = "/intro-loader-720.mp4";
const INTRO_POSTER = "/intro-poster.webp";
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
const MAX_INTRO_MS = 25000;

export function LoadingScene() {
  const [visible, setVisible] = React.useState(true);
  const [videoDone, setVideoDone] = React.useState(false);
  const [showLoader, setShowLoader] = React.useState(false);
  const [percent, setPercent] = React.useState(0);
  const videoFinishedRef = React.useRef(false);
  const playbackStartedRef = React.useRef(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canEnter = percent >= 100;
  const { enableByDefault, setMusicDucked } = useUiSounds();

  const finishVideo = React.useCallback(() => {
    if (videoFinishedRef.current) return;

    videoFinishedRef.current = true;
    videoRef.current?.pause();
    setVideoDone(true);
    setIntroPhase("loader");
    setMusicDucked(false);
    enableByDefault();
  }, [enableByDefault, setMusicDucked]);

  // The intro has its own soundtrack, so keep the ambient bed out of its way.
  React.useEffect(() => {
    if (!visible || videoDone) return;
    setMusicDucked(true);
    return () => setMusicDucked(false);
  }, [visible, videoDone, setMusicDucked]);

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

  // The loader fills on the clock, not by counting ticks, so a busy page can't stretch it out.
  React.useEffect(() => {
    if (!videoDone) return;

    setPercent(0);
    const startedAt = performance.now();
    const loaderDelay = window.setTimeout(() => setShowLoader(true), 520);
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt - 900;
      const next = elapsed <= 0 ? 0 : Math.min(100, Math.floor(elapsed / 50) * 4);
      setPercent(next);
      if (next >= 100) window.clearInterval(timer);
    }, 50);

    return () => {
      window.clearTimeout(loaderDelay);
      window.clearInterval(timer);
    };
  }, [videoDone]);

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
                onEnded={finishVideo}
                onError={finishVideo}
                onCanPlay={startPlayback}
                onPlay={(event) => {
                  if (!videoFinishedRef.current) return;
                  event.currentTarget.pause();
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.55, ease: EASE },
                }}
              >
                {/* A failing <source> reports on itself, not on the <video>, so listen here too. */}
                <source src={INTRO_VIDEO_SMALL} type="video/mp4" media="(max-width: 767px)" onError={finishVideo} />
                <source src={INTRO_VIDEO} type="video/mp4" onError={finishVideo} />
              </motion.video>
            ) : null}
          </AnimatePresence>

          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[35%] opacity-75"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.03) 28%, transparent 62%)",
              willChange: "transform",
            }}
            animate={{ x: ["-8%", "8%"], y: ["4%", "-4%"] }}
            transition={{ duration: 20, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:52px_52px]"
          />

          {showLoader ? (
            <div
              className="absolute inset-0 grid place-items-center"
            >
              <motion.div
                className="relative w-64 overflow-visible"
                initial={{ y: 22, scale: 0.92, filter: "blur(10px)" }}
                animate={{
                  y: 0,
                  scale: [0.92, 1.025, 1],
                  filter: ["blur(10px)", "blur(2px)", "blur(0px)"],
                }}
                transition={{ duration: 1.15, ease: EASE, times: [0, 0.78, 1] }}
                style={{
                  transformOrigin: "center center",
                  willChange: "transform, filter",
                }}
              >
                <div className="mb-3 flex items-baseline justify-between px-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold tracking-[0.4em] text-fog/45">
                      {canEnter ? "READY" : "INITIALIZING"}
                    </span>
                    {!canEnter ? (
                      <span className="text-[10px] tabular-nums tracking-[0.2em] text-ink/45">
                        {percent}%
                      </span>
                    ) : null}
                  </div>
                  <span className="font-serif text-sm italic text-ink/65">Virguê.</span>
                </div>

                <div className="relative h-px w-full bg-white/8">
                  <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                      className="h-full origin-left bg-ink/55"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: percent / 100 }}
                      transition={{ duration: 0.12, ease: "linear" }}
                    />
                  </div>

                  {percent > 0 ? (
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/18 blur-xl"
                      style={{ left: `${percent}%` }}
                      animate={{ opacity: [0.34, 0.82, 0.34], scale: [0.86, 1.12, 0.86] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : null}
                </div>

                <div className="mt-8 flex justify-center">
                  <AnimatePresence mode="wait">
                    {canEnter ? (
                      <motion.button
                        key="enter"
                        type="button"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.42, ease: EASE }}
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
                    ) : (
                      <motion.div
                        key="dots"
                        className="flex gap-1"
                        exit={{ opacity: 0 }}
                      >
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="h-1 w-1 rounded-full bg-ink/30"
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
