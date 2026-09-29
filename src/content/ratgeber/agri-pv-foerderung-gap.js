// Ratgeber: Agri-PV Förderung & GAP 2026 – Direktzahlungen, EEG, Baurecht, AT/CH
// Recherchestand 29.09.2026:
//  - § 12 Abs. 4 Nr. 6 und Abs. 5 GAPDZV (gesetze-im-internet.de)
//  - § 37b, § 48 EEG 2023; BNetzA-Hinweise zum Solarpaket I (Beihilfegenehmigung
//    für besondere Solaranlagen steht aus, Übergangsregeln nach § 38b a. F.)
//  - BNetzA, Ergebnisse Gebotstermin 1. Juli 2026 (PM vom 18.08.2026)
//  - § 35 Abs. 1 Nr. 9 und Abs. 5 BauGB
//  - BMWET (AT) EAG-Fördersystem Photovoltaik; LK Kärnten zum Fördercall Oktober 2026
//  - Pronovo (CH) PV-Auktionen; Art. 32c RPV (EspaceSuisse, Swissolar)
// Marktzahlen aus @/lib/invest/markt (AGRI, ERLOESE, PACHT).

import { AGRI, ERLOESE, PACHT } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct, fmtCt } from "@/lib/rechner/annahmen";

/* ------------------------------------------------------------------ */
/* Werte, die (noch) nicht in markt.js stehen – mit Quelle             */
/* ------------------------------------------------------------------ */

// BNetzA, Gebotstermin 1. Juli 2026 (erstes Segment): mengengewichteter
// durchschnittlicher Zuschlagswert und Spanne (PM vom 18.08.2026)
const ZUSCHLAG_JUL_2026 = { mittelCt: 4.79, minCt: 4.38, maxCt: 4.97 };
// § 37b Abs. 2 EEG 2023: Höchstwert Untersegment besondere Solaranlagen (max.)
const HOECHSTWERT_UNTERSEGMENT_CT = 9.5;
// § 38b Abs. 1 Satz 2 EEG 2023 a. F. (Übergang bis zur Beihilfegenehmigung):
// Zuschlag für Agri-PV mit mind. 2,10 m lichter Höhe (Clearingstelle EEG|KWKG, BNetzA)
const BONUS_HOCH_CT = { j2025: 0.7, j2026: 0.5 };
// EAG (AT): Zuschlag für innovative PV (u. a. Agri-PV) und Abschlag für
// landwirtschaftliche Flächen/Grünland (BMWET, EAG-Fördersystem Photovoltaik)
const EAG_ZUSCHLAG = 0.3;
const EAG_ABSCHLAG = 0.25;
// EAG-Investitionszuschuss Kategorie D (> 100 bis 1.000 kWp), Höchstfördersatz €/kWp
// (Landwirtschaftskammer Kärnten zum Fördercall 8.–22. Oktober 2026)
const EAG_KAT_D_EUR_KWP = 120;
// Pronovo (CH): Auktionen ab 150 kW ohne Eigenverbrauch; HEIV bis 60 % der
// Investitionskosten von Referenzanlagen
const CH_AUKTION_KW = 150;
const CH_HEIV_ANTEIL = 0.6;

/* ------------------------------------------------------------------ */
/* Rechenbeispiel GAP: 10 ha Acker mit Agri-PV                          */
/* ------------------------------------------------------------------ */

const HA = 10;
const GAP_OHNE_ANLAGE = HA * AGRI.direktzahlungProHa;
const GAP_AGRI = HA * AGRI.direktzahlungProHa * AGRI.gapFoerderfaehig;
const GAP_VERLUST_AGRI = GAP_OHNE_ANLAGE - GAP_AGRI;
const PACHT_AGRI = HA * PACHT.agriProHa.mittel;
const pct0 = (n) => fmtPct(n, 0);

