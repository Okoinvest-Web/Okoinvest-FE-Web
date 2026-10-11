"use client";

// Rahmen des Portals: Seitenleiste (Desktop) bzw. Drawer (mobil), Kopfzeile mit
// Brotkrumen, Benachrichtigungszentrale (Glocke) und Benutzer-Menü. Navigation je Rolle.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell, Building2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, FileText, FolderKanban, Gauge, Handshake, Inbox, LandPlot, LayoutDashboard,
  ListTodo, LogOut, Mail, Menu, MessagesSquare, Search, ShieldCheck, TrendingUp, UserRound, Users, X, ExternalLink, Coins,
} from "lucide-react";
import { Gavel, SquareKanban } from "lucide-react"; // Deal-Room
import Glocke from "./Glocke";
import Bedienung from "./Bedienung/Bedienung";
import SuchKnopf from "./Bedienung/SuchKnopf";
import KontextHilfe from "./Querschnitt/KontextHilfe"; // Querschnitt: Hilfe/Handbuch je Seite
import SprungLinks from "./Bedienung/SprungLinks";
import Logo from "@/components/ui/Logo";
import { cn } from "@/components/ui/cn";
import useFokusFalle from "@/components/ui/useFokusFalle";
import { rolleLabel } from "@/lib/plattform/konstanten";
import { initialen } from "@/lib/plattform/format";
import { darfLesen, seitenBereich } from "@/lib/plattform/rechte"; // Backoffice-Unterrollen: Menü je Leserecht
import { unterrollen } from "@/lib/plattform/rechte"; // Onboarding B1: Menüpunkt Einarbeitung nur für Leitung
import { GraduationCap } from "lucide-react"; // Onboarding B1
import { BarChart3, Contact, KeyRound, LayoutTemplate, Link2, Target, Workflow } from "lucide-react"; // Backoffice-Ausbau
import { Fingerprint, UsersRound } from "lucide-react"; // Login, Sicherheit & Teams
import { SunMedium, TriangleAlert } from "lucide-react"; // Anlagen & Monitoring
import { Wrench } from "lucide-react"; // Betriebsführung Anlagen
import { MessageSquareWarning } from "lucide-react"; // Kundenseite Energie (Team 4)
import { BookOpenCheck, FileLock2, ShieldQuestion } from "lucide-react"; // Team 8: Buchhaltung, Datenschutz, Hinweis an Compliance
import { BadgeCheck, ScanFace } from "lucide-react"; // KYC/KYB
import { HandHeart, Zap } from "lucide-react"; // Fachprüfung Kapitalseite
import { Factory, Network, Sprout, SunMedium as EgSonne } from "lucide-react"; // Energiegemeinschaften ElWG (WP1)
import { EG_BROTKRUMEN, EG_SEITEN } from "@/lib/plattform/eg/navigation"; // Energiegemeinschaften ElWG (WP1)
import { HardHat, Milestone } from "lucide-react"; // Projektentwicklung
import { Landmark, ReceiptText } from "lucide-react"; // ERPNext-Finanzen & Abrechnung
import { Banknote, Calculator } from "lucide-react"; // Finanzierung
import { BookOpen, CalendarDays, FileSignature, LifeBuoy, Timer } from "lucide-react"; // Signatur, Termine, Service & HR
import { Map as KartenIcon } from "lucide-react"; // Geodaten & Akquise-Engine (Alias: globales Map nicht überdecken)
import { FileSpreadsheet, PlugZap } from "lucide-react"; // Energiebeschaffung
import { ScrollText, Stamp } from "lucide-react"; // Grundbuch & Closing
import { BriefcaseBusiness } from "lucide-react"; // Portfolio (Investor nach dem Kauf)
import OrgWechsler from "./Sicherheit/OrgWechsler";
import TourHinweis from "./Bedienung/Onboarding/TourHinweis"; // Onboarding B1: Tour-Hinweise (abschaltbar)
import { avatarKlasse } from "@/lib/plattform/organisation";
import { useCallback, useLayoutEffect } from "react"; // T3: Seitenleiste, Indikator, Seitenübergang
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"; // T3: Seitenleiste einklappen
import { Share2 } from "lucide-react"; // Welle 2: Lead-Desk (B3), Kanäle Gruppe/Partner (GRP)
import RevealObserver from "@/components/ui/RevealObserver"; // T3: Stagger/Reveal/Sparkline auch im Portal
import { bewegungReduziert } from "@/components/ui/motion"; // T3: Seitenübergang
import { EREIGNIS_SEITENLEISTE, speicherLesen, speicherSchreiben } from "./Bedienung/speicher"; // T3: Kürzel „[“, Vorlieben
import "./portal-rahmen.css"; // T3: Rahmen-Klassen (pr-*)

