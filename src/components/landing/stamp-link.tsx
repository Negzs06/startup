"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

/**
 * Primary call to action. On a plain click the rubber stamp lands on the
 * button, a vermilion wipe covers the page, then the app routes to `href`.
 * Modified clicks (new tab etc.), reduced motion and no-JS behave as a normal link.
 *
 * The wipe is a plain DOM node on <body>, removed when this component's effects
 * are cleaned up. Next keeps the previous route mounted but hidden (React
 * Activity) after navigation, so anything left on <body> would stay on screen.
 */
export function StampLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "stamp">("idle");
  const timers = useRef<number[]>([]);
  const wipe = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      wipe.current?.remove();
      wipe.current = null;
      setPhase("idle");
    },
    [],
  );

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const ox = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
    const oy = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
    setPhase("stamp");
    timers.current.push(
      window.setTimeout(() => {
        const el = document.createElement("div");
        el.className = "stamp-wipe";
        el.setAttribute("aria-hidden", "true");
        el.style.setProperty("--ox", `${ox}%`);
        el.style.setProperty("--oy", `${oy}%`);
        document.body.appendChild(el);
        wipe.current = el;
      }, 420),
      window.setTimeout(() => router.push(href), 820),
      // Safety net if the route change is slow or fails: never leave the page covered.
      window.setTimeout(() => {
        wipe.current?.remove();
        wipe.current = null;
        setPhase("idle");
      }, 4000),
    );
  }

  return (
    <Link href={href} className={`stamp-link ${className ?? ""}`} data-phase={phase} onClick={onClick}>
      <span className="stamp-link-label">{children}</span>
      <span className="stamp-link-mark" aria-hidden="true">
        Opened
      </span>
    </Link>
  );
}
