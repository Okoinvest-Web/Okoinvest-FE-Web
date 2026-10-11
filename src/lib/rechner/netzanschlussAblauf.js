// src/lib/rechner/netzanschlussAblauf.js – Netzanschluss 2.0 (Welle 4, Paket NETZ2)
//
// Ablauf-Begleiter je Land für den Netzanschluss eines Solarparks: Schritt-für-Schritt-
// Strecke mit Dokumenten-Checkliste je Schritt, Fristen- und Statusanzeige, typische
// Ablehnungsgründe und was dann hilft. Reine Daten und Funktionen ohne React:
//
//   node src/lib/rechner/netzanschlussAblauf.js   → Selbsttest
//
// Grundsätze:
//  - DE: Netzanschlussbegehren nach § 8 EEG; als einzige konkrete Frist die im Bestand
//    belegte Prüffrist aus FREIFLAECHE.netz.pruefWochen (§ 8 Abs. 6 EEG, markt.js).
//  - AT (Netzzugangsantrag, TOR Erzeuger) und CH (Netzanschlussgesuch, Werkvorschriften):
//    KEINE konkreten Fristen oder Kosten – dafür gibt es keinen geprüften Wert im
//    Faktenregister; der Begleiter sagt das offen (fristHinweis) statt Zahlen zu nennen.
//  - Alle Texte sind Orientierung, keine Rechtsberatung. Verbindlich ist immer die
//    Auskunft des zuständigen Netzbetreibers.

import { FREIFLAECHE } from "../invest/markt.js";

const PRUEF_WOCHEN = FREIFLAECHE.netz.pruefWochen;

export const ABLAUF_LAENDER = ["de", "at", "ch"];

const s = (id, titel, titelEn, text, textEn, dokumente, extra = {}) => ({ id, titel, titelEn, text, textEn, dokumente, ...extra });
const d = (de, en) => ({ de, en });

/* ------------------------------------------------------------------ */
/* Deutschland: Netzanschlussbegehren nach § 8 EEG                      */
/* ------------------------------------------------------------------ */

