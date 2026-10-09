// Illustrationsbibliothek ÖkoInvest (Team T7) – Stil: docs/DESIGN.md § 5.
//
// Verwendung:
//   import { SolarparkLandschaft, KeineDokumente, SpotAgriPv, MarkenMotiv } from "@/components/illustrationen";
//
//   <IllustrationRahmen ton="sand" format="16/10" label="Solarpark mit Netzanschluss">
//     <SolarparkLandschaft animiert />
//   </IllustrationRahmen>
//   <Leer illustration={<KeineDokumente />} titel="Noch keine Dokumente" … />
//   <SpotAgriPv className="h-20 w-20" />
//
// Gemeinsame Props aller Motive:
//   className – Größe/Abstand; ersetzt den Standard "h-auto w-full" (volle Breite, Höhe über viewBox)
//   ton       – "hell" (Standard) | "dunkel" (für IllustrationRahmen ton="navy", dunkle Heros)
//   animiert  – sanfte Bewegung (Energiefluss, Rotor, Wolken, Schweben); aus bei prefers-reduced-motion.
//               Standard aus – Ausnahme MarkenMotiv (Standard an).
//   titel     – Alternativtext; gesetzt → role="img" + <title>, sonst aria-hidden (dekorativ).
//
// Formate: Hero 16:10 (480 × 300), Leerzustand 5:4 (160 × 128), Spot 1:1 (96 × 96), Marke 1:1 (320 × 320).
// Server-tauglich (keine Hooks); jede Illustration < 6 KB Markup.

import * as H from "./hero";
import * as L from "./leer";
import * as S from "./spots";
import { MarkenMotiv } from "./marke";

export * from "./hero";
export * from "./leer";
export * from "./spots";
export { MarkenMotiv };

/**
 * Katalog aller Motive mit Kurzdoku und empfohlener Einsatzstelle
 * (Grundlage der Galerie /design/illustrationen).
 */
