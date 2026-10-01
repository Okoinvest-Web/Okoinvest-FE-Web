// src/lib/plattform/eg/vorlagen/lieferant.js
//
// WP5 – Lieferantenpflichten nach § 69 ElWG (Erzeugungsleistung über 100 kW bzw. Haushalte über 30 kW): Allgemeine
// Lieferbedingungen und Informationsblatt vor Vertragsabschluss. Pflichten laut Fachkonzept 0 (Punkt 4), 2.4, 2.5, 6.1
// (Punkt 8): AGB (§ 69 Abs. 1 Z 1 mit § 20), Informationsblatt (Z 2), Rechnung nach § 42 mit Pflichtinhalten (Z 4–6),
// Wahl Monats-/Jahresrechnung (Abs. 3), Änderungsinformation (§ 21). Diese Pflichten kann der Organisator übernehmen
// (§ 68 Abs. 2, § 69 Abs. 4). Muster der Koordinationsstelle „Allgemeine Lieferbedingungen“. MUSTER.

export const AGB = {
  id: "agb",
  kurz: "Allgemeine Lieferbedingungen (§ 69)",
  gruppe: "lieferant",
  titel: "Allgemeine Lieferbedingungen der „{{name}}“",
  untertitel: "für die Lieferung von Gemeinschaftsstrom an Mitglieder – nach § 69 Abs. 1 Z 1 ElWG",
  art: "agb",
  quelle: "ElWG § 69 Abs. 1 Z 1–6 und Abs. 3, §§ 20, 21, 42; Muster „Allgemeine Lieferbedingungen“ der Koordinationsstelle (zu bestätigen)",
  stand: "2026-10-01",
  nummerierung: "paragraph",
  felder: [
    { id: "name", label: "Gemeinschaft", pflicht: true },
    { id: "bezugspreisCt", label: "Bezugspreis netto", pflicht: true },
    { id: "beschwerdeKontakt", label: "Kontakt für Beschwerden", pflicht: true },
  ],
  abschnitte: [
    {
      titel: "Geltungsbereich",
      absaetze: [
        "Diese Bedingungen gelten für die Lieferung der den Mitgliedern im Rahmen der gemeinsamen Energienutzung zugeordneten Energie durch die {{modellLabel}} „{{name}}“ (im Folgenden „Gemeinschaft“).",
        "Die Gemeinschaft liefert nur die ihr je Viertelstunde zugeordnete Energie (Eigendeckung). Die Vollversorgung bleibt beim Stromlieferanten des Mitglieds.",
        { text: "Die Pflichten nach § 69 ElWG nimmt für die Gemeinschaft der Organisator {{organisatorName}}, {{organisatorAnschrift}}, wahr (§ 68 Abs. 2, § 69 Abs. 4 ElWG).", wenn: "organisator" },
      ],
    },
    { titel: "Vertragsabschluss", absaetze: ["Vor Vertragsabschluss erhält das Mitglied das Informationsblatt und diese Bedingungen. Der Vertrag kommt mit Annahme der Beitrittserklärung bzw. des Teilnahmevertrags zustande und wird mit der Aktivierung des Zählpunkts durch den Netzbetreiber wirksam."] },
    {
      titel: "Preise und Preisänderungen",
      absaetze: [
        "Es gilt der Bezugspreis laut Preisblatt, derzeit {{bezugspreisCt}} netto zuzüglich gesetzlicher Steuern. Netzentgelte und Abgaben sind nicht enthalten.",
        "Preisänderungen werden dem Mitglied mindestens einen Monat vor ihrer Wirksamkeit schriftlich bzw. elektronisch in verständlicher Form mitgeteilt, mit Anlass, Umfang und Hinweis auf das Kündigungsrecht (§ 21 ElWG). Das Mitglied kann bis zum Inkrafttreten kostenlos kündigen.",
      ],
    },
    {
      titel: "Rechnung",
      absaetze: [
        "Das Mitglied kann zwischen einer monatlichen Rechnung und einer Jahresrechnung wählen (§ 69 Abs. 3 ElWG). Eine Rechnung wird mindestens einmal jährlich kostenlos ausgestellt.",
        "Die Rechnung enthält mindestens Rechnungsbetrag, Fälligkeit, die abgerechneten Energiewerte, Name und Anschrift des Vertragspartners mit Kontaktadresse und die Bezeichnung der Zählpunkte (§ 69 Abs. 1 Z 4 ElWG). Auf Verlangen wird die Rechnung kostenlos erläutert.",
      ],
    },
    {
      titel: "Zahlung und Verzug",
      absaetze: [
        "Rechnungsbeträge sind binnen 14 Tagen ab Zugang fällig bzw. werden per SEPA-Lastschrift eingezogen.",
        "Bei Zahlungsverzug erinnert die Gemeinschaft zunächst kostenlos. Mahnspesen werden höchstens in Höhe der tatsächlich entstandenen, angemessenen Kosten verrechnet. Vor einer Beendigung wegen Zahlungsverzugs wird das Mitglied unter Setzung einer Nachfrist von mindestens zwei Wochen schriftlich gewarnt; schutzbedürftige Haushalte werden auf Beratungsangebote hingewiesen.",
      ],
    },
    { titel: "Laufzeit und Kündigung", absaetze: ["Der Vertrag läuft auf unbestimmte Zeit und ist mit {{kuendigungsfristWochen}} Wochen zum Monatsende kündbar. Die Abmeldung beim Netzbetreiber erfolgt zum Vertragsende und ist nicht rückwirkend möglich."] },
    {
      titel: "Beschwerden und Streitbeilegung",
      absaetze: [
        "Beschwerden richtet das Mitglied an {{beschwerdeKontakt}}. Die Gemeinschaft beantwortet sie binnen vier Wochen.",
        "Unbeschadet der Zuständigkeit der Gerichte kann das Mitglied Streit- oder Beschwerdefälle der Schlichtungsstelle der E-Control vorlegen (zu bestätigen).",
      ],
    },
    { titel: "Datenschutz", absaetze: ["Für die Verarbeitung personenbezogener Daten gilt die Datenschutzinformation der Gemeinschaft."] },
    { titel: "Änderungen dieser Bedingungen", absaetze: ["Änderungen dieser Bedingungen werden wie Preisänderungen mindestens einen Monat vor Wirksamkeit mitgeteilt; das Mitglied kann bis dahin kostenlos kündigen."] },
  ],
  unterschriften: [],
};

