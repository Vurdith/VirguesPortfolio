"use client";

import * as React from "react";

import { useFinePointer } from "@/hooks/useFinePointer";

/**
 * A white take on the animated "Ember Signature" Windows cursors: a two-tone arrow with a light
 * sweep and a pulsing signature ring, a pointing hand that sends out ripples, an I-beam, resize
 * arrows, and badges for viewing, unavailable and busy. Every form is animated in globals.css.
 */
type CursorMode = "default" | "link" | "text" | "view" | "drag" | "disabled" | "busy";

const TEXT_FIELDS =
  'textarea, [contenteditable="true"], .cursor-text, input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="color"]):not([type="file"])';
const DISABLED = '[disabled], [aria-disabled="true"], .cursor-not-allowed';
const DRAG = 'input[type="range"], .cursor-grab, .cursor-grabbing, .cursor-ew-resize, .cursor-col-resize';
const BUSY = '[aria-busy="true"], .cursor-wait, .cursor-progress';
const INTERACTIVE =
  'a, button, select, [role="button"], [role="tab"], [role="link"], label, summary, input, .cursor-pointer';

function modeFor(target: EventTarget | null): CursorMode {
  if (!(target instanceof Element)) return "default";
  if (target.closest(DISABLED)) return "disabled";
  if (target.closest(TEXT_FIELDS)) return "text";
  if (target.closest(DRAG)) return "drag";
  if (target.closest('[data-cursor="view"]')) return "view";
  if (target.closest(BUSY)) return "busy";
  if (target.closest(INTERACTIVE)) return "link";
  return "default";
}

const INK = "#0b0b0d";

/** The outline is the same shape drawn first in ink, a little fatter. */
function Outlined({ children, width = 2.6 }: { children: React.ReactNode; width?: number }) {
  return (
    <>
      <g fill={INK} stroke={INK} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
      {children}
    </>
  );
}

/** The signature ring: an ink disc, a white ring, and a dot that breathes. */
function SignatureRing({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g className="vc-ring" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <circle cx={cx} cy={cy} r={3.5} fill={INK} />
      <circle cx={cx} cy={cy} r={2.4} fill="none" stroke="#fff" strokeWidth={1.15} />
      <circle className="vc-ring-dot" cx={cx} cy={cy} r={1.05} fill="#fff" style={{ transformOrigin: `${cx}px ${cy}px` }} />
    </g>
  );
}

const ARROW = "M4 3 L4 22.2 L8.9 17.8 L18.6 17.6 Z";
const HAND_SHAPES = (
  <>
    <rect x={9} y={3} width={4.6} height={15} rx={2.3} />
    <rect x={13.6} y={10.2} width={4.2} height={9} rx={2.1} />
    <rect x={17.8} y={11.2} width={4} height={8.5} rx={2} />
    <rect x={21.8} y={12.8} width={3.6} height={7.4} rx={1.8} />
    <path d="M9 15.5 H25.4 V21 C25.4 26.5 22.5 29 18 29 H14.5 C11.6 29 9.9 27.6 8.3 25.2 L4.6 19.6 C3.8 18.4 4.3 17.3 5.3 17 C6.3 16.7 7.2 17.2 7.9 18.2 L9 19.8 Z" />
  </>
);