const artikel = {
  slug: "agri-pv-foerderung-gap",
  title: "Agri-PV Förderung 2026: GAP, EEG, Baurecht und DACH-Programme",
  seoTitle: "Agri-PV Förderung & GAP 2026 | ÖkoInvest",
  kurzTitel: "Agri-PV Förderung & GAP",
  description:
    "Agri-PV Förderung 2026: Warum 85 % der Fläche GAP-förderfähig bleiben, was das EEG zahlt, wann § 35 BauGB privilegiert – plus Österreich und Schweiz.",
  excerpt:
    "Direktzahlungen behalten, EEG-Zuschlag sichern, ohne Bebauungsplan bauen: Welche Förderwege es für Agri-PV 2026 gibt, was jeweils gilt und wo die Grenzen liegen.",
  hauptKeyword: "agri-pv förderung",
  keywords: [
    "Agri-PV Förderung",
    "Agri-PV GAP Direktzahlungen",
    "GAPDZV Agri-Photovoltaik 85 Prozent",
    "Agri-PV EEG Bonus",
    "besondere Solaranlagen EEG",
    "§ 35 BauGB Agri-PV Privilegierung",
    "Agri-PV Förderung Österreich",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Agri-PV & Landwirtschaft",
  bild: "/img/pv-wind-abend.jpg",
  bildAlt: "Solarmodule im Vordergrund, dahinter Windräder vor einem Abendhimmel",
  badge: { wert: pct0(AGRI.gapFoerderfaehig), text: "der Fläche bleiben bei Agri-PV GAP-förderfähig" },

  kurzFazit: [
    `**Direktzahlungen bleiben:** Erfüllt die Anlage § 12 Abs. 5 GAPDZV, bleibt die Fläche landwirtschaftlich – förderfähig sind dann **${pct0(AGRI.gapFoerderfaehig)}** der Fläche. Bei einem klassischen Solarpark entfällt die Förderung für die überbaute Fläche.`,
    `**EEG:** Agri-PV zählt zu den besonderen Solaranlagen. Das eigene Untersegment mit einem Höchstwert von bis zu ${fmtCt(HOECHSTWERT_UNTERSEGMENT_CT)} wartet nach aktuellem Stand noch auf die EU-Beihilfegenehmigung. Bis dahin bieten Agri-PV-Anlagen im ersten Segment mit (Juli 2026: im Schnitt ${fmtCt(ZUSCHLAG_JUL_2026.mittelCt, 2)}).`,
    `Hoch aufgeständerte Anlagen ab 2,10 m lichter Höhe erhalten übergangsweise einen Aufschlag von **${fmtCt(BONUS_HOCH_CT.j2026)}** (2026).`,
    `**Baurecht:** § 35 Abs. 1 Nr. 9 BauGB privilegiert Agri-PV bis **${fmt(AGRI.privilegierungHa, 1)} ha** Grundfläche mit Bezug zur Hofstelle. Größere Anlagen brauchen einen Bebauungsplan.`,
    `**Österreich:** Beim EAG-Investitionszuschuss gibt es für Agri-PV **${pct0(EAG_ZUSCHLAG)} Zuschlag** statt ${pct0(EAG_ABSCHLAG)} Abschlag. **Schweiz:** Agri-PV kann nach Art. 32c RPV außerhalb der Bauzone bewilligt werden, gefördert wird über die Einmalvergütung.`,
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Welche Förderung gibt es für Agri-PV?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: `**Agri-PV wird in Deutschland nicht über einen einzelnen Zuschuss gefördert, sondern über drei Hebel: Die Fläche bleibt zu ${pct0(AGRI.gapFoerderfaehig)} für die [GAP-Direktzahlungen](/wissen/lexikon#gap-direktzahlungen) förderfähig, der Strom kann über das EEG als besondere Solaranlage vergütet werden, und kleinere Anlagen an der Hofstelle sind im Außenbereich baurechtlich privilegiert.** Hinzu kommen einzelne Landesprogramme und zinsgünstige Förderkredite.`,
        },
        {
          typ: "p",
          text: "Keiner dieser Hebel greift automatisch. Die Anlage muss so geplant sein, dass die Landwirtschaft die Hauptnutzung bleibt. Maßstab dafür ist fast überall die [DIN SPEC 91434](/ratgeber/agri-pv-din-spec-91434): Sie legt fest, wie viel Fläche die Anlage höchstens verbrauchen darf, welcher Ertrag auf dem Acker bleiben muss und was im landwirtschaftlichen Nutzungskonzept stehen muss. Wer die Norm von Anfang an einplant, erfüllt damit weitgehend auch die Anforderungen für GAP, EEG und Baurecht.",
        },
        {
          typ: "kennzahl",
          wert: pct0(AGRI.gapFoerderfaehig),
          titel: "der Fläche bleiben bei Agri-PV für die Direktzahlungen förderfähig",
          text: "Rechtsgrundlage ist § 12 Abs. 4 Nr. 6 und Abs. 5 GAP-Direktzahlungen-Verordnung. Auf einem klassischen Solarpark gilt die überbaute Fläche dagegen als nichtlandwirtschaftlich genutzt.",
        },
      ],
    },
    {
      id: "ueberblick",
      titel: "Förderwege im Überblick",
      bloecke: [
        {
          typ: "tabelle",
          caption: "Förderwege für Agri-PV in Deutschland, Österreich und der Schweiz, Stand September 2026",
          kopf: ["Förderweg", "Land", "Was es bringt", "Zentrale Voraussetzung"],
          zeilen: [
            ["GAP-Direktzahlungen", "DE", `${pct0(AGRI.gapFoerderfaehig)} der Fläche bleiben förderfähig`, "§ 12 Abs. 5 GAPDZV: Bearbeitung mit üblichen Maschinen möglich, höchstens 15 % Flächenverlust nach DIN SPEC 91434"],
            ["EEG-Ausschreibung (besondere Solaranlagen)", "DE", `Marktprämie für 20 Jahre; derzeit im ersten Segment (Juli 2026: Ø ${fmtCt(ZUSCHLAG_JUL_2026.mittelCt, 2)})`, "Zuschlag, Einhaltung der BNetzA-Festlegung und der DIN SPEC 91434 über die gesamte Förderdauer"],
            ["EEG-Aufschlag hoch aufgeständert", "DE", `${fmtCt(BONUS_HOCH_CT.j2026)} zusätzlich (2026, Übergangsregel)`, "mindestens 2,10 m lichte Höhe"],
            ["Privilegierung § 35 Abs. 1 Nr. 9 BauGB", "DE", "Bauen ohne Bebauungsplan", `bis ${fmt(AGRI.privilegierungHa, 1)} ha Grundfläche, Bezug zu einem land- oder forstwirtschaftlichen Betrieb, eine Anlage je Hofstelle`],
            ["Landesprogramme und Förderkredite", "DE", "Zuschuss oder zinsgünstiger Kredit", "je nach Programm, z. B. NRW: bis 25 % der förderfähigen Kosten"],
            ["EAG-Investitionszuschuss", "AT", `${pct0(EAG_ZUSCHLAG)} Zuschlag auf den Fördersatz, kein ${pct0(EAG_ABSCHLAG)}-Abschlag`, "Anlagen bis 1 MWp, Agri-PV mit mindestens 2 m Höhe oder vertikal, Fördercall"],
            ["Einmalvergütung / Auktion", "CH", `HEIV bis ${pct0(CH_HEIV_ANTEIL)} der Investitionskosten einer Referenzanlage`, `Auktion ab ${fmt(CH_AUKTION_KW)} kW ohne Eigenverbrauch; Bewilligung nach Art. 32c RPV`],
          ],
          minBreite: 780,
          fussnote: "Orientierung ohne Anspruch auf Vollständigkeit. Förderbedingungen ändern sich häufig – maßgeblich sind die jeweils aktuellen Richtlinien, Verordnungen und Ausschreibungsbedingungen.",
        },
        {
          typ: "p",
          text: "Die Förderwege lassen sich in der Regel kombinieren: Ein Landwirt kann die Direktzahlungen für seine Fläche weiter beantragen, während der Betreiber der Anlage – er selbst oder ein Investor – den Strom über das EEG oder einen Liefervertrag vermarktet. Vorsicht ist bei Landeszuschüssen geboten: Investitionszuschüsse werden teils auf die EEG-Förderung angerechnet oder schließen sie aus. Das muss vor dem Antrag geklärt werden.",
        },
      ],
    },
    {
      id: "gap",
      titel: "GAP-Direktzahlungen: 85 % der Fläche bleiben förderfähig",
      tocLabel: "GAP-Direktzahlungen",
      bloecke: [
        {
          typ: "p",
          text: `**Flächen mit einem klassischen Solarpark gelten nach der GAP-Direktzahlungen-Verordnung als hauptsächlich nichtlandwirtschaftlich genutzt und fallen aus der Förderung – es sei denn, der Betriebsinhaber weist nach, dass es sich um eine Agri-PV-Anlage handelt.** Dann bleibt die Fläche landwirtschaftlich, und ${pct0(AGRI.gapFoerderfaehig)} von ihr sind förderfähig. Der pauschale Abzug von 15 % bildet den Flächenverlust durch Pfosten, Fundamente und nicht bewirtschaftbare Randstreifen ab.`,
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Was § 12 Abs. 5 GAPDZV verlangt",
          text: "Eine Agri-PV-Anlage im Sinne der Verordnung ist eine Solaranlage auf landwirtschaftlicher Fläche, die **eine Bearbeitung der Fläche mit üblichen landwirtschaftlichen Methoden, Maschinen und Geräten nicht ausschließt** und die landwirtschaftlich nutzbare Fläche **nach DIN SPEC 91434:2021-05 um höchstens 15 %** verringert. Beide Bedingungen müssen erfüllt sein. Der Nachweis liegt beim Betriebsinhaber, der die Fläche im Sammelantrag angibt.",
        },
        {
          typ: "p",
          text: `Was das in Euro bedeutet, zeigt ein einfaches Beispiel. Wir rechnen mit rund ${fmtEur(AGRI.direktzahlungProHa)} je Hektar aus Einkommensgrundstützung und Umverteilungsprämie – einer groben Orientierung für Deutschland 2025/26. Öko-Regelungen und Agrarumweltprogramme kommen je nach Betrieb hinzu, sind hier aber nicht berücksichtigt.`,
        },
        {
          typ: "tabelle",
          caption: `Direktzahlungen auf ${fmt(HA)} ha Acker mit und ohne Agri-PV-Status (vereinfachtes Beispiel)`,
          kopf: ["", "Ohne Anlage", "Agri-PV nach GAPDZV", "Klassischer Solarpark"],
          zeilen: [
            ["Förderfähige Fläche", `${fmt(HA)} ha`, `${fmt(HA * AGRI.gapFoerderfaehig, 1)} ha`, "0 ha (überbaute Fläche)"],
            ["Direktzahlungen pro Jahr", fmtEur(GAP_OHNE_ANLAGE), fmtEur(GAP_AGRI), "entfallen"],
            ["Landwirtschaftliche Nutzung", "voll", "bleibt Hauptnutzung", "meist nur Pflege oder Beweidung"],
            ["Status der Fläche", "landwirtschaftlich", "landwirtschaftlich", "nichtlandwirtschaftlich"],
          ],
          hervorheben: 2,
          minBreite: 620,
          fussnote: `Orientierungswert ${fmtEur(AGRI.direktzahlungProHa)}/ha, gerundet. Tatsächliche Beträge hängen von Betriebsgröße, Umverteilungsprämie, Junglandwirte-Zahlung und Öko-Regelungen ab.`,
        },
        {
          typ: "p",
          text: `Auf ${fmt(HA)} ha verliert der Betrieb durch die Agri-PV-Anlage also rund ${fmtEur(GAP_VERLUST_AGRI)} Direktzahlungen im Jahr – ein kleiner Betrag im Vergleich zur Pacht, die ein Investor für Agri-PV typischerweise zahlt (Orientierung: ${fmtEur(PACHT.agriProHa.min)} bis ${fmtEur(PACHT.agriProHa.max)} je Hektar, auf ${fmt(HA)} ha also etwa ${fmtEur(PACHT_AGRI)} im Mittel). Bei einem klassischen Solarpark wären die vollen ${fmtEur(GAP_OHNE_ANLAGE)} weg. Wie sich Pacht, Direktzahlungen und Deckungsbeitrag zusammen entwickeln, zeigt der [Agri-PV-Rechner](/rechner/agri-pv).`,
        },
        { typ: "h3", text: "Worauf Sie beim Sammelantrag achten sollten" },
        {
          typ: "checkliste",
          punkte: [
            "**Wer bewirtschaftet?** Die Direktzahlungen erhält der Betriebsinhaber, der die Fläche tatsächlich landwirtschaftlich nutzt – bei Verpachtung der Anlagenfläche an einen Investor sollte der Pachtvertrag ausdrücklich regeln, dass die landwirtschaftliche Nutzung beim Landwirt bleibt.",
            "**Nachweise bereithalten:** Anlagenplan mit Flächenbilanz, landwirtschaftliches Nutzungskonzept nach DIN SPEC 91434 und Angaben zu Maschinen und Arbeitsbreiten.",
            "**Konditionalität beachten:** Fruchtfolge, Mindestbodenbedeckung und Pufferstreifen gelten weiter. Ob Öko-Regelungen auf der Fläche möglich bleiben, hängt vom Anlagentyp ab – im Zweifel bei der Landwirtschaftsbehörde nachfragen.",
            "**Tierhaltung:** Die GAPDZV verweist auf die DIN SPEC 91434. Die ergänzende DIN SPEC 91492 für Weidenutzung wird dort nicht genannt – bei Agri-PV auf Weiden sollten Sie die Anerkennung vorab mit der zuständigen Behörde abstimmen.",
          ],
        },
      ],
    },
    {
      id: "eeg",
      titel: "EEG: Vergütung als besondere Solaranlage",
      tocLabel: "EEG-Vergütung",
      bloecke: [
        {
          typ: "p",
          text: `**Das EEG 2023 zählt Agri-PV auf Ackerflächen, Flächen mit Dauerkulturen und Dauergrünland zu den [besonderen Solaranlagen](/wissen/lexikon#besondere-solaranlagen).** Solche Anlagen dürfen – anders als klassische Freiflächenanlagen – auch außerhalb der Flächenkulisse aus Randstreifen und benachteiligten Gebieten an der Ausschreibung teilnehmen. Voraussetzung ist, dass sie die Festlegung der Bundesnetzagentur einhalten, die wiederum auf die DIN SPEC 91434 verweist. Ausgeschlossen sind unter anderem Naturschutzgebiete, Nationalparks und Moorböden, bei Grünland zusätzlich Natura-2000-Gebiete und geschützte Lebensraumtypen.`,
        },
        {
          typ: "p",
          text: `Mit dem Solarpaket I hat der Gesetzgeber 2024 ein eigenes Untersegment für besondere Solaranlagen geschaffen, mit einem Höchstwert von bis zu ${fmtCt(HOECHSTWERT_UNTERSEGMENT_CT)} (§ 37b Abs. 2 EEG). **Nach aktuellem Stand fehlt dafür aber noch die beihilferechtliche Genehmigung der EU-Kommission.** Bis sie vorliegt, gelten nach Hinweisen der Bundesnetzagentur die Übergangsregeln: Agri-PV-Anlagen konkurrieren im ersten Segment mit klassischen Freiflächenanlagen. Dort lag der mengengewichtete Zuschlagswert zum Gebotstermin 1. Juli 2026 bei ${fmtCt(ZUSCHLAG_JUL_2026.mittelCt, 2)}, die Spanne reichte von ${fmtCt(ZUSCHLAG_JUL_2026.minCt, 2)} bis ${fmtCt(ZUSCHLAG_JUL_2026.maxCt, 2)}.`,
        },
        {
          typ: "tabelle",
          caption: "EEG-Regeln für Agri-PV nach aktuellem Stand (September 2026)",
          kopf: ["Regel", "Heute (Übergang)", "Nach EU-Genehmigung Solarpaket I"],
          zeilen: [
            ["Ausschreibung", "erstes Segment, gemeinsam mit Freiflächenanlagen", "eigenes Untersegment für besondere Solaranlagen"],
            ["Höchstwert", "wie erstes Segment (1. März 2026: 5,79 ct/kWh)", `bis ${fmtCt(HOECHSTWERT_UNTERSEGMENT_CT)}`],
            ["Aufschlag hoch aufgeständert", `${fmtCt(BONUS_HOCH_CT.j2025)} (2025), ${fmtCt(BONUS_HOCH_CT.j2026)} (2026–2028), ab 2,10 m lichter Höhe`, "höherer Bonus vorgesehen, Details je nach Genehmigung"],
            ["Nachweis", "Gutachten gegenüber dem Netzbetreiber, u. a. zur DIN SPEC 91434", "unverändert"],
          ],
          minBreite: 680,
          fussnote: "Quellen: § 37b und § 48 EEG 2023, Bundesnetzagentur (Ausschreibungsverfahren erstes Segment, Gebotstermine 2026), Clearingstelle EEG|KWKG. Ob und wann die Genehmigung erteilt wird, ist offen.",
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "EEG 2027: Umstellung auf Differenzverträge geplant",
          text: "Das Bundeskabinett hat am 29. Juli 2026 eine EEG-Novelle beschlossen, die unter anderem den Umstieg auf Differenzverträge für größere Anlagen vorsieht und Freiflächenanlagen stärker in den Mittelpunkt stellt. Das parlamentarische Verfahren und die EU-Genehmigung laufen noch. Wer heute plant, sollte die Wirtschaftlichkeit mit beiden Regimen durchrechnen – und die Frage, ob das Agri-PV-Untersegment im neuen Recht fortgeführt wird, im Blick behalten.",
        },
        {
          typ: "p",
          text: `Für eine erste Wirtschaftlichkeitsrechnung setzen unsere Rechner für besondere Solaranlagen eine Planungsannahme von ${fmtCt(ERLOESE.eegBesondereCt)} an – das liegt zwischen dem heutigen Zuschlagsniveau inklusive Aufschlag und dem möglichen Höchstwert des Untersegments. Was das für die Rendite bedeutet und warum Agri-PV heute knapper kalkuliert ist als ein klassischer Solarpark, erklärt unser Ratgeber zur [Agri-PV-Wirtschaftlichkeit](/ratgeber/agri-pv-wirtschaftlichkeit). Wie die Ausschreibung selbst funktioniert, lesen Sie unter [EEG-Ausschreibung für Freiflächenanlagen](/ratgeber/eeg-ausschreibung-freiflaeche).`,
        },
      ],
    },
    {
      id: "baurecht",
      titel: "Baurecht: Privilegierung bis 2,5 ha an der Hofstelle",
      tocLabel: "Baurecht § 35 BauGB",
      bloecke: [
        {
          typ: "p",
          text: `**Seit 2023 sind besondere Solaranlagen nach § 35 Abs. 1 Nr. 9 BauGB im Außenbereich [privilegiert](/wissen/lexikon#privilegierung-aussenbereich), wenn sie in einem räumlich-funktionalen Zusammenhang mit einem land- oder forstwirtschaftlichen Betrieb stehen, ihre Grundfläche ${fmt(AGRI.privilegierungHa, 1)} ha (25.000 m²) nicht überschreitet und je Hofstelle oder Betriebsstandort nur eine solche Anlage betrieben wird.** Ein Bebauungsplan ist dann nicht nötig, eine Baugenehmigung in der Regel schon.`,
        },
        {
          typ: "p",
          text: "Die Privilegierung ist vor allem für Landwirte interessant, die selbst investieren und einen Teil des Stroms auf dem Hof nutzen oder eine Anlage in Hofnähe betreiben wollen. Nach § 35 Abs. 5 BauGB müssen Sie sich verpflichten, die Anlage nach dauerhafter Aufgabe der Nutzung zurückzubauen und Versiegelungen zu beseitigen. Was „räumlich-funktionaler Zusammenhang“ konkret bedeutet, legen die Landkreise unterschiedlich aus – eine frühe Bauvoranfrage schafft Klarheit.",
        },
        {
          typ: "p",
          text: `Für größere Agri-PV-Parks, wie sie Investoren typischerweise ab etwa 5 MWp planen, führt kein Weg am Bebauungsplan der Gemeinde vorbei. Wie das Verfahren vom Aufstellungsbeschluss bis zum Satzungsbeschluss abläuft, erklärt der Ratgeber [Solarpark-Genehmigung und Bebauungsplan](/ratgeber/solarpark-genehmigung-bebauungsplan). Zum Vergleich: ${fmt(AGRI.privilegierungHa, 1)} ha reichen bei hoch aufgeständerten Systemen für grob 1,5 MWp, bei vertikalen Systemen für knapp 1 MWp.`,
        },
      ],
    },
    {
      id: "laender",
      titel: "Landesprogramme und Förderkredite",
      bloecke: [
        {
          typ: "p",
          text: "**Einige Bundesländer fördern Agri-PV zusätzlich mit Investitionszuschüssen, die meisten jedoch nicht dauerhaft.** Ein Beispiel ist Nordrhein-Westfalen: Im Programm progres.nrw – Klimaschutztechnik konnten nach einer [Mitteilung der Landesregierung vom Mai 2025](https://www.land.nrw/pressemitteilung/solarenergie-clever-nutzen-land-foerdert-wieder-ausbau-von-agri-und-floating-pv) Zuschüsse von bis zu 25 % der förderfähigen Investitionskosten für Agri- und Floating-PV beantragt werden. Andere Länder haben Pilot- und Forschungsanlagen gefördert oder Beratungsangebote aufgelegt.",
        },
        {
          typ: "p",
          text: "Daneben bietet die Landwirtschaftliche Rentenbank zinsgünstige Programmkredite für Investitionen landwirtschaftlicher Unternehmen in erneuerbare Energien an, die über die Hausbank beantragt werden. Wichtig bei allen Programmen: Anträge müssen meist **vor** Auftragsvergabe gestellt werden, Fördertöpfe sind begrenzt, und Zuschüsse können die EEG-Vergütung beeinflussen. Prüfen Sie den aktuellen Stand direkt beim Programmträger.",
        },
      ],
    },
    {
      id: "oesterreich",
      titel: "Österreich: EAG-Zuschlag, Widmung und INVEKOS",
      tocLabel: "Österreich",
      bloecke: [
        {
          typ: "p",
          text: `**In Österreich wird Agri-PV vor allem über das [Erneuerbaren-Ausbau-Gesetz (EAG)](/wissen/lexikon#eag) gefördert.** Beim Investitionszuschuss für Anlagen bis 1 MWp erhalten innovative Anlagen – darunter Agri-PV mit mindestens 2 m Höhe oder vertikaler Aufständerung – einen Zuschlag von ${pct0(EAG_ZUSCHLAG)} auf den Fördersatz. Der Abschlag von ${pct0(EAG_ABSCHLAG)}, der sonst für Anlagen auf landwirtschaftlichen Flächen und Grünland gilt, entfällt für Agri-PV. Für die Kategorie über 100 bis 1.000 kWp lag der Höchstfördersatz beim Fördercall im Oktober 2026 bei ${fmtEur(EAG_KAT_D_EUR_KWP)} je kWp. Größere Anlagen können über Ausschreibungen eine Marktprämie erhalten.`,
        },
        {
          typ: "p",
          text: "Baurechtlich braucht eine größere Anlage in der Regel eine Widmung als Grünland-Photovoltaik, deren Voraussetzungen jedes Bundesland selbst regelt. Bei den Direktzahlungen gilt: Flächen mit PV-Anlagen können unter Bedingungen im Mehrfachantrag beantragt werden, wenn die landwirtschaftliche Nutzung auf dem überwiegenden Teil der Fläche möglich bleibt. Ob ÖPUL-Maßnahmen auf der Fläche weiterlaufen können, sollten Sie vorab mit der Landwirtschaftskammer oder der AMA klären. Mehr dazu im Ratgeber [Freiflächen-PV in Österreich](/ratgeber/freiflaechen-pv-oesterreich).",
        },
      ],
    },
    {
      id: "schweiz",
      titel: "Schweiz: Art. 32c RPV und Einmalvergütung",
      tocLabel: "Schweiz",
      bloecke: [
        {
          typ: "p",
          text: `**In der Schweiz können Agri-PV-Anlagen seit dem 1. Juli 2022 nach Art. 32c der Raumplanungsverordnung außerhalb der Bauzone als standortgebunden gelten – wenn sie Vorteile für die landwirtschaftliche Produktion bewirken oder Versuchs- und Forschungszwecken dienen und in wenig empfindlichen Gebieten liegen.** In der Praxis betrifft das vor allem Beeren, Obst und Gemüse, bei denen Module Schutz vor Hagel, Starkregen oder Sonnenbrand bieten.`,
        },
        {
          typ: "p",
          text: `Gefördert wird über die [Einmalvergütung](/wissen/lexikon#einmalverguetung) der Pronovo. Anlagen ab ${fmt(CH_AUKTION_KW)} kW, die ihren Strom vollständig einspeisen, nehmen an Auktionen teil; die hohe Einmalvergütung kann dort bis zu ${pct0(CH_HEIV_ANTEIL)} der Investitionskosten von Referenzanlagen decken. Offen bleibt die Frage der Direktzahlungen: Der Bundesrat hat 2022 darauf verzichtet, die Direktzahlungsregeln für Flächen unter PV-Anlagen anzupassen. Details im Ratgeber [Freiflächen-PV in der Schweiz](/ratgeber/freiflaechen-pv-schweiz).`,
        },
      ],
    },
    {
      id: "fehler",
      titel: "Typische Fehler, die Förderung kosten",
      tocLabel: "Fehler & Grenzen",
      bloecke: [
        {
          typ: "checkliste",
          punkte: [
            "**„Agri-PV“ nur auf dem Papier:** Wird die Fläche unter der Anlage faktisch nur gemulcht, drohen Rückforderung der Direktzahlungen und der Verlust der EEG-Förderung. Die DIN SPEC 91434 verlangt mindestens 66 % des Referenzertrags.",
            "**Flächenverlust unterschätzt:** Rammschutz, Wechselrichterstationen, Wege und nicht befahrbare Randbereiche zählen mit. Planen Sie mit Reserve zur 10- bzw. 15-%-Grenze.",
            "**Maschinenbreiten vergessen:** Der Reihenabstand muss zu Mähdrescher, Spritze und Vorgewende passen – sonst ist die „übliche Bearbeitung“ nicht möglich.",
            "**Förderungen ungeprüft kombiniert:** Landeszuschüsse, EEG und Förderkredite schließen sich teilweise aus oder werden angerechnet.",
            "**Rechtsstand übersehen:** Die EU-Genehmigung für das Agri-PV-Untersegment steht aus, das EEG 2027 ist in Arbeit. Kalkulieren Sie nicht mit Werten, die es noch nicht gibt.",
          ],
        },
        {
          typ: "kasten",
          variant: "info",
          text: "Dieser Ratgeber ersetzt keine Rechts- oder Steuerberatung. Zu Direktzahlungen berät Sie die zuständige Landwirtschaftsbehörde, zu Pachtverträgen, Steuern und Erbschaftsfragen sollten Sie einen Fachanwalt oder Steuerberater hinzuziehen.",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So sichern Sie sich die Förderung Schritt für Schritt",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Fläche und Ziel klären", "Wie groß ist die Fläche, welche Kultur läuft darauf, wollen Sie verpachten, selbst investieren oder sich beteiligen? Eine erste Einschätzung gibt der [Flächencheck](/flaechencheck)."],
            ["System wählen", "Vertikal (Kategorie II) für Acker und Grünland, hoch aufgeständert (Kategorie I) vor allem für Sonderkulturen. Die Wahl bestimmt Kosten, Bonus und Flächenverlust."],
            ["Nutzungskonzept erstellen", "Landwirt und Errichter erstellen gemeinsam das Konzept nach DIN SPEC 91434 – es ist Grundlage für GAP, EEG und Baurecht."],
            ["Baurecht klären", `Bis ${fmt(AGRI.privilegierungHa, 1)} ha an der Hofstelle Bauvoranfrage, sonst frühes Gespräch mit der Gemeinde zum Bebauungsplan.`],
            ["Erlösweg festlegen", "EEG-Ausschreibung, Direktlieferung oder PPA – mit Blick auf Übergangsregeln und EEG 2027."],
            ["Nachweise führen", "Sammelantrag mit Flächenbilanz, Gutachten für den Netzbetreiber, Schlagkartei und Ertragsdokumentation laufend pflegen."],
          ],
        },
        {
          typ: "tool",
          href: "/rechner/agri-pv",
          titel: "Verpachten, investieren oder beteiligen?",
          text: "Der Agri-PV-Rechner vergleicht die drei Wege für Ihre Fläche – inklusive Pacht, Deckungsbeitrag und Direktzahlungen.",
          label: "Zum Agri-PV-Rechner",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Bekomme ich für eine Agri-PV-Fläche weiter Direktzahlungen?",
      a: `Ja, wenn die Anlage die Anforderungen von § 12 Abs. 5 GAPDZV erfüllt: Bearbeitung mit üblichen Maschinen bleibt möglich, und der Flächenverlust liegt nach DIN SPEC 91434 bei höchstens 15 %. Dann sind ${pct0(AGRI.gapFoerderfaehig)} der Fläche förderfähig. Antragsberechtigt ist der Betriebsinhaber, der die Fläche bewirtschaftet.`,
    },
    {
      q: "Wie hoch ist der EEG-Bonus für Agri-PV 2026?",
      a: `Nach aktuellem Stand gilt übergangsweise ein Aufschlag von ${fmtCt(BONUS_HOCH_CT.j2026)} auf den Zuschlagswert für Anlagen mit mindestens 2,10 m lichter Höhe. Der mit dem Solarpaket I geplante höhere Bonus und das eigene Untersegment mit bis zu ${fmtCt(HOECHSTWERT_UNTERSEGMENT_CT)} Höchstwert warten noch auf die EU-Beihilfegenehmigung.`,
    },
    {
      q: "Brauche ich für Agri-PV einen Bebauungsplan?",
      a: `Nicht immer. Bis ${fmt(AGRI.privilegierungHa, 1)} ha Grundfläche mit räumlich-funktionalem Bezug zu Ihrem landwirtschaftlichen Betrieb ist Agri-PV nach § 35 Abs. 1 Nr. 9 BauGB privilegiert – eine Anlage je Hofstelle. Größere Anlagen brauchen einen Bebauungsplan der Gemeinde.`,
    },
    {
      q: "Gilt die GAP-Regel auch für vertikale Agri-PV?",
      a: "Ja, die GAPDZV unterscheidet nicht nach Bauart. Vertikale Anlagen (Kategorie II der DIN SPEC 91434) erfüllen die Anforderungen, wenn zwischen den Reihen mit üblichen Maschinen gearbeitet werden kann und der Flächenverlust höchstens 15 % beträgt.",
    },
    {
      q: "Welche Agri-PV-Förderung gibt es in Österreich?",
      a: `Beim EAG-Investitionszuschuss erhalten Agri-PV-Anlagen bis 1 MWp einen Zuschlag von ${pct0(EAG_ZUSCHLAG)} auf den Fördersatz, der ${pct0(EAG_ABSCHLAG)}-Abschlag für landwirtschaftliche Flächen entfällt. Größere Anlagen können über Ausschreibungen eine Marktprämie erhalten. Zusätzlich ist eine Widmung nach Landesrecht nötig.`,
    },
    {
      q: "Kann ich Landesförderung und EEG kombinieren?",
      a: "Das hängt vom Programm ab. Manche Landeszuschüsse werden auf die EEG-Förderung angerechnet oder setzen voraus, dass keine EEG-Vergütung in Anspruch genommen wird. Klären Sie das vor dem Antrag mit dem Programmträger.",
    },
  ],

  passend: [
    { href: "/ratgeber/agri-pv-din-spec-91434", titel: "DIN SPEC 91434 erklärt", text: "Kategorien, Flächenverlust und 66-%-Regel im Detail." },
    { href: "/ratgeber/agri-pv-wirtschaftlichkeit", titel: "Agri-PV Wirtschaftlichkeit", text: "Kosten, Erlöse und Rendite vertikal und hoch aufgeständert." },
    { href: "/landwirte", titel: "Agri-PV für Landwirte", text: "Verpachten, selbst investieren oder beteiligen." },
    { href: "/rechner/agri-pv", titel: "Agri-PV-Rechner", text: "Drei Wege für Ihre Fläche im Vergleich." },
  ],

  quellen: [
    { titel: "GAP-Direktzahlungen-Verordnung (GAPDZV), § 12", url: "https://www.gesetze-im-internet.de/gapdzv/__12.html", stand: "09/2026" },
    { titel: "EEG 2023, § 37b – Höchstwerte für Solaranlagen des ersten Segments", url: "https://www.gesetze-im-internet.de/eeg_2014/__37b.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Ausschreibungsverfahren Solaranlagen erstes Segment (Hinweise zum Solarpaket I)", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/Ausschreibungsverfahren/start.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Ausschreibung PV-Freiflächenanlagen zum Gebotstermin 1. Juli 2026", url: "https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260818_Solar1.html", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – Unter welchen Voraussetzungen sind Agri-PV-Anlagen nach dem EEG förderfähig?", url: "https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/229", stand: "09/2026" },
    { titel: "Baugesetzbuch, § 35 (Bauen im Außenbereich)", url: "https://www.gesetze-im-internet.de/bbaug/__35.html", stand: "09/2026" },
    { titel: "BMWET Österreich – Das Photovoltaik-Fördersystem im Überblick", url: "https://www.bmwet.gv.at/Themen/Energie/erneuerbare-energie/eag-foerdersystem-photovoltaik.html", stand: "09/2026" },
    { titel: "Pronovo – PV-Auktionen Schweiz", url: "https://pronovo.ch/de/foerderung/photovoltaik/auktionen/", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Was bringt Agri-PV auf Ihrer Fläche?",
    text: "Pacht, Eigeninvestition oder Beteiligung – mit Direktzahlungen gerechnet.",
    href: "/rechner/agri-pv",
    label: "Zum Agri-PV-Rechner",
  },
  cta: {
    title: "Agri-PV auf Ihrer Fläche prüfen lassen.",
    text: "ÖkoInvest bewertet Lage, Netzanschluss und Baurecht Ihrer Fläche und zeigt, welche Förderwege in Frage kommen. Für Flächeneigentümer ist das kostenfrei.",
    primary: { label: "Flächencheck starten", href: "/flaechencheck" },
    secondary: { label: "Agri-PV-Rechner", href: "/rechner/agri-pv" },
  },
};

export default artikel;
