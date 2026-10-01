// src/lib/plattform/eg/vorlagen/mitglied.js
//
// WP5 – Musterverträge zwischen Gemeinschaft und Mitglied: Beitrittserklärung, Teilnahmevertrag (Bezug), Erzeugervertrag
// (Einbringung), Datenschutzinformation (Art. 13 DSGVO) und Nutzungsvertrag über eine Erzeugungsanlage.
// Grundlagen: Fachkonzept 2.4 (Verträge der Koordinationsstelle), 2.5 (Betrieb), 4.3/4.5 (Steuerstatus), ElWG §§ 68–71,
// EAG § 79/80, DSGVO Art. 6, 13, 15–21, 28; BAO § 132. MUSTER – keine Rechts- oder Steuerberatung.

const LIEFERANT_HINWEIS = "Die Gemeinschaft liefert nur die ihr zugeordnete Energie (Eigendeckung je Viertelstunde). Den restlichen Strombedarf deckt weiterhin der Stromlieferant des Mitglieds; überschüssige Erzeugung nimmt weiterhin der Energieabnehmer des Erzeugers ab (§ 71 Abs. 3 ElWG).";

export const BEITRITT = {
  id: "beitritt",
  kurz: "Beitrittserklärung",
  gruppe: "mitglied",
  titel: "Beitrittserklärung und Antrag auf Aufnahme",
  untertitel: "{{name}} – {{modellLabel}}",
  art: "beitritt",
  quelle: "Statuten der Gemeinschaft; ElWG §§ 66–68, 70; Fachkonzept 2.4",
  stand: "2026-10-01",
  nummerierung: "abschnitt",
  felder: [
    { id: "mitgliedName", label: "Name bzw. Firma", pflicht: true },
    { id: "mitgliedAnschrift", label: "Anschrift", pflicht: true },
    { id: "zaehlpunkt", label: "Zählpunktnummer", pflicht: true },
  ],
  abschnitte: [
    { titel: "Antragstellerin bzw. Antragsteller", absaetze: ["Name bzw. Firma: {{mitgliedName}}", "Anschrift: {{mitgliedAnschrift}}", "E-Mail: {{mitgliedEmail}}", "Zählpunkt(e): {{zaehlpunkt}}"] },
    {
      titel: "Erklärung",
      absaetze: [
        "Ich beantrage die Aufnahme als ordentliches Mitglied in die {{modellLabel}} „{{name}}“. Ich habe die Statuten erhalten und erkenne sie an.",
        { text: "Ich bestätige, dass ich zum Mitgliederkreis einer Erneuerbare-Energie-Gemeinschaft gehöre (natürliche Person, Gemeinde, sonstige juristische Person des öffentlichen Rechts oder kleines bzw. mittleres Unternehmen, bei dem die Teilnahme nicht die Haupttätigkeit ist). Großunternehmen sind ausgeschlossen (ElWG § 6 Abs. 1 Z 61).", wenn: "modell=eeg" },
        "Mir ist bekannt, dass der Netzbetreiber meine Teilnahme erst nach meiner Zustimmung in seinem Portal aktiviert. Ich stimme innerhalb der Frist des Netzbetreibers (derzeit 30 Tage ab Anfrage, zu bestätigen) zu.",
        "Ein Zählpunkt kann an bis zu fünf gemeinsamen Energienutzungen teilnehmen; die Teilnahmefaktoren aller Teilnahmen eines Zählpunkts betragen zusammen höchstens 100 % (§ 71 Abs. 5 ElWG). Weitere Teilnahmen gebe ich bekannt.",
        "Die Datenschutzinformation habe ich erhalten.",
      ],
    },
  ],
  unterschriften: ["Ort, Datum", "Unterschrift Antragsteller/in"],
};

