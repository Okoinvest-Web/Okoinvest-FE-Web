// Fachprüfung Flächen – Anzeige-Bausteine (Server-Komponenten):
//  PipelineHinweis   „Was passiert jetzt, wie lange, was brauchen wir von Ihnen“ je Status und Land
//  FachPruefungListe Prüfhinweise mit Ampel (fehlt / Risiko / klären / gut)
//  FachAngaben       strukturierte Angaben lesbar (Flurstücke je Land, Boden, Lasten, Agri-PV, Dach)
//  Angebotsbogen     Pachtangebot vollständig, mit Ampel je Punkt und „Fragen, die Sie stellen sollten“
//  begriffeFuer      Lexikon-Einträge für Client-Formulare (Popover ohne das ganze Lexikon im Browser)

import { CheckCircle2, CircleAlert, CircleHelp, Clock, ListChecks, OctagonAlert, UserRoundCheck } from "lucide-react";
import { cn } from "@/components/ui/cn";
import Begriff, { lexikonEintrag } from "../Bedienung/Begriff";
import { Angaben } from "../ui";
import { pipelineErklaerung } from "@/lib/plattform/flaecheErklaerung";
import {
  AGRI_KATEGORIE, AGRI_KULTUREN, AGRI_SYSTEM, BELASTUNGEN, BEWIRTSCHAFTUNG, DACH_NETZ, DACH_NUTZER, DACHARTEN, EIGENTUM_FORMEN, EXPOSITION,
  INDEX_ARTEN, JNU, LAUFZEIT_BEGINN, NACHWEIS_66, PACHT_MODELLE, PACHT_OPTIONEN, REFERENZ_EINHEIT, STATIK, VERTRETUNG, WSG, ZUFAHRT, angebotsbogen,
  fachPruefung, flurstueckText, summenPruefung,
} from "@/lib/plattform/flaecheFach";
import { datum, eur } from "@/lib/plattform/format";

/** Lexikon-Einträge, die das Flächenformular als „?“ anbietet */
export const FORMULAR_BEGRIFFE = ["rangruecktritt", "gap-direktzahlungen", "agrarumweltmassnahmen", "bodenschaetzung", "netzverknuepfungspunkt", "din-spec-91434", "referenzertrag", "privilegierung-aussenbereich", "ppa", "natura-2000", "wasserschutzgebiet", "dachstatik", "grundbuch-abteilungen", "landpachtvertrag"];
export function begriffeFuer(ids = FORMULAR_BEGRIFFE) {
  return Object.fromEntries(ids.map((id) => [id, lexikonEintrag(id)]).filter(([, e]) => e));
}

/* ------------------------------------------------------------------ */

