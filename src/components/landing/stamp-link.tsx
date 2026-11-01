"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Primary call to action. On a plain click the rubber stamp lands on the
 * button, a vermilion wipe covers the page, then the app routes to `href`.
 * Modified clicks (new tab etc.), keyboard activation with reduced motion and
 * no-JS all behave as a normal link.
 */
export function StampLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "stamp" | "wipe">("idle");
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

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
    setOrigin({
      x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
      y: ((rect.top + rect.height / 2) / window.innerHeight) * 100,
    });
    setPhase("stamp");
    timers.current.push(
      window.setTimeout(() => setPhase("wipe"), 420),
      window.setTimeout(() => router.push(href), 820),
    );
  }

  return (
    <>
      <Link href={href} className={`stamp-link ${className ?? ""}`} data-phase={phase} onClick={onClick}>
        <span className="stamp-link-label">{children}</span>
        <span className="stamp-link-mark" aria-hidden="true">
          Opened
        </span>
      </Link>
      {phase === "wipe"
        ? createPortal(
            <div
              className="stamp-wipe"
              aria-hidden="true"
              style={{ ["--ox" as string]: `${origin.x}%`, ["--oy" as string]: `${origin.y}%` }}
            />,
            document.body,
          )
        : null}
    </>
  );
}
