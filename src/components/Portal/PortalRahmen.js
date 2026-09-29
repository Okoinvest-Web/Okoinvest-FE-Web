"use client";

// Rahmen des Portals: Seitenleiste (Desktop) bzw. Drawer (mobil), Kopfzeile mit
// Brotkrumen, Nachrichten-Hinweis und Benutzer-Menü. Navigation je Rolle.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell, Building2, ChevronDown, ClipboardList, FileText, FolderKanban, Gauge, Handshake, Inbox, LandPlot, LayoutDashboard,
  LogOut, Menu, MessagesSquare, Search, ShieldCheck, TrendingUp, UserRound, Users, X, ExternalLink, Coins,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import { cn } from "@/components/ui/cn";
import useFokusFalle from "@/components/ui/useFokusFalle";
import { rolleLabel } from "@/lib/plattform/konstanten";
import { initialen } from "@/lib/plattform/format";

function navigation(rollen) {
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
        { href: "/portal/nachrichten", label: "Nachrichten", icon: MessagesSquare, zaehler: true },
        { href: "/portal/dokumente", label: "Dokumente", icon: FileText },
        { href: "/portal/profil", label: hat("investor") ? "Profil & Suchprofil" : "Profil", icon: UserRound },
      ].filter(Boolean),
    },
  ];
  if (admin) {
    bereiche.push({
      titel: "Backoffice",
      eintraege: [
        { href: "/portal/admin", label: "Cockpit", icon: Gauge, exakt: true },
        { href: "/portal/admin/vorgaenge", label: "Vorgänge", icon: ClipboardList },
        { href: "/portal/admin/flaechen", label: "Flächen-Pipeline", icon: LandPlot },
        { href: "/portal/admin/projekte", label: "Projekt-Freigabe", icon: ShieldCheck },
        { href: "/portal/admin/interessen", label: "NDA & LOI", icon: Handshake },
        { href: "/portal/admin/deals", label: "Deals & Provisionen", icon: Coins },
        { href: "/portal/admin/nutzer", label: "Nutzer & Protokoll", icon: Users },
      ],
    });
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
};

function brotkrumen(pfad) {
  const teile = pfad.split("/").filter(Boolean);
  return teile.map((t, i) => ({ href: "/" + teile.slice(0, i + 1).join("/"), label: LABELS[t] || decodeURIComponent(t) }));
}

function aktiv(pfad, e) {
  return e.exakt ? pfad === e.href : pfad === e.href || pfad.startsWith(e.href + "/");
}

export default function PortalRahmen({ nutzer, ungelesen = 0, demo = false, children }) {
  const pfad = usePathname() || "/portal";
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [menue, setMenue] = useState(false);
  const drawerRef = useRef(null);
  const menueRef = useRef(null);
  const bereiche = navigation(nutzer.rollen || []);

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
                    {e.zaehler && ungelesen > 0 && (
                      <span className="ov-num rounded-full bg-ov-500 px-2 py-0.5 text-[11.5px] font-bold text-white">
                        {ungelesen}
                        <span className="sr-only"> ungelesen</span>
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

      {/* Seitenleiste Desktop */}
      <aside className="ov-noise fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col bg-navy-950 lg:flex">{seitenleiste}</aside>

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
              {nutzer.rollen?.includes("investor") && (
                <Link href="/portal/boerse" className="hidden h-10 items-center gap-2 rounded-full px-3 text-[13.5px] font-medium text-ink-600 hover:bg-ink-100 sm:flex">
                  <Search aria-hidden="true" className="h-4 w-4" /> Projekte finden
                </Link>
              )}
              <Link href="/portal/nachrichten" className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100" aria-label={ungelesen ? `Nachrichten, ${ungelesen} ungelesen` : "Nachrichten"}>
                <Bell aria-hidden="true" className="h-5 w-5" />
                {ungelesen > 0 && <span aria-hidden="true" className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-ov-500 ring-2 ring-white" />}
              </Link>
              <div className="relative" ref={menueRef}>
                <button
                  type="button"
                  onClick={() => setMenue((m) => !m)}
                  aria-expanded={menue}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-ink-100"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-700 text-[12.5px] font-bold text-white">{initialen(nutzer)}</span>
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
          {children}
        </div>
      </div>
    </div>
  );
}
