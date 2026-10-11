// Ratgeber: Wert einer Bestandsanlage – Solarpark kaufen oder verkaufen: DCF, Multiplikatoren, Restlaufzeiten, technische DD
// Recherchestand 29.09.2026. DCF mit npv()/irr() aus src/lib/invest/markt.js auf den Cashflows des Rechenkerns
// src/lib/rechner/solarpark.js; Bestandspreise PHASEN "cod"; Provision PROVISION; EEG 2023 §§ 25, 51;
// IEC 61724-1:2021; IEA PVPS T13-12:2018; Vergütungssätze EEG 2009 laut SFV.

import { FREIFLAECHE, ERLOESE, PACHT, FINANZIERUNG, PROVISION, npv, irr, phaseById, STAND } from "@/lib/invest/markt";
import { rechneSolarpark, STANDARD } from "@/lib/rechner/solarpark";
import { fmt, fmtEur, fmtMio, fmtPct, fmtCt } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// Diskontsätze für die Bewertungsspanne (vor Steuern, unverschuldet) – eigene Setzung um FINANZIERUNG.diskont
const DISKONT = { niedrig: 0.05, hoch: 0.08 };
// Altpark: Inbetriebnahme 2011, sonstige Freifläche, EEG 2009 (SFV): 21,11 ct/kWh bis 31.12.2031
const ALT_TARIF_CT = 21.11;
const ALT_EEG_REST = 5; // Jahre 2027–2031
const ALT_PACHT_REST = 10; // Pacht bzw. geplanter Betrieb bis 2036 (Annahme)
const ALT_MWP = 5;
const ALT_HA = 15;
const ALT_SPEZ = 950; // heutiger Ertrag kWh/kWp (Annahme, siehe Ratgeber Repowering)
const ALT_WR_KWP = 30; // Wechselrichtertausch €/kWp im ersten Jahr (Annahme)
// Sensitivität Ertrag: P90 (1 Jahr) statt P50 – Faktor aus dem Rechenbeispiel im Ratgeber Ertragsgutachten P50/P90
const FAKTOR_P90 = 0.906;

/* ---------- Beispiel A: junger Park, 10 MWp, COD vor 2 Jahren, EEG-Zuschlag ---------- */
const BASIS = rechneSolarpark();
const KWP = STANDARD.mwp * 1000;
const ALTER = 2;
const LEBEN = FREIFLAECHE.laufzeit;
const REST = LEBEN - ALTER;
const cfA = (r = BASIS, f = 1, bis = LEBEN) => r.jahre.slice(ALTER, bis).map((j) => j.erloes * f - j.kosten);
const wert = (cf, rate) => npv(rate, [0, ...cf]);
const W_MITTE = wert(cfA(), FINANZIERUNG.diskont);
const W_NIEDRIG = wert(cfA(), DISKONT.hoch); // hoher Zins → niedriger Wert
const W_HOCH = wert(cfA(), DISKONT.niedrig);
const EBITDA_A = cfA()[0];
const MULT_MITTE = W_MITTE / EBITDA_A;
const kwpWert = (x, kwp = KWP) => `${fmt(x / kwp)} €/kWp`;

const SENS = [
  { label: `Basis (Diskont ${fmtPct(FINANZIERUNG.diskont, 1)})`, w: W_MITTE },
  { label: `Diskont ${fmtPct(DISKONT.niedrig, 1)}`, w: W_HOCH },
  { label: `Diskont ${fmtPct(DISKONT.hoch, 1)}`, w: W_NIEDRIG },
  { label: `Ertrag auf P90-Niveau (−${fmtPct(1 - FAKTOR_P90, 1)})`, w: wert(cfA(BASIS, FAKTOR_P90), FINANZIERUNG.diskont) },
  { label: "Degradation 0,8 % statt " + fmtPct(FREIFLAECHE.degradation, 1), w: wert(cfA(rechneSolarpark({ degradation: 0.008 })), FINANZIERUNG.diskont) },
  { label: "Marktwert nach EEG −25 %", w: wert(cfA(rechneSolarpark({ merchantCt: ERLOESE.merchantCt * 0.75 })), FINANZIERUNG.diskont) },
  { label: `Pacht endet nach ${fmt(REST - 8)} statt ${fmt(REST)} Restjahren`, w: wert(cfA(BASIS, 1, LEBEN - 8), FINANZIERUNG.diskont) },
  { label: `Zuschlag ${fmtCt(ERLOESE.eegBesondereCt)} statt ${fmtCt(ERLOESE.eegFreiflaecheCt)}`, w: wert(cfA(rechneSolarpark({ preisCt: ERLOESE.eegBesondereCt })), FINANZIERUNG.diskont) },
];