export function CustomCursor() {
  const enabled = useFinePointer();
  const id = React.useId().replace(/:/g, "");
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const burstRef = React.useRef<HTMLSpanElement | null>(null);
  const [mode, setMode] = React.useState<CursorMode>("default");
  const [pressed, setPressed] = React.useState(false);
  const [inside, setInside] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    root.classList.add("has-custom-cursor");

    // Position goes straight onto the element: no spring, no React render, so it never lags.
    const onMove = (event: PointerEvent) => {
      const node = rootRef.current;
      if (node) node.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      setInside(true);
    };
    const onOver = (event: PointerEvent) => setMode(modeFor(event.target));
    const onDown = () => {
      setPressed(true);
      const burst = burstRef.current;
      if (!burst) return;
      burst.classList.remove("is-firing");
      void burst.offsetWidth;
      burst.classList.add("is-firing");
    };
    const onUp = () => setPressed(false);
    const onLeave = () => setInside(false);
    const onEnter = () => setInside(true);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerenter", onEnter);

    return () => {
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerenter", onEnter);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="vc-cursor"
      data-mode={mode}
      data-pressed={pressed ? "" : undefined}
      data-visible={inside ? "" : undefined}
      style={{ transform: "translate3d(-100px, -100px, 0)" }}
    >
      {/* Arrow: default, and the base for the view, unavailable and busy badges. Hotspot 4,3. */}
      <svg className="vc-layer vc-arrow" viewBox="0 0 32 32" style={{ left: -4, top: -3, transformOrigin: "4px 3px" }}>
        <defs>
          <clipPath id={`${id}-arrow`}>
            <path d={ARROW} />
          </clipPath>
          <linearGradient id={`${id}-sheen`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={ARROW} fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d="M4 3 L4 22.2 L8.9 17.8 Z" fill="#ffffff" />
        <path d="M4 3 L8.9 17.8 L18.6 17.6 Z" fill="#c9ced6" />
        <g clipPath={`url(#${id}-arrow)`}>
          <rect className="vc-sheen" x={-4} y={-6} width={7} height={44} fill={`url(#${id}-sheen)`} />
        </g>
        <SignatureRing cx={13.2} cy={23.8} />
      </svg>

      {/* Pointing hand with a ripple from the fingertip. Hotspot 11.3,3.5. */}
      <svg className="vc-layer vc-hand" viewBox="0 0 32 32" style={{ left: -11.3, top: -3.5, transformOrigin: "11.3px 3.5px" }}>
        <circle className="vc-ripple" cx={11.3} cy={5.2} r={3.4} fill="none" stroke="#fff" strokeWidth={1.3} style={{ transformOrigin: "11.3px 5.2px" }} />
        <circle className="vc-ripple vc-ripple-late" cx={11.3} cy={5.2} r={3.4} fill="none" stroke="#fff" strokeWidth={1} style={{ transformOrigin: "11.3px 5.2px" }} />
        <g className="vc-hand-body">
          <Outlined>
            <g fill="#fff">{HAND_SHAPES}</g>
          </Outlined>
          <g stroke="#a3a9b2" strokeWidth={0.7} strokeLinecap="round">
            <path d="M13.6 15.6 V19" />
            <path d="M17.8 16 V19.6" />
            <path d="M21.8 16.6 V20" />
          </g>
          <path d="M18.4 19.5 H25.4 V21 C25.4 26.5 22.5 29 18 29 Z" fill="#c9ced6" opacity={0.7} />
        </g>
      </svg>

      {/* I-beam with the signature ring at its centre. Hotspot 16,16. */}
      <svg className="vc-layer vc-beam" viewBox="0 0 32 32" style={{ left: -16, top: -16, transformOrigin: "16px 16px" }}>
        <path d="M12 5.5 H20 M16 5.5 V26.5 M12 26.5 H20" fill="none" stroke={INK} strokeWidth={4.4} strokeLinecap="round" />
        <path d="M12 5.5 H20 M16 5.5 V26.5 M12 26.5 H20" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        <SignatureRing cx={16} cy={16} />
      </svg>

      {/* Left-right arrows that breathe apart. Hotspot 16,16. */}
      <svg className="vc-layer vc-drag" viewBox="0 0 32 32" style={{ left: -16, top: -16, transformOrigin: "16px 16px" }}>
        <g className="vc-drag-left">
          <Outlined>
            <path d="M2.5 16 L9.5 9.8 V22.2 Z" fill="#fff" />
          </Outlined>
        </g>
        <g className="vc-drag-right">
          <Outlined>
            <path d="M29.5 16 L22.5 9.8 V22.2 Z" fill="#c9ced6" />
          </Outlined>
        </g>
        <SignatureRing cx={16} cy={16} />
      </svg>

      <span className="vc-tag">VIEW</span>

      <svg className="vc-badge vc-no" viewBox="0 0 16 16">
        <g className="vc-no-body" style={{ transformOrigin: "8px 8px" }}>
          <circle cx={8} cy={8} r={6.6} fill={INK} />
          <circle cx={8} cy={8} r={4.7} fill="none" stroke="#fff" strokeWidth={1.7} />
          <path d="M4.8 4.8 L11.2 11.2" stroke="#fff" strokeWidth={1.7} strokeLinecap="round" />
        </g>
      </svg>

      <svg className="vc-badge vc-busy" viewBox="0 0 16 16">
        <g className="vc-busy-orbit" style={{ transformOrigin: "8px 8px" }}>
          <circle cx={8} cy={2.6} r={2.4} fill="#fff" stroke={INK} strokeWidth={1.2} />
          <circle cx={13} cy={10.4} r={1.9} fill="#e6e9ee" stroke={INK} strokeWidth={1.2} />
          <circle cx={3.2} cy={10.8} r={1.4} fill="#c9ced6" stroke={INK} strokeWidth={1.2} />
        </g>
      </svg>

      <span ref={burstRef} className="vc-burst" />
    </div>
  );
}
