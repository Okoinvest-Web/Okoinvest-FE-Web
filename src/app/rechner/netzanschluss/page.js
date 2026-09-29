// src/app/rechner/netzanschluss/page.js – Netzanschluss-Check für Solarparks

import Link from "next/link";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import NetzanschlussRechner from "@/components/Rechner/NetzanschlussRechner";
import { FREIFLAECHE, SPEICHER } from "@/lib/invest/markt";
import { CLUSTER_ANTEIL, SPANNE } from "@/lib/rechner/netzanschluss";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/rechner/netzanschluss";
const N = FREIFLAECHE.netz;

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Netzanschluss-Check Solarpark: Kosten & Zeit | ÖkoInvest",
  description:
    "Netzanschluss für Solarpark prüfen: grobe Kosten für Kabeltrasse, Übergabestation und Umspannwerk, Zeitrahmen, Risiken und Tipps – mit Überbauung und Speicher.",
  keywords: ["Netzanschluss Solarpark Kosten", "Netzanschlussbegehren § 8 EEG", "Umspannwerk Solarpark", "Überbauung Netzanschluss", "Kabeltrasse Mittelspannung Kosten", "Netzverknüpfungspunkt"],
});

const FAQ = [
  {
    q: "Was kostet der Netzanschluss eines Solarparks?",
    a: `Das hängt vor allem von Entfernung und Spannungsebene ab. Als grobe Orientierung rechnen wir mit rund ${fmt(FREIFLAECHE.kabelProMeter)} € je Meter Mittelspannungstrasse, ${fmt(FREIFLAECHE.netzanschlussFixProMwp)} € je MWp für Übergabe- und Trafostationen und – bei großen Parks – mit einem eigenen Umspannwerk 110/20 kV in Millionenhöhe. Wenige Kilometer zur Mittelspannung sind meist gut tragbar; lange 110-kV-Trassen können die Wirtschaftlichkeit kippen.`,
  },
  {
    q: "Wer trägt welche Kosten?",
    a: "In Deutschland trägt der Anlagenbetreiber die Kosten für den Anschluss bis zum Netzverknüpfungspunkt (§ 16 EEG), der Netzbetreiber die Kosten für den Ausbau seines Netzes (§ 17 EEG). Für reine Einspeiser fällt in der Regel kein Baukostenzuschuss an – wohl aber für Netzbezug, etwa wenn ein Speicher aus dem Netz lädt.",
  },
  {
    q: "Wie schnell muss der Netzbetreiber antworten?",
    a: `Nach § 8 Abs. 5 EEG muss er nach Eingang des Netzanschlussbegehrens unverzüglich einen genauen Zeitplan für die Bearbeitung übermitteln und spätestens nach ${N.pruefWochen} Wochen das Ergebnis der Netzverträglichkeitsprüfung samt Kostenvoranschlag vorlegen (§ 8 Abs. 6 EEG) – vorausgesetzt, das Begehren ist vollständig. Der Bau selbst dauert länger: je nach Ebene und Kapazität von rund einem bis zu mehreren Jahren.`,
  },
  {
    q: "Was bedeutet Überbauung?",
    a: "Bei der Überbauung ist die Modulleistung größer als die Einspeiseleistung am Netzanschluss. Weil ein Solarpark seine volle Leistung nur an wenigen Stunden im Jahr erreicht, geht bei 70–80 % Anschlussleistung oft nur ein kleiner Teil des Ertrags verloren – mit einem Speicher noch weniger. Über eine flexible Netzanschlussvereinbarung nach § 8a EEG lässt sich die maximale Einspeisung vertraglich begrenzen.",
  },
  {
    q: "Lohnt sich die Clusterung mit Nachbarprojekten?",
    a: `Oft ja: Eine gemeinsame Trasse oder ein gemeinsames Umspannwerk teilt die größten Kostenblöcke. Im Rechner nehmen wir an, dass Sie etwa ${fmt((1 - CLUSTER_ANTEIL) * 100)} % dieser Kosten tragen. Wichtig sind klare Verträge zu Kostenaufteilung, Bauabfolge und Haftung, falls ein Partner später baut.`,
  },
  {
    q: "Wie ist es in Österreich und der Schweiz?",
    a: "In Österreich erfolgt der Netzzugang beim Verteilnetzbetreiber; es fallen Netzzutrittsentgelte und – für Bezug – Netzbereitstellungsentgelte an, Kapazitäten werden je Netzbereich veröffentlicht. In der Schweiz gelten die Anschlussbedingungen des Verteilnetzbetreibers; notwendige Netzverstärkungen werden in der Regel über die Netzkosten getragen. Die Kostenbausteine im Rechner sind auf Deutschland kalibriert.",
  },
];