const DE = {
  land: "de",
  verfahren: "Netzanschlussbegehren nach § 8 EEG",
  verfahrenEn: "Grid connection request under § 8 EEG",
  schritte: [
    s(
      "de-vorbereiten",
      "Projekt und Unterlagen vorbereiten",
      "Prepare the project and documents",
      "Fläche sichern (mindestens Vorvertrag oder Vollmacht des Eigentümers), geplante Modul- und Einspeiseleistung festlegen und den zuständigen Verteilnetzbetreiber für den Standort ermitteln. Je vollständiger das Begehren, desto früher beginnt die gesetzliche Prüffrist.",
      "Secure the land (at least a preliminary agreement or the owner's authorisation), define the planned module and feed-in capacity and identify the distribution system operator responsible for the site. The more complete the request, the sooner the statutory review period starts.",
      [
        d("Lageplan mit Flurstücken und geplanter Parkfläche", "Site plan with plots and the planned park area"),
        d("Geplante Modulleistung (MWp) und Einspeiseleistung (MW)", "Planned module capacity (MWp) and feed-in capacity (MW)"),
        d("Nachweis der Flächensicherung oder Vollmacht", "Evidence that the land is secured, or an authorisation"),
      ]
    ),
    s(
      "de-begehren",
      "Netzanschlussbegehren stellen (§ 8 Abs. 5 EEG)",
      "Submit the grid connection request (§ 8(5) EEG)",
      "Das Begehren schriftlich beim Verteilnetzbetreiber stellen – möglichst auf dessen Formular und mit allen verlangten Angaben. Der Netzbetreiber muss nach Eingang unverzüglich einen Zeitplan für die Bearbeitung übermitteln und sagen, welche Unterlagen noch fehlen.",
      "Submit the request to the distribution system operator in writing – ideally on its form and with all required details. After receipt, the grid operator must promptly send a schedule for processing and state which documents are still missing.",
      [
        d("Antragsformular des Netzbetreibers, vollständig ausgefüllt", "The grid operator's application form, completed in full"),
        d("Lageplan und technische Eckdaten der Anlage", "Site plan and key technical data of the plant"),
        d("Angaben zu Speicher und Netzbezug, falls geplant", "Details of storage and grid consumption, if planned"),
        d("Eingangsbestätigung des Netzbetreibers aufbewahren", "Keep the grid operator's confirmation of receipt"),
      ],
      { frist: d("Zeitplan: unverzüglich nach Eingang des Begehrens (§ 8 Abs. 5 EEG).", "Schedule: promptly after receipt of the request (§ 8(5) EEG).") }
    ),
    s(
      "de-pruefung",
      "Netzverträglichkeitsprüfung abwarten (§ 8 Abs. 6 EEG)",
      "Await the grid compatibility check (§ 8(6) EEG)",
      `Der Netzbetreiber prüft, ob und wo die Leistung aufgenommen werden kann, und legt das Ergebnis samt Kostenvoranschlag vor – spätestens ${PRUEF_WOCHEN} Wochen nach dem vollständigen Begehren. Rückfragen sofort beantworten, sonst beginnt die Frist später.`,
      `The grid operator checks whether and where the capacity can be absorbed and presents the result together with a cost estimate – within ${PRUEF_WOCHEN} weeks of the complete request at the latest. Answer queries immediately, otherwise the period starts later.`,
      [
        d("Bestätigung, dass das Begehren vollständig ist", "Confirmation that the request is complete"),
        d("Antworten auf Rückfragen des Netzbetreibers", "Replies to the grid operator's queries"),
        d("Ergebnis der Prüfung mit Verknüpfungspunkt und Kostenvoranschlag", "Result of the check with connection point and cost estimate"),
      ],
      { frist: d(`Ergebnis samt Kostenvoranschlag: spätestens ${PRUEF_WOCHEN} Wochen nach vollständigem Begehren (§ 8 Abs. 6 EEG).`, `Result incl. cost estimate: within ${PRUEF_WOCHEN} weeks of the complete request (§ 8(6) EEG).`) }
    ),
    s(
      "de-pruefen",
      "Verknüpfungspunkt und Kosten prüfen",
      "Review connection point and costs",
      "Kostenvoranschlag und zugewiesenen Verknüpfungspunkt nachrechnen: Ein anderer Punkt kann gesamtwirtschaftlich günstiger sein (§ 8 Abs. 1 EEG). Überbauung oder eine flexible Netzanschlussvereinbarung nach § 8a EEG können Kapazität schneller verfügbar machen; Clusterung mit Nachbarprojekten teilt Trasse und Umspannwerk.",
      "Recalculate the cost estimate and the assigned connection point: another point can be more economical overall (§ 8(1) EEG). Overbuilding or a flexible grid connection agreement under § 8a EEG can make capacity available sooner; clustering with neighbouring projects shares the route and substation.",
      [
        d("Kostenvoranschlag des Netzbetreibers", "The grid operator's cost estimate"),
        d("Eigene Trassen- und Kostenrechnung (z. B. mit dem Rechner oben)", "Your own route and cost calculation (e.g. with the calculator above)"),
        d("Ggf. Vergleichsrechnung für einen anderen Verknüpfungspunkt", "If applicable, a comparison for another connection point"),
      ]
    ),
    s(
      "de-vertrag",
      "Reservierung sichern und Verträge schließen",
      "Secure the reservation and sign the contracts",
      "Viele Netzbetreiber reservieren Kapazität nur befristet und verlangen Nachweise zum Projektfortschritt (etwa Flächensicherung oder Aufstellungsbeschluss), teils mit Reservierungsentgelt – die Bedingungen unterscheiden sich je Netzbetreiber. Danach Netzanschluss- und Anschlussnutzungsvertrag schließen.",
      "Many grid operators reserve capacity only for a limited time and require evidence of project progress (such as land secured or a resolution to draw up a plan), sometimes with a reservation fee – the conditions differ between operators. Then sign the grid connection and connection use agreements.",
      [
        d("Reservierungsbedingungen und Meilensteine des Netzbetreibers", "The grid operator's reservation conditions and milestones"),
        d("Nachweise zum Projektfortschritt (Flächensicherung, Bauleitplanung)", "Evidence of project progress (land secured, land-use planning)"),
        d("Netzanschlussvertrag und Anschlussnutzungsvertrag", "Grid connection agreement and connection use agreement"),
      ]
    ),
    s(
      "de-bau",
      "Bauen, zertifizieren, in Betrieb nehmen",
      "Build, certify, commission",
      "Leitungsrechte (Dienstbarkeiten) entlang der Trasse sichern, Übergabestation nach den technischen Anschlussregeln (VDE-AR-N 4110/4120) errichten und das Anlagenzertifikat beibringen. Die Anlage fristgerecht im Marktstammdatenregister eintragen und die Inbetriebnahme mit dem Netzbetreiber abstimmen.",
      "Secure cable rights (easements) along the route, build the transfer station to the technical connection rules (VDE-AR-N 4110/4120) and provide the plant certificate. Register the plant in the market master data register (Marktstammdatenregister) within the deadline and coordinate commissioning with the grid operator.",
      [
        d("Dienstbarkeiten für die Kabeltrasse", "Easements for the cable route"),
        d("Anlagenzertifikat und Schutzkonzept", "Plant certificate and protection concept"),
        d("Eintrag im Marktstammdatenregister", "Entry in the market master data register"),
        d("Inbetriebnahmeprotokoll des Netzbetreibers", "The grid operator's commissioning report"),
      ]
    ),
  ],
  ablehnungen: [
    {
      grund: "Begehren unvollständig – die Prüffrist beginnt nicht.",
      grundEn: "Request incomplete – the review period does not start.",
      hilfe: "Fehlende Unterlagen laut Rückmeldung nachreichen und die Vollständigkeit schriftlich bestätigen lassen; erst dann läuft die Frist nach § 8 Abs. 6 EEG.",
      hilfeEn: "Submit the missing documents named in the reply and have completeness confirmed in writing; only then does the period under § 8(6) EEG run.",
    },
    {
      grund: "Keine freie Kapazität am gewünschten Verknüpfungspunkt.",
      grundEn: "No free capacity at the desired connection point.",
      hilfe: "Geringere Einspeiseleistung anbieten (Überbauung, § 8a EEG), Speicher einplanen, Clusterung mit Nachbarprojekten prüfen oder einen anderen Verknüpfungspunkt rechnen lassen. Den Netzausbau trägt der Netzbetreiber (§ 17 EEG) – die Wartezeit tragen Sie.",
      hilfeEn: "Offer a lower feed-in capacity (overbuilding, § 8a EEG), plan storage, consider clustering with neighbouring projects or have another connection point calculated. The grid operator bears the expansion (§ 17 EEG) – you bear the waiting time.",
    },
    {
      grund: "Zugewiesener Verknüpfungspunkt liegt weit entfernt und macht das Projekt teuer.",
      grundEn: "The assigned connection point is far away and makes the project expensive.",
      hilfe: "Nachweisen, dass ein anderer Punkt gesamtwirtschaftlich günstiger ist (§ 8 Abs. 1 EEG) – mit eigener Trassen- und Kostenrechnung. Bei Streit hilft die Clearingstelle EEG|KWKG.",
      hilfeEn: "Show that another point is more economical overall (§ 8(1) EEG) – with your own route and cost calculation. In a dispute, the EEG|KWKG clearing house (Clearingstelle) can help.",
    },
    {
      grund: "Reservierung verfällt, weil Projektnachweise fehlen.",
      grundEn: "The reservation lapses because project evidence is missing.",
      hilfe: "Meilensteine (Flächensicherung, Bauleitplanung) dokumentieren und Fristen der Reservierungsbedingungen in den Projektplan übernehmen; rechtzeitig Verlängerung beantragen.",
      hilfeEn: "Document milestones (land secured, land-use planning) and carry the reservation deadlines into the project plan; apply for an extension in good time.",
    },
  ],
  fristHinweis: null,
  fristHinweisEn: null,
  quellen: [
    { name: "§ 8 EEG (Anschlusspflicht, Fristen)", url: "https://www.gesetze-im-internet.de/eeg_2014/__8.html" },
    { name: "§ 8a EEG (flexible Netzanschlussvereinbarung)", url: "https://www.gesetze-im-internet.de/eeg_2014/__8a.html" },
    { name: "§§ 16, 17 EEG (Kostentragung)", url: "https://www.gesetze-im-internet.de/eeg_2014/__16.html" },
  ],
};

