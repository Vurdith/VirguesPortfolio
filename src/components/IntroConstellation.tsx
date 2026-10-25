"use client";

import * as React from "react";

/**
 * After the snap the sky is let go: a star field rushes out of his fingers, and a burst of stars
 * settles into the name. Each letter of VIRGUÊ is its own small constellation, drawn like a plate
 * from a star atlas: hairline joins that stop short of each star, sharp diffraction spikes on the
 * brightest, and an orbit round the word that passes behind the letters, with a satellite riding
 * it. The sky charges with the soundtrack's swell and the whole name locks in on its break. Once
 * whole it stays alive: signals run along each letter, the sky turns slowly, the word has a little
 * depth as the mouse moves, and the stars nearest the mouse link up to it. No soft glows: every
 * mark is a point or a hairline. Everything is drawn on one canvas from two pre-rendered sprites.
 */

type Glyph = { w: number; stars: [number, number][]; edges: [number, number][] };

// Letters on a box one unit tall; widths are in the same units.
const GLYPHS: Glyph[] = [
  // V
  { w: 0.62, stars: [[0, 0], [0.14, 0.42], [0.31, 1], [0.47, 0.47], [0.62, 0]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  // I
  { w: 0, stars: [[0, 0], [0.01, 0.53], [0, 1]], edges: [[0, 1], [1, 2]] },
  // R
  {
    w: 0.56,
    stars: [[0, 1], [0, 0.5], [0, 0], [0.36, 0.03], [0.53, 0.25], [0.34, 0.49], [0.56, 1]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1], [5, 6]],
  },
  // G
  {
    w: 0.66,
    stars: [[0.62, 0.16], [0.36, 0], [0.08, 0.17], [0, 0.52], [0.14, 0.87], [0.4, 1], [0.64, 0.86], [0.66, 0.57], [0.38, 0.57]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]],
  },
  // U
  {
    w: 0.58,
    stars: [[0, 0], [0, 0.66], [0.13, 0.95], [0.45, 0.95], [0.58, 0.66], [0.58, 0]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
  // Ê: the circumflex is a three-star chevron of its own.
  {
    w: 0.5,
    stars: [[0.5, 0], [0, 0], [0, 0.5], [0, 1], [0.5, 1], [0.4, 0.5], [0.08, -0.21], [0.25, -0.35], [0.42, -0.21]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [6, 7], [7, 8]],
  },
];
const LETTER_GAP = 0.32;
const WORD_UNITS = GLYPHS.reduce((sum, glyph) => sum + glyph.w, 0) + LETTER_GAP * (GLYPHS.length - 1);

/** Where his fingers meet on the last frame of the film, as a fraction of the 16:9 frame. */
const SNAP = { x: 0.4, y: 0.5 };

const FLIGHT = 0.62;
const EDGE_DRAW = 0.26;
/** Seconds from the snap until the name is whole, and the soundtrack's swell breaks. */
export const CONSTELLATION_FORM_S = 1.25;
/** When the swell starts to build, on the same clock. */
const CHARGE_FROM = 0.78;

// Once whole: signals run through the letters (all at once on the lock, then staggered), and a
// light passes along the word now and then.
const PULSE_RUN = 1.1;
const PULSE_PERIOD = 3.4;
const SWEEP_PERIOD = 4.6;
const SWEEP_RUN = 1.5;
// The orbit draws itself in, then a satellite keeps going round it.
const ORBIT_START = 0.45;
const ORBIT_DRAW = 1.1;
const ORBIT_PERIOD = 13;
/** Radians a second the sky turns about a pole below the screen. */
const SKY_TURN = 0.0016;

const LINE = "rgb(214 226 255)";
const TINTS = ["rgb(205 218 255)", "rgb(255 255 255)", "rgb(255 233 208)"];

type Star = {
  x: number;
  y: number;
  z: number;
  size: number;
  anchor: boolean;
  delay: number;
  bend: number;
  twinkle: number;
  sx: number;
  sy: number;
};
type Edge = { a: number; b: number; start: number; letter: number; from: number; length: number };
type Dust = { x: number; y: number; r: number; phase: number; speed: number; delay: number; depth: number; tint: number; bright: boolean };
type Ray = { angle: number; reach: number; length: number; delay: number };

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const easeOutExpo = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const k = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(px - ax - dx * k, py - ay - dy * k);
}

/** The film is drawn with object-cover, so map its snap point the same way. */
function snapOrigin(width: number, height: number) {
  const scale = Math.max(width / 16, height / 9);
  const drawnW = 16 * scale;
  const drawnH = 9 * scale;
  return { x: (width - drawnW) / 2 + SNAP.x * drawnW, y: (height - drawnH) / 2 + SNAP.y * drawnH };
}

function buildScene(width: number, height: number) {
  const random = mulberry32(0x5eed);
  const wordWidth = Math.min(width * (width < 640 ? 0.84 : 0.7), 820);
  const unit = wordWidth / WORD_UNITS;
  const left = (width - wordWidth) / 2;
  const top = height * 0.44 - unit / 2;
  const origin = snapOrigin(width, height);

  const stars: Star[] = [];
  const edges: Edge[] = [];
  const letterLength: number[] = [];
  let cursor = 0;

  GLYPHS.forEach((glyph, letter) => {
    const base = stars.length;
    const degree = new Array(glyph.stars.length).fill(0);
    glyph.edges.forEach(([a, b]) => {
      degree[a] += 1;
      degree[b] += 1;
    });

    glyph.stars.forEach(([gx, gy], index) => {
      const jitterX = (random() - 0.5) * 0.03;
      const jitterY = (random() - 0.5) * 0.03;
      const angle = random() * Math.PI * 2;
      const spread = 10 + random() * 40;
      // Ends of strokes burn brightest, like the anchor stars of a real constellation.
      const anchor = degree[index] <= 1;
      stars.push({
        x: left + (cursor + gx + jitterX) * unit,
        y: top + (gy + jitterY) * unit,
        z: random() * 2 - 1,
        size: (anchor ? 1.25 : 0.9) + random() * 0.3,
        anchor,
        delay: 0.02 + letter * 0.055 + random() * 0.12,
        bend: (random() - 0.5) * 0.5,
        twinkle: random() * Math.PI * 2,
        sx: origin.x + Math.cos(angle) * spread,
        sy: origin.y + Math.sin(angle) * spread,
      });
    });

    let along = 0;
    glyph.edges.forEach(([a, b], index) => {
      const sa = stars[base + a];
      const sb = stars[base + b];
      const length = Math.hypot(sb.x - sa.x, sb.y - sa.y);
      // Every join is drawn before the lock, so the name is whole when the swell breaks.
      const start = Math.max(sa.delay, sb.delay) + FLIGHT * 0.7 + index * 0.012;
      edges.push({ a: base + a, b: base + b, start, letter, from: along, length });
      along += length;
    });
    letterLength.push(along);

    cursor += glyph.w + LETTER_GAP;
  });

  const word = { left, right: left + wordWidth, top: top - unit * 0.4, bottom: top + unit, cy: top + unit / 2 };

  // The star field: made a little wider than the screen so the turning sky never shows an edge.
  const reachMax = Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y));
  const dustCount = Math.round(Math.min(340, (width * height) / 4200));
  const dust: Dust[] = Array.from({ length: dustCount }, () => {
    const x = -width * 0.12 + random() * width * 1.24;
    const y = -height * 0.06 + random() * height * 1.12;
    const r = 0.3 + random() * random() * 1.3;
    return {
      x,
      y,
      r,
      phase: random() * Math.PI * 2,
      speed: 0.5 + random() * 1.8,
      delay: 0.02 + (Math.hypot(x - origin.x, y - origin.y) / reachMax) * 0.14 + random() * 0.05,
      depth: 0.2 + random() * 0.8,
      tint: random() < 0.22 ? 0 : random() < 0.82 ? 1 : 2,
      bright: r > 1.15 && random() < 0.6,
    };
  });

  // Hairline rays thrown out by the snap.
  const rays: Ray[] = Array.from({ length: 40 }, () => ({
    angle: random() * Math.PI * 2,
    reach: reachMax * (0.35 + random() * 0.75),
    length: 30 + random() * 140,
    delay: random() * 0.08,
  }));

  const orbit = {
    cx: left + wordWidth / 2,
    cy: word.cy + unit * 0.04,
    rx: Math.min(wordWidth * 0.6 + unit * 0.3, width * 0.47),
    ry: unit * 0.95,
    tilt: -0.05,
    from: Math.PI * 0.82,
  };

  return { stars, edges, letterLength, dust, rays, orbit, origin, unit, word, pole: { x: width * 0.5, y: height * 1.9 } };
}

