// src/components/Portal/Bedienung/befehle.js
//
// Befehle des Portals je Rolle: Navigation, Aktionen und Tastenkürzel – eine Quelle für
// Befehlspalette (Strg/⌘+K), Tastenkürzel-Hilfe und mobile Bottom-Navigation.
// Rein (keine Hooks); Icons aus lucide-react.

import {
  Bell, ClipboardList, Coins, FileText, FolderKanban, FolderPlus, Gauge, Handshake, HelpCircle, Inbox, Keyboard, LandPlot,
  LayoutDashboard, ListTodo, LogOut, Mail, MessagesSquare, Plus, Search, ShieldCheck, Sparkles, TrendingUp, UserRound, Users, Globe, Compass,
} from "lucide-react";

import { Banknote, FileSpreadsheet, HandHeart, HardHat, Landmark, Milestone, PlugZap, ScanFace, SunMedium, Target, TriangleAlert, Zap } from "lucide-react"; // UI-Politur: Bottom-Navigation je Rolle
import { darfLesen, seitenBereich, unterrollen } from "@/lib/plattform/rechte"; // UI-Politur: Bottom-Navigation Backoffice-Unterrollen
import { BookOpen, CalendarDays, Fingerprint, Link2, UsersRound } from "lucide-react"; // Querschnitt: weitere Navigationsziele
import { Wrench } from "lucide-react"; // Betriebsführung Anlagen

const hatRolle = (rollen, ...r) => r.some((x) => rollen.includes(x));

