// src/app/design/page.js
//
// Lebender Styleguide des Design-Systems 2.0 (Regelwerk: docs/DESIGN.md).
// Nicht indexiert, nicht in der Sitemap. Zeigt alle Tokens und Bausteine
// mit echten Komponenten – was hier gut aussieht, sieht überall gut aus.

import { ArrowRight, Download, FolderKanban, Gauge, Inbox, LandPlot, Leaf, Sun, TrendingUp, Zap } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import KpiKachel from "@/components/ui/KpiKachel";
import Sparkline from "@/components/ui/Sparkline";
import FortschrittsRing from "@/components/ui/FortschrittsRing";
import Skeleton, { SkeletonKarte, SkeletonTabelle, SkeletonText } from "@/components/ui/Skeleton";
import Stagger from "@/components/ui/Stagger";
import Reveal from "@/components/ui/Reveal";
import ErfolgsHaken from "@/components/ui/ErfolgsHaken";
import IllustrationRahmen from "@/components/ui/IllustrationRahmen";
import { ILLU, iso, punkte, quader } from "@/components/ui/illustration";
import { DIVERGIEREND, ENERGIE, KATEGORIE_DUNKEL, KATEGORIE_HELL, SEQUENZ_GRUEN, SEQUENZ_NAVY } from "@/components/ui/datenfarben";
import { Hinweis, Karte, Kennzahl, Leer, PfeilLink, Tabelle, zelle } from "@/components/Portal/ui";
import { AnsichtDemo, FeedbackDemo, OverlayDemo, RueckfrageDemo, TabsDemo } from "./Demos";

export const metadata = {
  title: "Design-System 2.0 | ÖkoInvest",
  description: "Interner Styleguide: Tokens, Typografie, Motion und Bausteine des ÖkoInvest-Design-Systems.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const SKALEN = [
  { name: "ov", stufen: { 50: "#f4f9ee", 100: "#e6f1d8", 200: "#cde3b1", 300: "#aed083", 400: "#8cba58", 500: "#669933", 600: "#558227", 700: "#436621", 800: "#37521e", 900: "#2f461c" } },
  { name: "navy", stufen: { 50: "#eef4fb", 100: "#d9e6f5", 200: "#b2cbe9", 300: "#7fa7d6", 400: "#4a7cbd", 500: "#1f5aa1", 600: "#0b4488", 700: "#003473", 800: "#03285a", 900: "#041d42", 950: "#03122b" } },
  { name: "ink", stufen: { 50: "#f7f8fa", 100: "#eef0f4", 200: "#dfe3ea", 300: "#c4cad5", 400: "#97a0b0", 500: "#6b7486", 600: "#4e5667", 700: "#394050", 800: "#252b37", 900: "#151a24", 950: "#0b0f17" } },
  { name: "sun", stufen: { 50: "#fffaeb", 100: "#fff1c9", 200: "#ffe49a", 300: "#ffd873", 400: "#ffc53d", 500: "#f5a70f", 600: "#c98500", 700: "#8a5a00" } },
  { name: "danger", stufen: { 50: "#fdf3f2", 100: "#fbe3e0", 200: "#f5c2bc", 300: "#e8806f", 500: "#d6463a", 600: "#b8352a", 700: "#962a21", 800: "#77231c" } },
];

const SEMANTIK = [
  { ton: "success", titel: "Erfolg", text: "Gespeichert, freigegeben, im Plan", flaeche: "bg-success-50 ring-success-200 text-success-800", punkt: "bg-success-500" },
  { ton: "info", titel: "Info", text: "Hinweis, neutraler Status", flaeche: "bg-info-50 ring-info-200 text-info-700", punkt: "bg-info-500" },
  { ton: "warn", titel: "Warnung", text: "Frist, fehlende Unterlage", flaeche: "bg-warn-50 ring-warn-200 text-warn-700", punkt: "bg-warn-500" },
  { ton: "danger", titel: "Fehler", text: "Fehlgeschlagen, destruktiv", flaeche: "bg-danger-50 ring-danger-200 text-danger-700", punkt: "bg-danger-500" },
];

const NACHT = [
  { name: "--ov-nacht-0", wert: "#020b1c", text: "Leitstand, Footer" },
  { name: "--ov-nacht-1", wert: "#03122b", text: "Standard dunkel" },
  { name: "--ov-nacht-2", wert: "#071c3d", text: "Karte auf Dunkel" },
  { name: "--ov-nacht-3", wert: "#0c2650", text: "Hover / aktiv" },
];