function navigation(rollen, nutzer = { rollen }) {
  const hat = (...r) => r.some((x) => rollen.includes(x));
  const admin = rollen.includes("admin");
  const bereiche = [
    {
      titel: "Mein Portal",
      eintraege: [
        { href: "/portal", label: "Übersicht", icon: LayoutDashboard, exakt: true },
        { href: "/portal/anfragen", label: "Meine Anfragen", icon: Inbox },
        hat("flaeche", "landwirt") && { href: "/portal/flaechen", label: "Flächen", icon: LandPlot },
        hat("anbieter") && { href: "/portal/projekte", label: "Meine Projekte", icon: FolderKanban },
        hat("investor") && { href: "/portal/boerse", label: "Projektbörse", icon: TrendingUp },
        hat("investor") && { href: "/portal/pipeline", label: "Deal-Pipeline", icon: SquareKanban }, // Deal-Room
        hat("investor", "anbieter") && { href: "/portal/finanzierung", label: "Finanzierungscockpit", icon: Calculator }, // Finanzierung: Rendite & Finanzierungsvergleich
        hat("bank") && { href: "/portal/bank", label: "Finanzierungsanfragen", icon: Banknote }, // Finanzierung: Bank-Portal (externe Rolle)
        hat("unternehmen") && { href: "/portal/anlagen", label: "Mein Solarstrom", icon: SunMedium }, // Anlagen & Monitoring (Kunde = Stromabnehmer, Anlage im Eigentum von ÖkoInvest)
        hat("unternehmen") && { href: "/portal/energie", label: "Energie & Lastgang", icon: Zap, exakt: true }, // Fachprüfung Kapitalseite: Abnahmestellen, Lastgang, Pool
        hat("unternehmen") && { href: "/portal/energie/beschaffung", label: "Energiebeschaffung", icon: PlugZap }, // Energiebeschaffung: Vertrag, Ausschreibung, Freigabe, Vollmacht
        hat("lieferant") && { href: "/portal/ausschreibungen", label: "Angebotsanfragen", icon: FileSpreadsheet }, // Energiebeschaffung: Versorger-Portal
        hat("mitglied") && { href: "/portal/beteiligung", label: "Genossenschaft & Gemeinschaft", icon: HandHeart }, // Fachprüfung Kapitalseite
        hat("mitglied", "kommune", "landwirt", "unternehmen") && { href: EG_SEITEN.portal.href, label: EG_SEITEN.portal.label, icon: EgSonne }, // Energiegemeinschaften ElWG: Mitglied, Organe (WP6/WP1)
        { href: EG_SEITEN.portalGruendung.href, label: EG_SEITEN.portalGruendung.label, icon: Sprout }, // Energiegemeinschaften WP5: Gründungsauftrag (alle Konten)
        hat("kommune") && { href: "/portal/kommune", label: "Gemeinde", icon: Landmark }, // Onboarding B1: Rolle Kommune → Gemeinde-Sicht
        hat("gutachter") && { href: "/portal/gutachter", label: "Auftragsverwaltung", icon: ClipboardList }, // Gutachteraufträge: Angebote, Beauftragung, Lieferungen, Rechnungen
        hat("flaeche", "landwirt", "investor", "gutachter") && { href: "/portal/entwicklung", label: hat("gutachter") ? "Aufträge & Projekte" : "Projektentwicklung", icon: HardHat }, // Projektentwicklung: „Wo steht mein Projekt?“, Co-Development, Gutachter
        hat("flaeche", "landwirt", "unternehmen", "anbieter") && { href: "/portal/abrechnungen", label: "Abrechnungen", icon: ReceiptText }, // ERPNext-Finanzen & Abrechnung
        hat("unternehmen") && { href: "/portal/anliegen", label: "Anliegen & Einsprüche", icon: MessageSquareWarning }, // Kundenseite Energie (Team 4): Einspruch, Störung, Kündigung, Übernahme
        hat("flaeche", "landwirt") && { href: "/portal/pachtvertraege", label: "Pachtverträge", icon: ScrollText }, // Pachtakte (Team 1): Fristen, Anliegen, Rückbau, Jahresbescheinigung
        hat("flaeche", "landwirt", "unternehmen") && { href: "/portal/grundbuch", label: "Grundbuch", icon: ScrollText }, // Grundbuch & Closing: Dienstbarkeit Eigentümer/Dachgeber
        hat("investor", "anbieter") && { href: "/portal/closing", label: "Deal-Abschluss", icon: Stamp }, // Grundbuch & Closing: Closing-Raum Käufer/Verkäufer
        hat("investor") && { href: "/portal/portfolio", label: "Portfolio", icon: BriefcaseBusiness }, // Portfolio: gekaufte Anlagen, Beteiligungen, Ausschüttungen, Berichte
        { href: "/portal/nachrichten", label: "Nachrichten", icon: MessagesSquare, zaehler: "nachrichten" },
        { href: "/portal/benachrichtigungen", label: "Benachrichtigungen", icon: Bell, zaehler: "hinweise" },
        { href: "/portal/dokumente", label: "Dokumente", icon: FileText },
        { href: "/portal/signatur", label: "Unterschriften", icon: FileSignature }, // Signatur
        { href: "/portal/termine", label: "Termine", icon: CalendarDays }, // Termine
        { href: "/portal/support", label: "Support", icon: LifeBuoy }, // Service
        { href: "/portal/profil", label: hat("investor") ? "Profil & Suchprofil" : "Profil", icon: UserRound },
        { href: "/portal/organisation", label: "Organisation & Team", icon: UsersRound }, // Login, Sicherheit & Teams
        { href: "/portal/sicherheit", label: "Sicherheit", icon: Fingerprint },
        { href: "/portal/verifizierung", label: "Verifizierung", icon: BadgeCheck }, // KYC/KYB
      ].filter(Boolean),
    },
  ];
  if (admin) {
    bereiche.push({
      titel: "Backoffice",
      eintraege: [
        { href: "/portal/admin", label: "Cockpit", icon: Gauge, exakt: true },
        { href: "/portal/admin/aufgaben", label: "Aufgaben", icon: ListTodo, zaehler: "aufgaben" },
        { href: "/portal/admin/vorgaenge", label: "Vorgänge", icon: ClipboardList },
        { href: "/portal/admin/leads", label: "Lead-Desk", icon: Inbox }, // Welle 2, Paket B3
        { href: "/portal/admin/flaechen", label: "Flächen-Pipeline", icon: LandPlot },
        { href: "/portal/admin/projekte", label: "Projekt-Freigabe", icon: ShieldCheck },
        { href: "/portal/admin/interessen", label: "NDA & LOI", icon: Handshake },
        { href: "/portal/admin/dealroom", label: "Deal-Room", icon: Gavel }, // Deal-Room: Q&A-Moderation, Bieterverfahren
        { href: "/portal/admin/closing", label: "Deal-Abschluss", icon: Stamp }, // Grundbuch & Closing: Closing-Räume
        { href: "/portal/admin/portfolio", label: "Investoren-Portfolio", icon: BriefcaseBusiness }, // Portfolio: Kapitalabrufe, Ausschüttungen, Erträge, Wiederverkauf
        { href: "/portal/admin/grundbuch", label: "Grundbuch & Dienstbarkeiten", icon: ScrollText }, // Grundbuch & Closing
        { href: "/portal/admin/pachtakten", label: "Pachtakten", icon: ScrollText }, // Pachtakte (Team 1)
        { href: "/portal/admin/entwicklung", label: "Projektentwicklung", icon: Milestone }, // Projektentwicklung: Pipeline, Gantt, Risiken
        { href: "/portal/admin/gutachter", label: "Gutachteraufträge", icon: ClipboardList }, // Gutachteraufträge: Angebotsvergleich, Abnahme, Rechnungen, Bewertung
        { href: "/portal/admin/anlagen", label: "Anlagen & Störungen", icon: TriangleAlert }, // Anlagen & Monitoring: Störungs-Leitstand
        { href: "/portal/admin/anlagen/betrieb", label: "Betriebsführung", icon: Wrench }, // Betriebsführung: SLA, Aufträge, Wartungsplan, Prüfungen, Ersatzteile, Berichte
        { href: "/portal/admin/energie", label: "Energie-Handelsdesk", icon: PlugZap }, // Energiebeschaffung: Spot/Termin, Pool, Kunden, Ausschreibungen, Lieferanten
        { href: "/portal/admin/finanzen/anliegen", label: "Kundenanliegen", icon: MessageSquareWarning }, // Kundenseite Energie (Team 4): Einsprüche, Kündigungen, Übernahmen
        { href: "/portal/admin/compliance", label: "Compliance (KYC)", icon: ScanFace }, // KYC/KYB: Warteschlange, Prüfung, Sanktionsabgleich
        { href: "/portal/admin/compliance/datenschutz", label: "Datenschutz & GwG", icon: FileLock2 }, // Team 8: DSGVO-Anfragen, VVT, Verdachtsfälle
        { href: "/portal/admin/bonitaet", label: "Bonität", icon: Gauge }, // Dienste: Bonitätsauskünfte vor LOI
        { href: "/portal/admin/gesellschaften", label: "Gesellschaften & SPV", icon: Building2 }, // Dienste: SPV-Gründung, Organigramm, Fristen
        { href: "/portal/admin/deals", label: "Deals & Provisionen", icon: Coins },
        { href: "/portal/admin/deals/pipeline", label: "Deal-Pipeline", icon: SquareKanban }, // Team 8: Verkaufs-Pipeline, erwartete Provision
        { href: "/portal/admin/finanzen", label: "Finanzen & Abrechnung", icon: Landmark }, // ERPNext-Finanzen & Abrechnung
        { href: "/portal/admin/finanzen/buchhaltung", label: "Buchhaltung (OP, Mahnwesen)", icon: BookOpenCheck }, // Team 8: OP, Mahnwesen, Zahlungseingang, Export, Abschluss
        { href: "/portal/admin/finanzierung", label: "Finanzierung & Banken", icon: Banknote }, // Finanzierung: Bankfinanzierung Eigenbetrieb, Covenants
        { href: "/portal/admin/genossenschaft", label: "Genossenschaft", icon: HandHeart }, // Team 5: Mitglieder, GV, Ausschüttungen
        { href: "/portal/admin/energiegemeinschaften", label: "Energiegemeinschaften (Prototyp)", icon: Zap }, // Team 5: Teilnehmer, Monatsläufe – abgelöst durch /portal/admin/eg (WP1), DE/CH bleiben hier
        { href: "/portal/admin/nutzer", label: "Nutzer & Protokoll", icon: Users },
        { href: "/portal/admin/postausgang", label: "E-Mail-Postausgang", icon: Mail },
        { href: "/portal/admin/kalender", label: "Kalender", icon: CalendarDays }, // Termine
        { href: "/portal/admin/support", label: "Support-Tickets", icon: LifeBuoy }, // Service
        { href: "/portal/admin/hinweis", label: "Hinweis an Compliance", icon: ShieldQuestion }, // Team 8: vertraulicher GwG-Hinweis
      ].filter((e) => darfLesen(nutzer, seitenBereich(e.href))),
    });
    // Energiegemeinschaften ElWG (WP1–WP6): eigener Bereich „eg“ der Rechte-Matrix
    bereiche.push({
      titel: "Energiegemeinschaften",
      eintraege: [
        { href: EG_SEITEN.adminListe.href, label: "Gemeinschaften", icon: EgSonne, exakt: true },
        { href: EG_SEITEN.adminGruendung.href, label: EG_SEITEN.adminGruendung.label, icon: Sprout }, // WP5
        { href: EG_SEITEN.adminSimulation.href, label: EG_SEITEN.adminSimulation.label, icon: Factory }, // WP3
        { href: EG_SEITEN.adminNetz.href, label: EG_SEITEN.adminNetz.label, icon: Network }, // WP1
      ].filter((e) => darfLesen(nutzer, seitenBereich(e.href))),
    });
    // Backoffice-Ausbau: CRM, Akquise, Automationen, Vorlagen, Berichte, Revisionsprotokoll, Rechte
    bereiche.push({
      titel: "Steuerung",
      eintraege: [
        { href: "/portal/admin/crm", label: "CRM", icon: Contact },
        { href: "/portal/admin/akquise", label: "Akquise & Gebiete", icon: Target },
        { href: "/portal/admin/akquise/karte", label: "Akquise-Karte", icon: KartenIcon }, // Geodaten & Akquise-Engine
        { href: "/portal/admin/automationen", label: "Automationen", icon: Workflow },
        { href: "/portal/admin/vorlagen", label: "Vorlagen", icon: LayoutTemplate },
        { href: "/portal/admin/berichte", label: "Berichte", icon: BarChart3 },
        { href: "/portal/admin/kanaele", label: "Kanäle Gruppe & Partner", icon: Share2 }, // Welle 2, Paket GRP
        { href: "/portal/admin/newsletter", label: "Newsletter", icon: Mail }, // Plattform-Armee, MARKETING: Empfänger, Einwilligungen, Newsroom-Entwürfe
        { href: "/portal/admin/protokoll", label: "Revisionsprotokoll", icon: Link2 },
        { href: "/portal/admin/rechte", label: "Rechte", icon: KeyRound },
        { href: "/portal/admin/team", label: "Team & Zeiten", icon: Timer }, // HR
        { href: "/portal/admin/wissen", label: "Wissensdatenbank", icon: BookOpen }, // HR: intern
      ].filter((e) => darfLesen(nutzer, seitenBereich(e.href))),
    });
    // Onboarding B1: Einarbeitungsstand des Teams – nur Leitung
    if (unterrollen(nutzer).includes("leitung")) bereiche[bereiche.length - 1].eintraege.push({ href: "/portal/admin/einarbeitung", label: "Einarbeitung", icon: GraduationCap });
    if (unterrollen(nutzer).includes("leitung")) bereiche[bereiche.length - 1].eintraege.unshift({ href: "/portal/admin/leitung", label: "Leitungs-Cockpit", icon: BarChart3 }); // Querschnitt: Unternehmens-KPIs, Management-Bericht
  }
  return bereiche;
}

