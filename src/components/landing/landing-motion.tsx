"use client";

import { useEffect } from "react";
import { notifyScene, sceneCover, sceneSegments } from "./scene/bus";

/**
 * Scroll choreography for the landing page. Loads GSAP, ScrollTrigger,
 * SplitText and Lenis on idle (none of them are in the initial bundle) and
 * only when the visitor has not asked for reduced motion. Every effect
 * animates content that is already visible in the server HTML; if anything
 * here fails, the page stays a complete static composition.
 */
export function LandingMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      let gsapMod: typeof import("gsap");
      let stMod: typeof import("gsap/ScrollTrigger");
      let splitMod: typeof import("gsap/SplitText");
      let lenisMod: typeof import("lenis");
      try {
        [gsapMod, stMod, splitMod, lenisMod] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
          import("gsap/SplitText"),
          import("lenis"),
        ]);
      } catch {
        return;
      }
      if (cancelled) return;
      const gsap = gsapMod.gsap;
      const { ScrollTrigger } = stMod;
      const { SplitText } = splitMod;
      gsap.registerPlugin(ScrollTrigger, SplitText);

      // Layout switches to motion mode (pinned tracks) before triggers measure.
      root.dataset.motion = "on";

      // --- Lenis, wired to ScrollTrigger the documented way ------------------
      const fine = window.matchMedia("(pointer: fine)").matches;
      const Lenis = lenisMod.default;
      const lenis = fine ? new Lenis({ autoRaf: false, lerp: 0.12 }) : null;
      const tick = (time: number) => lenis?.raf(time * 1000);
      if (lenis) {
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
      }

      // In-page links: smooth with Lenis, but keep the hash and move focus like a native anchor.
      const onClick = (event: MouseEvent) => {
        if (
          !lenis ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
        if (!link) return;
        const id = decodeURIComponent(link.hash.slice(1));
        const target = id ? document.getElementById(id) : null;
        if (!target) return;
        event.preventDefault();
        history.pushState(null, "", `#${id}`);
        lenis.scrollTo(target, {
          onComplete: () => {
            if (!target.hasAttribute("tabindex") && !target.matches("a, button, input, select, textarea"))
              target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          },
        });
      };
      document.addEventListener("click", onClick);

      const ctx = gsap.context(() => {
        // --- Hero: the giant word zooms into the stem of its "I" ------------
        const hero = document.querySelector<HTMLElement>("[data-hero]");
        const words = gsap.utils.toArray<HTMLElement>(".giant-back, .giant-front");
        const back = document.querySelector<HTMLElement>(".giant-back");
        const front = document.querySelector<HTMLElement>(".giant-front");
        const photo = document.querySelector<HTMLElement>(".stage-photo");
        if (hero && back) {
          const origin = () => {
            const letter = back.querySelector<HTMLElement>("[data-zoom-letter]");
            if (!letter) return "50% 50%";
            const a = back.getBoundingClientRect();
            const l = letter.getBoundingClientRect();
            return `${l.left - a.left + l.width * 0.5}px ${l.top - a.top + l.height * 0.55}px`;
          };
          // Origin is measured before the timeline runs (letters are unscaled then).
          gsap.set(words, { transformOrigin: origin });
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.6,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                sceneSegments.heroExit = gsap.utils.clamp(0, 1, self.progress * 2.2);
                notifyScene();
              },
            },
          });
          tl.to(words, { scale: 70, ease: "power3.in", duration: 1 }, 0)
            .to(back, { color: "#e5391c", ease: "none", duration: 0.35 }, 0.45)
            .to(front ?? [], { opacity: 0, ease: "none", duration: 0.25 }, 0.15)
            .to(photo ?? [], { opacity: 0, ease: "none", duration: 0.4 }, 0.3)
            .set(words, { autoAlpha: 0 }, 1);
        }

        // --- Section headings: split-line mask reveals ------------------------
        gsap.utils.toArray<HTMLElement>(".split").forEach((el) => {
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 105,
                duration: 1,
                ease: "expo.out",
                stagger: 0.08,
                scrollTrigger: { trigger: el, start: "top 85%", once: true },
              }),
          });
        });

        // --- Count-ups for oversized numerals --------------------------------
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const end = Number(el.dataset.count);
          const prefix = el.dataset.countPrefix ?? "";
          const suffix = el.dataset.countSuffix ?? "";
          const state = { v: 0 };
          const render = () => (el.textContent = `${prefix}${Math.round(state.v)}${suffix}`);
          ScrollTrigger.create({
            trigger: el,
            start: "top 85%",
            once: true,
            onEnter: () => {
              render();
              gsap.to(state, { v: end, duration: 1.4, ease: "power2.out", onUpdate: render });
            },
          });
        });

        // --- Velocity marquee --------------------------------------------------
        const marquee = document.querySelector<HTMLElement>("[data-marquee]");
        const track = marquee?.querySelector<HTMLElement>(".marquee-track");
        if (marquee && track) {
          let x = 0;
          let speed = 0;
          let skew = 0;
          let visible = false;
          ScrollTrigger.create({
            trigger: marquee,
            start: "top bottom",
            end: "bottom top",
            onToggle: (s) => (visible = s.isActive),
          });
          const half = () => track.scrollWidth / 2;
          const velocity = ScrollTrigger.create({ trigger: document.body, start: 0, end: "max" });
          const step = (_t: number, delta: number) => {
            if (!visible) return;
            const vel = velocity.getVelocity(); // px/s, signed
            const targetSpeed = 60 + Math.min(Math.abs(vel) * 0.35, 900);
            speed += (targetSpeed - speed) * 0.08;
            const dir = vel < -5 ? -1 : 1;
            x -= (speed * dir * delta) / 1000;
            const w = half();
            if (w > 0) x = ((x % w) - w) % w;
            skew += (gsap.utils.clamp(-8, 8, vel / -250) - skew) * 0.1;
            track.style.transform = `translate3d(${x}px,0,0) skewX(${skew.toFixed(2)}deg)`;
          };
          gsap.ticker.add(step);
          return () => gsap.ticker.remove(step);
        }
      });

      // Triggers that need the context above but run after it.
      const ctx2 = gsap.context(() => {
        // --- Pipeline: one scrubbed camera move, form, flip counter, copy -----
        const pipeline = document.querySelector<HTMLElement>("[data-pipeline]");
        if (pipeline) {
          const steps = gsap.utils.toArray<HTMLElement>("[data-step]", pipeline);
          const rails = gsap.utils.toArray<HTMLElement>("[data-rail]", pipeline);
          const flip = pipeline.querySelector<HTMLElement>("[data-flip]");
          const splits = steps.map((s) =>
            SplitText.create(s.querySelectorAll("h3, .body"), { type: "lines", mask: "lines" }),
          );
          let active = -1;
          const show = (i: number) => {
            if (i === active) return;
            const prev = active;
            active = i;
            steps.forEach((s, k) => s.toggleAttribute("data-active", k === i));
            rails.forEach((r, k) => {
              r.toggleAttribute("data-active", k === i);
              r.toggleAttribute("data-done", k < i);
            });
            gsap.fromTo(
              splits[i].lines,
              { yPercent: 105 },
              { yPercent: 0, duration: 0.7, ease: "expo.out", stagger: 0.05, overwrite: true },
            );
            gsap.fromTo(
              steps[i].querySelectorAll(".step-record, .small"),
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 0.5, delay: 0.2, overwrite: true },
            );
            if (flip) {
              gsap
                .timeline()
                .to(flip, { rotateX: prev < i ? -90 : 90, duration: 0.14, ease: "power1.in" })
                .add(() => (flip.textContent = String(i + 1).padStart(2, "0")))
                .fromTo(flip, { rotateX: prev < i ? 90 : -90 }, { rotateX: 0, duration: 0.2, ease: "power2.out" });
            }
          };
          show(0);
          ScrollTrigger.create({
            trigger: pipeline,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.4,
            onUpdate: (self) => {
              sceneSegments.pipeline = self.progress;
              notifyScene();
              const state = self.progress * 5;
              const i = gsap.utils.clamp(0, 4, Math.round(state) - 1);
              show(i);
              const local = gsap.utils.clamp(0, 1, state - i);
              rails.forEach((r, k) => r.style.setProperty("--fill", k < i ? "1" : k === i ? local.toFixed(3) : "0"));
            },
          });
        }

        // --- CE 3.0: the room opens like a door; the window and tags arrive ---
        const ce3 = document.querySelector<HTMLElement>('[data-room="ce3"]');
        if (ce3) {
          gsap.fromTo(
            ce3,
            { clipPath: "inset(0% 48% 0% 48%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              ease: "power2.inOut",
              scrollTrigger: { trigger: ce3, start: "top bottom", end: "top 25%", scrub: 0.5 },
            },
          );
          const band = ce3.querySelector<HTMLElement>("[data-ce3-band]");
          if (band)
            gsap.from(band, {
              scaleX: 0,
              ease: "expo.out",
              duration: 1.2,
              scrollTrigger: { trigger: band, start: "top 80%", once: true },
            });
          gsap.from(ce3.querySelectorAll("[data-ce3-tag]"), {
            y: -40,
            rotate: -12,
            autoAlpha: 0,
            duration: 0.9,
            ease: "back.out(1.6)",
            stagger: 0.07,
            scrollTrigger: { trigger: ce3.querySelector(".ce3-board"), start: "top 80%", once: true },
          });
          // The verdict sheet slides over the ink room.
          ScrollTrigger.create({ trigger: ce3, start: "bottom bottom", end: "+=100%", pin: true, pinSpacing: false });
        }

        // --- Filed: the closed file leaves the frame ------------------------
        const filed = document.querySelector<HTMLElement>("[data-filed]");
        if (filed) {
          ScrollTrigger.create({
            trigger: filed,
            start: "top 70%",
            end: "bottom 60%",
            scrub: 0.4,
            onUpdate: (self) => {
              sceneSegments.filed = self.progress;
              notifyScene();
            },
          });
        }

        // --- Receipt drifts across the boundary into the next room ------------
        const receipt = document.querySelector<HTMLElement>("[data-receipt]");
        if (receipt) {
          gsap.fromTo(
            receipt,
            { yPercent: -30, rotate: 4 },
            {
              yPercent: 35,
              rotate: 16,
              ease: "none",
              scrollTrigger: { trigger: receipt, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        }

        // --- Opaque rooms that cover the whole viewport idle the scene -------
        gsap.utils.toArray<HTMLElement>(".room-opaque").forEach((room) => {
          ScrollTrigger.create({
            trigger: room,
            start: "top top",
            end: "bottom bottom",
            onToggle: (self) => {
              sceneCover.count = Math.max(0, sceneCover.count + (self.isActive ? 1 : -1));
              notifyScene();
            },
          });
        });
      });

      // Fonts change line breaks and heights: measure again once they are in.
      document.fonts?.ready.then(() => !cancelled && ScrollTrigger.refresh());

      cleanup = () => {
        document.removeEventListener("click", onClick);
        ctx2.revert();
        ctx.revert();
        if (lenis) {
          gsap.ticker.remove(tick);
          lenis.destroy();
        }
        sceneCover.count = 0;
        delete root.dataset.motion;
      };
    };

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void start(), { timeout: 1200 })
      : window.setTimeout(() => void start(), 200);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      cleanup?.();
    };
  }, []);

  return null;
}
