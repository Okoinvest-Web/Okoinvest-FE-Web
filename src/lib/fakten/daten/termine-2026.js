// src/lib/fakten/daten/termine-2026.js
//
// Befristete Termine 2026 (Welle 2, Paket FRI) als Fakten im Vertrag von ../schema.js.
// Nur Daten, keine Pressearbeit. Eingebunden über termine-de/at/ch.js → ../index.js;
// NUR über src/lib/fakten/index.js importieren (Ausnahme: Tests in diesem Ordner).
//
// Form eines Termin-Fakts (id beginnt mit "termin.", einheit "Termin", klasse "A"):
//   wert = {
//     art:            "zeitraum" (beginn–ende) | "stichtag" (nur ende) | "erwartet" (amtlicher Termin
//                     noch nicht bekannt, ende = spätester erwartbarer Tag laut Quelle)
//     beginn:         ISO-Datum | null
//     ende:           ISO-Datum (letzter Tag der Frist)  – entspricht gueltigBis
//     endeZeitpunkt:  ISO-Zeitpunkt mit Zeitzone, ab dem der Eintrag nicht mehr erscheint
//                     (nur bei Fristen, die als Fristenkasten ausgespielt werden)
//     titel, text:    Anzeige (text mit **fett**-Markierung wie recht[] der Regionsseiten)
//   }
// gueltigBis = letzter Tag der Frist: Danach blendet FristenListe den Eintrag aus, und
// qa/fakten-check.mjs meldet ihn (Klasse A) als abgelaufen → Eintrag dann löschen oder fortschreiben.
//
// Prüfstatus: "geprueft" nur, wo der Wortlaut am Original (quelle.url) nachgelesen wurde;
// Zweitprüfung durch die benannte zweite Person fehlt überall (TODO-E6).

const ABRUF = "2026-10-03";
const W0 = "Welle 0 (W0-2, Prüfung am Original 03.10.2026) · Zweitprüfung TODO-E6";
const FRI = "Paket FRI (Wortlaut am Original 03.10.2026) · Zweitprüfung TODO-E6";
const OFFEN_AT = "TODO-E6 · Fachprüfung Team Österreich";

const Q = {
  eagCall3: {
    titel: "EAG-Abwicklungsstelle – 3. Fördercall für Photovoltaikanlagen läuft von 8. bis 22. Oktober 2026 (18.09.2026)",
    url: "https://www.eag-abwicklungsstelle.at/artikel/3-foerdercall-fuer-photovoltaikanlagen-laeuft-von-8-bis-22-oktober-2026/",
  },
  pronovo: { titel: "Pronovo – PV-Auktionen (Runde 4/2026)", url: "https://pronovo.ch/de/foerderung/photovoltaik/auktionen/" },
  stromvv: { titel: "Fedlex – Stromversorgungsverordnung (StromVV, SR 734.71), Art. 11 Abs. 2, Stand 1. Juli 2026", url: "https://www.fedlex.admin.ch/eli/cc/2008/226/de#art_11" },
  eeg28a: { titel: "EEG 2023, § 28a Abs. 1 – Ausschreibungsvolumen und Gebotstermine Solaranlagen des ersten Segments", url: "https://www.gesetze-im-internet.de/eeg_2014/__28a.html" },
  eagMpv: {
    titel: "RIS – EAG-Marktprämienverordnung, Bundesrecht konsolidiert (Novelle BGBl. II Nr. 13/2026)",
    url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20012029",
  },
};

/** Termin-Fakt bauen (Klasse A, einheit "Termin", gueltigBis = letzter Tag) */
function termin(id, land, wert, quelle, { status, pruefer, notiz, gueltigAb = null } = {}) {
  return { id, wert, einheit: "Termin", land, quelle, abruf: ABRUF, gueltigAb, gueltigBis: wert.ende, status, pruefer, klasse: "A", ...(notiz ? { notiz } : {}) };
}