const ERZEUGUNG = [12, 18, 15, 24, 31, 38, 42, 40, 33, 26, 17, 11];
const MONATE = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function Block({ id, titel, text, children }) {
  return (
    <div id={id} className="scroll-mt-28">
      <h3 className="ov-h3 text-ink-900">{titel}</h3>
      {text && <p className="ov-klein mt-1.5 max-w-2xl text-ink-600">{text}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Farbfeld({ hex, label }) {
  return (
    <div className="min-w-0">
      <div className="h-14 rounded-xl ring-1 ring-inset ring-black/5" style={{ background: hex }} />
      <p className="mt-1.5 text-[12px] font-semibold text-ink-900">{label}</p>
      <p className="ov-num text-[11.5px] uppercase text-ink-500">{hex}</p>
    </div>
  );
}

const NAV = [
  ["farben", "Farben"],
  ["typo", "Typografie"],
  ["tiefe", "Tiefe & Radien"],
  ["aktionen", "Aktionen & Badges"],
  ["kennzahlen", "Kennzahlen"],
  ["portal", "Portal-Bausteine"],
  ["interaktion", "Interaktion"],
  ["motion", "Motion"],
  ["daten", "Daten"],
  ["illustration", "Illustration"],
];

export default function DesignSeite() {
  return (
    <>
      <PageHero
        variant="dark"
        eyebrow="Intern · Design-System 2.0"
        title={
          <>
            Ruhig, präzise, <span className="ov-text-gradient-light">lebendig.</span>
          </>
        }
        lead="Der lebende Styleguide für Website und Plattform: Tokens, Typografie, Motion und alle Bausteine – mit echten Komponenten. Regeln und Teamzuständigkeiten stehen in docs/DESIGN.md."
        points={["WCAG 2.2 AA", "Nur transform & opacity", "prefers-reduced-motion", "Keine neuen Pakete"]}
      />

      <nav aria-label="Abschnitte des Styleguides" className="sticky top-[80px] z-30 border-b border-ink-100 bg-white/90 backdrop-blur">
        <ul className="ov-container ov-no-scrollbar flex gap-1 overflow-x-auto py-2">
          {NAV.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="inline-flex h-9 items-center whitespace-nowrap rounded-full px-3.5 text-[13.5px] font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ---------------- Farben ---------------- */}
      <Section tone="white" space="md">
        <div className="space-y-16">
          <Block id="farben" titel="Farbskalen" text="Grün handelt, Navy trägt, Sonne leuchtet sparsam, Rot nur bei Fehlern. Text in Grün mindestens ov-700, Meta-Text mindestens ink-500.">
            <div className="space-y-6">
              {SKALEN.map((s) => (
                <div key={s.name}>
                  <p className="ov-overline text-ink-500">{s.name}-*</p>
                  <div className="mt-2 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-11">
                    {Object.entries(s.stufen).map(([stufe, hex]) => (
                      <Farbfeld key={stufe} hex={hex} label={stufe} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Block>

          <Block titel="Kontrast-Sicherungen (zentral)" text="ink-400/500 abgedunkelt, weiße Schrift auf ov-500 wird automatisch auf ov-600 gesetzt, Feldrahmen an Eingaben mindestens 3:1 (ink-350).">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["text-ink-400", "4,9 : 1", "vorher 2,6 : 1", "text-ink-400"],
                ["text-ink-500", "6,0 : 1", "vorher 4,7 : 1", "text-ink-500"],
              ].map(([k, n, v, cls]) => (
                <div key={k} className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
                  <p className={`text-[15px] font-semibold ${cls}`}>Meta-Text {k}</p>
                  <p className="ov-num mt-1 text-[13px] text-ink-700">{n} <span className="text-ink-500">· {v}</span></p>
                </div>
              ))}
              <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
                <span className="inline-flex rounded-full bg-ov-500 px-2.5 py-1 text-[12px] font-semibold text-white">bg-ov-500 + Weiß</span>
                <p className="ov-num mt-2 text-[13px] text-ink-700">→ ov-600, 4,6 : 1 <span className="text-ink-500">· vorher 3,4 : 1</span></p>
              </div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
                <label htmlFor="ds-feldrand" className="text-[13px] font-semibold text-ink-900">Feld mit ring-ink-200</label>
                <input id="ds-feldrand" className="mt-1.5 h-10 w-full rounded-xl px-3 text-[15px] ring-1 ring-inset ring-ink-200" defaultValue="→ ink-350, 3,1 : 1" />
              </div>
            </div>
          </Block>

          <Block titel="Semantik" text="Aliasse auf die Markenskalen (bg-success-50, text-warn-700 …). Status nie nur über Farbe – immer mit Text oder Icon.">
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SEMANTIK.map((s) => (
                <div key={s.ton} className={`rounded-2xl p-4 ring-1 ring-inset ${s.flaeche}`}>
                  <p className="flex items-center gap-2 font-semibold">
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s.punkt}`} />
                    {s.titel} <span className="font-normal opacity-80">· {s.ton}</span>
                  </p>
                  <p className="mt-1 text-[13.5px]">{s.text}</p>
                </div>
              ))}
            </Stagger>
          </Block>

          <Block titel="Dunkle Flächen" text="Navy-Familie von tief nach erhaben. Text weiß bzw. weiß/75, Grün auf Dunkel ov-300.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {NACHT.map((n) => (
                <div key={n.name} className="rounded-2xl p-5 text-white ring-1 ring-white/10" style={{ background: n.wert }}>
                  <p className="ov-num text-[13px] font-semibold">{n.name}</p>
                  <p className="mt-1 text-[13px] text-white/75">{n.text}</p>
                  <p className="ov-num mt-4 text-[12px] uppercase text-white/60">{n.wert}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="ov-verlauf-nacht rounded-3xl p-6 text-white ring-1 ring-white/10">
                <p className="font-semibold">.ov-verlauf-nacht</p>
                <p className="mt-1 text-[14px] text-white/75">Hero-Kacheln, „Nächster Schritt“, dunkle KPI</p>
              </div>
              <div className="ov-verlauf-gruen rounded-3xl p-6 text-white">
                <p className="font-semibold">.ov-verlauf-gruen</p>
                <p className="mt-1 text-[14px] text-white/85">Marken-Kachel, höchstens eine je Ansicht</p>
              </div>
            </div>
          </Block>
        </div>
      </Section>

      {/* ---------------- Typografie ---------------- */}
      <Section tone="sand" space="md">
        <Block id="typo" titel="Typografie" text="Manrope für Überschriften und Zahlen, Inter für Text. Fluide Größen zwischen 360 und 1440 px.">
          <div className="space-y-6 rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 shadow-e1 md:p-10">
            {[
              ["ov-display", "Aus Flächen werden Kraftwerke."],
              ["ov-h1", "Solarpark-Rendite, wie Banken rechnen."],
              ["ov-h2", "Der Marktplatz für PV-Projekte"],
              ["ov-h3", "Planbare Pacht für 30 Jahre"],
              ["ov-h4", "Unterlagen für den Datenraum"],
              ["ov-lead", "Wir entwickeln Solarparks, Agri-PV und Solarcarports – und bringen zusammen, was dafür nötig ist."],
              ["ov-text", "Fließtext mit ruhigem Durchschuss. Deutsche Komposita wie Einspeisevergütungssätze werden im Fließtext getrennt."],
              ["ov-klein", "Sekundärtext, Tabellenzellen, Erläuterungen unter Feldern."],
              ["ov-mikro", "Meta, Achsenbeschriftung, Fußnoten – nie kleiner als diese Stufe."],
              ["ov-overline", "Überzeile · Eyebrow"],
            ].map(([k, t]) => (
              <div key={k} className="grid gap-2 border-b border-ink-100 pb-6 last:border-0 last:pb-0 md:grid-cols-[140px_1fr] md:gap-8">
                <code className="ov-num pt-1 text-[12.5px] font-semibold text-ov-700">.{k}</code>
                <p className={`${k} ${k === "ov-overline" ? "text-ov-700" : "text-ink-900"}`}>{t}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 shadow-e1">
              <code className="text-[12.5px] font-semibold text-ov-700">.ov-kpi-xl</code>
              <p className="ov-kpi-xl mt-3 text-ink-900">50<span className="ov-einheit">MWp</span></p>
            </div>
            <div className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 shadow-e1">
              <code className="text-[12.5px] font-semibold text-ov-700">.ov-kpi-l</code>
              <p className="ov-kpi-l mt-3 text-ink-900">4,94<span className="ov-einheit">ct/kWh</span></p>
            </div>
            <div className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 shadow-e1">
              <code className="text-[12.5px] font-semibold text-ov-700">.ov-kpi</code>
              <p className="ov-kpi mt-3 text-ink-900">1.284,5<span className="ov-einheit">MWh</span></p>
              <p className="ov-mikro mt-2 text-ink-500">Tabellarische Ziffern, deutsches Format, Einheit 55 %</p>
            </div>
          </div>
        </Block>
      </Section>

      {/* ---------------- Tiefe ---------------- */}
      <Section tone="ink" space="md">
        <Block id="tiefe" titel="Elevation & Radien" text="Tiefe ist eine Rangordnung: e1 Fläche, e3 die wichtigste Karte, e5 Dialog.">
          <div className="grid grid-cols-2 gap-5 md:grid-cols-5">
            {["e1", "e2", "e3", "e4", "e5"].map((e, i) => (
              <div key={e} className={`flex aspect-[4/3] flex-col justify-end rounded-3xl bg-white p-4 ring-1 ring-ink-200/50 shadow-${e}`} style={{ boxShadow: `var(--ov-${e})` }}>
                <p className="font-display text-[18px] font-extrabold text-ink-900">shadow-{e}</p>
                <p className="ov-mikro text-ink-500">{["Karte", "Dropdown, Tab", "Wichtigste Karte", "Hover, Toast", "Dialog"][i]}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-end gap-4">
            {[
              ["rounded-xl", "0.75rem"],
              ["rounded-2xl", "1rem"],
              ["rounded-3xl", "1.5rem · Karte"],
              ["rounded-4xl", "2rem · Hero, Illustration"],
              ["rounded-full", "Button, Badge"],
            ].map(([k, t]) => (
              <div key={k} className="text-center">
                <div className={`h-20 w-28 bg-white ring-1 ring-ink-200 ${k}`} />
                <p className="mt-2 text-[12px] font-semibold text-ink-900">{k}</p>
                <p className="ov-mikro text-ink-500">{t}</p>
              </div>
            ))}
          </div>
        </Block>
      </Section>

      {/* ---------------- Aktionen ---------------- */}
      <Section tone="white" space="md">
        <Block id="aktionen" titel="Buttons" text="Eine primäre Aktion je Bereich. Drücken federt (scale .975), Laden sperrt ohne Breitensprung.">
          <div className="flex flex-wrap items-center gap-3">
            <Button pfeil>Primär</Button>
            <Button variant="navy">Navy</Button>
            <Button variant="secondary" icon={Download}>Sekundär</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="sun">Sonne</Button>
            <Button variant="danger">Löschen</Button>
            <Button variant="dangerLeise">Entfernen</Button>
            <Button variant="link" href="#aktionen">Textlink</Button>
            <Button laedt>Lädt</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="xs">xs</Button>
            <Button size="sm">sm</Button>
            <Button size="md">md</Button>
            <Button size="lg">lg</Button>
          </div>
          <div className="ov-dunkel mt-6 flex flex-wrap items-center gap-3 rounded-3xl bg-navy-950 p-6">
            <Button variant="white" pfeil>Weiß</Button>
            <Button variant="outlineLight">Outline hell</Button>
            <Button>Primär auf Dunkel</Button>
          </div>
        </Block>

        <div className="mt-16">
          <Block titel="Badges" text="Immer mit Text. Punkt = Status, Icon = Typ, live = Echtzeit.">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge>Neutral</Badge>
              <Badge ton="info" punkt>In Prüfung</Badge>
              <Badge ton="success" punkt>Freigegeben</Badge>
              <Badge ton="warn" punkt>Frist läuft</Badge>
              <Badge ton="danger" punkt>Abgelehnt</Badge>
              <Badge ton="marke" icon={Leaf}>Agri-PV</Badge>
              <Badge ton="navy">Investor</Badge>
              <Badge ton="success" live>Live</Badge>
              <Badge ton="info" groesse="sm">sm</Badge>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-2xl bg-navy-950 p-4">
              <Badge ton="dunkel" punkt>Auf Dunkel</Badge>
              <Badge ton="glas" live>Live-Daten</Badge>
            </div>
          </Block>
        </div>
      </Section>

      {/* ---------------- Kennzahlen ---------------- */}
      <Section tone="sand" space="md">
        <Block id="kennzahlen" titel="KPI-Kacheln" text="Die Zahl führt: zählt hoch, Einheit klein, Trend nach Bedeutung gefärbt, Verlauf als Sparkline.">
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiKachel label="Erzeugung im Jahr" wert={1284.5} stellen={1} einheit="MWh" icon={Sun} trend={{ wert: 6.2, text: "ggü. Vorjahr" }} verlauf={ERZEUGUNG} />
            <KpiKachel label="Strompreis Pool" wert={14.2} stellen={1} einheit="ct/kWh" icon={Zap} trend={{ wert: -3.1, text: "ggü. Vormonat", richtung: "runter-gut" }} />
            <KpiKachel label="Projekt-IRR" wert="7,4" einheit="%" ton="dunkel" icon={TrendingUp} hinweis="vor Steuern, 30 Jahre" verlauf={[5.2, 5.8, 6.1, 6.6, 7.0, 7.4]} href="#kennzahlen" />
            <KpiKachel label="Offene Anfragen" wert={12} icon={Inbox} ton="marke" hinweis="3 davon heute" href="#kennzahlen" />
          </Stagger>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiKachel label="Lädt" laedt icon={Gauge} />
            <KpiKachel label="Lädt dunkel" laedt ton="dunkel" />
            <div className="flex items-center gap-5 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 shadow-e1">
              <FortschrittsRing wert={72} label="Datenraum-Qualität" />
              <div>
                <p className="text-[13px] text-ink-500">Datenraum-Qualität</p>
                <p className="font-display text-[17px] font-bold text-ink-900">7 von 10 Unterlagen</p>
              </div>
            </div>
            <div className="ov-verlauf-nacht flex items-center gap-5 rounded-3xl p-5 text-white ring-1 ring-white/10">
              <FortschrittsRing wert={94} dunkel groesse={64} label="Verfügbarkeit" />
              <div>
                <p className="text-[13px] text-white/75">Verfügbarkeit</p>
                <Sparkline werte={[91, 96, 93, 97, 95, 94]} ton="hell" breite={110} hoehe={28} label="Verfügbarkeit der letzten 6 Monate" />
              </div>
            </div>
          </div>
        </Block>
      </Section>

      {/* ---------------- Portal ---------------- */}
      <Section tone="ink" space="md">
        <Block id="portal" titel="Portal-Bausteine (Portal/ui.js)" text="Abwärtskompatibel veredelt: Karte mit Tönen, Kennzahl mit Trend/Verlauf, Leerzustand mit zweiter Aktion, Tabelle mit Zeilen-Hover.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kennzahl label="Passende Projekte" wert="12" hinweis="Matching-Score ≥ 70" icon={FolderKanban} href="#portal" trend={{ wert: 2, einheit: "", text: "neu" }} />
            <Kennzahl label="Flächen" wert="4" einheit="ha" icon={LandPlot} verlauf={[1, 2, 2, 3, 4]} />
            <Kennzahl label="Überfällig" wert="1" ton="dunkel" hinweis="Wiedervorlage" />
            <Kennzahl label="Lädt" laedt />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <Karte titel="Nächste Fristen" untertitel="Karte ton=erhaben – eine je Ansicht" ton="erhaben" icon={Gauge} aktion={<PfeilLink href="#portal">Alle</PfeilLink>} className="lg:col-span-2">
              <Tabelle kopf={["Projekt", "Leistung", "Status", ""]}>
                {[
                  ["Freifläche Niederbayern", "24 MWp", "success", "Datenraum frei"],
                  ["Agri-PV Mühlviertel", "8,5 MWp", "info", "NDA angefragt"],
                  ["Carport Logistik", "3,2 MWp", "warn", "Frist in 3 Tagen"],
                ].map(([n, l, t, s]) => (
                  <tr key={n}>
                    <td className={`${zelle} font-semibold text-ink-900`}>{n}</td>
                    <td className={`${zelle} ov-num text-right text-ink-700`}>{l}</td>
                    <td className={zelle}><Badge ton={t} punkt groesse="sm">{s}</Badge></td>
                    <td className={`${zelle} text-right`}><Button variant="ghost" size="xs" pfeil>Öffnen</Button></td>
                  </tr>
                ))}
              </Tabelle>
            </Karte>
            <Karte titel="Lädt" untertitel="Karte laedt" laedt />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Leer icon={LandPlot} titel="Noch keine Flächen" text="Legen Sie Ihre erste Fläche an – der Flächencheck dauert etwa zwei Minuten." aktion={<Button size="sm" pfeil>Fläche anlegen</Button>} sekundaer={<Button size="sm" variant="ghost">Mehr erfahren</Button>} />
            <div className="space-y-3">
              <Hinweis ton="info" titel="Info">Ihre Unterlagen werden geprüft.</Hinweis>
              <Hinweis ton="success" titel="Erfolg">Das Exposé ist freigegeben.</Hinweis>
              <Hinweis ton="warn" titel="Warnung">Die Pachtvertrags-Kopie fehlt noch.</Hinweis>
              <Hinweis ton="danger" titel="Fehler">Die Zahlung wurde abgelehnt.</Hinweis>
            </div>
          </div>
        </Block>
      </Section>

      {/* ---------------- Interaktion ---------------- */}
      <Section tone="white" space="md">
        <div id="interaktion" className="scroll-mt-28 space-y-16">
          <Block titel="Tabs" text="Pfeiltasten, Pos1/Ende; Indikator gleitet per transform.">
            <TabsDemo />
          </Block>
          <Block titel="Dialog, Toast, Tooltip" text="Natives <dialog> (mobil als Bottom-Sheet), Toasts ohne Provider, Tooltip bei Hover und Fokus.">
            <OverlayDemo />
          </Block>
          <Block titel="Rückfrage statt confirm()/prompt()" text="bestaetigen() und abfragen() aus ui/Rueckfrage.js – Promise, ohne Provider, mit Kontextzeilen, Pflichtfeld, Mindestlänge und Gefahr-Variante.">
            <RueckfrageDemo />
          </Block>
          <Block titel="Feedback" text="Laden → Erfolg mit gezeichnetem Haken; Fehlerfeld mit Text, Fokus und kurzem Schütteln.">
            <FeedbackDemo />
          </Block>
          <Block titel="Ansichtswechsel mit View Transition" text="mitUebergang(() => setAnsicht(…)) – weiches Überblenden, ohne Unterstützung sofort.">
            <AnsichtDemo />
          </Block>
        </div>
      </Section>

      {/* ---------------- Motion ---------------- */}
      <Section tone="sand" space="md">
        <Block id="motion" titel="Motion-Muster" text="Dauern 120/180/240/420/700 ms, Kurve ease-ov-out. Unter „Bewegung reduzieren“ stehen alle Endzustände sofort.">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ["Hover-Lift", "ov-lift", "Fahren Sie mit der Maus darüber."],
              ["Press", "ov-press", "Klicken und halten."],
              ["Einstieg", "ov-ein", "Beim Mounten 12 px + Fade."],
            ].map(([t, k, x]) => (
              <button key={k} type="button" className={`${k} rounded-3xl bg-white p-6 text-left ring-1 ring-ink-200/70 shadow-e1`}>
                <code className="text-[12.5px] font-semibold text-ov-700">.{k}</code>
                <p className="mt-2 font-display text-[17px] font-bold text-ink-900">{t}</p>
                <p className="mt-1 text-[14px] text-ink-600">{x}</p>
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 shadow-e1">
              <p className="ov-overline text-ink-500">Stagger</p>
              <Stagger as="ul" className="mt-4 space-y-2.5">
                {["Fläche geprüft", "Netzanfrage gestellt", "Aufstellungsbeschluss", "Satzungsbeschluss", "Baureife"].map((s, i) => (
                  <li key={s} className="flex items-center gap-3 rounded-2xl bg-sand-50 px-4 py-3 text-[14.5px] text-ink-800 ring-1 ring-sand-200">
                    <span className="ov-num flex h-7 w-7 items-center justify-center rounded-full bg-white text-[12px] font-bold text-ov-700 ring-1 ring-ov-200">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </Stagger>
            </div>
            <div className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 shadow-e1" aria-busy="true">
              <p className="ov-overline text-ink-500">Skeleton</p>
              <div className="mt-4 flex items-center gap-3">
                <Skeleton rund className="h-11 w-11" />
                <div className="flex-1">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
              </div>
              <SkeletonText zeilen={3} className="mt-5" />
              <SkeletonTabelle zeilen={2} spalten={3} className="mt-4" />
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <SkeletonKarte />
            <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-6 text-center ring-1 ring-ink-200/70 shadow-e1">
              <ErfolgsHaken />
              <p className="mt-3 font-display text-[17px] font-bold text-ink-900">Erfolg</p>
              <p className="text-[13.5px] text-ink-500">ov-erfolg + ov-linie</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-navy-950 p-6 text-center text-white">
              <span className="inline-flex items-center gap-2 text-[14px] font-semibold"><span className="ov-live-punkt" aria-hidden="true" /> Live</span>
              <p className="text-[13.5px] text-white/70">ov-live-punkt – Ping per transform</p>
            </div>
          </div>
        </Block>
      </Section>

      {/* ---------------- Daten ---------------- */}
      <Section tone="white" space="md">
        <Block id="daten" titel="Datenvisualisierung" text="Paletten aus ui/datenfarben.js. Max. 4 Kategorien, zweites Merkmal (Linienstil), feste Energie-Bedeutungen.">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Reveal dir="ohne" className="self-start rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 shadow-e1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display text-[17px] font-bold text-ink-900">Erzeugung je Monat <span className="text-[13px] font-medium text-ink-500">in MWh</span></p>
                <span className="flex items-center gap-3 text-[12.5px] text-ink-600">
                  <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: ENERGIE.erzeugung }} />Ist</span>
                  <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-0.5 w-4 border-t-2" style={{ borderColor: ENERGIE.verbrauch }} />Plan</span>
                </span>
              </div>
              <svg viewBox="0 0 480 200" className="mt-4 h-auto w-full" role="img" aria-label="Erzeugung je Monat: Höchstwert 42 MWh im Juli, Tiefstwert 11 MWh im Dezember; Plan verläuft knapp darunter.">
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1="28" x2="480" y1={20 + i * 50} y2={20 + i * 50} stroke="#eef0f4" />
                ))}
                {[45, 30, 15, 0].map((v, i) => (
                  <text key={v} x="0" y={24 + i * 50} fontSize="11" fill="#6b7486">{v}</text>
                ))}
                {ERZEUGUNG.map((v, i) => {
                  const h = (v / 45) * 150;
                  return (
                    <g key={i}>
                      <rect x={36 + i * 37} y={170 - h} width="24" height={h} rx="5" fill={ENERGIE.erzeugung} className="ov-balken-y" style={{ "--i": i }} />
                      <text x={48 + i * 37} y="190" fontSize="11" fill="#6b7486" textAnchor="middle">{MONATE[i]}</text>
                    </g>
                  );
                })}
                <path
                  d={ERZEUGUNG.map((v, i) => `${i ? "L" : "M"}${48 + i * 37} ${170 - ((v * 0.92) / 45) * 150}`).join(" ")}
                  pathLength="1"
                  fill="none"
                  stroke={ENERGIE.verbrauch}
                  strokeWidth="2"
                  strokeDasharray="1"
                  className="ov-linie"
                  style={{ "--ov-delay": "400ms" }}
                />
              </svg>
              <p className="ov-mikro mt-2 text-ink-500">Balken: ov-balken-y mit --i; Linie: pathLength=1 + ov-linie; Auslöser: Reveal dir=&quot;ohne&quot;.</p>
            </Reveal>
            <div className="space-y-5">
              {[
                ["Kategorien hell", KATEGORIE_HELL, false],
                ["Kategorien dunkel", KATEGORIE_DUNKEL, true],
                ["Sequenz grün", SEQUENZ_GRUEN, false],
                ["Sequenz navy", SEQUENZ_NAVY, false],
                ["Divergierend (Navy ↔ Sonne)", DIVERGIEREND, false],
              ].map(([t, p, d]) => (
                <div key={t}>
                  <p className="text-[13px] font-semibold text-ink-900">{t}</p>
                  <div className={`mt-2 flex gap-1.5 rounded-2xl p-1.5 ${d ? "bg-navy-950" : "bg-ink-50"}`}>
                    {p.map((f) => (
                      <span key={f} className="h-8 flex-1 rounded-lg" style={{ background: f }} title={f} />
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <p className="text-[13px] font-semibold text-ink-900">Energie-Bedeutungen</p>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] text-ink-700">
                  {Object.entries(ENERGIE).map(([k, f]) => (
                    <li key={k} className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: f }} />
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Block>
      </Section>

      {/* ---------------- Illustration ---------------- */}
      <Section tone="sand" space="md">
        <Block id="illustration" titel="Illustrationsstil" text="Isometrie 30°, drei Helligkeiten je Körper, 1,5-px-Navy-Konturen, Energiefluss als grüne Strichlinie. Referenz für T7 (Helfer iso/quader aus ui/illustration.js).">
          <div className="grid gap-5 lg:grid-cols-2">
            <IllustrationRahmen ton="sand" format="16/10" label="Isometrischer Solarpark mit Speicher und Netzanschluss" unterschrift="Referenzmotiv „Solarpark mit Speicher“ im IllustrationRahmen ton=sand">
              <IsoSolarpark />
            </IllustrationRahmen>
            <IllustrationRahmen ton="navy" format="16/10" label="Isometrischer Solarpark auf dunklem Grund" unterschrift="Gleiches Motiv auf ton=navy (Hero, Leitstand)">
              <IsoSolarpark dunkel />
            </IllustrationRahmen>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {Object.entries(ILLU).filter(([, f]) => f.startsWith("#")).map(([k, f]) => (
              <span key={k} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] text-ink-700 ring-1 ring-ink-200">
                <span aria-hidden="true" className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: f }} />
                {k}
              </span>
            ))}
          </div>
          <div className="ov-verlauf-nacht ov-dunkel mt-10 flex flex-wrap items-center justify-between gap-5 rounded-3xl p-6 text-white ring-1 ring-white/10 md:p-8">
            <div className="max-w-xl">
              <p className="ov-overline text-ov-300">Illustrationsbibliothek (T7)</p>
              <p className="mt-2 font-display text-[20px] font-extrabold tracking-tight">Alle Motive: Heros, Leerzustände, Spots, Markenmotiv</p>
              <p className="mt-1.5 text-[14.5px] text-white/75">
                Katalog <code className="text-ov-200">MOTIVE</code> aus <code className="text-ov-200">@/components/illustrationen</code> – mit Einsatzempfehlung, hell/dunkel und Animation.
              </p>
            </div>
            <Button href="/design/illustrationen" variant="white" pfeil>Zur Galerie</Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 shadow-e1">
            <p className="text-[15px] text-ink-700">Vollständige Regeln, Teamzuständigkeiten und Abnahme-Checkliste: <strong className="text-ink-900">docs/DESIGN.md</strong></p>
            <Button href="/" variant="secondary" icon={ArrowRight}>Zur Startseite</Button>
          </div>
        </Block>
      </Section>
    </>
  );
}

/** Referenz-Illustration: Solarpark mit Modulreihen, Speicher, Trafo, Energiefluss. */
function IsoSolarpark({ dunkel = false }) {
  const E = 11;
  const O = [250, 70];
  const k = dunkel ? "rgba(255,255,255,0.22)" : ILLU.kontur;
  const boden = quader(0, 0, 0, 22, 16, 0.6, E, O);
  const reihen = [0, 1, 2, 3].map((r) => quader(1.5, 1.5 + r * 3.4, 0.6, 12, 1.6, 1.1, E, O));
  const speicher = quader(15.5, 2, 0.6, 4.5, 2.2, 2.4, E, O);
  const trafo = quader(16, 8, 0.6, 2.4, 2.4, 1.8, E, O);
  const fluss = [iso(13.5, 3, 1.4, E, O), iso(15.5, 3, 1.4, E, O), iso(15.5, 3, 1.4, E, O)];
  const fluss2 = [iso(17.2, 4.2, 1.2, E, O), iso(17.2, 8, 1.2, E, O)];
  const sonne = iso(4, -5, 9, E, O);
  return (
    <svg viewBox="0 0 500 300" className="h-full w-full" aria-hidden="true">
      <circle cx={sonne[0]} cy={sonne[1]} r="20" fill={ILLU.sonneHell} />
      <circle cx={sonne[0]} cy={sonne[1]} r="32" fill={ILLU.sonneHell} opacity="0.25" />
      <polygon points={boden.oben} fill={dunkel ? "#0c2650" : ILLU.gruenOben} stroke={k} strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points={boden.links} fill={dunkel ? "#071c3d" : ILLU.gruenLinks} stroke={k} strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points={boden.rechts} fill={dunkel ? "#03122b" : ILLU.gruenRechts} stroke={k} strokeWidth="1.5" strokeLinejoin="round" />
      {reihen.map((q, i) => (
        <g key={i}>
          <polygon points={q.links} fill={ILLU.modulLinks} stroke={k} strokeWidth="1.5" strokeLinejoin="round" />
          <polygon points={q.rechts} fill={ILLU.modulRechts} stroke={k} strokeWidth="1.5" strokeLinejoin="round" />
          <polygon points={q.oben} fill={ILLU.modulOben} stroke={k} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      ))}
      {[speicher, trafo].map((q, i) => (
        <g key={i}>
          <polygon points={q.links} fill={ILLU.hellLinks} stroke={k} strokeWidth="1.5" strokeLinejoin="round" />
          <polygon points={q.rechts} fill={ILLU.hellRechts} stroke={k} strokeWidth="1.5" strokeLinejoin="round" />
          <polygon points={q.oben} fill={ILLU.hellOben} stroke={k} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      ))}
      <polyline points={punkte(fluss)} fill="none" stroke={dunkel ? "#aed083" : ILLU.strom} strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" />
      <polyline points={punkte(fluss2)} fill="none" stroke={dunkel ? "#aed083" : ILLU.strom} strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" />
    </svg>
  );
}
