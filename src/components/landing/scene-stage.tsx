"use client";

import { useEffect, useRef } from "react";
import type { SceneRecords } from "./data";
import { sceneCover, sceneOpacity, sceneProgress, setSceneListener } from "./scene/bus";
import type { EvidenceScene, Tier } from "./scene/evidence-scene";

const isForced = () => new URLSearchParams(window.location.search).get("webgl") === "force";

/**
 * Hardware WebGL only. Software rasterizers (SwiftShader, llvmpipe) cannot hold
 * a smooth frame rate for this scene, so those visitors keep the static
 * composition. `?webgl=force` overrides the check for testing.
 */
function hardwareWebGL() {
  try {
    const probe = document.createElement("canvas");
    const gl = (probe.getContext("webgl2") ?? probe.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return isForced() || !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

function deviceTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  if (small || (nav.hardwareConcurrency ?? 4) <= 4 || (nav.deviceMemory ?? 8) <= 4) return "low";
  return "high";
}

function cssFont(el: Element, variable: string, fallback: string) {
  const value = getComputedStyle(el).getPropertyValue(variable).trim();
  return value || fallback;
}

/**
 * Boots the evidence-room scene on idle, after the page is interactive, and
 * only when motion is allowed and hardware WebGL is present. Until (or unless)
 * the first frame renders, the server-rendered photograph is what visitors see.
 * Marks `<html data-scene="live">` once the scene is drawing.
 */
export function SceneStage({ records }: { records: SceneRecords }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (reduced.matches || nav.connection?.saveData) return;

    let scene: EvidenceScene | null = null;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    const update = () => {
      if (!scene) return;
      const covered = sceneCover.count > 0;
      scene.setTarget(sceneProgress(), covered ? 0 : sceneOpacity());
    };

    const teardown = () => {
      if (disposed) return;
      disposed = true;
      cleanups.forEach((fn) => fn());
      setSceneListener(null);
      scene?.dispose();
      scene = null;
      delete root.dataset.scene;
    };

    const boot = async () => {
      // Probed on idle, not during hydration: creating a GL context can stall on a busy GPU process.
      if (disposed || !hardwareWebGL()) return;
      try {
        const mod = await import("./scene/evidence-scene");
        if (disposed) return;
        const landing = canvas.closest(".landing") ?? document.body;
        const fonts = {
          mono: cssFont(landing, "--font-lp-mono", "monospace"),
          sans: cssFont(landing, "--font-lp-sans", "sans-serif"),
        };
        await Promise.all([
          document.fonts.load(`700 24px ${fonts.mono}`),
          document.fonts.load(`400 24px ${fonts.mono}`),
          document.fonts.load(`800 24px ${fonts.sans}`),
        ]).catch(() => undefined);
        const tier = deviceTier();
        canvas.dataset.tier = tier;
        let frameMark = 0;
        const created = await mod.createEvidenceScene(canvas, {
          records,
          fonts,
          images: { cotton: "/images/landing/tex-cotton.webp", manila: "/images/landing/tex-manila.webp" },
          tier,
          maxPixelRatio: tier === "high" ? 1.5 : 1.25,
          onFirstFrame: () => {
            root.dataset.scene = "live";
          },
          onFrame: (frames, progress) => {
            if (frames - frameMark >= 10) {
              frameMark = frames;
              canvas.dataset.frames = String(frames);
              canvas.dataset.progress = progress.toFixed(2);
            }
          },
          onDegrade: (level) => {
            canvas.dataset.quality = level;
            if (level === "off" && !isForced()) teardown();
          },
        });
        if (disposed) {
          created.dispose();
          return;
        }
        scene = created;
      } catch {
        teardown(); // chunk, texture or context failure: the photograph stays
        return;
      }

      const s = scene;
      if (new URLSearchParams(window.location.search).has("scenedebug")) {
        (window as unknown as { __cgScene?: EvidenceScene }).__cgScene = s;
      }

      const fine = window.matchMedia("(pointer: fine)").matches;
      if (fine) {
        const onMove = (e: PointerEvent) =>
          s.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1), true);
        const onLeave = () => s.setPointer(0, 0, false);
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          window.removeEventListener("pointermove", onMove);
          document.documentElement.removeEventListener("pointerleave", onLeave);
        });
      }

      const resize = () => s.resize(canvas.clientWidth, canvas.clientHeight);
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      const onVisibility = () => s.setRunning(document.visibilityState === "visible");
      document.addEventListener("visibilitychange", onVisibility);
      const onLost = (e: Event) => {
        e.preventDefault();
        teardown();
      };
      canvas.addEventListener("webglcontextlost", onLost);
      cleanups.push(() => {
        ro.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        canvas.removeEventListener("webglcontextlost", onLost);
      });

      setSceneListener(update);
      resize();
      update();
      s.setRunning(document.visibilityState === "visible");
    };

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void boot(), { timeout: 1500 })
      : window.setTimeout(() => void boot(), 300);
    cleanups.push(() => (window.cancelIdleCallback ? window.cancelIdleCallback(idle) : window.clearTimeout(idle)));

    const onMotionPref = () => reduced.matches && teardown();
    reduced.addEventListener("change", onMotionPref);
    cleanups.push(() => reduced.removeEventListener("change", onMotionPref));

    return teardown;
  }, [records]);

  return <canvas ref={canvasRef} className="lp-canvas" aria-hidden="true" />;
}