const LABELS = {
  portal: "Portal",
  anfragen: "Anfragen",
  flaechen: "Flächen",
  projekte: "Projekte",
  boerse: "Projektbörse",
  nachrichten: "Nachrichten",
  dokumente: "Dokumente",
  profil: "Profil",
  admin: "Backoffice",
  vorgaenge: "Vorgänge",
  interessen: "NDA & LOI",
  deals: "Deals & Provisionen",
  nutzer: "Nutzer",
  neu: "Neu",
  benachrichtigungen: "Benachrichtigungen",
  aufgaben: "Aufgaben",
  postausgang: "Postausgang",
  vergleich: "Vergleich",
  sicherheit: "Sicherheit",
  organisation: "Organisation & Team",
  pipeline: "Deal-Pipeline",
  dealroom: "Deal-Room",
  anlagen: "Anlagen", // Anlagen & Monitoring
  abrechnungen: "Abrechnungen", finanzen: "Finanzen & Abrechnung", // ERPNext-Finanzen & Abrechnung
  anliegen: "Anliegen", kosten: "Energiekosten", wechsel: "Lieferantenwechsel", // Kundenseite Energie (Team 4)
  entwicklung: "Projektentwicklung", steckbrief: "Steckbrief", // Projektentwicklung
  finanzierung: "Finanzierung", bank: "Finanzierungsanfragen", // Finanzierung
  gutachter: "Gutachteraufträge", akte: "Bank-Akte", // Gutachteraufträge, Bank-Akte
  energie: "Energie & Lastgang", beteiligung: "Genossenschaft & Gemeinschaft", bewertung: "Bewertung", // Fachprüfung Kapitalseite
  verifizierung: "Verifizierung", compliance: "Compliance", // KYC/KYB
  gesellschaften: "Gesellschaften", bonitaet: "Bonität", identitaet: "Online-Identifizierung", // Dienste
  grundbuch: "Grundbuch", closing: "Deal-Abschluss", // Grundbuch & Closing
  pachtvertraege: "Pachtverträge", pachtakten: "Pachtakten", // Pachtakte (Team 1)
  planung: "Planunterlage", kampagnen: "Kampagnen", gemeinden: "Gemeinde-Screening", sperrliste: "Sperrliste",
  signatur: "Unterschriften", termine: "Termine", support: "Support", kalender: "Kalender", team: "Team & Zeiten", wissen: "Wissensdatenbank", // Signatur, Termine, Service & HR
  karte: "Karte",
  hilfe: "Hilfe",
  willkommen: "Einstieg",
  kommune: "Gemeinde", einarbeitung: "Einarbeitung", // Onboarding B1
  genossenschaft: "Genossenschaft", energiegemeinschaft: "Energiegemeinschaft", energiegemeinschaften: "Energiegemeinschaften", versammlung: "Generalversammlung", // Team 5
  leitung: "Leitungs-Cockpit", handbuch: "Handbuch", // Querschnitt
  leads: "Lead-Desk", kanaele: "Kanäle", newsletter: "Newsletter", // Welle 2 + Plattform-Armee MARKETING
  crm: "CRM", akquise: "Akquise", automationen: "Automationen", vorlagen: "Vorlagen", berichte: "Berichte", protokoll: "Revisionsprotokoll", rechte: "Rechte", dubletten: "Dubletten", organisation: "Organisation", // Backoffice-Ausbau
  ausschreibungen: "Ausschreibungen", beschaffung: "Beschaffung", kunden: "Kunden", lieferanten: "Lieferanten", // Energiebeschaffung
};

