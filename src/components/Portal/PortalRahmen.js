"use client";

// Rahmen des Portals: Seitenleiste (Desktop) bzw. Drawer (mobil), Kopfzeile mit
// Brotkrumen, Benachrichtigungszentrale (Glocke) und Benutzer-Menü. Navigation je Rolle.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell, Building2, ChevronDown, ClipboardList, FileText, FolderKanban, Gauge, Handshake, Inbox, LandPlot, LayoutDashboard,
  ListTodo, LogOut, Mail, Menu, MessagesSquare, Search, ShieldCheck, TrendingUp, UserRound, Users, X, ExternalLink, Coins,
} from "lucide-react";
import { Gavel, SquareKanban } from "lucide-react"; // Deal-Room
import Glocke from "./Glocke";
import Bedienung from "./Bedienung/Bedienung";
import SuchKnopf from "./Bedienung/SuchKnopf";
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
import { BadgeCheck, ScanFace } from "lucide-react"; // KYC/KYB
import { HandHeart, Zap } from "lucide-react"; // Fachprüfung Kapitalseite
import { HardHat, Milestone } from "lucide-react"; // Projektentwicklung
import { Landmark, ReceiptText } from "lucide-react"; // ERPNext-Finanzen & Abrechnung
import { Banknote, Calculator } from "lucide-react"; // Finanzierung
import { BookOpen, CalendarDays, FileSignature, LifeBuoy, Timer } from "lucide-react"; // Signatur, Termine, Service & HR
import { Map as KartenIcon } from "lucide-react"; // Geodaten & Akquise-Engine (Alias: globales Map nicht überdecken)
import { FileSpreadsheet, PlugZap } from "lucide-react"; // Energiebeschaffung
import { ScrollText, Stamp } from "lucide-react"; // Grundbuch & Closing
import OrgWechsler from "./Sicherheit/OrgWechsler";
import TourHinweis from "./Bedienung/Onboarding/TourHinweis"; // Onboarding B1: Tour-Hinweise (abschaltbar)
import { avatarKlasse } from "@/lib/plattform/organisation";

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
        hat("kommune") && { href: "/portal/kommune", label: "Gemeinde", icon: Landmark }, // Onboarding B1: Rolle Kommune → Gemeinde-Sicht
        hat("flaeche", "landwirt", "investor", "gutachter") && { href: "/portal/entwicklung", label: hat("gutachter") ? "Aufträge & Projekte" : "Projektentwicklung", icon: HardHat }, // Projektentwicklung: „Wo steht mein Projekt?“, Co-Development, Gutachter
        hat("flaeche", "landwirt", "unternehmen", "anbieter") && { href: "/portal/abrechnungen", label: "Abrechnungen", icon: ReceiptText }, // ERPNext-Finanzen & Abrechnung
        hat("flaeche", "landwirt", "unternehmen") && { href: "/portal/grundbuch", label: "Grundbuch", icon: ScrollText }, // Grundbuch & Closing: Dienstbarkeit Eigentümer/Dachgeber
        hat("investor", "anbieter") && { href: "/portal/closing", label: "Deal-Abschluss", icon: Stamp }, // Grundbuch & Closing: Closing-Raum Käufer/Verkäufer
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
        { href: "/portal/admin/flaechen", label: "Flächen-Pipeline", icon: LandPlot },
        { href: "/portal/admin/projekte", label: "Projekt-Freigabe", icon: ShieldCheck },
        { href: "/portal/admin/interessen", label: "NDA & LOI", icon: Handshake },
        { href: "/portal/admin/dealroom", label: "Deal-Room", icon: Gavel }, // Deal-Room: Q&A-Moderation, Bieterverfahren
        { href: "/portal/admin/closing", label: "Deal-Abschluss", icon: Stamp }, // Grundbuch & Closing: Closing-Räume
        { href: "/portal/admin/grundbuch", label: "Grundbuch & Dienstbarkeiten", icon: ScrollText }, // Grundbuch & Closing
        { href: "/portal/admin/entwicklung", label: "Projektentwicklung", icon: Milestone }, // Projektentwicklung: Pipeline, Gantt, Risiken
        { href: "/portal/admin/anlagen", label: "Anlagen & Störungen", icon: TriangleAlert }, // Anlagen & Monitoring: Störungs-Leitstand
        { href: "/portal/admin/energie", label: "Energie-Handelsdesk", icon: PlugZap }, // Energiebeschaffung: Spot/Termin, Pool, Kunden, Ausschreibungen, Lieferanten
        { href: "/portal/admin/compliance", label: "Compliance (KYC)", icon: ScanFace }, // KYC/KYB: Warteschlange, Prüfung, Sanktionsabgleich
        { href: "/portal/admin/bonitaet", label: "Bonität", icon: Gauge }, // Dienste: Bonitätsauskünfte vor LOI
        { href: "/portal/admin/gesellschaften", label: "Gesellschaften & SPV", icon: Building2 }, // Dienste: SPV-Gründung, Organigramm, Fristen
        { href: "/portal/admin/deals", label: "Deals & Provisionen", icon: Coins },
        { href: "/portal/admin/finanzen", label: "Finanzen & Abrechnung", icon: Landmark }, // ERPNext-Finanzen & Abrechnung
        { href: "/portal/admin/finanzierung", label: "Finanzierung & Banken", icon: Banknote }, // Finanzierung: Bankfinanzierung Eigenbetrieb, Covenants
        { href: "/portal/admin/nutzer", label: "Nutzer & Protokoll", icon: Users },
        { href: "/portal/admin/postausgang", label: "E-Mail-Postausgang", icon: Mail },
        { href: "/portal/admin/kalender", label: "Kalender", icon: CalendarDays }, // Termine
        { href: "/portal/admin/support", label: "Support-Tickets", icon: LifeBuoy }, // Service
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
        { href: "/portal/admin/protokoll", label: "Revisionsprotokoll", icon: Link2 },
        { href: "/portal/admin/rechte", label: "Rechte", icon: KeyRound },
        { href: "/portal/admin/team", label: "Team & Zeiten", icon: Timer }, // HR
        { href: "/portal/admin/wissen", label: "Wissensdatenbank", icon: BookOpen }, // HR: intern
      ].filter((e) => darfLesen(nutzer, seitenBereich(e.href))),
    });
    // Onboarding B1: Einarbeitungsstand des Teams – nur Leitung
    if (unterrollen(nutzer).includes("leitung")) bereiche[bereiche.length - 1].eintraege.push({ href: "/portal/admin/einarbeitung", label: "Einarbeitung", icon: GraduationCap });
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
  entwicklung: "Projektentwicklung", steckbrief: "Steckbrief", // Projektentwicklung
  finanzierung: "Finanzierung", bank: "Finanzierungsanfragen", // Finanzierung
  energie: "Energie & Lastgang", beteiligung: "Genossenschaft & Gemeinschaft", bewertung: "Bewertung", // Fachprüfung Kapitalseite
  verifizierung: "Verifizierung", compliance: "Compliance", // KYC/KYB
  gesellschaften: "Gesellschaften", bonitaet: "Bonität", identitaet: "Online-Identifizierung", // Dienste
  signatur: "Unterschriften", termine: "Termine", support: "Support", kalender: "Kalender", team: "Team & Zeiten", wissen: "Wissensdatenbank", // Signatur, Termine, Service & HR
  karte: "Karte",
  hilfe: "Hilfe",
  willkommen: "Einstieg",
  kommune: "Gemeinde", einarbeitung: "Einarbeitung", // Onboarding B1
  crm: "CRM", akquise: "Akquise", automationen: "Automationen", vorlagen: "Vorlagen", berichte: "Berichte", protokoll: "Revisionsprotokoll", rechte: "Rechte", dubletten: "Dubletten", organisation: "Organisation", // Backoffice-Ausbau
  ausschreibungen: "Ausschreibungen", beschaffung: "Beschaffung", kunden: "Kunden", lieferanten: "Lieferanten", // Energiebeschaffung
};