export const TEILNAHMEVERTRAG = {
  id: "teilnahmevertrag",
  kurz: "Teilnahmevertrag (Bezug)",
  gruppe: "mitglied",
  titel: "Teilnahmevertrag über den Bezug von Gemeinschaftsstrom",
  untertitel: "zwischen der {{modellLabel}} „{{name}}“ und {{mitgliedName}}",
  art: "teilnahmevertrag",
  quelle: "ElWG §§ 68–71 (bei über 100 kW zusätzlich § 69 mit §§ 20, 21, 42); Fachkonzept 2.4, 2.5; Muster der Koordinationsstelle",
  stand: "2026-10-01",
  nummerierung: "paragraph",
  felder: [
    { id: "mitgliedName", label: "Mitglied", pflicht: true },
    { id: "zaehlpunkt", label: "Zählpunkt (Verbrauch)", pflicht: true },
    { id: "bezugspreisCt", label: "Bezugspreis netto", pflicht: true },
    { id: "teilnahmefaktor", label: "Teilnahmefaktor (%)" },
  ],
  abschnitte: [
    {
      titel: "Vertragspartner und Gegenstand",
      absaetze: [
        "Dieser Vertrag regelt die Teilnahme des Mitglieds {{mitgliedName}} (Mitgliedsnummer {{mitgliedsnummer}}) mit dem Zählpunkt {{zaehlpunkt}} an der gemeinsamen Energienutzung der {{modellLabel}} „{{name}}“.",
        LIEFERANT_HINWEIS,
        "Der Zählpunkt nimmt mit einem Teilnahmefaktor von {{teilnahmefaktor}} % teil. Die Aufteilung erfolgt nach dem {{verteilmodell}}en Verteilmodell; die Zuordnung je Viertelstunde berechnet der Netzbetreiber.",
      ],
    },
    {
      titel: "Preis",
      absaetze: [
        "Für die zugeordnete Energie bezahlt das Mitglied den jeweils gültigen Bezugspreis laut Preisblatt, derzeit {{bezugspreisCt}} netto (gültig ab {{tarifAb}}), zuzüglich Umsatzsteuer, sofern die Gemeinschaft umsatzsteuerpflichtig ist.",
        { text: "Mitgliedsbeitrag: {{mitgliedsbeitrag}}. Beitrittsgebühr: {{beitrittsgebuehr}}.", wenn: "mitgliedsbeitrag" },
        "Netzentgelte, Abgaben und eine allfällige Reduktion des Netzentgelts rechnet der Netzbetreiber auf der Netzrechnung ab; sie sind nicht Teil dieses Preises.",
      ],
    },
    {
      titel: "Abrechnung und Zahlung",
      absaetze: [
        "Die Gemeinschaft rechnet {{abrechnungsrhythmus}} auf Basis der vom Netzbetreiber übermittelten Viertelstundenwerte ab, frühestens nach deren Bereitstellung. Rechnungen werden über das Mitgliederportal bzw. per E-Mail zugestellt.",
        { text: "Das Mitglied kann zwischen einer monatlichen und einer jährlichen Rechnung wählen. Die Rechnung ist mindestens einmal jährlich kostenlos, enthält die Zählpunktbezeichnung und wird auf Verlangen erläutert (§ 69 ElWG).", wenn: "lieferantenpflicht" },
        "Fällige Beträge werden per SEPA-Lastschrift eingezogen, sofern ein Mandat erteilt wurde, andernfalls sind sie binnen 14 Tagen zu überweisen.",
      ],
    },
    {
      titel: "Mitwirkung des Mitglieds",
      absaetze: [
        "Das Mitglied stimmt der Teilnahme im Portal des Netzbetreibers zu und hält die Freigabe der Viertelstundenwerte aufrecht. Für die Teilnahme ist ein intelligentes Messgerät mit Viertelstundenwerten nötig.",
        "Das Mitglied teilt Änderungen (Auszug, Lieferantenwechsel, weitere Teilnahmen des Zählpunkts, Bankverbindung) unverzüglich mit.",
      ],
    },
    {
      titel: "Preisänderungen",
      absaetze: [
        { text: "Änderungen des Preises teilt die Gemeinschaft mindestens einen Monat vor Wirksamkeit in verständlicher Form mit; das Mitglied kann den Vertrag bis zum Inkrafttreten kostenlos kündigen (§§ 21, 69 ElWG).", wenn: "lieferantenpflicht" },
        { text: "Änderungen des Preises beschließt das zuständige Organ; sie werden mindestens vier Wochen vor Wirksamkeit mitgeteilt. Das Mitglied kann den Vertrag bis zum Inkrafttreten kündigen.", wenn: "!lieferantenpflicht" },
      ],
    },
    {
      titel: "Laufzeit und Kündigung",
      absaetze: [
        "Der Vertrag beginnt mit der Aktivierung des Zählpunkts durch den Netzbetreiber und läuft auf unbestimmte Zeit. Er kann von beiden Seiten mit einer Frist von {{kuendigungsfristWochen}} Wochen zum Monatsende gekündigt werden.",
        "Die Gemeinschaft meldet den Zählpunkt zum Vertragsende beim Netzbetreiber ab; eine rückwirkende Abmeldung ist nicht möglich. Ein Widerruf im Portal des Netzbetreibers beendet die Teilnahme ebenfalls.",
        "Der Vertrag endet jedenfalls mit dem Ende der Mitgliedschaft.",
      ],
    },
    {
      titel: "Haftung",
      absaetze: ["Die Gemeinschaft schuldet keine bestimmte Liefermenge; die Versorgungssicherheit gewährleistet der Stromlieferant des Mitglieds. Die Haftung der Gemeinschaft ist – außer bei Vorsatz, grober Fahrlässigkeit und Personenschäden – auf den typischerweise vorhersehbaren Schaden begrenzt."],
    },
    {
      titel: "Vertragsbestandteile, Datenschutz",
      absaetze: [
        "Bestandteile dieses Vertrags sind die Statuten, das Preisblatt und die Datenschutzinformation.",
        { text: "Weiters gelten die Allgemeinen Lieferbedingungen; das Informationsblatt hat das Mitglied vor Vertragsabschluss erhalten (§ 69 Abs. 1 ElWG).", wenn: "lieferantenpflicht" },
        "Es gilt österreichisches Recht. Für Verbraucher bleiben die zwingenden Bestimmungen des Konsumentenschutzgesetzes unberührt.",
      ],
    },
  ],
  unterschriften: ["Ort, Datum, für die Gemeinschaft", "Ort, Datum, Mitglied"],
};

