// Template cover letters for the rule-based path, in each supported issuer
// language. The model writes free-form letters; these exist so the product still
// produces a usable, clearly labelled draft without a model call.

import type { IssuerLanguage } from "@/lib/domain/types";
import { formatMoney } from "@/lib/format";

export type LetterFact =
  | { kind: "usage"; count: number; lastAt: string }
  | { kind: "knownDevice"; at: string }
  | { kind: "strongAuth" }
  | { kind: "ce3"; count: number }
  | { kind: "tos"; version: string; acceptedAt: string }
  | { kind: "noCancellation" }
  | { kind: "refundOutsideWindow"; days: number; windowDays: number };

export interface LetterInput {
  merchantName: string;
  issuerName: string;
  disputeId: string;
  processorDisputeId: string;
  reasonLabel: string;
  amount: number;
  currency: string;
  chargeAt: string;
  decision: "contest" | "accept";
  facts: LetterFact[];
  clauseTitles: string[];
}

type Copy = {
  locale: string;
  greeting: (issuer: string) => string;
  subject: (i: LetterInput, amount: string, date: string) => string;
  contestIntro: (i: LetterInput, amount: string, date: string) => string;
  facts: { [K in LetterFact["kind"]]: (fact: Extract<LetterFact, { kind: K }>, fmt: (iso: string) => string) => string };
  clauses: (titles: string) => string;
  contestClose: string;
  acceptBody: (i: LetterInput, amount: string, date: string) => string;
  signoff: (merchant: string) => string;
};