function brotkrumen(pfad) {
  const teile = pfad.split("/").filter(Boolean);
  return teile.map((t, i) => ({ href: "/" + teile.slice(0, i + 1).join("/"), label: (teile.includes("eg") && EG_BROTKRUMEN[t]) || (t === "energie" && teile[i - 1] === "admin" ? "Energie-Handelsdesk" : LABELS[t]) || decodeURIComponent(t) })) // Energiebeschaffung: /portal/admin/energie
    .map((k, i) => (k.label === decodeURIComponent(teile[i]) && !LABELS[teile[i]] && /\d/.test(teile[i]) ? { ...k, objekt: true, label: OBJEKT_LABEL[teile[i - 1]] || "Details" } : k)); // T3: keine nackten IDs
}

// T3: Bezeichnung für Objekt-Ebenen (IDs) – wird im Browser durch den Seitentitel ersetzt
const OBJEKT_LABEL = {
  flaechen: "Fläche", projekte: "Projekt", boerse: "Exposé", anfragen: "Anfrage", vorgaenge: "Vorgang", nutzer: "Nutzer", eg: "Gemeinschaft",
  anlagen: "Anlage", entwicklung: "Projekt", pachtvertraege: "Pachtvertrag", pachtakten: "Pachtakte", closing: "Abschluss", dealroom: "Deal-Room",
  gutachter: "Auftrag", deals: "Deal", crm: "Kontakt", portfolio: "Position", support: "Ticket", gesellschaften: "Gesellschaft", grundbuch: "Grundbuch-Akte",
  abrechnungen: "Abrechnung", ausschreibungen: "Ausschreibung", kunden: "Kunde", lieferanten: "Lieferant", genossenschaft: "Mitglied", bank: "Anfrage",
};
const TITEL_SPEICHER = "oi-krumen-titel";
/** Seitentitel ohne Zusatz („… | Portal ÖkoInvest“) */
function seitenTitel() {
  const t = String(document.title || "").split(" | ")[0].trim();
  return t && t.length <= 80 ? t : "";
}

function aktiv(pfad, e) {
  return e.exakt ? pfad === e.href : pfad === e.href || pfad.startsWith(e.href + "/");
}

// ---------------------------------------------------------------- T3: Seitenleiste 2.0
// Einklappbar (Zustand je Browser), Gruppen auf-/zuklappbar, gleitender Aktiv-Indikator,
// Tooltips in der schmalen Leiste. Vorlieben sind reine Bequemlichkeit (localStorage).
const SPEICHER_SCHMAL = "oi-nav-schmal";
const SPEICHER_ZU = "oi-nav-zu";
const KLAMMER = String.fromCharCode(91); // Taste zum Ein-/Ausklappen
const GRUPPEN_ID = { "Mein Portal": "mein", Backoffice: "backoffice", Energiegemeinschaften: "eg", Steuerung: "steuerung" };
const gruppenId = (titel, i) => GRUPPEN_ID[titel] || `g${i}`;