export const ERZEUGERVERTRAG = {
  id: "erzeugervertrag",
  kurz: "Erzeugervertrag (Einbringung)",
  gruppe: "mitglied",
  titel: "Erzeugervertrag über die Einbringung von Energie",
  untertitel: "zwischen der {{modellLabel}} „{{name}}“ und {{mitgliedName}}",
  art: "erzeugervertrag",
  quelle: "ElWG §§ 68, 71 Abs. 3 und 5; EAG § 80; UStG 1994 §§ 6 Abs. 1 Z 27, 19, 22 (laut Fachkonzept 4.5, zu bestätigen); Fachkonzept 2.4",
  stand: "2026-10-01",
  nummerierung: "paragraph",
  felder: [
    { id: "mitgliedName", label: "Erzeuger", pflicht: true },
    { id: "zaehlpunkt", label: "Zählpunkt (Erzeugung)", pflicht: true },
    { id: "anlageBezeichnung", label: "Anlage", pflicht: true },
    { id: "anlageKwp", label: "Leistung kWp", pflicht: true },
    { id: "einspeisepreisCt", label: "Einspeisepreis netto", pflicht: true },
    { id: "steuerstatusText", label: "Steuerlicher Status des Erzeugers" },
  ],
  abschnitte: [
    {
      titel: "Gegenstand",
      absaetze: [
        "Das Mitglied {{mitgliedName}} bringt Energie aus der Anlage „{{anlageBezeichnung}}“ ({{anlageKwp}} kWp) über den Erzeugungszählpunkt {{zaehlpunkt}} in die gemeinsame Energienutzung der {{modellLabel}} „{{name}}“ ein.",
        { text: "Eingebracht wird nur der Überschuss, der nicht selbst verbraucht wird (Überschusseinspeisung).", wenn: "nutzungsmodell=ueberschuss" },
        { text: "Eingebracht wird die gesamte Erzeugung (Volleinspeisung).", wenn: "nutzungsmodell=volleinspeisung" },
        "Der Zählpunkt nimmt mit einem Teilnahmefaktor von {{teilnahmefaktor}} % teil. Nicht zugeordnete Erzeugung (Restüberschuss) übernimmt weiterhin der Energieabnehmer des Erzeugers (§ 71 Abs. 3 ElWG).",
      ],
    },
    {
      titel: "Vergütung",
      absaetze: [
        "Die Gemeinschaft vergütet die den Mitgliedern zugeordnete Energie mit dem Einspeisepreis laut Preisblatt, derzeit {{einspeisepreisCt}} netto (gültig ab {{tarifAb}}).",
        "Die Abrechnung erfolgt per Gutschrift {{abrechnungsrhythmus}} auf Basis der Werte des Netzbetreibers.",
        "Steuerlicher Status laut Angabe des Erzeugers: {{steuerstatusText}}. Bei regelbesteuerten Erzeugern geht die Steuerschuld nach derzeitigem Stand auf die Gemeinschaft über (Reverse Charge); pauschalierte Landwirte weisen 13 % aus (§ 22 UStG, zu bestätigen). Der Erzeuger meldet Änderungen seines Status unverzüglich. Keine Steuerberatung.",
      ],
    },
    {
      titel: "Betrieb und Förderung",
      absaetze: [
        "Errichtung, Betrieb, Wartung und Versicherung der Anlage obliegen dem Erzeuger. Er informiert die Gemeinschaft über Stillstände von mehr als einer Woche.",
        "Bezieht die Anlage eine Marktprämie nach dem EAG, gilt diese nur für die nicht in der Gemeinschaft verbrauchte Energie; der Erzeuger ist für die Einhaltung der Förderbedingungen verantwortlich (EAG § 80, zu bestätigen).",
      ],
    },
    {
      titel: "Mehrfachteilnahme",
      absaetze: ["Der Erzeugungszählpunkt kann an bis zu fünf gemeinsamen Energienutzungen teilnehmen. Die Summe der Teilnahmefaktoren beträgt höchstens 100 %; Änderungen des Teilnahmefaktors sind derzeit einmal je Tag möglich (§ 71 Abs. 5 ElWG)."],
    },
    {
      titel: "Laufzeit und Kündigung",
      absaetze: [
        "Der Vertrag beginnt mit der Aktivierung des Zählpunkts und läuft auf unbestimmte Zeit. Kündigung beiderseits mit {{kuendigungsfristWochen}} Wochen zum Monatsende; die Abmeldung beim Netzbetreiber ist nicht rückwirkend möglich.",
        "Bestandteile sind die Statuten, das Preisblatt und die Datenschutzinformation. Es gilt österreichisches Recht.",
      ],
    },
  ],
  unterschriften: ["Ort, Datum, für die Gemeinschaft", "Ort, Datum, Erzeuger"],
};

