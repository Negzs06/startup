import Image from "next/image";
import { SceneStage } from "./scene-stage";
import heroSeal from "../../../public/images/landing/hero-seal.webp";

/**
 * Fixed backdrop behind the narrative sections. The generated poster is the
 * server-rendered, always-present fallback; the WebGL canvas (client only,
 * loaded on idle) fades in over it after its first frame.
 */
export function Stage() {
  return (
    <div className="lp-stage" aria-hidden="true">
      <Image
        src={heroSeal}
        alt=""
        fill
        preload
        sizes="100vw"
        placeholder="blur"
        className="lp-stage-poster"
      />
      <div className="lp-stage-scrim" />
      <SceneStage />
      <div className="lp-stage-shade" />
      <div className="lp-grain" />
    </div>
  );
}
