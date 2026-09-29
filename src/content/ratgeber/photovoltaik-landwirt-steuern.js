// Ratgeber: Steuern für Landwirte mit Photovoltaik – Verpachtung (§ 13 vs. § 21 EStG), eigene Anlage
// als Gewerbebetrieb (§ 15 EStG, R 15.5 EStR), Umsatzsteuer (§§ 4 Nr. 12, 9, 12 Abs. 3, 24 UStG),
// Gewerbesteuer (§ 11 GewStG, § 35 EStG), Entnahme und stille Reserven, § 13a EStG.
// Recherchestand 29.09.2026. Erbschaft- und Grundsteuer nur verlinkt (pv-pacht-erbschaftsteuer-grundsteuer.js).

import { PACHT, KOMMUNE, AGRI, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct } from "@/lib/rechner/annahmen";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// R 15.5 Abs. 11 EStR: typisierende Zurechnung gewerblicher Nebentätigkeiten zur Land- und Forstwirtschaft.
const R155_DRITTEL = 1 / 3;
const R155_GRENZE_EUR = 51500;
const R155_GESAMT_MAX = 0.5; // Umsätze aus Tätigkeiten nach Abs. 3–10 insgesamt max. 50 % des Gesamtumsatzes
// § 24 Abs. 1 UStG: Umsatzgrenze Durchschnittssatzbesteuerung (Vorjahr) und allgemeiner Durchschnittssatz.
const UST24_GRENZE_EUR = 600000;
const UST24_SATZ = 0.078;
// § 12 Abs. 3 Nr. 1 UStG, § 3 Nr. 72 EStG, § 3 Nr. 32 GewStG: 30-kWp-Grenzen für Gebäudeanlagen.
const KWP_GRENZE_KLEIN = 30;
const KWP_GRENZE_STPFL = 100; // § 3 Nr. 72 EStG, je Steuerpflichtigem/Mitunternehmerschaft
// § 11 Abs. 1 Satz 3 Nr. 1 GewStG: Freibetrag natürliche Personen und Personengesellschaften.
const GEWST_FREIBETRAG = 24500;
// § 35 Abs. 1 Satz 1 Nr. 1 EStG: Steuerermäßigung = 4,0-facher Gewerbesteuer-Messbetrag.
const ANRECHNUNG_FAKTOR = 4.0;
// § 13a Abs. 1 EStG: Zugangsgrenze selbst bewirtschaftete landwirtschaftliche Fläche (ha, ohne Sondernutzungen).
const P13A_HA = 20;
// § 13a Abs. 7 EStG: Sondergewinn aus Veräußerung/Entnahme von Anlagegütern ab Einzelerlös über (EUR).
const P13A_ANLAGEGUT_EUR = 15000;
// Land & Forst (21.03.2022): verpachtete PV-Fläche über 10 % der Betriebsfläche nur als geduldetes Betriebsvermögen.
const GEDULDET_ANTEIL = 0.1;

/* Illustration Gewerbesteuer einer eigenen Anlage (Einzelunternehmer) */
const GEWINN_BSP = 60000;
const MESSBETRAG = (Math.floor((GEWINN_BSP - GEWST_FREIBETRAG) / 100) * 100) * KOMMUNE.messzahl;
const GEWST = MESSBETRAG * KOMMUNE.hebesatz;
const ANRECHNUNG = MESSBETRAG * ANRECHNUNG_FAKTOR;

/* Illustration stille Reserven (reine Annahmen, keine Marktwerte) */
const BSP_HA = 10;
const BUCHWERT_HA = 5000;
const TEILWERT_HA = 30000;
const STILLE_RESERVE = (TEILWERT_HA - BUCHWERT_HA) * BSP_HA;
const PACHT_BSP = PACHT.freiflaecheProHa.mittel * BSP_HA;

