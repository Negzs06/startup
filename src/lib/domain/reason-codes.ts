import type { Network, ReasonCode } from "./types";

export interface ReasonCodeInfo {
  network: Network;
  code: ReasonCode;
  label: string;
  category: "fraud" | "consumer";
  /** What representment generally needs to show. Summarised, not the network text. */
  requirements: string[];
  /** Visa Compelling Evidence 3.0 only applies to Visa 10.4. */
  ce3Applicable: boolean;
}

export const REASON_CODES: Record<ReasonCode, ReasonCodeInfo> = {
  "10.4": {
    network: "visa",
    code: "10.4",
    label: "Other Fraud – Card-Absent Environment",
    category: "fraud",
    requirements: [
      "Cardholder participated in or benefited from the transaction",
      "Device, IP or account history links the cardholder to the purchase",
      "Compelling Evidence 3.0: two prior undisputed transactions (120–365 days old) with matching data elements",
    ],
    ce3Applicable: true,
  },
  "13.1": {
    network: "visa",
    code: "13.1",
    label: "Merchandise / Services Not Received",
    category: "consumer",
    requirements: [
      "Service was made available to the cardholder on or before the expected date",
      "Cardholder accessed or used the service after the purchase",
      "No unresolved request for cancellation or refund before the dispute",
    ],
    ce3Applicable: false,
  },
  "4837": {
    network: "mastercard",
    code: "4837",
    label: "No Cardholder Authorization",
    category: "fraud",
    requirements: [
      "Transaction originated from a device or IP previously used by the cardholder",
      "Cardholder account authenticated at or near the time of purchase",
      "Prior undisputed transactions on the same account",
    ],
    ce3Applicable: false,
  },
  "4853": {
    network: "mastercard",
    code: "4853",
    label: "Cardholder Dispute – Not as Described / Defective / Cancelled",
    category: "consumer",
    requirements: [
      "Service matched its description and was delivered",
      "Cancellation or refund terms were disclosed and accepted",
      "Cardholder did not cancel or request a refund in line with those terms",
    ],
    ce3Applicable: false,
  },
};

export function describeReasonCode(code: ReasonCode): string {
  const info = REASON_CODES[code];
  return `${info.network === "visa" ? "Visa" : "Mastercard"} ${info.code} · ${info.label}`;
}
