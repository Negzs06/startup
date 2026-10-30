import type { TosClause } from "@/lib/domain/types";

export const DEMO_TOS_VERSION = "3.2";
export const DEMO_TOS_URL = "https://lumen-analytics.example/legal/terms/v3.2";

export const DEMO_TOS_CLAUSES: TosClause[] = [
  {
    id: "tos-4.2",
    title: "4.2 Automatic renewal",
    text:
      "Paid plans renew automatically at the end of each billing period at the then-current price. " +
      "For annual plans we send a renewal reminder to the account owner's email address at least 7 days before the renewal date.",
  },
  {
    id: "tos-4.5",
    title: "4.5 Cancellation",
    text:
      "You may cancel your subscription at any time from Settings → Billing. " +
      "Cancellation takes effect at the end of the current billing period, and you keep access to the Service until then.",
  },
  {
    id: "tos-6.1",
    title: "6.1 Refunds",
    text:
      "If you ask for a refund by contacting support within 14 days of a charge, we will refund that charge in full. " +
      "After 14 days, payments are non-refundable except where required by law.",
  },
  {
    id: "tos-7.3",
    title: "7.3 Account security",
    text:
      "You are responsible for all activity that occurs under your account and for keeping your credentials and devices secure. " +
      "Notify us immediately at security@lumen-analytics.example if you believe your account has been accessed without authorization.",
  },
  {
    id: "tos-9.1",
    title: "9.1 Delivery of the Service",
    text:
      "The Service is delivered electronically. Access to paid features is available immediately after a successful payment, " +
      "and usage is recorded in your workspace activity log.",
  },
];
