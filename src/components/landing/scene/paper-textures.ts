/**
 * Paper for the 3D scene, drawn in code. Every word on these textures comes
 * from the demo case data (see ../data.ts); the image model only supplied the
 * blank cotton and manila stock.
 */
import { CanvasTexture, LinearMipmapLinearFilter, MirroredRepeatWrapping, SRGBColorSpace, type Texture } from "three";
import type { SceneRecords } from "../data";

export type Fonts = { mono: string; sans: string };

const INK = "#111111";
const CARBON = "#2a2e44";
const THERMAL = "#3b3b3b";
const VERMILION = "#e5391c";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvas(w: number, h: number, willReadFrequently = false) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d", { willReadFrequently })!] as const;
}

function toTexture(c: HTMLCanvasElement, anisotropy: number): Texture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.minFilter = LinearMipmapLinearFilter;
  return t;
}

/** Tile a stock image over the canvas, then tint it towards `tint`. */
function stock(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  img: HTMLImageElement,
  tint: string,
  amount: number,
) {
  const tile = Math.max(256, w / 2);
  for (let y = 0; y < h; y += tile) for (let x = 0; x < w; x += tile) ctx.drawImage(img, x, y, tile, tile);
  ctx.globalAlpha = amount;
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
}

/** Ink is never perfect: knock tiny voids out of whatever was just drawn. */
function inkVoids(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, count: number, seed = 1) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.35 + rnd() * 0.65;
    ctx.beginPath();
    ctx.arc(x + rnd() * w, y + rnd() * h, 0.4 + rnd() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
  maxLines = 6,
) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lh;
      line = word;
      if (++lines >= maxLines) return y;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}

function stampBox(
  ctx: CanvasRenderingContext2D,
  fonts: Fonts,
  text: string,
  cx: number,
  cy: number,
  size: number,
  angle: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.font = `800 ${size}px ${fonts.sans}`;
  ctx.fontStretch = "condensed";
  const w = ctx.measureText(text).width + size * 0.7;
  const h = size * 1.35;
  ctx.globalAlpha = 0.86;
  ctx.strokeStyle = VERMILION;
  ctx.fillStyle = VERMILION;
  ctx.lineWidth = size * 0.09;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // misregistered second pass, as a hand stamp leaves it
  ctx.fillText(text, 0, size * 0.04);
  ctx.globalAlpha = 0.25;
  ctx.fillText(text, size * 0.03, size * 0.07);
  ctx.restore();
  inkVoids(ctx, cx - w / 2, cy - h / 2, w, h, Math.round(w * 0.9), 7);
}

/** A4-proportioned sheet. */
function sheet(width: number, cotton: HTMLImageElement, tint: string, tintAmount: number) {
  const w = width;
  const h = Math.round(width * 1.414);
  const [c, ctx] = canvas(w, h);
  stock(ctx, w, h, cotton, tint, tintAmount);
  return { c, ctx, w, h };
}

