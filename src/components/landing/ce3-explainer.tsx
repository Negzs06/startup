"use client";

import { useId, useMemo, useState } from "react";
import {
  auditCe3,
  CE3_ELEMENT_LABELS,
  CE3_MAX_AGE_DAYS,
  CE3_MIN_AGE_DAYS,
  CE3_REASON_LABELS,
  matchElements,
  type Ce3Element,
} from "@/lib/ce3/audit";
import type { Ce3DemoCase } from "./data";
import { formatUtc, money } from "./format";

const SCALE_DAYS = 400;
const ELEMENTS: Ce3Element[] = ["ip", "deviceId", "accountId", "shippingAddress"];
const SHORT: Record<Ce3Element, string> = { ip: "IP", deviceId: "DEV", accountId: "ACCT", shippingAddress: "SHIP" };

/** Horizontal position for an age in days: the disputed charge (day 0) sits on the right. */
const at = (days: number) => `${(1 - days / SCALE_DAYS) * 100}%`;

/**
 * Interactive Visa CE 3.0 explainer. Runs the real audit engine
 * (src/lib/ce3/audit.ts) in the browser on demo case data.
 */
export function Ce3Explainer({ cases }: { cases: Ce3DemoCase[] }) {
  const [caseId, setCaseId] = useState(cases[0]?.dispute.id ?? "");
  const current = cases.find((c) => c.dispute.id === caseId) ?? cases[0];
  const audit = useMemo(() => auditCe3(current), [current]);
  const [selected, setSelected] = useState<string | null>(null);
  const groupName = useId();

  if (!audit.applicable) return null;
  const candidates = audit.candidates;
  const chosen =
    candidates.find((c) => c.transactionId === selected) ?? candidates.find((c) => c.qualifies) ?? candidates[0];
  const tx = current.priorTransactions.find((t) => t.id === chosen?.transactionId);

  return (
    <div className="ce3">
      <fieldset className="ce3-cases">
        <legend className="rec">Demo case</legend>
        {cases.map((c) => (
          <label key={c.dispute.id} className="ce3-case">
            <input
              type="radio"
              name={groupName}
              value={c.dispute.id}
              checked={c.dispute.id === caseId}
              onChange={() => {
                setCaseId(c.dispute.id);
                setSelected(null);
              }}
            />
            <span className="rec">
              {c.dispute.id} · Visa {c.dispute.reasonCode} · {money(c.dispute.amount, c.dispute.currency)}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="ce3-board">
        <div className="ce3-scale" aria-hidden="true">
          <div
            className="ce3-window"
            data-ce3-band
            style={{ left: at(CE3_MAX_AGE_DAYS), right: `calc(100% - ${at(CE3_MIN_AGE_DAYS)})` }}
          >
            <span className="rec">
              {CE3_MIN_AGE_DAYS}–{CE3_MAX_AGE_DAYS} days
            </span>
          </div>
          {[0, 100, 200, 300, 400].map((d) => (
            <span key={d} className="ce3-tick rec" style={{ left: at(d) }}>
              {d === 0 ? "day 0" : `${d}d`}
            </span>
          ))}
          <span className="ce3-charge rec" style={{ left: at(0) }}>
            Disputed charge · {formatUtc(current.charge.createdAt, false)}
          </span>
        </div>

        <ol className="ce3-tags" aria-label={`Prior transactions for ${current.dispute.id}, newest first`}>
          {candidates.map((c) => {
            const isOn = c.transactionId === chosen?.transactionId;
            return (
              <li key={c.transactionId} className="ce3-tag-slot" style={{ left: at(Math.min(c.ageDays, SCALE_DAYS)) }}>
                <button
                  type="button"
                  className="ce3-tag"
                  data-ce3-tag
                  data-qualifies={c.qualifies || undefined}
                  aria-pressed={isOn}
                  onClick={() => setSelected(c.transactionId)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setSelected(c.transactionId)}
                >
                  <span className="ce3-tag-days">{c.ageDays}d</span>
                  <span className="ce3-tag-mark">{c.qualifies ? "Qualifies" : "No"}</span>
                  <span className="sr-only">
                    {c.transactionId}, {c.ageDays} days before the disputed charge,{" "}
                    {c.qualifies ? "qualifies" : `does not qualify: ${CE3_REASON_LABELS[c.reason]}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="ce3-detail" aria-live="polite">
        {chosen && tx ? (
          <>
            <div className="ce3-detail-head">
              <p className="rec">{tx.id}</p>
              <p className="rec">
                {formatUtc(tx.createdAt, false)} · {money(tx.amount, tx.currency)} · {chosen.ageDays} days before
              </p>
            </div>
            <table className="ce3-match">
              <caption className="sr-only">Data elements compared with the disputed charge</caption>
              <thead>
                <tr>
                  <th scope="col">Element</th>
                  <th scope="col">Disputed</th>
                  <th scope="col">This txn</th>
                  <th scope="col">Match</th>
                </tr>
              </thead>
              <tbody>
                {ELEMENTS.map((el) => {
                  const match = matchElements(current.charge, tx).includes(el);
                  return (
                    <tr key={el} data-match={match || undefined}>
                      <th scope="row">
                        <abbr title={CE3_ELEMENT_LABELS[el]}>{SHORT[el]}</abbr>
                      </th>
                      <td>{current.charge[el] ?? "—"}</td>
                      <td>{tx[el] ?? "—"}</td>
                      <td>{match ? "Yes" : "No"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="ce3-why" data-qualifies={chosen.qualifies || undefined}>
              {chosen.qualifies
                ? `Qualifies: ${chosen.ageDays} days old, undisputed, ${chosen.matchedElements.length} matching elements including ${chosen.matchedElements.includes("ip") ? "the IP address" : "the device ID"}.`
                : `Does not qualify: ${CE3_REASON_LABELS[chosen.reason]}.`}
            </p>
          </>
        ) : null}
      </div>

      <p className="ce3-result" data-eligible={audit.eligible || undefined}>
        <span className="ce3-result-count">
          {audit.qualifyingCount}
          <span className="ce3-result-of"> / {audit.required} required</span>
        </span>
        <span className="ce3-result-stamp">{audit.eligible ? "CE 3.0 met" : "CE 3.0 not met"}</span>
      </p>
    </div>
  );
}