const COPY: Record<IssuerLanguage, Copy> = {
  en: {
    locale: "en-GB",
    greeting: (issuer) => `To the Disputes Department, ${issuer}`,
    subject: (i, amount) => `Re: ${i.reasonLabel} — dispute ${i.processorDisputeId}, ${amount}`,
    contestIntro: (i, amount, date) =>
      `${i.merchantName} respectfully contests this chargeback for ${amount}, charged on ${date}. The records below show that the cardholder authorised and used the service.`,
    facts: {
      usage: (f, fmt) => `The cardholder's account was used ${f.count} times after the charge, most recently on ${fmt(f.lastAt)}.`,
      knownDevice: (f, fmt) => `On ${fmt(f.at)} the purchase was made from a device already used for earlier, undisputed payments.`,
      strongAuth: () => "The cardholder signed in with strong authentication (MFA, passkey or SSO) immediately before the purchase.",
      ce3: (f) => `Visa Compelling Evidence 3.0: ${f.count} prior undisputed transactions (120–365 days old) share the IP address or device ID and further data elements with the disputed transaction.`,
      tos: (f, fmt) => `The cardholder accepted our Terms of Service v${f.version} on ${fmt(f.acceptedAt)}.`,
      noCancellation: () => "No cancellation was recorded on the account before the renewal.",
      refundOutsideWindow: (f) => `The first refund request arrived ${f.days} days after the charge, outside the ${f.windowDays}-day refund window.`,
    },
    clauses: (titles) => `Relevant contract terms are enclosed and highlighted: ${titles}.`,
    contestClose: "We ask that the chargeback be reversed in the merchant's favour. The full evidence package is attached.",
    acceptBody: (i, amount, date) =>
      `${i.merchantName} accepts this dispute for ${amount}, charged on ${date}. The cardholder asked for a refund within our refund window and did not receive a timely answer; we will not contest the chargeback.`,
    signoff: (m) => `Kind regards,\n${m} — Disputes Team`,
  },
  de: {
    locale: "de-DE",
    greeting: (issuer) => `An die Abteilung Rückbelastungen, ${issuer}`,
    subject: (i, amount) => `Betreff: ${i.reasonLabel} — Rückbelastung ${i.processorDisputeId}, ${amount}`,
    contestIntro: (i, amount, date) =>
      `${i.merchantName} widerspricht dieser Rückbelastung über ${amount} vom ${date}. Die folgenden Aufzeichnungen belegen, dass der Karteninhaber die Zahlung veranlasst und die Leistung genutzt hat.`,
    facts: {
      usage: (f, fmt) => `Das Konto des Karteninhabers wurde nach der Belastung ${f.count}-mal genutzt, zuletzt am ${fmt(f.lastAt)}.`,
      knownDevice: (f, fmt) => `Der Kauf am ${fmt(f.at)} erfolgte von einem Gerät, das bereits für frühere, unbeanstandete Zahlungen verwendet wurde.`,
      strongAuth: () => "Der Karteninhaber hat sich unmittelbar vor dem Kauf mit starker Authentifizierung (MFA, Passkey oder SSO) angemeldet.",
      ce3: (f) => `Visa Compelling Evidence 3.0: ${f.count} frühere, unbeanstandete Transaktionen (120–365 Tage alt) stimmen in IP-Adresse oder Geräte-ID sowie weiteren Datenelementen mit der beanstandeten Transaktion überein.`,
      tos: (f, fmt) => `Der Karteninhaber hat unseren AGB in Version ${f.version} am ${fmt(f.acceptedAt)} zugestimmt.`,
      noCancellation: () => "Vor der Verlängerung wurde im Konto keine Kündigung erfasst.",
      refundOutsideWindow: (f) => `Die erste Erstattungsanfrage ging ${f.days} Tage nach der Belastung ein und damit außerhalb der Erstattungsfrist von ${f.windowDays} Tagen.`,
    },
    clauses: (titles) => `Die maßgeblichen Vertragsbestimmungen sind markiert beigefügt: ${titles}.`,
    contestClose: "Wir bitten darum, die Rückbelastung zugunsten des Händlers aufzuheben. Die vollständigen Nachweise liegen bei.",
    acceptBody: (i, amount, date) =>
      `${i.merchantName} akzeptiert diese Rückbelastung über ${amount} vom ${date}. Der Karteninhaber hat innerhalb unserer Erstattungsfrist eine Erstattung beantragt und keine rechtzeitige Antwort erhalten; wir legen keinen Widerspruch ein.`,
    signoff: (m) => `Mit freundlichen Grüßen\n${m} — Team Rückbelastungen`,
  },
  "pt-BR": {
    locale: "pt-BR",
    greeting: (issuer) => `Ao Departamento de Contestações, ${issuer}`,
    subject: (i, amount) => `Assunto: ${i.reasonLabel} — contestação ${i.processorDisputeId}, ${amount}`,
    contestIntro: (i, amount, date) =>
      `A ${i.merchantName} contesta respeitosamente este chargeback de ${amount}, cobrado em ${date}. Os registros abaixo demonstram que o titular do cartão autorizou a compra e utilizou o serviço.`,
    facts: {
      usage: (f, fmt) => `A conta do titular foi utilizada ${f.count} vezes após a cobrança, a última vez em ${fmt(f.lastAt)}.`,
      knownDevice: (f, fmt) => `A compra de ${fmt(f.at)} foi feita a partir de um dispositivo já usado em pagamentos anteriores não contestados.`,
      strongAuth: () => "O titular entrou na conta com autenticação forte (MFA, passkey ou SSO) imediatamente antes da compra.",
      ce3: (f) => `Visa Compelling Evidence 3.0: ${f.count} transações anteriores não contestadas (de 120 a 365 dias) compartilham o endereço IP ou o ID do dispositivo e outros elementos de dados com a transação contestada.`,
      tos: (f, fmt) => `O titular aceitou nossos Termos de Serviço, versão ${f.version}, em ${fmt(f.acceptedAt)}.`,
      noCancellation: () => "Nenhum cancelamento foi registrado na conta antes da renovação.",
      refundOutsideWindow: (f) => `O primeiro pedido de reembolso chegou ${f.days} dias após a cobrança, fora do prazo de reembolso de ${f.windowDays} dias.`,
    },
    clauses: (titles) => `As cláusulas contratuais pertinentes seguem anexas e destacadas: ${titles}.`,
    contestClose: "Solicitamos que o chargeback seja revertido em favor do estabelecimento. O pacote completo de evidências segue anexo.",
    acceptBody: (i, amount, date) =>
      `A ${i.merchantName} aceita esta contestação de ${amount}, cobrada em ${date}. O titular solicitou reembolso dentro do nosso prazo e não recebeu resposta a tempo; não contestaremos o chargeback.`,
    signoff: (m) => `Atenciosamente,\n${m} — Equipe de Contestações`,
  },
  ja: {
    locale: "ja-JP",
    greeting: (issuer) => `${issuer} チャージバック担当部署 御中`,
    subject: (i, amount) => `件名：${i.reasonLabel}（チャージバック ${i.processorDisputeId}、${amount}）`,
    contestIntro: (i, amount, date) =>
      `${i.merchantName}は、${date}に請求した${amount}のチャージバックについて異議を申し立てます。以下の記録は、カード会員ご本人が取引を承認し、サービスを利用したことを示しています。`,
    facts: {
      usage: (f, fmt) => `請求後、カード会員のアカウントは${f.count}回利用されており、最終利用日は${fmt(f.lastAt)}です。`,
      knownDevice: (f, fmt) => `${fmt(f.at)}の購入は、過去に異議のない決済で使用された端末から行われました。`,
      strongAuth: () => "カード会員は購入直前に強力な認証（多要素認証、パスキーまたはSSO）でログインしています。",
      ce3: (f) => `Visa Compelling Evidence 3.0：異議のない過去の取引${f.count}件（120〜365日前）が、IPアドレスまたは端末IDおよびその他のデータ項目で対象取引と一致しています。`,
      tos: (f, fmt) => `カード会員は${fmt(f.acceptedAt)}に利用規約（第${f.version}版）に同意しています。`,
      noCancellation: () => "更新日以前に、アカウント上で解約の記録はありません。",
      refundOutsideWindow: (f) => `最初の返金依頼は請求から${f.days}日後であり、${f.windowDays}日間の返金期間を過ぎていました。`,
    },
    clauses: (titles) => `関連する契約条項を強調表示のうえ添付いたします：${titles}。`,
    contestClose: "つきましては、本チャージバックを加盟店に有利に取り消していただきますようお願い申し上げます。証拠資料一式を添付いたします。",
    acceptBody: (i, amount, date) =>
      `${i.merchantName}は、${date}に請求した${amount}のチャージバックを受け入れます。カード会員は返金期間内に返金を依頼されましたが、当社から適時の回答がありませんでした。本件について異議は申し立てません。`,
    signoff: (m) => `敬具\n${m} チャージバック対応チーム`,
  },
  fr: {
    locale: "fr-FR",
    greeting: (issuer) => `À l'attention du service des litiges, ${issuer}`,
    subject: (i, amount) => `Objet : ${i.reasonLabel} — litige ${i.processorDisputeId}, ${amount}`,
    contestIntro: (i, amount, date) =>
      `${i.merchantName} conteste respectueusement cette rétrofacturation de ${amount}, débitée le ${date}. Les éléments ci-dessous montrent que le titulaire de la carte a autorisé l'achat et utilisé le service.`,
    facts: {
      usage: (f, fmt) => `Le compte du titulaire a été utilisé ${f.count} fois après le débit, la dernière fois le ${fmt(f.lastAt)}.`,
      knownDevice: (f, fmt) => `L'achat du ${fmt(f.at)} a été effectué depuis un appareil déjà utilisé pour des paiements antérieurs non contestés.`,
      strongAuth: () => "Le titulaire s'est connecté avec une authentification forte (MFA, passkey ou SSO) juste avant l'achat.",
      ce3: (f) => `Visa Compelling Evidence 3.0 : ${f.count} transactions antérieures non contestées (de 120 à 365 jours) partagent l'adresse IP ou l'identifiant d'appareil ainsi que d'autres éléments avec la transaction contestée.`,
      tos: (f, fmt) => `Le titulaire a accepté nos conditions générales, version ${f.version}, le ${fmt(f.acceptedAt)}.`,
      noCancellation: () => "Aucune résiliation n'a été enregistrée sur le compte avant le renouvellement.",
      refundOutsideWindow: (f) => `La première demande de remboursement est arrivée ${f.days} jours après le débit, hors du délai de remboursement de ${f.windowDays} jours.`,
    },
    clauses: (titles) => `Les clauses contractuelles pertinentes sont jointes et surlignées : ${titles}.`,
    contestClose: "Nous demandons l'annulation de la rétrofacturation en faveur du commerçant. Le dossier de preuves complet est joint.",
    acceptBody: (i, amount, date) =>
      `${i.merchantName} accepte ce litige de ${amount}, débité le ${date}. Le titulaire a demandé un remboursement dans notre délai de remboursement sans obtenir de réponse à temps ; nous ne contesterons pas la rétrofacturation.`,
    signoff: (m) => `Veuillez agréer nos salutations distinguées,\n${m} — Équipe litiges`,
  },
};

export function writeLetter(language: IssuerLanguage, input: LetterInput): string {
  const copy = COPY[language];
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(copy.locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso));
  const amount = formatMoney(input.amount, input.currency, copy.locale);
  const date = fmtDate(input.chargeAt);

  const parts = [copy.greeting(input.issuerName), copy.subject(input, amount, date)];
  if (input.decision === "accept") {
    parts.push(copy.acceptBody(input, amount, date));
  } else {
    parts.push(copy.contestIntro(input, amount, date));
    // Each fact formatter is typed by its own kind; the cast bridges the union.
    const lines = input.facts.map((fact) => `• ${(copy.facts[fact.kind] as (f: LetterFact, d: typeof fmtDate) => string)(fact, fmtDate)}`);
    if (lines.length) parts.push(lines.join("\n"));
    if (input.clauseTitles.length) parts.push(copy.clauses(input.clauseTitles.join(", ")));
    parts.push(copy.contestClose);
  }
  parts.push(copy.signoff(input.merchantName));
  return parts.join("\n\n");
}
