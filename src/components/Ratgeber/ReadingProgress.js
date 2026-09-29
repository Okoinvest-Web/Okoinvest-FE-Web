"use client";

import { useEffect, useState } from "react";

/**
 * Duenner Lesefortschritts-Balken am oberen Rand.
 * Rein dekorativ -> aria-hidden, damit Screenreader nicht gestoert werden.
 * Respektiert prefers-reduced-motion (kein Transition-Easing).
 */
export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = null;

    const update = () => {
      frame = null;
      const doc = document.documentElement;
      const scrollbar = doc.scrollHeight - doc.clientHeight;
      setProgress(scrollbar <= 0 ? 0 : (doc.scrollTop / scrollbar) * 100);
    };

    const onScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[120] h-[3px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-ov-400 to-ov-600 motion-safe:transition-[width] motion-safe:duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