// Läuft beim Parsen des Server-HTML (vor dem ersten Bild): setzt Marker für die schmale Leiste
// und zugeklappte Gruppen, damit nach der Hydrierung nichts springt. Per innerHTML eingefügt,
// führt React es clientseitig nie aus – dort übernimmt der Layout-Effekt.
const VORAB_SKRIPT =
  'try{var d=document,s=window.localStorage,h=d.head;' +
  'if(s.getItem("' + SPEICHER_SCHMAL + '")==="true"&&!d.getElementById("oi-nav-vorab")){var m=d.createElement("meta");m.id="oi-nav-vorab";h.appendChild(m)}' +
  'var z=JSON.parse(s.getItem("' + SPEICHER_ZU + '")||__STANDARD__);' +
  'if(z&&z.forEach&&!d.getElementById("oi-nav-vorab-gruppen")){var c="";z.forEach(function(g){if(/^\\w+$/.test(g))c+=".pr-g-"+g+" .pr-gruppe-liste>li:not(.pr-aktiv-li){display:none}.pr-g-"+g+" .pr-chevron{transform:rotate(-90deg)}"});' +
  'var st=d.createElement("style");st.id="oi-nav-vorab-gruppen";st.textContent=c;h.appendChild(st)}}catch(e){}';
const vorabHtml = (zuStandard) => `<script>${VORAB_SKRIPT.replace("__STANDARD__", JSON.stringify(JSON.stringify(zuStandard)))}</script>`;

/** Tooltip für die schmale Leiste: Hover + Fokus, Esc schließt, bleibt beim Überfahren (WCAG 1.4.13) */
function useLeistenTipp(aktiv) {
  const [tipp, setTipp] = useState(null);
  const timer = useRef(null);
  useEffect(() => {
    if (!aktiv) setTipp(null);
  }, [aktiv]);
  useEffect(() => {
    if (!tipp) return undefined;
    const taste = (e) => e.key === "Escape" && setTipp(null);
    document.addEventListener("keydown", taste);
    return () => document.removeEventListener("keydown", taste);
  }, [tipp]);
  const zeigen = useCallback(
    (text, el) => {
      if (!aktiv || !el) return;
      clearTimeout(timer.current);
      const r = el.getBoundingClientRect();
      setTipp({ text, x: r.right + 10, y: r.top + r.height / 2 });
    },
    [aktiv]
  );
  const verbergen = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTipp(null), 120);
  }, []);
  const tippProps = useCallback(
    (text) =>
      aktiv
        ? {
            onMouseEnter: (e) => zeigen(text, e.currentTarget),
            onMouseLeave: verbergen,
            onFocus: (e) => zeigen(text, e.currentTarget),
            onBlur: verbergen,
          }
        : {},
    [aktiv, zeigen, verbergen]
  );
  const element = tipp ? (
    <span
      aria-hidden="true"
      onMouseEnter={() => clearTimeout(timer.current)}
      onMouseLeave={verbergen}
      className="ov-tooltip fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-xl bg-navy-950 px-3 py-1.5 text-[13px] font-semibold text-white shadow-e3 ring-1 ring-white/10"
      style={{ left: tipp.x, top: tipp.y }}
    >
      {tipp.text}
    </span>
  ) : null;
  return { tippProps, element };
}

