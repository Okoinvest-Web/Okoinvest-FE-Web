"use client";

// Übersicht der Benachrichtigungen (Filter, als gelesen markieren) und E-Mail-Einstellungen je Ereignisart.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BellOff, CheckCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden, sicheresZiel } from "@/lib/plattform/client";
import { BENACHRICHTIGUNG_ARTEN } from "@/lib/plattform/konstanten";
import { datum } from "@/lib/plattform/format";
import { HinweisEintrag } from "./Glocke";
import { ART_ICON } from "./benachrichtigungIcons";
import { ErfolgBox, FehlerBox } from "./felder";

function chip(aktiv) {
  return cn(
    "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-medium ring-1 ring-inset transition-colors",
    aktiv ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
  );
}

export function BenachrichtigungenListe({ eintraege: start = [], arten = [] }) {
  const router = useRouter();
  const [eintraege, setEintraege] = useState(start);
  const [filter, setFilter] = useState("alle");
  const [fehler, setFehler] = useState("");
  const ungelesen = eintraege.filter((b) => !b.gelesen).length;

  const liste = useMemo(
    () => eintraege.filter((b) => (filter === "ungelesen" ? !b.gelesen : filter === "alle" ? true : b.art === filter)),
    [eintraege, filter]
  );

  // Nach Tag gruppieren (Heute, Gestern, Datum)
  const gruppen = useMemo(() => {
    const heute = datum(new Date().toISOString());
    const gestern = datum(new Date(Date.now() - 86400e3).toISOString());
    const g = new Map();
    for (const b of liste) {
      const d = datum(b.am);
      const label = d === heute ? "Heute" : d === gestern ? "Gestern" : d;
      if (!g.has(label)) g.set(label, []);
      g.get(label).push(b);
    }
    return [...g.entries()];
  }, [liste]);

  async function markieren(body, lokal) {
    setFehler("");
    setEintraege((l) => l.map((b) => (lokal(b) ? { ...b, gelesen: true } : b)));
    try {
      await senden("/api/portal/benachrichtigungen", { body });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }

  async function oeffnen(b) {
    if (!b.gelesen) await markieren({ ids: [b.id] }, (x) => x.id === b.id);
    router.push(sicheresZiel(b.link, "/portal/benachrichtigungen"));
  }

  const vorhandeneArten = arten.filter((a) => eintraege.some((b) => b.art === a));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4 md:px-6">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
          <button type="button" className={chip(filter === "alle")} aria-pressed={filter === "alle"} onClick={() => setFilter("alle")}>Alle</button>
          <button type="button" className={chip(filter === "ungelesen")} aria-pressed={filter === "ungelesen"} onClick={() => setFilter("ungelesen")}>
            Ungelesen{ungelesen > 0 && <span className="ov-num rounded-full bg-ov-500 px-1.5 text-[11px] font-bold text-white">{ungelesen}</span>}
          </button>
          {vorhandeneArten.map((a) => {
            const Icon = ART_ICON[a];
            return (
              <button key={a} type="button" className={chip(filter === a)} aria-pressed={filter === a} onClick={() => setFilter(a)}>
                {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5" />}
                {BENACHRICHTIGUNG_ARTEN[a].label}
              </button>
            );
          })}
        </div>
        {ungelesen > 0 && (
          <Button type="button" size="sm" variant="secondary" icon={CheckCheck} onClick={() => markieren({ alle: true }, () => true)}>
            Alle als gelesen markieren
          </Button>
        )}
      </div>
      <div className="p-2 md:p-3">
        <FehlerBox>{fehler}</FehlerBox>
        {gruppen.length ? (
          gruppen.map(([label, bs]) => (
            <section key={label} aria-label={label} className="mb-2">
              <h3 className="px-3 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-wider text-ink-400">{label}</h3>
              <ul className="space-y-1">
                {bs.map((b) => (
                  <li key={b.id}>
                    <HinweisEintrag b={b} onOeffnen={oeffnen} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <BellOff aria-hidden="true" className="h-8 w-8 text-ink-300" />
            <p className="mt-3 font-display text-[17px] font-bold text-ink-900">{filter === "ungelesen" ? "Alles gelesen" : "Keine Benachrichtigungen"}</p>
            <p className="mt-1 max-w-sm text-[14px] text-ink-500">Statuswechsel, Nachrichten und – für Investoren – passende Projekte erscheinen hier.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MailEinstellungen({ einstellungen = {}, arten = [] }) {
  const router = useRouter();
  const [werte, setWerte] = useState(() => Object.fromEntries(arten.map((a) => [a, einstellungen[a] !== false])));
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");

  async function speichern(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      await senden("/api/portal/benachrichtigungen", { method: "PUT", body: { einstellungen: werte } });
      setErfolg("Einstellungen gespeichert.");
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={speichern} className="space-y-4">
      <fieldset>
        <legend className="mb-3 text-[13.5px] leading-relaxed text-ink-600">Im Portal sehen Sie immer alle Ereignisse. Per E-Mail erhalten Sie nur einen Hinweis mit Link – ohne vertrauliche Inhalte.</legend>
        <ul className="space-y-2">
          {arten.map((a) => {
            const info = BENACHRICHTIGUNG_ARTEN[a];
            const Icon = ART_ICON[a];
            return (
              <li key={a}>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-sand-50 p-3.5 ring-1 ring-inset ring-ink-200/70 has-[:checked]:bg-ov-50/60 has-[:checked]:ring-ov-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
                  <input type="checkbox" checked={!!werte[a]} onChange={(e) => setWerte((w) => ({ ...w, [a]: e.target.checked }))} className="mt-1 h-4 w-4 shrink-0 accent-[#558227]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[14.5px] font-semibold text-ink-900">
                      {Icon && <Icon aria-hidden="true" className="h-4 w-4 text-ov-700" />}
                      {info.label}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-ink-600">{info.text}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{erfolg}</ErfolgBox>
      <Button type="submit" disabled={laeuft}>{laeuft ? "Wird gespeichert …" : "E-Mail-Einstellungen speichern"}</Button>
    </form>
  );
}
