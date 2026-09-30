// src/components/Portal/Kyc/teile.js
//
// Kleine Bausteine „KYC/KYB“ (ohne Hooks – Server und Client): Status-Badge, Risiko-Badge, Fortschritt, Hinweis-Kasten
// für gesperrte Schritte (andere Seiten können <KycHinweis> einbinden).

import Link from "next/link";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import { KYC_RISIKO, KYC_SCHRITTE, KYC_STATUS, kycStatusLabel } from "@/lib/plattform/kyc";

export function KycStatusBadge({ status, intern = false, className }) {
  const s = KYC_STATUS[status] || { label: status || "Nicht begonnen", ton: "neutral" };
  return (
    <Badge ton={s.ton} className={className}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", s.ton === "ok" ? "bg-ov-500" : s.ton === "warn" ? "bg-sun-500" : s.ton === "info" ? "bg-navy-500" : "bg-ink-400")} />
      {kycStatusLabel(status, { intern }) || "Nicht begonnen"}
    </Badge>
  );
}

export function RisikoBadge({ stufe, className }) {
  if (!stufe) return <Badge className={className}>Risiko offen</Badge>;
  const r = KYC_RISIKO[stufe];
  return <Badge ton={r?.ton || "neutral"} className={className}>Risiko {r?.label || stufe}</Badge>;
}

export function Fortschritt({ quote = 0, text, className }) {
  const q = Math.max(0, Math.min(100, Number(quote) || 0));
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-ink-600">{text || "Fortschritt"}</span>
        <span className="ov-num font-bold text-ink-900">{q} %</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={q} aria-label={text || "Fortschritt der Verifizierung"}>
        <div className={cn("h-2 rounded-full transition-[width] duration-500", q >= 100 ? "bg-ov-500" : q >= 50 ? "bg-ov-400" : "bg-sun-400")} style={{ width: `${Math.max(3, q)}%` }} />
      </div>
    </div>
  );
}

/**
 * Hinweis für gesperrte Schritte – z. B. im Datenraum: <KycHinweis schritt="nda" status={kycStatus} />
 * Zeigt nichts, wenn verifiziert oder die Sperre für das Konto nicht gilt (aktiv=false).
 */
export function KycHinweis({ schritt, status, aktiv = true, className }) {
  if (!aktiv || status?.verifiziert) return null;
  const def = KYC_SCHRITTE[schritt];
  const inPruefung = ["eingereicht", "in_pruefung"].includes(status?.status);
  return (
    <div className={cn("flex gap-3 rounded-2xl bg-sun-300/20 px-4 py-3.5 text-[14px] leading-relaxed text-ink-900 ring-1 ring-inset ring-sun-400/40", className)} role="note">
      {inPruefung ? <ShieldCheck aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0" /> : <ShieldAlert aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0" />}
      <div className="min-w-0">
        <p className="font-semibold">{def?.hinweis || "Bitte Verifizierung abschließen."}</p>
        <p className="mt-0.5 text-ink-700">
          {inPruefung ? "Ihre Unterlagen liegen zur Prüfung vor – wir melden uns im Portal." : "Die Identitätsprüfung ist gesetzlich vorgesehen und dauert nur wenige Minuten."}{" "}
          <Link href="/portal/verifizierung" className="font-semibold text-ov-700 underline underline-offset-2 hover:text-ov-800">
            {inPruefung ? "Stand ansehen" : "Zur Verifizierung"}
          </Link>
        </p>
      </div>
    </div>
  );
}
