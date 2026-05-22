"use client";

import * as React from "react";

const PARTICLE_COUNT = 14;

type ParticleStyle = React.CSSProperties & {
  "--x0": string;
  "--y0": string;
  "--x1": string;
  "--y1": string;
  "--drift": string;
  "--glow": string;
  "--delay": string;
};

type Particle = {
  id: number;
  style: ParticleStyle;
};

function seededRandom(seed: number) {
  const value = Math.sin(seed * 999) * 10000;
  return value - Math.floor(value);
}

function seededBetween(seed: number, min: number, max: number) {
  return min + seededRandom(seed) * (max - min);
}

const PARTICLES: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, id) => ({
  id,
  style: {
    "--x0": `${seededBetween(id * 7 + 1, -6, 106)}vw`,
    "--y0": `${seededBetween(id * 7 + 2, -6, 106)}vh`,
    "--x1": `${seededBetween(id * 7 + 3, -6, 106)}vw`,
    "--y1": `${seededBetween(id * 7 + 4, -6, 106)}vh`,
    "--drift": `${seededBetween(id * 7 + 5, 24, 42)}s`,
    "--glow": `${seededBetween(id * 7 + 6, 4, 8)}s`,
    "--delay": `${seededBetween(id * 7 + 7, -18, 0)}s`,
  },
}));

export const ParticleField = React.memo(function ParticleField() {
  return (
    <div className="particle-field pointer-events-none fixed inset-0 z-[35] overflow-hidden">
      {PARTICLES.map((particle) => (
        <span className="particle-dot" key={particle.id} style={particle.style} />
      ))}

      <style jsx>{`
        .particle-field {
          contain: layout paint style;
        }

        .particle-dot {
          position: absolute;
          left: 0;
          top: 0;
          height: 3px;
          width: 3px;
          border-radius: 999px;
          background: rgb(255 255 255 / 0.9);
          box-shadow: 0 0 14px 4px rgb(255 255 255 / 0.34);
          filter: blur(0.25px);
          transform: translate3d(var(--x0), var(--y0), 0);
          animation:
            particleDrift var(--drift) linear var(--delay) infinite alternate,
            particleGlow var(--glow) ease-in-out var(--delay) infinite;
          will-change: transform, opacity;
          backface-visibility: hidden;
        }

        @keyframes particleDrift {
          from {
            transform: translate3d(var(--x0), var(--y0), 0);
          }
          to {
            transform: translate3d(var(--x1), var(--y1), 0);
          }
        }

        @keyframes particleGlow {
          0%,
          100% {
            opacity: 0.22;
            scale: 0.82;
          }
          50% {
            opacity: 0.78;
            scale: 1.38;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .particle-dot {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
});