function sprite(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  return canvas;
}

function makeSprites() {
  // The tight halo every point of light has; a few pixels, not a bloom.
  const point = sprite(32, 32, (ctx) => {
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.22, "rgba(255,255,255,0.55)");
    gradient.addColorStop(0.55, "rgba(214,226,255,0.07)");
    gradient.addColorStop(1, "rgba(214,226,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
  });

  // One diffraction ray, bright at the star and thinning out; drawn rotated, four to a star.
  const ray = sprite(128, 2, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 128, 0);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.12, "rgba(235,242,255,0.75)");
    gradient.addColorStop(0.5, "rgba(214,226,255,0.22)");
    gradient.addColorStop(1, "rgba(214,226,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 2);
  });

  return { point, ray };
}

type Props = {
  reduceMotion?: boolean;
  /** Seconds since the snap by the soundtrack, while it plays; the picture follows it. */
  clock?: () => number | null;
};

export function IntroConstellation({ reduceMotion = false, clock }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const sprites = makeSprites();
    let width = 0;
    let height = 0;
    let dpr = 1;
    let scene = buildScene(1, 1);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      scene = buildScene(width, height);
    };
    resize();
    window.addEventListener("resize", resize);

    // The sky leans a little away from the mouse; nearer layers lean further.
    const lean = { x: 0, y: 0, tx: 0, ty: 0 };
    const pointer = { x: 0, y: 0, active: false };
    const onPointer = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      if (reduceMotion) return;
      lean.tx = (event.clientX / width - 0.5) * 2;
      lean.ty = (event.clientY / height - 0.5) * 2;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    // Time is now minus `base`. While the soundtrack plays, `base` is eased onto its clock, so a
    // late start or a hiccup in the audio never leaves the picture ahead of the sound.
    let base = performance.now() / 1000 + (reduceMotion ? -4 : 0);
    const shootingRandom = mulberry32(7);
    let shooting: { x: number; y: number; vx: number; vy: number; born: number } | null = null;
    let nextShooting = 2.4;
    let frame = 0;

    const drawPoint = (x: number, y: number, core: number, alpha: number) => {
      ctx.globalAlpha = alpha * 0.6;
      ctx.drawImage(sprites.point, x - core * 4, y - core * 4, core * 8, core * 8);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, core, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawSpikes = (x: number, y: number, length: number, alpha: number, turn: number, thickness = 1) => {
      if (length < 2 || alpha <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(turn);
      ctx.globalAlpha = Math.min(1, alpha);
      for (let k = 0; k < 4; k += 1) {
        ctx.drawImage(sprites.ray, 0, -thickness / 2, length, thickness);
        ctx.rotate(Math.PI / 2);
      }
      ctx.restore();
    };

    const render = (now: number) => {
      const seconds = now / 1000;
      const heard = reduceMotion ? null : (clock?.() ?? null);
      if (heard !== null && heard > 0) base += (seconds - heard - base) * 0.25;
      // A frame's timestamp can be a little older than the moment this effect ran.
      const t = Math.max(0, seconds - base);
      const { stars, edges, letterLength, dust, rays, orbit, origin, unit, word, pole } = scene;
      const formed = t - CONSTELLATION_FORM_S;
      const alive = clamp01(formed / 0.6);
      // The swell builds the charge; the lock is the hit when it breaks, decaying fast.
      const charge = formed < 0 ? clamp01((t - CHARGE_FROM) / (CONSTELLATION_FORM_S - CHARGE_FROM)) ** 2 : 0;
      const lock = formed >= 0 && !reduceMotion ? Math.exp(-formed * 4.5) : 0;

      lean.x += (lean.tx - lean.x) * 0.06;
      lean.y += (lean.ty - lean.y) * 0.06;
      const wordDx = -lean.x * 10;
      const wordDy = -lean.y * 7 + Math.sin(t * 0.9) * 2.2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = LINE;
      ctx.lineCap = "round";

      // The snap: one hard frame of light, a lens cross, two rings and a spray of hairline rays.
      if (t < 1 && !reduceMotion) {
        if (t < 0.16) {
          ctx.globalAlpha = 0.16 * (1 - t / 0.16);
          ctx.fillRect(0, 0, width, height);
        }
        const cross = 1 - clamp01(t / 0.5);
        if (cross > 0) {
          ctx.save();
          ctx.translate(origin.x, origin.y);
          ctx.globalAlpha = cross;
          ctx.drawImage(sprites.ray, 0, -0.75, width * 0.4 * cross, 1.5);
          ctx.rotate(Math.PI);
          ctx.drawImage(sprites.ray, 0, -0.75, width * 0.4 * cross, 1.5);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(sprites.ray, 0, -0.5, height * 0.16 * cross, 1);
          ctx.rotate(Math.PI);
          ctx.drawImage(sprites.ray, 0, -0.5, height * 0.16 * cross, 1);
          ctx.restore();
          drawPoint(origin.x, origin.y, 2.2 * cross + 0.5, cross);
        }
        ctx.lineWidth = 1;
        for (const [lag, strength] of [[0, 0.6], [0.1, 0.28]] as const) {
          const q = clamp01((t - lag) / 0.7);
          if (q <= 0 || q >= 1) continue;
          ctx.globalAlpha = (1 - q) * strength;
          ctx.beginPath();
          ctx.arc(origin.x, origin.y, 12 + easeOutExpo(q) * Math.max(width, height) * 0.55, 0, Math.PI * 2);
          ctx.stroke();
        }
        for (const ray of rays) {
          const q = clamp01((t - ray.delay) / 0.75);
          if (q <= 0 || q >= 1) continue;
          const head = easeOutExpo(q) * ray.reach;
          const tail = Math.max(0, head - ray.length * (1 - q * 0.6));
          const cos = Math.cos(ray.angle);
          const sin = Math.sin(ray.angle);
          ctx.globalAlpha = (1 - q) * 0.55;
          ctx.beginPath();
          ctx.moveTo(origin.x + cos * tail, origin.y + sin * tail);
          ctx.lineTo(origin.x + cos * head, origin.y + sin * head);
          ctx.stroke();
        }
      }

      // The star field rushes out from the snap, then turns slowly with the sky. It brightens with
      // the swell and steps back around the word so the name always reads first.
      const turn = reduceMotion ? 0 : t * SKY_TURN;
      const turnCos = Math.cos(turn);
      const turnSin = Math.sin(turn);
      const lift = 1 + 0.6 * charge + 0.9 * lock;
      for (const d of dust) {
        const p = clamp01((t - d.delay) / 0.95);
        if (p <= 0) continue;
        const restX = pole.x + (d.x - pole.x) * turnCos - (d.y - pole.y) * turnSin - lean.x * 16 * d.depth;
        const restY = pole.y + (d.x - pole.x) * turnSin + (d.y - pole.y) * turnCos - lean.y * 12 * d.depth;
        const e = easeOutExpo(p);
        const x = origin.x + (restX - origin.x) * e;
        const y = origin.y + (restY - origin.y) * e;
        const shimmer = 0.4 + 0.6 * Math.sin(t * d.speed + d.phase) ** 2;
        const outside = Math.hypot(
          Math.max(word.left - x, 0, x - word.right),
          Math.max(word.top - y, 0, y - word.bottom),
        );
        const clear = 0.25 + 0.75 * clamp01(outside / (unit * 0.45));
        const alpha = Math.min(1, (0.3 + 0.5 * d.depth) * (p < 1 ? 1 : shimmer) * clear * lift);
        ctx.fillStyle = TINTS[d.tint];
        ctx.strokeStyle = TINTS[d.tint];
        if (p < 1) {
          const back = easeOutExpo(Math.max(0, p - 0.07));
          ctx.globalAlpha = alpha * 0.7 * (1 - p);
          ctx.lineWidth = d.r * 1.2;
          ctx.beginPath();
          ctx.moveTo(origin.x + (restX - origin.x) * back, origin.y + (restY - origin.y) * back);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fill();
        if (d.bright && p >= 1) drawSpikes(x, y, 4 + 6 * shimmer, alpha * 0.55, 0, 0.8);
      }
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = LINE;

      // A light that passes along the word now and then.
      const sweepT = formed - 0.3;
      const sweepLocal = sweepT >= 0 ? sweepT % SWEEP_PERIOD : -1;
      const sweepX =
        sweepLocal >= 0 && sweepLocal < SWEEP_RUN
          ? word.left - unit + easeInOut(sweepLocal / SWEEP_RUN) * (word.right - word.left + unit * 2)
          : null;
      const sweep = (x: number) => (sweepX === null ? 0 : Math.exp(-(((x - sweepX) / (unit * 0.45)) ** 2)));

      // Where each star is right now: flying in, or settled and floating with the word, nearer
      // stars leaning further so the name has a little depth.
      const positions = stars.map((star) => {
        const raw = clamp01((t - star.delay) / FLIGHT);
        const at = (q: number) => {
          const e = easeOutExpo(q);
          const tx = star.x + wordDx - lean.x * star.z * unit * 0.045;
          const ty = star.y + wordDy - lean.y * star.z * unit * 0.03;
          const dx = tx - star.sx;
          const dy = ty - star.sy;
          const arc = Math.sin(Math.PI * e) * star.bend;
          return { x: star.sx + dx * e - dy * arc, y: star.sy + dy * e + dx * arc };
        };
        return { raw, at, ...at(raw) };
      });
      const coreOf = (i: number) => Math.max(1.15, unit * 0.012) * stars[i].size;

      // How far a point is from the drawn letters, for the orbit to pass behind them.
      const letterClearance = (x: number, y: number) => {
        let nearest = Infinity;
        for (const edge of edges) {
          if (t < edge.start) continue;
          const a = positions[edge.a];
          const b = positions[edge.b];
          nearest = Math.min(nearest, distanceToSegment(x, y, a.x, a.y, b.x, b.y));
        }
        return clamp01((nearest - unit * 0.04) / (unit * 0.07));
      };

      // The orbit: an ellipse in perspective round the word, ticked like a dial, front half nearer,
      // broken wherever it passes behind a letter.
      const ox = orbit.cx + wordDx * 0.8;
      const oy = orbit.cy + wordDy * 0.8;
      const tiltCos = Math.cos(orbit.tilt);
      const tiltSin = Math.sin(orbit.tilt);
      const onOrbit = (angle: number) => {
        const ex = orbit.rx * Math.cos(angle);
        const ey = orbit.ry * Math.sin(angle);
        return { x: ox + ex * tiltCos - ey * tiltSin, y: oy + ex * tiltSin + ey * tiltCos };
      };
      const orbitAlpha = (angle: number) => (0.1 + 0.07 * Math.sin(angle)) * (1 + 1.5 * lock);
      const drawn = easeInOut(clamp01((t - ORBIT_START) / ORBIT_DRAW));
      if (drawn > 0) {
        const steps = Math.ceil(180 * drawn);
        const span = Math.PI * 2 * drawn;
        ctx.lineWidth = 1;
        let prev = onOrbit(orbit.from);
        for (let i = 1; i <= steps; i += 1) {
          const angle = orbit.from + (span * i) / steps;
          const next = onOrbit(angle);
          const clearance = letterClearance((prev.x + next.x) / 2, (prev.y + next.y) / 2);
          if (clearance > 0) {
            ctx.globalAlpha = orbitAlpha(angle) * clearance;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(next.x, next.y);
            ctx.stroke();
          }
          prev = next;
        }
        // Ticks every five degrees, longer every thirty, pointing outward.
        for (let deg = 0; deg < 360; deg += 5) {
          const angle = (deg * Math.PI) / 180;
          const offset = (((angle - orbit.from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          if (offset > span) continue;
          const at = onOrbit(angle);
          const clearance = letterClearance(at.x, at.y);
          if (clearance <= 0) continue;
          const nx0 = Math.cos(angle) / orbit.rx;
          const ny0 = Math.sin(angle) / orbit.ry;
          const nLen = Math.hypot(nx0, ny0);
          const nx = (nx0 * tiltCos - ny0 * tiltSin) / nLen;
          const ny = (nx0 * tiltSin + ny0 * tiltCos) / nLen;
          const length = deg % 30 === 0 ? 7 : 3;
          ctx.globalAlpha = orbitAlpha(angle) * (deg % 30 === 0 ? 1.6 : 1.1) * clearance;
          ctx.beginPath();
          ctx.moveTo(at.x, at.y);
          ctx.lineTo(at.x + nx * length, at.y + ny * length);
          ctx.stroke();
        }
      }

      // The lock: two thin rings thrown out from the word as the swell breaks.
      if (formed >= 0 && formed < 1.1 && !reduceMotion) {
        ctx.lineWidth = 1;
        for (const [lag, strength] of [[0, 0.5], [0.09, 0.22]] as const) {
          const q = clamp01((formed - lag) / 1);
          if (q <= 0 || q >= 1) continue;
          const grow = 0.55 + easeOutExpo(q) * 1.1;
          ctx.globalAlpha = (1 - q) ** 1.5 * strength;
          ctx.beginPath();
          ctx.ellipse(ox, oy, orbit.rx * grow, orbit.ry * grow, orbit.tilt, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // The stars nearest the mouse reach out to it.
      const probe = new Array(stars.length).fill(0);
      const reach = unit * 0.9;
      if (pointer.active && alive > 0) {
        const near = positions
          .map((pos, i) => ({ i, d: Math.hypot(pos.x - pointer.x, pos.y - pointer.y) }))
          .filter((n) => n.d < reach && n.d > 1)
          .sort((m, n) => m.d - n.d)
          .slice(0, 3);
        ctx.lineWidth = 1;
        for (const { i, d } of near) {
          const strength = (1 - d / reach) ** 1.5;
          probe[i] = strength;
          const pos = positions[i];
          const ux = (pos.x - pointer.x) / d;
          const uy = (pos.y - pointer.y) / d;
          const gap = coreOf(i) * 2.4 + 3;
          if (d < gap + 10) continue;
          ctx.globalAlpha = 0.75 * strength * alive;
          ctx.beginPath();
          ctx.moveTo(pointer.x + ux * 8, pointer.y + uy * 8);
          ctx.lineTo(pos.x - ux * gap, pos.y - uy * gap);
          ctx.stroke();
        }
      }

      // Joins: hairlines that stop short of each star, as on a chart, with a sharp point drawing
      // them. They are the brightest lines on screen so the letters read at a glance.
      ctx.lineWidth = Math.max(1.25, unit * 0.0075);
      for (const edge of edges) {
        const p = easeInOut(clamp01((t - edge.start) / EDGE_DRAW));
        if (p <= 0) continue;
        const a = positions[edge.a];
        const b = positions[edge.b];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const gapA = coreOf(edge.a) * 2.2 + 3;
        const gapB = coreOf(edge.b) * 2.2 + 3;
        if (length < gapA + gapB + 2) continue;
        const ux = (b.x - a.x) / length;
        const uy = (b.y - a.y) / length;
        const sx = a.x + ux * gapA;
        const sy = a.y + uy * gapA;
        const run = (length - gapA - gapB) * p;
        const lit = Math.max(sweep((a.x + b.x) / 2), (probe[edge.a] + probe[edge.b]) * 0.5, lock);
        const breathe = 0.9 + 0.1 * Math.sin(t * 1.4 + stars[edge.a].twinkle);
        ctx.globalAlpha = Math.min(1, (0.68 + 0.32 * lit) * breathe);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + ux * run, sy + uy * run);
        ctx.stroke();
        if (p < 1) drawPoint(sx + ux * run, sy + uy * run, 1.3, 1);
      }

      // Signals: a short bright stroke runs through the letters, every letter at once on the lock,
      // then one after another.
      if (formed > 0 && !reduceMotion) {
        const pointOn = (letter: number, s: number) => {
          const edge = edges.find((e) => e.letter === letter && s >= e.from && s <= e.from + e.length);
          if (!edge) return null;
          const q = (s - edge.from) / edge.length;
          const a = positions[edge.a];
          const b = positions[edge.b];
          return { x: a.x + (b.x - a.x) * q, y: a.y + (b.y - a.y) * q };
        };
        ctx.lineWidth = Math.max(1.4, unit * 0.011);
        GLYPHS.forEach((_, letter) => {
          let local = -1;
          if (formed < PULSE_RUN) local = formed;
          else {
            const since = formed - 2 - letter * 0.22;
            if (since >= 0) local = since % PULSE_PERIOD;
          }
          if (local < 0 || local > PULSE_RUN) return;
          const head = easeInOut(clamp01(local / PULSE_RUN)) * letterLength[letter];
          const fade = Math.sin(Math.PI * clamp01(local / PULSE_RUN));
          const step = unit * 0.022;
          let prev = pointOn(letter, head);
          if (prev) drawPoint(prev.x, prev.y, 1.4, fade);
          for (let k = 1; k <= 16 && prev; k += 1) {
            const s = head - k * step;
            if (s < 0) break;
            const next = pointOn(letter, s);
            if (!next) break;
            // Skip the jump between strokes that do not touch (the R's leg, the circumflex).
            if (Math.hypot(next.x - prev.x, next.y - prev.y) < step * 2.5) {
              ctx.globalAlpha = fade * (1 - k / 16) * 0.9;
              ctx.beginPath();
              ctx.moveTo(prev.x, prev.y);
              ctx.lineTo(next.x, next.y);
              ctx.stroke();
            }
            prev = next;
          }
        });
      }

      // Stars fly from the snap to their places, trailing a streak, and ring out as they land.
      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];
        const { raw, at, x, y } = positions[i];
        if (raw <= 0) continue;
        if (raw < 1) {
          const tail = at(Math.max(0, raw - 0.12));
          const gradient = ctx.createLinearGradient(x, y, tail.x, tail.y);
          gradient.addColorStop(0, "rgba(255,255,255,0.8)");
          gradient.addColorStop(1, "rgba(214,226,255,0)");
          ctx.strokeStyle = gradient;
          ctx.globalAlpha = 1 - raw * 0.6;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(tail.x, tail.y);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.strokeStyle = LINE;
        }
        const sinceLand = t - star.delay - FLIGHT;
        if (sinceLand > 0 && sinceLand < 0.5) {
          const q = sinceLand / 0.5;
          ctx.globalAlpha = (1 - q) * 0.45;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, unit * (0.02 + easeOutExpo(q) * 0.1), 0, Math.PI * 2);
          ctx.stroke();
        }

        const settled = raw >= 1;
        const lit = Math.max(sweep(x), probe[i]);
        const twinkle = settled ? 0.82 + 0.18 * Math.sin(t * 2.2 + star.twinkle) : 1;
        // Each star lands with a quick flash of its spikes; on the lock they all flash together.
        const land = settled ? Math.max(0, 1 - sinceLand / 0.35) : 0;
        const flash = Math.max(land, lock);
        const alpha = Math.min(1, (0.5 + raw * 0.5) * twinkle + 0.3 * lit + 0.3 * charge);
        const core = coreOf(i) * (1 + 0.45 * flash + 0.3 * lit);
        drawPoint(x, y, core, alpha);

        const spike =
          (star.anchor ? unit * 0.1 * star.size * (0.8 + 0.2 * Math.sin(t * 1.7 + star.twinkle)) * clamp01(sinceLand / 0.3) : 0) +
          unit * (star.anchor ? 0.26 : 0.16) * flash +
          unit * 0.08 * lit;
        drawSpikes(x, y, spike, alpha * (star.anchor ? 0.85 : 0.65), Math.sin(t * 0.25 + star.twinkle) * 0.12, star.anchor ? 1.1 : 0.9);
      }

      // The satellite: the orbit's drawing point, which keeps going once the orbit is closed.
      if (drawn > 0) {
        const after = reduceMotion ? 0 : Math.max(0, t - ORBIT_START - ORBIT_DRAW);
        const speed = (Math.PI * 2) / ORBIT_PERIOD;
        const angle = orbit.from + Math.PI * 2 * drawn + speed * (after - (1 - Math.exp(-after * 3)) / 3);
        const head = onOrbit(angle);
        // Behind the word it dims and slips out of sight where a letter covers it.
        const depth = (0.55 + 0.45 * Math.sin(angle)) * (Math.sin(angle) < 0 ? letterClearance(head.x, head.y) : 1);
        if (depth > 0) {
          ctx.lineWidth = 1.2;
          let prev = head;
          for (let k = 1; k <= 30; k += 1) {
            const next = onOrbit(angle - k * 0.02);
            ctx.globalAlpha = depth * 0.7 * (1 - k / 30);
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(next.x, next.y);
            ctx.stroke();
            prev = next;
          }
          drawPoint(head.x, head.y, 1.5, depth);
          drawSpikes(head.x, head.y, 7 * depth, depth * 0.6, 0.785, 0.8);
        }
      }

      // Now and then a shooting star crosses the sky.
      if (!reduceMotion && t > nextShooting && !shooting) {
        const fromLeft = shootingRandom() < 0.5;
        shooting = {
          x: fromLeft ? shootingRandom() * width * 0.4 : width * (0.6 + shootingRandom() * 0.4),
          y: shootingRandom() * height * 0.25,
          vx: (fromLeft ? 1 : -1) * (520 + shootingRandom() * 320),
          vy: 170 + shootingRandom() * 140,
          born: t,
        };
      }
      if (shooting) {
        const age = t - shooting.born;
        if (age > 0.8) {
          shooting = null;
          nextShooting = t + 1.8 + shootingRandom() * 2.6;
        } else {
          const hx = shooting.x + shooting.vx * age;
          const hy = shooting.y + shooting.vy * age;
          const life = Math.sin((age / 0.8) * Math.PI);
          const gradient = ctx.createLinearGradient(hx, hy, hx - shooting.vx * 0.2, hy - shooting.vy * 0.2);
          gradient.addColorStop(0, "rgba(255,255,255,0.9)");
          gradient.addColorStop(1, "rgba(214,226,255,0)");
          ctx.globalAlpha = life;
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx - shooting.vx * 0.2, hy - shooting.vy * 0.2);
          ctx.stroke();
          ctx.strokeStyle = LINE;
          drawPoint(hx, hy, 1.1, life);
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [reduceMotion, clock]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}
