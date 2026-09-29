// Ratgeber: Repowering alter Solarparks – Modultausch nach § 38b Abs. 2 EEG, Leistungserhöhung, Post-EEG, Wirtschaftlichkeit, Recycling
// Recherchestand 29.09.2026 (EEG 2023 §§ 38b, 48 Abs. 4, 100 Abs. 12 und 27, § 21; Solarpaket I in Kraft seit 16.05.2024;
// Clearingstelle EEG|KWKG, Häufige Rechtsfrage 141; SFV-Übersicht Vergütungssätze EEG 2009–2012; ElektroG Anlage 1).
// Marktwerte aus src/lib/invest/markt.js, Barwert/IRR mit npv()/irr().

import { FREIFLAECHE, ERLOESE, PACHT, FINANZIERUNG, REGIONEN, npv, irr, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtMio, fmtPct, fmtCt } from "@/lib/rechner/annahmen";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// SFV, EEG 2009 inkl. Änderungen: Vergütung Freiflächenanlagen („sonstige Freiflächen“) nach Inbetriebnahme, ct/kWh
const VERGUETUNG_ALT = [
  { zeit: "2009", ct: 31.94 },
  { zeit: "01.07.–31.12.2010", ct: 25.02 },
  { zeit: "2011", ct: 21.11 },
  { zeit: "01.01.–31.03.2012", ct: 17.94 },
];
// Beispielpark: Inbetriebnahme 2011, 20 Jahre plus Inbetriebnahmejahr → Förderende 31.12.2031
const TARIF_CT = 21.11;
const FOERDERENDE = 2031;
const START = 2027; // Jahr des Repowerings im Beispiel
const EEG_REST = FOERDERENDE - START + 1;
// Eigene Annahmen für das Beispiel (keine Marktstatistik):
const MWP_ALT = 5;
const HA = 15; // rund 3 ha je MWp – Flächenbedarf mit Modulen der Baujahre um 2011 (eigene Orientierung)
const SPEZ_ALT = { basis: 950, schwach: 850 }; // heutiger Ertrag des Altparks in kWh/kWp (Degradation, ältere Wechselrichter)
const WR_TAUSCH_KWP = 30; // Wechselrichtertausch Altpark inkl. Montage, €/kWp (eigene Annahme)
const REPOWER_ANTEIL = 0.6; // Modul- und Wechselrichtertausch als Anteil der Neubaukosten (Unterkonstruktion, Zaun, Wege, Netz bleiben)
const MWP_NEU = 12; // Leistung bei Neubelegung derselben Fläche mit aktuellen Modulen (~1,1 ha/MWp)

/* ---------- Rechenmodell ---------- */
const REGION = REGIONEN.find((r) => r.id === "de-sued");
const KWP_ALT = MWP_ALT * 1000;
const REPOWER_KWP = FREIFLAECHE.capexProKwp.mittel * REPOWER_ANTEIL;

/** Cashflows ab Jahr 0 (= Beginn 2027): Investition, dann Betrieb bis Jahr `jahre`, Rückbau im letzten Jahr */
function variante({ kwp, spez, jahre, invest, eegKwp }) {
  const cf = [-invest];
  for (let t = 1; t <= jahre; t++) {
    const kwh = kwp * spez * Math.pow(1 - FREIFLAECHE.degradation, t - 1);
    const markt = ERLOESE.merchantCt * Math.pow(1 + ERLOESE.merchantSteigerung, t - 1);
    const eegAnteil = t <= EEG_REST ? Math.min(1, eegKwp / kwp) : 0; // § 38b Abs. 2 Satz 3: anteiliger Anspruch
    const erloes = (kwh * (eegAnteil * Math.max(TARIF_CT, markt) + (1 - eegAnteil) * markt)) / 100;
    const kosten = kwp * FREIFLAECHE.opexProKwp * Math.pow(1 + FREIFLAECHE.inflation, t - 1) + HA * PACHT.freiflaecheProHa.mittel * Math.pow(1 + PACHT.indexierung, t - 1);
    cf.push(erloes - kosten - (t === jahre ? kwp * FREIFLAECHE.rueckbauProKwp : 0));
  }
  return cf;
}
const auf = (a, n) => [...a, ...Array(Math.max(0, n - a.length)).fill(0)];
const differenz = (a, b) => auf(a, 21).map((x, i) => x - auf(b, 21)[i]);
const r = FINANZIERUNG.diskont;