/** Navigationsziele (alle, die die Rollen sehen dürfen – deckungsgleich mit der Seitenleiste) */
export function navigationsZiele(rollen = []) {
  const admin = rollen.includes("admin");
  const flaeche = hatRolle(rollen, "flaeche", "landwirt");
  return [
    { id: "nav-dashboard", titel: "Übersicht", href: "/portal", icon: LayoutDashboard, stichworte: "dashboard start home", kuerzel: "g d" },
    { id: "nav-anfragen", titel: "Meine Anfragen", href: "/portal/anfragen", icon: Inbox, stichworte: "vorgänge anfrage", kuerzel: "g a" },
    flaeche && { id: "nav-flaechen", titel: "Flächen", href: "/portal/flaechen", icon: LandPlot, stichworte: "grundstück acker pacht", kuerzel: "g f" },
    flaeche && { id: "nav-pachtvertraege", titel: "Pachtverträge", href: "/portal/pachtvertraege", icon: FileText, stichworte: "pacht kündigung eigentümerwechsel erbfall rückbau jahresbescheinigung agri nachweis" }, // Pachtakte (Team 1)
    (hatRolle(rollen, "anbieter") || admin) && { id: "nav-projekte", titel: admin && !hatRolle(rollen, "anbieter") ? "Projekt-Freigabe" : "Meine Projekte", href: admin && !hatRolle(rollen, "anbieter") ? "/portal/admin/projekte" : "/portal/projekte", icon: FolderKanban, stichworte: "projekt anbieter", kuerzel: "g p" },
    (hatRolle(rollen, "investor") || admin) && { id: "nav-boerse", titel: "Projektbörse", href: hatRolle(rollen, "investor") ? "/portal/boerse" : "/projektboerse", icon: TrendingUp, stichworte: "börse investment kaufen", kuerzel: "g b" },
    hatRolle(rollen, "investor") && { id: "nav-portfolio", titel: "Portfolio", href: "/portal/portfolio", icon: TrendingUp, stichworte: "portfolio bestand ausschüttung kapitalabruf bericht beteiligung" }, // Portfolio
    hatRolle(rollen, "mitglied") && { id: "nav-mg-geno", titel: "Genossenschaft: Mitgliedschaft & Anteile", href: "/portal/beteiligung/genossenschaft", icon: HandHeart, stichworte: "genossenschaft anteile beitritt einzahlung kündigung übertragung dividende generalversammlung" }, // Team 5
    hatRolle(rollen, "mitglied") && { id: "nav-mg-eg", titel: "Energiegemeinschaft: Teilnahme & Abrechnung", href: "/portal/beteiligung/energiegemeinschaft", icon: Zap, stichworte: "eeg energy sharing leg zählpunkt gutschrift abrechnung" }, // Team 5
    admin && { id: "nav-bo-geno", titel: "Genossenschaft (Backoffice)", href: "/portal/admin/genossenschaft", icon: HandHeart, stichworte: "mitglieder zulassung einzahlung generalversammlung ausschüttung dividende" }, // Team 5
    admin && { id: "nav-bo-eg", titel: "Energiegemeinschaften (Backoffice)", href: "/portal/admin/energiegemeinschaften", icon: Zap, stichworte: "eeg teilnehmer netzbetreiber monatslauf abrechnung" }, // Team 5
    { id: "nav-nachrichten", titel: "Nachrichten", href: "/portal/nachrichten", icon: MessagesSquare, stichworte: "chat postfach", kuerzel: "g n" },
    { id: "nav-hinweise", titel: "Benachrichtigungen", href: "/portal/benachrichtigungen", icon: Bell, stichworte: "glocke hinweise e-mail" },
    { id: "nav-dokumente", titel: "Dokumente", href: "/portal/dokumente", icon: FileText, stichworte: "unterlagen upload pdf" },
    { id: "nav-profil", titel: hatRolle(rollen, "investor") ? "Profil & Suchprofil" : "Profil", href: "/portal/profil", icon: UserRound, stichworte: "konto passwort einstellungen" },
    { id: "nav-hilfe", titel: "Hilfe & Tastenkürzel", href: "/portal/hilfe", icon: HelpCircle, stichworte: "hilfe fragen lexikon kürzel", kuerzel: "g h" },
    admin && { id: "nav-cockpit", titel: "Backoffice-Cockpit", href: "/portal/admin", icon: Gauge, stichworte: "admin backoffice", kuerzel: "g c" },
    admin && { id: "nav-aufgaben", titel: "Aufgaben & Wiedervorlagen", href: "/portal/admin/aufgaben", icon: ListTodo, stichworte: "todo wiedervorlage", kuerzel: "g t" },
    admin && { id: "nav-vorgaenge", titel: "Alle Vorgänge", href: "/portal/admin/vorgaenge", icon: ClipboardList, stichworte: "anfragen backoffice", kuerzel: "g v" },
    admin && { id: "nav-pipeline", titel: "Flächen-Pipeline", href: "/portal/admin/flaechen", icon: LandPlot, stichworte: "kanban flächen" },
    admin && { id: "nav-freigabe", titel: "Projekt-Freigabe", href: "/portal/admin/projekte", icon: ShieldCheck, stichworte: "prüfung veröffentlichen" },
    admin && { id: "nav-interessen", titel: "NDA & LOI", href: "/portal/admin/interessen", icon: Handshake, stichworte: "nda loi interesse" },
    admin && { id: "nav-deals", titel: "Deals & Provisionen", href: "/portal/admin/deals", icon: Coins, stichworte: "provision verkauf" },
    admin && { id: "nav-nutzer", titel: "Nutzer & Protokoll", href: "/portal/admin/nutzer", icon: Users, stichworte: "konten rollen protokoll" },
    admin && { id: "nav-postausgang", titel: "E-Mail-Postausgang", href: "/portal/admin/postausgang", icon: Mail, stichworte: "mail vorschau" },
    // Querschnitt: Handbücher, Termine, Sicherheit, Organisation, Revisionsprotokoll
    { id: "nav-handbuch", titel: "Handbücher", href: "/portal/hilfe/handbuch", icon: BookOpen, stichworte: "anleitung handbuch hilfe dokumentation" },
    { id: "nav-termine", titel: "Termine", href: admin ? "/portal/admin/kalender" : "/portal/termine", icon: CalendarDays, stichworte: "kalender termin buchen besichtigung" },
    { id: "nav-sicherheit", titel: "Sicherheit & Geräte", href: "/portal/sicherheit", icon: Fingerprint, stichworte: "2fa zwei-faktor sitzungen geräte passwort" },
    { id: "nav-organisation", titel: "Organisation & Team", href: "/portal/organisation", icon: UsersRound, stichworte: "team mitglieder einladen rollen firma" },
    { id: "nav-datenexport", titel: "Datenexport & Konto löschen", href: "/portal/profil#daten", icon: UserRound, stichworte: "dsgvo art 20 art 17 export löschen" },
    admin && { id: "nav-protokoll", titel: "Revisionsprotokoll durchsuchen", href: "/portal/admin/protokoll", icon: Link2, stichworte: "audit protokoll hash kette suche" },
    { id: "nav-website", titel: "Zur Website", href: "/", icon: Globe, stichworte: "startseite öffentlich" },
  ].filter(Boolean);
}

