// src/lib/plattform/eg/vorlagen/organisator.js
//
// WP5 – Dokumente zwischen Gemeinschaft und ÖkoInvest: Angebot/Auftrag Gründungsdienstleistung (Unterschrift über das
// Signatur-Modul), Bestellung und Vollmacht des Organisators (§ 68 Abs. 2 ElWG), Anzeige an den Netzbetreiber,
// Auftragsverarbeitungsvertrag (Art. 28 DSGVO). Fachkonzept 2.3 (Organisator-Anzeige), 2.6 (Mandat), 3.15. MUSTER.

export const GRUENDUNGSAUFTRAG = {
  id: "gruendungsauftrag",
  kurz: "Angebot und Auftrag",
  gruppe: "auftrag",
  titel: "Angebot und Auftrag „{{paketLabel}}“",
  untertitel: "Angebot {{angebotNummer}} der {{organisatorName}} für {{auftraggeberName}}",
  art: "auftrag",
  quelle: "Fachkonzept 3.15 (Gründungsauftrag); Signatur: einfache elektronische Signatur (eIDAS Art. 3 Nr. 10)",
  stand: "2026-10-01",
  nummerierung: "paragraph",
  felder: [
    { id: "auftraggeberName", label: "Auftraggeber", pflicht: true },
    { id: "paketLabel", label: "Leistungspaket", pflicht: true },
    { id: "angebotNetto", label: "Honorar netto", pflicht: true },
    { id: "angebotGueltigBis", label: "Angebot gültig bis", pflicht: true },
  ],
  abschnitte: [
    { titel: "Vertragspartner", absaetze: ["Auftragnehmer: {{organisatorName}}, {{organisatorAnschrift}}, {{organisatorFirmenbuch}}.", "Auftraggeber: {{auftraggeberName}}, {{auftraggeberAnschrift}}.", "Vorhaben: {{name}} ({{modellLabel}})."] },
    { titel: "Leistungen", absaetze: ["Der Auftragnehmer erbringt folgende Leistungen: {{leistungenText}}.", "Der Fortschritt, Fristen und Nachweise sind für den Auftraggeber jederzeit im Portal einsehbar."] },
    { titel: "Mitwirkung des Auftraggebers", absaetze: ["Der Auftraggeber stellt die erforderlichen Angaben und Unterlagen (Interessentenliste, Zählpunkte, Ausweise der Organe, Beschlüsse) rechtzeitig bereit und unterzeichnet Anträge und Erklärungen, die eine persönliche Unterschrift der Organe erfordern."] },
    {
      titel: "Honorar",
      absaetze: [
        "Das Honorar beträgt {{angebotNetto}} netto zuzüglich 20 % Umsatzsteuer ({{angebotUst}}), gesamt {{angebotBrutto}}.",
        "Behördliche Gebühren, Kosten des Netzbetreibers, der EDA-Plattform, notarieller Beurkundungen und einer anwaltlichen bzw. steuerlichen Prüfung sind nicht enthalten.",
        "Das Angebot ist gültig bis {{angebotGueltigBis}}.",
      ],
    },
    {
      titel: "Keine Rechts- und Steuerberatung",
      absaetze: ["Statuten, Verträge und Formularhilfen sind Muster auf Grundlage öffentlicher Vorlagen der Koordinationsstelle für Energiegemeinschaften. Sie ersetzen keine Rechts- oder Steuerberatung; der Auftragnehmer empfiehlt die Prüfung durch eine befugte Stelle und vermittelt diese auf Wunsch."],
    },
    { titel: "Datenschutz", absaetze: ["Soweit der Auftragnehmer personenbezogene Daten von Interessenten und Mitgliedern verarbeitet, schließen die Parteien einen Auftragsverarbeitungsvertrag nach Art. 28 DSGVO."] },
    { titel: "Kündigung und Schlussbestimmungen", absaetze: ["Der Auftrag kann von beiden Seiten aus wichtigem Grund jederzeit beendet werden; bis dahin erbrachte Leistungen werden anteilig abgerechnet.", "Es gilt österreichisches Recht. Zwingende Bestimmungen zugunsten von Verbrauchern bleiben unberührt."] },
  ],
  unterschriften: ["Ort, Datum, Auftraggeber", "Ort, Datum, {{organisatorName}}"],
};

