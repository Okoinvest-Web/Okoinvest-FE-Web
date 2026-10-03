// Einstiegsseite einer Länderzone (/de, /at, /ch) – Welle 2, Masterplan Abschnitt 4.
//
// Kein Klon: Die Seite zeigt genau die Seiten, die im Land freigegeben sind (stufen.js), gruppiert,
// dazu was „in Vorbereitung“ ist und welche Seiten bisher nur für Deutschland gelten.
// Keine Zahlen außer den Seitenzahlen aus dem Register, keine Versprechen.

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock, Globe2 } from "lucide-react";
import Hero from "@/components/Boerse/Seite/Hero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import CtaBand from "@/components/ui/CtaBand";
import { NAVIGATION } from "@/data/navigation";
import { EINSTIEG, GRUPPEN, LAENDER, LAND_CODES, SEITEN, WEGWEISER_DE, einstiegPfad, landPfad, seiteFuer, seitenDesLandes } from "@/lib/land";

/** Kurztexte aus der Navigation (eine Quelle); Seiten ohne Navigationseintrag ohne Text. */
const KURZ = Object.fromEntries(NAVIGATION.flatMap((n) => n.groups.flatMap((g) => g.items)).map((i) => [i.href, i.text]));

const TEXTE = {
  DE: {
    titel: (
      <>
        Solarparks, <span className="whitespace-nowrap">Agri-PV</span> und Strom <span className="ov-text-gradient-light">in Deutschland.</span>
      </>
    ),
    lead: "Alle Seiten mit deutschem Rechtsrahmen an einem Ort: Rechner, Regionalseiten der 16 Bundesländer und Leitfäden zu Pacht, Genehmigung, Förderung und Strombezug.",
    versprechen: ["Recht nach EEG, BauGB und Landesrecht", "16 Regionalseiten mit Quellen", "Rechner mit offenen Annahmen", "Quellen und Stand je Seite"],
    aktionen: [
      { label: "Fläche prüfen", schluessel: "/flaechencheck" },
      { label: "Alle Rechner", schluessel: "/rechner" },
    ],
  },
  AT: {
    titel: (
      <>
        Freiflächen-PV und Energie{"­"}gemeinschaften <span className="ov-text-gradient-light">in Österreich.</span>
      </>
    ),
    lead: "Die Seiten für Österreich starten mit den fachlich überarbeiteten Themen: Regionalseiten der neun Bundesländer, Energiegemeinschaften und der Flächencheck. Weitere Seiten folgen, sobald Inhalt und Zahlen für Österreich geprüft sind.",
    versprechen: ["9 Bundesländer mit Quellen", "Energiegemeinschaften nach österreichischem Recht", "Flächencheck ohne Pachtwerte bis zur Prüfung", "Weitere Seiten nach Fachfreigabe"],
    aktionen: [
      { label: "Fläche prüfen", schluessel: "/flaechencheck" },
      { label: "Regionen in Österreich", schluessel: "/regionen" },
    ],
  },
  CH: {
    titel: (
      <>
        Freiflächen-PV <span className="ov-text-gradient-light">in der Schweiz.</span>
      </>
    ),
    lead: "Die Seiten für die Schweiz sind im Aufbau. Marktzugang-Check und Parzellen-Vorprüfung erscheinen, sobald Inhalt und Zahlen für die Schweiz geprüft sind. Bis dahin finden Sie hier den Ratgeber zur Freiflächen-PV in der Schweiz und die länderübergreifenden Angebote.",
    versprechen: ["Keine Zahlen ohne Schweizer Quelle", "Ratgeber Schweiz verfügbar", "Projektbörse länderübergreifend", "Persönlicher Kontakt"],
    aktionen: [
      { label: "Ratgeber Schweiz", href: "/wissen/ratgeber/freiflaechen-pv-schweiz" },
      { label: "Kontakt", href: "/kontakt" },
    ],
  },
};

