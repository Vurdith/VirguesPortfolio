"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/cn";

const EASE = [0.2, 0.85, 0.2, 1] as const;
const WORD_STAGGER_S = 0.07;

/**
 * Section headline whose words rise out of a mask the first time it scrolls into view.
 */
export function RevealHeading({
  children,
  as = "h2",
  className,
}: {
  children: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const Tag = motion[as];
  const words = children.split(" ");

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ staggerChildren: reduceMotion ? 0 : WORD_STAGGER_S }}
    >
      {words.map((word, index) => (
        <React.Fragment key={`${word}-${index}`}>
          {index > 0 ? " " : null}
          {/* The padding keeps descenders from being clipped by the mask. */}
          <span className="inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span
              className={cn("inline-block will-change-transform")}
              variants={{
                hidden: { y: reduceMotion ? 0 : "110%", opacity: reduceMotion ? 1 : 0 },
                shown: { y: 0, opacity: 1 },
              }}
              transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
            >
              {word}
            </motion.span>
          </span>
        </React.Fragment>
      ))}
    </Tag>
  );
}