/* ------------------------------------------------------------------ */
/* Österreich: Netzzugangsantrag und TOR Erzeuger                       */
/* ------------------------------------------------------------------ */

const AT = {
  land: "at",
  verfahren: "Netzzugangsantrag beim Verteilnetzbetreiber (ElWOG, TOR Erzeuger)",
  verfahrenEn: "Grid access application to the DSO (ElWOG, TOR for generators)",
  schritte: [
    s(
      "at-vorbereiten",
      "Projekt vorbereiten und Netzbetreiber ermitteln",
      "Prepare the project and identify the grid operator",
      "Standort, geplante Engpassleistung und den zuständigen Verteilnetzbetreiber klären. Viele Netzbetreiber veröffentlichen freie Kapazitäten je Netzbereich – das früh prüfen, bevor Planungskosten entstehen.",
      "Clarify the site, the planned capacity and the responsible distribution system operator. Many operators publish free capacity per grid area – check this early, before planning costs arise.",
      [
        d("Lageplan mit Grundstücken und geplanter Parkfläche", "Site plan with plots and the planned park area"),
        d("Geplante Modul- und Engpassleistung", "Planned module capacity and bottleneck capacity"),
        d("Veröffentlichte Kapazitätsübersicht des Netzbetreibers", "The grid operator's published capacity overview"),
      ]
    ),
    s(
      "at-antrag",
      "Netzzugangsantrag stellen",
      "Submit the grid access application",
      "Den Netzzugangsantrag beim Verteilnetzbetreiber stellen (Rechtsgrundlage: ElWOG und die Ausführungsgesetze der Länder; die Netzbetreiber stellen eigene Formulare bereit). Der Antrag legt Einspeiseleistung, Anschlusspunkt-Wunsch und technische Daten fest.",
      "Submit the grid access application to the distribution system operator (legal basis: ElWOG and the provincial implementing acts; operators provide their own forms). The application sets out feed-in capacity, preferred connection point and technical data.",
      [
        d("Antragsformular des Netzbetreibers, vollständig ausgefüllt", "The grid operator's application form, completed in full"),
        d("Technische Daten der Anlage (Leistung, Wechselrichter, Speicher)", "Technical data of the plant (capacity, inverters, storage)"),
        d("Eingangsbestätigung aufbewahren", "Keep the confirmation of receipt"),
      ]
    ),
    s(
      "at-angebot",
      "Netzzugangsangebot und Kapazitätsprüfung",
      "Grid access offer and capacity check",
      "Der Netzbetreiber prüft die Kapazität und legt ein Angebot mit Anschlusspunkt und Bedingungen vor. Für Einspeiser fällt ein Netzzutrittsentgelt in Höhe der tatsächlichen Anschlusskosten an; für Netzbezug (etwa eines Speichers) zusätzlich ein Netzbereitstellungsentgelt.",
      "The grid operator checks capacity and presents an offer with connection point and conditions. Feed-in plants pay a grid access charge equal to the actual connection costs; grid consumption (e.g. by storage) additionally incurs a grid provision charge.",
      [
        d("Netzzugangsangebot mit Anschlusspunkt und Bedingungen", "Grid access offer with connection point and conditions"),
        d("Aufstellung der Anschlusskosten (Netzzutrittsentgelt)", "Breakdown of the connection costs (grid access charge)"),
        d("Rückfragen schriftlich klären", "Clarify queries in writing"),
      ]
    ),
    s(
      "at-tor",
      "Technische Anforderungen nach TOR Erzeuger erfüllen",
      "Meet the technical requirements of TOR for generators",
      "Die Anlage muss die Technischen und Organisatorischen Regeln (TOR) für Erzeuger einhalten; welche Typklasse gilt, hängt von der Leistung ab. Konformitätsnachweise und Schutzeinstellungen früh mit dem Netzbetreiber abstimmen – fehlende Nachweise sind ein häufiger Verzögerungsgrund.",
      "The plant must comply with the Technical and Organisational Rules (TOR) for generators; the applicable type class depends on capacity. Coordinate conformity evidence and protection settings with the grid operator early – missing evidence is a frequent cause of delay.",
      [
        d("TOR-Konformitätsnachweise der Komponenten", "TOR conformity evidence for the components"),
        d("Schutzkonzept und Einstellwerte", "Protection concept and settings"),
        d("Abstimmungsprotokoll mit dem Netzbetreiber", "Record of coordination with the grid operator"),
      ]
    ),
    s(
      "at-vertrag",
      "Netzzugangsvertrag schließen und errichten",
      "Sign the grid access contract and build",
      "Netzzugangsvertrag und Anschlussvereinbarung schließen, Leitungsrechte sichern und die Anschlussanlagen nach den Vorgaben des Netzbetreibers errichten.",
      "Sign the grid access contract and connection agreement, secure cable rights and build the connection facilities to the grid operator's specifications.",
      [
        d("Unterzeichneter Netzzugangsvertrag", "Signed grid access contract"),
        d("Leitungsrechte (Dienstbarkeiten) entlang der Trasse", "Cable rights (easements) along the route"),
        d("Ausführungsplanung der Anschlussanlagen", "Detailed design of the connection facilities"),
      ]
    ),
    s(
      "at-betrieb",
      "Fertigstellung melden und in Betrieb nehmen",
      "Report completion and commission",
      "Fertigstellungsmeldung einreichen, Zählpunkt einrichten lassen und die Inbetriebnahme mit dem Netzbetreiber abstimmen. Eine Förderung nach dem EAG (etwa über die OeMAG) läuft als eigenes Verfahren parallel.",
      "Submit the completion report, have the metering point set up and coordinate commissioning with the grid operator. Funding under the EAG (e.g. via OeMAG) is a separate, parallel procedure.",
      [
        d("Fertigstellungsmeldung des Elektrotechnikers", "The electrician's completion report"),
        d("Zählpunktbezeichnung und Messkonzept", "Metering point designation and metering concept"),
        d("Inbetriebnahmeprotokoll", "Commissioning report"),
      ]
    ),
  ],
  ablehnungen: [
    {
      grund: "Kapazität im Netzbereich erschöpft.",
      grundEn: "Capacity in the grid area is exhausted.",
      hilfe: "Veröffentlichte Kapazitäten anderer Netzbereiche prüfen, geringere Engpassleistung oder Speicher anbieten und sich für einen Netzausbau vormerken lassen.",
      hilfeEn: "Check published capacities of other grid areas, offer a lower bottleneck capacity or storage and have the project noted for grid expansion.",
    },
    {
      grund: "Antrag unvollständig oder technische Daten fehlen.",
      grundEn: "Application incomplete or technical data missing.",
      hilfe: "Formular und Beilagen anhand der Checkliste des Netzbetreibers vervollständigen; die Bearbeitung beginnt sonst nicht.",
      hilfeEn: "Complete the form and enclosures using the grid operator's checklist; processing will not start otherwise.",
    },
    {
      grund: "TOR-Nachweise fehlen oder Schutzkonzept wird nicht akzeptiert.",
      grundEn: "TOR evidence missing or the protection concept is not accepted.",
      hilfe: "Konformitätsnachweise der Hersteller anfordern und das Schutzkonzept früh mit dem Netzbetreiber abstimmen – vor der Bestellung der Komponenten.",
      hilfeEn: "Request conformity evidence from the manufacturers and coordinate the protection concept with the grid operator early – before ordering components.",
    },
    {
      grund: "Streit über Bedingungen oder Entgelte.",
      grundEn: "Dispute over conditions or charges.",
      hilfe: "Die Regulierungsbehörde E-Control bietet eine Streitschlichtung zwischen Netzbenutzern und Netzbetreibern an.",
      hilfeEn: "The regulator E-Control offers dispute resolution between grid users and grid operators.",
    },
  ],
  fristHinweis:
    "Für Österreich nennen wir keine konkreten Bearbeitungsfristen oder Kostenspannen: Dafür liegt uns noch kein geprüfter Wert vor. Maßgeblich sind die Angaben Ihres Verteilnetzbetreibers.",
  fristHinweisEn:
    "For Austria we do not state specific processing deadlines or cost ranges: we do not yet have a verified figure for this. Your distribution system operator's information is decisive.",
  quellen: [
    { name: "E-Control – TOR (Technische und Organisatorische Regeln)", url: "https://www.e-control.at/marktteilnehmer/strom/netzanschluss" },
  ],
};

