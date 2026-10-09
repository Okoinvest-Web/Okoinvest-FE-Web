// Ratgeber: Energy Sharing & Energiegemeinschaften im DACH-Raum
// Rechtsstand September 2026. Deutschland: § 42c EnWG (gilt ab 1. Juni 2026),
// § 3 Nr. 15 EEG 2023 (Bürgerenergiegesellschaft). Österreich: ElWG §§ 65–72
// (Bürgerenergie, in Kraft ab 1. Oktober 2026), SNE-VO-Novelle ab 1. Jänner 2027.
// Schweiz: StromVG/StromVV (LEG seit 1. Januar 2026), EnV (ZEV/vZEV).
// Gewerbliche Strompreisbestandteile aus @/lib/invest/markt (STROM.bestandteile).

import { GEMEINSCHAFTEN, STROM, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtCt } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* ------------------------------------------------------------------ */
/* Werte, die (noch) nicht in markt.js stehen – mit Quelle             */
/* ------------------------------------------------------------------ */

// § 42c EnWG: Stichtage und Größengrenzen (gesetze-im-internet.de, abgerufen 09/2026)
const ENWG_42C = {
  start: "1. Juni 2026",
  erweiterung: "1. Juni 2028",
  grenzeHaushaltKw: 30,
  grenzeMehrparteienKw: 100,
};

// Österreich: Netzentgeltreduktion für EEG nach bisheriger SNE-VO (Arbeitspreis
// Netznutzung; Koordinationsstelle Energiegemeinschaften / Netzbetreiber-Infos).
// Ab 1.1.2027 legt die novellierte SNE-VO die Sätze neu fest.
const AT_EEG_REDUKTION = { lokal: 0.57, regionalNe67: 0.28, regionalNe45: 0.64 };
// Österreichische Koordinationsstelle für Energiegemeinschaften, Regionaltreffen 2026 (Folien)
const AT_ZAEHLPUNKTE = 500000;
const AT_MODELLE = 12000;
// Österreich: max. Anzahl gleichzeitiger Teilnahmen je Zählpunkt (Mehrfachteilnahme)
const AT_MEHRFACH = 5;
// ElWG: Obergrenze Erzeugungs-/Speicherleistung für große Unternehmen in gemeinsamer Energienutzung
const AT_GROSS_MW = 6;

// Schweiz: Abschlag Netznutzungstarif LEG (Art. 19h StromVV; BFE, Erläuterungen)
const CH_LEG = { eineEbene: 0.4, mehrereEbenen: 0.2, minProduktion: 0.05 };
// Schweiz: ZEV/vZEV – Produktionsleistung mind. 10 % der Anschlussleistung (EnV)
const CH_ZEV_MIN = 0.1;

/* ------------------------------------------------------------------ */
/* Rechenbeispiel: KMU in Deutschland bezieht geteilten Solarstrom      */
/* ------------------------------------------------------------------ */

const bestandteil = (id) => STROM.bestandteile.find((b) => b.id === id).ct;
const GESAMT_CT = STROM.bestandteile.reduce((s, b) => s + b.ct, 0);
const FIX_CT = STROM.bestandteile.filter((b) => !b.beeinflussbar).reduce((s, b) => s + b.ct, 0);
const BESCHAFFUNG_CT = bestandteil("beschaffung");
// ANNAHME für das Beispiel (kein Marktwert): vereinbarter Energiepreis des geteilten Solarstroms
const SHARING_PREIS_CT = 8.0;
const VERBRAUCH_KWH = 40000;
const SHARING_ANTEIL = 0.25;
const GETEILT_KWH = VERBRAUCH_KWH * SHARING_ANTEIL;
const ERSPARNIS_EUR = (GETEILT_KWH * (BESCHAFFUNG_CT - SHARING_PREIS_CT)) / 100;
const pct = (n) => `${fmt(n * 100)} %`;

