"use client";

import * as React from "react";

type OrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const clamp = (value: number) => Math.min(0.5, Math.max(-0.5, value));

/**
 * Touch-device stand-in for the mouse parallax: reports the phone's tilt as x/y in -0.5..0.5.
 * iOS only allows motion sensors after a user gesture, so permission is requested on the first
 * touch; Android and desktop browsers start immediately. Does nothing when `enabled` is false.
 */
export function useDeviceTilt(enabled: boolean, onTilt: (x: number, y: number) => void) {
  const handler = React.useRef(onTilt);
  React.useEffect(() => {
    handler.current = onTilt;
  }, [onTilt]);

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma == null || event.beta == null) return;
      // gamma: left/right tilt; beta: front/back, with ~45deg being a natural holding angle.
      handler.current(clamp(event.gamma / 40), clamp((event.beta - 45) / 40));
    };

    let listening = false;
    const listen = () => {
      if (listening) return;
      listening = true;
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
    };

    const ctor = window.DeviceOrientationEvent as OrientationConstructor;
    const onFirstTouch = () => {
      ctor
        .requestPermission?.()
        .then((state) => state === "granted" && listen())
        .catch(() => {});
    };

    if (typeof ctor.requestPermission === "function") {
      window.addEventListener("touchend", onFirstTouch, { once: true });
    } else {
      listen();
    }

    return () => {
      window.removeEventListener("touchend", onFirstTouch);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, [enabled]);
}
