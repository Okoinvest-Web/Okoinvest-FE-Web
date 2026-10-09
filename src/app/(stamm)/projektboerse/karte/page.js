import Link from "@/components/Land/Link";
import { Info, List } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import CtaBand from "@/components/ui/CtaBand";
import BoerseListe from "@/components/Boerse/BoerseListe";
import Hero from "@/components/Boerse/Seite/Hero";
import KartenBuehne from "@/components/Boerse/Seite/KartenBuehne";
import Marktbild from "@/components/Boerse/Seite/Marktbild";
import { abs } from "@/data/site";
import { backend, istDemo } from "@/lib/plattform/backend";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { istDemoAnsicht, sichtbareProjekte } from "@/lib/boerse/sichtbarkeit";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

export const dynamic = "force-dynamic";

const PFAD = "/projektboerse/karte";
const TITEL = "Projektbörse auf der Karte: PV-Projekte DACH | ÖkoInvest";
const BESCHREIBUNG =
  "Solarparks, Agri-PV und Großspeicher nach Bundesland und Kanton: Projekte der Projektbörse auf der Karte – bewusst grob, ohne genaue Lage, mit Filtern.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: abs(PFAD) },
  openGraph: {
    type: "website",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/solarpark-himmel.jpg"), width: 1280, height: 852, alt: "Solarpark unter blauem Himmel" }],
  },
};

const ERLAUBTE_FILTER = ["typ", "land", "phase", "mwpMin", "mwpMax", "sortierung", "region"];

const metadataEn = {
  title: "Project exchange on the map: PV projects DACH | ÖkoInvest",
  description: "Solar parks, agrivoltaics and battery storage by federal state and canton: projects on the project exchange shown on the map – deliberately coarse, without the exact location, with filters.",
  openGraph: {
    title: "Project exchange on the map: PV projects DACH | ÖkoInvest",
    description: "Solar parks, agrivoltaics and battery storage by federal state and canton: projects on the project exchange shown on the map – deliberately coarse, without the exact location, with filters.",
    images: [{ alt: "Solar park under a blue sky" }],
  },
};

const TEXTE = {
  de: {
    fehler: "Die Projektbörse ist vorübergehend nicht erreichbar.",
    boerse: "Projektbörse",
    karte: "Karte",
    pill: "Projekte je Bundesland bzw. Kanton",
    titel1: "Projekte nach Region\u00a0– ",
    titel2: "auf einen Blick.",
    lead: "Wo entstehen Solarparks, Agri-PV und Speicher? Die Karte bündelt die veröffentlichten Projekte je Bundesland bzw. Kanton. Die genaue Lage sehen Investoren erst im Datenraum nach NDA.",
    registrieren: "Als Investor registrieren",
    anbieten: "Projekt anbieten",
    versprechen: ["Bewusst grob: nur Region", "Filter wie in der Liste", "Für Investoren kostenfrei", "Details erst nach NDA"],
    alsListe: "Lieber als Liste?",
    zurListe: "Zur Listenansicht",
    bild: "Stilisierte Karte – keine genaue Lage",
    eyebrow: "Kartenansicht",
    titel: "Region wählen, Projekte filtern",
    lead2: "Wählen Sie ein Bundesland bzw. einen Kanton auf der Karte – die Projektliste darunter zeigt dann nur dessen Projekte.",
    demo: "Vorführdaten:",
    demoText: " Die Plattform läuft im Demo-Modus. Alle gezeigten Projekte sind fiktive Beispiele und keine Angebote.",
    nichtVerfuegbar: "Projektbörse derzeit nicht verfügbar",
    listenButton: "Zur Listenansicht der Projektbörse",
    ctaEyebrow: "Für Investoren kostenfrei",
    ctaTitel: "Ihre Region ist noch nicht dabei?",
    ctaText: "Legen Sie ein Suchprofil an. Neue Projekte, die zu Ihren Kriterien passen, sehen Sie im Portal zuerst.",
  },
  en: {
    fehler: "The project exchange is temporarily unavailable.",
    boerse: "Project exchange",
    karte: "Map",
    pill: "Projects per federal state or canton",
    titel1: "Projects by region\u00a0– ",
    titel2: "at a glance.",
    lead: "Where are solar parks, agrivoltaics and storage being built? The map groups the published projects by federal state or canton. Investors only see the exact location in the data room after the NDA.",
    registrieren: "Register as an investor",
    anbieten: "Offer a project",
    versprechen: ["Deliberately coarse: region only", "Same filters as the list", "Free of charge for investors", "Details only after NDA"],
    alsListe: "Prefer a list?",
    zurListe: "Go to the list view",
    bild: "Stylised map – no exact location",
    eyebrow: "Map view",
    titel: "Choose a region, filter projects",
    lead2: "Choose a federal state or canton on the map – the project list below then shows only its projects.",
    demo: "Demo data:",
    demoText: " The platform is running in demo mode. All projects shown are fictitious examples and not offers.",
    nichtVerfuegbar: "Project exchange currently unavailable",
    listenButton: "Go to the project exchange list view",
    ctaEyebrow: "Free of charge for investors",
    ctaTitel: "Your region is not listed yet?",
    ctaText: "Create a search profile. You will see new projects that match your criteria first in the portal.",
  },
};

