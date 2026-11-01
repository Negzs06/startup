import { Archivo, Courier_Prime } from "next/font/google";

/**
 * Landing-only faces; the dashboard keeps Geist.
 * Archivo is variable on weight and width: condensed black for display, normal
 * width for text. Courier Prime is the typewriter layer for records.
 */
export const sansFont = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-lp-sans",
  display: "swap",
});

export const monoFont = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-lp-mono",
  display: "swap",
});