export const MOTIVE = [
  // Hero-Szenen
  { name: "SolarparkLandschaft", kategorie: "hero", Komponente: H.SolarparkLandschaft, text: "Freiflächen-Solarpark mit Weg, Trafostation, Netzanschluss und Windrad im Hintergrund.", einsatz: "/freiflaeche, /flaeche-verpachten, Startseite" },
  { name: "AgriPvFeld", kategorie: "hero", Komponente: H.AgriPvFeld, text: "Hoch aufgeständerte Agri-PV über Ackerreihen, Hof mit PV-Dach.", einsatz: "/agri-pv, /landwirte, /rechner/agri-pv" },
  { name: "Solarcarport", kategorie: "hero", Komponente: H.Solarcarport, text: "Parkplatz mit zwei Solardächern, Speicher und Ladepunkten.", einsatz: "/solarcarport, /rechner/solarcarport" },
  { name: "Grossspeicher", kategorie: "hero", Komponente: H.Grossspeicher, text: "Batteriecontainer, Trafo, Zaun und Netzanschluss; schwebende Ladestandsanzeige.", einsatz: "/grossspeicher, /virtuelles-kraftwerk" },
  { name: "EnergiegemeinschaftDorf", kategorie: "hero", Komponente: H.EnergiegemeinschaftDorf, text: "Dorf mit PV-Dächern, Gemeindehaus und Quartierspeicher; Energiefluss über die Straßen.", einsatz: "/energiegemeinschaften, /genossenschaft, /kommunen, EG-Portal" },
  { name: "InvestorenDashboard", kategorie: "hero", Komponente: H.InvestorenDashboard, text: "Abstraktes Dashboard: schwebende Karten mit Balken, Verlauf und Quote über einer PV-Anlage.", einsatz: "/investoren, /projektboerse, Portal-Dashboard Investor" },
  { name: "Netzanschluss", kategorie: "hero", Komponente: H.Netzanschluss, text: "Solarpark speist über Umspannwerk und Portal in die Hochspannungsleitung.", einsatz: "/prozess (Netzanschluss), Ratgeber Netzanschluss, Projektphasen" },

  // Leerzustände
  { name: "KeineNachrichten", kategorie: "leer", Komponente: L.KeineNachrichten, text: "Briefkasten mit schwebendem Umschlag.", einsatz: "/portal/nachrichten" },
  { name: "KeineDokumente", kategorie: "leer", Komponente: L.KeineDokumente, text: "Ordner mit Blatt, gestricheltes neues Dokument.", einsatz: "/portal/dokumente, Datenraum" },
  { name: "KeineAufgaben", kategorie: "leer", Komponente: L.KeineAufgaben, text: "Klemmbrett, alle Punkte abgehakt.", einsatz: "Aufgabenlisten, Cockpit „Offene Schritte“" },
  { name: "KeineProjekte", kategorie: "leer", Komponente: L.KeineProjekte, text: "Abgesteckte Fläche mit Fahne.", einsatz: "/portal/projekte" },
  { name: "KeineAnlagen", kategorie: "leer", Komponente: L.KeineAnlagen, text: "Modulreihe plus gestrichelter Platzhalter.", einsatz: "Anlagen-/Bestandsübersicht im Portal" },
  { name: "KeineBelege", kategorie: "leer", Komponente: L.KeineBelege, text: "Beleg mit Summenzeile und Münzstapel.", einsatz: "Abrechnung, Rechnungen, EG-Abrechnung" },
  { name: "SucheOhneTreffer", kategorie: "leer", Komponente: L.SucheOhneTreffer, text: "Schwebende Lupe über leerer Fläche.", einsatz: "Suche, Filter ohne Ergebnis (Projektbörse, Tabellen)" },
  { name: "Offline", kategorie: "leer", Komponente: L.Offline, text: "Getrennter Stecker, durchgestrichene Wolke.", einsatz: "Verbindungsfehler, Schnittstelle nicht erreichbar" },
  { name: "Fehler", kategorie: "leer", Komponente: L.Fehler, text: "Warnschild, umgekippte Kiste.", einsatz: "error.js, fehlgeschlagene Ladevorgänge" },
  { name: "NichtGefunden", kategorie: "leer", Komponente: L.NichtGefunden, text: "Wegweiser am Ende des Pfades (404).", einsatz: "not-found.js" },
  { name: "Erfolg", kategorie: "leer", Komponente: L.Erfolg, text: "Grünes Häkchen über Modulreihe.", einsatz: "Abschluss von Assistenten, Anfrage gesendet" },
  { name: "WartenNetzbetreiber", kategorie: "leer", Komponente: L.WartenNetzbetreiber, text: "Strommast, Energiefluss endet davor, Uhr.", einsatz: "Netzanfrage/Netzverträglichkeit ausstehend" },
  { name: "Unterschrift", kategorie: "leer", Komponente: L.Unterschrift, text: "Dokument mit grüner Unterschrift und Stift.", einsatz: "Signatur ausstehend, Verträge, Pachtvertrag" },
  { name: "Verifizierung", kategorie: "leer", Komponente: L.Verifizierung, text: "Ausweis-Karte und Schild mit Häkchen.", einsatz: "KYC/KYB, E-Mail-/Identitätsprüfung" },
  { name: "KalenderLeer", kategorie: "leer", Komponente: L.KalenderLeer, text: "Wandkalender ohne Termine.", einsatz: "/termin, Fristen, Termine im Portal" },
  { name: "KeineBenachrichtigungen", kategorie: "leer", Komponente: L.KeineBenachrichtigungen, text: "Ruhige Glocke.", einsatz: "Benachrichtigungs-Center" },
  { name: "KeineFlaechen", kategorie: "leer", Komponente: L.KeineFlaechen, text: "Abgesteckte Wiese mit Kartenpin.", einsatz: "/portal/flaechen, Flächencheck ohne Fläche" },
  { name: "KeineGebote", kategorie: "leer", Komponente: L.KeineGebote, text: "Tafel mit flacher Linie und gestricheltem Anstieg.", einsatz: "Börse: keine Gebote/Interessenten, Dealroom" },
  { name: "KeineMitglieder", kategorie: "leer", Komponente: L.KeineMitglieder, text: "Ein Haus mit PV, zwei gestrichelte Nachbarn.", einsatz: "EG-Mitgliederliste, Genossenschaft" },
  { name: "KeineMesswerte", kategorie: "leer", Komponente: L.KeineMesswerte, text: "Zähler mit flacher Anzeige.", einsatz: "Energie-/Lastgangansichten ohne Daten, IoT" },
  { name: "Wartung", kategorie: "leer", Komponente: L.Wartung, text: "Absperrung mit Leitkegeln.", einsatz: "Wartungsmodus, Funktion in Vorbereitung" },

  // Spot-Grafiken
  { name: "SpotFreiflaeche", kategorie: "spot", Komponente: S.SpotFreiflaeche, text: "Drei Modulreihen mit Baum.", einsatz: "Feature-Karte Freiflächen-PV" },
  { name: "SpotAgriPv", kategorie: "spot", Komponente: S.SpotAgriPv, text: "Aufgeständerte Reihe über Ackerstreifen.", einsatz: "Feature-Karte Agri-PV, Zielgruppe Landwirte" },
  { name: "SpotSolarcarport", kategorie: "spot", Komponente: S.SpotSolarcarport, text: "Auto unter Solardach.", einsatz: "Feature-Karte Solarcarport" },
  { name: "SpotGrossspeicher", kategorie: "spot", Komponente: S.SpotGrossspeicher, text: "Container mit Ladestand.", einsatz: "Feature-Karte Großspeicher" },
  { name: "SpotNetzanschluss", kategorie: "spot", Komponente: S.SpotNetzanschluss, text: "Mast, Trafo, Energiefluss.", einsatz: "Prozessschritt Netzanschluss" },
  { name: "SpotProjektboerse", kategorie: "spot", Komponente: S.SpotProjektboerse, text: "Steigende Balken mit Pfeil.", einsatz: "Feature-Karte Projektbörse / Investoren" },
  { name: "SpotPacht", kategorie: "spot", Komponente: S.SpotPacht, text: "Acker mit Pachtfläche und Münzen.", einsatz: "Fläche verpachten, Pachtrechner" },
  { name: "SpotEnergiegemeinschaft", kategorie: "spot", Komponente: S.SpotEnergiegemeinschaft, text: "Drei Häuser im Energiekreis.", einsatz: "Energiegemeinschaften, Genossenschaft" },
  { name: "SpotVirtuellesKraftwerk", kategorie: "spot", Komponente: S.SpotVirtuellesKraftwerk, text: "Vernetzte Anlagen um einen Knoten.", einsatz: "Virtuelles Kraftwerk" },
  { name: "SpotReststrom", kategorie: "spot", Komponente: S.SpotReststrom, text: "Gewerbehalle mit PV und Strombezug.", einsatz: "Reststrom-Pool, Unternehmen" },
  { name: "SpotFlaechencheck", kategorie: "spot", Komponente: S.SpotFlaechencheck, text: "Fläche mit Kartenpin.", einsatz: "Flächencheck, Akquise" },
  { name: "SpotKommune", kategorie: "spot", Komponente: S.SpotKommune, text: "Rathaus mit Turm und PV-Dach.", einsatz: "Kommunen, Bürgerbeteiligung" },

  // Marke
  { name: "MarkenMotiv", kategorie: "marke", Komponente: MarkenMotiv, text: "Schwebende Energie-Insel mit umlaufendem Energiefluss; standardmäßig animiert.", einsatz: "/login, /registrieren, /passwort-vergessen, /einladung (Seitenpanel)" },
];