export function PipelineHinweis({ status, land = "DE", className }) {
  const e = pipelineErklaerung(status, land);
  if (!e) return null;
  return (
    <div className={cn("grid gap-4 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70 md:grid-cols-3 md:p-5", className)}>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">
          <ListChecks aria-hidden="true" className="h-4 w-4" /> Was passiert jetzt?
        </p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-700">{e.was}</p>
        {e.begriffe.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-600">
            {e.begriffe.map((b) => (
              <Begriff key={b} id={b} />
            ))}
          </p>
        )}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">
          <Clock aria-hidden="true" className="h-4 w-4" /> Wie lange typischerweise?
        </p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-700">{e.dauer}</p>
        <p className="mt-1 text-[12px] text-ink-500">Erfahrungswert, keine Zusage.</p>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">
          <UserRoundCheck aria-hidden="true" className="h-4 w-4" /> Was brauchen wir von Ihnen?
        </p>
        <ul className="mt-1.5 space-y-1 text-[14px] leading-relaxed text-ink-700">
          {e.vonIhnen.map((x) => (
            <li key={x} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const STUFE = {
  fehlt: { label: "Fehlt", icon: CircleAlert, klasse: "bg-sun-300/40 text-ink-900 ring-sun-400/60" },
  risiko: { label: "Risiko", icon: OctagonAlert, klasse: "bg-ink-900 text-white ring-ink-900" },
  hinweis: { label: "Klären", icon: CircleHelp, klasse: "bg-navy-50 text-navy-900 ring-navy-100" },
  ok: { label: "Gut", icon: CheckCircle2, klasse: "bg-ov-50 text-ov-800 ring-ov-200" },
};
const REIHENFOLGE = ["fehlt", "risiko", "hinweis", "ok"];

export function StufenMarke({ stufe }) {
  const s = STUFE[stufe] || STUFE.hinweis;
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1", s.klasse)}>
      <Icon aria-hidden="true" className={cn("h-3 w-3", stufe === "risiko" && "text-sun-400")} />
      {s.label}
    </span>
  );
}

export function FachPruefungListe({ flaeche }) {
  const p = fachPruefung(flaeche);
  const liste = [...p.punkte].sort((a, b) => REIHENFOLGE.indexOf(a.stufe) - REIHENFOLGE.indexOf(b.stufe));
  if (!liste.length) return <p className="text-[14px] text-ink-500">Keine Auffälligkeiten aus Ihren Angaben. Je mehr Fachangaben, desto genauer wird diese Prüfung.</p>;
  return (
    <div>
      <p className="mb-3 flex flex-wrap gap-1.5 text-[12.5px]" aria-label="Zusammenfassung">
        {REIHENFOLGE.filter((s) => p.zaehler[s]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <StufenMarke stufe={s} />
            <span className="text-ink-600">{p.zaehler[s]}</span>
          </span>
        ))}
      </p>
      <ul className="divide-y divide-ink-100">
        {liste.map((x) => (
          <li key={`${x.id}-${x.titel}`} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <StufenMarke stufe={x.stufe} />
              <p className="text-[14px] font-semibold text-ink-900">{x.titel}</p>
              <span className="text-[12px] text-ink-500">{x.bereich}</span>
            </div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">
              {x.text} {x.begriff && <Begriff id={x.begriff} nurIcon />}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-ink-500">Automatische Einordnung Ihrer Angaben – fachliche Orientierung, keine Rechtsberatung. Verbindlich ist unsere Prüfung.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const t = (liste, w) => (w ? liste[w] || "" : "");
const zahl = (x, einheit = "") => (x === null || x === undefined || x === "" ? "" : `${String(x).replace(".", ",")}${einheit ? ` ${einheit}` : ""}`);

export function FachAngaben({ flaeche: f }) {
  const fach = f.fach || {};
  const land = f.land || "DE";
  const fs = f.flurstuecke || [];
  const summe = summenPruefung(fs, f.ha);
  const lasten = (fach.eigentum?.belastungen || []).map((b) => BELASTUNGEN[b]).filter(Boolean);
  const e = fach.eigentum || {};
  const b = fach.bewirtschaftung || {};
  const fo = fach.foerderung || {};
  const bo = fach.boden || {};
  const sc = fach.schutz || {};
  const la = fach.lage || {};
  const a = fach.agri || {};
  const d = fach.dach || {};
  const schutz = [sc.natura2000 === "ja" && "Natura 2000", sc.nsg === "ja" && "Naturschutzgebiet", sc.lsg === "ja" && "Landschaftsschutzgebiet", sc.wsg && sc.wsg !== "nein" && `WSG ${WSG[sc.wsg]}`, sc.ueberschwemmung === "ja" && "Überschwemmungsgebiet", sc.denkmal === "ja" && "Denkmal", sc.biotop === "ja" && "Biotop"].filter(Boolean);
  const schutzBekannt = Object.values(sc).some(Boolean);

  return (
    <div className="space-y-5">
      {fs.length > 0 && (
        <div>
          <p className="mb-2 text-[12.5px] font-medium text-ink-500">{land === "AT" ? "Grundstücke" : land === "CH" ? "Parzellen" : "Flurstücke"} ({fs.length})</p>
          <ul className="space-y-1 text-[14.5px] text-ink-900">
            {fs.map((s, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-x-4">
                <span className="min-w-0 break-words">{flurstueckText(s, land) || [s.gemarkung, s.flur && `Flur ${s.flur}`, s.nummer && `Nr. ${s.nummer}`].filter(Boolean).join(" ")}</span>
                {s.m2 ? <span className="ov-num text-ink-600">{Number(s.m2).toLocaleString("de-DE")} m²</span> : null}
              </li>
            ))}
          </ul>
          {summe.summeHa !== null && <p className="mt-1.5 text-[13px] text-ink-600">{summe.text}</p>}
        </div>
      )}
      <Angaben
        items={[
          { label: "Eigentum", wert: [EIGENTUM_FORMEN[f.eigentum], e.anzahl && `${e.anzahl} Eigentümer`].filter(Boolean).join(" · ") },
          { label: "Unterschrift", wert: t(VERTRETUNG, e.vertretung) },
          { label: "Grundbuchlasten", wert: lasten.join(", ") || (e.lastenBekannt === "ja" ? "keine angegeben" : ""), breit: true },
          { label: "Bewirtschaftung", wert: [t(BEWIRTSCHAFTUNG, b.art), b.paechter, b.pachtEnde && `bis ${b.pachtEnde}`, b.kuendigungMonate != null && b.kuendigungMonate !== "" && `Kündigung ${b.kuendigungMonate} Monate`].filter(Boolean).join(" · ") },
          { label: "Förderung", wert: [fo.gap === "ja" && "Direktzahlungen", fo.aukm === "ja" && `${land === "AT" ? "ÖPUL" : "AUKM"}${fo.aukmArt ? ` (${fo.aukmArt})` : ""}${fo.aukmEnde ? ` bis ${fo.aukmEnde}` : ""}`].filter(Boolean).join(", ") },
          { label: land === "AT" ? "Bodenschätzung" : "Bodengüte", wert: [bo.ackerzahl && `Ackerzahl ${bo.ackerzahl}`, bo.gruenlandzahl && `Grünlandzahl ${bo.gruenlandzahl}`, bo.bodenklimazahl && `Bodenklimazahl ${bo.bodenklimazahl}`, bo.ertragsmesszahl && `EMZ ${bo.ertragsmesszahl}`, bo.quelle].filter(Boolean).join(" · ") },
          { label: "Schutzgebiete", wert: schutz.join(", ") || (schutzBekannt ? "keine bekannt" : "") },
          { label: "Lage", wert: [la.hangneigung != null && la.hangneigung !== "" && `Neigung ${zahl(la.hangneigung, "%")}`, t(EXPOSITION, la.exposition), t(ZUFAHRT, la.zufahrt), la.waldAngrenzend === "ja" && "Wald angrenzend", la.leitungen === "ja" && (la.leitungenText || "Leitungen"), la.netzKm != null && la.netzKm !== "" && `Umspannwerk ca. ${zahl(la.netzKm, "km")}`].filter(Boolean).join(" · "), breit: true },
          { label: "Gemeindeschlüssel", wert: la.gemeindeSchluessel },
        ]}
      />
      {f.agri && f.nutzung !== "dach" && Object.keys(a).length > 0 && (
        <div>
          <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">Agri-PV</p>
          <Angaben
            items={[
              { label: "Kategorie (DIN SPEC 91434)", wert: t(AGRI_KATEGORIE, a.kategorie) },
              { label: "Bauweise", wert: t(AGRI_SYSTEM, a.system) },
              { label: "Kultur", wert: a.kultur === "sonstige" ? a.kulturText || "Sonstige" : t(AGRI_KULTUREN, a.kultur) },
              { label: "Maschinen", wert: [a.arbeitsbreiteM && `Arbeitsbreite ${zahl(a.arbeitsbreiteM, "m")}`, a.durchfahrtshoeheM && `Durchfahrt ${zahl(a.durchfahrtshoeheM, "m")}`, a.gassenbreiteM && `Gasse ${zahl(a.gassenbreiteM, "m")}`].filter(Boolean).join(" · ") },
              { label: "Referenzertrag", wert: a.referenzertrag ? `${zahl(a.referenzertrag)} ${REFERENZ_EINHEIT[a.referenzEinheit] || ""}`.trim() : "" },
              { label: "Nachweis 66 %-Regel", wert: t(NACHWEIS_66, a.nachweis66) },
              { label: "Direktzahlungen weiter", wert: t(JNU, a.gapWeiter) },
              { label: "Hofbezug", wert: a.hofbezug ? `${JNU[a.hofbezug]}${a.hofEntfernungM ? ` (${a.hofEntfernungM} m)` : ""}` : "" },
            ]}
          />
        </div>
      )}
      {f.nutzung === "dach" && Object.keys(d).length > 0 && (
        <div>
          <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">Dachfläche</p>
          <Angaben
            items={[
              { label: "Dachart", wert: t(DACHARTEN, d.dachart) },
              { label: "Fläche / Neigung", wert: [d.dachflaecheM2 && `${Number(d.dachflaecheM2).toLocaleString("de-DE")} m²`, d.neigungGrad != null && d.neigungGrad !== "" && `${d.neigungGrad}°`].filter(Boolean).join(" · ") },
              { label: "Baujahr", wert: [d.baujahrGebaeude && `Gebäude ${d.baujahrGebaeude}`, d.baujahrDach && `Eindeckung ${d.baujahrDach}`].filter(Boolean).join(" · ") },
              { label: "Asbest", wert: t(JNU, d.asbest) },
              { label: "Statik", wert: [t(STATIK, d.statik), d.statikReserveKn != null && d.statikReserveKn !== "" && `${zahl(d.statikReserveKn)} kN/m²`].filter(Boolean).join(" · ") },
              { label: "Brandwände / Blitzschutz", wert: [d.brandwaende && `Brandwände: ${JNU[d.brandwaende]}`, d.blitzschutz && `Blitzschutz: ${JNU[d.blitzschutz]}`].filter(Boolean).join(" · ") },
              { label: "Netzanschluss", wert: [t(DACH_NETZ, d.netz), d.trafoKva && `${d.trafoKva} kVA`].filter(Boolean).join(" · ") },
              { label: "Nutzer", wert: [t(DACH_NUTZER, d.nutzer), d.mieter, d.dachstrom === "ja" && "Interesse an Dachstrom"].filter(Boolean).join(" · ") },
            ]}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const AMPEL = {
  gut: { label: "Marktüblich", icon: CheckCircle2, klasse: "bg-ov-500/15 text-ov-200 ring-ov-400/40" },
  pruefen: { label: "Nachfragen", icon: CircleAlert, klasse: "bg-sun-400/15 text-sun-300 ring-sun-400/40" },
  kritisch: { label: "Kritisch", icon: OctagonAlert, klasse: "bg-white text-ink-900 ring-white" },
  offen: { label: "Nicht geregelt", icon: CircleHelp, klasse: "bg-white/[0.06] text-white/80 ring-white/20" },
  standard: { label: "Allgemein", icon: CircleHelp, klasse: "bg-white/[0.06] text-white/70 ring-white/15" },
};

function AmpelMarke({ ampel }) {
  const a = AMPEL[ampel] || AMPEL.offen;
  const Icon = a.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1", a.klasse)}>
      <Icon aria-hidden="true" className="h-3 w-3" />
      {a.label}
    </span>
  );
}

const tsd = (v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toLocaleString("de-DE", { maximumFractionDigits: 2 })} Mio. €` : eur(Math.round(v)));

/** Pachtangebot als Angebotsbogen (dunkle Karte); `aktionen` = Annehmen/Rückfrage (vom Seitenkopf) */
export function Angebotsbogen({ flaeche: f, aktionen }) {
  const pa = f.pachtangebot;
  const r = angebotsbogen(f);
  if (!pa || !r) return null;
  const ha = Number(f.ha) || 0;
  const eintraege = [
    ["Modell", PACHT_MODELLE[pa.modell || "fest"]],
    pa.umsatzProzent ? ["Umsatzbeteiligung", `${zahl(pa.umsatzProzent)} % der Stromerlöse${pa.mindestProHa ? `, mindestens ${eur(pa.mindestProHa)} je ha` : ""}`] : null,
    ["Wertsicherung", pa.indexierung ? `${INDEX_ARTEN[pa.indexierung]}${pa.indexierung === "fest" && pa.indexSatzProzent ? ` (${zahl(pa.indexSatzProzent)} % p. a.)` : ""}` : null],
    ["Reservierungsprämie", pa.reservierungProHaJahr ? `${eur(pa.reservierungProHaJahr)} je ha und Jahr bis Baubeginn` : null],
    ["Laufzeit", `${pa.laufzeitJahre} Jahre${pa.laufzeitBeginn ? ` ${LAUFZEIT_BEGINN[pa.laufzeitBeginn]}` : ""}${pa.verlaengerungJahre ? ` + ${pa.verlaengerungJahre} Jahre Option` : pa.verlaengerung ? ` · ${pa.verlaengerung}` : ""}`],
    ["Späteste Frist bis Baubeginn", pa.optionsfristJahre != null ? (pa.optionsfristJahre ? `${pa.optionsfristJahre} Jahre` : "unbegrenzt") : null],
    ["Bewirtschaftung bis Baubeginn", PACHT_OPTIONEN.bewirtschaftung[pa.bewirtschaftung]],
    ["Wenn nicht gebaut wird", pa.nichtbau ? `${PACHT_OPTIONEN.nichtbau[pa.nichtbau]}${pa.nichtbauEuroProHa ? ` (${eur(pa.nichtbauEuroProHa)} je ha)` : ""}` : null],
    ["Rücktrittsrecht des Pächters", PACHT_OPTIONEN.kuendigung[pa.kuendigung]],
    ["Rückbausicherheit", pa.rueckbau ? `${PACHT_OPTIONEN.rueckbau[pa.rueckbau]}${pa.rueckbauEuro ? ` über ${eur(pa.rueckbauEuro)}` : ""}${pa.rueckbauAb ? `, ${pa.rueckbauAb === "baubeginn" ? "ab Baubeginn" : "erst später"}` : ""}` : null],
    ["Dienstbarkeit", PACHT_OPTIONEN.dienstbarkeit[pa.dienstbarkeit]],
    ["Rangrücktritt", pa.rangruecktritt === true ? "holt der Pächter ein" : pa.rangruecktritt === false ? "nicht vorgesehen" : null],
    ["Nebenflächen", pa.nebenflaechen ? `${PACHT_OPTIONEN.nebenflaechen[pa.nebenflaechen]}${pa.nebenflaechenText ? ` – ${pa.nebenflaechenText}` : ""}` : null],
    ["Anwalt / Notar", pa.anwalt ? `${PACHT_OPTIONEN.anwalt[pa.anwalt]}${pa.anwalt === "gedeckelt" && pa.anwaltEuro ? ` (${eur(pa.anwaltEuro)})` : ""}` : null],
    ["Angebot gültig bis", pa.gueltigBis ? datum(pa.gueltigBis) : null],
  ].filter((x) => x);

  return (
    <section aria-labelledby="angebotsbogen" className="ov-noise relative overflow-hidden rounded-3xl bg-navy-950 p-5 text-white md:p-8">
      <div aria-hidden="true" className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-ov-500/30 blur-[90px]" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">Angebotsbogen · Pachtangebot vom {datum(pa.am)}</p>
            <h2 id="angebotsbogen" className="mt-2 font-display text-[22px] font-extrabold md:text-[26px]">{r.urteil.titel}</h2>
            <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-white/75">{r.urteil.text}</p>
          </div>
          {aktionen && <div className="flex flex-col gap-2">{aktionen}</div>}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <dt className="text-[12.5px] text-white/60">
              {pa.modell && pa.modell !== "fest" ? "Mindestpacht je ha" : "Pacht je ha und Jahr"} <Begriff id="flaechenpacht" nurIcon />
            </dt>
            <dd className="ov-num mt-1 font-display text-[24px] font-extrabold md:text-[28px]">{pa.euroProHaJahr ? eur(pa.euroProHaJahr) : pa.umsatzProzent ? `${zahl(pa.umsatzProzent)} %` : "–"}</dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-white/60">Ihre {zahl(ha)} ha im 1. Betriebsjahr</dt>
            <dd className="ov-num mt-1 font-display text-[24px] font-extrabold md:text-[28px]">{r.jahrespacht ? tsd(r.jahrespacht) : tsd(r.eingabe.mindestProHa * ha || 0)}</dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-white/60">Summe über die Laufzeit</dt>
            <dd className="ov-num mt-1 font-display text-[20px] font-bold md:text-[22px]">{tsd(r.summe)}</dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-white/60">Barwert (3 % Zins)</dt>
            <dd className="ov-num mt-1 font-display text-[20px] font-bold md:text-[22px]">{tsd(r.barwert)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[12px] text-white/50">
          Übliche Spanne {f.agri ? "Agri-PV" : "Freiflächen-PV"}: {eur(r.spanne.min)}–{eur(r.spanne.max)} je ha und Jahr (DACH). Summe inkl. Reservierungsprämie bei {r.eingabe.vorlaufJahre} Jahren Vorlauf; Umsatzmodelle mit Ertrags- und Preisannahmen gerechnet.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">Alle Punkte des Angebots</p>
            <dl className="divide-y divide-white/10 rounded-2xl bg-white/[0.04] px-4 ring-1 ring-white/10">
              {eintraege.map(([k, w]) => (
                <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-3">
                  <dt className="text-[13px] text-white/60">{k}</dt>
                  <dd className={cn("text-[14px]", w ? "text-white" : "italic text-white/45")}>{w || "nicht angegeben"}</dd>
                </div>
              ))}
            </dl>
            {pa.text && <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-white/75">{pa.text}</p>}
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">Einordnung je Punkt</p>
            <ul className="space-y-2">
              {r.klauseln.map((k) => (
                <li key={k.id} className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 [&::-webkit-details-marker]:hidden">
                      <AmpelMarke ampel={k.ampel} />
                      <span className="text-[14px] font-semibold">{k.titel}</span>
                      <span className="text-[12.5px] text-white/55">{k.wert}</span>
                    </summary>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-white/75">{k.text}</p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 md:p-5">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ov-300">Fragen, die Sie stellen sollten</p>
          <ol className="mt-3 space-y-2.5">
            {r.fragen.map((q, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-white/85">
                <span className="ov-num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] font-bold">{i + 1}</span>
                <span className="min-w-0">
                  <span className="text-white/55">{q.thema}: </span>
                  {q.frage}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p className="rounded-2xl bg-white/[0.04] p-4 text-[13px] leading-relaxed text-white/70 ring-1 ring-white/10">
            <span className="font-semibold text-white">Rückbau:</span> Grob geschätzte Rückbaukosten für diese Fläche rund {tsd(r.rueckbauKostenSchaetzung)} – daran sollte sich die Sicherheit orientieren. <Begriff id="rueckbauverpflichtung" nurIcon />
          </p>
          <p className="rounded-2xl bg-white/[0.04] p-4 text-[13px] leading-relaxed text-white/70 ring-1 ring-white/10">
            <span className="font-semibold text-white">Steuern:</span> {r.steuerhinweis} <Begriff id="landwirtschaftliches-vermoegen" nurIcon />
          </p>
        </div>
        <p className="mt-3 text-[12px] text-white/50">Einordnung nach der Logik des Pachtangebot-Checks – Orientierung, keine Rechts- oder Steuerberatung. Verbindlich ist allein der unterzeichnete Vertrag.</p>
      </div>
    </section>
  );
}