const STAMM_LINKS = [
  { href: "/projektboerse", titel: "Projektbörse", text: "PV-Projekte in allen Phasen – für Deutschland, Österreich und die Schweiz." },
  { href: "/investoren", titel: "Für Investoren", text: "Projektrechte, baureife Projekte und Bestandsanlagen." },
  { href: "/wissen/ratgeber", titel: "Ratgeber", text: "Fachartikel zu Pacht, Genehmigung und Investment – je Artikel mit Länderbezug." },
  { href: "/kontakt", titel: "Kontakt", text: "Anfrage an das Projektteam." },
];


function Stufenbuehne({ land }) {
  const zeilen = LAND_CODES.map((code) => {
    const seiten = seitenDesLandes(code);
    return {
      code,
      info: LAENDER[code],
      frei: seiten.filter((s) => s.stufe === "frei" && s.schluessel !== EINSTIEG).length,
      vorbereitung: seiten.filter((s) => s.stufe === "vorbereitung").length,
      stand: code === "DE" ? "vollständig" : code === "AT" ? "Start mit fachlich überarbeiteten Seiten" : "im Aufbau",
    };
  });
  return (
    <div className="rounded-[1.75rem] bg-white/[0.06] p-5 ring-1 ring-white/12 backdrop-blur-sm sm:p-6">
      <p className="ov-overline text-ov-300">Seiten je Land</p>
      <ul className="mt-5 space-y-3">
        {zeilen.map((z) => {
          const aktiv = z.code === land;
          return (
            <li key={z.code}>
              <Link
                href={einstiegPfad(z.code)}
                hrefLang={z.info.lang}
                aria-current={aktiv ? "page" : undefined}
                className={`group flex items-center gap-4 rounded-2xl p-4 ring-1 transition-colors ${aktiv ? "bg-white text-ink-900 ring-white" : "bg-white/[0.04] text-white ring-white/10 hover:bg-white/10"}`}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-[15px] font-extrabold ${aktiv ? "bg-ov-600 text-white" : "bg-white/10 text-ov-200"}`}>{z.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[16px] font-bold">{z.info.name}</span>
                  <span className={`block text-[13px] ${aktiv ? "text-ink-600" : "text-white/65"}`}>
                    {z.frei ? `${z.frei} Seiten` : "noch keine Seiten"}
                    {z.vorbereitung ? ` · ${z.vorbereitung} in Vorbereitung` : ""} · {z.stand}
                  </span>
                </span>
                <ArrowRight aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${aktiv ? "text-ov-600" : "text-white/60"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Karte({ href, titel, text, marke, i = 0 }) {
  return (
    <Reveal as="li" delay={Math.min(i, 8) * 50} className="flex">
      <article className="group ov-card-hover relative flex w-full flex-col rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 focus-within:ring-2 focus-within:ring-ov-500 hover:ring-ov-300">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[17px] font-bold leading-snug text-ink-900">
            <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']">
              {titel}
            </Link>
          </h3>
          {marke ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sun-50 px-2.5 py-1 text-[12px] font-semibold text-sun-800 ring-1 ring-sun-200">
              <Clock aria-hidden="true" className="h-3.5 w-3.5" />
              {marke}
            </span>
          ) : (
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400 transition-transform duration-300 group-hover:rotate-45 group-hover:text-ov-600" />
          )}
        </div>
        {text && <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{text}</p>}
      </article>
    </Reveal>
  );
}

export default function LandEinstieg({ land }) {
  const info = LAENDER[land];
  const t = TEXTE[land];
  const seiten = seitenDesLandes(land).filter((s) => s.schluessel !== EINSTIEG && !seiteFuer(s.schluessel).eintrag.dynamisch);
  const gruppen = GRUPPEN.map((g) => ({
    ...g,
    seiten: seiten.filter((s) => SEITEN[s.schluessel]?.gruppe === g.id),
  })).filter((g) => g.seiten.length);
  const nurDe = land === "DE" ? [] : WEGWEISER_DE.filter((k) => !seiten.some((s) => s.schluessel === k));
  const aktionen = t.aktionen.map((a) => ({ label: a.label, href: a.href || landPfad(a.schluessel, land) }));

  return (
    <div>
      <Hero
        breadcrumbs={[{ name: info.name }]}
        pill={{ marke: land, text: `Seiten ${info.fuerLand}`, href: "#seiten" }}
        titel={t.titel}
        lead={t.lead}
        aktionen={aktionen}
        versprechen={t.versprechen}
        buehne={<Stufenbuehne land={land} />}
        bildunterschrift="Stand des Länderstarts: Jede Seite erscheint je Land erst nach fachlicher Freigabe."
      />

      <Section tone="sand" space="lg" id="seiten" className="scroll-mt-24">
        <SectionHeading
          eyebrow={`Seiten ${info.fuerLand}`}
          title={land === "CH" ? "Was für die Schweiz vorbereitet wird" : `Alles ${info.fuerLand} auf einen Blick`}
          lead={land === "DE" ? "Rechner, Leitfäden und Regionalseiten mit deutschem Rechtsrahmen." : "Freigegeben sind nur Seiten, deren Recht, Zahlen und Begriffe für dieses Land geprüft sind."}
          className="mb-10 md:mb-12"
        />
        <div className="space-y-10">
          {gruppen.map((g) => (
            <div key={g.id}>
              <h3 className="mb-4 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">{g.titel}</h3>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.seiten.map((s, i) => (
                  <Karte
                    key={s.schluessel}
                    i={i}
                    href={landPfad(s.schluessel, land)}
                    titel={seiteFuer(s.schluessel).eintrag.titel}
                    text={KURZ[s.schluessel]}
                    marke={s.stufe === "vorbereitung" ? "in Vorbereitung" : null}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {nurDe.length > 0 && (
        <Section tone="white" space="md">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <SectionHeading
              eyebrow="Noch nicht für dieses Land"
              title="Diese Seiten gelten bisher für Deutschland"
              lead={`Sie zeigen deutsches Recht und deutsche Zahlen. Für ${info.name} prüfen wir Inhalte und Werte gesondert, bevor eine eigene Seite erscheint.`}
            />
            <ul className="grid gap-2 sm:grid-cols-2">
              {nurDe.map((k) => (
                <li key={k}>
                  <Link href={landPfad(k, "DE")} hrefLang="de-DE" className="group flex items-center justify-between gap-3 rounded-2xl bg-sand-50 px-4 py-3 text-[15px] text-ink-800 ring-1 ring-ink-200/70 transition-colors hover:bg-ov-50">
                    <span>
                      <span className="font-semibold">{SEITEN[k].titel}</span> <span className="text-ink-500">(gilt für Deutschland)</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <Section tone={nurDe.length ? "sand" : "white"} space="md">
        <SectionHeading eyebrow="Für alle Länder" title="Länderübergreifend" className="mb-8" />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STAMM_LINKS.map((l, i) => (
            <Karte key={l.href} i={i} href={l.href} titel={l.titel} text={l.text} />
          ))}
        </ul>
        <p className="mt-8 flex items-start gap-2 text-[13.5px] text-ink-500">
          <Globe2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Andere Länder: {LAND_CODES.filter((c) => c !== land).map((c, i) => (
              <span key={c}>
                {i > 0 && " · "}
                <Link href={einstiegPfad(c)} hrefLang={LAENDER[c].lang} className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
                  {LAENDER[c].name}
                </Link>
              </span>
            ))}
          </span>
        </p>
      </Section>

      <CtaBand
        eyebrow={`Persönlich ${info.inLand}`}
        title="Lieber gleich mit dem Projektteam sprechen?"
        text="Schildern Sie kurz Ihre Fläche oder Ihr Vorhaben. Wir melden uns persönlich und sagen offen, was möglich ist."
        primary={{ label: "Zum Kontakt", href: "/kontakt" }}
        secondary={land === "CH" ? { label: "Zur Projektbörse", href: "/projektboerse" } : { label: "Fläche prüfen", href: landPfad("/flaechencheck", land) }}
      />
    </div>
  );
}