const V1 = (spez) => variante({ kwp: KWP_ALT, spez, jahre: 10, invest: KWP_ALT * WR_TAUSCH_KWP, eegKwp: KWP_ALT });
const V2 = variante({ kwp: KWP_ALT, spez: REGION.ertrag, jahre: 20, invest: KWP_ALT * REPOWER_KWP, eegKwp: KWP_ALT });
const INV3 = MWP_NEU * 1000 * FREIFLAECHE.capexProKwp.mittel + (MWP_NEU - MWP_ALT) * FREIFLAECHE.netzanschlussFixProMwp + KWP_ALT * FREIFLAECHE.rueckbauProKwp;
const V3 = variante({ kwp: MWP_NEU * 1000, spez: REGION.ertrag, jahre: 20, invest: INV3, eegKwp: KWP_ALT });
const V3_PPA = (() => {
  // Variante 3, Mehrmenge und Zeit nach Förderende zum PPA-Preis (Obergrenze der Spanne)
  const cf = [-INV3];
  const kwp = MWP_NEU * 1000;
  for (let t = 1; t <= 20; t++) {
    const kwh = kwp * REGION.ertrag * Math.pow(1 - FREIFLAECHE.degradation, t - 1);
    const eegAnteil = t <= EEG_REST ? KWP_ALT / kwp : 0;
    const erloes = (kwh * (eegAnteil * TARIF_CT + (1 - eegAnteil) * ERLOESE.ppaCt.max)) / 100;
    const kosten = kwp * FREIFLAECHE.opexProKwp * Math.pow(1 + FREIFLAECHE.inflation, t - 1) + HA * PACHT.freiflaecheProHa.mittel * Math.pow(1 + PACHT.indexierung, t - 1);
    cf.push(erloes - kosten - (t === 20 ? kwp * FREIFLAECHE.rueckbauProKwp : 0));
  }
  return cf;
})();

const NPV1 = npv(r, V1(SPEZ_ALT.basis));
const NPV1_SCHWACH = npv(r, V1(SPEZ_ALT.schwach));
const NPV2 = npv(r, V2);
const NPV3 = npv(r, V3);
const NPV3_PPA = npv(r, V3_PPA);
const IRR_D2 = irr(differenz(V2, V1(SPEZ_ALT.basis)));
const IRR_D2_SCHWACH = irr(differenz(V2, V1(SPEZ_ALT.schwach)));
const EEG_ANTEIL_V3 = KWP_ALT / (MWP_NEU * 1000);
const ERLOES_ALT_JAHR1 = (KWP_ALT * SPEZ_ALT.basis * TARIF_CT) / 100;
const ERLOES_MARKT_ALT = (KWP_ALT * SPEZ_ALT.basis * ERLOESE.merchantCt) / 100;
const pct = (x) => (x == null ? "–" : fmtPct(x, 1));
const mio = (x) => fmtMio(x, 2);

