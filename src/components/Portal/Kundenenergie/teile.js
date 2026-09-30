// src/components/Portal/Kundenenergie/teile.js – Anzeige-Bausteine der Kundenseite Energie (ohne Hooks, Server-tauglich)

import { CalendarClock, Check, Circle, FileDown, Minus, TriangleAlert } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/Portal/ui";
import { AnliegenBoAktionen, AnliegenKundenAktionen, WechselSchrittKnopf } from "./Formulare";
import { WECHSEL_ROLLE } from "@/lib/plattform/kundenenergie";

export const euro = (x, s = 2) => (Number.isFinite(x) ? `${x.toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s })} €` : "–");
export const tag = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");
export const zahl = (x, s = 0) => (Number.isFinite(x) ? x.toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s }) : "–");

export function DokLink({ href, children }) {
  return (
    <a href={href} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
      <FileDown aria-hidden="true" className="h-4 w-4" />
      {children}
    </a>
  );
}

/** Ein Anliegen mit Eckdaten, Angebot, Entscheidung, Verlauf und Aktionen (Kunde bzw. Backoffice) */
export function AnliegenKarte({ a, backoffice = false }) {
  const angaben = [
    a.belegNummer && ["Rechnung", `${a.belegNummer}${a.belegZeitraum ? ` · ${tag(a.belegZeitraum.von)}–${tag(a.belegZeitraum.bis)}` : ""}${Number.isFinite(a.belegBrutto) ? ` · ${euro(a.belegBrutto)}` : ""}`],
    a.anlageName && ["Anlage", a.anlageName],
    backoffice && ["Kunde", `${a.kunde.firma || a.kunde.name}${a.kunde.firma ? ` (${a.kunde.name})` : ""}`],
    a.grundLabel && ["Grund", a.grundLabel],
    Number.isFinite(a.betragStrittigEur) && ["Strittig", euro(a.betragStrittigEur)],
    a.wirksamZum && ["Wirksam zum", `${tag(a.wirksamZum)} (fristgerecht bis ${tag(a.stichtag)})`],
    a.wunschJahre && ["Wunsch", `${a.wunschJahre} Jahre Verlängerung`],
    a.art === "kaufoption" && a.wunschTermin && ["Wunschtermin", tag(a.wunschTermin)],
    ["Eingereicht", tag(a.eingereichtAm)],
    a.offen ? ["Bearbeitungsziel", tag(a.zielAm)] : ["Entschieden", tag(a.entschiedenAm)],
    Number.isFinite(a.korrekturEur) && ["Korrektur", `${euro(a.korrekturEur)} (Gutschrift folgt)`],
  ].filter(Boolean);
  return (
    <li id={a.id} className="scroll-mt-24 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-500">{a.id}</p>
          <h3 className="font-display text-[17px] font-bold text-ink-900">{a.artLabel}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {a.ueberfaellig && <Badge ton="warn"><TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />Ziel überschritten</Badge>}
          <Badge ton={a.ton}>{a.statusLabel}</Badge>
          <DokLink href={`/api/portal/kundenenergie/anliegen/${a.id}/pdf`}>PDF</DokLink>
        </div>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2">
        {angaben.map(([k, v]) => (
          <div key={k} className="min-w-0"><dt className="text-ink-500">{k}</dt><dd className="break-words font-medium text-ink-900">{v}</dd></div>
        ))}
      </dl>
      {a.text && <p className="mt-3 whitespace-pre-line rounded-2xl bg-sand-50 px-4 py-3 text-[14px] leading-relaxed text-ink-700 ring-1 ring-sand-200">{a.text}</p>}
      {a.angebot && (
        <div className="mt-3 rounded-2xl bg-ov-50 px-4 py-3 text-[14px] leading-relaxed text-ink-800 ring-1 ring-ov-200">
          <p className="font-semibold text-ov-900">Angebot von ÖkoInvest</p>
          {a.art === "kaufoption" ? <p>Kaufpreis {euro(a.angebot.betragEur)} netto · Übergabe {tag(a.angebot.stichtag)} · gültig bis {tag(a.angebot.gueltigBis)}</p> : <p>{a.angebot.jahre} Jahre zu {zahl(a.angebot.preisCt, 3)} ct/kWh netto{Number.isFinite(a.angebot.grundgebuehrMonat) ? ` · Grundgebühr ${euro(a.angebot.grundgebuehrMonat)}/Monat` : ""} · gültig bis {tag(a.angebot.gueltigBis)}</p>}
          {a.angebot.text && <p className="mt-1 text-[13.5px] text-ink-700">{a.angebot.text}</p>}
        </div>
      )}
      {!a.offen && a.begruendung && <p className="mt-3 rounded-2xl bg-navy-50 px-4 py-3 text-[14px] leading-relaxed text-navy-900 ring-1 ring-navy-100"><strong>{a.status === "abgelehnt" ? "Begründung" : "Ergebnis"}:</strong> {a.begruendung}</p>}
      {a.verlauf?.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[13.5px] font-semibold text-ov-700">Verlauf ({a.verlauf.length})</summary>
          <ol className="mt-2 space-y-1.5 border-l-2 border-ink-100 pl-4 text-[13px] text-ink-700">
            {a.verlauf.map((x, i) => <li key={i}><span className="text-ink-500">{tag(x.am)}</span> · {x.text}</li>)}
          </ol>
        </details>
      )}
      {a.aktionen.length > 0 && <div className="mt-4 border-t border-ink-100 pt-4">{backoffice ? <AnliegenBoAktionen anliegen={a} /> : <AnliegenKundenAktionen anliegen={a} />}</div>}
    </li>
  );
}

