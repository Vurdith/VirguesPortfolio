"use client";

import * as React from "react";

type Point = { x: number; y: number };

/**
 * Tracks the pointer over an element and reports it relative to the element's top-left corner and
 * its size. Updates are throttled to one per animation frame, and the bounding rect is read at
 * that moment, so the result stays correct if the page scrolls while hovering.
 */
export function usePointerTracking<T extends HTMLElement>({
  onFrame,
  onLeave,
}: {
  onFrame: (point: Point, size: { width: number; height: number }) => void;
  onLeave?: () => void;
}) {
  const frameRef = React.useRef<number | null>(null);
  const pointerRef = React.useRef<{ clientX: number; clientY: number } | null>(null);
  const elementRef = React.useRef<T | null>(null);

  // Keep the latest callbacks without re-creating the event handlers.
  const onFrameRef = React.useRef(onFrame);
  const onLeaveRef = React.useRef(onLeave);
  React.useEffect(() => {
    onFrameRef.current = onFrame;
    onLeaveRef.current = onLeave;
  });

  const cancel = React.useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  React.useEffect(() => cancel, [cancel]);

  const flush = React.useCallback(() => {
    frameRef.current = null;
    const element = elementRef.current;
    const pointer = pointerRef.current;
    if (!element || !pointer) return;

    const rect = element.getBoundingClientRect();
    onFrameRef.current(
      { x: pointer.clientX - rect.left, y: pointer.clientY - rect.top },
      { width: rect.width, height: rect.height },
    );
  }, []);

  const handleMove = React.useCallback(
    (event: React.PointerEvent<T>) => {
      elementRef.current = event.currentTarget;
      pointerRef.current = { clientX: event.clientX, clientY: event.clientY };
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(flush);
      }
    },
    [flush],
  );

  const handleLeave = React.useCallback(() => {
    cancel();
    elementRef.current = null;
    pointerRef.current = null;
    onLeaveRef.current?.();
  }, [cancel]);

  return {
    onPointerEnter: handleMove,
    onPointerMove: handleMove,
    onPointerLeave: handleLeave,
  };
}
