// src/lib/plattform/eg/vorlagen/verein.js
//
// WP5 – Vereinsorganisation und Wechsel: Protokoll der Gründungsversammlung, Mitgliederinformation zum Wechsel des
// Dienstleisters (Fachkonzept 2.6) und Information/Nachtrag zur Anpassung an das ElWG (Fachkonzept 2.6 Punkt 6;
// Koordinationsstelle „Änderungen für bestehende Energiegemeinschaften“). MUSTER.

export const GRUENDUNGSPROTOKOLL = {
  id: "gruendungsprotokoll",
  kurz: "Protokoll der Gründungsversammlung",
  gruppe: "verein",
  titel: "Protokoll der Gründungsversammlung",
  untertitel: "{{name}} – {{versammlungAmDe}} in {{ort}}",
  art: "protokoll",
  modelle: ["eeg", "beg"],
  quelle: "VerG 2002 §§ 2, 11; GenG § 5 (eGen); Fachkonzept 2.3 (Gründungsversammlung, Wahl der Organe)",
  stand: "2026-10-01",
  nummerierung: "abschnitt",
  felder: [
    { id: "versammlungAm", label: "Datum der Versammlung", pflicht: true },
    { id: "anwesende", label: "Anwesende (Anzahl)", pflicht: true },
    { id: "versammlungsleitung", label: "Versammlungsleitung", pflicht: true },
  ],
  abschnitte: [
    { titel: "Eröffnung", absaetze: ["Die Versammlungsleitung {{versammlungsleitung}} eröffnet die Gründungsversammlung, begrüßt {{anwesende}} Anwesende und stellt die ordnungsgemäße Einladung fest."] },
    { titel: "Beschluss der Statuten", absaetze: ["Die Statuten in der vorliegenden Fassung (Muster-Version vom {{heute}}) werden vorgestellt und beschlossen. Ergebnis: {{ergebnisStatuten}}."] },
    { titel: "Wahl des Vorstands", absaetze: ["Gewählt werden: Obfrau/Obmann {{obmann}}; Kassier/in {{kassier}}; Schriftführer/in {{schriftfuehrer}}. Die Gewählten nehmen die Wahl an."] },
    { titel: "Wahl der Rechnungsprüfer", absaetze: ["Gewählt werden: {{rechnungspruefer}}. Sie gehören dem Vorstand nicht an."], wenn: "rechtsform=verein" },
    { titel: "Beiträge", absaetze: ["Beitrittsgebühr {{beitrittsgebuehr}}, Mitgliedsbeitrag {{mitgliedsbeitrag}}."], wenn: "mitgliedsbeitrag" },
    { titel: "Bestellung des Organisators", absaetze: ["Der Vorstand wird ermächtigt, die {{organisatorName}} als Organisator nach § 68 Abs. 2 ElWG zu bestellen und den Dienstleistungs- sowie den Auftragsverarbeitungsvertrag abzuschließen."], wenn: "organisator" },
    { titel: "Nächste Schritte", absaetze: [{ text: "Die Proponentinnen und Proponenten zeigen die Errichtung bei der Vereinsbehörde an (§ 11 VerG); nach Ablauf der Frist von vier Wochen (verlängerbar auf sechs Wochen, § 13 VerG) bzw. nach Einladung zur Aufnahme der Tätigkeit entsteht der Verein.", wenn: "rechtsform=verein" }, { text: "Der Vorstand meldet die Genossenschaft nach Aufnahme in den Revisionsverband zum Firmenbuch an.", wenn: "rechtsform=egen" }, "Anschließend: Bankkonto, Finanzamt, Registrierung als Marktpartner, Vertrag mit dem Netzbetreiber, Zugang zur EDA-Plattform."] },
  ],
  unterschriften: ["Versammlungsleitung", "Protokollführung"],
};