const AMPEL = { gruen: ["ok", "im Plan"], gelb: ["warn", "Frist überschritten"], rot: ["dunkel", "kritische Frist überschritten"] };

/** Lieferantenwechsel als Schrittfolge mit Fristen und Bestätigungsknöpfen für die jeweilige Rolle */
export function WechselKarte({ w, basisUrl = "/api/portal/kundenenergie/wechsel" }) {
  const url = `${basisUrl}/${w.id}`;
  const [ton, ampelText] = AMPEL[w.stand.ampel] || AMPEL.gruen;
  return (
    <div id={w.id} className="scroll-mt-24 grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink-900">{w.titel}{w.kunde ? ` · ${w.kunde.firma || w.kunde.name}` : ""}</p>
          <p className="text-[13px] text-ink-500">Neuer Versorger {w.lieferant} · Lieferbeginn {tag(`${w.lieferbeginn}-01`)}{w.vorvertrag ? ` · bisher ${w.vorvertrag.lieferant} bis ${tag(w.vorvertrag.vertragEnde)}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge ton={w.stand.abgeschlossen ? "ok" : ton}>{w.stand.abgeschlossen ? "abgeschlossen" : ampelText}</Badge>
          <span className="ov-num text-[13px] font-semibold text-ink-700">{w.stand.erledigt}/{w.stand.gesamt}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-ink-100" role="progressbar" aria-label="Fortschritt Lieferantenwechsel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={w.stand.prozent}>
        <div className={cn("h-2 rounded-full", w.stand.ampel === "gruen" ? "bg-ov-500" : "bg-sun-400")} style={{ width: `${w.stand.prozent}%` }} />
      </div>
      <ol className="grid gap-2">
        {w.schritte.map((s) => (
          <li key={s.id} className={cn("flex flex-col gap-2 rounded-2xl px-4 py-3 ring-1 ring-inset sm:flex-row sm:items-start sm:justify-between", s.status === "erledigt" ? "bg-ov-50/60 ring-ov-200" : s.status === "entfaellt" ? "bg-ink-50 ring-ink-100" : s.ueberfaellig ? "bg-sun-300/15 ring-sun-400/50" : "bg-white ring-ink-200/70")}>
            <div className="flex min-w-0 gap-3">
              <span aria-hidden="true" className="mt-0.5 shrink-0">
                {s.status === "erledigt" ? <Check className="h-4 w-4 text-ov-700" /> : s.status === "entfaellt" ? <Minus className="h-4 w-4 text-ink-400" /> : <Circle className="h-4 w-4 text-ink-300" />}
              </span>
              <div className="min-w-0">
                <p className={cn("text-[14px] font-semibold", s.status === "entfaellt" ? "text-ink-400" : "text-ink-900")}>{s.label}</p>
                <p className="text-[12.5px] leading-snug text-ink-500">
                  {s.status === "erledigt" ? `Erledigt ${tag(s.am)} · ${WECHSEL_ROLLE[s.von] || s.von}${s.bemerkung ? ` · ${s.bemerkung}` : ""}` : s.status === "entfaellt" ? "entfällt (kein bisheriger Vertrag erfasst)" : <><CalendarClock aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{s.frist ? `bis ${tag(s.frist)}` : "ohne Frist"} · {s.wer.map((x) => WECHSEL_ROLLE[x]).join(" / ")}{s.ueberfaellig ? " · überfällig" : ""}</>}
                </p>
              </div>
            </div>
            {s.darf && <WechselSchrittKnopf url={url} schritt={s.id} label="Bestätigen" />}
          </li>
        ))}
      </ol>
    </div>
  );
}
