"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useUiSounds } from "@/hooks/useUiSounds";

const INTRO_VIDEO = "/intro-loader-v2.mp4";
const EASE = [0.22, 1, 0.36, 1] as const;
const VIDEO_VOLUME = 0.8;

export function LoadingScene() {
  const [visible, setVisible] = React.useState(true);
  const [videoDone, setVideoDone] = React.useState(false);
  const [showLoader, setShowLoader] = React.useState(false);
  const [percent, setPercent] = React.useState(0);
  const musicStartedRef = React.useRef(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canEnter = percent >= 100;
  const { playHover, playClick, toggleMuted, muted } = useUiSounds();

  const finishVideo = React.useCallback(() => {
    setVideoDone(true);
    if (!musicStartedRef.current && muted) {
      musicStartedRef.current = true;
      toggleMuted();
    }
  }, [muted, toggleMuted]);

  const playIntroVideo = React.useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = VIDEO_VOLUME;

    try {
      await video.play();
    } catch {
      video.muted = true;
      await video.play().catch(finishVideo);
    }
  }, [finishVideo]);

  React.useEffect(() => {
    playIntroVideo();
  }, [playIntroVideo]);

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
    playClick();
    setVisible(false);
  }, [canEnter, playClick]);

  React.useEffect(() => {
    if (!videoDone) return;

    setPercent(0);
    let progressInterval: number | null = null;
    const loaderDelay = window.setTimeout(() => setShowLoader(true), 520);
    const progressDelay = window.setTimeout(() => {
      progressInterval = window.setInterval(() => {
        setPercent((previous) => {
          if (previous >= 100) {
            if (progressInterval !== null) {
              window.clearInterval(progressInterval);
            }
            return 100;
          }

          return Math.min(previous + 4, 100);
        });
      }, 50);
    }, 900);

    return () => {
      window.clearTimeout(loaderDelay);
      window.clearTimeout(progressDelay);
      if (progressInterval !== null) {
        window.clearInterval(progressInterval);
      }
    };
  }, [videoDone]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden bg-void"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.24, ease: EASE },
          }}
        >
          <AnimatePresence>
            {!videoDone ? (
              <motion.video
                ref={videoRef}
                key="intro-video"
                className="h-full w-full object-cover"
                src={INTRO_VIDEO}
                autoPlay
                playsInline
                preload="auto"
                onEnded={finishVideo}
                onError={finishVideo}
                onCanPlay={() => {
                  playIntroVideo();
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.55, ease: EASE },
                }}
              />
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
                    <span className="text-[9px] font-bold tracking-[0.4em] text-fog/45">
                      {canEnter ? "READY" : "INITIALIZING"}
                    </span>
                    {!canEnter ? (
                      <span className="text-[9px] tabular-nums tracking-[0.2em] text-ink/45">
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
                        onMouseEnter={playHover}
                        onClick={enterSite}
                        className="group relative border border-line/20 bg-void/55 px-8 py-3 text-[10px] tracking-[0.3em] text-ink transition-colors hover:border-line/40 hover:bg-void"
                      >
                        ENTER SITE
                        <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="absolute left-0 top-0 h-2 w-2 border-l border-t border-line/40" />
                          <span className="absolute right-0 top-0 h-2 w-2 border-r border-t border-line/40" />
                          <span className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-line/40" />
                          <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-line/40" />
                        </span>
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
