"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/Land/Link";
import Logo from "@/components/ui/Logo";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, Phone, X, Mail, Sparkles, UserRound } from "lucide-react";

import { KONTAKT, navigationFuer } from "@/data/navigation";
import { iconFor } from "@/components/ui/icons";
import LiveTicker, { LiveDot } from "@/components/ui/LiveTicker";
import useEnergyLive, { fmtCt } from "@/components/ui/useEnergyLive";
import useFokusFalle from "@/components/ui/useFokusFalle";
import Sprachwahl from "@/components/Sprache/Sprachwahl";
import { useSprache, useTexte } from "@/components/Sprache/SpracheKontext";
import Laenderwahl from "@/components/Land/Laenderwahl";
import { landAusPfad, schreibweiseFuer } from "@/lib/land";
import { useSeitenLand } from "@/components/Land/LandKontext";

// Texte der Kopfleiste (Sprachmodell, src/lib/sprache/woerterbuch.js); Menüeinträge: navigationFuer()
const TEXTE = {
  de: {
    gruppe: "Teil der ÖKOVOLT Gruppe · DE · AT · CH",
    portal: "Portal",
    login: "Login",
    zumPortal: "Zum Portal",
    loginPortal: "Login zum Portal",
    startseite: "ÖkoInvest – zur Startseite",
    hauptnavigation: "Hauptnavigation",
    flaechePruefen: "Fläche prüfen",
    menueOeffnen: "Menü öffnen",
    menue: "Menü",
    menueSchliessen: "Menü schließen",
    startseiteKurz: "Startseite",
    landMenue: "Land wählen (Menü)",
    spracheMenue: "Sprache (Menü)",
    jetzt: "ct/kWh jetzt",
    standardFeature: {
      title: "Fläche in 3 Minuten prüfen",
      text: "Lage, Größe, Netz – und Sie erhalten sofort eine Ersteinschätzung mit Pachtspanne.",
      href: "/flaechencheck",
      cta: "Flächencheck starten",
    },
  },
  en: {
    gruppe: "Part of the ÖKOVOLT Group · DE · AT · CH",
    zumPortal: "To the portal",
    loginPortal: "Log in to the portal",
    startseite: "ÖkoInvest – to the home page",
    hauptnavigation: "Main navigation",
    flaechePruefen: "Check your land",
    menueOeffnen: "Open menu",
    menue: "Menu",
    menueSchliessen: "Close menu",
    startseiteKurz: "Home",
    landMenue: "Choose country (menu)",
    spracheMenue: "Language (menu)",
    jetzt: "ct/kWh now",
    standardFeature: {
      title: "Check your land in 3 minutes",
      text: "Location, size, grid – you get an initial assessment with a lease range straight away.",
      cta: "Start land check",
    },
  },
};

/**
 * Seitenkopf 2026
 *
 *  - Schmale Live-Leiste (Börsenstrompreis, Erneuerbare) – klappt beim Scrollen weg
 *  - Mega-Menü: Icons, Kurzbeschreibungen, hervorgehobene Aktion je Bereich
 *  - Öffnet per Hover mit kurzer Absichtsverzögerung, per Klick und per Tastatur;
 *    Escape schließt und gibt den Fokus an den Auslöser zurück
 *  - Mobil: Vollbild-Menü mit Akkordeons und fester Aktionsleiste
 */
/** Angemeldet? Einmal je Seitenaufruf abfragen – steuert „Login“ vs. „Portal“. */
function useAngemeldet(pfad) {
  const [angemeldet, setAngemeldet] = useState(false);
  useEffect(() => {
    let aktiv = true;
    fetch("/api/auth/ich", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => aktiv && setAngemeldet(Boolean(d?.nutzer)))
      .catch(() => {});
    return () => {
      aktiv = false;
    };
  }, [pfad]);
  return angemeldet;
}

