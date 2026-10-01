// src/app/design/illustrationen/page.js
//
// Galerie der Illustrationsbibliothek (Team T7). Nicht indexiert, nicht in der Sitemap.
// Zeigt alle Motive aus src/components/illustrationen mit Name, Kurzdoku und Einsatzstelle.

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import IllustrationRahmen from "@/components/ui/IllustrationRahmen";
import { MOTIVE } from "@/components/illustrationen";
import { Leer } from "@/components/Portal/ui";

export const metadata = {
  title: "Illustrationen | ÖkoInvest Design-System",
  description: "Interne Galerie aller Marken-Illustrationen: Hero-Szenen, Leerzustände, Spot-Grafiken und das animierte Marken-Motiv.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const nach = (k) => MOTIVE.filter((m) => m.kategorie === k);

function Kopf({ id, titel, text }) {
  return (
    <div id={id} className="mb-8 scroll-mt-28">
      <h2 className="ov-h2 text-ink-900">{titel}</h2>
      <p className="ov-text mt-2 max-w-3xl text-ink-600">{text}</p>
    </div>
  );
}

function Info({ m, dunkel }) {
  return (
    <div className="mt-3">
      <p className={dunkel ? "font-display text-[15px] font-bold text-white" : "font-display text-[15px] font-bold text-ink-900"}>
        <code>{`<${m.name} />`}</code>
      </p>
      <p className={dunkel ? "mt-1 text-[13.5px] text-white/75" : "mt-1 text-[13.5px] text-ink-600"}>{m.text}</p>
      <p className={dunkel ? "mt-1 text-[12.5px] text-ov-300" : "mt-1 text-[12.5px] text-ov-700"}>Einsatz: {m.einsatz}</p>
    </div>
  );
}

export default function IllustrationenSeite() {
  const marke = nach("marke")[0];
  const Marke = marke.Komponente;
  return (
    <>
      <PageHero
        variant="dark"
        eyebrow="Intern · Design-System 2.0"
        title="Illustrationen"
        lead="Isometrische Marken-Illustrationen als Inline-SVG: 7 Hero-Szenen, 21 Leerzustände, 12 Spot-Grafiken und ein animiertes Marken-Motiv. Import aus @/components/illustrationen, Props className, ton, animiert, titel."
        points={["Nur ILLU-Palette", "< 6 KB je Motiv", "prefers-reduced-motion", "Server-tauglich"]}
      />

      <Section tone="white" space="md">
        <Kopf id="hero" titel="Hero-Szenen" text="Format 16:10. Im IllustrationRahmen einsetzen; auf dunklem Grund ton=&quot;dunkel&quot;. Hier animiert gezeigt (Energiefluss, Rotor, Wolken)." />
        <div className="grid gap-x-5 gap-y-10 md:grid-cols-2">
          {nach("hero").map((m, i) => {
            const K = m.Komponente;
            const dunkel = i % 2 === 1;
            return (
              <div key={m.name}>
                <IllustrationRahmen ton={dunkel ? "navy" : "sand"} format="16/10" innenClassName="p-[3%]">
                  <K ton={dunkel ? "dunkel" : "hell"} animiert />
                </IllustrationRahmen>
                <Info m={m} />
              </div>
            );
          })}
        </div>
      </Section>

      <Section tone="sand" space="md">
        <Kopf id="leer" titel="Leerzustände" text="Format 5:4, gedacht für Leer aus Portal/ui: illustration={<KeineDokumente />}. Titel nennt, was fehlt; Text, was es bringt." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nach("leer").map((m) => {
            const K = m.Komponente;
            return (
              <div key={m.name}>
                <Leer illustration={<K />} titel={m.name} text={m.text} className="h-full bg-white" />
                <p className="mt-2 px-1 text-[12.5px] text-ov-700">Einsatz: {m.einsatz}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section tone="white" space="md">
        <Kopf id="spots" titel="Spot-Grafiken" text="Format 1:1 für Feature-Karten, empfohlen 64–96 px (className=&quot;h-20 w-20&quot;)." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {nach("spot").map((m) => {
            const K = m.Komponente;
            return (
              <div key={m.name} className="rounded-3xl bg-white p-6 shadow-e1 ring-1 ring-ink-200/70">
                <K className="h-20 w-20" />
                <Info m={m} />
              </div>
            );
          })}
        </div>
      </Section>

      <Section tone="sand" space="md">
        <Kopf id="marke" titel="Marken-Motiv" text="Schwebende Energie-Insel für Login und Registrierung. Standardmäßig animiert; unter reduzierter Bewegung still." />
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <IllustrationRahmen ton="weiss" format="1/1">
              <Marke />
            </IllustrationRahmen>
            <Info m={marke} />
          </div>
          <div>
            <IllustrationRahmen ton="navy" format="1/1">
              <Marke ton="dunkel" />
            </IllustrationRahmen>
            <p className="mt-3 text-[13.5px] text-ink-600">Variante ton=&quot;dunkel&quot; für das Navy-Seitenpanel.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
