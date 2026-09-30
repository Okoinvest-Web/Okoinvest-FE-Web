import { List } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import BoerseListe from "@/components/Boerse/BoerseListe";
import { abs } from "@/data/site";
import { backend, istDemo } from "@/lib/plattform/backend";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const dynamic = "force-dynamic";

const PFAD = "/projektboerse/karte";
const TITEL = "Projektbörse auf der Karte: PV-Projekte DACH | ÖkoInvest";
const BESCHREIBUNG =
  "Solarparks, Agri-PV und Großspeicher nach Bundesland und Kanton: Projekte der ÖkoInvest-Projektbörse auf der Karte – bewusst grob, ohne genaue Lage, mit Filtern.";

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

  return (
    <>
      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Projektbörse", href: "/projektboerse" }, { name: "Karte", href: PFAD }]}
        eyebrow="Projektbörse DACH"
        title={<>Projekte nach Region – <span className="ov-text-gradient-light">auf einen Blick</span></>}
        lead="Wo entstehen Solarparks, Agri-PV und Speicher? Die Karte bündelt die veröffentlichten Projekte je Bundesland bzw. Kanton. Die genaue Lage sehen Investoren erst im Datenraum nach NDA."
        actions={[
          { label: "Als Investor registrieren", href: "/registrieren?rolle=investor" },
          { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
        ]}
      />
      <Section tone="sand" space="md" id="karte">
        {istDemo() && (
          <p className="mb-6 rounded-2xl bg-sun-300/25 px-5 py-4 text-[14.5px] leading-relaxed text-ink-900 ring-1 ring-inset ring-sun-400/50">
            <strong>Vorführdaten:</strong> Die Plattform läuft im Demo-Modus. Alle gezeigten Projekte sind fiktive Beispiele und keine Angebote.
          </p>
        )}
        {fehler ? (
          <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-ink-200/70">
            <p className="font-display text-[20px] font-bold text-ink-900">Projektbörse derzeit nicht verfügbar</p>
            <p className="mt-2 text-[15px] text-ink-600">{fehler}</p>
          </div>
        ) : (
          <BoerseListe projekte={daten.projekte} basisHref="/projektboerse/" start={start} />
        )}
        <div className="mt-10 flex justify-center">
          <Button href="/projektboerse" variant="secondary" icon={List}>Zur Listenansicht der Projektbörse</Button>
        </div>
      </Section>
    </>
  );
}