/** Aktionen („Fläche anlegen“ …) – `aktion` wird im Browser ausgeführt, `href` navigiert */
export function aktionen(rollen = []) {
  const admin = rollen.includes("admin");
  return [
    hatRolle(rollen, "flaeche", "landwirt") && { id: "akt-flaeche", titel: "Fläche anlegen", href: "/portal/flaechen/neu", icon: Plus, stichworte: "neu fläche hinzufügen", neu: true },
    hatRolle(rollen, "anbieter") && { id: "akt-projekt", titel: "Projekt einreichen", href: "/portal/projekte/neu", icon: FolderPlus, stichworte: "neu projekt anlegen anbieten", neu: true },
    hatRolle(rollen, "investor") && { id: "akt-suchprofil", titel: "Suchprofil bearbeiten", href: "/portal/profil#suchprofil", icon: Sparkles, stichworte: "matching suchprofil" },
    hatRolle(rollen, "investor") && { id: "akt-merkliste", titel: "Merkliste öffnen", href: "/portal/boerse?ansicht=merkliste", icon: TrendingUp, stichworte: "gemerkt favoriten" },
    admin && { id: "akt-backoffice", titel: "Zum Backoffice", href: "/portal/admin", icon: Gauge, stichworte: "admin cockpit" },
    admin && { id: "akt-ohne", titel: "Vorgänge ohne Zuständigen", href: "/portal/admin/vorgaenge?ohne=1", icon: ClipboardList, stichworte: "unzugewiesen offen" },
    { id: "akt-nachricht", titel: "Nachricht an das Backoffice", href: "/portal/nachrichten", icon: MessagesSquare, stichworte: "schreiben frage kontakt" },
    { id: "akt-einstieg", titel: "Geführten Einstieg öffnen", href: "/portal/willkommen", icon: Compass, stichworte: "onboarding einrichtung tour" },
    { id: "akt-kuerzel", titel: "Tastenkürzel anzeigen", aktion: "kuerzel", icon: Keyboard, stichworte: "shortcuts tastatur hilfe", kuerzel: "?" },
    { id: "akt-abmelden", titel: "Abmelden", aktion: "abmelden", icon: LogOut, stichworte: "logout ausloggen" },
  ].filter(Boolean);
}

/** Ziel des Kürzels „n“ (neu) je Rolle */
export function neuZiel(rollen = []) {
  return aktionen(rollen).find((a) => a.neu)?.href || null;
}

