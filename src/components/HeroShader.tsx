"use client";

import * as React from "react";
import { Mesh, Program, Renderer, Texture, Triangle } from "ogl";

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

/**
 * WebGL layer that renders `src` with a distortion that reacts to the pointer. It sits on top of a
 * static <Image>, fades in once the first frame is drawn, and never mounts where WebGL is
 * unavailable, so the fallback is always the plain image.
 */
export default function HeroShader({ src }: { src: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !canRunShader()) return;

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
    let loaded = false;
    const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, strength: 0, targetStrength: 0 };

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (disposed) return;
      texture.image = image;
      program.uniforms.uImg.value = [image.naturalWidth, image.naturalHeight];
      loaded = true;
      draw(performance.now());
      setReady(true);
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
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    function draw(now: number) {
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;
      pointer.strength *= 0.965; // decays when the pointer rests

      program.uniforms.uTime.value = now / 1000;
      program.uniforms.uMouse.value = [pointer.x, pointer.y];
      program.uniforms.uStrength.value = pointer.strength;
      renderer.render({ scene: mesh });
    }

    const loop = (now: number) => {
      frame = 0;
      if (disposed || !inView || document.hidden || !loaded) return;
      draw(now);
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(loop);
    };

    // Stop rendering once the hero scrolls away or the tab is hidden.
    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
    });
    visibility.observe(container);
    const onVisibility = () => !document.hidden && start();
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [src]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 transition-opacity duration-1000"
      style={{ opacity: ready ? 1 : 0 }}
    />
  );
}
