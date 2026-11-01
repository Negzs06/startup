"use client";

import { useEffect, useRef, useState } from "react";
import type { ParticleScene, SceneState } from "./particle-scene";

type Stop = SceneState & { pos: number };

function webglAvailable() {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Particle budget by device class: fewer on small, low-core or low-memory devices. */
function particleBudget() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  if (small || cores <= 4 || memory <= 4) return 7000;
  return 18000;
}

/**
 * Sections opt into the scene with `data-scene="progress offsetX opacity"`.
 * Each one holds its state while it fills the viewport; the scene blends
 * between neighbours while one hands over to the next.
 */
function collectStops(): Stop[] {
  const vh = window.innerHeight;
  const wide = window.innerWidth >= 1024;
  const stops: Stop[] = [];
  document.querySelectorAll<HTMLElement>("[data-scene]").forEach((el) => {
    const [progress = 0, offsetX = 0, opacity = 1] = (el.dataset.scene ?? "").split(/\s+/).map(Number);
    const rect = el.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const bottom = top + rect.height;
    const state = {
      progress,
      offsetX: wide ? offsetX : 0,
      opacity: wide ? opacity : opacity * Number(el.dataset.sceneNarrow ?? 0.7),
    };
    const start = top - vh * 0.5;
    stops.push({ ...state, pos: start }, { ...state, pos: Math.max(start, bottom - vh * 0.9) });
  });
  return stops.sort((a, b) => a.pos - b.pos);
}

function sample(stops: Stop[], y: number): SceneState {
  if (!stops.length) return { progress: 0, offsetX: 0, opacity: 1 };
  if (y <= stops[0].pos) return stops[0];
  for (let i = 1; i < stops.length; i++) {
    const b = stops[i];
    if (y <= b.pos) {
      const a = stops[i - 1];
      const t = b.pos === a.pos ? 1 : (y - a.pos) / (b.pos - a.pos);
      return {
        progress: a.progress + (b.progress - a.progress) * t,
        offsetX: a.offsetX + (b.offsetX - a.offsetX) * t,
        opacity: a.opacity + (b.opacity - a.opacity) * t,
      };
    }
  }
  return stops[stops.length - 1];
}

export function SceneStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  const liveRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (reduced.matches || nav.connection?.saveData || !webglAvailable()) return;

    let scene: ParticleScene | null = null;
    let disposed = false;
    let stops: Stop[] = [];
    let measureQueued = 0;
    const cleanups: Array<() => void> = [];

    // The poster shows the finished seal; it gives way once the live seal forms.
    const poster = canvas.parentElement?.querySelector<HTMLElement>(".lp-stage-poster") ?? null;
    let posterOpacity = -1;
    const update = () => {
      if (!scene) return;
      const state = sample(stops, window.scrollY);
      scene.setTarget(state);
      const t = Math.min(1, Math.max(0, (state.progress - 0.25) / 0.35));
      const next = Math.round((1 - t * t * (3 - 2 * t)) * 100) / 100;
      if (poster && liveRef.current && next !== posterOpacity) {
        posterOpacity = next;
        poster.style.opacity = String(next * 0.9);
      }
    };
    const measure = () => {
      measureQueued = 0;
      stops = collectStops();
      if (scene && canvas) scene.resize(canvas.clientWidth, canvas.clientHeight);
      update();
    };
    const queueMeasure = () => {
      if (!measureQueued) measureQueued = requestAnimationFrame(measure);
    };

    const teardown = () => {
      if (disposed) return;
      disposed = true;
      cleanups.forEach((fn) => fn());
      scene?.dispose();
      scene = null;
      liveRef.current = false;
      setLive(false);
      const poster = canvas.parentElement?.querySelector<HTMLElement>(".lp-stage-poster");
      if (poster) poster.style.opacity = "";
    };

    const boot = async () => {
      let mod: typeof import("./particle-scene");
      try {
        mod = await import("./particle-scene");
      } catch {
        return; // chunk failed to load: the poster stays, nothing else changes
      }
      if (disposed) return;
      try {
        const count = particleBudget();
        canvas.dataset.particles = String(count);
        scene = mod.createParticleScene(canvas, {
          count,
          onDegrade: () => {
            canvas.dataset.degraded = "";
          },
          maxPixelRatio: 1.5,
          onFirstFrame: () => {
            liveRef.current = true;
            setLive(true);
            update();
          },
        });
      } catch {
        return; // context creation failed: keep the poster
      }

      const fine = window.matchMedia("(pointer: fine)").matches;
      const onPointer = (event: PointerEvent) => {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -((event.clientY / window.innerHeight) * 2 - 1);
        scene?.setPointer(x, y, true);
      };
      const onLeave = () => scene?.setPointer(0, 0, false);
      if (fine) {
        window.addEventListener("pointermove", onPointer, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          window.removeEventListener("pointermove", onPointer);
          document.documentElement.removeEventListener("pointerleave", onLeave);
        });
      }

      const onVisibility = () => scene?.setRunning(document.visibilityState === "visible");
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", queueMeasure);
      const observer = new ResizeObserver(queueMeasure);
      observer.observe(document.body);
      cleanups.push(() => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("scroll", update);
        window.removeEventListener("resize", queueMeasure);
        observer.disconnect();
        if (measureQueued) cancelAnimationFrame(measureQueued);
      });

      const onLost = (event: Event) => {
        event.preventDefault();
        teardown();
      };
      canvas.addEventListener("webglcontextlost", onLost);
      cleanups.push(() => canvas.removeEventListener("webglcontextlost", onLost));

      measure();
      scene.setRunning(document.visibilityState === "visible");
    };

    // Start after the page is idle so the scene never competes with first paint.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void boot(), { timeout: 1500 })
      : window.setTimeout(() => void boot(), 300);
    cleanups.push(() => (window.cancelIdleCallback ? window.cancelIdleCallback(idle) : window.clearTimeout(idle)));

    const onMotionPref = () => {
      if (reduced.matches) teardown();
    };
    reduced.addEventListener("change", onMotionPref);
    cleanups.push(() => reduced.removeEventListener("change", onMotionPref));

    return teardown;
  }, []);

  return <canvas ref={canvasRef} className="lp-canvas" data-live={live || undefined} aria-hidden="true" />;
}