/** Tastenkürzel für die Hilfe-Übersicht */
export function kuerzelListe(rollen = []) {
  const nav = navigationsZiele(rollen).filter((z) => z.kuerzel).map((z) => ({ tasten: z.kuerzel.split(" "), text: z.titel, folge: true }));
  return [
    { gruppe: "Allgemein", eintraege: [
      { tasten: ["Strg", "K"], text: "Befehlspalette öffnen (Mac: ⌘ K)" },
      { tasten: ["/"], text: "Suche öffnen" },
      { tasten: ["?"], text: "Diese Übersicht" },
      neuZiel(rollen) && { tasten: ["n"], text: aktionen(rollen).find((a) => a.neu)?.titel || "Neu anlegen" },
      { tasten: ["Esc"], text: "Dialog oder Palette schließen" },
    ].filter(Boolean) },
    { gruppe: "Gehe zu (nacheinander drücken)", eintraege: nav },
    { gruppe: "In der Befehlspalette", eintraege: [
      { tasten: ["↑", "↓"], text: "Eintrag wählen" },
      { tasten: ["Enter"], text: "Öffnen bzw. ausführen" },
      { tasten: ["Strg", "Enter"], text: "In neuem Tab öffnen" },
    ] },
  ];
}

// UI-Politur: Fachziele der übrigen Rollen und Backoffice-Unterrollen für die Bottom-Navigation
// (deckungsgleich mit der Seitenleiste in PortalRahmen.js)
const ROLLEN_ZIELE = [
  { id: "nav-anlagen", titel: "Mein Solarstrom", kurz: "Solarstrom", href: "/portal/anlagen", icon: SunMedium },
  { id: "nav-energie", titel: "Energie & Lastgang", kurz: "Energie", href: "/portal/energie", icon: Zap, exakt: true },
  { id: "nav-beschaffung", titel: "Energiebeschaffung", kurz: "Beschaffung", href: "/portal/energie/beschaffung", icon: PlugZap },
  { id: "nav-ausschreibungen", titel: "Angebotsanfragen", kurz: "Anfragen", href: "/portal/ausschreibungen", icon: FileSpreadsheet },
  { id: "nav-bank", titel: "Finanzierungsanfragen", kurz: "Anfragen", href: "/portal/bank", icon: Banknote },
  { id: "nav-beteiligung", titel: "Genossenschaft & Gemeinschaft", kurz: "Beteiligung", href: "/portal/beteiligung", icon: HandHeart },
  { id: "nav-kommune", titel: "Gemeinde", kurz: "Gemeinde", href: "/portal/kommune", icon: Landmark },
  { id: "nav-entwicklung", titel: "Aufträge & Projekte", kurz: "Aufträge", href: "/portal/entwicklung", icon: HardHat },
  { id: "nav-gutachter", titel: "Auftragsverwaltung (Angebote, Lieferungen, Rechnungen)", kurz: "Verwaltung", href: "/portal/gutachter", icon: ClipboardList }, // Gutachteraufträge
  { id: "nav-bo-energie", titel: "Energie-Handelsdesk", kurz: "Handelsdesk", href: "/portal/admin/energie", icon: PlugZap },
  { id: "nav-bo-anlagen", titel: "Anlagen & Störungen", kurz: "Anlagen", href: "/portal/admin/anlagen", icon: TriangleAlert },
  { id: "nav-bo-betrieb", titel: "Betriebsführung (SLA, Wartung, Prüfungen, Lager)", kurz: "Betrieb", href: "/portal/admin/anlagen/betrieb", icon: Wrench }, // Betriebsführung Anlagen
  { id: "nav-bo-compliance", titel: "Compliance (KYC)", kurz: "KYC", href: "/portal/admin/compliance", icon: ScanFace },
  { id: "nav-bo-entwicklung", titel: "Projektentwicklung", kurz: "Entwicklung", href: "/portal/admin/entwicklung", icon: Milestone },
  { id: "nav-bo-entwicklung-steuerung", titel: "Entwicklung: Steuerung & Entscheidungsvorlagen", kurz: "Steuerung", href: "/portal/admin/entwicklung/steuerung", icon: Milestone }, // Projektampel, Pipeline-Bericht, Kapazität
  { id: "nav-bo-finanzen", titel: "Finanzen & Abrechnung", kurz: "Finanzen", href: "/portal/admin/finanzen", icon: Landmark },
  { id: "nav-bo-akquise", titel: "Akquise & Gebiete", kurz: "Akquise", href: "/portal/admin/akquise", icon: Target },
];

