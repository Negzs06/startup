import type { Ce3Result, Dispute, Dossier } from "./types";
import { formatMoney, formatDate } from "./format";

/**
 * Offline dossier builder used when no ANTHROPIC_API_KEY is configured. It is
 * rule-based, not model-based: it exists so the product runs end to end in
 * demos and tests. Real analysis goes through `analyzeWithClaude`.
 */

const MERCHANT = "Lumen Analytics";

interface Phrases {
  greeting: string;
  intro: (id: string, code: string, amount: string, date: string) => string;
  ce3: (n: number, days: string) => string;
  usage: string;
  close: string;
  sign: string;
}

const PHRASES: Record<string, Phrases> = {
  en: {
    greeting: "Dear Dispute Resolution Team,",
    intro: (id, code, amount, date) => `We are contesting dispute ${id} (reason ${code}) for ${amount}, charged on ${date}.`,
    ce3: (n, days) => `The cardholder previously completed ${n} undisputed transactions with us (${days} days before the disputed charge) using the same IP address and device, which satisfies Visa Compelling Evidence 3.0.`,
    usage: "The account was actively used after the charge, as shown by the enclosed product telemetry and sign-in records.",
    close: "We request that the chargeback be reversed and the funds returned to the merchant.",
    sign: "Sincerely,",
  },
  de: {
    greeting: "Sehr geehrtes Streitbeilegungsteam,",
    intro: (id, code, amount, date) => `wir widersprechen dem Chargeback ${id} (Grund ${code}) über ${amount} vom ${date}.`,
    ce3: (n, days) => `Der Karteninhaber hat zuvor ${n} unbestrittene Transaktionen bei uns getätigt (${days} Tage vor der strittigen Zahlung), mit derselben IP-Adresse und demselben Gerät. Damit sind die Anforderungen von Visa Compelling Evidence 3.0 erfüllt.`,
    usage: "Das Konto wurde nach der Zahlung nachweislich aktiv genutzt; die Produkttelemetrie und die Anmeldeprotokolle liegen bei.",
    close: "Wir bitten darum, den Chargeback aufzuheben und den Betrag dem Händler wieder gutzuschreiben.",
    sign: "Mit freundlichen Grüßen",
  },
  "pt-BR": {
    greeting: "Prezada equipe de resolução de disputas,",
    intro: (id, code, amount, date) => `contestamos o chargeback ${id} (motivo ${code}) no valor de ${amount}, cobrado em ${date}.`,
    ce3: (n, days) => `O titular do cartão realizou anteriormente ${n} transações não contestadas conosco (${days} dias antes da cobrança contestada), com o mesmo endereço IP e o mesmo dispositivo, o que atende aos requisitos do Visa Compelling Evidence 3.0.`,
    usage: "A conta foi utilizada ativamente após a cobrança, conforme comprovam a telemetria do produto e os registros de acesso anexos.",
    close: "Solicitamos a reversão do chargeback e a devolução do valor ao estabelecimento.",
    sign: "Atenciosamente,",
  },
  fr: {
    greeting: "Chère équipe de gestion des litiges,",
    intro: (id, code, amount, date) => `nous contestons le litige ${id} (motif ${code}) d'un montant de ${amount}, débité le ${date}.`,
    ce3: (n, days) => `Le titulaire de la carte a effectué ${n} transactions antérieures non contestées chez nous (${days} jours avant le paiement contesté), avec la même adresse IP et le même appareil, ce qui satisfait aux exigences de Visa Compelling Evidence 3.0.`,
    usage: "Le compte a été activement utilisé après le paiement, comme le démontrent la télémétrie du produit et les journaux de connexion joints.",
    close: "Nous demandons l'annulation de ce litige et le rétablissement des fonds au profit du commerçant.",
    sign: "Cordialement,",
  },
  ja: {
    greeting: "紛争解決ご担当者様",
    intro: (id, code, amount, date) => `${date}に請求された${amount}のチャージバック（${id}、理由コード${code}）に異議を申し立てます。`,
    ce3: (n, days) => `カード会員様は、今回の請求の${days}日前に、同一のIPアドレスおよび同一の端末で、異議のない取引を${n}件行っています。これはVisa Compelling Evidence 3.0の要件を満たします。`,
    usage: "請求後もアカウントが継続的に利用されていることは、添付の製品利用ログおよびログイン記録で確認できます。",
    close: "チャージバックの取り消しと、加盟店への資金の返還をお願いいたします。",
    sign: "よろしくお願いいたします。",
  },
};

