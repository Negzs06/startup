"use client";

import { useEffect } from "react";

/**
 * Small client island for the landing page's non-3D behaviour. Everything it
 * does is an enhancement of server-rendered, already-visible content:
 *
 * - Pipeline steps: marks the step nearest the viewport centre as active and
 *   mirrors it on the sticky progress rail.
 * - Magnetic primary buttons (fine pointers only).
 * - Lenis smooth scrolling (fine pointers only), loaded on idle. In-page links
 *   still move keyboard focus to their target, as native anchors do.
 *
 * Under `prefers-reduced-motion: reduce` only the step highlighting runs.
 */
export function LandingMotion() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;

    // --- Pipeline steps -----------------------------------------------------
    const pipeline = document.querySelector<HTMLElement>("[data-pipeline]");
    if (pipeline && "IntersectionObserver" in window) {
      const steps = Array.from(pipeline.querySelectorAll<HTMLElement>("[data-step]"));
      const rail = Array.from(document.querySelectorAll<HTMLElement>("[data-rail-step]"));
      const setActive = (id: string) => {
        steps.forEach((s) => s.toggleAttribute("data-active", s.dataset.step === id));
        rail.forEach((r) => {
          const on = r.dataset.railStep === id;
          r.toggleAttribute("data-active", on);
          if (on) r.setAttribute("aria-current", "step");
          else r.removeAttribute("aria-current");
        });
      };
      pipeline.setAttribute("data-enhanced", "");
      setActive(steps[0]?.dataset.step ?? "");
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setActive((entry.target as HTMLElement).dataset.step ?? "");
          }
        },
        { rootMargin: "-45% 0px -45% 0px" },
      );
      steps.forEach((s) => io.observe(s));
      cleanups.push(() => {
        io.disconnect();
        pipeline.removeAttribute("data-enhanced");
      });
    }

    if (reduced || !fine) return () => cleanups.forEach((fn) => fn());

    // --- Magnetic buttons ---------------------------------------------------
    document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
      const onMove = (event: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        el.style.setProperty("--mx", `${Math.max(-8, Math.min(8, dx * 0.18))}px`);
        el.style.setProperty("--my", `${Math.max(-6, Math.min(6, dy * 0.3))}px`);
      };
      const onLeave = () => {
        el.style.setProperty("--mx", "0px");
        el.style.setProperty("--my", "0px");
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      });
    });

    // --- Smooth scrolling ---------------------------------------------------
    let cancelled = false;
    let destroyLenis: (() => void) | undefined;
    const start = async () => {
      let Lenis: typeof import("lenis").default;
      try {
        Lenis = (await import("lenis")).default;
      } catch {
        return; // native scrolling stays
      }
      if (cancelled) return;
      const lenis = new Lenis({ autoRaf: true, lerp: 0.12, wheelMultiplier: 1 });

      // Smooth in-page anchors, keeping native semantics: URL hash and focus.
      const onClick = (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
        if (!link) return;
        const id = decodeURIComponent(link.hash.slice(1));
        const target = id ? document.getElementById(id) : null;
        if (!target) return;
        event.preventDefault();
        history.pushState(null, "", `#${id}`);
        // Lenis honours the target's scroll-margin-top (set in landing.css for the fixed header).
        lenis.scrollTo(target, {
          onComplete: () => {
            if (!target.hasAttribute("tabindex") && !target.matches("a, button, input, select, textarea")) {
              target.setAttribute("tabindex", "-1");
            }
            target.focus({ preventScroll: true });
          },
        });
      };
      document.addEventListener("click", onClick);
      destroyLenis = () => {
        document.removeEventListener("click", onClick);
        lenis.destroy();
      };
    };
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void start(), { timeout: 2000 })
      : window.setTimeout(() => void start(), 500);
    cleanups.push(() => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      destroyLenis?.();
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