const artikel = {
  slug: "energy-sharing-energiegemeinschaften",
  title: "Energy Sharing und Energiegemeinschaften: DE, AT und CH im Vergleich",
  seoTitle: "Energy Sharing & Energiegemeinschaften DACH | ÖkoInvest",
  kurzTitel: "Energy Sharing & Energiegemeinschaften",
  description:
    "Energy Sharing nach § 42c EnWG, Energiegemeinschaften in Österreich, LEG in der Schweiz: Regeln, Netzentgelte, Rollen und Grenzen im DACH-Vergleich, Stand 2026.",
  excerpt:
    "Seit Juni 2026 dürfen in Deutschland Nachbarn Solarstrom über das öffentliche Netz teilen. Österreich ist mit Hunderttausenden Teilnehmern weiter, die Schweiz startet mit der LEG. Was gilt wo – und was bringt es wirtschaftlich?",
  hauptKeyword: "energy sharing",
  keywords: [
    "Energy Sharing",
    "§ 42c EnWG",
    "Energiegemeinschaft",
    "Erneuerbare-Energie-Gemeinschaft Österreich",
    "Bürgerenergiegemeinschaft",
    "lokale Elektrizitätsgemeinschaft LEG",
    "vZEV Schweiz",
    "Strom mit Nachbarn teilen",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-10-03", // Rechtsstand nachgeprüft (Welle 1, Paket G)
  kategorie: "Strom, Markt & Gemeinschaft",
  bild: "/img/gewerbedach.jpg",
  bildAlt: "Techniker mit Funkgerät auf einem Flachdach mit Solarmodulen, im Hintergrund Wohnhäuser und Gewerbehallen",
  badge: { wert: `ab ${ENWG_42C.start}`, text: "Energy Sharing nach § 42c EnWG in Deutschland" },

  kurzFazit: [
    `**Deutschland:** Energy Sharing nach § 42c EnWG gilt seit dem **${ENWG_42C.start}** innerhalb des Bilanzierungsgebiets eines Verteilnetzbetreibers, ab dem **${ENWG_42C.erweiterung}** auch im direkt angrenzenden Gebiet derselben Regelzone. Netzentgelte, Umlagen und Steuern fallen auf geteilten Strom in voller Höhe an.`,
    `**Österreich:** Rund **${fmt(AT_ZAEHLPUNKTE)} Zählpunkte** nehmen laut Koordinationsstelle an über ${fmt(AT_MODELLE)} Modellen der gemeinsamen Energienutzung teil (Stand September 2026). Lokale Erneuerbare-Energie-Gemeinschaften sparen bisher ${pct(AT_EEG_REDUKTION.lokal)} des Netznutzungs-Arbeitspreises; mit dem ElWG gelten ab 1. Oktober 2026 neue Regeln.`,
    `**Schweiz:** Seit 1. Januar 2026 gibt es die **lokale Elektrizitätsgemeinschaft (LEG)** innerhalb einer Gemeinde – mit ${pct(CH_LEG.eineEbene)} Abschlag auf den Netznutzungstarif (${pct(CH_LEG.mehrereEbenen)} bei mehreren Netzebenen). ZEV und vZEV bleiben die Lösung am Gebäude bzw. Netzanschlusspunkt.`,
    "**Keine Gemeinschaft deckt den ganzen Bedarf.** Den Reststrom beziehen alle Teilnehmer weiterhin von einem Lieferanten ihrer Wahl – dort liegt für Unternehmen oft der größere Hebel.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was ist Energy Sharing – und was ist eine Energiegemeinschaft?",
      tocLabel: "Die kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Energy Sharing bedeutet, dass Strom aus einer Erneuerbaren-Anlage über das öffentliche Netz an Nachbarn, Mitglieder oder Betriebe in der Nähe geliefert und viertelstundengenau mit deren Verbrauch verrechnet wird – ohne dass der Betreiber zum klassischen Energieversorger werden muss.** Eine Energiegemeinschaft ist die organisatorische Hülle dafür: ein Verein, eine Genossenschaft oder eine Gesellschaft, in der Erzeuger und Verbraucher den Strom gemeinsam nutzen.",
        },
        {
          typ: "p",
          text: "Die EU hat beides mit der Erneuerbare-Energien-Richtlinie (RED II) und der Strombinnenmarkt-Richtlinie vorgegeben. Umgesetzt wurde es sehr unterschiedlich: Österreich hat seit 2021 einen breiten Rahmen mit Netzentgeltrabatten, die Schweiz setzt auf Eigenverbrauchsgemeinschaften und seit 2026 auf die LEG, Deutschland hat mit dem neuen [§ 42c EnWG](/wissen/lexikon#energy-sharing) erst 2026 nachgezogen – und zwar ohne finanziellen Anreiz beim Netzentgelt.",
        },
        {
          typ: "karten",
          cols: 3,
          items: [
            { titel: GEMEINSCHAFTEN.de.titel, text: GEMEINSCHAFTEN.de.text },
            { titel: GEMEINSCHAFTEN.at.titel, text: GEMEINSCHAFTEN.at.text },
            { titel: GEMEINSCHAFTEN.ch.titel, text: GEMEINSCHAFTEN.ch.text },
          ],
        },
      ],
    },
    {
      id: "deutschland",
      titel: "Deutschland: Energy Sharing nach § 42c EnWG",
      tocLabel: "Deutschland (§ 42c EnWG)",
      bloecke: [
        {
          typ: "p",
          text: `**Der Paragraf ist Ende 2025 in Kraft getreten; die Verteilnetzbetreiber müssen die gemeinsame Nutzung seit dem ${ENWG_42C.start} ermöglichen.** Zunächst müssen alle Beteiligten im selben Bilanzierungsgebiet liegen, ab dem ${ENWG_42C.erweiterung} darf auch in ein unmittelbar angrenzendes Bilanzierungsgebiet derselben Regelzone geteilt werden.`,
        },
        { typ: "h3", text: "Wer darf mitmachen?" },
        {
          typ: "liste",
          punkte: [
            "**Anlagenbetreiber** können natürliche Personen, rechtsfähige Personengesellschaften oder juristische Personen des Privatrechts sein – etwa ein Verein oder eine Genossenschaft –, sofern deren Mitglieder selbst Letztverbraucher oder juristische Personen des öffentlichen Rechts sind. Kommunen können also Mitglied sein, aber nicht selbst Betreiber.",
            "**Anlagen:** Stromerzeugungsanlagen aus erneuerbaren Energien sowie Speicher, die ausschließlich erneuerbaren Strom zwischenspeichern.",
            "**Abnehmer:** Letztverbraucher, bei Unternehmen nur Kleinst-, kleine und mittlere Unternehmen nach EU-Definition (unter 250 Beschäftigte, bis 50 Mio. € Umsatz). Großunternehmen sind außen vor.",
            "**Dienstleister:** Dritte dürfen Messung, Abrechnung und Verwaltung übernehmen – wirtschaftlich wichtig, weil kaum ein Nachbarschaftsprojekt das selbst stemmen will.",
          ],
        },
        { typ: "h3", text: "Messung, Reststrom, Lieferantenpflichten" },
        {
          typ: "p",
          text: "An jeder belieferten Verbrauchsstelle muss der Bezug per **Zählerstandsgangmessung oder viertelstündlicher Leistungsmessung** erfasst werden – praktisch heißt das in der Regel: intelligentes Messsystem (Smart Meter). Der Betreiber muss seine Abnehmer darauf hinweisen, dass die Anlage ihren Bedarf nicht vollständig und nicht jederzeit deckt. Jeder Teilnehmer braucht deshalb weiter einen Liefervertrag für den [Reststrom](/wissen/lexikon#reststrom) und kann diesen Lieferanten frei wählen.",
        },
        {
          typ: "p",
          text: `Für kleine Anlagen gibt es Erleichterungen: Bis ${ENWG_42C.grenzeHaushaltKw} kW (bei Haushaltskunden) bzw. ${ENWG_42C.grenzeMehrparteienKw} kW (bei Mehrparteienhäusern) entfallen verschiedene Lieferantenpflichten, etwa zur Rechnungsgestaltung und Stromkennzeichnung. Größere Projekte tragen die Pflichten eines Stromlieferanten weitgehend selbst oder über einen Dienstleister.`,
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Der entscheidende Unterschied zu Österreich und der Schweiz",
          text: "In Deutschland werden **Netzentgelte, Umlagen, Abgaben und Steuern auf geteilten Strom in voller Höhe** fällig. Anders als bei der österreichischen EEG oder der Schweizer LEG gibt es keinen Rabatt dafür, dass der Strom nur wenige hundert Meter weit fließt. Der wirtschaftliche Vorteil entsteht allein beim Energiepreis. Fachleute wie die Forschungsstelle für Energiewirtschaft (FfE) bewerten das Modell deshalb als rechtlich möglich, aber organisatorisch und wirtschaftlich nur eingeschränkt tragfähig. Ob die Stromsteuer im Einzelfall entfällt, sollte steuerlich geprüft werden.",
        },
        { typ: "h3", text: "Bürgerenergiegesellschaft und Genossenschaft" },
        {
          typ: "p",
          text: "Unabhängig vom Energy Sharing kennt das EEG die **Bürgerenergiegesellschaft** (§ 3 Nr. 15 EEG 2023): mindestens 50 natürliche Personen als stimmberechtigte Mitglieder, mindestens 75 % der Stimmrechte bei Menschen, die im Umkreis von 50 km um die Anlage gemeldet sind, und kein Mitglied mit mehr als 10 % der Stimmrechte. Solche Gesellschaften sind für kleinere Wind- und Solarprojekte von der Ausschreibungspflicht befreit bzw. erhalten Erleichterungen. Die klassische Form dafür ist die Energiegenossenschaft – wie eine Beteiligung aussehen kann, zeigt unsere Seite zur [Genossenschaft](/genossenschaft).",
        },
      ],
    },
    {
      id: "oesterreich",
      titel: "Österreich: EEG, BEG und gemeinsame Energienutzung nach dem ElWG",
      tocLabel: "Österreich (EEG, BEG, ElWG)",
      bloecke: [
        {
          typ: "p",
          text: `**Österreich hat den am weitesten entwickelten Rahmen im DACH-Raum: Laut Österreichischer Koordinationsstelle für Energiegemeinschaften gab es im September 2026 rund ${fmt(AT_ZAEHLPUNKTE)} teilnehmende Zählpunkte in mehr als ${fmt(AT_MODELLE)} Modellen.** Allein im Netzgebiet der Netz Niederösterreich waren es im September 2026 über 100.000 Zählpunkte.`,
        },
        { typ: "h3", text: "Die Modelle" },
        {
          typ: "liste",
          punkte: [
            `**Erneuerbare-Energie-Gemeinschaft ([EEG](/wissen/lexikon#eeg-gemeinschaft))**: Erzeugung ausschließlich erneuerbar, lokal (gemeinsames Niederspannungsnetz) oder regional (Mittelspannung). Nur die EEG spart zusätzlich den **Erneuerbaren-Förderbeitrag und die Elektrizitätsabgabe** auf den gemeinschaftlich bezogenen Strom. Große Unternehmen dürfen nicht Mitglied sein.`,
            `**Bürgerenergiegemeinschaft ([BEG](/wissen/lexikon#buergerenergiegemeinschaft))**: auch nicht erneuerbare Erzeugung möglich, österreichweit tätig. Netzentgeltrabatte gab es bisher nicht; mit dem ElWG sollen lokale und regionale BEG ab 2027 ebenfalls reduzierte Netzentgelte erhalten.`,
            "**Gemeinschaftliche Erzeugungsanlage (GEA)**: die Photovoltaikanlage im Mehrparteienhaus, deren Strom hinter dem Hausanschluss auf die Wohnungen aufgeteilt wird.",
            "**Neu mit dem ElWG:** Peer-to-Peer-Verträge (P2P) und Eigenversorgungsanlagen (EVA) als weitere Formen der gemeinsamen Energienutzung.",
          ],
        },
        {
          typ: "tabelle",
          caption: "Netzentgeltvorteil der Erneuerbare-Energie-Gemeinschaft in Österreich (Rechtslage bis Ende 2026)",
          kopf: ["Nahebereich", "Netzebene", "Reduktion Netznutzungs-Arbeitspreis", "Zusätzlich"],
          zeilen: [
            ["Lokale EEG", "6 und 7", pct(AT_EEG_REDUKTION.lokal), "kein Erneuerbaren-Förderbeitrag, keine Elektrizitätsabgabe"],
            ["Regionale EEG", "6 und 7", pct(AT_EEG_REDUKTION.regionalNe67), "wie oben"],
            ["Regionale EEG", "4 und 5", pct(AT_EEG_REDUKTION.regionalNe45), "wie oben"],
            ["BEG / GEA", "–", "bisher keine", "ab 2027 Rabatt für lokale/regionale BEG vorgesehen"],
          ],
          minBreite: 640,
          fussnote: "Rabatt nur auf den Arbeitspreis der Netznutzung und nur für die tatsächlich aus der Gemeinschaft zugeordnete Strommenge; Netzverlustentgelt, Messentgelt und Leistungspreis bleiben. Ab 1. Jänner 2027 legt die novellierte SNE-VO die Sätze neu fest – die künftigen Prozentsätze bitte beim Netzbetreiber prüfen.",
        },
        { typ: "h3", text: "Was sich mit dem ElWG ändert" },
        {
          typ: "p",
          text: `Das neue Elektrizitätswirtschaftsgesetz (ElWG) regelt die „Bürgerenergie“ in den §§ 65 bis 72 neu; diese Bestimmungen gelten ab **1. Oktober 2026**. Ab 5. Oktober 2026 lassen sich die neuen Modelle zunächst nur mit Zählpunkten desselben Netzbetreibers umsetzen, netzbetreiberübergreifend bzw. österreichweit voraussichtlich ab April 2027. Die reduzierten Netzentgelte für die neuen Formen greifen erst mit der novellierten Netzentgeltverordnung ab 1. Jänner 2027 – bis dahin haben nur Mitglieder lokaler und regionaler EEG Anspruch auf den reduzierten Netzarbeitspreis. Bestehende Gemeinschaften müssen nicht neu gegründet werden, sollten ihre Verträge aber an die neuen Schwellenwerte anpassen.`,
        },
        {
          typ: "p",
          text: `**Mehrfachteilnahme:** Ein Zählpunkt kann an bis zu ${AT_MEHRFACH} Modellen gleichzeitig teilnehmen, gesteuert über Teilnahmefaktoren (in Summe höchstens 100 %). Große Unternehmen dürfen mit Anlagen bis ${AT_GROSS_MW} MW an BEG und P2P teilnehmen; diese Obergrenze lässt sich nicht durch Aufteilung auf mehrere Gemeinschaften umgehen. Einen Überblick über Freiflächenprojekte in Österreich gibt der Ratgeber [Freiflächen-PV in Österreich](/ratgeber/freiflaechen-pv-oesterreich).`,
        },
      ],
    },
    {
      id: "schweiz",
      titel: "Schweiz: ZEV, vZEV und die lokale Elektrizitätsgemeinschaft",
      tocLabel: "Schweiz (ZEV, vZEV, LEG)",
      bloecke: [
        {
          typ: "p",
          text: `**Die Schweiz kennt drei Stufen: den Zusammenschluss zum Eigenverbrauch (ZEV) am eigenen Grundstück, den virtuellen ZEV (vZEV) seit 2025 und die lokale Elektrizitätsgemeinschaft (LEG) seit 1. Januar 2026.**`,
        },
        {
          typ: "liste",
          punkte: [
            `**[ZEV](/wissen/lexikon#zev):** Eigentümer und Mieter nutzen Strom aus einer Anlage am Ort gemeinsam, gegenüber dem Netzbetreiber tritt der ZEV als ein Endverbraucher auf. Die Produktionsleistung muss mindestens ${pct(CH_ZEV_MIN)} der Anschlussleistung betragen.`,
            "**vZEV:** Seit 1. Januar 2025 dürfen dafür auch die Anschlussleitungen des Verteilnetzbetreibers genutzt werden – benachbarte Liegenschaften am selben Netzanschlusspunkt lassen sich so zusammenfassen. Smart Meter sind Pflicht.",
            `**[LEG](/wissen/lexikon#leg):** Teilnehmer innerhalb derselben Gemeinde, am selben Verteilnetz und auf derselben Spannungsebene teilen Strom über das öffentliche Netz. Die Produktionsleistung muss mindestens ${pct(CH_LEG.minProduktion)} der Anschlussleistung aller Teilnehmer erreichen. Auf den intern bezogenen Strom gilt ein Abschlag von ${pct(CH_LEG.eineEbene)} auf den Netznutzungstarif, bei Nutzung mehrerer Netzebenen ${pct(CH_LEG.mehrereEbenen)}.`,
          ],
        },
        {
          typ: "p",
          text: "Der LEG-Abschlag gilt nicht für Systemdienstleistungen, Stromreserve, den Netzzuschlag und öffentliche Abgaben. Eine LEG braucht einen Vertreter gegenüber dem Netzbetreiber und muss rund drei Monate vorher angemeldet werden. Wie die Rahmenbedingungen für größere Solaranlagen in der Schweiz aussehen, beschreibt der Ratgeber [Freiflächen-PV in der Schweiz](/ratgeber/freiflaechen-pv-schweiz).",
        },
      ],
    },
    {
      id: "vergleich",
      titel: "DACH-Vergleich auf einen Blick",
      tocLabel: "Vergleichstabelle",
      bloecke: [
        {
          typ: "tabelle",
          caption: `Gemeinsame Stromnutzung über das öffentliche Netz in Deutschland, Österreich und der Schweiz, Stand ${STAND}`,
          kopf: ["", "Deutschland", "Österreich", "Schweiz"],
          zeilen: [
            ["Modell", "Energy Sharing (§ 42c EnWG)", "EEG, BEG, GEA; neu P2P, EVA (ElWG)", "ZEV, vZEV, LEG"],
            ["Gilt seit", `${ENWG_42C.start}`, "EEG/BEG seit 2021; ElWG-Regeln ab 1.10.2026", "ZEV seit 2018, vZEV 2025, LEG 1.1.2026"],
            ["Räumlicher Rahmen", `Bilanzierungsgebiet eines VNB; ab ${ENWG_42C.erweiterung} auch angrenzendes Gebiet`, "Lokal (Niederspannung), regional (Mittelspannung), BEG österreichweit", "LEG: gleiche Gemeinde, Netzbetreiber und Netzebene"],
            ["Netzentgelt-Vorteil", "keiner", `EEG lokal ${pct(AT_EEG_REDUKTION.lokal)}, regional ${pct(AT_EEG_REDUKTION.regionalNe67)}–${pct(AT_EEG_REDUKTION.regionalNe45)} (Arbeitspreis, bis 2026)`, `LEG ${pct(CH_LEG.eineEbene)} bzw. ${pct(CH_LEG.mehrereEbenen)}`],
            ["Weitere Vorteile", "keine", "EEG: kein Erneuerbaren-Förderbeitrag, keine Elektrizitätsabgabe", "vZEV: Anschlussleitungen des Netzbetreibers mitnutzbar"],
            ["Unternehmen", "nur KMU als Abnehmer", "EEG ohne Großunternehmen; BEG/P2P mit Grenze 6 MW", "grundsätzlich alle Endverbraucher"],
            ["Messung", "Viertelstunde, meist Smart Meter", "Smart Meter (Viertelstundenwerte)", "Smart Meter Pflicht"],
            ["Reststrom", "frei wählbarer Lieferant", "frei wählbarer Lieferant", "Lieferant bzw. Grundversorger"],
          ],
          hervorheben: 1,
          minBreite: 760,
          fussnote: "Vereinfachte Übersicht, keine Rechtsberatung. Details (Teilnahmebedingungen, Fristen, Messkonzept) regeln Gesetz, Verordnungen und die Bedingungen des jeweiligen Netzbetreibers.",
        },
      ],
    },
    {
      id: "rechnung",
      titel: "Rechenbeispiel: Was bringt Energy Sharing einem Betrieb in Deutschland?",
      tocLabel: "Rechenbeispiel",
      bloecke: [
        {
          typ: "p",
          text: `**Weil in Deutschland nur der Energiepreis verhandelbar ist, bleibt der Vorteil überschaubar.** Nehmen wir einen Handwerksbetrieb mit ${fmt(VERBRAUCH_KWH)} kWh Jahresverbrauch, der ${pct(SHARING_ANTEIL)} davon – ${fmt(GETEILT_KWH)} kWh – aus einer Solaranlage in der Nachbarschaft bezieht. Der gewerbliche Strompreis setzt sich nach unseren Orientierungswerten aus rund ${fmtCt(GESAMT_CT)} zusammen; davon sind nur ${fmtCt(BESCHAFFUNG_CT)} Beschaffung und Vertrieb, ${fmtCt(FIX_CT)} sind Netzentgelte, Umlagen, Konzessionsabgabe und Stromsteuer.`,
        },
        {
          typ: "tabelle",
          caption: "Beispiel: geteilter Solarstrom für einen Kleinbetrieb in Deutschland (netto, Orientierungswerte)",
          kopf: ["Position", "Wert"],
          zeilen: [
            ["Jahresverbrauch", `${fmt(VERBRAUCH_KWH)} kWh`],
            ["Davon aus Energy Sharing", `${fmt(GETEILT_KWH)} kWh (${pct(SHARING_ANTEIL)})`],
            ["Beschaffung & Vertrieb beim Lieferanten", fmtCt(BESCHAFFUNG_CT)],
            ["Angenommener Preis für geteilten Solarstrom", fmtCt(SHARING_PREIS_CT)],
            ["Netzentgelte, Umlagen, Abgaben, Steuer", `${fmtCt(FIX_CT)} – unverändert`],
            ["Ersparnis pro Jahr", fmtEur(ERSPARNIS_EUR)],
          ],
          markierteZeile: 5,
          minBreite: 340,
          fussnote: `Der Preis für geteilten Strom ist eine Annahme für das Beispiel, kein Marktwert. Strompreisbestandteile: Orientierungswerte ÖkoInvest, Stand ${STAND}. Kosten für Messung, Abrechnung und Verwaltung sind nicht abgezogen.`,
        },
        {
          typ: "p",
          text: `Rund ${fmtEur(ERSPARNIS_EUR)} im Jahr – vor Kosten für Messstellenbetrieb und Abrechnungsdienstleister. Für Privathaushalte und Vereine kann das Modell trotzdem attraktiv sein, weil es um regionale Identität, Beteiligung und die Nutzung von Überschüssen geht. Für Betriebe liegt der größere Hebel meist beim **Reststrom**: Die übrigen ${pct(1 - SHARING_ANTEIL)} des Verbrauchs werden weiter am Markt beschafft. Hier setzt der [Reststrom-Pool](/reststrom) an, der Strombezug mehrerer Unternehmen bündelt und über das [virtuelle Kraftwerk](/virtuelles-kraftwerk) strukturiert beschafft.`,
        },
        {
          typ: "tool",
          href: pfad("/rechner/reststrom"),
          titel: "Was kostet Ihr Reststrom – und was ließe sich bündeln?",
          text: "Verbrauch und Tarif eingeben: Der Rechner zeigt die Strompreisbestandteile und das Potenzial eines gebündelten Einkaufs.",
          label: "Zum Reststrom-Rechner",
        },
      ],
    },
    {
      id: "grenzen",
      titel: "Grenzen und typische Fehler",
      bloecke: [
        {
          typ: "checkliste",
          punkte: [
            "**Wirtschaftlichkeit überschätzen:** In Deutschland entsteht ohne Netzentgeltrabatt kein automatischer Preisvorteil. Rechnen Sie mit Kosten für Smart Meter, Abrechnung und Verwaltung.",
            "**Gleichzeitigkeit ignorieren:** Geteilt werden kann nur, was in derselben Viertelstunde erzeugt und verbraucht wird. Eine Solaranlage liefert nachts nichts – ein Speicher oder ein ausgewogener Mix aus Tag- und Abendverbrauchern hilft.",
            "**Rollen unklar lassen:** Wer rechnet ab, wer haftet, wer meldet an den Netzbetreiber? Ohne Satzung und klare Verträge wird aus der Nachbarschaftsidee schnell ein Verwaltungsproblem.",
            "**Netzgebiet nicht prüfen:** In Deutschland zählt bis 2028 das Bilanzierungsgebiet, in der Schweiz Gemeinde und Netzebene, in Österreich der Nahebereich des Netzbetreibers.",
            "**Großunternehmen einplanen:** Sie sind beim deutschen Energy Sharing und bei der österreichischen EEG als Abnehmer bzw. Mitglied ausgeschlossen.",
          ],
        },
        {
          typ: "kasten",
          variant: "wichtig",
          text: "Die Regeln sind in allen drei Ländern 2025 bis 2027 im Umbruch. Prüfen Sie den Stand kurz vor der Gründung beim Netzbetreiber bzw. bei der Koordinationsstelle und lassen Sie Satzung, Verträge und steuerliche Fragen fachlich begleiten.",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So gründen Sie eine Energiegemeinschaft",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Ziel und Teilnehmer klären", "Wer erzeugt, wer verbraucht, wie gut passen die Lastprofile zusammen? Eine Gemeinde, ein Gewerbegebiet oder ein Quartier mit Tag- und Abendverbrauchern ist ideal."],
            ["Modell und Rechtsform wählen", "In Deutschland Energy Sharing oder Genossenschaft, in Österreich EEG, BEG oder P2P, in der Schweiz vZEV oder LEG. Verein oder Genossenschaft sind die häufigsten Träger."],
            ["Erzeugung sichern", "Dachflächen, Freiflächen oder ein Solarpark in der Region. Wer eine Fläche einbringen kann, prüft sie im [Flächencheck](/flaechencheck)."],
            ["Messung und Netzbetreiber", "Smart Meter bestellen, Nahebereich bzw. Bilanzierungsgebiet klären, Gemeinschaft beim Netzbetreiber anmelden."],
            ["Verträge und Preise", "Interner Strompreis, Aufteilungsschlüssel, Ein- und Austritt, Haftung und Datenschutz regeln; Abrechnung ggf. an einen Dienstleister vergeben."],
            ["Reststrom organisieren", "Für den nicht gedeckten Bedarf einen Liefervertrag abschließen – für Betriebe gern gebündelt."],
          ],
        },
        {
          typ: "p",
          text: "Einen Überblick, wie ÖkoInvest Gemeinschaften und Kommunen bei regionalen Projekten unterstützt, finden Sie auf den Seiten [Energiegemeinschaften](/energiegemeinschaften) und [Kommunen](/kommunen).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Ab wann kann ich in Deutschland Strom mit meinen Nachbarn teilen?",
      a: `Seit dem ${ENWG_42C.start}. Ab diesem Tag müssen Verteilnetzbetreiber Energy Sharing nach § 42c EnWG innerhalb ihres Bilanzierungsgebiets ermöglichen. Ab dem ${ENWG_42C.erweiterung} ist auch das Teilen in ein direkt angrenzendes Bilanzierungsgebiet derselben Regelzone erlaubt.`,
    },
    {
      q: "Spart man beim Energy Sharing in Deutschland Netzentgelte?",
      a: "Nein. Netzentgelte, Umlagen, Abgaben und in der Regel die Stromsteuer fallen auf geteilten Strom voll an. Einsparungen entstehen nur, wenn der vereinbarte Energiepreis unter dem Beschaffungsanteil des bisherigen Tarifs liegt.",
    },
    {
      q: "Wie viel spart man in einer österreichischen Energiegemeinschaft?",
      a: `Mitglieder einer lokalen EEG zahlen bisher ${pct(AT_EEG_REDUKTION.lokal)} weniger Netznutzungs-Arbeitspreis auf den Gemeinschaftsstrom, regionale EEG ${pct(AT_EEG_REDUKTION.regionalNe67)} (Netzebene 6/7) bzw. ${pct(AT_EEG_REDUKTION.regionalNe45)} (Netzebene 4/5). Dazu entfallen Erneuerbaren-Förderbeitrag und Elektrizitätsabgabe. Ab 2027 legt die novellierte SNE-VO die Sätze neu fest.`,
    },
    {
      q: "Kann ich in Österreich an mehreren Energiegemeinschaften teilnehmen?",
      a: `Ja. Ein Zählpunkt darf an bis zu ${AT_MEHRFACH} Modellen gleichzeitig teilnehmen. Über Teilnahmefaktoren wird festgelegt, welcher Anteil von Verbrauch oder Erzeugung welcher Gemeinschaft zugeordnet wird – in Summe höchstens 100 %.`,
    },
    {
      q: "Was ist der Unterschied zwischen vZEV und LEG in der Schweiz?",
      a: `Der vZEV nutzt nur die Anschlussleitungen bis zum gemeinsamen Netzanschlusspunkt und tritt als ein Endverbraucher auf. Die LEG nutzt das öffentliche Verteilnetz innerhalb einer Gemeinde und erhält dafür einen Abschlag von ${pct(CH_LEG.eineEbene)} bzw. ${pct(CH_LEG.mehrereEbenen)} auf den Netznutzungstarif.`,
    },
    {
      q: "Brauche ich trotz Energiegemeinschaft noch einen Stromlieferanten?",
      a: "Ja, in allen drei Ländern. Keine Gemeinschaft deckt den Bedarf jederzeit vollständig; den Reststrom liefert ein Lieferant. In Deutschland und Österreich ist er frei wählbar. In der Schweiz haben nur Endverbraucher ab 100 MWh Jahresverbrauch Zugang zum freien Markt (Art. 11 Abs. 2 StromVV); alle anderen bleiben beim Netzbetreiber in der Grundversorgung. Wie Unternehmen diesen Reststrom gebündelt beschaffen können, erklärt die Seite [Reststrom](/reststrom).",
    },
    {
      q: "Dürfen Unternehmen an Energy Sharing teilnehmen?",
      a: "In Deutschland nur Kleinst-, kleine und mittlere Unternehmen als Abnehmer. In Österreich dürfen große Unternehmen nicht Mitglied einer EEG sein, aber an BEG und P2P mit Anlagen bis 6 MW teilnehmen. In der Schweiz stehen ZEV, vZEV und LEG grundsätzlich allen Endverbrauchern offen.",
    },
  ],

  passend: [
    { href: pfad("/energiegemeinschaften"), titel: "Energiegemeinschaften", text: "Wie regionale Gemeinschaften Solarstrom gemeinsam nutzen." },
    { href: pfad("/genossenschaft"), titel: "Genossenschaft", text: "Beteiligung an Solarprojekten in der Region." },
    { href: "/ratgeber/virtuelles-kraftwerk", titel: "Virtuelles Kraftwerk erklärt", text: "Wie viele kleine Anlagen gemeinsam am Strommarkt auftreten." },
    { href: "/ratgeber/ppa-fuer-unternehmen", titel: "PPA für Unternehmen", text: "Solarstrom direkt vom Park beziehen." },
    { href: pfad("/energiegemeinschaften/software"), titel: "Software für Energiegemeinschaften", text: "Gründung, Zustimmung beim Netzbetreiber und Betrieb in Österreich." },
    { href: pfad("/rechner/energy-sharing"), titel: "Energy-Sharing-Rechner", text: "Vorteil je Teilnehmer in DE, AT und CH berechnen." },
  ],

  quellen: [
    { titel: "§ 42c EnWG – Gemeinsame Nutzung elektrischer Energie aus Anlagen zur Erzeugung von Elektrizität aus erneuerbaren Energien", url: "https://www.gesetze-im-internet.de/enwg_2005/__42c.html", stand: "09/2026" },
    { titel: "§ 3 EEG 2023 – Begriffsbestimmungen (Nr. 15 Bürgerenergiegesellschaft)", url: "https://www.gesetze-im-internet.de/eeg_2014/__3.html", stand: "09/2026" },
    { titel: "FfE – Energy Sharing under § 42c EnWG: A legislative milestone, framework conditions and next steps", url: "https://www.ffe.de/en/publications/energy-sharing-under-%C2%A7-42c-enwg-a-legislative-milestone-framework-conditions-and-next-steps/", stand: "09/2026" },
    { titel: "Österreichische Koordinationsstelle für Energiegemeinschaften – Rechtliche Grundlagen ElWG", url: "https://energiegemeinschaften.gv.at/rechtliche-grundlagen-elwg/", stand: "09/2026" },
    { titel: "Österreichische Koordinationsstelle für Energiegemeinschaften – Regionaltreffen 2026 (Präsentationsfolien)", url: "https://energiegemeinschaften.gv.at/wp-content/uploads/sites/19/2026/07/Regionaltreffen-Energiegemeinschaften-2026_Praesentationsfolien.pdf", stand: "09/2026" },
    { titel: "Österreichische Koordinationsstelle für Energiegemeinschaften – Mehrfachteilnahme", url: "https://energiegemeinschaften.gv.at/mehrfachteilnahme/", stand: "09/2026" },
    { titel: "BFE – Änderung der Stromversorgungsverordnung, Erläuternder Bericht (LEG)", url: "https://pubdb.bfe.admin.ch/de/publication/download/11641", stand: "09/2026" },
    { titel: "Swissolar – Virtueller Zusammenschluss zum Eigenverbrauch (vZEV) ab 1.1.2025", url: "https://swsolar.ch/neuigkeiten/virtueller-zusammenschluss-zum-eigenverbrauch-vzev/", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Energiegemeinschaft planen?",
    text: "Wir zeigen, wie regionale Erzeugung, Gemeinschaft und Reststrom zusammenpassen.",
    href: pfad("/energiegemeinschaften"),
    label: "Energiegemeinschaften",
  },
  cta: {
    title: "Regionalen Strom gemeinsam nutzen.",
    text: "Ob Energiegemeinschaft, Genossenschaft oder gebündelter Reststrom für Betriebe: Schildern Sie uns Ihr Vorhaben, wir ordnen es für Deutschland, Österreich oder die Schweiz ein.",
    primary: { label: "Anfrage stellen", href: "/kontakt" },
    secondary: { label: "Zur Genossenschaft", href: pfad("/genossenschaft") },
  },
};

export default artikel;
