// src/lib/plattform/onboarding/pfade/kommune.js – Kommune / Gemeinde (eigene Rolle `kommune`)

import { benachrichtigungenSchritt, profilSchritt, terminSchritt } from "./gemeinsam";

export const kommune = {
  id: "kommune",
  titel: "Einstieg für Gemeinden",
  text: "Gemeindedaten, Ansprechpartner, Planungsstand und Beteiligungsmodelle – danach sehen Sie Projekte in Ihrem Gemeindegebiet ab der Bauleitplanung.",
  rollen: ["kommune"],
  schritte: [
    profilSchritt({ firmaPflicht: true, titel: "Ansprechpartner der Gemeinde", firmaLabel: "Gemeinde / Stadt / Amt", text: "Name, Funktion (z. B. Bürgermeisterin, Bauamt) und Telefon der Ansprechperson sowie die Gemeinde. Wir bestätigen das Konto über einen unabhängigen Weg (Rückruf über die Zentrale der Verwaltung)." }),
    {
      id: "gemeinde", titel: "Gemeindedaten erfassen", kurz: "Gemeindedaten", art: "aktion",
      text: "Gemeinde, amtlicher Gemeindeschlüssel (DE AGS, AT Gemeindekennziffer, CH BFS-Nummer), gemeindeeigene Flächen, Planungsstand und Themen – strukturiert in einem Formular.",
      links: [{ href: "/kommunen#anfrage", label: "Gemeindedaten erfassen", primaer: true }],
      pflicht: true, kriterium: { fakt: "kommuneAnliegen" },
    },
    {
      id: "bauleitplanung", titel: "Bauleitplanung und Kriterienkatalog", kurz: "Bauleitplanung", art: "info", begriff: "kriterienkatalog",
      text: "Freiflächen-PV braucht in der Regel eine Bauleitplanung der Gemeinde (DE: Flächennutzungs- und Bebauungsplan; AT: Umwidmung „Grünland-Photovoltaik“; CH: Nutzungsplanung). Ein eigener Kriterienkatalog steuert, wo Anlagen erwünscht sind.",
      punkte: [
        "DE: Aufstellungsbeschluss → frühzeitige Beteiligung → Offenlage → Satzungsbeschluss; privilegiert sind u. a. Flächen im 200-m-Korridor an Autobahnen und zweigleisigen Schienen (§ 35 BauGB).",
        "Ein Kriterienkatalog (Bodengüte, Abstand zur Wohnbebauung, Sichtachsen, Größe je Ortsteil) schafft Gleichbehandlung aller Anfragen.",
        "Kosten der Bauleitplanung übernimmt üblicherweise der Projektträger über einen städtebaulichen Vertrag.",
      ],
      links: [{ href: "/kommunen", label: "Leitfaden für Kommunen" }],
      pflicht: false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Verstanden",
    },
    {
      id: "beteiligung", titel: "Bürger- und Kommunalbeteiligung", kurz: "Beteiligung", art: "info", begriff: "kommunalbeteiligung",
      text: "Wertschöpfung bleibt vor Ort: in Deutschland die Zahlung nach § 6 EEG (bis 0,2 ct/kWh an die Gemeinde), dazu Gewerbesteuer, Bürgerbeteiligung über Genossenschaft oder Energiegemeinschaft.",
      punkte: [
        "§ 6 EEG: freiwillige Zahlung des Betreibers an die Gemeinde – vertraglich vereinbart, nach aktuellem Stand ohne Gegenleistung der Gemeinde.",
        "AT: Beteiligung über Erneuerbare-Energie-Gemeinschaften (lokal/regional) oder Bürgerenergiegemeinschaften; CH: ZEV bzw. lokale Elektrizitätsgemeinschaft (LEG, seit 2026).",
        "Die Schätzung für Ihr Gebiet zeigt die Gemeinde-Sicht, sobald Projekte in der Planung sind.",
      ],
      links: [{ href: "/rechner/kommune", label: "Kommunal-Rechner" }, { href: "/genossenschaft", label: "Genossenschaft" }],
      pflicht: false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Verstanden",
    },
    {
      id: "gemeindesicht", titel: "Gemeinde-Sicht öffnen", kurz: "Gemeinde-Sicht", art: "aktion",
      text: "Projekte im Gemeindegebiet ab Planungsphase – vereinfacht, ohne Eigentümer, Flurstücke oder Pachtkonditionen. Freigeschaltet, sobald das Backoffice Ihr Anliegen bestätigt hat.",
      links: [{ href: "/portal/kommune", label: "Gemeinde-Sicht öffnen", primaer: true }],
      pflicht: false, kriterium: { eines: [{ fakt: "kommuneGeprueft" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Angesehen",
    },
    terminSchritt({ art: "gemeinde", titel: "Gemeindetermin vereinbaren", label: "Gemeindetermin buchen", text: "Vorstellung im Rathaus oder Gemeinderat (ca. 60 Minuten): Beteiligungsmodelle, Ablauf der Bauleitplanung, Fragen der Bürgerinnen und Bürger." }),
    benachrichtigungenSchritt("Neue Projekte im Gemeindegebiet, Statuswechsel und Nachrichten – wählen Sie, was per E-Mail kommen soll."),
  ],
};