/* ------------------------------------------------------------------ */
/* Schweiz: Netzanschlussgesuch und Werkvorschriften                    */
/* ------------------------------------------------------------------ */

const CH = {
  land: "ch",
  verfahren: "Netzanschlussgesuch beim Verteilnetzbetreiber (Werkvorschriften)",
  verfahrenEn: "Grid connection application to the DSO (utility regulations)",
  schritte: [
    s(
      "ch-vorbereiten",
      "Projekt vorbereiten und Werkvorschriften besorgen",
      "Prepare the project and obtain the utility regulations",
      "Den örtlichen Verteilnetzbetreiber ermitteln und dessen Werkvorschriften besorgen (Grundlage sind meist die Branchenempfehlungen des VSE, ergänzt um lokale Regeln). Standort, Leistung und gewünschter Anschlusspunkt kommen ins Gesuch.",
      "Identify the local distribution system operator and obtain its utility regulations (usually based on the VSE industry recommendations, supplemented by local rules). Site, capacity and the preferred connection point go into the application.",
      [
        d("Situationsplan mit Parzellen und Parkfläche", "Site plan with parcels and the park area"),
        d("Geplante Modul- und Anschlussleistung", "Planned module and connection capacity"),
        d("Werkvorschriften des Netzbetreibers", "The grid operator's utility regulations"),
      ]
    ),
    s(
      "ch-gesuch",
      "Netzanschlussgesuch einreichen",
      "Submit the grid connection application",
      "Das Netzanschlussgesuch (technisches Anschlussgesuch) beim Verteilnetzbetreiber einreichen – auf dessen Formular, mit Situationsplan und technischen Daten. Der Netzbetreiber bestätigt den Eingang und nennt die weiteren Schritte.",
      "Submit the grid connection application (technical connection application) to the distribution system operator – on its form, with site plan and technical data. The operator confirms receipt and names the next steps.",
      [
        d("Anschlussgesuch-Formular des Netzbetreibers", "The grid operator's connection application form"),
        d("Technische Daten (Leistung, Wechselrichter, Speicher)", "Technical data (capacity, inverters, storage)"),
        d("Eingangsbestätigung aufbewahren", "Keep the confirmation of receipt"),
      ]
    ),
    s(
      "ch-beurteilung",
      "Beurteilung und Anschlusspunkt abwarten",
      "Await the assessment and connection point",
      "Der Netzbetreiber legt Anschlusspunkt und Bedingungen fest. Notwendige Netzverstärkungen für Einspeiser werden in der Regel über die Netzkosten getragen – das vorab schriftlich bestätigen lassen, ebenso die Abgrenzung zum eigenen Anschluss.",
      "The grid operator determines the connection point and conditions. Necessary grid reinforcements for feed-in plants are usually covered by grid costs – have this confirmed in writing in advance, as well as the boundary to your own connection.",
      [
        d("Anschlusszusage mit Anschlusspunkt und Bedingungen", "Connection commitment with connection point and conditions"),
        d("Schriftliche Bestätigung zur Kostentragung von Verstärkungen", "Written confirmation of who bears reinforcement costs"),
        d("Abgrenzung Eigentum/Unterhalt der Anschlussanlagen", "Boundary of ownership/maintenance of the connection facilities"),
      ]
    ),
    s(
      "ch-installation",
      "Installationsanzeige und Anmeldungen",
      "Installation notice and registrations",
      "Der Elektroinstallateur reicht die Installationsanzeige nach Niederspannungs-Installationsverordnung (NIV) ein. Parallel die Anlage bei Pronovo für Herkunftsnachweise und allfällige Förderung anmelden – das ist ein eigenes Verfahren.",
      "The electrical installer submits the installation notice under the Low-Voltage Installation Ordinance (NIV). In parallel, register the plant with Pronovo for guarantees of origin and any funding – that is a separate procedure.",
      [
        d("Installationsanzeige (NIV) des Installateurs", "The installer's installation notice (NIV)"),
        d("Pronovo-Anmeldung (Herkunftsnachweis, Förderung)", "Pronovo registration (guarantee of origin, funding)"),
        d("Messkonzept mit dem Netzbetreiber abstimmen", "Coordinate the metering concept with the grid operator"),
      ]
    ),
    s(
      "ch-bau",
      "Bauen, Sicherheitsnachweis, Inbetriebnahme",
      "Build, safety certificate, commissioning",
      "Anschlussanlagen nach den Werkvorschriften errichten, Durchleitungsrechte sichern und zur Inbetriebnahme den Sicherheitsnachweis (SiNa) vorlegen. Die Abnahme und die Freigabe der Einspeisung erfolgen durch den Netzbetreiber.",
      "Build the connection facilities to the utility regulations, secure rights of way and present the safety certificate (SiNa) for commissioning. Acceptance and release of feed-in are carried out by the grid operator.",
      [
        d("Durchleitungs-/Dienstbarkeitsverträge entlang der Trasse", "Right-of-way/easement contracts along the route"),
        d("Sicherheitsnachweis (SiNa)", "Safety certificate (SiNa)"),
        d("Abnahme- und Inbetriebsetzungsprotokoll", "Acceptance and commissioning report"),
      ]
    ),
  ],
  ablehnungen: [
    {
      grund: "Gesuch unvollständig oder nicht nach Werkvorschriften.",
      grundEn: "Application incomplete or not in line with the utility regulations.",
      hilfe: "Fehlende Angaben anhand der Werkvorschriften ergänzen und das Gesuch neu einreichen; vorab ein kurzes Abstimmungsgespräch mit dem Netzbetreiber vereinbaren.",
      hilfeEn: "Add the missing details using the utility regulations and resubmit; arrange a short coordination call with the grid operator beforehand.",
    },
    {
      grund: "Anschlusspunkt oder Kostentragung der Verstärkung strittig.",
      grundEn: "Connection point or cost allocation for reinforcement in dispute.",
      hilfe: "Begründung und eigene Variantenrechnung vorlegen; bei anhaltendem Streit über Anschlussbedingungen oder Netzkosten entscheidet die ElCom als Regulierungsbehörde.",
      hilfeEn: "Present reasoning and your own alternative calculation; if the dispute over connection conditions or grid costs persists, the regulator ElCom decides.",
    },
    {
      grund: "Kapazität im Quartier-/Regionalnetz nicht ausreichend.",
      grundEn: "Insufficient capacity in the local/regional grid.",
      hilfe: "Geringere Anschlussleistung oder Einspeisebegrenzung anbieten, Speicher einplanen und den Ausbau mit dem Netzbetreiber terminieren.",
      hilfeEn: "Offer a lower connection capacity or feed-in limitation, plan storage and schedule the expansion with the grid operator.",
    },
  ],
  fristHinweis:
    "Für die Schweiz nennen wir keine konkreten Bearbeitungsfristen oder Kostenspannen: Dafür liegt uns noch kein geprüfter Wert vor. Maßgeblich sind die Werkvorschriften und Auskünfte Ihres Verteilnetzbetreibers.",
  fristHinweisEn:
    "For Switzerland we do not state specific processing deadlines or cost ranges: we do not yet have a verified figure for this. Your distribution system operator's utility regulations and information are decisive.",
  quellen: [
    { name: "VSE – Branchenempfehlungen / Werkvorschriften", url: "https://www.strom.ch" },
  ],
};

