// src/data/regionen/fristen.js
//
// Befristete Hinweise (Fristenkästen, Welle 0 / W0-2) für die Regionalseiten.
// Rein informativ, nur Text, ohne Angebot. Jeder Eintrag ist am Original geprüft
// und trägt sein Ablaufdatum: Nach Ablauf liefert die Funktion nichts mehr
// (bei statisch erzeugten Seiten greift das mit dem nächsten Build).
// Abgelaufene Einträge bei der nächsten Pflege löschen.

/**
 * 3. EAG-Fördercall 2026, Investitionszuschuss PV (Österreich).
 * Geprüft am 03.10.2026: EAG-Abwicklungsstelle, Meldung vom 18.09.2026 –
 * Ticketziehung 08.10.2026 ab 17:00, Einreichung 09.10.2026 ab 08:00 bis 22.10.2026,
 * Portal-Wartung 07.10. 17:00 bis 09.10. 08:00, Ticket allein ist kein Förderantrag.
 */
export const EAG_CALL_AT = {
  ende: Date.parse("2026-10-23T00:00:00+02:00"),
  eintrag: {
    titel: "Frist: 3. EAG-Fördercall 2026 (8. bis 22. Oktober)",
    text: "Der 3. Fördercall 2026 für Investitionszuschüsse zu PV-Anlagen startet am **8. Oktober 2026 um 17 Uhr** mit der Ticketziehung; eingereicht wird vom 9. Oktober (8 Uhr) bis **22. Oktober 2026**. Ein Ticket allein ist noch kein Förderantrag. Das EAG-Portal ist vom 7. Oktober (17 Uhr) bis 9. Oktober (8 Uhr) wegen Wartung nicht erreichbar.",
    quelle: {
      titel: "EAG-Abwicklungsstelle – 3. Fördercall für Photovoltaikanlagen läuft von 8. bis 22. Oktober 2026 (18.09.2026)",
      url: "https://www.eag-abwicklungsstelle.at/artikel/3-foerdercall-fuer-photovoltaikanlagen-laeuft-von-8-bis-22-oktober-2026/",
    },
  },
};

/**
 * Pronovo PV-Auktionsrunde 4/2026 (Schweiz).
 * Geprüft am 03.10.2026: pronovo.ch/de/foerderung/photovoltaik/auktionen/ –
 * Gebote „ab 18. Oktober bis und mit 1. November 2026“, HEIV 50 MW, Höchstwert 620 Fr./kW,
 * GMP 10 MW, Höchstwert 10 Rp./kWh, Teilnahmegebühr CHF 300, Vorerfassung im Kundenportal jederzeit.
 * Hinweis: Der Masterplan nannte „bis 17.10.“ – laut Pronovo beginnt die Runde erst am 18.10.
 */
const PRONOVO_RUNDE_4_2026 = {
  ende: Date.parse("2026-11-02T00:00:00+01:00"),
  eintrag: {
    titel: "Frist: Pronovo-Auktionsrunde 4/2026 (18. Oktober bis 1. November)",
    text: "Gebote für die vierte PV-Auktionsrunde 2026 können vom **18. Oktober bis und mit 1. November 2026** eingereicht werden. Ausgeschrieben sind 50 MW für die hohe Einmalvergütung (HEIV, Höchstgebot CHF 620/kW) und 10 MW für die gleitende Marktprämie (Höchstgebot 10 Rp./kWh). Gebote lassen sich vorab im Pronovo-Kundenportal erfassen; die Teilnahmegebühr beträgt CHF 300 je Gebot.",
    quelle: { titel: "Pronovo – PV-Auktionen (Runde 4/2026)", url: "https://pronovo.ch/de/foerderung/photovoltaik/auktionen/" },
  },
};

const gueltig = (liste, jetzt) => liste.filter((f) => jetzt < f.ende).map((f) => f.eintrag);

/** Liefert die noch gültigen Fristen-Einträge für österreichische Regionen (Format wie `recht[]`). */
export function fristenAT(jetzt = Date.now()) {
  return gueltig([EAG_CALL_AT], jetzt);
}

/** Liefert die noch gültigen Fristen-Einträge für die Schweiz (Format wie `recht[]`). */
export function fristenCH(jetzt = Date.now()) {
  return gueltig([PRONOVO_RUNDE_4_2026], jetzt);
}
