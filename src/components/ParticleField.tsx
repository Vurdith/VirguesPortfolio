"use client";

import * as React from "react";
import { motion } from "framer-motion";

const PARTICLE_COUNT = 15;

export function ParticleField() {
  const [particles, setParticles] = React.useState<number[]>([]);

  React.useEffect(() => {
    setParticles(Array.from({ length: PARTICLE_COUNT }).map((_, i) => i));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {particles.map((i) => (
        <Fairy key={i} />
      ))}
    </div>
  );
}

function Fairy() {
  const [target, setTarget] = React.useState({ 
    x: `${Math.random() * 100}%`, 
    y: `${Math.random() * 100}%` 
  });
  const [initialPos] = React.useState({
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`
  });

  React.useEffect(() => {
    const wander = () => {
      setTarget({
        x: `${Math.random() * 120 - 10}%`,
        y: `${Math.random() * 120 - 10}%`,
      });
    };

    wander();
    const interval = setInterval(wander, 10000 + Math.random() * 10000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ left: initialPos.x, top: initialPos.y }}
      animate={{ 
        left: target.x, 
        top: target.y,
      }}
      transition={{ 
        left: { duration: 15 + Math.random() * 15, ease: "linear" },
        top: { duration: 15 + Math.random() * 15, ease: "linear" },
      }}
      className="absolute h-[3px] w-[3px]"
    >
      <motion.div
        animate={{ 
          opacity: [0.2, 0.7, 0.2],
          scale: [0.8, 1.3, 0.8]
        }}
        transition={{ 
          duration: 4 + Math.random() * 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="h-full w-full rounded-full bg-white blur-[0.5px]"
        style={{
          boxShadow: "0 0 12px 3px rgba(255, 255, 255, 0.3)",
        }}
      />
    </motion.div>
  );
}