function perforations(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "rgba(60,50,30,0.32)";
  const step = h / 30;
  for (let y = step / 2; y < h; y += step) {
    for (const x of [w * 0.035, w * 0.965]) {
      ctx.beginPath();
      ctx.arc(x, y, w * 0.009, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = "rgba(60,50,30,0.18)";
  ctx.setLineDash([w * 0.006, w * 0.006]);
  ctx.lineWidth = 1;
  for (const x of [w * 0.07, w * 0.93]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

export type PaperSet = {
  notice: Texture;
  logins: Texture;
  usage: Texture;
  ticket: Texture;
  receipt: Texture;
  priorReceipt: Texture;
  tags: Texture[];
  manila: Texture;
  cottonTile: Texture;
  sealMask: Texture;
};

export function drawPaper(
  records: SceneRecords,
  fonts: Fonts,
  images: { cotton: HTMLImageElement; manila: HTMLImageElement },
  opts: { sheetWidth: number; anisotropy: number },
): PaperSet {
  const W = opts.sheetWidth;
  const u = W / 100; // one "unit" = 1% of sheet width

  // --- Dispute notice --------------------------------------------------------
  const n = sheet(W, images.cotton, "#f2eee4", 0.25);
  {
    const { ctx, w } = n;
    ctx.fillStyle = INK;
    ctx.font = `800 ${u * 9}px ${fonts.sans}`;
    ctx.fontStretch = "condensed";
    ctx.fillText(records.noticeTitle.toUpperCase(), u * 7, u * 15);
    ctx.fillRect(u * 7, u * 18, w - u * 14, u * 0.5);
    let y = u * 27;
    for (const [label, value] of records.notice) {
      ctx.font = `400 ${u * 2.6}px ${fonts.mono}`;
      ctx.fillStyle = "rgba(17,17,17,0.55)";
      ctx.fillText(label.toUpperCase(), u * 7, y);
      ctx.font = `700 ${u * 3.4}px ${fonts.mono}`;
      ctx.fillStyle = INK;
      ctx.fillText(value, u * 7, y + u * 4.4);
      ctx.fillStyle = "rgba(17,17,17,0.18)";
      ctx.fillRect(u * 7, y + u * 6.6, w - u * 14, Math.max(1, u * 0.15));
      y += u * 10.6;
    }
    ctx.font = `400 ${u * 2.6}px ${fonts.mono}`;
    ctx.fillStyle = "rgba(17,17,17,0.55)";
    ctx.fillText("CARDHOLDER CLAIM", u * 7, y + u * 1);
    ctx.font = `400 ${u * 3.2}px ${fonts.mono}`;
    ctx.fillStyle = INK;
    wrap(ctx, records.claim, u * 7, y + u * 6, w - u * 14, u * 4.6, 3);
    stampBox(ctx, fonts, "DISPUTED", w * 0.66, u * 32, u * 7.5, -0.12);
  }

  // --- Carbon-copy logs ------------------------------------------------------
  function logSheet(title: string, lines: string[], tint: string) {
    const s = sheet(W, images.cotton, tint, 0.42);
    const { ctx, w } = s;
    perforations(ctx, w, s.h);
    ctx.filter = "blur(0.5px)";
    ctx.fillStyle = CARBON;
    ctx.font = `700 ${u * 3.6}px ${fonts.mono}`;
    ctx.fillText(title.toUpperCase(), u * 11, u * 12);
    ctx.fillRect(u * 11, u * 14.5, w - u * 22, u * 0.3);
    ctx.font = `400 ${u * 2.55}px ${fonts.mono}`;
    let y = u * 22;
    for (const line of lines) {
      y = wrap(ctx, line, u * 11, y, w - u * 22, u * 4, 3) + u * 2.2;
    }
    ctx.filter = "none";
    // carbon smudge
    const g = ctx.createRadialGradient(w * 0.7, s.h * 0.7, 0, w * 0.7, s.h * 0.7, w * 0.22);
    g.addColorStop(0, "rgba(42,46,68,0.10)");
    g.addColorStop(1, "rgba(42,46,68,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, s.h);
    return toTexture(s.c, opts.anisotropy);
  }

  // --- Thermal receipts ------------------------------------------------------
  function receipt(lines: string[]) {
    const w = Math.round(W * 0.4);
    const h = Math.round(w * 3.25);
    const [c, ctx] = canvas(w, h);
    stock(ctx, w, h, images.cotton, "#f6f5f1", 0.6);
    ctx.fillStyle = THERMAL;
    ctx.textAlign = "center";
    const ru = w / 40;
    let y = ru * 9;
    lines.forEach((line, i) => {
      ctx.font = `${i === 0 ? 700 : 400} ${ru * (i === 0 ? 2.6 : 2.15)}px ${fonts.mono}`;
      ctx.fillText(line, w / 2, y);
      y += ru * 4.4;
      if (i === 0 || i === 3) {
        ctx.fillText("- - - - - - - - - - - - -", w / 2, y);
        y += ru * 4.4;
      }
    });
    // thermal fade toward the curled ends
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(246,245,241,0.55)");
    g.addColorStop(0.15, "rgba(246,245,241,0)");
    g.addColorStop(0.85, "rgba(246,245,241,0)");
    g.addColorStop(1, "rgba(246,245,241,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return toTexture(c, opts.anisotropy);
  }

  // --- Kraft tags --------------------------------------------------------------
  function tag(id: string, lines: string[]) {
    const w = Math.round(W * 0.36);
    const h = w * 2;
    const [c, ctx] = canvas(w, h);
    stock(ctx, w, h, images.manila, "#b9955c", 0.32);
    const tu = w / 40;
    // reinforcement ring around the hole
    ctx.fillStyle = "#c2552f";
    ctx.beginPath();
    ctx.arc(w / 2, tu * 8, tu * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `700 ${tu * 3.2}px ${fonts.mono}`;
    ctx.fillText("PRIOR TXN", tu * 5, tu * 22);
    ctx.font = `400 ${tu * 2.7}px ${fonts.mono}`;
    ctx.fillText(id, tu * 5, tu * 28);
    ctx.fillRect(tu * 5, tu * 31, w - tu * 10, Math.max(1, tu * 0.25));
    let y = tu * 38;
    for (const line of lines) {
      ctx.font = `400 ${tu * 2.9}px ${fonts.mono}`;
      y = wrap(ctx, line, tu * 5, y, w - tu * 10, tu * 4, 2) + tu * 1.5;
    }
    ctx.strokeStyle = "#1d5a3c";
    ctx.lineWidth = tu * 0.9;
    ctx.beginPath();
    ctx.moveTo(tu * 6, h - tu * 14);
    ctx.lineTo(tu * 10, h - tu * 9);
    ctx.lineTo(tu * 19, h - tu * 20);
    ctx.stroke();
    ctx.fillStyle = "#1d5a3c";
    ctx.font = `700 ${tu * 3}px ${fonts.mono}`;
    ctx.fillText("QUALIFIES", tu * 21, h - tu * 12);
    return toTexture(c, opts.anisotropy);
  }

  // --- Manila board and cotton tile ------------------------------------------
  const [mc, mctx] = canvas(512, 512);
  mctx.drawImage(images.manila, 0, 0, 512, 512);
  const manila = toTexture(mc, opts.anisotropy);
  manila.wrapS = manila.wrapT = MirroredRepeatWrapping;

  const [cc, cctx] = canvas(512, 512);
  cctx.drawImage(images.cotton, 0, 0, 512, 512);
  const cottonTile = toTexture(cc, opts.anisotropy);
  cottonTile.wrapS = cottonTile.wrapT = MirroredRepeatWrapping;

  // --- Seal mask: R = sharp stamp, G = blurred (where ink bleeds) -------------
  const S = 512;
  const [sc, sctx] = canvas(S, S, true);
  sctx.fillStyle = "#000";
  sctx.fillRect(0, 0, S, S);
  sctx.strokeStyle = "#fff";
  sctx.fillStyle = "#fff";
  sctx.lineWidth = 14;
  sctx.beginPath();
  sctx.arc(S / 2, S / 2, S * 0.44, 0, Math.PI * 2);
  sctx.stroke();
  sctx.lineWidth = 5;
  sctx.beginPath();
  sctx.arc(S / 2, S / 2, S * 0.3, 0, Math.PI * 2);
  sctx.stroke();
  const ring = `${records.seal.caseId} · ${records.seal.basis.toUpperCase()} · CHARGEGUARD · `;
  sctx.font = `700 ${S * 0.062}px ${fonts.mono}`;
  sctx.textAlign = "center";
  sctx.textBaseline = "middle";
  const chars = ring.split("");
  chars.forEach((ch, i) => {
    const a = (i / chars.length) * Math.PI * 2 - Math.PI / 2;
    sctx.save();
    sctx.translate(S / 2 + Math.cos(a) * S * 0.37, S / 2 + Math.sin(a) * S * 0.37);
    sctx.rotate(a + Math.PI / 2);
    sctx.fillText(ch, 0, 0);
    sctx.restore();
  });
  sctx.font = `800 ${S * 0.12}px ${fonts.sans}`;
  sctx.fontStretch = "condensed";
  sctx.fillText(records.seal.verdict.toUpperCase(), S / 2, S / 2 + S * 0.01);
  const sharp = sctx.getImageData(0, 0, S, S);
  sctx.filter = "blur(9px)";
  sctx.drawImage(sc, 0, 0);
  sctx.filter = "none";
  const blurred = sctx.getImageData(0, 0, S, S);
  for (let i = 0; i < sharp.data.length; i += 4) {
    blurred.data[i] = sharp.data[i];
    blurred.data[i + 2] = 0;
    blurred.data[i + 3] = 255;
  }
  sctx.putImageData(blurred, 0, 0);
  const sealMask = new CanvasTexture(sc);

  return {
    notice: toTexture(n.c, opts.anisotropy),
    logins: logSheet("Auth0 · login log", records.logins, "#efe6c4"),
    usage: logSheet("PostHog · product usage", records.usage, "#ecd8cf"),
    ticket: logSheet(`Zendesk · ${records.ticket.title}`, records.ticket.lines, "#dfe3d6"),
    receipt: receipt(records.receipt),
    priorReceipt: receipt(records.priorReceipt),
    tags: records.tags.map((t) => tag(t.id, t.lines)),
    manila,
    cottonTile,
    sealMask,
  };
}