export const VOLLMACHT_ORGANISATOR = {
  id: "vollmacht_organisator",
  kurz: "Bestellung und Vollmacht Organisator",
  gruppe: "organisator",
  titel: "Bestellung und Vollmacht des Organisators",
  untertitel: "nach § 68 Abs. 2 ElWG – {{name}}",
  art: "vollmacht",
  quelle: "ElWG § 68 Abs. 2, § 69 Abs. 4, § 70 Abs. 2; Fachkonzept 1.1, 2.3, 2.6",
  stand: "2026-10-01",
  nummerierung: "paragraph",
  felder: [
    { id: "name", label: "Gemeinschaft", pflicht: true },
    { id: "marktpartnerId", label: "Marktpartner-ID" },
    { id: "ab", label: "Wirksam ab" },
  ],
  abschnitte: [
    { titel: "Bestellung", absaetze: ["Die {{modellLabel}} „{{name}}“ (Marktpartner-ID {{marktpartnerId}}) bestellt die {{organisatorName}}, {{organisatorAnschrift}}, {{organisatorFirmenbuch}}, ab {{abDe}} als Organisator im Sinne des § 68 Abs. 2 ElWG."] },
    {
      titel: "Umfang",
      absaetze: [
        "Der Organisator ist bevollmächtigt:",
        {
          liste: [
            "die Kommunikation mit dem Netzbetreiber im Namen der Gemeinschaft zu führen und die Marktprozesse über die EDA-Plattform mit der Marktpartner-ID der Gemeinschaft abzuwickeln (An- und Abmeldung, Teilnahmefaktor, Zählpunktliste, Datenanforderung),",
            "Verträge mit Mitgliedern nach den Beschlüssen der Gemeinschaft vorzubereiten und abzuschließen und die Abrechnung durchzuführen,",
            { text: "die Pflichten nach § 69 ElWG (Allgemeine Lieferbedingungen, Informationsblatt, Rechnungen, Änderungsinformationen) für die Gemeinschaft zu erfüllen (§ 69 Abs. 4 ElWG),", wenn: "lieferantenpflicht" },
            "Daten der Mitglieder als Auftragsverarbeiter zu verarbeiten.",
          ],
        },
        "Der Organisator ist kein eigener Marktteilnehmer; die Marktpartner-ID bleibt bei der Gemeinschaft. Freigaben, die nach den Statuten Organen vorbehalten sind (insbesondere Abrechnungsfreigabe, Zahlungsdateien, Aufnahme von Mitgliedern), bleiben bei den Organen.",
      ],
    },
    { titel: "Anzeige", absaetze: ["Die Bestellung wird dem Netzbetreiber angezeigt. Ab der Anzeige informiert der Netzbetreiber nur noch den Organisator (§ 70 Abs. 2 ElWG)."] },
    { titel: "Dauer und Widerruf", absaetze: ["Die Vollmacht gilt bis auf Widerruf. Ein Widerruf ist dem Netzbetreiber anzuzeigen; der Organisator übergibt bei Beendigung alle Daten in einem gängigen Format."] },
  ],
  unterschriften: ["Ort, Datum, für die Gemeinschaft (Obfrau/Obmann)", "Ort, Datum, zweite zeichnungsberechtigte Person", "Annahme: {{organisatorName}}"],
};