/* ---------- Beispiel B: Altpark 2011 mit hoher EEG-Vergütung ---------- */
const ALT_KWP = ALT_MWP * 1000;
const cfB = (() => {
  const cf = [];
  for (let t = 1; t <= ALT_PACHT_REST; t++) {
    const kwh = ALT_KWP * ALT_SPEZ * Math.pow(1 - FREIFLAECHE.degradation, t - 1);
    const markt = ERLOESE.merchantCt * Math.pow(1 + ERLOESE.merchantSteigerung, t - 1);
    const ct = t <= ALT_EEG_REST ? Math.max(ALT_TARIF_CT, markt) : markt;
    const kosten = ALT_KWP * FREIFLAECHE.opexProKwp * Math.pow(1 + FREIFLAECHE.inflation, t - 1) + ALT_HA * PACHT.freiflaecheProHa.mittel * Math.pow(1 + PACHT.indexierung, t - 1);
    cf.push((kwh * ct) / 100 - kosten - (t === 1 ? ALT_KWP * ALT_WR_KWP : 0) - (t === ALT_PACHT_REST ? ALT_KWP * FREIFLAECHE.rueckbauProKwp : 0));
  }
  return cf;
})();
const WB = wert(cfB, FINANZIERUNG.diskont);
const WB_EEG_ANTEIL = npv(FINANZIERUNG.diskont, [0, ...cfB.slice(0, ALT_EEG_REST)]) / WB;

/* ---------- Kauf und Rendite ---------- */
const COD = phaseById("cod");
const KAUF_MIN = COD.preisProKwp.min * KWP;
const IRR_KAUF_MIN = irr([-KAUF_MIN, ...cfA()]);
const IRR_KAUF_WERT = irr([-W_MITTE, ...cfA()]);
const PROV_MIN = W_MITTE * PROVISION.verkaeufer.min;
const PROV_MAX = W_MITTE * PROVISION.verkaeufer.max;
const pct = (x) => (x == null ? "–" : fmtPct(x, 1));