function letter(p: Phrases, lang: string, dispute: Dispute, ce3: Ce3Result): string {
  const amount = formatMoney(dispute.amountCents, dispute.currency, lang);
  const date = formatDate(dispute.transaction.date, lang);
  const basis =
    ce3.eligible
      ? p.ce3(ce3.qualifying.length, ce3.qualifying.map((q) => q.ageDays).join(" / "))
      : p.usage;
  return [
    p.greeting,
    "",
    `${p.intro(dispute.id, dispute.reasonCode, amount, date)} ${basis}`,
    "",
    p.close,
    "",
    p.sign,
    MERCHANT,
  ].join("\n");
}

function isMerchantAtFault(dispute: Dispute): boolean {
  const refundAsk = dispute.evidence.some(
    (e) => e.source === "zendesk" && /refund|cancel/i.test(e.text),
  );
  const unanswered = dispute.evidence.some(
    (e) => e.source === "zendesk" && /no further action|without a reply/i.test(e.text),
  );
  return refundAsk && unanswered && dispute.tos.some((c) => c.id === "tos-7.1");
}

export function buildFixtureDossier(dispute: Dispute, ce3: Ce3Result): Dossier {
  const timeline = [...dispute.evidence]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map(({ at, source, text }) => ({ at, source, event: text }));

  if (isMerchantAtFault(dispute)) {
    return {
      verdict: "accept",
      confidence: 0.12,
      rationale:
        "The customer asked to cancel and be refunded on day 9, inside the 14-day window in ToS 7.1, and the merchant never completed the refund. Contesting would put the 0.9% dispute-rate budget at risk for a case the issuer is likely to win. Refund the customer and accept the dispute.",
      timeline,
      clauses: dispute.tos
        .filter((c) => c.id === "tos-7.1")
        .map((c) => ({ id: c.id, quote: c.text, relevance: "Entitles the customer to a refund; the merchant did not honor the request." })),
      coverLetter: { language: dispute.issuer.language, english: "", localized: "" },
      risks: ["Merchant-side service failure is documented in Zendesk and is visible to the issuer if evidence is filed."],
    };
  }

  const lang = dispute.issuer.language in PHRASES ? dispute.issuer.language : "en";
  const usesCe3 = ce3.applicable;
  const confidence = usesCe3 ? (ce3.eligible ? 0.88 : 0.35) : dispute.history.length ? 0.78 : 0.66;

  const risks: string[] = [];
  if (usesCe3 && !ce3.eligible) risks.push("CE 3.0 requirements are not met; the case rests on session-level evidence only.");
  if (!dispute.history.length) risks.push("No prior transaction history on this card; the dossier relies on in-session telemetry.");
  if (dispute.tos.length < 2) risks.push("Few contractual clauses apply to this claim.");

  return {
    verdict: "contest",
    confidence,
    rationale: usesCe3
      ? ce3.summary
      : "Telemetry, authentication and support records show the cardholder received and used the service. The dossier ties each log entry to the contractual clauses that apply.",
    timeline,
    clauses: dispute.tos.map((c) => ({
      id: c.id,
      quote: c.text,
      relevance: c.id === "tos-9.3" ? "Account activity is attributable to the account holder." : "Defines the terms the customer accepted at checkout.",
    })),
    coverLetter: {
      language: lang,
      english: letter(PHRASES.en, "en", dispute, ce3),
      localized: letter(PHRASES[lang], lang, dispute, ce3),
    },
    risks,
  };
}
