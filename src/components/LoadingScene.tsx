"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUiSounds } from "@/hooks/useUiSounds";

export function LoadingScene() {
  const [loading, setLoading] = React.useState(true);
  const [percent, setPercent] = React.useState(0);
  const [canEnter, setCanEnter] = React.useState(false);
  const { playHover, playClick, toggleMuted, muted } = useUiSounds();

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setCanEnter(true);
          return 100;
        }
        return prev + 1;
      });
    }, 10);

    return () => clearInterval(interval);
  }, []);

  const handleEnter = () => {
    playClick();
    // If it's muted (default), we toggle it ON to start the music
    if (muted) toggleMuted();
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            filter: "blur(20px)",
            transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-void"
        >
          {/* Progress Area */}
          <div className="relative w-64 overflow-visible">
            <div className="flex items-baseline justify-between mb-3 px-1">
              <div className="flex items-center gap-3">
                <motion.span 
                  className="text-[9px] font-bold tracking-[0.4em] text-fog/40"
                >
                  {canEnter ? "READY" : "INITIALIZING"}
                </motion.span>
                {!canEnter && (
                  <span className="text-[9px] tabular-nums tracking-[0.2em] text-ink/40">
                    {percent}%
                  </span>
                )}
              </div>
              <motion.span 
                className="font-serif text-sm italic text-ink/60"
              >
                Devion.
              </motion.span>
            </div>

            {/* High-End Progress Bar */}
            <div className="relative h-[1px] w-full bg-white/5">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: canEnter ? "100%" : `${percent}%` }}
                className="relative h-full bg-ink/40"
              >
                <motion.div 
                  className="absolute right-0 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 blur-xl"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </motion.div>
            </div>

            {/* Interaction Button */}
            <div className="mt-8 flex justify-center">
              <AnimatePresence mode="wait">
                {canEnter ? (
                  <motion.button
                    key="enter-btn"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onMouseEnter={playHover}
                    onClick={handleEnter}
                    className="group relative border border-line/20 bg-void/50 px-8 py-3 text-[10px] tracking-[0.3em] text-ink transition-colors hover:border-line/40 hover:bg-void"
                  >
                    ENTER SITE
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="absolute left-0 top-0 h-2 w-2 border-l border-t border-line/40" />
                      <span className="absolute right-0 top-0 h-2 w-2 border-r border-t border-line/40" />
                      <span className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-line/40" />
                      <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-line/40" />
                    </span>
                  </motion.button>
                ) : (
                  <motion.div 
                    key="loading-dots"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-1"
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="h-1 w-1 bg-ink/30 rounded-full"
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