export const MITGLIEDERINFO_WECHSEL = {
  id: "mitgliederinfo_wechsel",
  kurz: "Mitgliederinformation zum Wechsel",
  gruppe: "wechsel",
  titel: "Information zum Wechsel der Betriebsführung",
  untertitel: "{{name}} – Umstellung zum {{stichtagDe}}",
  art: "information",
  quelle: "Fachkonzept 2.6 (Wechsel ohne Ab- und Neuanmeldung, Stichtag, Saldovortrag, Parallellauf)",
  stand: "2026-10-01",
  nummerierung: "abschnitt",
  felder: [
    { id: "stichtag", label: "Stichtag (erster Abrechnungsmonat bei ÖkoInvest)", pflicht: true },
    { id: "letzteAltabrechnung", label: "Letzter Monat beim bisherigen Dienstleister", pflicht: true },
    { id: "altdienstleister", label: "Bisheriger Dienstleister" },
  ],
  abschnitte: [
    { titel: "", ohneNummer: true, absaetze: ["Liebe Mitglieder,", "der Vorstand hat beschlossen, die Betriebsführung unserer Gemeinschaft ab {{stichtagDe}} der {{organisatorName}} zu übertragen. Mit dieser Information erfahren Sie, was sich ändert – und was gleich bleibt."] },
    { titel: "Was gleich bleibt", absaetze: [{ liste: ["Ihre Zählpunkte bleiben angemeldet. Eine neue Anmeldung oder eine neue Zustimmung im Portal des Netzbetreibers ist nicht nötig.", "Ihre Mitgliedschaft, Ihr Teilnahmefaktor und Ihre Preise bleiben unverändert.", "Ihr Stromlieferant bleibt Ihr Stromlieferant."] }] },
    { titel: "Was sich ändert", absaetze: [{ liste: ["Abrechnungen bis einschließlich {{letzteAltabrechnungDe}} erstellt noch {{altdienstleister}}; ab {{stichtagDe}} erhalten Sie Rechnungen bzw. Gutschriften über das neue Mitgliederportal.", "Offene Beträge werden als Saldo übernommen und auf der ersten neuen Abrechnung ausgewiesen.", "Sie erhalten eine Einladung zum Mitgliederportal mit Ihren Energiedaten, Belegen und Verträgen."] }] },
    { titel: "Kontrolle der ersten Abrechnung", absaetze: ["Vor der Umstellung rechnen wir einen Monat parallel und vergleichen die Ergebnisse mit den Werten des Netzbetreibers. Abweichungen erklären wir Ihnen auf Wunsch zeilengenau."] },
    { titel: "Datenschutz", absaetze: ["Die {{organisatorName}} verarbeitet Ihre Daten als Auftragsverarbeiter der Gemeinschaft (Art. 28 DSGVO). Die aktualisierte Datenschutzinformation liegt bei."] },
  ],
  unterschriften: ["Für den Vorstand"],
};

export const ELWG_NACHTRAG = {
  id: "elwg_nachtrag",
  kurz: "ElWG-Anpassung (Information und Nachtrag)",
  gruppe: "wechsel",
  titel: "Anpassung an das Elektrizitätswirtschaftsgesetz (ElWG)",
  untertitel: "Information und Nachtrag zum Teilnahmevertrag – {{name}}",
  art: "nachtrag",
  quelle: "ElWG §§ 65–72, 188 Abs. 1 und 3, 189 Abs. 17; Koordinationsstelle „Änderungen für bestehende Energiegemeinschaften“; Mustervorlagen Beratungsservice Erneuerbare Energie Wien",
  stand: "2026-10-01",
  nummerierung: "abschnitt",
  felder: [
    { id: "frist", label: "Rückmeldung bis", pflicht: true },
  ],
  abschnitte: [
    { titel: "Was ist passiert?", absaetze: ["Seit 01.10.2026 gelten für Energiegemeinschaften die §§ 65–72 ElWG; die bisherigen §§ 16a–16e ElWOG 2010 sind außer Kraft getreten (§ 188 ElWG). Unsere Gemeinschaft wurde ohne Ihr Zutun übergeführt (§ 189 Abs. 17 ElWG). Die bisherigen Vertragsmuster sollen an die neue Rechtslage angepasst werden."] },
    {
      titel: "Was ändert sich im Vertrag?",
      absaetze: [
        {
          liste: [
            "Verweise auf das ElWOG 2010 werden durch die entsprechenden Bestimmungen des ElWG ersetzt.",
            "Ihr Zählpunkt kann an bis zu fünf gemeinsamen Energienutzungen teilnehmen; die Teilnahmefaktoren betragen zusammen höchstens 100 % (§ 71 Abs. 5 ElWG).",
            { text: "Die Gemeinschaft hat einen Organisator bestellt ({{organisatorName}}), der die Kommunikation mit dem Netzbetreiber und die Abrechnung übernimmt (§ 68 Abs. 2 ElWG).", wenn: "organisator" },
            { text: "Da die Erzeugungsleistung der Gemeinschaft über der Schwelle des § 69 ElWG liegt ({{erzeugungsleistungKw}} kW), gelten künftig Allgemeine Lieferbedingungen und ein Informationsblatt; Sie können zwischen Monats- und Jahresrechnung wählen.", wenn: "lieferantenpflicht" },
            "Die Netzentgelt-Reduktion richtet sich ab 01.01.2027 nach dem Nahebereich (neue Verordnung, Höhe noch offen, zu bestätigen).",
          ],
        },
      ],
    },
    { titel: "Was müssen Sie tun?", absaetze: ["Bitte bestätigen Sie den Nachtrag bis {{fristDe}} im Mitgliederportal oder mit Ihrer Unterschrift. Ohne Rückmeldung gilt der Vertrag zu den angepassten Bedingungen weiter, sofern Sie nicht widersprechen; Sie können den Vertrag in diesem Fall mit {{kuendigungsfristWochen}} Wochen zum Monatsende kündigen (zu bestätigen)."] },
  ],
  unterschriften: ["Ort, Datum, Mitglied"],
};
