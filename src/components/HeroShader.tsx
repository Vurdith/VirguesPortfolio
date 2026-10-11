"use client";

import * as React from "react";
import { Mesh, Program, Renderer, Texture, Triangle } from "ogl";

import { getIntroPhase, subscribeIntroPhase, useIntroPhase } from "@/lib/introPhase";

const VERTEX = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Slow liquid warp across the image, a ripple around the pointer, and a faint RGB split that
// follows the displacement. Everything is scaled by uStrength so it settles when the pointer rests.
const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uTex;
  uniform vec2 uRes;
  uniform vec2 uImg;
  uniform vec2 uMouse;
  uniform float uTime;
  uniform float uStrength;
  varying vec2 vUv;

  vec2 coverUv(vec2 uv) {
    vec2 ratio = vec2(
      min((uRes.x / uRes.y) / (uImg.x / uImg.y), 1.0),
      min((uRes.y / uRes.x) / (uImg.y / uImg.x), 1.0)
    );
    return vec2(
      uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
  }

  void main() {
    vec2 uv = vUv;

    vec2 warp = vec2(
      sin(uv.y * 6.0 + uTime * 0.35) + sin(uv.x * 3.0 - uTime * 0.2),
      cos(uv.x * 5.0 - uTime * 0.3) + cos(uv.y * 2.5 + uTime * 0.25)
    ) * 0.0035;

    vec2 toMouse = uv - uMouse;
    toMouse.x *= uRes.x / uRes.y;
    float dist = length(toMouse);
    float ripple = sin(dist * 34.0 - uTime * 3.2) * exp(-dist * 4.5) * uStrength;
    vec2 push = normalize(toMouse + 1e-5) * ripple * 0.018;

    vec2 disp = warp + push;
    float r = texture2D(uTex, coverUv(uv + disp * 1.7)).r;
    float g = texture2D(uTex, coverUv(uv + disp)).g;
    float b = texture2D(uTex, coverUv(uv + disp * 0.35)).b;

    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;

/** Whether this device should run the shader at all (otherwise the static image stays). */
function canRunShader() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return false;
  return true;
}

// The ambient warp is slow, so while the pointer rests it only needs half the frames. Any pointer
// movement goes back to the display's full rate.
const IDLE_FRAME_MS = 1000 / 30;
// Frames are tuned at 60fps; the pointer easing and decay are scaled by the real frame time.
const FRAME_MS = 1000 / 60;
// If most recent frames come in well over budget, render fewer pixels. Machines that keep up
// never trigger this, so they keep the full-resolution image.
const SLOW_WINDOW = 40;
const SLOW_SHARE = 0.6;
const MIN_DPR = 0.5;

/**
 * WebGL layer that renders `src` with a distortion that reacts to the pointer. It sits on top of a
 * static <Image>, fades in once the first frame is drawn, and never mounts where WebGL is
 * unavailable, so the fallback is always the plain image.
 */
export default function HeroShader({ src }: { src: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  // Under the intro film the shader is hidden, so it only warms up (loads the texture and draws
  // one frame) once the film is over, and starts animating when the site opens.
  const canInit = useIntroPhase() !== "video";

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !canRunShader()) return;

    if (!canInit) {
      const warm = new Image();
      warm.decoding = "async";
      warm.src = src;
      return;
    }

    let renderer: Renderer;
    try {
      renderer = new Renderer({ alpha: false, antialias: false, dpr: Math.min(window.devicePixelRatio, 1.5) });
    } catch {
      return; // WebGL unavailable: keep the static image.
    }

    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.className = "absolute inset-0 h-full w-full";
    container.appendChild(canvas);

    const texture = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR });
    const program = new Program(gl, {
      vertex: VERTEX,
      fragment: FRAGMENT,
      uniforms: {
        uTex: { value: texture },
        uRes: { value: [1, 1] },
        uImg: { value: [1, 1] },
        uMouse: { value: [0.5, 0.5] },
        uTime: { value: 0 },
        uStrength: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    let disposed = false;
    let inView = true;
    let frame = 0;
    let timer = 0;
    let loaded = false;
    let lastNow = 0;
    let slowFrames: boolean[] = [];
    const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, strength: 0 };

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (disposed) return;
      texture.image = image;
      program.uniforms.uImg.value = [image.naturalWidth, image.naturalHeight];
      loaded = true;
      draw(performance.now());
      setReady(true);
      // The visibility observer usually reports before the texture arrives and the loop stops
      // while nothing is loaded, so it has to be restarted here or the effect would stay frozen.
      start();
    };
    image.src = src;

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight);
      program.uniforms.uRes.value = [clientWidth, clientHeight];
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const onMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      pointer.strength = Math.min(1, pointer.strength + Math.hypot(x - pointer.targetX, y - pointer.targetY) * 6);
      pointer.targetX = x;
      pointer.targetY = y;
      start();
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // A lost GPU context leaves a dead canvas: fall back to the static image, then rebuild.
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setReady(false);
      window.setTimeout(() => !disposed && setAttempt((n) => n + 1), 300);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    function draw(now: number) {
      // Normalise to 60fps steps so the easing feels the same at 30, 60 or 144 frames a second.
      const steps = lastNow ? Math.min((now - lastNow) / FRAME_MS, 6) : 1;
      lastNow = now;
      pointer.x += (pointer.targetX - pointer.x) * (1 - Math.pow(1 - 0.08, steps));
      pointer.y += (pointer.targetY - pointer.y) * (1 - Math.pow(1 - 0.08, steps));
      pointer.strength *= Math.pow(0.965, steps); // decays when the pointer rests

      program.uniforms.uTime.value = now / 1000;
      program.uniforms.uMouse.value = [pointer.x, pointer.y];
      program.uniforms.uStrength.value = pointer.strength;
      renderer.render({ scene: mesh });
    }

    const isIdle = () =>
      pointer.strength < 0.02 &&
      Math.abs(pointer.targetX - pointer.x) < 0.002 &&
      Math.abs(pointer.targetY - pointer.y) < 0.002;

    // Counts frames that took far longer than their budget and, if most do, drops the resolution.
    const govern = (interval: number, budget: number) => {
      slowFrames.push(interval > budget * 1.6);
      if (slowFrames.length < SLOW_WINDOW) return;
      const share = slowFrames.filter(Boolean).length / slowFrames.length;
      slowFrames = [];
      if (share >= SLOW_SHARE && renderer.dpr > MIN_DPR) {
        renderer.dpr = Math.max(MIN_DPR, renderer.dpr * 0.8);
        resize();
      }
    };

    const loop = (now: number) => {
      frame = 0;
      if (disposed || !inView || document.hidden || !loaded) return;
      // Behind the intro there is nothing to see, so the first frame is all it needs.
      if (getIntroPhase() !== "done") return;

      const interval = lastNow ? now - lastNow : 0;
      const idle = isIdle();
      draw(now);
      if (interval) govern(interval, idle ? IDLE_FRAME_MS : FRAME_MS);

      if (idle) {
        timer = window.setTimeout(() => {
          timer = 0;
          if (!disposed) frame = requestAnimationFrame(loop);
        }, IDLE_FRAME_MS - 6);
      } else {
        frame = requestAnimationFrame(loop);
      }
    };
    function start() {
      if (disposed) return;
      if (timer) {
        window.clearTimeout(timer);
        timer = 0;
      }
      if (!frame) frame = requestAnimationFrame(loop);
    }

    // Stop rendering once the hero scrolls away or the tab is hidden.
    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
    });
    visibility.observe(container);
    const onVisibility = () => !document.hidden && start();
    document.addEventListener("visibilitychange", onVisibility);
    const unsubscribePhase = subscribeIntroPhase(start);
    start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      unsubscribePhase();
      resizeObserver.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [src, attempt, canInit]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 transition-opacity duration-1000"
      style={{ opacity: ready ? 1 : 0 }}
    />
  );
}