export const DATENSCHUTZ = {
  id: "datenschutz",
  kurz: "Datenschutzinformation (Art. 13 DSGVO)",
  gruppe: "mitglied",
  titel: "Datenschutzinformation für Mitglieder",
  untertitel: "{{name}} – Information nach Art. 13 DSGVO",
  art: "datenschutz",
  quelle: "DSGVO Art. 6, 13, 15–21, 28; ElWG §§ 70, 71; BAO § 132",
  stand: "2026-10-01",
  nummerierung: "abschnitt",
  felder: [
    { id: "name", label: "Verantwortlicher", pflicht: true },
    { id: "datenschutzKontakt", label: "Kontakt für Datenschutzanfragen", pflicht: true },
  ],
  abschnitte: [
    { titel: "Verantwortlicher", absaetze: ["Verantwortlich ist die {{modellLabel}} „{{name}}“, {{sitzAdresse}}. Kontakt für Datenschutzanfragen: {{datenschutzKontakt}}."] },
    {
      titel: "Zwecke und Rechtsgrundlagen",
      absaetze: [
        {
          liste: [
            "Mitgliederverwaltung, Verträge, Kommunikation (Art. 6 Abs. 1 lit. b DSGVO),",
            "Anmeldung und Abmeldung der Zählpunkte beim Netzbetreiber, Empfang der Viertelstundenwerte über die EDA-Plattform, Zuordnung und Abrechnung (Art. 6 Abs. 1 lit. b DSGVO in Verbindung mit §§ 70 und 71 ElWG),",
            "Buchhaltung, Steuer und Aufbewahrung (Art. 6 Abs. 1 lit. c DSGVO, § 132 BAO),",
            "Auswertungen und Prognosen über die Abrechnung hinaus nur mit Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die jederzeit widerrufen werden kann.",
          ],
        },
      ],
    },
    {
      titel: "Empfänger",
      absaetze: [
        "Netzbetreiber und EDA-Plattform (Marktkommunikation), Banken (Zahlungsverkehr), Steuerberatung und Rechnungsprüfung, Behörden auf Verlangen (§ 70 Abs. 4 ElWG).",
        { text: "{{organisatorName}}, {{organisatorAnschrift}}, als Organisator und Auftragsverarbeiter (Art. 28 DSGVO) mit Datenhaltung in der Europäischen Union.", wenn: "organisator" },
      ],
    },
    {
      titel: "Zweckbindung der Viertelstundenwerte",
      absaetze: ["Einzelne Viertelstundenwerte werden nur für Zuordnung, Abrechnung und Plausibilisierung verwendet. Die Organe sehen grundsätzlich zusammengefasste Werte; jede Einsicht in Einzelwerte wird protokolliert."],
    },
    {
      titel: "Speicherdauer",
      absaetze: ["Stammdaten für die Dauer der Mitgliedschaft, danach so lange Ansprüche geltend gemacht werden können; buchhaltungsrelevante Unterlagen sieben Jahre (§ 132 BAO)."],
    },
    {
      titel: "Ihre Rechte",
      absaetze: ["Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie auf Beschwerde bei der Österreichischen Datenschutzbehörde. Eine automatisierte Entscheidungsfindung findet nicht statt."],
    },
  ],
  unterschriften: [],
};