export const TERMINE_2026 = [
  // ---- Österreich --------------------------------------------------------------------
  termin(
    "termin.eag.investitionszuschussCall3",
    "AT",
    {
      art: "zeitraum",
      beginn: "2026-10-08",
      ende: "2026-10-22",
      endeZeitpunkt: "2026-10-23T00:00:00+02:00",
      titel: "Frist: 3. EAG-Fördercall 2026 (8. bis 22. Oktober)",
      text: "Der 3. Fördercall 2026 für Investitionszuschüsse zu PV-Anlagen startet am **8. Oktober 2026 um 17 Uhr** mit der Ticketziehung; eingereicht wird vom 9. Oktober (8 Uhr) bis **22. Oktober 2026**. Ein Ticket allein ist noch kein Förderantrag. Das EAG-Portal ist vom 7. Oktober (17 Uhr) bis 9. Oktober (8 Uhr) wegen Wartung nicht erreichbar.",
    },
    Q.eagCall3,
    {
      status: "geprueft",
      pruefer: W0,
      notiz: "Ticketziehung 08.10.2026 ab 17:00, Einreichung 09.10.2026 ab 08:00 bis 22.10.2026; Portal-Wartung 07.10. 17:00 bis 09.10. 08:00 (Meldung vom 18.09.2026).",
    }
  ),
  termin(
    "termin.eag.marktpraemieGebotstermin4",
    "AT",
    {
      art: "stichtag",
      beginn: null,
      ende: "2026-12-10",
      titel: "Gebotstermin EAG-Marktprämie Photovoltaik (10. Dezember 2026)",
      text: "Der letzte Gebotstermin 2026 für die **EAG-Marktprämie** (Photovoltaik) ist der **10. Dezember 2026**. Gebote werden elektronisch bei der EAG-Förderabwicklungsstelle eingereicht.",
    },
    Q.eagMpv,
    {
      status: "zu_pruefen",
      pruefer: OFFEN_AT,
      notiz: "Gebotstermine 2026 laut EAG-Marktprämienverordnung (Novelle BGBl. II Nr. 13/2026): 17.03., 11.06., 24.09., 10.12. Datum per Recherche belegt, Verordnungstext noch nicht am Original nachgelesen.",
    }
  ),

  // ---- Schweiz (CH-Schreibung: kein ß) -----------------------------------------------
  termin(
    "termin.pronovo.auktionRunde4",
    "CH",
    {
      art: "zeitraum",
      beginn: "2026-10-18",
      ende: "2026-11-01",
      endeZeitpunkt: "2026-11-02T00:00:00+01:00",
      titel: "Frist: Pronovo-Auktionsrunde 4/2026 (18. Oktober bis 1. November)",
      text: "Gebote für die vierte PV-Auktionsrunde 2026 können vom **18. Oktober bis und mit 1. November 2026** eingereicht werden. Ausgeschrieben sind 50 MW für die hohe Einmalvergütung (HEIV, Höchstgebot CHF 620/kW) und 10 MW für die gleitende Marktprämie (Höchstgebot 10 Rp./kWh). Gebote lassen sich vorab im Pronovo-Kundenportal erfassen; die Teilnahmegebühr beträgt CHF 300 je Gebot.",
    },
    Q.pronovo,
    {
      status: "geprueft",
      pruefer: W0,
      notiz: "Laut Pronovo beginnt die Runde am 18.10. (der Masterplan nannte „bis 17.10.“). HEIV 50 MW, Höchstwert 620 Fr./kW; GMP 10 MW, Höchstwert 10 Rp./kWh; Teilnahmegebühr CHF 300.",
    }
  ),
  termin(
    "termin.ch.marktzugangMitteilung",
    "CH",
    {
      art: "stichtag",
      beginn: null,
      ende: "2026-10-31",
      endeZeitpunkt: "2026-11-01T00:00:00+01:00",
      titel: "Frist: Marktzugang ab 2027 (Mitteilung bis 31. Oktober 2026)",
      text: "Endverbraucher mit mindestens 100 MWh Jahresverbrauch je Verbrauchsstätte, die noch in der Grundversorgung sind, können ihrem Verteilnetzbetreiber bis zum **31. Oktober 2026** mitteilen, dass sie ab 1. Januar 2027 den freien Markt nutzen. Damit entfällt die Lieferpflicht des Netzbetreibers endgültig; eine Rückkehr in die Grundversorgung ist nicht vorgesehen.",
    },
    Q.stromvv,
    {
      status: "geprueft",
      pruefer: W0,
      notiz: "Frist gilt jährlich (Art. 11 Abs. 2 StromVV); hier die Ausprägung für den Wechsel zum 01.01.2027. Für 2027 neu anlegen.",
    }
  ),

  // ---- Deutschland -------------------------------------------------------------------
  termin(
    "termin.eeg.gebotsterminSolar1",
    "DE",
    {
      art: "stichtag",
      beginn: null,
      ende: "2026-12-01",
      titel: "Gebotstermin EEG-Ausschreibung Solar, erstes Segment (1. Dezember 2026)",
      text: "Der nächste Gebotstermin der Ausschreibung für **Solaranlagen des ersten Segments** (Freiflächenanlagen) ist der **1. Dezember 2026**. Das EEG legt für die Jahre 2023 bis 2029 jeweils den 1. März, den 1. Juli und den 1. Dezember fest.",
    },
    Q.eeg28a,
    { status: "geprueft", pruefer: FRI, notiz: "§ 28a Abs. 1 Satz 1 EEG 2023: Gebotstermine 1. März, 1. Juli und 1. Dezember (2023–2029)." }
  ),
];

export default TERMINE_2026;
