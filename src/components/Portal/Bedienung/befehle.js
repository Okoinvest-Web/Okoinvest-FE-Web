// src/components/Portal/Bedienung/befehle.js
//
// Befehle des Portals je Rolle: Navigation, Aktionen und Tastenkürzel – eine Quelle für
// Befehlspalette (Strg/⌘+K), Tastenkürzel-Hilfe und mobile Bottom-Navigation.
// Rein (keine Hooks); Icons aus lucide-react.

import {
  Bell, ClipboardList, Coins, FileText, FolderKanban, FolderPlus, Gauge, Handshake, HelpCircle, Inbox, Keyboard, LandPlot,
  LayoutDashboard, ListTodo, LogOut, Mail, MessagesSquare, Plus, Search, ShieldCheck, Sparkles, TrendingUp, UserRound, Users, Globe, Compass,
} from "lucide-react";

const hatRolle = (rollen, ...r) => r.some((x) => rollen.includes(x));

/** Navigationsziele (alle, die die Rollen sehen dürfen – deckungsgleich mit der Seitenleiste) */
export function navigationsZiele(rollen = []) {
  const admin = rollen.includes("admin");
  const flaeche = hatRolle(rollen, "flaeche", "landwirt");
  return [
    { id: "nav-dashboard", titel: "Übersicht", href: "/portal", icon: LayoutDashboard, stichworte: "dashboard start home", kuerzel: "g d" },
    { id: "nav-anfragen", titel: "Meine Anfragen", href: "/portal/anfragen", icon: Inbox, stichworte: "vorgänge anfrage", kuerzel: "g a" },
    flaeche && { id: "nav-flaechen", titel: "Flächen", href: "/portal/flaechen", icon: LandPlot, stichworte: "grundstück acker pacht", kuerzel: "g f" },
    (hatRolle(rollen, "anbieter") || admin) && { id: "nav-projekte", titel: admin && !hatRolle(rollen, "anbieter") ? "Projekt-Freigabe" : "Meine Projekte", href: admin && !hatRolle(rollen, "anbieter") ? "/portal/admin/projekte" : "/portal/projekte", icon: FolderKanban, stichworte: "projekt anbieter", kuerzel: "g p" },
    (hatRolle(rollen, "investor") || admin) && { id: "nav-boerse", titel: "Projektbörse", href: hatRolle(rollen, "investor") ? "/portal/boerse" : "/projektboerse", icon: TrendingUp, stichworte: "börse investment kaufen", kuerzel: "g b" },
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

/** Die 4 wichtigsten Ziele je Rolle für die mobile Bottom-Navigation */
export function bottomNavZiele(rollen = []) {
  const alle = navigationsZiele(rollen);
  const z = (id) => alle.find((x) => x.id === id);
  let ids;
  if (rollen.includes("admin")) ids = ["nav-cockpit", "nav-aufgaben", "nav-vorgaenge", "nav-nachrichten"];
  else if (hatRolle(rollen, "flaeche", "landwirt")) ids = ["nav-dashboard", "nav-flaechen", "nav-nachrichten", "nav-dokumente"];
  else if (hatRolle(rollen, "investor")) ids = ["nav-dashboard", "nav-boerse", "nav-nachrichten", "nav-profil"];
  else if (hatRolle(rollen, "anbieter")) ids = ["nav-dashboard", "nav-projekte", "nav-nachrichten", "nav-dokumente"];
  else ids = ["nav-dashboard", "nav-anfragen", "nav-nachrichten", "nav-dokumente"];
  const kurz = { "nav-dashboard": "Übersicht", "nav-cockpit": "Cockpit", "nav-aufgaben": "Aufgaben", "nav-vorgaenge": "Vorgänge", "nav-flaechen": "Flächen", "nav-nachrichten": "Nachrichten", "nav-dokumente": "Dokumente", "nav-boerse": "Börse", "nav-profil": "Profil", "nav-projekte": "Projekte", "nav-anfragen": "Anfragen" };
  return ids.map(z).filter(Boolean).map((e) => ({ ...e, kurz: kurz[e.id] || e.titel }));
}

export const SuchIcon = Search;
