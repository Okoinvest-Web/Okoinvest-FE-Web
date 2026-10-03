import Link from "next/link";
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

export const dynamic = "force-dynamic";

const PFAD = "/projektboerse/karte";
const TITEL = "Projektbörse auf der Karte: PV-Projekte DACH | ÖkoInvest";
const BESCHREIBUNG =
  "Solarparks, Agri-PV und Großspeicher nach Bundesland und Kanton: Projekte der Projektbörse auf der Karte – bewusst grob, ohne genaue Lage, mit Filtern.";

export const metadata = {
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

export default async function ProjektboerseKarte({ searchParams }) {
  const sp = await searchParams;
  const start = { darstellung: "karte", ...Object.fromEntries(ERLAUBTE_FILTER.map((k) => [k, typeof sp?.[k] === "string" ? sp[k].slice(0, 40) : ""]).filter(([, v]) => v)) };
  let daten = null;
  let fehler = "";
  try {
    daten = await backend().boerse(null, {});
  } catch (e) {
    fehler = e instanceof PlattformFehler ? e.message : "Die Projektbörse ist vorübergehend nicht erreichbar.";
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
        breadcrumbs={[{ name: "Projektbörse", href: "/projektboerse" }, { name: "Karte", href: PFAD }]}
        pill={{ marke: "Karte", text: "Projekte je Bundesland bzw. Kanton", href: "#karte" }}
        titel={<>Projekte nach Region&nbsp;– <span className="ov-text-gradient-light">auf einen Blick.</span></>}
        lead="Wo entstehen Solarparks, Agri-PV und Speicher? Die Karte bündelt die veröffentlichten Projekte je Bundesland bzw. Kanton. Die genaue Lage sehen Investoren erst im Datenraum nach NDA."
        aktionen={[
          { label: "Als Investor registrieren", href: "/registrieren?rolle=investor" },
          { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
        ]}
        versprechen={["Bewusst grob: nur Region", "Filter wie in der Liste", "Für Investoren kostenfrei", "Details erst nach NDA"]}
        unten={
          <p className="mt-6 flex items-center gap-2 text-[14px] text-white/70">
            <List aria-hidden="true" className="h-4 w-4 shrink-0 text-sun-300" />
            <span>Lieber als Liste? <Link href="/projektboerse" className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">Zur Listenansicht</Link></span>
          </p>
        }
        buehne={daten ? <KartenBuehne projekte={projekte} /> : <div className="aspect-[47/60] w-full" />}
        bildunterschrift="Stilisierte Karte – keine genaue Lage"
      />
      {daten && <Marktbild projekte={projekte} kennzahlen={kz} />}
      <section id="karte" aria-labelledby="karte-titel" className="scroll-mt-20 bg-sand-50 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="ov-container">
          <SectionHeading className="mb-8 md:mb-10" eyebrow="Kartenansicht" title={<span id="karte-titel">Region wählen, Projekte filtern</span>} lead="Wählen Sie ein Bundesland bzw. einen Kanton auf der Karte – die Projektliste darunter zeigt dann nur dessen Projekte." />
          {istDemo() && (
            <p className="mb-6 flex items-start gap-3 rounded-2xl bg-sun-300/25 px-5 py-4 text-[14.5px] leading-relaxed text-ink-900 ring-1 ring-inset ring-sun-400/50">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-700" />
              <span><strong>Vorführdaten:</strong> Die Plattform läuft im Demo-Modus. Alle gezeigten Projekte sind fiktive Beispiele und keine Angebote.</span>
            </p>
          )}
          {fehler ? (
            <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-ink-200/70">
              <p className="font-display text-[20px] font-bold text-ink-900">Projektbörse derzeit nicht verfügbar</p>
              <p className="mt-2 text-[15px] text-ink-600">{fehler}</p>
            </div>
          ) : (
            <BoerseListe projekte={projekte} basisHref="/projektboerse/" start={start} />
          )}
          <div className="mt-10 flex justify-center">
            <Button href="/projektboerse" variant="secondary" icon={List}>Zur Listenansicht der Projektbörse</Button>
          </div>
        </div>
      </section>
      {/* Abschluss für Investoren: Suchprofil statt Sackgasse nach der Kartensuche */}
      <CtaBand
        zielgruppe="investor"
        eyebrow="Für Investoren kostenfrei"
        title="Ihre Region ist noch nicht dabei?"
        text="Legen Sie ein Suchprofil an. Neue Projekte, die zu Ihren Kriterien passen, sehen Sie im Portal zuerst."
      />
    </>
  );
}
