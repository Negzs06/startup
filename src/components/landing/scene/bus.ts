/**
 * Shared state between the scroll choreography (landing-motion.tsx, which owns
 * GSAP/ScrollTrigger) and the 3D scene (scene-stage.tsx). Both client islands
 * import this module, so they share one instance. Kept tiny: it is in the
 * initial bundle.
 */
export type SceneSegments = {
  /** 0→1 over the hero hand-over (scene fades as the giant word zooms). */
  heroExit: number;
  /** 0→1 across the sticky pipeline: scene states 0 → 5 (webhook … seal). */
  pipeline: number;
  /** 0→1 across the filed section: state 5 → 6. */
  filed: number;
};

export const sceneSegments: SceneSegments = { heroExit: 0, pipeline: 0, filed: 0 };

/** Number of opaque rooms currently covering the whole viewport (scene idles when > 0). */
export const sceneCover = { count: 0 };

/** Scene progress 0…6 from the segments (see docs/landing-concept.md). */
export function sceneProgress(s: SceneSegments = sceneSegments): number {
  return s.pipeline * 5 + s.filed;
}

/** Scene opacity: fades out while the hero word takes over the screen, back in for the pipeline. */
export function sceneOpacity(s: SceneSegments = sceneSegments): number {
  if (s.pipeline > 0) return 1;
  return 1 - s.heroExit;
}

type Listener = () => void;
let listener: Listener | null = null;

/** The scene stage registers here; the scroll choreography calls notifyScene() after changing state. */
export function setSceneListener(fn: Listener | null) {
  listener = fn;
}

export function notifyScene() {
  listener?.();
}