/** Die 4 wichtigsten Ziele je Rolle für die mobile Bottom-Navigation (nutzer optional: Backoffice-Unterrollen) */
export function bottomNavZiele(rollen = [], nutzer = null) {
  const alle = [...navigationsZiele(rollen), ...ROLLEN_ZIELE];
  const z = (id) => alle.find((x) => x.id === id);
  let ids;
  if (rollen.includes("admin")) {
    // Backoffice: Cockpit, Aufgaben, Fachbereich der Unterrolle, Nachrichten – nur lesbare Bereiche
    const u = nutzer ? unterrollen(nutzer) : ["leitung"];
    const fach = u.includes("leitung") ? "nav-vorgaenge"
      : u.includes("energie") ? "nav-bo-energie"
      : u.includes("betrieb") ? "nav-bo-anlagen"
      : u.includes("compliance") ? "nav-bo-compliance"
      : u.includes("projektleitung") ? "nav-bo-entwicklung"
      : u.includes("buchhaltung") ? "nav-bo-finanzen"
      : u.includes("akquise") ? "nav-bo-akquise"
      : "nav-vorgaenge";
    ids = ["nav-cockpit", "nav-aufgaben", fach, "nav-nachrichten"];
    if (nutzer) ids = ids.filter((id) => { const ziel = z(id); const bereich = ziel && seitenBereich(ziel.href); return !bereich || darfLesen(nutzer, bereich); });
  }
  else if (hatRolle(rollen, "unternehmen")) ids = ["nav-dashboard", "nav-anlagen", "nav-energie", "nav-nachrichten"];
  else if (hatRolle(rollen, "gutachter")) ids = ["nav-dashboard", "nav-gutachter", "nav-entwicklung", "nav-nachrichten"]; // Gutachteraufträge
  else if (hatRolle(rollen, "kommune")) ids = ["nav-dashboard", "nav-kommune", "nav-nachrichten", "nav-dokumente"];
  else if (hatRolle(rollen, "bank")) ids = ["nav-dashboard", "nav-bank", "nav-nachrichten", "nav-dokumente"];
  else if (hatRolle(rollen, "lieferant")) ids = ["nav-dashboard", "nav-ausschreibungen", "nav-nachrichten", "nav-dokumente"];
  else if (hatRolle(rollen, "flaeche", "landwirt")) ids = ["nav-dashboard", "nav-flaechen", "nav-nachrichten", "nav-dokumente"];
  else if (hatRolle(rollen, "investor")) ids = ["nav-dashboard", "nav-boerse", "nav-nachrichten", "nav-profil"];
  else if (hatRolle(rollen, "anbieter")) ids = ["nav-dashboard", "nav-projekte", "nav-nachrichten", "nav-dokumente"];
  else if (hatRolle(rollen, "mitglied")) ids = ["nav-dashboard", "nav-beteiligung", "nav-nachrichten", "nav-dokumente"];
  else ids = ["nav-dashboard", "nav-anfragen", "nav-nachrichten", "nav-dokumente"];
  const kurz = { "nav-dashboard": "Übersicht", "nav-cockpit": "Cockpit", "nav-aufgaben": "Aufgaben", "nav-vorgaenge": "Vorgänge", "nav-flaechen": "Flächen", "nav-nachrichten": "Nachrichten", "nav-dokumente": "Dokumente", "nav-boerse": "Börse", "nav-profil": "Profil", "nav-projekte": "Projekte", "nav-anfragen": "Anfragen" };
  return ids.map(z).filter(Boolean).map((e) => ({ ...e, kurz: e.kurz || kurz[e.id] || e.titel }));
}

export const SuchIcon = Search;