export const ABLAUF = Object.freeze({ de: DE, at: AT, ch: CH });

/** Alle Schritt-IDs eines Landes (oder aller Länder ohne Argument) */
export function schrittIds(land) {
  if (land) return (ABLAUF[land]?.schritte || []).map((x) => x.id);
  return ABLAUF_LAENDER.flatMap((l) => schrittIds(l));
}

/**
 * Ablauf-Status: erledigte Schritte abhaken, der erste offene ist „aktiv“.
 * @param {{ land?: "de"|"at"|"ch", erledigt?: string[] }} eingabe
 */
export function rechneAblauf({ land = "de", erledigt = [] } = {}) {
  const l = ABLAUF_LAENDER.includes(land) ? land : "de";
  const a = ABLAUF[l];
  const gueltig = new Set(schrittIds(l));
  const fertigSet = new Set((Array.isArray(erledigt) ? erledigt : []).filter((id) => gueltig.has(id)));
  let aktivGesetzt = false;
  const schritte = a.schritte.map((s0, i) => {
    let status = "offen";
    if (fertigSet.has(s0.id)) status = "erledigt";
    else if (!aktivGesetzt) {
      status = "aktiv";
      aktivGesetzt = true;
    }
    return { ...s0, nummer: i + 1, status };
  });
  const naechster = schritte.find((x) => x.status === "aktiv") || null;
  return {
    land: l,
    verfahren: a.verfahren,
    verfahrenEn: a.verfahrenEn,
    schritte,
    erledigt: schritte.filter((x) => x.status === "erledigt").map((x) => x.id),
    anzahl: schritte.length,
    anzahlErledigt: fertigSet.size,
    fortschritt: schritte.length ? fertigSet.size / schritte.length : 0,
    fertig: fertigSet.size === schritte.length,
    naechster,
    ablehnungen: a.ablehnungen,
    fristHinweis: a.fristHinweis,
    fristHinweisEn: a.fristHinweisEn,
    quellen: a.quellen,
  };
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/netzanschlussAblauf.js              */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, t) => ok || fehler.push(t);

  const alleIds = schrittIds();
  pruefe(new Set(alleIds).size === alleIds.length, "Schritt-IDs eindeutig über alle Länder");

  for (const land of ABLAUF_LAENDER) {
    const a = ABLAUF[land];
    pruefe(a.schritte.length >= 5, `${land}: mindestens 5 Schritte`);
    pruefe(a.ablehnungen.length >= 3, `${land}: mindestens 3 Ablehnungsgründe mit Hilfe`);
    for (const x of a.schritte) {
      pruefe(x.id.startsWith(`${land}-`), `${x.id}: ID beginnt mit Land`);
      pruefe(Boolean(x.titel && x.titelEn && x.text && x.textEn), `${x.id}: Texte de+en`);
      pruefe(x.dokumente.length >= 2 && x.dokumente.every((y) => y.de && y.en), `${x.id}: Dokumente de+en`);
    }
    for (const y of a.ablehnungen) pruefe(Boolean(y.grund && y.grundEn && y.hilfe && y.hilfeEn), `${land}: Ablehnung de+en`);
  }

  // Keine erfundenen Fristen: AT und CH ohne Zahlenfristen, dafür mit offenem Hinweis
  pruefe(Boolean(ABLAUF.at.fristHinweis && ABLAUF.ch.fristHinweis), "AT/CH: Frist-Hinweis statt Zahlen");
  pruefe(ABLAUF.at.schritte.every((x) => !x.frist) && ABLAUF.ch.schritte.every((x) => !x.frist), "AT/CH: keine Fristangaben je Schritt");
  // DE: belegte Frist aus dem Bestand (§ 8 Abs. 6 EEG, markt.js)
  pruefe(ABLAUF.de.schritte.some((x) => x.frist?.de.includes(`${PRUEF_WOCHEN} Wochen`)), "DE: Prüffrist aus FREIFLAECHE.netz.pruefWochen");

  const leer = rechneAblauf({ land: "de" });
  pruefe(leer.schritte[0].status === "aktiv" && leer.schritte.slice(1).every((x) => x.status === "offen"), "Start: Schritt 1 aktiv, Rest offen");
  pruefe(leer.fortschritt === 0 && !leer.fertig && leer.naechster?.id === "de-vorbereiten", "Start: Fortschritt 0");

  const halb = rechneAblauf({ land: "de", erledigt: ["de-vorbereiten", "de-begehren", "unsinn"] });
  pruefe(halb.anzahlErledigt === 2 && halb.naechster?.id === "de-pruefung", "ungültige IDs werden verworfen, nächster Schritt stimmt");
  pruefe(Math.abs(halb.fortschritt - 2 / 6) < 1e-9, "Fortschritt 2/6");

  const luecke = rechneAblauf({ land: "at", erledigt: ["at-antrag"] });
  pruefe(luecke.schritte[0].status === "aktiv" && luecke.schritte[1].status === "erledigt", "Lücken erlaubt: erster offener Schritt ist aktiv");

  const alle = rechneAblauf({ land: "ch", erledigt: schrittIds("ch") });
  pruefe(alle.fertig && alle.naechster === null && alle.fortschritt === 1, "alle erledigt → fertig");

  pruefe(rechneAblauf({ land: "fr" }).land === "de", "unbekanntes Land fällt auf DE zurück");
  return { fehler };
}

if (typeof process !== "undefined" && process.argv?.[1] && /netzanschlussAblauf\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler } = selbsttest();
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest netzanschlussAblauf.js: alle Prüfungen bestanden.");
}