const artikel = {
  slug: "solarpark-bestandsanlage-wert",
  title: "Was ist ein bestehender Solarpark wert? Bewertung beim Kauf",
  seoTitle: "Wert eines Solarparks: Bewertung beim Kauf | ÖkoInvest",
  kurzTitel: "Wert einer Bestandsanlage",
  description:
    "Was ist ein laufender Solarpark wert? DCF, Multiplikatoren, €/kWp, Restlaufzeit von EEG und Pacht, technische Due Diligence und zwei Rechenbeispiele.",
  excerpt:
    "Wie Käufer und Verkäufer den Wert eines laufenden Solarparks ermitteln: Barwert der Cashflows statt Faustformel, die Rolle von EEG- und Pachtrestlaufzeit und was die technische Prüfung aufdecken muss.",
  hauptKeyword: "solarpark bestandsanlage wert",
  keywords: [
    "Solarpark kaufen Bestandsanlage",
    "Wert Solarpark berechnen",
    "Solarpark verkaufen",
    "Bewertung PV-Anlage DCF",
    "Bestandsanlage €/kWp",
    "Technische Due Diligence Solarpark",
    "EV/EBITDA Solarpark",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Investieren & Projektbörse",
  bild: "/img/investoren-vor-ort.jpg",
  bildAlt: "Drei Personen mit weißen Schutzhelmen und Plänen gehen zwischen Modulreihen eines Solarparks",
  badge: { wert: `${fmt(COD.preisProKwp.min)}–${fmt(COD.preisProKwp.max)} €/kWp`, text: "übliche Kaufpreisspanne für Bestandsparks, DACH 2025/26" },

  kurzFazit: [
    `**Der Wert eines laufenden Solarparks ist der Barwert seiner künftigen Cashflows (DCF).** Faustwerte wie ${fmt(COD.preisProKwp.min)}–${fmt(COD.preisProKwp.max)} €/kWp sind nur ein Marktkorridor – Tarif, Restlaufzeit und Zustand verschieben den Wert stärker als die Leistung.`,
    `**Beispiel junger Park (${fmt(STANDARD.mwp)} MWp, Zuschlag ${fmtCt(ERLOESE.eegFreiflaecheCt)}, ${fmt(REST)} Restjahre):** Bei ${fmtPct(DISKONT.hoch, 0)} bis ${fmtPct(DISKONT.niedrig, 0)} Diskontsatz ergibt sich ein Wert von **${kwpWert(W_NIEDRIG)} bis ${kwpWert(W_HOCH)}** – unter dem Marktkorridor.`,
    `**Beispiel Altpark (${fmt(ALT_MWP)} MWp, ${fmtCt(ALT_TARIF_CT, 2)} bis 2031):** Trotz nur ${fmt(ALT_PACHT_REST)} Restjahren liegt der Wert bei rund **${kwpWert(WB, ALT_KWP)}**, davon ${fmtPct(WB_EEG_ANTEIL, 0)} aus den letzten ${fmt(ALT_EEG_REST)} Förderjahren.`,
    `Als Multiplikator entspricht der Basiswert des jungen Parks rund dem **${fmt(MULT_MITTE, 1)}-Fachen des operativen Jahres-Cashflows** (EV/EBITDA) – solche Multiplikatoren taugen zur Plausibilisierung, nicht als Ersatz für die Rechnung.`,
    "Die technische Due Diligence mit Monitoringdaten, Thermografie und Degradationsanalyse entscheidet, ob die Cashflows im Modell stimmen. Pacht- und Dienstbarkeitslaufzeit begrenzen den Wert nach hinten.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Wie wird der Wert eines bestehenden Solarparks ermittelt?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: `**Bestandsanlagen werden in der Regel nach dem Discounted-Cash-Flow-Verfahren bewertet: Alle erwarteten Erlöse abzüglich Betriebskosten, Pacht und Rückbau werden über die Restlaufzeit mit einer Renditeerwartung auf heute abgezinst.** Das Ergebnis ist der Unternehmenswert (Enterprise Value) der Anlage bzw. der Projektgesellschaft vor Schulden. Die Website nennt für Bestandsparks im DACH-Raum eine Spanne von ${fmt(COD.preisProKwp.min)}–${fmt(COD.preisProKwp.max)} €/kWp (Stand ${STAND}) – ein grober Marktkorridor, den der [Discounted Cash Flow](/wissen/lexikon#discounted-cash-flow) für jeden Park einzeln bestätigen oder widerlegen muss.`,
        },
        {
          typ: "p",
          text: `Anders als bei Projektrechten, deren Preis eine Entwicklungsprämie ist (siehe [Projektrechte kaufen](/ratgeber/projektrechte-kaufen-due-diligence)), kauft man beim Bestand eine laufende Zahlungsreihe. Deshalb zählt nicht, was der Park einmal gekostet hat, sondern was er künftig verdient. Für die Rechnung werden vier Dinge gebraucht: der Ertrag (am besten aus Betriebsdaten statt Prognose), die Erlöse (Tarif, PPA, Marktwert), die Kosten und die Restlaufzeit. Einen ersten Anhaltspunkt liefert der [Projektbewertungsrechner](/rechner/projektbewertung) in der Phase „In Betrieb“.`,
        },
        {
          typ: "kennzahl",
          wert: kwpWert(W_MITTE),
          titel: `DCF-Wert junger Park, Diskont ${fmtPct(FINANZIERUNG.diskont, 1)}`,
          text: `${fmt(STANDARD.mwp)} MWp in Süddeutschland, Zuschlag ${fmtCt(ERLOESE.eegFreiflaecheCt)}, ${fmt(REST)} Restjahre; gesamt ${fmtMio(W_MITTE)} vor Steuern und Schulden.`,
        },
      ],
    },
    {
      id: "dcf",
      titel: "Das DCF-Verfahren Schritt für Schritt",
      tocLabel: "DCF-Verfahren",
      bloecke: [
        {
          typ: "p",
          text: "**Der Barwert ist die Summe aller künftigen Cashflows, jeweils geteilt durch (1 + r)^t – mit r als geforderter Rendite und t als Jahr.** Die Kunst liegt nicht in der Formel, sondern in belastbaren Annahmen für jedes Jahr.",
        },
        {
          typ: "ablauf",
          schritte: [
            ["Ertrag festlegen", "Aus Monitoringdaten mehrerer Jahre, bereinigt um Einstrahlung und Ausfälle; fortgeschrieben mit Degradation. Wie P50 und P90 zustande kommen, erklärt der Ratgeber [Ertragsgutachten P50/P90](/ratgeber/ertragsgutachten-p50-p90)."],
            ["Erlöse je Jahr", `EEG-Anspruch mit Restlaufzeit, ggf. PPA-Preis, danach Marktwert (hier vorsichtig ${fmtCt(ERLOESE.merchantCt)}, +${fmtPct(ERLOESE.merchantSteigerung, 0)} p. a.). Zeiten negativer Preise mindern bei neueren Anlagen den Anspruch.`],
            ["Kosten je Jahr", `Betriebsführung, Wartung, Versicherung, Direktvermarktung (${fmt(FREIFLAECHE.opexProKwp)} €/kWp, +${fmtPct(FREIFLAECHE.inflation, 0)} p. a.), Pacht, Rücklage für Rückbau und geplante Ersatzinvestitionen wie Wechselrichter.`],
            ["Restlaufzeit begrenzen", "Das Ende bestimmt die kürzeste Frist aus technischer Lebensdauer, Pachtvertrag, Dienstbarkeit und Baurecht."],
            ["Abzinsen", `Mit der Renditeerwartung des Käufers; die Website rechnet mit ${fmtPct(FINANZIERUNG.diskont, 1)} vor Steuern und ohne Fremdkapital. Schulden der Gesellschaft werden danach abgezogen (Equity Value = Enterprise Value − Nettoverschuldung).`],
          ],
        },
        {
          typ: "tabelle",
          caption: `Wertspanne des jungen Parks (${fmt(STANDARD.mwp)} MWp, ${fmt(REST)} Restjahre) – Sensitivitäten`,
          kopf: ["Szenario", "Wert gesamt", "Wert je kWp", "Abweichung zur Basis"],
          zeilen: SENS.map((s, i) => [i === 0 ? `**${s.label}**` : s.label, fmtMio(s.w, 2), kwpWert(s.w), i === 0 ? "–" : fmtPct(s.w / W_MITTE - 1, 0)]),
          hervorheben: 2,
          markierteZeile: 0,
          minBreite: 640,
          fussnote: `Cashflows aus dem Rechenkern des Solarpark-Rechners (Jahre ${ALTER + 1}–${LEBEN}): ${fmt(BASIS.spezErtrag)} kWh/kWp, EEG-Zuschlag bis Jahr 20, danach Marktwert; Betriebskosten, Pacht (${fmt(PACHT.freiflaecheProHa.mittel)} €/ha) und Rückbaurücklage abgezogen. Vor Steuern, ohne Schulden. Kein Wertgutachten.`,
        },
        {
          typ: "p",
          text: `Die Tabelle zeigt, warum Käufer so genau auf Diskontsatz und Ertrag schauen: Anderthalb Prozentpunkte mehr oder weniger Renditeerwartung verschieben den Wert um ${fmtPct(1 - W_NIEDRIG / W_MITTE, 0)} bis ${fmtPct(W_HOCH / W_MITTE - 1, 0)}. Bemerkenswert ist auch, dass ein Park mit einem Zuschlag von [${fmtCt(ERLOESE.eegFreiflaecheCt)}](/quellen#fakt-de-erloese.eegFreiflaecheCt) selbst bei ${fmtPct(DISKONT.niedrig, 0)} unter dem unteren Ende des Marktkorridors bleibt. Der Korridor bildet einen Mix ab – viele gehandelte Bestandsparks haben höhere Alttarife oder gut bepreiste PPA. Wie Erlöse, Kosten und Finanzierung zusammenspielen, erläutert der Ratgeber [Solarpark als Investment](/ratgeber/solarpark-investment-rendite).`,
        },
      ],
    },
    {
      id: "multiplikatoren",
      titel: "Multiplikatoren und €/kWp: Wofür sie taugen",
      tocLabel: "Multiplikatoren",
      bloecke: [
        {
          typ: "p",
          text: `**Multiplikatoren wie Preis je kWp oder Unternehmenswert zum operativen Cashflow (EV/EBITDA) eignen sich zur schnellen Plausibilisierung, nicht zur Preisfindung.** Im jungen Beispielpark entspricht der Basiswert dem ${fmt(MULT_MITTE, 1)}-Fachen des Cashflows im nächsten Jahr (${fmtEur(Math.round(EBITDA_A / 1000) * 1000)}). Ein Altpark mit fünf Förderjahren hätte einen viel kleineren Multiplikator, weil die hohen Cashflows bald enden.`,
        },
        {
          typ: "tabelle",
          caption: "Bewertungsansätze für Bestandsanlagen im Vergleich",
          kopf: ["Ansatz", "Stärke", "Schwäche"],
          zeilen: [
            ["DCF (Barwert der Cashflows)", "bildet Tarif, Restlaufzeit, Kosten und Risiko jahresgenau ab", "hängt an Annahmen – vor allem Diskontsatz und Marktwert nach Förderende"],
            ["€/kWp", "schneller Vergleich zwischen Angeboten", "ignoriert Tarif, Alter und Restlaufzeit; zwei Parks mit gleichem kWp-Preis können sehr verschieden viel wert sein"],
            ["EV/EBITDA", "verbindet Wert und aktuelle Ertragskraft", "blendet aus, wie lange der Cashflow noch fließt"],
            ["Wiederbeschaffungswert", "Obergrenze für junge Parks: Neubau kostet rund " + fmt(BASIS.investProKwp) + " €/kWp inkl. Netz", "sagt nichts über Erlöse; für Altparks mit hohen Tarifen ungeeignet"],
          ],
          hervorheben: 1,
          minBreite: 640,
          fussnote: `Der Wiederbeschaffungswert nutzt die Investitionssumme des 10-MWp-Beispiels aus dem Solarpark-Rechner (${fmt(FREIFLAECHE.capexProKwp.mittel)} €/kWp EPC plus Netzanschluss und Entwicklung).`,
        },
      ],
    },
    {
      id: "restlaufzeit",
      titel: "Restlaufzeit von EEG und Pacht: Der Altpark-Fall",
      tocLabel: "Restlaufzeiten",
      bloecke: [
        {
          typ: "p",
          text: `**Bei älteren Parks steckt der Wert oft in wenigen verbleibenden Förderjahren.** Ein ${fmt(ALT_MWP)}-MWp-Park, der 2011 in Betrieb ging, erhält nach EEG 2009 noch bis Ende 2031 ${fmtCt(ALT_TARIF_CT, 2)}. Mit ${fmt(ALT_SPEZ)} kWh/kWp, einem Wechselrichtertausch im ersten Jahr und Betrieb bis zum Pachtende nach ${fmt(ALT_PACHT_REST)} Jahren ergibt sich bei ${fmtPct(FINANZIERUNG.diskont, 1)} ein Wert von ${fmtMio(WB, 2)} – rund ${kwpWert(WB, ALT_KWP)}. Davon stammen ${fmtPct(WB_EEG_ANTEIL, 0)} aus den ${fmt(ALT_EEG_REST)} Förderjahren.`,
        },
        {
          typ: "p",
          text: "Für Käufer solcher Parks sind drei Fragen entscheidend. Erstens: Läuft die Anlage bis zum Förderende zuverlässig, oder stehen größere Reparaturen an? Zweitens: Wie lange reichen Pachtvertrag und [Dienstbarkeit](/ratgeber/dienstbarkeit-grundbuch-pv-pacht) – und lassen sie sich verlängern? Drittens: Lässt sich der Wert durch einen Modultausch steigern, der die Vergütung nach § 38b EEG erhält? Die Rechnung dazu zeigt der Ratgeber [Repowering](/ratgeber/repowering-solarpark).",
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Vergütungsanspruch lückenlos belegen",
          text: "Der hohe Alttarif ist nur so viel wert wie seine Dokumentation: Inbetriebnahmeprotokoll, Eintrag im Marktstammdatenregister, Abrechnungen des Netzbetreibers und Nachweise über getauschte Module. Unklare Inbetriebnahmezeitpunkte oder nicht gemeldete Änderungen können den Anspruch gefährden – und damit den Kaufpreis.",
        },
      ],
    },
    {
      id: "technische-dd",
      titel: "Technische Due Diligence: Monitoring, Thermografie, Degradation",
      tocLabel: "Technische DD",
      bloecke: [
        {
          typ: "p",
          text: "**Die technische Prüfung soll klären, ob die Anlage den im Modell unterstellten Ertrag über die Restlaufzeit tatsächlich liefern kann.** Gute Bestandsparks haben dafür eine Datenbasis, die bei Projekten fehlt: echte Betriebsjahre.",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Monitoringdaten:** mehrere Jahre Erzeugung, Einstrahlung und Verfügbarkeit; daraus [Performance Ratio](/wissen/lexikon#performance-ratio) und Trend. Die Messung sollte der Norm IEC 61724-1 entsprechen, sonst ist der Vergleich unsicher.",
            "**Degradation:** Vergleich des bereinigten Ertrags über die Jahre und mit der Leistungsgarantie des Herstellers; Stichproben mit Kennlinienmessung.",
            "**Thermografie und Elektrolumineszenz:** Drohnenthermografie des gesamten Feldes, Stichproben per Elektrolumineszenz – findet Hotspots, defekte Bypassdioden, Zellbrüche und potenzialinduzierte Degradation.",
            "**Wechselrichter und Trafo:** Alter, Fehlerhistorie, Ersatzteilverfügbarkeit, Ölproben beim Transformator, Zustand der Mittelspannungsschaltanlage.",
            "**Unterkonstruktion und Gelände:** Korrosion, Setzungen, Kabelführung, Zaun, Zufahrt, Grünpflege, Ausgleichsflächen.",
            "**Verträge und Versicherung:** Betriebsführung, Direktvermarktung, Policen und Schadenhistorie – siehe [Solarpark-Versicherung](/ratgeber/solarpark-versicherung).",
          ],
        },
        {
          typ: "p",
          text: "Befunde werden in die Bewertung übersetzt: fehlender Ertrag als niedrigerer Cashflow, anstehende Reparaturen als Abzug vom Kaufpreis, unklare Risiken über Garantien im Kaufvertrag oder einen Einbehalt. Weil Satelliten- und Modellunsicherheiten nach Studien der IEA im Bereich einiger Prozent liegen, sind gemessene Betriebsjahre der größte Vorteil eines Bestandsparks gegenüber einem Neubauprojekt.",
        },
      ],
    },
    {
      id: "wertminderer",
      titel: "Typische Wertminderer und Verhandlungspunkte",
      tocLabel: "Wertminderer",
      bloecke: [
        {
          typ: "p",
          text: "**Die meisten Preisabschläge bei Bestandsparks gehen auf wenige, wiederkehrende Punkte zurück – und fast alle lassen sich vor dem Verkauf klären oder zumindest beziffern.** Verkäufer, die diese Punkte früh aufarbeiten, verkürzen die Due Diligence und vermeiden Nachverhandlungen kurz vor dem Signing.",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Ertrag unter Gutachten:** Liegt der bereinigte Ist-Ertrag dauerhaft unter dem P50 des ursprünglichen Gutachtens, rechnet der Käufer mit dem Ist-Wert – oder mit einem Abschlag darunter.",
            "**Kurze Restlaufzeit von Pacht oder Dienstbarkeit:** Ohne gesicherte Verlängerung endet der Barwert mit dem Vertrag, auch wenn die Technik länger hält.",
            "**Anstehende Ersatzinvestitionen:** Wechselrichter am Ende ihrer Lebensdauer, Trafo mit auffälligen Ölwerten oder großflächige Moduldefekte werden als Abzug angesetzt.",
            "**Unklare EEG-Dokumentation:** fehlende Nachweise zu Inbetriebnahme, Meldungen oder Modultausch führen zu Einbehalten oder Garantien im Kaufvertrag.",
            "**Rückbaupflichten ohne Rücklage:** Offene Bürgschaften oder fehlende Rückstellungen mindern den Preis, siehe [Rückbau und Rückbaubürgschaft](/ratgeber/solarpark-rueckbau-rueckbaubuergschaft).",
            "**Hohe Schadenquote:** Häufige Diebstahl- oder Hagelschäden verteuern die Versicherung nach dem Eigentümerwechsel.",
          ],
        },
        {
          typ: "p",
          text: "In Österreich und der Schweiz gilt dieselbe Bewertungslogik, nur mit anderen Erlösquellen: In Österreich prägen Marktprämie oder Investitionszuschuss nach EAG die Cashflows, in der Schweiz vor allem Einmalvergütung, Eigenverbrauch und Rückliefertarife. Für jeden Markt gilt: Erst die Zahlungsreihe sauber aufstellen, dann über den Preis verhandeln.",
        },
      ],
    },
    {
      id: "transaktion",
      titel: "Kaufen oder verkaufen: Struktur, Rendite und Projektbörse",
      tocLabel: "Kauf & Verkauf",
      bloecke: [
        {
          typ: "p",
          text: `**Bestandsparks werden überwiegend als Share Deal verkauft – der Käufer übernimmt die Projektgesellschaft mit allen Verträgen, Zusagen und dem EEG-Anspruch.** Vor- und Nachteile gegenüber dem Asset Deal, Beurkundung und Grunderwerbsteuer erklärt der Ratgeber [Projektrechte kaufen](/ratgeber/projektrechte-kaufen-due-diligence); die Begriffe stehen im Lexikon unter [Share Deal](/wissen/lexikon#share-deal) und [Asset Deal](/wissen/lexikon#asset-deal).`,
        },
        {
          typ: "p",
          text: `Aus Käufersicht lässt sich der DCF umkehren: Welche Rendite bringt ein bestimmter Kaufpreis? Zahlt ein Investor für den jungen Beispielpark das untere Ende des Marktkorridors (${fmt(COD.preisProKwp.min)} €/kWp, ${fmtMio(KAUF_MIN)}), ergibt sich eine Projektrendite von ${pct(IRR_KAUF_MIN)} vor Steuern; zum DCF-Basiswert wären es ${pct(IRR_KAUF_WERT)}. Ob das reicht, hängt von Finanzierung und Steuer ab – Fremdkapital wird bei Bestandsanlagen auf Basis des [DSCR](/wissen/lexikon#dscr) dimensioniert.`,
        },
        {
          typ: "p",
          text: `Wer verkauft, erreicht über die [Projektbörse](/projektboerse) gezielt Investoren mit passendem Suchprofil. Käufer zahlen keine Provision; Verkäufer zahlen ${fmtPct(PROVISION.verkaeufer.min, 1)} bis ${fmtPct(PROVISION.verkaeufer.max, 0)} des Kaufpreises, und zwar nur bei erfolgreichem Abschluss – beim Basiswert des Beispiels ${fmtEur(Math.round(PROV_MIN / 1000) * 1000)} bis ${fmtEur(Math.round(PROV_MAX / 1000) * 1000)}. Angebote stellen Sie über [Projekt anbieten](/projektboerse/anbieten) ein; aktuelle Marktzahlen finden Sie unter [Marktdaten](/marktdaten).`,
        },
      ],
    },
  ],

  faq: [
    {
      q: "Wie viel ist ein Solarpark pro kWp wert?",
      a: `Die Website nennt für Bestandsparks eine Marktspanne von ${fmt(COD.preisProKwp.min)}–${fmt(COD.preisProKwp.max)} €/kWp. Der konkrete Wert ergibt sich aus dem Barwert der Cashflows: Im Beispiel liegt ein junger Park mit ${fmtCt(ERLOESE.eegFreiflaecheCt)} bei ${kwpWert(W_NIEDRIG)} bis ${kwpWert(W_HOCH)}, ein Altpark mit ${fmtCt(ALT_TARIF_CT, 2)} bei rund ${kwpWert(WB, ALT_KWP)}.`,
    },
    {
      q: "Welcher Diskontsatz ist bei der Bewertung eines Solarparks üblich?",
      a: `Das hängt von Käufer, Erlösabsicherung und Zinsniveau ab. Die Rechner der Website nutzen ${fmtPct(FINANZIERUNG.diskont, 1)} vor Steuern; gesicherte EEG-Erlöse rechtfertigen niedrigere, Marktpreisphasen höhere Sätze. Schon ein Prozentpunkt verschiebt den Wert deutlich.`,
    },
    {
      q: "Welche Unterlagen braucht man für den Verkauf einer Bestandsanlage?",
      a: "Monitoringdaten mehrerer Jahre, Ertragsgutachten, Abrechnungen des Netzbetreibers, Inbetriebnahmeprotokolle, Eintrag im Marktstammdatenregister, Pacht- und Dienstbarkeitsverträge, Betriebsführungs-, Wartungs- und Direktvermarktungsverträge, Versicherungspolicen und Schadenhistorie.",
    },
    {
      q: "Wie wirkt sich die Restlaufzeit der Pacht auf den Wert aus?",
      a: "Sie begrenzt den Zeitraum, in dem Cashflows fließen. Endet die Pacht früher als die technische Lebensdauer, fehlen die letzten Jahre im Barwert – bei jungen Parks oft ein zweistelliger Prozentsatz. Verlängerungsoptionen erhöhen den Wert.",
    },
    {
      q: "Was kostet der Verkauf über die Projektbörse?",
      a: `Für Käufer nichts. Verkäufer zahlen ${fmtPct(PROVISION.verkaeufer.min, 1)} bis ${fmtPct(PROVISION.verkaeufer.max, 0)} des Kaufpreises – nur bei erfolgreichem Abschluss. Einstellen können Sie Ihren Park über [Projekt anbieten](/projektboerse/anbieten).`,
    },
    {
      q: "Warum sind alte Solarparks trotz kurzer Restlaufzeit so viel wert?",
      a: "Weil sie bis zum Förderende sehr hohe Vergütungen erhalten – bei Inbetriebnahme 2011 etwa 21 ct/kWh statt heute rund 5 ct. Der Großteil des Werts stammt aus diesen letzten Jahren; danach zählt der Marktwert.",
    },
  ],

  passend: [
    { href: "/ratgeber/projektrechte-kaufen-due-diligence", titel: "Projektrechte kaufen", text: "Share Deal, Asset Deal und Due-Diligence-Checkliste." },
    { href: "/ratgeber/repowering-solarpark", titel: "Repowering alter Solarparks", text: "Modultausch, EEG-Regeln und Wirtschaftlichkeit." },
    { href: pfad("/rechner/projektbewertung"), titel: "Projektbewertung", text: "Preisspanne je kWp für Projekte und Bestand." },
    { href: "/projektboerse/anbieten", titel: "Projekt anbieten", text: "Bestandspark in die Projektbörse einstellen." },
    { href: pfad("/bestandsanlagen"), titel: "PV-Bestandsanlagen kaufen und verkaufen", text: "Zweitmarkt für laufende Anlagen – vertraulich, mit Datenraum." },
    { href: pfad("/rechner/bestandsanlage"), titel: "Bestandsanlage bewerten", text: "Ertragswert Ihrer laufenden PV-Anlage berechnen." },
  ],

  quellen: [
    { titel: "EEG 2023, § 51 – Verringerung des Zahlungsanspruchs bei negativen Preisen", url: "https://www.gesetze-im-internet.de/eeg_2014/__51.html", stand: "09/2026" },
    { titel: "EEG 2023, § 38b – Anzulegender Wert, Ersatz von Solaranlagen", url: "https://www.gesetze-im-internet.de/eeg_2014/__38b.html", stand: "09/2026" },
    { titel: "Solarenergie-Förderverein Deutschland – EEG 2009 inkl. Änderungen: Einspeisevergütung bis 31.03.2012", url: "https://www.sfv.de/artikel/eeg_2009_inkl_aenderungen_eeg_2012_bis_3132012_einspeiseverguetung", stand: "09/2026" },
    { titel: "IEC 61724-1:2021 – Photovoltaic system performance, Part 1: Monitoring", url: "https://webstore.iec.ch/en/publication/65561", stand: "09/2026" },
    { titel: "IEA PVPS Task 13 – Uncertainties in PV System Yield Predictions and Assessments (T13-12:2018)", url: "https://iea-pvps.org/wp-content/uploads/2020/01/Uncertainties_in_PV_System_Yield_Predictions_and_Assessments_by_Task_13.pdf", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Marktstammdatenregister", url: "https://www.marktstammdatenregister.de/MaStR", stand: "09/2026" },
    { titel: "Grunderwerbsteuergesetz, § 1 – Erwerbsvorgänge (Share Deal)", url: "https://www.gesetze-im-internet.de/grestg_1983/__1.html", stand: "09/2026" },
  ],

  seitenCta: { titel: "Park grob bewerten", text: "Preisspanne je kWp mit Phase „In Betrieb“ einordnen.", href: pfad("/rechner/projektbewertung"), label: "Zur Projektbewertung" },
  cta: {
    title: "Solarpark verkaufen oder Bestand kaufen?",
    text: "Die Projektbörse verbindet Verkäufer mit Investoren. Käufer nutzen sie kostenfrei, Verkäufer zahlen eine Provision nur bei erfolgreichem Abschluss.",
    primary: { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
    secondary: { label: "Zur Projektbörse", href: "/projektboerse" },
  },
};

export default artikel;