export const PACHTVERTRAG = {
  id: "pachtvertrag",
  kurz: "Nutzungsvertrag Erzeugungsanlage",
  gruppe: "mitglied",
  titel: "Nutzungsvertrag über eine Erzeugungsanlage",
  untertitel: "zwischen {{mitgliedName}} (Eigentümer) und der {{modellLabel}} „{{name}}“",
  art: "pacht",
  modelle: ["eeg", "beg", "gea"],
  quelle: "ABGB §§ 1090 ff.; GebG § 33 TP 5 (Rechtsgeschäftsgebühr, Formular Geb 1, laut EEG-Ratgeber Steuern, zu bestätigen); Fachkonzept 2.3",
  stand: "2026-10-01",
  nummerierung: "paragraph",
  felder: [
    { id: "anlageBezeichnung", label: "Anlage", pflicht: true },
    { id: "anlageKwp", label: "Leistung kWp", pflicht: true },
    { id: "pachtzins", label: "Entgelt pro Jahr", pflicht: true },
  ],
  abschnitte: [
    { titel: "Gegenstand", absaetze: ["Der Eigentümer überlässt der Gemeinschaft die Anlage „{{anlageBezeichnung}}“ ({{anlageKwp}} kWp) zur Nutzung. Die erzeugte Energie steht der Gemeinschaft zu."] },
    { titel: "Entgelt", absaetze: ["Das Nutzungsentgelt beträgt {{pachtzins}} pro Jahr und ist jeweils zum Jahresende fällig."] },
    { titel: "Betrieb und Instandhaltung", absaetze: ["Wartung, Versicherung und Instandhaltung trägt, soweit nicht anders vereinbart, der Eigentümer. Die Gemeinschaft meldet Störungen unverzüglich."] },
    { titel: "Gebühren", absaetze: ["Für Bestandverträge kann eine Rechtsgeschäftsgebühr anfallen, die selbst zu berechnen und mit Formular Geb 1 anzuzeigen ist (zu bestätigen). Keine Steuerberatung."] },
    { titel: "Dauer", absaetze: ["Der Vertrag wird auf {{laufzeitJahre}} Jahre geschlossen und verlängert sich jeweils um ein Jahr, wenn er nicht sechs Monate vor Ablauf gekündigt wird."] },
  ],
  unterschriften: ["Ort, Datum, Eigentümer", "Ort, Datum, für die Gemeinschaft"],
};