const artikel = {
  slug: "photovoltaik-landwirt-steuern",
  title: "Photovoltaik für Landwirte: Steuern bei Pacht und eigener Anlage",
  seoTitle: "Photovoltaik Landwirt Steuern 2026 | ÖkoInvest",
  kurzTitel: "Steuern für Landwirte mit PV",
  description:
    "Photovoltaik und Steuern für Landwirte: Pacht im Betriebsvermögen, eigene Anlage als Gewerbe, Umsatzsteuer, Gewerbesteuer, stille Reserven und § 13a erklärt.",
  excerpt:
    "Verpachten oder selbst betreiben? Welche Einkunftsart entsteht, warum Strom nie Landwirtschaft ist, was die Umsatzsteuer-Pauschalierung nicht abdeckt – und wo die teure Falle der Entnahme lauert.",
  hauptKeyword: "photovoltaik landwirt steuern",
  keywords: [
    "PV-Pacht Landwirt Einkommensteuer",
    "Photovoltaik Landwirtschaft Gewerbebetrieb",
    "R 15.5 EStR Energieerzeugung",
    "Umsatzsteuer Pacht Solarpark Landwirt",
    "§ 24 UStG Photovoltaik",
    "Entnahme Grund und Boden Solarpark",
    "§ 13a EStG Pachteinnahmen",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Agri-PV & Landwirtschaft",
  bild: "/img/planer-tablet.jpg",
  bildAlt: "Ingenieur mit weißem Schutzhelm prüft Unterlagen auf einem Tablet vor den Modulreihen eines Solarparks",
  badge: { wert: "§ 15 EStG", text: "Stromerzeugung ist steuerlich immer Gewerbe" },

  kurzFazit: [
    "**Verpachtet ein Landwirt eine Fläche an einen Solarparkbetreiber, bleibt sie ertragsteuerlich in der Regel Betriebsvermögen – die Pacht ist dann Einnahme aus Land- und Forstwirtschaft.** Eine Zwangsentnahme mit Versteuerung der stillen Reserven droht meist nicht, sollte aber vorab geprüft werden.",
    "**Betreibt der Landwirt die Anlage selbst, ist das ein Gewerbebetrieb** (R 15.5 Abs. 12 EStR). Die Drittel- und 51.500-€-Grenze für landwirtschaftsnahe Nebentätigkeiten hilft bei Strom nicht.",
    "**Die Flächenpacht ist grundsätzlich umsatzsteuerfrei** (§ 4 Nr. 12 UStG). Die Durchschnittssatzbesteuerung nach § 24 UStG erfasst weder Pacht noch Stromverkauf, noch Pflegedienstleistungen für den Betreiber.",
    `Bei eigener Anlage fällt Gewerbesteuer an; für Einzelunternehmer und Personengesellschaften gilt ein Freibetrag von ${fmtEur(GEWST_FREIBETRAG)}, und die Gewerbesteuer wird bis zum ${fmt(ANRECHNUNG_FAKTOR, 1)}-Fachen des Messbetrags auf die Einkommensteuer angerechnet.`,
    "Die größte Steuerlast liegt oft nicht bei der Einkommensteuer, sondern bei **Erbschaft- und Grundsteuer**. Lassen Sie jede Gestaltung vor der Unterschrift steuerlich prüfen.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Wie werden Photovoltaik-Einnahmen bei Landwirten besteuert?",
      tocLabel: "Überblick",
      bloecke: [
        {
          typ: "p",
          text: "**Das hängt davon ab, ob Sie Fläche verpachten, selbst eine Anlage betreiben oder sich an einer Betreibergesellschaft beteiligen – jeder Weg führt zu einer anderen Einkunftsart und anderen Folgen bei Umsatz- und Gewerbesteuer.** Die folgende Übersicht fasst die Grundregeln für Deutschland zusammen. Sie ersetzt keine Steuerberatung, zeigt aber, welche Fragen Sie Ihrem Berater stellen sollten.",
        },
        {
          typ: "tabelle",
          caption: `Steuerliche Einordnung der drei Wege für Landwirte, Deutschland, Stand ${STAND}`,
          kopf: ["", "Fläche verpachten", "Eigene Anlage betreiben", "Beteiligung an Betreibergesellschaft"],
          zeilen: [
            ["Einkunftsart", "Land- und Forstwirtschaft (§ 13), wenn Fläche Betriebsvermögen bleibt; sonst Vermietung und Verpachtung (§ 21)", "Gewerbebetrieb (§ 15), eigener Betrieb neben dem Hof", "Gewerbebetrieb als Mitunternehmer (z. B. GmbH & Co. KG) oder Kapitalvermögen (z. B. Genossenschaft)"],
            ["Umsatzsteuer", "Pacht steuerfrei (§ 4 Nr. 12), Option möglich (§ 9)", "Regelbesteuerung, Vorsteuerabzug aus der Investition", "auf Ebene der Gesellschaft"],
            ["Gewerbesteuer", "keine", "ja, Freibetrag und Anrechnung auf Einkommensteuer", "bei der Gesellschaft"],
            ["Erbschaftsteuer", "Fläche wird in der Regel Grundvermögen – keine Agrarverschonung", "Anlage kann begünstigtes Betriebsvermögen sein", "Anteil kann begünstigtes Betriebsvermögen sein"],
            ["Aufwand", "gering", "hoch: Buchführung, Direktvermarktung, Risiko", "mittel"],
          ],
          hervorheben: 1,
          minBreite: 780,
          fussnote: "Vereinfachte Darstellung ohne Sonderfälle (Mitunternehmerschaften, Betriebsaufspaltung, Organschaft). Zur Erbschaftsteuer siehe den verlinkten Ratgeber.",
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Keine Steuerberatung",
          text: "Dieser Beitrag gibt die Rechtslage und die Verwaltungsauffassung nach aktuellem Stand (September 2026) allgemein wieder. Steuerliche Folgen hängen stark vom Einzelfall ab – von Gewinnermittlungsart, Rechtsform, Hofübergabeplänen und Flächenanteil. Binden Sie eine auf Landwirtschaft spezialisierte Steuerberatung ein, bevor Sie einen Pacht- oder Gesellschaftsvertrag unterschreiben.",
        },
      ],
    },
    {
      id: "verpachtung",
      titel: "Fläche verpachten: Einnahmen aus Land- und Forstwirtschaft oder aus Vermietung?",
      tocLabel: "Einkommensteuer auf die Pacht",
      bloecke: [
        {
          typ: "p",
          text: "**Gehört die verpachtete Fläche zum landwirtschaftlichen Betriebsvermögen und bleibt sie dort, ist die Pacht eine Betriebseinnahme Ihres land- und forstwirtschaftlichen Betriebs (§ 13 EStG).** Nach Einschätzung von Steuerberatern aus der Agrarpraxis findet dabei in der Regel keine Zwangsentnahme statt: Die Fläche kann Betriebsvermögen bleiben, obwohl darauf 30 Jahre lang ein Solarpark steht. Ist die Fläche dagegen Privatvermögen – etwa, weil sie nie zum Betrieb gehörte oder bereits entnommen wurde –, erzielen Sie Einkünfte aus Vermietung und Verpachtung (§ 21 EStG).",
        },
        {
          typ: "p",
          text: `Eine Grenze nennen Praxisbeiträge beim Flächenanteil: Macht die an einen Solarpark verpachtete Fläche mehr als etwa ${fmtPct(GEDULDET_ANTEIL, 0)} der Betriebsfläche aus, kann sie nach dieser Auffassung nur noch als sogenanntes geduldetes Betriebsvermögen im Betrieb bleiben. Das ist kein Automatismus zur Entnahme, erhöht aber das Risiko, dass das Finanzamt die Zuordnung anders sieht. Dokumentieren Sie deshalb, dass die Fläche nach Vertragsende wieder landwirtschaftlich genutzt werden soll und im Betrieb bleiben soll.`,
        },
        {
          typ: "p",
          text: `Die Pacht erhöht Ihr zu versteuerndes Einkommen voll. Bei ${fmt(BSP_HA)} ha und einer Pacht von ${fmt(PACHT.freiflaecheProHa.mittel)} € je Hektar kommen ${fmtEur(PACHT_BSP)} im Jahr hinzu – im Vergleich zur Ackerpacht von rund ${fmt(PACHT.ackerProHa)} € je Hektar ein spürbarer Sprung in der Progression. Einmalzahlungen wie ein Reservierungsentgelt oder eine Vorauszahlung für mehrere Jahre können unter bestimmten Voraussetzungen auf die Laufzeit verteilt werden (bei Überschussrechnung nach § 11 EStG, bei Bilanzierung über einen passiven Rechnungsabgrenzungsposten). Wie hoch die Pacht realistisch ist, zeigt der [Pachtrechner](/rechner/pacht).`,
        },
      ],
    },
    {
      id: "entnahme",
      titel: "Die teure Falle: Entnahme der Fläche und stille Reserven",
      tocLabel: "Entnahme und stille Reserven",
      bloecke: [
        {
          typ: "p",
          text: "**Wird eine Fläche aus dem Betriebsvermögen entnommen, müssen Sie die Differenz zwischen Teilwert und Buchwert als Gewinn versteuern – ohne dass Geld zufließt.** Bei Grund und Boden, der schon lange zum Betrieb gehört, ist der Buchwert oft niedrig. Der Teilwert einer Fläche mit Solarpark-Nutzungsrecht kann dagegen deutlich über dem Wert von Ackerland liegen.",
        },
        {
          typ: "kennzahl",
          wert: fmtEur(STILLE_RESERVE),
          titel: `stille Reserve auf ${fmt(BSP_HA)} ha in einer reinen Modellrechnung`,
          text: `Angenommen: Buchwert ${fmtEur(BUCHWERT_HA)} je ha, Teilwert ${fmtEur(TEILWERT_HA)} je ha. Die Werte sind frei gewählt und keine Marktangabe – sie zeigen nur die Größenordnung des Problems.`,
        },
        {
          typ: "p",
          text: "Eine Entnahme kann durch eine ausdrückliche Entnahmehandlung ausgelöst werden – etwa, wenn die Fläche als Privatvermögen in eine Schenkung oder Hofübergabe eingebracht wird –, aber auch, wenn der Betrieb aufgegeben wird. Bei einer Veräußerung der Fläche können stille Reserven unter Umständen nach § 6b EStG auf Ersatzwirtschaftsgüter übertragen werden; bei einer Entnahme gibt es diese Möglichkeit nicht.",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Keine Entnahme erklären**, ohne die Folgen berechnet zu haben – auch nicht „nebenbei“ in einem Übergabevertrag.",
            "**Buchwert kennen:** Für Grund und Boden, der schon am 1. Juli 1970 zum Betrieb gehörte, gelten pauschalierte Werte nach § 55 EStG.",
            "**Betreiben Sie die Anlage selbst**, wird die Fläche in der Regel zum Buchwert in das gewerbliche Betriebsvermögen überführt (§ 6 Abs. 5 EStG) – auch hier vorher prüfen lassen.",
            "**Betriebsaufgabe und Hofübergabe** gemeinsam mit der Pachtentscheidung planen.",
          ],
        },
      ],
    },
    {
      id: "eigene-anlage",
      titel: "Eigene PV-Anlage: Warum Strom nie Landwirtschaft ist",
      tocLabel: "Eigene Anlage als Gewerbe",
      bloecke: [
        {
          typ: "p",
          text: "**Wer als Landwirt selbst eine Photovoltaikanlage betreibt und den Strom verkauft, erzielt Einkünfte aus Gewerbebetrieb.** R 15.5 Abs. 12 der Einkommensteuer-Richtlinien stellt klar: Die Erzeugung von Energie durch Wind, Sonne oder Wasser ist keine planmäßige Nutzung der natürlichen Kräfte des Bodens, der Absatz von Strom und Wärme führt zu gewerblichen Einkünften. Nur die Erzeugung von Biogas kann unter Umständen ein landwirtschaftlicher [Nebenbetrieb](/wissen/lexikon#nebenbetrieb-landwirtschaft) sein – die Verstromung ist es wiederum nicht.",
        },
        {
          typ: "p",
          text: `Die bekannte Regel, dass gewerbliche Nebentätigkeiten noch zur Landwirtschaft zählen, wenn ihre Umsätze dauerhaft höchstens ${fmtPct(R155_DRITTEL, 0)} des Gesamtumsatzes und höchstens ${fmtEur(R155_GRENZE_EUR)} im Wirtschaftsjahr betragen (R 15.5 Abs. 11 EStR), gilt für Direktvermarktung, Dienstleistungen und den Einsatz von Maschinen für Dritte (Absätze 3 bis 10). Zusammen dürfen solche Umsätze höchstens ${fmtPct(R155_GESAMT_MAX, 0)} des Gesamtumsatzes ausmachen. **Die Stromerzeugung ist davon nicht erfasst** – auch eine kleine Freiflächenanlage bleibt ein eigener Gewerbebetrieb neben dem Hof.`,
        },
        {
          typ: "tabelle",
          caption: `Abgrenzung nach R 15.5 EStR: Was bleibt Landwirtschaft, was wird Gewerbe? Stand ${STAND}`,
          kopf: ["Tätigkeit", "Einordnung", "Grundlage"],
          zeilen: [
            ["Stromverkauf aus eigener Freiflächen- oder Agri-PV-Anlage", "**immer Gewerbebetrieb**", "R 15.5 Abs. 12 EStR"],
            ["Biogaserzeugung aus überwiegend eigenen Rohstoffen", "kann landwirtschaftlicher Nebenbetrieb sein", "R 15.5 Abs. 3 und 12 EStR"],
            ["Grünpflege oder Beweidung für den Solarparkbetreiber", `Dienstleistung; kann bei funktionalem Bezug zur Landwirtschaft innerhalb der Grenzen (${fmtPct(R155_DRITTEL, 0)}, ${fmtEur(R155_GRENZE_EUR)}) noch Landwirtschaft sein`, "R 15.5 Abs. 10 und 11 EStR"],
            ["Maschineneinsatz für den Betreiber (z. B. Mulchen, Winterdienst)", "gewerblich, unter den Grenzen und bei mind. 10 % Eigennutzung der Maschine noch Landwirtschaft", "R 15.5 Abs. 9 und 11 EStR"],
            ["Verpachtung der Fläche", "keine gewerbliche Tätigkeit; Land- und Forstwirtschaft oder Vermietung", "§§ 13, 21 EStG"],
            [`Dachanlage bis ${KWP_GRENZE_KLEIN} kWp je Einheit (max. ${KWP_GRENZE_STPFL} kWp)`, "ertragsteuerfrei", "§ 3 Nr. 72 EStG – gilt nur für Gebäudeanlagen"],
          ],
          hervorheben: 1,
          minBreite: 720,
          fussnote: "Die Grenzen nach R 15.5 Abs. 11 EStR müssen dauerhaft eingehalten werden; bei Überschreiten entsteht nach den Regeln des Strukturwandels ein Gewerbebetrieb. Der landwirtschaftliche Betrieb daneben bleibt unberührt.",
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Vorsicht bei Personengesellschaften: Abfärbung",
          text: "Wird der Hof als GbR oder KG geführt und betreibt dieselbe Gesellschaft die PV-Anlage, können die gewerblichen Einkünfte nach § 15 Abs. 3 Nr. 1 EStG auf die gesamte Gesellschaft abfärben – dann wäre auch die Landwirtschaft gewerblich. Die Rechtsprechung lässt geringfügige gewerbliche Umsätze unberücksichtigt, eine Freiflächenanlage liegt aber schnell darüber. In der Praxis wird die Anlage deshalb meist in einer eigenen Gesellschaft betrieben.",
        },
      ],
    },
    {
      id: "umsatzsteuer",
      titel: "Umsatzsteuer: Pacht, Pauschalierung und Nullsteuersatz",
      tocLabel: "Umsatzsteuer",
      bloecke: [
        {
          typ: "p",
          text: "**Die Verpachtung einer Fläche an einen Solarparkbetreiber ist grundsätzlich umsatzsteuerfrei (§ 4 Nr. 12 Buchst. a UStG).** Sie können auf die Steuerbefreiung verzichten (Option nach § 9 UStG), wenn der Pächter ein Unternehmer ist und die Fläche für steuerpflichtige Umsätze nutzt – das ist beim Solarpark der Fall. Sinnvoll ist die Option nur, wenn Sie selbst nennenswerte Vorsteuer aus Kosten für die Fläche ziehen wollen; sie muss dann im Pachtvertrag geregelt sein, und die Pacht versteht sich zuzüglich Umsatzsteuer.",
        },
        {
          typ: "p",
          text: `**Die Durchschnittssatzbesteuerung nach § 24 UStG gilt nur für Umsätze im Rahmen des land- und forstwirtschaftlichen Betriebs** – derzeit mit einem allgemeinen Satz von ${fmtPct(UST24_SATZ)} und nur, wenn der Gesamtumsatz im Vorjahr ${fmtEur(UST24_GRENZE_EUR)} nicht überstiegen hat. Weder die Flächenpacht noch der Stromverkauf aus einer eigenen Anlage noch Pflege- und Maschinendienstleistungen für den Betreiber fallen darunter. Für den Stromverkauf gilt die Regelbesteuerung mit 19 %, im Gegenzug können Sie die Vorsteuer aus der Investition ziehen.`,
        },
        {
          typ: "tabelle",
          caption: `Umsatzsteuer auf typische PV-Umsätze eines Landwirts, Stand ${STAND}`,
          kopf: ["Umsatz", "Umsatzsteuer", "Hinweis"],
          zeilen: [
            ["Pacht für die Solarparkfläche", "steuerfrei (§ 4 Nr. 12a UStG)", "Option zur Steuerpflicht nach § 9 UStG möglich"],
            ["Nutzungsentgelt bei Agri-PV mit fortgesetzter eigener Bewirtschaftung", "nach einer in der Beratungspraxis vertretenen Auffassung steuerpflichtig", "wenn der Vertrag mehr ist als eine bloße Grundstücksüberlassung – Einzelfall prüfen"],
            ["Stromverkauf aus eigener Anlage", "19 %, Regelbesteuerung", "kein Durchschnittssatz nach § 24 UStG"],
            ["Beweidung, Mahd, Winterdienst für den Betreiber", "in der Regel 19 %", "Dienstleistung außerhalb der Pauschalierung"],
            [`Kauf einer Dachanlage bis ${KWP_GRENZE_KLEIN} kWp auf dem Wohnhaus`, "0 % (§ 12 Abs. 3 UStG)", "gilt nicht für Freiflächenanlagen"],
            ["Landwirtschaftliche Erzeugnisse", `${fmtPct(UST24_SATZ)} Durchschnittssatz`, `nur bis ${fmtEur(UST24_GRENZE_EUR)} Vorjahresumsatz`],
          ],
          hervorheben: 1,
          minBreite: 700,
          fussnote: "Vereinfachte Übersicht. Die Einordnung des Nutzungsentgelts bei Agri-PV ist in der Praxis umstritten; klären Sie sie vor Vertragsschluss mit Ihrer Steuerberatung oder über eine verbindliche Auskunft.",
        },
      ],
    },
    {
      id: "gewerbesteuer",
      titel: "Gewerbesteuer bei eigener Anlage: Freibetrag und Anrechnung",
      tocLabel: "Gewerbesteuer",
      bloecke: [
        {
          typ: "p",
          text: `**Die reine Verpachtung löst keine Gewerbesteuer aus; die eigene Anlage schon.** Für natürliche Personen und Personengesellschaften mindert ein Freibetrag von ${fmtEur(GEWST_FREIBETRAG)} den Gewerbeertrag (§ 11 GewStG). Die Gewerbesteuer wird anschließend bis zum ${fmt(ANRECHNUNG_FAKTOR, 1)}-Fachen des Messbetrags auf die Einkommensteuer angerechnet (§ 35 EStG). Bei einem Hebesatz um ${fmtPct(KOMMUNE.hebesatz, 0)} gleicht sich das weitgehend aus.`,
        },
        {
          typ: "p",
          text: `Ein Rechenbeispiel: Ein Einzelunternehmer erzielt mit seiner Anlage ${fmtEur(GEWINN_BSP)} Gewinn. Nach Abzug des Freibetrags ergibt sich bei ${fmtPct(KOMMUNE.messzahl)} Steuermesszahl ein Messbetrag von ${fmtEur(MESSBETRAG)}, bei ${fmtPct(KOMMUNE.hebesatz, 0)} Hebesatz eine Gewerbesteuer von ${fmtEur(GEWST)}. Angerechnet werden bis zu ${fmtEur(ANRECHNUNG)} – vorausgesetzt, die tarifliche Einkommensteuer auf die gewerblichen Einkünfte reicht dafür aus. Bei höheren Hebesätzen bleibt ein Rest. Die Gewerbesteuer fließt nach § 29 GewStG zu ${fmtPct(KOMMUNE.gewerbesteuerStandort, 0)} an die Standortgemeinde – ein Argument, das im Gemeinderat zählt, wie die Seite für [Kommunen](/kommunen) zeigt.`,
        },
        {
          typ: "p",
          text: `Eine Befreiung gibt es nur für kleine Gebäudeanlagen bis ${KWP_GRENZE_KLEIN} kW (§ 3 Nr. 32 GewStG), nicht für Freiflächen- oder Agri-PV-Anlagen.`,
        },
      ],
    },
    {
      id: "13a",
      titel: "Durchschnittssatzgewinn nach § 13a EStG: Was mit Pacht und Sondergewinnen passiert",
      tocLabel: "§ 13a EStG",
      bloecke: [
        {
          typ: "p",
          text: `**Landwirte, die ihren Gewinn nach Durchschnittssätzen ermitteln, müssen Pachteinnahmen aus Wirtschaftsgütern des Betriebsvermögens zusätzlich zum Grundbetrag ansetzen (§ 13a Abs. 3 EStG).** Hohe PV-Pachten sind also nicht mit dem pauschalen Gewinn abgegolten. Die Gewinnermittlung nach § 13a setzt unter anderem voraus, dass die selbst bewirtschaftete landwirtschaftliche Fläche ${fmt(P13A_HA)} ha ohne Sondernutzungen nicht übersteigt und keine Buchführungspflicht besteht.`,
        },
        {
          typ: "p",
          text: `Als Sondergewinne sind außerdem Gewinne aus der Veräußerung oder Entnahme von Grund und Boden und von Anlagegütern mit einem Erlös über ${fmtEur(P13A_ANLAGEGUT_EUR)} zu erfassen (§ 13a Abs. 7 EStG). Eine Entnahme der Solarpark-Fläche schlägt deshalb auch bei § 13a-Betrieben voll durch. Und Zusatzleistungen an den Betreiber – etwa Pflege oder Maschineneinsatz – sind nach Hinweisen aus der Beratungspraxis nicht automatisch mit dem Grundbetrag abgegolten. Die eigene PV-Anlage ist ohnehin ein getrennter Gewerbebetrieb außerhalb von § 13a.`,
        },
      ],
    },
    {
      id: "erbschaft",
      titel: "Erbschaft- und Grundsteuer: Oft der größere Posten",
      tocLabel: "Erbschaft- und Grundsteuer",
      bloecke: [
        {
          typ: "p",
          text: "**Ertragsteuerlich bleibt die verpachtete Fläche meist im Betrieb, erbschaft- und grundsteuerlich wird sie in der Regel zum Grundvermögen.** Der Grund: Das Bewertungsgesetz stellt auf die tatsächliche Nutzung zur Pflanzen- und Tiererzeugung ab. Eine Fläche unter einem klassischen Solarpark fällt deshalb nach Verwaltungsauffassung aus dem land- und forstwirtschaftlichen Vermögen – mit der Folge, dass die Verschonung für [land- und forstwirtschaftliches Vermögen](/wissen/lexikon#landwirtschaftliches-vermoegen) entfällt und statt Grundsteuer A die Grundsteuer B gilt. Nach einer begünstigten Hofübergabe kann eine anschließende Verpachtung an einen Solarpark zudem als schädliche Verwendung gewertet werden.",
        },
        {
          typ: "p",
          text: "Die Details, die Rolle des Jahressteuergesetzes 2024 und die Sonderstellung der Agri-PV erklärt der Ratgeber [Erbschaft- und Grundsteuer bei PV-Pacht](/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer). Bei Agri-PV, die nach DIN SPEC 91434 und GAP-Recht als landwirtschaftliche Hauptnutzung anerkannt ist, sieht die Lage günstiger aus – siehe [Agri-PV Förderung und GAP](/ratgeber/agri-pv-foerderung-gap).",
        },
      ],
    },
    {
      id: "beteiligung",
      titel: "Alternative Beteiligung: Wenn Sie nicht verpachten, sondern mitinvestieren",
      tocLabel: "Beteiligung",
      bloecke: [
        {
          typ: "p",
          text: "**Statt nur zu verpachten, können Landwirte sich an der Betreibergesellschaft beteiligen – steuerlich ist das ein eigener Weg mit eigenen Chancen.** Als Kommanditist einer gewerblichen GmbH & Co. KG erzielen Sie Einkünfte aus Gewerbebetrieb; die Gewerbesteuer trägt die Gesellschaft, Ihre Einkommensteuer wird über § 35 EStG entlastet. Ein Gesellschaftsanteil kann bei der Erbschaftsteuer begünstigtes Betriebsvermögen sein, während die verpachtete Fläche selbst in der Regel nicht begünstigt ist. Mitglieder einer Energiegenossenschaft erhalten Dividenden als Kapitalerträge.",
        },
        {
          typ: "p",
          text: `Im [Agri-PV-Rechner](/rechner/agri-pv) können Sie die Wege Verpachten, Selbstinvestieren und Beteiligen vergleichen – mit einem Anteil von ${fmtPct(AGRI.beteiligungAnteil.min, 0)} bis ${fmtPct(AGRI.beteiligungAnteil.max, 0)}. Wie eine Genossenschaftslösung aussehen kann, zeigt die Seite [Genossenschaft](/genossenschaft), die Zielgruppenseite [Landwirte](/landwirte) fasst alle Wege zusammen.`,
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So gehen Sie steuerlich sicher vor",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Ausgangslage klären", "Gehört die Fläche zum Betriebsvermögen? Welche Gewinnermittlungsart, welche Rechtsform, welcher Buchwert? Steht eine Hofübergabe an?"],
            ["Wege vergleichen", "Pacht, eigene Anlage und Beteiligung nach Steuern gegenüberstellen – nicht nur die Bruttopacht. Den Pachtvertrag selbst erläutert der Ratgeber [Pachtvertrag Solarpark](/ratgeber/pachtvertrag-solarpark)."],
            ["Umsatzsteuer im Vertrag regeln", "Option ja oder nein, Nettopacht oder Bruttopacht, Behandlung von Zusatzleistungen wie Pflege oder [Beweidung](/ratgeber/solarpark-beweidung-schafe)."],
            ["Entnahme vermeiden", "Keine Erklärungen abgeben, die als Entnahme gewertet werden könnten; Nutzung nach Vertragsende dokumentieren."],
            ["Grundbuch und Steuer zusammen denken", "Die [Dienstbarkeit](/ratgeber/dienstbarkeit-grundbuch-pv-pacht) belastet das Grundstück über die Laufzeit – auch das wirkt sich auf Bewertung und Übergabe aus."],
            ["Verbindliche Auskunft erwägen", "Bei großen Flächen oder unklarer Einordnung kann eine verbindliche Auskunft des Finanzamts Sicherheit schaffen."],
          ],
        },
        {
          typ: "tool",
          href: "/rechner/pacht",
          titel: "Pacht über die Laufzeit berechnen",
          text: "Grundlage für jede Steuerplanung: Jahres- und Gesamtpacht mit Ihren Werten.",
          label: "Zum Pachtrechner",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Muss ich als Landwirt die Solarpark-Pacht versteuern?",
      a: "Ja. Gehört die Fläche zum Betriebsvermögen, ist die Pacht eine Einnahme aus Land- und Forstwirtschaft; ist sie Privatvermögen, erzielen Sie Einkünfte aus Vermietung und Verpachtung. In beiden Fällen unterliegt sie der Einkommensteuer.",
    },
    {
      q: "Wird die Fläche durch die Verpachtung an einen Solarpark entnommen?",
      a: `In der Regel nicht. Nach Einschätzung von Beratern aus der Agrarpraxis kann die Fläche Betriebsvermögen bleiben. Bei einem Anteil von mehr als etwa ${fmtPct(GEDULDET_ANTEIL, 0)} der Betriebsfläche sollten Sie die Zuordnung besonders sorgfältig prüfen lassen.`,
    },
    {
      q: "Ist eine eigene PV-Anlage auf dem Acker Teil meines landwirtschaftlichen Betriebs?",
      a: "Nein. Nach R 15.5 Abs. 12 EStR ist die Stromerzeugung aus Sonne, Wind oder Wasser immer ein Gewerbebetrieb. Die Drittel- und 51.500-€-Grenze für Nebentätigkeiten gilt dafür nicht.",
    },
    {
      q: "Muss ich auf die Pacht Umsatzsteuer berechnen?",
      a: "Grundsätzlich nicht, die Grundstücksverpachtung ist nach § 4 Nr. 12 UStG steuerfrei. Sie können auf die Befreiung verzichten, wenn der Betreiber die Fläche für steuerpflichtige Umsätze nutzt. Die Durchschnittssatzbesteuerung nach § 24 UStG gilt für die Pacht nicht.",
    },
    {
      q: "Zahle ich mit einer eigenen Anlage Gewerbesteuer?",
      a: `Ja, soweit der Gewerbeertrag den Freibetrag von ${fmtEur(GEWST_FREIBETRAG)} übersteigt. Die Gewerbesteuer wird aber bis zum ${fmt(ANRECHNUNG_FAKTOR, 1)}-Fachen des Messbetrags auf die Einkommensteuer angerechnet, sodass sie bei üblichen Hebesätzen weitgehend neutral ist.`,
    },
    {
      q: "Was gilt bei Gewinnermittlung nach § 13a EStG?",
      a: "Pachteinnahmen aus Wirtschaftsgütern des Betriebsvermögens sind zusätzlich zum Grundbetrag anzusetzen, Entnahme- und Veräußerungsgewinne aus Grund und Boden als Sondergewinne. Hohe PV-Pachten sind also nicht mit dem pauschalen Gewinn abgegolten.",
    },
    {
      q: "Welche Steuer wird bei PV-Pacht am häufigsten unterschätzt?",
      a: "Meist die Erbschaft- und Schenkungsteuer, weil die Fläche aus dem land- und forstwirtschaftlichen Vermögen fallen kann. Mehr dazu unter [Erbschaft- und Grundsteuer bei PV-Pacht](/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer).",
    },
  ],

  passend: [
    { href: "/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer", titel: "Erbschaft- und Grundsteuer bei PV-Pacht", text: "Warum die Fläche zu Grundvermögen werden kann." },
    { href: "/ratgeber/agri-pv-wirtschaftlichkeit", titel: "Agri-PV Wirtschaftlichkeit", text: "Kosten, Erlöse und Rendite ehrlich gerechnet." },
    { href: "/rechner/agri-pv", titel: "Agri-PV-Rechner", text: "Verpachten, investieren oder beteiligen im Vergleich." },
    { href: "/landwirte", titel: "Für Landwirte", text: "Alle Wege zu Solarpark und Agri-PV." },
  ],

  quellen: [
    { titel: "BMF – Amtliches Einkommensteuer-Handbuch 2024, R 15.5 EStR (Abgrenzung des Gewerbebetriebs von der Land- und Forstwirtschaft)", url: "https://ao.bundesfinanzministerium.de/esth/2024/A-Einkommensteuergesetz/II-Einkommen-2-24b/8-Die-einzelnen-Einkunftsarten-13-24b/b-Gewerbebetrieb-15-17/Paragraf-15/r-15-5.html", stand: "09/2026" },
    { titel: "EStG § 13a – Ermittlung des Gewinns aus Land- und Forstwirtschaft nach Durchschnittssätzen", url: "https://www.gesetze-im-internet.de/estg/__13a.html", stand: "09/2026" },
    { titel: "UStG § 4 – Steuerbefreiungen (Nr. 12, Vermietung und Verpachtung von Grundstücken)", url: "https://www.gesetze-im-internet.de/ustg_1980/__4.html", stand: "09/2026" },
    { titel: "UStG § 24 – Durchschnittssätze für land- und forstwirtschaftliche Betriebe", url: "https://www.gesetze-im-internet.de/ustg_1980/__24.html", stand: "09/2026" },
    { titel: "UStG § 12 – Steuersätze (Abs. 3, Nullsteuersatz für Photovoltaikanlagen)", url: "https://www.gesetze-im-internet.de/ustg_1980/__12.html", stand: "09/2026" },
    { titel: "GewStG § 11 – Steuermesszahl und Steuermessbetrag (Freibetrag)", url: "https://www.gesetze-im-internet.de/gewstg/__11.html", stand: "09/2026" },
    { titel: "Land & Forst – Freiflächen-Photovoltaik: Vorsicht bei den steuerlichen Folgen! (T. Högemann, aktualisiert 06.05.2024)", url: "https://www.landundforst.de/landwirtschaft/betrieb/freiflaechen-photovoltaik-vorsicht-steuerlichen-folgen-569264", stand: "09/2026" },
    { titel: "Land & Forst – Steuerliche Tücken von Solarparks: so vermeiden Sie Fallstricke (21.03.2022)", url: "https://www.landundforst.de/landwirtschaft/betrieb/steuerliche-tuecken-solarparks-so-vermeiden-fallstricke-567077", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Verpachten oder selbst investieren?",
    text: "Die drei Wege für Ihre Fläche im direkten Vergleich.",
    href: "/rechner/agri-pv",
    label: "Zum Agri-PV-Rechner",
  },
  cta: {
    title: "Erst die Fläche prüfen, dann die Steuer planen.",
    text: "Im Flächencheck prüfen wir Lage, Netzanschluss und Planungsrecht Ihrer Fläche – für Flächeneigentümer und Landwirte kostenfrei.",
    primary: { label: "Zum Flächencheck", href: "/flaechencheck" },
    secondary: { label: "Fläche verpachten", href: "/flaeche-verpachten" },
  },
};

export default artikel;