export default async function ProjektboerseKarte({ params, searchParams }) {
  const land = await seitenLand(params);
  const t = uebersetze(TEXTE, spracheDerAnfrage());
  const sp = await searchParams;
  // Länderfassung: Filter „Land“ vorgewählt (abwählbar); ein Filter aus der URL hat Vorrang
  const start = { darstellung: "karte", ...(land ? { land } : {}), ...Object.fromEntries(ERLAUBTE_FILTER.map((k) => [k, typeof sp?.[k] === "string" ? sp[k].slice(0, 40) : ""]).filter(([, v]) => v)) };
  let daten = null;
  let fehler = "";
  try {
    daten = await backend().boerse(null, {});
  } catch (e) {
    fehler = e instanceof PlattformFehler ? e.message : t.fehler;
    if (!(e instanceof PlattformFehler)) console.error("[projektboerse/karte]", e);
  }

  // QM Welle 1 (wie Paket D in der Liste): Testdatensätze nie, Demo-Projekte nur im Demo-Modus;
  // Kennzahlen aus der gefilterten Liste statt aus den Rohkennzahlen des Backends.
  const demo = istDemoAnsicht({ backendDemo: istDemo(), daten });
  const projekte = daten ? sichtbareProjekte(daten.projekte, { demo }) : [];
  const kz = daten && {
    anzahl: projekte.length,
    mwp: Math.round(projekte.reduce((s, p) => s + (Number(p.mwp) || 0), 0) * 10) / 10,
    laender: new Set(projekte.map((p) => p.land).filter(Boolean)).size,
  };
  return (
    <>
      <Hero
        breadcrumbs={[{ name: t.boerse, href: "/projektboerse" }, { name: t.karte, href: PFAD }]}
        pill={{ marke: t.karte, text: t.pill, href: "#karte" }}
        titel={<>{t.titel1}<span className="ov-text-gradient-light">{t.titel2}</span></>}
        lead={t.lead}
        aktionen={[
          { label: t.registrieren, href: "/registrieren?rolle=investor" },
          { label: t.anbieten, href: "/projektboerse/anbieten" },
        ]}
        versprechen={t.versprechen}
        unten={
          <p className="mt-6 flex items-center gap-2 text-[14px] text-white/70">
            <List aria-hidden="true" className="h-4 w-4 shrink-0 text-sun-300" />
            <span>{t.alsListe} <Link href="/projektboerse" className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">{t.zurListe}</Link></span>
          </p>
        }
        buehne={daten ? <KartenBuehne projekte={projekte} /> : <div className="aspect-[47/60] w-full" />}
        bildunterschrift={t.bild}
      />
      {daten && <Marktbild projekte={projekte} kennzahlen={kz} />}
      <section id="karte" aria-labelledby="karte-titel" className="scroll-mt-20 bg-sand-50 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="ov-container">
          <SectionHeading className="mb-8 md:mb-10" eyebrow={t.eyebrow} title={<span id="karte-titel">{t.titel}</span>} lead={t.lead2} />
          {istDemo() && (
            <p className="mb-6 flex items-start gap-3 rounded-2xl bg-sun-300/25 px-5 py-4 text-[14.5px] leading-relaxed text-ink-900 ring-1 ring-inset ring-sun-400/50">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-700" />
              <span><strong>{t.demo}</strong>{t.demoText}</span>
            </p>
          )}
          {fehler ? (
            <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-ink-200/70">
              <p className="font-display text-[20px] font-bold text-ink-900">{t.nichtVerfuegbar}</p>
              <p className="mt-2 text-[15px] text-ink-600">{fehler}</p>
            </div>
          ) : (
            <BoerseListe projekte={projekte} basisHref="/projektboerse/" start={start} />
          )}
          <div className="mt-10 flex justify-center">
            <Button href="/projektboerse" variant="secondary" icon={List}>{t.listenButton}</Button>
          </div>
        </div>
      </section>
      {/* Abschluss für Investoren: Suchprofil statt Sackgasse nach der Kartensuche */}
      <CtaBand
        zielgruppe="investor"
        eyebrow={t.ctaEyebrow}
        title={t.ctaTitel}
        text={t.ctaText}
      />
    </>
  );
}

export const generateMetadata = seitenMetadata("/projektboerse/karte", metadata, { en: metadataEn });
