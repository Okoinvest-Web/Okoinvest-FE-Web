"use client";

// src/components/Rechner/GewerbestromCheckAT.js – AT-Gewerbestrom: Vorbereitung SNE-VO 2027 (Welle 4, Paket ATSNE)
//
// Österreich-Schiene des Rechnungs-Checks (/rechner/gewerbestrom-check auf /at):
//  - Eingabemaske schon jetzt: Netzebene (§ 63 ElWOG 2010), Jahresverbrauch, höchste Leistung.
//    Als einzige Zahl rechnen wir die Benutzungsstunden aus den EIGENEN Eingaben (Plausibilität).
//  - Ergebnis BLEIBT ein Länderhinweis mit Zeitplan, bis die neuen Systemnutzungsentgelte 2027
//    im RIS kundgemacht und am Original geprüft sind („erwartet Q1 2027“) – keine geschätzten Werte.
//  - Dokumentiert die Struktur der Entgelte nach der geltenden SNE-V 2018 (RIS, Faktenregister)
//    und die Abgaben-Rechtsgrundlagen (ElAbgG, § 75 EAG) – nur belegte Aussagen mit Quelle.
//  - Erinnerungs-Einstieg: Newsletter-Baustein „AT-Netzentgelte 2027“ (Thema Fristen & Förderung).
// Rechenlogik: src/lib/rechner/gewerbestromAt.js. Nachtrag der Werte: scripts/at-sne-nachtrag.md.