export const ORGANISATOR_ANZEIGE = {
  id: "organisator_anzeige",
  kurz: "Anzeige an den Netzbetreiber",
  gruppe: "organisator",
  titel: "Anzeige der Bestellung eines Organisators",
  untertitel: "an {{netzbetreiberName}} – nach § 68 Abs. 2 ElWG",
  art: "anzeige",
  quelle: "ElWG § 68 Abs. 2 letzter Satz, § 70 Abs. 2; Fachkonzept 2.3",
  stand: "2026-10-01",
  nummerierung: "keine",
  felder: [
    { id: "netzbetreiberName", label: "Netzbetreiber", pflicht: true },
    { id: "gemeinschaftsId", label: "Gemeinschafts-ID", pflicht: true },
    { id: "marktpartnerId", label: "Marktpartner-ID", pflicht: true },
  ],
  abschnitte: [
    { titel: "Betreff: Anzeige des Organisators", absaetze: ["Sehr geehrte Damen und Herren,", "die {{modellLabel}} „{{name}}“ (Gemeinschafts-ID {{gemeinschaftsId}}, Marktpartner-ID {{marktpartnerId}}) zeigt hiermit an, dass sie die {{organisatorName}}, {{organisatorAnschrift}}, ab {{abDe}} als Organisator im Sinne des § 68 Abs. 2 ElWG bestellt hat.", "Wir ersuchen, Informationen zur gemeinsamen Energienutzung ab diesem Zeitpunkt an den Organisator zu richten (§ 70 Abs. 2 ElWG). Die Vollmacht liegt bei.", "Mit freundlichen Grüßen"] },
  ],
  unterschriften: ["Für die Gemeinschaft", "Organisator"],
};

export const AVV = {
  id: "avv",
  kurz: "Auftragsverarbeitungsvertrag (Art. 28 DSGVO)",
  gruppe: "organisator",
  titel: "Vertrag über die Auftragsverarbeitung",
  untertitel: "nach Art. 28 DSGVO – {{name}} und {{organisatorName}}",
  art: "avv",
  quelle: "DSGVO Art. 28, 32, 33; Fachkonzept 2.6 (Mandat)",
  stand: "2026-10-01",
  nummerierung: "paragraph",
  felder: [{ id: "name", label: "Verantwortlicher", pflicht: true }],
  abschnitte: [
    { titel: "Gegenstand", absaetze: ["Der Auftragsverarbeiter {{organisatorName}} verarbeitet im Auftrag der {{modellLabel}} „{{name}}“ (Verantwortlicher) personenbezogene Daten für Mitgliederverwaltung, Marktkommunikation über die EDA-Plattform, Energiedaten, Abrechnung, Zahlungsverkehr und Kommunikation."] },
    { titel: "Daten und Betroffene", absaetze: ["Betroffen sind Mitglieder, Interessenten und Ansprechpersonen. Verarbeitet werden Stamm- und Kontaktdaten, Zählpunkte, Viertelstundenwerte, Vertrags-, Abrechnungs- und Bankdaten."] },
    { titel: "Pflichten des Auftragsverarbeiters", absaetze: [{ liste: ["Verarbeitung nur auf dokumentierte Weisung,", "Vertraulichkeit aller befugten Personen,", "technische und organisatorische Maßnahmen nach Art. 32 DSGVO, insbesondere Rollen- und Rechtekonzept, Protokollierung, Verschlüsselung und Datenhaltung in der Europäischen Union,", "weitere Auftragsverarbeiter nur nach vorheriger Information mit Widerspruchsrecht,", "Unterstützung bei Betroffenenrechten und Meldungen nach Art. 33 DSGVO,", "Rückgabe bzw. Löschung nach Vertragsende, soweit keine Aufbewahrungspflicht besteht,", "Nachweise und Kontrollen auf Anfrage."] }] },
    { titel: "Dauer", absaetze: ["Der Vertrag gilt für die Dauer der Dienstleistung."] },
  ],
  unterschriften: ["Verantwortlicher", "Auftragsverarbeiter"],
};