export default function Navbar() {
  // Ländermodell: aktive Einträge über den Pfad ohne Länderpräfix; Links bleiben über die
  // Link-Komponente im Land der Seite (src/components/Land/Link.js)
  const pfad = landAusPfad(usePathname() || "/").schluessel;
  const angemeldet = useAngemeldet(pfad);
  const t = useTexte(TEXTE);
  const sprache = useSprache();
  const seitenLand = useSeitenLand();
  const NAVIGATION = schreibweiseFuer(navigationFuer(sprache), seitenLand); // Schweiz: ohne „ß“
  const konto = angemeldet ? { href: "/portal", label: t.portal } : { href: "/login", label: t.login };
  const [offen, setOffen] = useState(null); // Titel des offenen Mega-Menüs
  const [mobil, setMobil] = useState(false);
  const [mobilGruppe, setMobilGruppe] = useState(null);
  const [gescrollt, setGescrollt] = useState(false);
  const schliessTimer = useRef(null);
  const oeffnenTimer = useRef(null);
  const ausloeser = useRef({});
  const menueKnopf = useRef(null);
  const megaPanel = useRef(null);
  const perTastatur = useRef(false); // Mega-Menü per Enter/Leertaste geöffnet → Fokus ins Panel

  useEffect(() => {
    let raf = 0;
    const pruefen = () => {
      raf = 0;
      const y = window.scrollY;
      // Collapse only after 80px, expand again only near the very top.
      // The gap (80 → 4) is larger than the ~56px the header shrinks,
      // so the layout jump can no longer flip the state back.
      setGescrollt((alt) => (alt ? y > 4 : y > 80));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pruefen);
    };
    pruefen();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Routenwechsel schließt alles
  useEffect(() => {
    setOffen(null);
    setMobil(false);
    setMobilGruppe(null);
  }, [pfad]);

  useEffect(() => {
    document.body.classList.toggle("ov-menu-offen", mobil);
    return () => document.body.classList.remove("ov-menu-offen");
  }, [mobil]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (offen) {
        ausloeser.current[offen]?.focus();
        setOffen(null);
      }
      if (mobil) setMobil(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [offen, mobil]);

  // Per Tastatur geöffnet: Fokus auf den ersten Link im Panel
  useEffect(() => {
    if (!offen || !perTastatur.current) return undefined;
    perTastatur.current = false;
    const raf = requestAnimationFrame(() => megaPanel.current?.querySelector("a[href]")?.focus());
    return () => cancelAnimationFrame(raf);
  }, [offen]);

  // Mega-Menü schließen, sobald der Fokus den Kopfbereich verlässt
  const fokusRaus = useCallback((e) => {
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOffen(null);
  }, []);

  const hoverRein = useCallback((titel) => {
    clearTimeout(schliessTimer.current);
    clearTimeout(oeffnenTimer.current);
    oeffnenTimer.current = setTimeout(() => setOffen(titel), 90);
  }, []);

  const hoverRaus = useCallback(() => {
    clearTimeout(oeffnenTimer.current);
    schliessTimer.current = setTimeout(() => setOffen(null), 180);
  }, []);

  const aktivBereich = (item) =>
    item.groups?.some((g) => g.items.some((s) => pfad === s.href || pfad.startsWith(s.href + "/")));

  // Zuletzt geöffnetes Menü bleibt beim Schließen stehen, damit das Panel sichtbar ausblendet
  const [zuletzt, setZuletzt] = useState(null);
  useEffect(() => {
    if (offen) setZuletzt(offen);
  }, [offen]);
  const offenesItem = NAVIGATION.find((n) => n.title === (offen || zuletzt));

  return (
    // Scroll-Zustand ohne Layout-Sprung (CLS): Der Kopf behält seine Höhe im Fluss.
    // Beim Scrollen gleitet er per transform nach oben – Live-Leiste und 16 px der
    // Hauptleiste verschwinden über den Rand, sichtbar bleiben 68 px. Der Kopf selbst
    // lässt Klicks durch (pointer-events-none), nur seine sichtbaren Teile nehmen sie an.
    <header className="pointer-events-none sticky top-0 z-[100] w-full">
      <div
        className={`pointer-events-auto transition-transform duration-500 ease-ov-out ${
          gescrollt ? "-translate-y-4 md:-translate-y-14" : "translate-y-0"
        }`}
      >
      {/* ---------- Live-Leiste ---------- */}
      <div
        // Tastaturfokus in der ausgeblendeten Leiste holt den Kopf zurück
        onFocusCapture={() => setGescrollt(false)}
        className={`hidden bg-navy-950 transition-opacity duration-500 md:block ${gescrollt ? "opacity-0" : "opacity-100"}`}
      >
        <div className="ov-container flex h-10 items-center justify-between gap-6">
          <LiveTicker />
          <div className="flex shrink-0 items-center gap-5 text-[12.5px] text-white/70">
            <span className="hidden text-white/60 lg:inline">{t.gruppe}</span>
            {KONTAKT.email && (
              <a href={`mailto:${KONTAKT.email}`} className="hidden items-center gap-1.5 transition-colors hover:text-white lg:flex">
                <Mail aria-hidden="true" className="h-3.5 w-3.5" />
                {KONTAKT.email}
              </a>
            )}
            {KONTAKT.telefon && (
              <a href={KONTAKT.telefonHref} className="flex items-center gap-1.5 font-medium text-white transition-colors hover:text-ov-300">
                <Phone aria-hidden="true" className="h-3.5 w-3.5" />
                {KONTAKT.telefon}
              </a>
            )}
            <Laenderwahl variante="dunkel" kompakt />
            <Sprachwahl variante="dunkel" kompakt />
            <Link href={konto.href} className="flex items-center gap-1.5 font-medium text-white transition-colors hover:text-ov-300">
              <UserRound aria-hidden="true" className="h-3.5 w-3.5" />
              {konto.label}
            </Link>
          </div>
        </div>
      </div>

      {/* ---------- Hauptleiste ---------- */}
      <div className="relative" onMouseLeave={hoverRaus} onBlur={fokusRaus}>
        {/* Hintergrund in Ebenen: Glas (immer), deckendes Weiß und Schatten werden nur per opacity überblendet */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-white/90 backdrop-blur-xl backdrop-saturate-150" />
        <div
          aria-hidden="true"
          className={`absolute inset-0 -z-10 bg-white transition-opacity duration-500 ease-ov-out ${gescrollt || offen ? "opacity-0" : "opacity-100"}`}
        />
        <div
          aria-hidden="true"
          className={`absolute inset-0 -z-10 shadow-e2 transition-opacity duration-500 ease-ov-out ${gescrollt || offen ? "opacity-100" : "opacity-0"}`}
        />
        <div className={`ov-container flex h-[84px] items-center justify-between gap-6 transition-transform duration-500 ease-ov-out ${gescrollt ? "translate-y-2" : "translate-y-0"}`}>
          <Link href="/" aria-label={t.startseite} className="relative shrink-0">
            <div className={`relative h-[46px] origin-left transition-transform duration-500 ${gescrollt ? "scale-[0.86]" : ""}`}>
              <Logo sprache={sprache} />
            </div>
          </Link>

          <nav aria-label={t.hauptnavigation} className="hidden xl:block">
            <ul className="flex items-center gap-0.5">
              {NAVIGATION.map((item) => {
                const istOffen = offen === item.title;
                const aktiv = aktivBereich(item);
                return (
                  <li key={item.title} onMouseEnter={() => hoverRein(item.title)}>
                    <button
                      ref={(el) => (ausloeser.current[item.title] = el)}
                      type="button"
                      aria-expanded={istOffen}
                      aria-controls="ov-mega"
                      onClick={(e) => {
                        // detail === 0: Auslösung per Tastatur (Enter/Leertaste)
                        perTastatur.current = !istOffen && e.detail === 0;
                        setOffen(istOffen ? null : item.title);
                      }}
                      className={`relative flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-[14.5px] font-medium transition-colors ${
                        istOffen ? "bg-ink-100 text-ink-900" : aktiv ? "text-ov-700" : "text-ink-700 hover:text-ink-900"
                      }`}
                    >
                      {item.title}
                      <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform duration-300 ${istOffen ? "rotate-180" : ""}`} />
                      {aktiv && !istOffen && <span aria-hidden="true" className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-ov-500" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={konto.href}
              aria-label={angemeldet ? t.zumPortal : t.loginPortal}
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink-700 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50 hover:text-ov-700 md:hidden"
            >
              <UserRound aria-hidden="true" className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/flaechencheck"
              className="group hidden h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-ov-600 pl-5 pr-4 text-[14.5px] font-semibold text-white shadow-gruen transition-colors hover:bg-ov-700 sm:flex"
            >
              {t.flaechePruefen}
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 ease-ov-out group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" />
            </Link>
            <button
              ref={menueKnopf}
              type="button"
              onClick={() => setMobil(true)}
              aria-label={t.menueOeffnen}
              aria-expanded={mobil}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-900 text-white transition-colors hover:bg-ink-800 xl:hidden"
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ---------- Mega-Menü ---------- */}
        <div
          id="ov-mega"
          ref={megaPanel}
          inert={!offen}
          onMouseEnter={() => clearTimeout(schliessTimer.current)}
          className={`absolute inset-x-0 top-full hidden xl:block ${offen ? "pointer-events-auto" : "pointer-events-none"}`}
        >
          <div
            className={`ov-container origin-top transition-[opacity,transform] ${
              offen ? "translate-y-0 scale-100 opacity-100 duration-300 ease-ov-out" : "-translate-y-2 scale-[0.985] opacity-0 duration-200 ease-ov-in"
            }`}
          >
            {offenesItem && <MegaPanel key={offenesItem.title} item={offenesItem} pfad={pfad} standard={t.standardFeature} jetzt={t.jetzt} onNavigate={() => setOffen(null)} />}
          </div>
        </div>
      </div>
      </div>

      {/* Abdunkelung hinter dem Mega-Menü */}
      <div
        aria-hidden="true"
        onClick={() => setOffen(null)}
        className={`fixed inset-0 top-0 -z-20 hidden bg-navy-950/20 backdrop-blur-[2px] transition-opacity duration-300 xl:block ${
          offen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <MobileMenu
        offen={mobil}
        schliessen={() => setMobil(false)}
        gruppe={mobilGruppe}
        setGruppe={setMobilGruppe}
        pfad={pfad}
        rueckgabeRef={menueKnopf}
        konto={konto}
        navigation={NAVIGATION}
        t={t}
      />
    </header>
  );
}

function MegaPanel({ item, pfad, standard, jetzt, onNavigate }) {
  const vieleGruppen = item.groups.length > 1;
  let lfd = 0; // laufende Nummer über alle Gruppen – für den gestaffelten Einstieg
  return (
    <div className="mt-2 overflow-hidden rounded-3xl bg-white shadow-e5 ring-1 ring-ink-200/70">
      <div className="grid grid-cols-[260px_1fr_300px]">
        <div className="relative overflow-hidden border-r border-ink-100 bg-sand-50 p-8">
          <div aria-hidden="true" className="ov-grid-bg-light absolute inset-0 opacity-60" />
          <p className="ov-ein relative text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">{item.title}</p>
          <p className="ov-ein relative mt-3 font-display text-[21px] font-bold leading-snug tracking-tight text-ink-900" style={{ "--ov-delay": "40ms" }}>{item.intro}</p>
        </div>

        <div className={`grid gap-x-4 gap-y-6 p-6 ${vieleGruppen ? "grid-cols-2" : "grid-cols-2"}`}>
          {item.groups.map((g) => (
            <div key={g.label} className={vieleGruppen ? "" : "col-span-2"}>
              {vieleGruppen && <p className="mb-2 px-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">{g.label}</p>}
              <ul className={vieleGruppen ? "space-y-0.5" : "grid grid-cols-2 gap-0.5"}>
                {g.items.map((s) => {
                  const Icon = iconFor(s.icon);
                  const aktiv = pfad === s.href;
                  const nr = lfd++;
                  return (
                    <li key={s.href + s.name} className="ov-ein" style={{ "--ov-delay": `${60 + Math.min(nr, 10) * 28}ms` }}>
                      <Link
                        href={s.href}
                        onClick={onNavigate}
                        aria-current={aktiv ? "page" : undefined}
                        className={`group flex items-start gap-3.5 rounded-2xl p-3 transition-colors ${aktiv ? "bg-ov-50" : "hover:bg-ink-50"}`}
                      >
                        <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-[background-color,color,transform] duration-300 group-hover:scale-105 ${aktiv ? "bg-ov-500 text-white" : "bg-ov-50 text-ov-600 group-hover:bg-ov-500 group-hover:text-white"}`}>
                          <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                        </span>
                        <span>
                          <span className="block text-[14.5px] font-semibold text-ink-900">{s.name}</span>
                          <span className={`mt-0.5 block text-[13px] leading-snug ${aktiv ? "text-ink-600" : "text-ink-500"}`}>{s.text}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="ov-ein p-4" style={{ "--ov-delay": "140ms" }}>
          <FeatureKachel feature={item.feature || standard} jetzt={jetzt} onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}

function FeatureKachel({ feature, jetzt, onNavigate }) {
  return (
    <Link
      href={feature.href}
      onClick={onNavigate}
      className="ov-noise group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-navy-950 p-6 text-white"
    >
      <div aria-hidden="true" className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ov-500/40 blur-3xl transition-transform duration-700 group-hover:scale-125" />
      <div className="relative">
        {feature.live ? <LivePreis jetzt={jetzt} /> : <Sparkles aria-hidden="true" className="h-6 w-6 text-ov-300" />}
        <p className="mt-4 font-display text-[19px] font-bold leading-snug">{feature.title}</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/65">{feature.text}</p>
      </div>
      <span className="relative mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-ov-300">
        {feature.cta}
        <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function LivePreis({ jetzt }) {
  const d = useEnergyLive();
  const sprache = useSprache();
  const p = d?.preis?.aktuell;
  return (
    <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-300">
      <LiveDot />
      {p ? <span className="ov-num normal-case tracking-normal text-white">{fmtCt(p.eurMwh, 1, sprache)} {jetzt}</span> : "Live"}
    </div>
  );
}

function MobileMenu({ offen, schliessen, gruppe, setGruppe, pfad, rueckgabeRef, konto, navigation: NAVIGATION, t }) {
  const sprache = useSprache();
  const dialog = useRef(null);
  const schliessKnopf = useRef(null);
  useFokusFalle(offen, dialog, { beiEscape: schliessen, startRef: schliessKnopf, rueckgabeRef });

  return (
    <div
      ref={dialog}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t.menue}
      className={`pointer-events-auto fixed inset-0 z-[120] flex flex-col bg-white transition-[opacity,transform,visibility] xl:hidden ${
        offen
          ? "visible translate-y-0 opacity-100 duration-[420ms] ease-ov-out"
          : "invisible translate-y-6 opacity-0 duration-200 ease-ov-in"
      }`}
    >
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-ink-100 px-5">
        <Link href="/" onClick={schliessen} className="relative h-[40px]" aria-label={t.startseiteKurz}>
          <Logo sprache={sprache} />
        </Link>
        <button ref={schliessKnopf} type="button" onClick={schliessen} aria-label={t.menueSchliessen} className="ov-press group flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-900 transition-colors hover:bg-ink-200">
          <X aria-hidden="true" className={`h-5 w-5 transition-transform duration-500 ease-ov-out ${offen ? "rotate-0" : "-rotate-90"}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-3">
        <div className="mb-3 rounded-2xl bg-navy-950 px-4 py-3">
          <LiveTicker />
        </div>
        <div className="mb-2 flex flex-wrap items-center justify-end gap-3">
          <Laenderwahl label={t.landMenue} />
          <Sprachwahl label={t.spracheMenue} />
        </div>
        <ul>
          {NAVIGATION.map((item, i) => {
            const auf = gruppe === item.title;
            return (
              <li key={item.title} className={`border-b border-ink-100 ${offen ? "ov-ein" : ""}`} style={{ "--ov-delay": `${80 + i * 45}ms` }}>
                <button
                  type="button"
                  onClick={() => setGruppe(auf ? null : item.title)}
                  aria-expanded={auf}
                  className="flex w-full items-center justify-between py-4 text-left font-display text-[19px] font-bold text-ink-900"
                >
                  {item.title}
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-[background-color,color,transform] duration-300 ease-ov-out ${auf ? "rotate-180 bg-ov-500 text-white" : "bg-ink-100 text-ink-600"}`}>
                    <ChevronDown aria-hidden="true" className="h-4 w-4" />
                  </span>
                </button>
                <div className={auf ? "block" : "hidden"}>
                  <div>
                    <ul className="grid gap-1 pb-4 sm:grid-cols-2">
                      {item.groups.flatMap((g) => g.items).map((s, j) => {
                        const Icon = iconFor(s.icon);
                        return (
                          <li key={s.href + s.name} className="ov-ein" style={{ "--ov-delay": `${Math.min(j, 10) * 30}ms` }}>
                            <Link
                              href={s.href}
                              onClick={schliessen}
                              tabIndex={auf ? 0 : -1}
                              className={`flex items-center gap-3 rounded-xl p-2.5 ${pfad === s.href ? "bg-ov-50" : "active:bg-ink-50"}`}
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600">
                                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                              </span>
                              <span>
                                <span className="block text-[15px] font-semibold text-ink-900">{s.name}</span>
                                <span className={`block text-[12.5px] ${pfad === s.href ? "text-ink-600" : "text-ink-500"}`}>{s.text}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={`grid shrink-0 grid-cols-2 gap-2 border-t border-ink-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${offen ? "ov-ein" : ""}`} style={{ "--ov-delay": "260ms" }}>
        <Link href={konto.href} onClick={schliessen} className="flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200">
          <UserRound aria-hidden="true" className="h-4 w-4" />
          {konto.label}
        </Link>
        <Link href="/flaechencheck" onClick={schliessen} className="ov-press flex h-12 items-center justify-center gap-2 rounded-full bg-ov-600 text-[15px] font-semibold text-white shadow-gruen">
          {t.flaechePruefen}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