/** Navigationsliste (Desktop-Leiste und Drawer je eigene Instanz) */
function NavListe({ bereiche, pfad, zaehler, zu, gruppeUmschalten, schmal = false, kennung, tippProps = () => ({}) }) {
  const innenRef = useRef(null);
  const [ind, setInd] = useState({ y: 0, h: 0, bereit: false, sofort: true });

  const messen = useCallback(() => {
    const innen = innenRef.current;
    if (!innen) return;
    const a = innen.querySelector(".pr-link-aktiv");
    if (!a || !a.getClientRects().length) {
      setInd((v) => (v.bereit ? { ...v, bereit: false, sofort: true } : v));
      return;
    }
    const y = Math.round(a.getBoundingClientRect().top - innen.getBoundingClientRect().top);
    const h = a.offsetHeight;
    setInd((v) => (v.bereit && v.y === y && v.h === h ? v : { y, h, bereit: true, sofort: !v.bereit || v.h !== h }));
  }, []);

  useLayoutEffect(() => {
    messen();
  }, [messen, pfad, schmal, zu]);

  useEffect(() => {
    const innen = innenRef.current;
    if (!innen || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => messen());
    ro.observe(innen);
    return () => ro.disconnect();
  }, [messen]);

  const mehrere = bereiche.length > 1;
  return (
    <nav aria-label="Portal" data-indikator={ind.bereit ? "1" : undefined} className="pr-nav flex-1 overflow-y-auto overscroll-contain px-3 py-5">
      <div ref={innenRef} className="relative space-y-6">
        <span
          aria-hidden="true"
          className="pr-indikator"
          data-bereit={ind.bereit ? "1" : undefined}
          data-sofort={ind.sofort ? "1" : undefined}
          style={{ transform: `translate3d(0, ${ind.y}px, 0)`, height: ind.h || 0 }}
        />
        {bereiche.map((b, gi) => {
          const id = gruppenId(b.titel, gi);
          const istZu = mehrere && zu.includes(id);
          const listenId = `${kennung}-gruppe-${id}`;
          return (
            <div key={b.titel} className={cn("pr-gruppe", `pr-g-${id}`, istZu && "pr-zu")}>
              {gi > 0 && <div aria-hidden="true" className="pr-nur-schmal mx-auto mb-3 h-px w-8 bg-white/10" />}
              {mehrere ? (
                <button
                  type="button"
                  onClick={() => gruppeUmschalten(id)}
                  aria-expanded={!istZu}
                  aria-controls={listenId}
                  className="pr-nur-breit group/kopf flex w-full items-center justify-between rounded-lg px-3 py-1 text-left text-[11.5px] font-semibold uppercase tracking-[0.16em] text-white/55 transition-colors hover:text-white/90"
                >
                  <span id={`${listenId}-titel`}>{b.titel}</span>
                  <ChevronDown aria-hidden="true" className="pr-chevron h-3.5 w-3.5 text-white/40 group-hover/kopf:text-white/80" />
                </button>
              ) : (
                <p id={`${listenId}-titel`} className="pr-nur-breit px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-white/55">{b.titel}</p>
              )}
              <ul id={listenId} aria-labelledby={`${listenId}-titel`} className="pr-gruppe-liste mt-1.5 space-y-0.5">
                {b.eintraege.map((e) => {
                  const ist = aktiv(pfad, e);
                  const Icon = e.icon;
                  const zahl = e.zaehler ? zaehler[e.zaehler] : 0;
                  return (
                    <li key={e.href} className={ist ? "pr-aktiv-li" : undefined}>
                      <Link
                        href={e.href}
                        aria-current={ist ? "page" : undefined}
                        {...tippProps(zahl > 0 ? `${e.label} · ${zahl}` : e.label)}
                        className={cn(
                          "pr-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors duration-150",
                          ist ? "pr-link-aktiv text-white" : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                        )}
                      >
                        <Icon aria-hidden="true" className={cn("h-[18px] w-[18px] shrink-0 transition-colors duration-150", ist ? "text-ov-300" : "text-white/45 group-hover:text-white/80")} />
                        <span className="pr-label min-w-0 flex-1 truncate">{e.label}</span>
                        {zahl > 0 && (
                          <>
                            <span className={cn("pr-nur-breit ov-num rounded-full px-2 py-0.5 text-[11.5px] font-bold", e.zaehler === "aufgaben" ? "bg-sun-400 text-navy-950" : "bg-ov-500 text-white")}>
                              {zahl > 99 ? "99+" : zahl}
                              <span className="sr-only">{e.zaehler === "aufgaben" ? " fällig" : " ungelesen"}</span>
                            </span>
                            <span aria-hidden="true" className={cn("pr-nur-schmal absolute right-3.5 top-2 h-2 w-2 rounded-full ring-2 ring-navy-950", e.zaehler === "aufgaben" ? "bg-sun-400" : "bg-ov-400")} />
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export default function PortalRahmen({ nutzer, ungelesen = 0, hinweise = { eintraege: [], ungelesen: 0 }, aufgabenFaellig = 0, demo = false, children }) {
  const pfad = usePathname() || "/portal";
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [menue, setMenue] = useState(false);
  const drawerRef = useRef(null);
  const menueRef = useRef(null);
  const bereiche = navigation(nutzer.rollen || [], nutzer);
  const zaehler = { nachrichten: ungelesen, hinweise: hinweise?.ungelesen || 0, aufgaben: aufgabenFaellig };

  useFokusFalle(offen, drawerRef, { beiEscape: () => setOffen(false) });

  // ---- T3: Seitenleiste einklappbar, Gruppen, Seitenübergang, Kopfzeilen-Schatten
  const istAdminKonto = (nutzer.rollen || []).includes("admin");
  // Backoffice-Konten: Backoffice zuerst, „Mein Portal“ unten (standardmäßig zugeklappt)
  const geordnet = istAdminKonto && bereiche.length > 1 ? [...bereiche.slice(1), bereiche[0]] : bereiche;
  const zuStandard = istAdminKonto ? ["mein"] : [];
  const [schmal, setSchmal] = useState(false);
  const [zu, setZu] = useState(zuStandard);
  const [vorlieben, setVorlieben] = useState(false);
  const [gescrollt, setGescrollt] = useState(false);
  const inhaltRef = useRef(null);
  const ersterPfad = useRef(true);
  const { tippProps, element: tippElement } = useLeistenTipp(schmal);

  useLayoutEffect(() => {
    setSchmal(speicherLesen(SPEICHER_SCHMAL, false) === true);
    const z = speicherLesen(SPEICHER_ZU, null);
    if (Array.isArray(z)) setZu(z.filter((x) => typeof x === "string"));
    setVorlieben(true);
  }, []);
  useEffect(() => {
    if (!vorlieben) return;
    document.getElementById("oi-nav-vorab")?.remove();
    document.getElementById("oi-nav-vorab-gruppen")?.remove();
  }, [vorlieben]);
  useEffect(() => {
    if (vorlieben) speicherSchreiben(SPEICHER_SCHMAL, schmal ? true : null);
  }, [schmal, vorlieben]);
  useEffect(() => {
    if (vorlieben) speicherSchreiben(SPEICHER_ZU, zu);
  }, [zu, vorlieben]);

  const leisteUmschalten = useCallback(() => setSchmal((s) => !s), []);
  const gruppeUmschalten = useCallback((id) => setZu((z) => (z.includes(id) ? z.filter((x) => x !== id) : [...z, id])), []);
  useEffect(() => {
    const auf = () => window.matchMedia("(min-width: 64rem)").matches && leisteUmschalten();
    window.addEventListener(EREIGNIS_SEITENLEISTE, auf);
    return () => window.removeEventListener(EREIGNIS_SEITENLEISTE, auf);
  }, [leisteUmschalten]);

  // Sanfter Seitenwechsel (nur transform/opacity, ohne Neuaufbau des Inhalts)
  useEffect(() => {
    if (ersterPfad.current) {
      ersterPfad.current = false;
      return;
    }
    const el = inhaltRef.current;
    if (!el?.animate || bewegungReduziert()) return;
    el.animate([{ opacity: 0.001, transform: "translate3d(0, 8px, 0)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
  }, [pfad]);

  useEffect(() => {
    const pruefen = () => setGescrollt(window.scrollY > 4);
    pruefen();
    window.addEventListener("scroll", pruefen, { passive: true });
    return () => window.removeEventListener("scroll", pruefen);
  }, []);

  // Brotkrumen: Objekt-Ebenen (IDs) mit dem Seitentitel benennen, Titel je Pfad für Elternebenen merken
  const [objektTitel, setObjektTitel] = useState({});
  useEffect(() => {
    const t = setTimeout(() => {
      const gemerkt = (() => {
        try {
          return JSON.parse(window.sessionStorage.getItem(TITEL_SPEICHER) || "{}") || {};
        } catch {
          return {};
        }
      })();
      const titel = seitenTitel();
      if (titel && /\d/.test(pfad.split("/").pop() || "")) gemerkt[pfad] = titel;
      try {
        const eintraege = Object.entries(gemerkt).slice(-40);
        window.sessionStorage.setItem(TITEL_SPEICHER, JSON.stringify(Object.fromEntries(eintraege)));
      } catch {
        /* ohne Speicher weiter */
      }
      setObjektTitel(gemerkt);
    }, 60);
    return () => clearTimeout(t);
  }, [pfad]);

  useEffect(() => {
    setOffen(false);
    setMenue(false);
  }, [pfad]);

  useEffect(() => {
    if (!menue) return undefined;
    const klick = (e) => !menueRef.current?.contains(e.target) && setMenue(false);
    const taste = (e) => e.key === "Escape" && setMenue(false);
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [menue]);

  async function abmelden() {
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    router.replace("/login?hinweis=abgemeldet");
    router.refresh();
  }

  const krumen = brotkrumen(pfad);
  const name = [nutzer.vorname, nutzer.nachname].filter(Boolean).join(" ");

  const leiste = (desktop) => {
    const tp = desktop ? tippProps : () => ({});
    return (
      <>
        <div className="pr-logo-zeile flex h-[72px] shrink-0 items-center px-6">
          <Link href="/portal" className="pr-nur-breit h-7 lg:h-9" aria-label="Portal-Übersicht">
            <Logo tone="dark" unterzeile={false} />
          </Link>
          {desktop && (
            <Link href="/portal" className="pr-nur-schmal h-10 w-10 items-center justify-center rounded-xl hover:bg-white/[0.06]" aria-label="Portal-Übersicht" {...tp("Übersicht")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="" width={32} height={30} className="h-[30px] w-8" />
            </Link>
          )}
        </div>
        {demo && (
          <>
            <p className="pr-nur-breit mx-6 rounded-xl bg-sun-400/15 px-3 py-2 text-[12.5px] leading-snug text-sun-200 ring-1 ring-inset ring-sun-400/30">
              Demo-Modus: Alle Daten sind fiktiv.
            </p>
            {desktop && (
              <p className="pr-nur-schmal mx-auto justify-center rounded-full bg-sun-400/15 px-2 py-0.5 text-[12px] font-semibold text-sun-200 ring-1 ring-inset ring-sun-400/30" title="Demo-Modus: Alle Daten sind fiktiv.">
                Demo
              </p>
            )}
          </>
        )}
        {/* Organisationswechsel mobil (im Kopf ab sm) – Login, Sicherheit & Teams */}
        <div className="px-6 pt-4 sm:hidden">
          <OrgWechsler organisationen={nutzer.organisationen || []} aktiv={nutzer.organisation || null} />
        </div>
        <NavListe
          bereiche={geordnet}
          pfad={pfad}
          zaehler={zaehler}
          zu={zu}
          gruppeUmschalten={gruppeUmschalten}
          schmal={desktop && schmal}
          kennung={desktop ? "nav-leiste" : "nav-drawer"}
          tippProps={tp}
        />
        <div className="space-y-0.5 border-t border-white/10 p-3">
          <Link href="/" {...tp("Zur Website")} className="pr-link relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-white/70 transition-colors duration-150 hover:bg-white/[0.05] hover:text-white">
            <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" /> <span className="pr-label">Zur Website</span>
          </Link>
          <button type="button" onClick={abmelden} {...tp("Abmelden")} className="pr-link relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-white/70 transition-colors duration-150 hover:bg-white/[0.05] hover:text-white">
            <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" /> <span className="pr-label">Abmelden</span>
          </button>
          {desktop && (
            <button
              type="button"
              onClick={leisteUmschalten}
              aria-controls="portal-navigation"
              aria-expanded={!schmal}
              aria-keyshortcuts={KLAMMER}
              {...tp(`Seitenleiste ausklappen (Taste ${KLAMMER})`)}
              className="pr-link relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-white/70 transition-colors duration-150 hover:bg-white/[0.05] hover:text-white"
            >
              {schmal ? <PanelLeftOpen aria-hidden="true" className="h-4 w-4 shrink-0" /> : <PanelLeftClose aria-hidden="true" className="h-4 w-4 shrink-0" />}
              <span className="pr-label flex-1">{schmal ? "Seitenleiste ausklappen" : "Seitenleiste einklappen"}</span>
              <kbd aria-hidden="true" className="pr-nur-breit rounded-md bg-white/10 px-1.5 font-sans text-[12px] font-semibold text-white/70">{KLAMMER}</kbd>
            </button>
          )}
        </div>
      </>
    );
  };

  // Brotkrumen: Objekt-Ebenen mit gemerktem bzw. aktuellem Seitentitel; lange Pfade mit „…“
  const krumenAnzeige = krumen.map((k) => (k.objekt && objektTitel[k.href] ? { ...k, label: objektTitel[k.href] } : k));
  const krumenKurz =
    krumenAnzeige.length > 4
      ? [krumenAnzeige[0], { href: krumenAnzeige[krumenAnzeige.length - 3].href, label: "…", ausgelassen: krumenAnzeige.slice(1, -2).map((k) => k.label).join(" / ") }, ...krumenAnzeige.slice(-2)]
      : krumenAnzeige;
  const zurueck = krumenAnzeige.length > 2 ? krumenAnzeige[krumenAnzeige.length - 2] : null;

  return (
    <div className={cn("pr-wurzel min-h-dvh bg-sand-50", schmal && "pr-schmal")}>
      {/* Vorab-Zustand der Seitenleiste (vor dem ersten Bild, siehe portal-rahmen.css) */}
      <div hidden suppressHydrationWarning dangerouslySetInnerHTML={{ __html: vorabHtml(zuStandard) }} />
      <RevealObserver />
      <a href="#portal-inhalt" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-ink-900 focus:shadow-lg">
        Zum Inhalt springen
      </a>
      <SprungLinks />

      {/* Seitenleiste Desktop */}
      <aside id="portal-navigation" className="pr-leiste ov-noise fixed inset-y-0 left-0 z-30 hidden flex-col bg-navy-950 lg:flex">{leiste(true)}</aside>
      {tippElement}

      {/* Drawer mobil */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", offen ? "" : "pointer-events-none")} aria-hidden={!offen}>
        <div className={cn("absolute inset-0 bg-navy-950/60 backdrop-blur-sm transition-opacity duration-300", offen ? "opacity-100" : "opacity-0")} onClick={() => setOffen(false)} />
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Portal-Navigation"
          inert={!offen ? true : undefined}
          className={cn("ov-noise absolute inset-y-0 left-0 flex w-[86%] max-w-[320px] flex-col bg-navy-950 shadow-e5 transition-transform duration-300 ease-ov-out", offen ? "translate-x-0" : "-translate-x-full")}
        >
          <button type="button" onClick={() => setOffen(false)} className="absolute right-3 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label="Navigation schließen">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
          {leiste(false)}
        </div>
      </div>

      <div className="pr-haupt">
        {/* Kopfzeile – Unschärfe auf eigener Ebene, damit fixierte Kinder (Menü-Sheet) am Viewport hängen */}
        <header data-gescrollt={gescrollt ? "1" : undefined} className="pr-kopf sticky top-0 z-20 isolate border-b border-ink-200/70">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-white/85 backdrop-blur-xl backdrop-saturate-150" />
          <div className="flex h-16 items-center gap-3 px-4 md:px-8">
            <button type="button" onClick={() => setOffen(true)} className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 lg:hidden" aria-label="Navigation öffnen" aria-expanded={offen}>
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
            <Link href="/portal" className="h-7 shrink-0 lg:hidden" aria-label="Portal-Übersicht">
              <Logo unterzeile={false} />
            </Link>
            <nav aria-label="Brotkrumen" className="hidden min-w-0 flex-1 md:block">
              <ol className="flex min-w-0 items-center gap-1 text-[13.5px]">
                {krumenKurz.map((k, i) => (
                  <li key={`${k.href}-${i}`} className={cn("flex min-w-0 items-center gap-1", i === krumenKurz.length - 1 ? "shrink" : "shrink-[3]")}>
                    {i > 0 && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-300" />}
                    {i === krumenKurz.length - 1 ? (
                      <span aria-current="page" className="truncate px-1 font-semibold text-ink-900" title={k.label}>{k.label}</span>
                    ) : k.ausgelassen ? (
                      <Link href={k.href} className="rounded-md px-1.5 text-ink-500 hover:bg-ink-100 hover:text-ov-700" title={k.ausgelassen} aria-label={`Weitere Ebenen: ${k.ausgelassen}`}>…</Link>
                    ) : (
                      <Link href={k.href} className="truncate rounded-md px-1 text-ink-500 hover:text-ov-700" title={k.label}>{k.label}</Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="hidden sm:block">
                <OrgWechsler organisationen={nutzer.organisationen || []} aktiv={nutzer.organisation || null} kompakt />
              </div>
              <SuchKnopf />
              <KontextHilfe rollen={nutzer.rollen || []} />
              {nutzer.rollen?.includes("investor") && (
                <Link href="/portal/boerse" className="hidden h-10 items-center gap-2 rounded-full px-3 text-[13.5px] font-medium text-ink-600 hover:bg-ink-100 sm:flex">
                  <Search aria-hidden="true" className="h-4 w-4" /> Projekte finden
                </Link>
              )}
              <Link href="/portal/nachrichten" className="relative hidden h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 sm:flex" aria-label={ungelesen ? `Nachrichten, ${ungelesen} ungelesen` : "Nachrichten"}>
                <MessagesSquare aria-hidden="true" className="h-5 w-5" />
                {ungelesen > 0 && <span aria-hidden="true" className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-ov-600 ring-2 ring-white" />}
              </Link>
              <Glocke start={hinweise} />
              <div className="relative" ref={menueRef}>
                <button
                  type="button"
                  onClick={() => setMenue((m) => !m)}
                  aria-expanded={menue}
                  aria-haspopup="menu"
                  aria-label={`Benutzermenü${name ? ` – ${name}` : ""}`}
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-ink-100"
                >
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-[12.5px] font-bold", avatarKlasse(nutzer.komfort?.farbe))}>{initialen(nutzer)}</span>
                  <span className="hidden max-w-[160px] truncate text-[14px] font-semibold text-ink-800 sm:block">{name}</span>
                  <ChevronDown aria-hidden="true" className={cn("h-4 w-4 text-ink-500 transition-transform duration-200", menue && "rotate-180")} />
                </button>
                {menue && (
                  <>
                    <div aria-hidden="true" className="pr-schleier fixed inset-0 z-40 bg-navy-950/40 sm:hidden" onClick={() => setMenue(false)} />
                    <div role="menu" aria-label="Benutzermenü" className="pr-menue fixed inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-3xl bg-white p-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-e5 ring-1 ring-ink-200 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-12 sm:w-64 sm:rounded-2xl sm:p-1.5 sm:shadow-e4">
                      <div aria-hidden="true" className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-ink-200 sm:hidden" />
                      <div className="px-3 py-2.5">
                        <p className="truncate text-[15px] font-semibold text-ink-900 sm:text-[14px]">{name}</p>
                        <p className="truncate text-[13px] text-ink-500 sm:text-[12.5px]">{nutzer.email}</p>
                        <p className="mt-2 flex flex-wrap gap-1">
                          {(nutzer.rollen || []).map((r) => (
                            <span key={r} className="rounded-full bg-ink-100 px-2 py-0.5 text-[12px] font-semibold text-ink-600">{rolleLabel(r)}</span>
                          ))}
                        </p>
                      </div>
                      <div className="my-1 h-px bg-ink-100" />
                      {[
                        { href: "/portal/profil", icon: UserRound, text: "Profil & Passwort" },
                        { href: "/portal/sicherheit", icon: Fingerprint, text: "Sicherheit & Sitzungen" },
                        { href: "/", icon: Building2, text: "Zur Website" },
                      ].map((m) => (
                        <Link key={m.href} role="menuitem" href={m.href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-ink-700 hover:bg-ink-50 sm:gap-2.5 sm:py-2 sm:text-[14px]">
                          <m.icon aria-hidden="true" className="h-4 w-4 text-ink-500" /> {m.text}
                        </Link>
                      ))}
                      <button role="menuitem" type="button" onClick={abmelden} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] text-ink-700 hover:bg-ink-50 sm:gap-2.5 sm:py-2 sm:text-[14px]">
                        <LogOut aria-hidden="true" className="h-4 w-4 text-ink-500" /> Abmelden
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Mobil: Zurück-Zeile statt Brotkrumen */}
          {zurueck && (
            <div className="flex h-10 items-center gap-1.5 border-t border-ink-100 px-4 md:hidden">
              <Link href={zurueck.href} className="-ml-1.5 inline-flex min-h-[32px] min-w-0 shrink-0 items-center gap-0.5 rounded-full py-1 pl-1 pr-2 text-[13.5px] font-semibold text-ink-600 hover:bg-ink-100 hover:text-ov-700" style={{ maxWidth: "55%" }}>
                <ChevronLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="truncate">{zurueck.label}</span>
              </Link>
              <span aria-hidden="true" className="text-ink-300">/</span>
              <span aria-current="page" className="min-w-0 truncate text-[13.5px] text-ink-500">{krumenAnzeige[krumenAnzeige.length - 1].label}</span>
            </div>
          )}
        </header>

        <div id="portal-inhalt" tabIndex={-1} className="mx-auto w-full max-w-[1320px] px-4 py-6 outline-none md:px-8 md:py-10">
          <div ref={inhaltRef}>
            <TourHinweis nutzer={nutzer} />
            {children}
          </div>
        </div>
        {/* Platz für die mobile Bottom-Navigation */}
        <div aria-hidden="true" className="h-20 lg:hidden" />
      </div>
      <Bedienung nutzer={nutzer} ungelesen={ungelesen} />
    </div>
  );
}