import { useMemo, useState } from "react";
import { BellRing, CalendarClock, Gauge, Landmark, Scale, Zap } from "lucide-react";
import { Auswahl, Gruppe, Kennzahl } from "./bausteine";
import { ErgebnisKopf, Hinweis, RechnerRahmen } from "./InvestTeile";
import { ZahlFeld } from "./ToolTeile";
import NewsletterAnmeldung from "@/components/Newsletter/NewsletterAnmeldung";
import { LandHinweis } from "@/components/Land/LandHinweis";
import { useSprache, useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { BESTANDTEILE_AT, EAG_FOERDERBEITRAG_AT, ELEKTRIZITAETSABGABE_AT, NETZEBENEN_AT, STANDARD_AT, atCheck } from "@/lib/rechner/gewerbestromAt";

const TEXTE = {
  de: {
    intro: "Erfassen Sie Ihren Anschluss schon jetzt – sobald die neuen Entgelte im RIS stehen, rechnet der Check damit.",
    g1: "1 · Anschluss",
    netzebene: "Netzebene",
    netzebeneHinweis: "Steht im Netznutzungsvertrag oder auf der Netzrechnung. Gewerbe liegt meist auf den Ebenen 3–7.",
    g2: "2 · Verbrauch",
    verbrauch: "Jahresverbrauch",
    leistung: "Höchste Leistung (Spitze)",
    leistungHinweis: "Steht bei Leistungsmessung auf der Netzrechnung. 0 = unbekannt.",
    ergebnisTitel: "Österreich: in Vorbereitung",
    plakette: "SNE-VO 2027",
    benutzung: "Benutzungsstunden",
    benutzungZusatz: "aus Ihren Angaben: Jahresverbrauch ÷ höchste Leistung",
    unplausibel: "Mehr als 8.760 Benutzungsstunden sind nicht möglich – bitte prüfen Sie Jahresverbrauch und Leistung.",
    zeitplan:
      "Für Österreich gelten ab 1. Jänner 2027 neue Systemnutzungsentgelte nach dem ElWG (Grundsatz- und Tarifverordnung der E-Control). Werte folgen nach Veröffentlichung im RIS, erwartet Q1 2027 – bis dahin zeigt der Check bewusst keine geschätzten Entgelte.",
    strukturTitel: "So sind die Netzentgelte heute aufgebaut (SNE-V 2018)",
    strukturText: "Die geltende Verordnung legt die Entgelte je Netzbereich und Netzebene fest. Diese Bestandteile stehen auf der Netzrechnung:",
    abgabenTitel: "Abgaben auf Gewerbestrom (Rechtsgrundlagen)",
    abgabe: (satz) =>
      `Elektrizitätsabgabe: Regelsatz ${satz} (§ 4 Abs. 2 ElAbgG). Befristete Sondersätze aus dem Übergangsrecht prüfen wir vor jeder Verwendung am RIS.`,
    eag: "Erneuerbaren-Förderbeitrag (§ 75 EAG): zahlen alle an das öffentliche Netz angeschlossenen Endverbraucher, bemessen im Verhältnis zu Netznutzungs- und Netzverlustentgelt; der Satz wird jährlich durch Verordnung festgelegt. Den geltenden Satz tragen wir nach, sobald er am RIS geprüft ist.",
    quelle: "Quelle (RIS)",
    erinnerung: {
      titel: "AT-Netzentgelte 2027: erinnern lassen",
      text: "Wir melden uns, sobald die neuen Systemnutzungsentgelte im RIS kundgemacht und hier eingepflegt sind – wählen Sie dafür das Thema „Fristen & Förderung“.",
    },
  },
  en: {
    intro: "Record your connection now – as soon as the new charges are published in the RIS, the check will use them.",
    g1: "1 · Connection",
    netzebene: "Grid level",
    netzebeneHinweis: "Shown in your grid access contract or on the grid bill. Businesses are usually on levels 3–7.",
    g2: "2 · Consumption",
    verbrauch: "Annual consumption",
    leistung: "Peak demand",
    leistungHinweis: "Shown on the grid bill with metered demand. 0 = unknown.",
    ergebnisTitel: "Austria: in preparation",
    plakette: "SNE-VO 2027",
    benutzung: "Utilisation hours",
    benutzungZusatz: "from your figures: annual consumption ÷ peak demand",
    unplausibel: "More than 8,760 utilisation hours are not possible – please check annual consumption and peak demand.",
    zeitplan:
      "From 1 January 2027, new system usage charges under the ElWG apply in Austria (E-Control framework and tariff ordinance). Values will follow after publication in the RIS, expected Q1 2027 – until then the check deliberately shows no estimated charges.",
    strukturTitel: "How grid charges are structured today (SNE-V 2018)",
    strukturText: "The current ordinance sets the charges per grid area and grid level. These components appear on the grid bill:",
    abgabenTitel: "Levies on commercial electricity (legal basis)",
    abgabe: (satz) =>
      `Electricity levy: standard rate ${satz} (§ 4 para. 2 ElAbgG). Temporary special rates from transitional law are checked against the RIS before any use.`,
    eag: "Renewables support contribution (§ 75 EAG): paid by all end consumers connected to the public grid, measured in proportion to grid usage and grid loss charges; the rate is set annually by ordinance. We will add the applicable rate once it has been verified in the RIS.",
    quelle: "Source (RIS)",
    erinnerung: {
      titel: "AT grid charges 2027: get a reminder",
      text: "We will let you know as soon as the new system usage charges are published in the RIS and added here – choose the topic “Deadlines & funding”.",
    },
  },
};

const BESTANDTEILE_EN = {
  netznutzung: { titel: "Grid usage charge", text: "energy rate (ct/kWh) and – with metered demand – demand rate (€/kW), per grid area and grid level" },
  netzverlust: { titel: "Grid loss charge", text: "charge for procuring grid losses, energy-based" },
  netzbereitstellung: { titel: "Grid provision charge", text: "one-off, demand-based on grid connection or when exceeding the agreed capacity" },
  systemdienstleistung: { titel: "System services charge", text: "for generators above a certain connected capacity (secondary control)" },
  messleistung: { titel: "Metering charge", text: "maximum prices per meter type and reading" },
};

export default function GewerbestromCheckAT() {
  const t = useTexte(TEXTE);
  const en = useSprache() === "en";
  const f = useFormate();
  const [netzebene, setNetzebene] = useState(STANDARD_AT.netzebene);
  const [verbrauchKwh, setVerbrauchKwh] = useState(STANDARD_AT.verbrauchKwh);
  const [leistungKw, setLeistungKw] = useState(STANDARD_AT.leistungKw);

  const check = useMemo(() => atCheck({ netzebene, verbrauchKwh, leistungKw }), [netzebene, verbrauchKwh, leistungKw]);
  const abgabeSatz = `${f.fmt(ELEKTRIZITAETSABGABE_AT.wert, 1)} ct/kWh`;

  const eingaben = (
    <div className="space-y-7">
      <p className="text-[14px] leading-relaxed text-ink-600">{t.intro}</p>
      <Gruppe titel={t.g1}>
        <Auswahl legende={t.netzebene} optionen={NETZEBENEN_AT} wert={netzebene} onChange={setNetzebene} spalten={1} klein />
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{t.netzebeneHinweis}</p>
      </Gruppe>
      <Gruppe titel={t.g2}>
        <div className="space-y-5">
          <ZahlFeld id="at-verbrauch" label={t.verbrauch} wert={verbrauchKwh} onChange={setVerbrauchKwh} min={0} max={500000000} step={1000} einheit="kWh/Jahr" />
          <ZahlFeld id="at-leistung" label={t.leistung} wert={leistungKw} onChange={setLeistungKw} min={0} max={500000} step={5} einheit="kW" hinweis={t.leistungHinweis} />
        </div>
      </Gruppe>
    </div>
  );

  const ergebnis = (
    <div className="space-y-5">
      <ErgebnisKopf titel={t.ergebnisTitel} plakette={t.plakette} />

      {check.benutzungsstunden !== null && (
        <Kennzahl label={t.benutzung} icon={Gauge} zusatz={t.benutzungZusatz}>
          {f.fmt(Math.round(check.benutzungsstunden))} h
        </Kennzahl>
      )}
      {check.plausibel === false && (
        <Hinweis ton="warnung" icon={Zap}>
          {t.unplausibel}
        </Hinweis>
      )}

      {/* Ergebnis bis zum Inkrafttreten der Fassung 2027: Länderhinweis mit Zeitplan, keine Werte */}
      <LandHinweis land="AT" text={TEXTE.de.zeitplan} textEn={TEXTE.en.zeitplan} thema="Netzentgelte" themaEn="grid charges" />

      <section aria-label={t.strukturTitel}>
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink-900">
          <Scale aria-hidden="true" className="h-4 w-4 text-ov-600" /> {t.strukturTitel}
        </h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{t.strukturText}</p>
        <ul className="mt-3 space-y-2">
          {BESTANDTEILE_AT.map((b) => {
            const ue = en ? BESTANDTEILE_EN[b.id] : null;
            return (
              <li key={b.id} className="rounded-2xl bg-sand-50 px-4 py-3 ring-1 ring-ink-200/60">
                <p className="text-[14px] font-semibold text-ink-900">
                  {ue?.titel || b.titel} <span className="ml-1 text-[12px] font-medium text-ink-500">{b.par}</span>
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-600">{ue?.text || b.text}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[12.5px] text-ink-500">
          {t.quelle}:{" "}
          <a href="https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20010107" target="_blank" rel="noreferrer" className="underline decoration-ink-300 underline-offset-2 hover:text-ink-700">
            SNE-V 2018 (RIS)
          </a>
        </p>
      </section>

      <section aria-label={t.abgabenTitel}>
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink-900">
          <Landmark aria-hidden="true" className="h-4 w-4 text-ov-600" /> {t.abgabenTitel}
        </h3>
        <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-600">
          <li className="flex items-start gap-2">
            <CalendarClock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
            <span>
              {t.abgabe(abgabeSatz)}{" "}
              <a href={ELEKTRIZITAETSABGABE_AT.quelle.url} target="_blank" rel="noreferrer" className="underline decoration-ink-300 underline-offset-2 hover:text-ink-700">
                {t.quelle}
              </a>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CalendarClock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
            <span>
              {t.eag}{" "}
              <a href={EAG_FOERDERBEITRAG_AT.quelle.url} target="_blank" rel="noreferrer" className="underline decoration-ink-300 underline-offset-2 hover:text-ink-700">
                {t.quelle}
              </a>
            </span>
          </li>
        </ul>
      </section>
    </div>
  );

  const unten = (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-ov-700">
        <BellRing aria-hidden="true" className="h-4 w-4" /> {t.erinnerung.titel}
      </p>
      <NewsletterAnmeldung
        quelle="gewerbestrom-at"
        ebene="h3"
        texte={{
          de: { titel: TEXTE.de.erinnerung.titel, text: TEXTE.de.erinnerung.text },
          en: { titel: TEXTE.en.erinnerung.titel, text: TEXTE.en.erinnerung.text },
        }}
      />
    </div>
  );

  return <RechnerRahmen eingaben={eingaben} ergebnis={ergebnis} unten={unten} werkzeuge={false} />;
}
