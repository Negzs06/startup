import { Instrument_Serif } from "next/font/google";

/** Display face for the landing page only; the dashboard keeps Geist. */
export const displayFont = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-lp-display",
  display: "swap",
});