const artikel = {
  slug: "repowering-solarpark",
  title: "Repowering alter Solarparks: Modultausch, EEG-Regeln, Rechnung",
  seoTitle: "Repowering Solarpark: Modultausch & EEG | ÖkoInvest",
  kurzTitel: "Repowering von Solarparks",
  description:
    "Repowering alter Solarparks: Modultausch nach § 38b EEG ohne Verlust der Vergütung, Leistungserhöhung, Post-EEG-Optionen, Wirtschaftlichkeit und Recycling.",
  excerpt:
    "Solarparks der Jahre 2009 bis 2012 erhalten noch einige Jahre hohe EEG-Vergütungen. Wann sich neue Module lohnen, was das Solarpaket I geändert hat und welche Wege nach dem Förderende bleiben.",
  hauptKeyword: "repowering solarpark",
  keywords: [
    "Repowering Solarpark",
    "Modultausch EEG Vergütung",
    "§ 38b EEG Ersatz Solaranlage",
    "Solarpark nach 20 Jahren",
    "Post-EEG Freiflächenanlage",
    "Revamping Photovoltaik",
    "PV-Module Recycling",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Investieren & Projektbörse",
  bild: "/img/montage-freiflaeche.jpg",
  bildAlt: "Monteur mit weißem Schutzhelm verschraubt mit einem Akkuschrauber Solarmodule auf einer Freiflächen-Unterkonstruktion",
  badge: { wert: fmtCt(TARIF_CT, 2), text: "EEG-Vergütung einer 2011 in Betrieb genommenen Freiflächenanlage (sonstige Freiflächen)" },

  kurzFazit: [
    `**Freiflächenanlagen aus 2009 bis 2012 erhalten noch bis Ende 2029 bis 2032 Vergütungen von rund ${fmt(VERGUETUNG_ALT[3].ct, 0)} bis ${fmt(VERGUETUNG_ALT[0].ct, 0)} ct/kWh** – ein Vielfaches heutiger Zuschläge von rund ${fmtCt(ERLOESE.eegFreiflaecheCt)}.`,
    "**Module dürfen nach § 38b Abs. 2 EEG ersetzt werden, ohne dass die Vergütung verloren geht** – seit dem Solarpaket I (16.05.2024) auch ohne Defekt. Die neuen Module übernehmen Inbetriebnahmedatum und Restlaufzeit, aber nur bis zur bisherigen Leistung.",
    `**Mehrleistung bringt keine Altvergütung:** Wird die Leistung erhöht, gilt der alte Satz nur für den Anteil alte Leistung zu neuer Leistung. Im Beispiel (${fmt(MWP_ALT)} auf ${fmt(MWP_NEU)} MWp) sind das ${fmtPct(EEG_ANTEIL_V3, 0)} der Einspeisung.`,
    `**Im Rechenbeispiel lohnt ein 1:1-Modultausch vor allem, wenn der Altpark schwach produziert:** Bei ${fmt(SPEZ_ALT.basis)} kWh/kWp Altertrag ist er gegenüber dem Weiterbetrieb nahezu wertneutral (${fmtEur(Math.round((NPV2 - NPV1) / 1000) * 1000)} Barwertvorteil), bei ${fmt(SPEZ_ALT.schwach)} kWh/kWp bringt er rund ${mio(NPV2 - NPV1_SCHWACH)}.`,
    "Nach dem Förderende bleiben Weiterbetrieb mit Direktvermarktung, PPA, Speicher am bestehenden Netzanschluss oder der Neubau – **der Netzanschluss ist oft der wertvollste Teil eines alten Parks.**",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was bedeutet Repowering bei einem Solarpark?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**[Repowering](/wissen/lexikon#repowering) heißt, alte Module und meist auch Wechselrichter eines bestehenden Solarparks durch neue, leistungsstärkere Komponenten zu ersetzen – mit oder ohne Erhöhung der installierten Leistung.** Ziel ist, auf derselben Fläche und am selben Netzanschluss mehr Strom zu erzeugen und die Anlage über das Ende der ursprünglichen Förderung hinaus wirtschaftlich zu betreiben. Wird die Leistung deutlich erhöht, spricht man auch von Revamping.",
        },
        {
          typ: "p",
          text: `Für die Parks der ersten großen Ausbauwelle stellt sich die Frage gerade jetzt: Eine Freiflächenanlage, die 2011 in Betrieb ging, erhält nach EEG 2009 noch bis Ende ${FOERDERENDE} ${fmtCt(TARIF_CT, 2)} – danach nur noch den Marktwert, den die Website vorsichtig mit ${fmtCt(ERLOESE.merchantCt)} ansetzt. Die Module sind dann rund 20 Jahre alt, haben einen deutlich geringeren Wirkungsgrad als heutige und belegen etwa dreimal so viel Fläche je Megawatt. Wer richtig plant, kann die verbleibenden Förderjahre besser ausnutzen und die Zeit danach vorbereiten.`,
        },
        {
          typ: "kennzahl",
          wert: `${fmt(TARIF_CT / ERLOESE.merchantCt, 1)}-fach`,
          titel: "Vergütung 2011 gegenüber heutigem Marktwert",
          text: `${fmtCt(TARIF_CT, 2)} EEG-Vergütung (Inbetriebnahme 2011) im Vergleich zu ${fmtCt(ERLOESE.merchantCt)} Marktwert Solar, Stand ${STAND}.`,
        },
      ],
    },
    {
      id: "altanlagen",
      titel: "Alte Solarparks von 2009 bis 2012: Vergütung und Förderende",
      tocLabel: "Altanlagen & Förderende",
      bloecke: [
        {
          typ: "p",
          text: "**Die Vergütung einer EEG-Anlage wird nach dem Inbetriebnahmezeitpunkt festgelegt und gilt 20 Jahre plus die Restmonate des Inbetriebnahmejahres.** Für Freiflächenanlagen sanken die Sätze zwischen 2009 und 2012 stark; Ackerflächen wurden ab Mitte 2010 gar nicht mehr gefördert.",
        },
        {
          typ: "tabelle",
          caption: "EEG-Vergütung für Freiflächenanlagen (sonstige Freiflächen) nach Inbetriebnahme",
          kopf: ["Inbetriebnahme", "Vergütung", "Förderende", `Faktor zum Marktwert ${fmtCt(ERLOESE.merchantCt)}`],
          zeilen: VERGUETUNG_ALT.map((v) => [
            v.zeit,
            fmtCt(v.ct, 2),
            `31.12.${Number(v.zeit.slice(-4)) + 20}`,
            `${fmt(v.ct / ERLOESE.merchantCt, 1)}-fach`,
          ]),
          hervorheben: 1,
          markierteZeile: 2,
          minBreite: 620,
          fussnote: "Quelle: SFV, Übersicht EEG 2009 inkl. Änderungen bis 31.03.2012. Konversions- und versiegelte Flächen erhielten teils höhere Sätze; Anlagen auf Ackerflächen ab 01.07.2010 keine Vergütung mehr. Maßgeblich ist die Vergütung laut Abrechnung des Netzbetreibers.",
        },
        {
          typ: "p",
          text: "Nach dem Förderende gibt es für Solarparks keine Anschlussförderung. Die Auffangregelungen für ausgeförderte Anlagen betreffen nach aktuellem Stand nur kleinere Anlagen; ein Park im Megawattbereich muss seinen Strom danach selbst vermarkten – über einen Direktvermarkter oder einen Stromliefervertrag. Wie das funktioniert, erklären die Ratgeber [Direktvermarktung](/ratgeber/direktvermarktung-solarpark) und [PPA für Unternehmen](/ratgeber/ppa-fuer-unternehmen).",
        },
      ],
    },
    {
      id: "modultausch-eeg",
      titel: "Modultausch nach § 38b EEG: Was das Solarpaket I geändert hat",
      tocLabel: "Modultausch & EEG",
      bloecke: [
        {
          typ: "p",
          text: "**Nach § 38b Abs. 2 EEG 2023 gelten Solaranlagen, die bestehende Solaranlagen ersetzen, bis zur Höhe der bisherigen Leistung als zum Zeitpunkt der ersetzten Anlage in Betrieb genommen – der Zahlungsanspruch geht auf die neuen Module über.** Seit dem Solarpaket I, das am 16. Mai 2024 in Kraft trat, setzt das keinen technischen Defekt, keine Beschädigung und keinen Diebstahl mehr voraus.",
        },
        {
          typ: "karten",
          cols: 2,
          items: [
            { titel: "Was übergeht", text: "Inbetriebnahmedatum, Vergütungssatz und Restlaufzeit der ersetzten Module. Die Förderung verlängert sich durch den Tausch nicht." },
            { titel: "Bis zu welcher Leistung", text: "Bis zur installierten Leistung der ersetzten Anlage. Bei Mehrleistung wird der Strom nur anteilig im Verhältnis alte zu neuer Leistung nach dem alten Satz vergütet (§ 38b Abs. 2 Satz 3 EEG)." },
            { titel: "Für welche Anlagen", text: "§ 48 Abs. 4 EEG erstreckt die Regel auf Anlagen mit gesetzlich bestimmter Vergütung, § 100 Abs. 12 EEG auf Bestandsanlagen aus früheren EEG-Fassungen; der Anspruch richtet sich dann nach der für sie geltenden alten Fassung." },
            { titel: "Was verloren geht", text: "Die ersetzten Module verlieren ihren Förderanspruch endgültig. Sie dürfen nicht an anderer Stelle mit der alten Vergütung weiterbetrieben werden." },
          ],
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Rechtslage vorsichtig prüfen (Stand September 2026)",
          text: "Für Ersetzungen vor dem 16.05.2024 gilt nach § 100 Abs. 27 EEG die damalige Fassung, die bei Altanlagen in der Regel einen Defekt, eine Beschädigung oder einen Diebstahl voraussetzte. Einzelne Neuregelungen des Solarpakets standen nach Angaben aus der Beratungspraxis zudem unter beihilferechtlichem Vorbehalt. Klären Sie vor dem Tausch mit dem Netzbetreiber und einer fachkundigen Rechtsberatung, wie Ihr Fall eingeordnet wird, und melden Sie Änderungen fristgerecht im [Marktstammdatenregister](/wissen/lexikon#marktstammdatenregister) und beim Netzbetreiber. Die Clearingstelle EEG|KWKG beantwortet typische Fragen zum Modultausch in ihren häufigen Rechtsfragen.",
        },
        {
          typ: "p",
          text: "Praktisch wichtig ist der Standort: Der Ersatz muss nach Auffassung der Clearingstelle am selben Standort erfolgen. Da bei Photovoltaik in der Regel jedes Modul als eigene Anlage im Sinne des EEG gilt, dokumentieren Sie den Tausch am besten modulgenau – mit Seriennummern, Leistung der alten und neuen Module und Datum. Diese Dokumentation gehört später in jeden Datenraum, wenn der Park verkauft wird.",
        },
      ],
    },
    {
      id: "technik",
      titel: "Leistungserhöhung, Wechselrichter und Netzanschluss",
      tocLabel: "Technik & Netz",
      bloecke: [
        {
          typ: "p",
          text: `**Auf derselben Fläche passt mit heutigen Modulen etwa die zwei- bis dreifache Leistung – ob sie gebaut werden darf, entscheiden Netzanschluss, Bebauungsplan und Unterkonstruktion.** Die Website rechnet für neue Parks mit rund ${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp; Parks der Baujahre um 2011 brauchten nach unserer Orientierung eher rund 3 ha.`,
        },
        {
          typ: "tabelle",
          caption: "Varianten des Repowerings und ihre Voraussetzungen",
          kopf: ["Variante", "Was sich ändert", "Voraussetzungen und Hürden"],
          zeilen: [
            ["Wechselrichtertausch", "neue Wechselrichter, Module bleiben", "nach 12–15 Jahren oft ohnehin fällig; Kompatibilität mit Strangspannungen, Netzanschlussregeln und Anlagenzertifikat prüfen"],
            ["Modultausch 1:1", "neue Module bis zur bisherigen Leistung", "passende Modulmaße für die alte Unterkonstruktion oder neue Schienen; Statik; EEG-Anspruch bleibt vollständig"],
            ["Modultausch mit Mehrleistung", "mehr kWp auf gleicher Fläche", "freie Kapazität am [Netzverknüpfungspunkt](/wissen/lexikon#netzverknuepfungspunkt), ggf. neue Netzanschlusszusage und Trafostation; B-Plan-Festsetzungen; Vergütung nur anteilig"],
            ["Neubau auf der Fläche", "komplett neue Anlage, meist mit neuer Unterkonstruktion", "Rückbau des Altparks, ggf. Änderung des Bebauungsplans, neue Vermarktung über Ausschreibung oder PPA"],
          ],
          hervorheben: 2,
          minBreite: 720,
          fussnote: "Qualitative Einordnung. Welche Leistung ein Bebauungsplan zulässt, ergibt sich aus Festsetzungen wie überbaubarer Fläche, Modulhöhe und Nutzungszweck – nicht aus einer Megawattzahl.",
        },
        {
          typ: "p",
          text: "Der Netzanschluss ist der Engpass: Viele Netzgebiete sind ausgelastet, und eine Erhöhung der Einspeiseleistung braucht in der Regel eine neue Prüfung durch den Netzbetreiber. Umgekehrt ist ein bestehender Anschluss mit gesicherter Kapazität heute sehr wertvoll. Eine Alternative zur Leistungserhöhung kann ein Batteriespeicher am selben Netzanschluss sein, der Strom aus der Mittagsspitze in teurere Stunden verschiebt – mehr unter [Großspeicher](/grossspeicher) und im Ratgeber [Netzanschluss für Solarparks](/ratgeber/netzanschluss-solarpark).",
        },
      ],
    },
    {
      id: "wirtschaftlichkeit",
      titel: `Rechenbeispiel: Lohnt sich das Repowering eines Parks von 2011?`,
      tocLabel: "Wirtschaftlichkeit",
      bloecke: [
        {
          typ: "p",
          text: `**Ein Modultausch lohnt sich vor allem dann, wenn die alte Anlage deutlich unter ihrem ursprünglichen Ertrag liegt und noch einige Förderjahre bleiben – die Mehrleistung auf der Fläche muss sich dagegen allein am Markt tragen.** Das zeigt ein Beispiel mit bewusst einfachen, offen gelegten Annahmen: ${fmt(MWP_ALT)} MWp auf ${fmt(HA)} ha in Süddeutschland, Inbetriebnahme 2011, ${fmtCt(TARIF_CT, 2)} bis Ende ${FOERDERENDE}. Entscheidungsjahr ist ${START}, es bleiben also ${fmt(EEG_REST)} Förderjahre.`,
        },
        {
          typ: "liste",
          punkte: [
            `**Variante 1 – Weiterbetrieb:** neue Wechselrichter (${fmt(WR_TAUSCH_KWP)} €/kWp), Altmodule mit ${fmt(SPEZ_ALT.basis)} kWh/kWp laufen noch 10 Jahre, nach ${FOERDERENDE} zum Marktwert, danach Rückbau.`,
            `**Variante 2 – Modultausch 1:1:** neue Module und Wechselrichter für ${fmt(REPOWER_KWP)} €/kWp (${fmtPct(REPOWER_ANTEIL, 0)} der Neubaukosten, weil Unterkonstruktion, Zaun, Wege und Netzanschluss bleiben), ${fmt(REGION.ertrag)} kWh/kWp, 20 Jahre Betrieb.`,
            `**Variante 3 – Revamping auf ${fmt(MWP_NEU)} MWp:** Neubau zu ${fmt(FREIFLAECHE.capexProKwp.mittel)} €/kWp plus Netzausbau; der alte Satz gilt nur für ${fmtPct(EEG_ANTEIL_V3, 0)} der Einspeisung, der Rest zum Marktwert.`,
          ],
        },
        {
          typ: "tabelle",
          caption: `Barwert der Varianten ab ${START}, Diskontsatz ${fmtPct(r, 1)}, vor Steuern`,
          kopf: ["Variante", "Investition", "Barwert (inkl. Investition)", "Mehrwert gegenüber Weiterbetrieb"],
          zeilen: [
            [`1 Weiterbetrieb (${fmt(SPEZ_ALT.basis)} kWh/kWp)`, fmtEur(KWP_ALT * WR_TAUSCH_KWP), mio(NPV1), "–"],
            [`1 Weiterbetrieb, schwacher Altpark (${fmt(SPEZ_ALT.schwach)} kWh/kWp)`, fmtEur(KWP_ALT * WR_TAUSCH_KWP), mio(NPV1_SCHWACH), "–"],
            ["**2 Modultausch 1:1**", fmtEur(KWP_ALT * REPOWER_KWP), `**${mio(NPV2)}**`, `${mio(NPV2 - NPV1)} bzw. ${mio(NPV2 - NPV1_SCHWACH)} (schwach)`],
            [`3 Revamping ${fmt(MWP_NEU)} MWp, Mehrmenge zum Marktwert`, fmtEur(INV3), mio(NPV3), mio(NPV3 - NPV1)],
            [`3 Revamping, Mehrmenge per PPA ${fmtCt(ERLOESE.ppaCt.max)}`, fmtEur(INV3), mio(NPV3_PPA), mio(NPV3_PPA - NPV1)],
          ],
          hervorheben: 2,
          markierteZeile: 2,
          minBreite: 760,
          fussnote: `Annahmen: Betriebskosten ${fmt(FREIFLAECHE.opexProKwp)} €/kWp (+${fmtPct(FREIFLAECHE.inflation, 0)} p. a.), Pacht ${fmt(PACHT.freiflaecheProHa.mittel)} €/ha, Degradation ${fmtPct(FREIFLAECHE.degradation, 1)} p. a., Marktwert ${fmtCt(ERLOESE.merchantCt)} (+${fmtPct(ERLOESE.merchantSteigerung, 0)} p. a.), Rückbau ${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp am Ende. Wechselrichter- und Repowering-Kosten sind eigene Annahmen. Ohne Steuern, Finanzierung, negative Preise und Speicher. Kein Angebot, keine Anlageberatung.`,
        },
        {
          typ: "p",
          text: `Die Rechnung zeigt drei Dinge. Erstens: Der 1:1-Tausch verdient sein Geld in den ${fmt(EEG_REST)} restlichen Förderjahren, weil jede zusätzliche Kilowattstunde mit ${fmtCt(TARIF_CT, 2)} vergütet wird – und danach durch 20 statt 10 Betriebsjahre. Die interne Verzinsung der Zusatzinvestition liegt im Beispiel bei ${pct(IRR_D2)}, beim schwachen Altpark bei ${pct(IRR_D2_SCHWACH)}. Zweitens: Die Mehrleistung beim Revamping trägt keine Altvergütung; bei einem Marktwert von ${fmtCt(ERLOESE.merchantCt)} ist sie mit heutigen Baukosten kaum wirtschaftlich – das deckt sich mit den Ergebnissen des Ratgebers [Solarpark als Investment](/ratgeber/solarpark-investment-rendite). Drittens: Je früher getauscht wird, desto mehr Förderjahre profitieren. Eigene Szenarien rechnen Sie im [Solarpark-Rechner](/rechner/solarpark).`,
        },
      ],
    },
    {
      id: "post-eeg",
      titel: "Nach dem Förderende: Weiterbetrieb, PPA oder Neubau",
      tocLabel: "Post-EEG",
      bloecke: [
        {
          typ: "p",
          text: `**Nach 20 Jahren fällt der Erlös eines alten Parks auf den Marktwert – im Beispiel von rund ${fmtEur(Math.round(ERLOES_ALT_JAHR1 / 1000) * 1000)} auf etwa ${fmtEur(Math.round(ERLOES_MARKT_ALT / 1000) * 1000)} im Jahr.** Ob der Weiterbetrieb dann noch lohnt, hängt von Betriebskosten, Pacht und Zustand der Technik ab.`,
        },
        {
          typ: "karten",
          cols: 2,
          items: [
            { titel: "Weiterbetrieb mit Direktvermarktung", text: "Geringster Aufwand, aber volles Marktpreisrisiko. Sinnvoll, solange Module und Wechselrichter zuverlässig laufen und die Pacht zum Erlös passt." },
            { titel: "PPA", text: `Ein Stromliefervertrag sichert einen festen Preis, zuletzt etwa ${fmt(ERLOESE.ppaCt.min, 1)}–${fmtCt(ERLOESE.ppaCt.max)}. Käufer verlangen dafür eine belastbare Restlebensdauer der Anlage.` },
            { titel: "Speicher ergänzen", text: "Der bestehende Netzanschluss wird zusätzlich für einen Batteriespeicher genutzt, der Strom in teurere Stunden verschiebt und Regelenergie anbietet." },
            { titel: "Neubau oder Verkauf", text: "Rückbau und neue Anlage mit Zuschlag oder PPA – oder Verkauf des Parks mit Netzanschluss und Fläche an einen Investor, der das übernimmt." },
          ],
        },
        {
          typ: "p",
          text: "Oft entscheidet der Pachtvertrag: Alte Verträge laufen häufig 20 bis 25 Jahre mit Verlängerungsoptionen. Für ein Repowering mit 20 weiteren Betriebsjahren braucht es eine Verlängerung – und damit das Einverständnis der Eigentümer. Worauf es dabei ankommt, erklären die Ratgeber [Pachtvertrag für Solarparks](/ratgeber/pachtvertrag-solarpark) und [Dienstbarkeit im Grundbuch](/ratgeber/dienstbarkeit-grundbuch-pv-pacht). Wer verkaufen möchte, findet im Ratgeber [Wert einer Bestandsanlage](/ratgeber/solarpark-bestandsanlage-wert) die Bewertungslogik.",
        },
      ],
    },
    {
      id: "recycling",
      titel: "Recycling und Rückbau der Altmodule",
      tocLabel: "Recycling",
      bloecke: [
        {
          typ: "p",
          text: "**Photovoltaikmodule fallen in Deutschland unter das Elektro- und Elektronikgerätegesetz (ElektroG) und müssen fachgerecht erfasst und verwertet werden – über Rücknahmesysteme der Hersteller oder zertifizierte Entsorgungsfachbetriebe.** Glas, Aluminiumrahmen und Kupfer lassen sich gut zurückgewinnen, die Rückgewinnung von Silizium und Silber ist technisch anspruchsvoller.",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Zweitnutzung prüfen:** Funktionsfähige Altmodule können nach Prüfung (z. B. Kennlinienmessung, Elektrolumineszenz) als Gebrauchtmodule verkauft werden – ohne die alte Vergütung.",
            "**Entsorgungsnachweise sichern:** Die fachgerechte Entsorgung sollte lückenlos belegt sein – auch für spätere Käufer und Behörden.",
            "**Rückbaupflichten beachten:** Bebauungsplan, städtebaulicher Vertrag und Pachtvertrag regeln, was am Ende zu entfernen ist; Details im Ratgeber [Rückbau und Rückbaubürgschaft](/ratgeber/solarpark-rueckbau-rueckbaubuergschaft).",
            "**Bewuchs und Artenschutz:** Arbeiten außerhalb der Brutzeit planen und mit der Naturschutzbehörde abstimmen.",
          ],
        },
        {
          typ: "p",
          text: "Wer einen alten Park kaufen oder verkaufen möchte, findet Angebote und Kaufinteressenten in der [Projektbörse](/projektboerse). Für Verkäufer fällt eine Provision nur bei erfolgreichem Abschluss an; Investoren nutzen die Plattform kostenfrei.",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Verliere ich die EEG-Vergütung, wenn ich die Module tausche?",
      a: "Nach § 38b Abs. 2 EEG in der Regel nicht: Die neuen Module übernehmen Inbetriebnahmedatum, Vergütungssatz und Restlaufzeit bis zur bisherigen Leistung. Seit dem Solarpaket I ist dafür kein Defekt mehr nötig. Prüfen Sie Ihren Fall vorab mit Netzbetreiber und Rechtsberatung.",
    },
    {
      q: "Was passiert mit der Vergütung, wenn die neue Anlage mehr Leistung hat?",
      a: `Der alte Satz gilt nur für den Anteil der Einspeisung, der dem Verhältnis alte zu neuer Leistung entspricht. Wächst ein Park von ${fmt(MWP_ALT)} auf ${fmt(MWP_NEU)} MWp, werden ${fmtPct(EEG_ANTEIL_V3, 0)} des Stroms nach dem alten Satz vergütet, der Rest muss anders vermarktet werden.`,
    },
    {
      q: "Verlängert ein Modultausch die EEG-Förderung?",
      a: "Nein. Die neuen Module übernehmen den ursprünglichen Inbetriebnahmezeitpunkt; die Förderung endet zum selben Termin wie vorher.",
    },
    {
      q: "Was passiert mit einem Solarpark nach 20 Jahren EEG?",
      a: "Der Strom muss danach am Markt verkauft werden, etwa über einen Direktvermarkter oder einen PPA. Alternativ kann der Park mit Speicher ergänzt, neu gebaut oder verkauft werden. Wichtig sind die Restlaufzeit des Pachtvertrags und der Zustand der Technik.",
    },
    {
      q: "Wie hoch waren die EEG-Vergütungen für Freiflächenanlagen 2009 bis 2012?",
      a: `Für sonstige Freiflächen von ${fmtCt(VERGUETUNG_ALT[0].ct, 2)} (2009) bis ${fmtCt(VERGUETUNG_ALT[3].ct, 2)} (Anfang 2012). Konversionsflächen lagen teils darüber, Ackerflächen wurden ab Juli 2010 nicht mehr gefördert.`,
    },
    {
      q: "Muss ich den Modultausch melden?",
      a: "Ja. Änderungen an Anlagen sind dem Netzbetreiber mitzuteilen und im Marktstammdatenregister einzutragen. Fehlende Meldungen können den Zahlungsanspruch gefährden.",
    },
  ],

  passend: [
    { href: "/ratgeber/solarpark-bestandsanlage-wert", titel: "Wert einer Bestandsanlage", text: "DCF, Restlaufzeit und technische Due Diligence." },
    { href: "/ratgeber/direktvermarktung-solarpark", titel: "Direktvermarktung", text: "Wie Solarparks ihren Strom nach dem EEG vermarkten." },
    { href: "/ratgeber/pachtvertrag-solarpark", titel: "Pachtvertrag Solarpark", text: "Laufzeit, Verlängerung und Rückbau im Vertrag." },
    { href: "/rechner/solarpark", titel: "Solarpark-Rechner", text: "Erlöse, Kosten und Rendite mit eigenen Werten." },
  ],

  quellen: [
    { titel: "EEG 2023, § 38b – Anzulegender Wert für Solaranlagen des ersten Segments (Abs. 2: Ersatz)", url: "https://www.gesetze-im-internet.de/eeg_2014/__38b.html", stand: "09/2026" },
    { titel: "EEG 2023, § 48 – Solaranlagen (Abs. 4: Ersatz)", url: "https://www.gesetze-im-internet.de/eeg_2014/__48.html", stand: "09/2026" },
    { titel: "EEG 2023, § 100 – Übergangsbestimmungen (Abs. 12 und 27)", url: "https://www.gesetze-im-internet.de/eeg_2014/__100.html", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – Häufige Rechtsfrage 141: Modultausch und Inbetriebnahmezeitpunkt", url: "https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/141", stand: "09/2026" },
    { titel: "Solarenergie-Förderverein Deutschland – EEG 2009 inkl. Änderungen: Einspeisevergütung bis 31.03.2012", url: "https://www.sfv.de/artikel/eeg_2009_inkl_aenderungen_eeg_2012_bis_3132012_einspeiseverguetung", stand: "09/2026" },
    { titel: "Rödl & Partner – Photovoltaikanlagen erweitern oder repowern: Was passiert mit den Vergütungssätzen? (30.10.2025)", url: "https://www.roedl.com/insights/photovoltaikanlagen-erweitern-oder-repowern-verguetungssaetze/", stand: "09/2026" },
    { titel: "Elektro- und Elektronikgerätegesetz (ElektroG), Anlage 1 – Gerätekategorien", url: "https://www.gesetze-im-internet.de/elektrog_2015/anlage_1.html", stand: "09/2026" },
  ],

  seitenCta: { titel: "Szenario selbst rechnen", text: "Erlöse, Betriebskosten und Rendite eines Parks durchspielen.", href: "/rechner/solarpark", label: "Zum Solarpark-Rechner" },
  cta: {
    title: "Alten Solarpark verkaufen oder weiterentwickeln?",
    text: "Stellen Sie Ihren Bestandspark in die Projektbörse – Investoren sehen Eckdaten, Details erst nach NDA. Eine Provision fällt nur bei erfolgreichem Abschluss an.",
    primary: { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
    secondary: { label: "Zur Projektbörse", href: "/projektboerse" },
  },
};

export default artikel;