function brotkrumen(pfad) {
  const teile = pfad.split("/").filter(Boolean);
  return teile.map((t, i) => ({ href: "/" + teile.slice(0, i + 1).join("/"), label: (t === "energie" && teile[i - 1] === "admin" ? "Energie-Handelsdesk" : LABELS[t]) || decodeURIComponent(t) })); // Energiebeschaffung: /portal/admin/energie
}

function aktiv(pfad, e) {
  return e.exakt ? pfad === e.href : pfad === e.href || pfad.startsWith(e.href + "/");
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

  const nav = (
    <nav aria-label="Portal" className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
      {bereiche.map((b) => (
        <div key={b.titel}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{b.titel}</p>
          <ul className="mt-2 space-y-0.5">
            {b.eintraege.map((e) => {
              const ist = aktiv(pfad, e);
              const Icon = e.icon;
              return (
                <li key={e.href}>
                  <Link
                    href={e.href}
                    aria-current={ist ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors",
                      ist ? "bg-white/[0.09] text-white" : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                    )}
                  >
                    <Icon aria-hidden="true" className={cn("h-[18px] w-[18px] shrink-0", ist ? "text-ov-300" : "text-white/45 group-hover:text-white/80")} />
                    <span className="min-w-0 flex-1 truncate">{e.label}</span>
                    {e.zaehler && zaehler[e.zaehler] > 0 && (
                      <span className={cn("ov-num rounded-full px-2 py-0.5 text-[11.5px] font-bold", e.zaehler === "aufgaben" ? "bg-sun-400 text-navy-950" : "bg-ov-500 text-white")}>
                        {zaehler[e.zaehler]}
                        <span className="sr-only">{e.zaehler === "aufgaben" ? " fällig" : " ungelesen"}</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const seitenleiste = (
    <>
      <div className="flex h-[72px] items-center px-6">
        <Link href="/portal" className="h-7 lg:h-9" aria-label="Portal-Übersicht">
          <Logo tone="dark" unterzeile={false} />
        </Link>
      </div>
      {demo && (
        <p className="mx-6 rounded-xl bg-sun-400/15 px-3 py-2 text-[12px] leading-snug text-sun-300 ring-1 ring-inset ring-sun-400/30">
          Demo-Modus: Alle Daten sind fiktiv.
        </p>
      )}
      {/* Organisationswechsel mobil (im Kopf ab sm) – Login, Sicherheit & Teams */}
      <div className="px-6 pt-4 sm:hidden">
        <OrgWechsler organisationen={nutzer.organisationen || []} aktiv={nutzer.organisation || null} />
      </div>
      {nav}
      <div className="border-t border-white/10 p-3">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-white/60 hover:bg-white/[0.05] hover:text-white">
          <ExternalLink aria-hidden="true" className="h-4 w-4" /> Zur Website
        </Link>
        <button type="button" onClick={abmelden} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-white/60 hover:bg-white/[0.05] hover:text-white">
          <LogOut aria-hidden="true" className="h-4 w-4" /> Abmelden
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-sand-50">
      <a href="#portal-inhalt" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-ink-900 focus:shadow-lg">
        Zum Inhalt springen
      </a>
      <SprungLinks />

      {/* Seitenleiste Desktop */}
      <aside id="portal-navigation" className="ov-noise fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col bg-navy-950 lg:flex">{seitenleiste}</aside>

      {/* Drawer mobil */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", offen ? "" : "pointer-events-none")} aria-hidden={!offen}>
        <div className={cn("absolute inset-0 bg-navy-950/60 backdrop-blur-sm transition-opacity", offen ? "opacity-100" : "opacity-0")} onClick={() => setOffen(false)} />
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Portal-Navigation"
          inert={!offen ? true : undefined}
          className={cn("ov-noise absolute inset-y-0 left-0 flex w-[86%] max-w-[320px] flex-col bg-navy-950 shadow-2xl transition-transform duration-300", offen ? "translate-x-0" : "-translate-x-full")}
        >
          <button type="button" onClick={() => setOffen(false)} className="absolute right-3 top-4 flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label="Navigation schließen">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
          {seitenleiste}
        </div>
      </div>

      <div className="lg:pl-[272px]">
        {/* Kopfzeile */}
        <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 md:px-8">
            <button type="button" onClick={() => setOffen(true)} className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 lg:hidden" aria-label="Navigation öffnen" aria-expanded={offen}>
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
            <Link href="/portal" className="h-7 shrink-0 lg:hidden" aria-label="Portal-Übersicht">
              <Logo unterzeile={false} />
            </Link>
            <nav aria-label="Brotkrumen" className="hidden min-w-0 flex-1 md:block">
              <ol className="flex min-w-0 items-center gap-1.5 text-[13.5px]">
                {krumen.map((k, i) => (
                  <li key={k.href} className="flex min-w-0 items-center gap-1.5">
                    {i > 0 && <span aria-hidden="true" className="text-ink-300">/</span>}
                    {i === krumen.length - 1 ? (
                      <span aria-current="page" className="truncate font-semibold text-ink-900">{k.label}</span>
                    ) : (
                      <Link href={k.href} className="truncate text-ink-500 hover:text-ov-700">{k.label}</Link>
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
              {nutzer.rollen?.includes("investor") && (
                <Link href="/portal/boerse" className="hidden h-10 items-center gap-2 rounded-full px-3 text-[13.5px] font-medium text-ink-600 hover:bg-ink-100 sm:flex">
                  <Search aria-hidden="true" className="h-4 w-4" /> Projekte finden
                </Link>
              )}
              <Link href="/portal/nachrichten" className="relative hidden h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 sm:flex" aria-label={ungelesen ? `Nachrichten, ${ungelesen} ungelesen` : "Nachrichten"}>
                <MessagesSquare aria-hidden="true" className="h-5 w-5" />
                {ungelesen > 0 && <span aria-hidden="true" className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-ov-500 ring-2 ring-white" />}
              </Link>
              <Glocke start={hinweise} />
              <div className="relative" ref={menueRef}>
                <button
                  type="button"
                  onClick={() => setMenue((m) => !m)}
                  aria-expanded={menue}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-ink-100"
                >
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-[12.5px] font-bold", avatarKlasse(nutzer.komfort?.farbe))}>{initialen(nutzer)}</span>
                  <span className="hidden max-w-[160px] truncate text-[14px] font-semibold text-ink-800 sm:block">{name}</span>
                  <ChevronDown aria-hidden="true" className="h-4 w-4 text-ink-500" />
                </button>
                {menue && (
                  <div role="menu" className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_20px_50px_-20px_rgba(3,18,43,0.45)] ring-1 ring-ink-200">
                    <div className="px-3 py-2.5">
                      <p className="truncate text-[14px] font-semibold text-ink-900">{name}</p>
                      <p className="truncate text-[12.5px] text-ink-500">{nutzer.email}</p>
                      <p className="mt-2 flex flex-wrap gap-1">
                        {(nutzer.rollen || []).map((r) => (
                          <span key={r} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">{rolleLabel(r)}</span>
                        ))}
                      </p>
                    </div>
                    <div className="my-1 h-px bg-ink-100" />
                    <Link role="menuitem" href="/portal/profil" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] text-ink-700 hover:bg-ink-50">
                      <UserRound aria-hidden="true" className="h-4 w-4" /> Profil & Passwort
                    </Link>
                    <Link role="menuitem" href="/portal/sicherheit" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] text-ink-700 hover:bg-ink-50">
                      <Fingerprint aria-hidden="true" className="h-4 w-4" /> Sicherheit & Sitzungen
                    </Link>
                    <Link role="menuitem" href="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] text-ink-700 hover:bg-ink-50">
                      <Building2 aria-hidden="true" className="h-4 w-4" /> Zur Website
                    </Link>
                    <button role="menuitem" type="button" onClick={abmelden} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] text-ink-700 hover:bg-ink-50">
                      <LogOut aria-hidden="true" className="h-4 w-4" /> Abmelden
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div id="portal-inhalt" tabIndex={-1} className="mx-auto w-full max-w-[1320px] px-4 py-6 outline-none md:px-8 md:py-10">
          <TourHinweis nutzer={nutzer} />
          {children}
        </div>
        {/* Platz für die mobile Bottom-Navigation */}
        <div aria-hidden="true" className="h-20 lg:hidden" />
      </div>
      <Bedienung nutzer={nutzer} ungelesen={ungelesen} />
    </div>
  );
}