export default function Page() {
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="netzanschluss"
      breadcrumb="Netzanschluss-Check"
      eyebrow="Für Eigentümer, Projektierer und Investoren"
      title={
        <>
          Der Netzanschluss entscheidet – <span className="ov-text-gradient-light">prüfen Sie ihn zuerst.</span>
        </>
      }
      lead="Größe, Entfernung, Spannungsebene und Netzkapazität eingeben: Sie erhalten grobe Kosten für Trasse, Stationen und Umspannwerk, einen Zeitrahmen, die wichtigsten Risiken und konkrete Tipps – inklusive Überbauung und Speicher."
      chips={["Kosten mit Spanne", "Zeitrahmen", "Überbauung & Speicher", "§ 8 EEG-Tipps"]}
      app={{
        name: "Netzanschluss-Check Solarpark",
        description: "Grobe Kosten- und Zeitschätzung für den Netzanschluss eines Solarparks nach Größe, Entfernung, Spannungsebene und Netzkapazität – mit Überbauung, Speicher, Clusterung, Risiken und Tipps.",
        featureList: ["Kostenbausteine Kabel, Stationen, Umspannwerk", "Automatische Wahl der Spannungsebene", "Überbauung mit Abregelungsverlust", "Speicher und Baukostenzuschuss", "Zeitrahmen und Risiken", "Tipps zu § 8 und § 8a EEG"],
      }}
      rechner={<NetzanschlussRechner />}
      erklaerung={
        <div className="ov-prose max-w-none">
          <h2>So rechnet der Netzanschluss-Check</h2>
          <p>
            Aus Modulleistung und Überbauung ergibt sich die <strong>Anschlussleistung</strong>. Bis etwa {fmt(N.grenzeMsMw)} MW ist in der Regel ein Anschluss an eine
            Mittelspannungsleitung möglich, bis etwa {fmt(N.grenzeUwMw)} MW an der Mittelspannungs-Sammelschiene eines Umspannwerks, darüber meist nur mit eigenem Umspannwerk an 110 kV. Je
            angefangene {fmt(N.msSystemMw)} MW rechnen wir ein 20-kV-Kabelsystem; weitere Systeme in derselben Trasse kosten wegen des gemeinsamen Tiefbaus nur {fmt(N.zusatzSystemFaktor * 100)} %.
          </p>
          <p>
            Die Kostenspanne reicht von {fmt(SPANNE.min * 100)} % bis {fmt(SPANNE.max * 100)} % des Mittelwerts – Querungen von Straßen, Bahnlinien und Gewässern, Bodenverhältnisse und
            Lieferzeiten können deutlich nach oben wirken. Der <strong>Zeitrahmen</strong> zählt ab dem vollständigen Netzanschlussbegehren und verlängert sich, wenn die Kapazität unbekannt
            oder knapp ist.
          </p>
          <p>
            Die <strong>Überbauung</strong> bewerten wir mit einer Näherung für eine fest aufgeständerte Süd-Anlage: bei 80 % Anschlussleistung rund{" "}
            {fmt(N.abregelung.find((x) => x[0] === 0.8)[1] * 100, 1)} % Ertragsverlust, bei 70 % rund {fmt(N.abregelung.find((x) => x[0] === 0.7)[1] * 100)} %. Ein Speicher mit Netzbezug
            zahlt einen Baukostenzuschuss (Beispielsatz {fmt(SPEICHER.bkzProKw.ms)} €/kW in der Mittelspannung).
          </p>
          <p>
            Mehr zum Ablauf im Ratgeber <Link href="/ratgeber/netzanschluss-solarpark">Netzanschluss Solarpark</Link>; die Wirkung der Netzkosten auf die Rendite zeigt der{" "}
            <Link href="/rechner/solarpark">Solarpark-Renditerechner</Link>.
          </p>
        </div>
      }
      annahmen={[
        ["MS-Kabeltrasse", `${fmt(FREIFLAECHE.kabelProMeter)} €/m`],
        ["Übergabe- & Trafostationen", `${fmt(FREIFLAECHE.netzanschlussFixProMwp)} €/MWp`],
        ["Einschleifen MS-Leitung", `${fmt(N.einschleifen / 1000)} Tsd. €`],
        ["Schaltfeld Umspannwerk", `${fmt(N.uwFeld.min / 1000)}–${fmt(N.uwFeld.max / 1000)} Tsd. €`],
        ["110-kV-Kabel", `${fmt(N.hsKabelProKm.min / 1e6, 1)}–${fmt(N.hsKabelProKm.max / 1e6, 1)} Mio. €/km`],
        ["Umspannwerk 110/20 kV", `${fmt(N.kundenUwFix / 1e6)} Mio. € + ${fmt(N.kundenUwProMva / 1000)} Tsd. €/MVA`],
        ["Leistung je 20-kV-System", `${fmt(N.msSystemMw)} MW`],
        ["BKZ Speicher (Beispiel)", `${fmt(SPEICHER.bkzProKw.ms)} / ${fmt(SPEICHER.bkzProKw.hs)} €/kW MS/HS`],
        ["Prüffrist Netzbetreiber", `${N.pruefWochen} Wochen (§ 8 Abs. 6 EEG)`],
      ]}
      quellen={[
        { name: "§ 8 EEG", url: "https://www.gesetze-im-internet.de/eeg_2014/__8.html" },
        { name: "§ 8a EEG", url: "https://www.gesetze-im-internet.de/eeg_2014/__8a.html" },
        { name: "§§ 16, 17 EEG", url: "https://www.gesetze-im-internet.de/eeg_2014/__16.html" },
        { name: "Kostenbausteine: eigene Einschätzung ÖkoInvest" },
      ]}
      faq={FAQ}
      faqTitel="Netzanschluss – gut zu wissen"
      querverweise={[
        { href: "/flaechencheck", titel: "Flächencheck", text: "Eignung und Pachtspanne Ihrer Fläche – die Netzentfernung fließt direkt ein." },
        { href: "/rechner/grossspeicher", titel: "Großspeicher-Rechner", text: "Speicher am selben Anschluss: Erlöse, Baukostenzuschuss und Rendite." },
        { href: "/ratgeber/netzanschluss-solarpark", titel: "Ratgeber Netzanschluss", text: "Netzanschlussbegehren, Verknüpfungspunkt und Zeitplan im Detail." },
        { href: "/prozess", titel: "Unser Prozess", text: "Von der Flächensicherung bis zur Inbetriebnahme – wann der Netzanschluss kommt." },
      ]}
      cta={{
        eyebrow: "Netzanschluss zuerst",
        title: "Wir fragen den Netzanschluss für Ihre Fläche an.",
        text: "Als Projektentwickler stellen wir das Netzanschlussbegehren, prüfen Clusterung mit Nachbarprojekten und planen Überbauung und Speicher – für Flächeneigentümer kostenfrei.",
        primary: { label: "Fläche prüfen lassen", href: "/flaechencheck" },
        secondary: { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
      }}
    />
  );
}
