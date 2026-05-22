"use client";

import * as React from "react";

const PARTICLE_COUNT = 10;

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

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function ParticleField() {
  const [particles, setParticles] = React.useState<Particle[]>([]);

  React.useEffect(() => {
    setParticles(
      Array.from({ length: PARTICLE_COUNT }, (_, id) => ({
        id,
        style: {
          "--x0": `${randomBetween(-6, 106)}vw`,
          "--y0": `${randomBetween(-6, 106)}vh`,
          "--x1": `${randomBetween(-6, 106)}vw`,
          "--y1": `${randomBetween(-6, 106)}vh`,
          "--drift": `${randomBetween(24, 42)}s`,
          "--glow": `${randomBetween(4, 8)}s`,
          "--delay": `${randomBetween(-18, 0)}s`,
        },
      }))
    );
  }, []);

  if (!particles.length) return null;

  return (
    <div className="particle-field pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {particles.map((particle) => (
        <span className="particle-dot" key={particle.id} style={particle.style} />
      ))}

      <style jsx>{`
        .particle-dot {
          position: absolute;
          left: 0;
          top: 0;
          height: 3px;
          width: 3px;
          border-radius: 999px;
          background: rgb(255 255 255 / 0.9);
          box-shadow: 0 0 12px 3px rgb(255 255 255 / 0.28);
          filter: blur(0.4px);
          transform: translate3d(var(--x0), var(--y0), 0);
          animation:
            particleDrift var(--drift) linear var(--delay) infinite alternate,
            particleGlow var(--glow) ease-in-out var(--delay) infinite;
          will-change: transform, opacity;
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
            opacity: 0.18;
            scale: 0.82;
          }
          50% {
            opacity: 0.62;
            scale: 1.25;
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
}
