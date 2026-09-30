"use client";

// Demo-Postausgang: Liste der E-Mails, die Frappe versenden würde, mit Vorschau im Markenstil
// (entspricht den Vorlagen templates/emails/oekoinvest_*.html der Frappe-App).

import { useMemo, useState } from "react";
import { Inbox, Mail, MailOpen } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { datumZeit, relativ } from "@/lib/plattform/format";

export const MAIL_ARTEN = {
  bestaetigung: "E-Mail bestätigen",
  passwort: "Passwort",
  status: "Statuswechsel",
  nachricht: "Nachricht",
  nda: "NDA & Datenraum",
  suchprofil: "Suchprofil-Treffer",
  anfrage: "Neue Anfrage",
  aufgabe: "Aufgabe",
  sicherheit: "Sicherheit",
  magic: "Anmelde-Link",
  einladung: "Team-Einladung",
  email_neu: "Neue E-Mail bestätigen",
};

function chip(aktiv) {
  return cn(
    "inline-flex h-9 items-center rounded-full px-3.5 text-[13.5px] font-medium ring-1 ring-inset transition-colors",
    aktiv ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
  );
}

/** Vorschau einer Mail – Aufbau wie die Frappe-Vorlage (Logo-Zeile, Anrede, Text, Button, Hinweis, Impressum) */
export function MailVorschau({ mail }) {
  if (!mail) return null;
  const vorname = (mail.anName || "").split(" ")[0];
  return (
    <div className="min-w-0">
      <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-b border-ink-100 pb-4 text-[13.5px]">
        <dt className="text-ink-500">An</dt>
        <dd className="min-w-0 break-words text-ink-900">{mail.anName ? `${mail.anName} <${mail.an}>` : mail.an}</dd>
        <dt className="text-ink-500">Betreff</dt>
        <dd className="min-w-0 break-words font-semibold text-ink-900">{mail.betreff}</dd>
        <dt className="text-ink-500">Zeit</dt>
        <dd className="text-ink-700">{datumZeit(mail.am)} · Vorlage {MAIL_ARTEN[mail.art] || mail.art}</dd>
      </dl>
      <div className="mt-5 rounded-2xl bg-sand-100 p-3 sm:p-6">
        <div className="mx-auto max-w-[560px] rounded-2xl bg-white px-5 py-6 text-[15px] leading-relaxed text-ink-800 shadow-sm ring-1 ring-ink-200/70 sm:px-8">
          <p className="font-display text-[18px] font-bold text-ov-700">ÖkoInvest</p>
          <p className="mt-4">Guten Tag{vorname ? ` ${vorname}` : ""},</p>
          <p className="mt-3 whitespace-pre-line">{mail.text}</p>
          <p className="my-6">
            <span className="inline-block max-w-full break-all rounded-full bg-ov-600 px-5 py-3 text-[14.5px] font-semibold text-white">{mail.linkText || "Zum Portal"}</span>
          </p>
          <p className="break-all text-[12.5px] text-ink-500">Link: {mail.link}</p>
          {mail.hinweis && <p className="mt-3 text-[13px] text-ink-500">{mail.hinweis}</p>}
          <p className="mt-6 border-t border-ink-200 pt-3 text-[12.5px] text-ink-500">ÖkoInvest GmbH · Gewerbegebiet 10 · 5121 Ostermiething · Österreich</p>
        </div>
      </div>
    </div>
  );
}

export default function Postausgang({ mails = [] }) {
  const [filter, setFilter] = useState("alle");
  const [auswahl, setAuswahl] = useState(mails[0]?.id || null);
  const arten = useMemo(() => [...new Set(mails.map((m) => m.art))], [mails]);
  const liste = filter === "alle" ? mails : mails.filter((m) => m.art === filter);
  const aktiv = mails.find((m) => m.id === auswahl) || liste[0] || null;

  if (!mails.length) {
    return (
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <Inbox aria-hidden="true" className="h-8 w-8 text-ink-300" />
        <p className="mt-3 font-display text-[17px] font-bold text-ink-900">Postausgang leer</p>
        <p className="mt-1 max-w-sm text-[14px] text-ink-500">Registrierungen, Passwort-Anfragen, Statuswechsel und Suchprofil-Treffer erzeugen hier E-Mails.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-ink-100 px-5 py-4 md:px-6" role="group" aria-label="Vorlage filtern">
        <button type="button" className={chip(filter === "alle")} aria-pressed={filter === "alle"} onClick={() => setFilter("alle")}>Alle ({mails.length})</button>
        {arten.map((a) => (
          <button key={a} type="button" className={chip(filter === a)} aria-pressed={filter === a} onClick={() => setFilter(a)}>
            {MAIL_ARTEN[a] || a}
          </button>
        ))}
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <ul className="max-h-[70vh] divide-y divide-ink-100 overflow-y-auto border-b border-ink-100 lg:border-b-0 lg:border-r" aria-label="E-Mails">
          {liste.map((m) => {
            const ist = aktiv?.id === m.id;
            const Icon = ist ? MailOpen : Mail;
            return (
              <li key={m.id}>
                <button type="button" onClick={() => setAuswahl(m.id)} aria-current={ist ? "true" : undefined} className={cn("flex w-full gap-3 px-5 py-3.5 text-left transition-colors md:px-6", ist ? "bg-ov-50/70" : "hover:bg-sand-50")}>
                  <Icon aria-hidden="true" className={cn("mt-0.5 h-[18px] w-[18px] shrink-0", ist ? "text-ov-700" : "text-ink-400")} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14px] font-semibold text-ink-900">{m.betreff}</span>
                      <span className="shrink-0 text-[12px] text-ink-400" suppressHydrationWarning>{relativ(m.am)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-ink-600">An {m.an}</span>
                    <span className="mt-1 inline-block rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">{MAIL_ARTEN[m.art] || m.art}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="min-w-0 p-5 md:p-6" aria-live="polite">
          <MailVorschau mail={aktiv} />
        </div>
      </div>
    </div>
  );
}