export const INFORMATIONSBLATT = {
  id: "informationsblatt",
  kurz: "Informationsblatt (§ 69)",
  gruppe: "lieferant",
  titel: "Informationsblatt vor Vertragsabschluss",
  untertitel: "{{name}} – nach § 69 Abs. 1 Z 2 ElWG",
  art: "informationsblatt",
  quelle: "ElWG § 69 Abs. 1 Z 2, §§ 68, 71; Fachkonzept 1.2, 2.4",
  stand: "2026-10-01",
  nummerierung: "abschnitt",
  felder: [
    { id: "name", label: "Gemeinschaft", pflicht: true },
    { id: "bezugspreisCt", label: "Bezugspreis netto", pflicht: true },
  ],
  abschnitte: [
    { titel: "Wer liefert?", absaetze: ["Ihr Vertragspartner ist die {{modellLabel}} „{{name}}“, {{sitzAdresse}}.", { text: "Organisator: {{organisatorName}}, {{organisatorAnschrift}}.", wenn: "organisator" }] },
    { titel: "Was wird geliefert?", absaetze: ["Sie erhalten je Viertelstunde einen Anteil an der Erzeugung der Gemeinschaft, höchstens so viel, wie Sie in dieser Viertelstunde verbrauchen. Den übrigen Strom liefert weiterhin Ihr Stromlieferant – Sie wechseln ihn nicht."] },
    { titel: "Was kostet es?", absaetze: ["Bezugspreis: {{bezugspreisCt}} netto. {{mitgliedsbeitrag}}", "Die Netzentgelt-Reduktion bzw. Abgabenbefreiung (nur bestimmte Modelle) erscheint auf Ihrer Netzrechnung. Ab 01.01.2027 richtet sich die Reduktion nach dem Nahebereich (neue Systemnutzungsentgelte-Verordnung, Höhe noch offen, zu bestätigen)."] },
    { titel: "Wie wird abgerechnet?", absaetze: ["Sie wählen zwischen monatlicher Rechnung und Jahresrechnung. Mindestens einmal jährlich erhalten Sie kostenlos eine Rechnung; auf Wunsch wird sie erläutert."] },
    { titel: "Was müssen Sie tun?", absaetze: ["Nach dem Beitritt meldet die Gemeinschaft Ihren Zählpunkt beim Netzbetreiber an. Sie stimmen im Portal Ihres Netzbetreibers zu (Frist derzeit 30 Tage, zu bestätigen). Ein Smart Meter mit Viertelstundenwerten ist Voraussetzung."] },
    { titel: "Wie kommen Sie wieder heraus?", absaetze: ["Kündigung mit {{kuendigungsfristWochen}} Wochen zum Monatsende. Preisänderungen werden mindestens einen Monat vorher angekündigt; Sie können dann kostenlos kündigen."] },
    { titel: "Mehrfachteilnahme", absaetze: ["Ihr Zählpunkt kann an bis zu fünf Gemeinschaften teilnehmen; die Teilnahmefaktoren betragen zusammen höchstens 100 % (§ 71 Abs. 5 ElWG)."] },
  ],
  unterschriften: [],
};
