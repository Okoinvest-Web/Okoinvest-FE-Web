// src/app/rechner/bestandsanlage/page.js – Bewertung von PV-Bestandsanlagen

import Link from "next/link";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import BestandsRechner from "@/components/Bestand/BestandsRechner";
import SectionHeading from "@/components/ui/SectionHeading";
import { BESTAND, ERLOESE, FREIFLAECHE, PACHT, PROVISION } from "@/lib/invest/markt";
import { PHASE_BESTAND } from "@/lib/rechner/bestandsanlage";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/rechner/bestandsanlage";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "PV-Bestandsanlage bewerten: Ertragswert | ÖkoInvest",
  description:
    "Was ist Ihre PV-Anlage wert? Ertragswert nach DCF mit EEG-Restlaufzeit, Ertragshistorie, Wechselrichtertausch, Pacht und Marktpreis nach Förderende.",
  keywords: ["PV Bestandsanlage bewerten", "Solarpark Wert berechnen", "Photovoltaik Anlage verkaufen Wert", "Ertragswert PV-Anlage", "Bestandsanlage kaufen Preis pro kWp"],
});

const FAQ = [
  {
    q: "Wie wird eine PV-Bestandsanlage bewertet?",
    a: "Üblich ist das Ertragswert- bzw. DCF-Verfahren: Man schätzt die künftigen Einnahmen (Vergütung, danach Marktpreis) und Ausgaben (Betrieb, Pacht, Ersatzinvestitionen, Rückbau) Jahr für Jahr und zinst sie mit der Renditeerwartung des Käufers ab. Die Summe ist der Wert der Anlage ohne Fremdkapital. Vergleichspreise je kWp dienen nur zur Plausibilisierung.",
  },
  {
    q: "Welchen Diskontsatz sollte ich ansetzen?",
    a: `Für unverschuldete Bestandsanlagen liegen die Renditeerwartungen meist zwischen ${fmt(BESTAND.diskont.min * 100, 1)} und ${fmt(BESTAND.diskont.max * 100, 1)} %. Niedriger bei großen, gut dokumentierten Anlagen mit langer Förderrestlaufzeit, höher bei kleinen Anlagen, kurzer Restlaufzeit, Ertragsproblemen oder hohem Merchant-Anteil. Ein Prozentpunkt verändert den Wert oft um 5–10 %.`,
  },
  {
    q: "Was passiert nach dem Ende der EEG-Vergütung?",
    a: `Die Anlage verkauft den Strom dann am Markt, meist über einen Direktvermarkter oder per PPA. Wir rechnen vorsichtig mit einem heutigen Solar-Marktwert von ${fmt(ERLOESE.merchantCt, 1)} ct/kWh, der nur langsam steigt, abzüglich Vermarktungskosten. Für kleine ausgeförderte Anlagen gibt es in Deutschland Sonderregeln; Details hängen von Größe und Messkonzept ab.`,
  },
  {
    q: "Warum ist die Ertragshistorie so wichtig?",
    a: "Weil sie zeigt, was die Anlage wirklich liefert. Liegt der gemessene Ertrag deutlich unter der Prognose für Standort und Alter, stecken oft Ursachen dahinter, die sich beheben lassen – defekte Strings, Wechselrichterausfälle, Verschattung, Verschmutzung – oder Mängel, die den Wert dauerhaft mindern. Eine technische Due Diligence mit Thermografie und Kennlinienmessung klärt das.",
  },
  {
    q: "Was kostet der Verkauf über die Plattform?",
    a: `Für Käufer nichts. Verkäufer zahlen eine Erfolgsprovision von ${PROVISION.verkaeufer.text}. Keine Einstell- oder Listungsgebühren.`,
  },
];

export default function Page() {
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="bestandsanlage"
      breadcrumb="Bestandsanlage bewerten"
      eyebrow="Bewertung Bestandsanlagen"
      title={<>Was ist Ihre laufende PV-Anlage <span className="ov-text-gradient-light">heute wert?</span></>}
      lead="Ertragswert nach dem DCF-Verfahren: Förderrestlaufzeit, gemessener Ertrag, Betriebskosten, Pacht, Wechselrichtertausch und Marktpreis nach Förderende – mit Spanne, Wert je kWp und Sensitivität."
      chips={["Kostenlos & ohne Anmeldung", "DCF mit Spanne", "Für Käufer und Verkäufer"]}
      app={{
        name: "ÖkoInvest Bewertung PV-Bestandsanlagen",
        description: "Ermittelt den Ertragswert laufender Photovoltaikanlagen nach dem DCF-Verfahren – mit EEG-Restlaufzeit, Ertragshistorie, Betriebskosten, Pacht, Wechselrichtertausch und Marktpreis nach Förderende.",
        featureList: ["Ertragswert mit Spanne", "Wert je kWp und Einordnung", "Feste Vergütung oder Marktprämie", "Pacht- und Dachvertrag mit Laufzeit", "Wechselrichtertausch", "Sensitivitätsmatrix und Werttreiber", "Käuferrendite für einen Kaufpreis"],
      }}
      rechner={<BestandsRechner />}
      erklaerung={
        <>
          <SectionHeading
            eyebrow="So rechnen wir"
            title="Eine Anlage ist so viel wert wie ihre künftigen Cashflows."
            lead="Wir rechnen offen Jahr für Jahr – so sehen Sie, woher der Wert kommt und welche Annahme ihn am stärksten bewegt."
          />
          <div className="ov-prose mt-8 max-w-2xl">
            <p>
              Ausgangspunkt ist der <strong>gemessene Ertrag</strong> der letzten Jahre, fortgeschrieben mit {fmt(BESTAND.degradation * 100, 1)} % Degradation pro Jahr. Bis zum Ende der <strong>Förderung</strong> gilt die feste Vergütung bzw. der anzulegende Wert als Untergrenze, danach der <strong>Marktwert</strong> Solar abzüglich {fmt(BESTAND.direktvermarktungCt, 1)} ct/kWh Vermarktungskosten.
            </p>
            <p>
              Abgezogen werden Betriebskosten (mit {fmt(FREIFLAECHE.inflation * 100)} % Inflation), die Pacht (indexiert mit {fmt(PACHT.indexierung * 100, 1)} %), ein <strong>Wechselrichtertausch</strong> und im letzten Jahr der Rückbau mit {fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp. Endet der Pacht- oder Dachvertrag ohne gesicherte Verlängerung, endet die Rechnung dort. Die Spanne ergibt sich aus ±1 Prozentpunkt Diskontsatz und ±5 % Ertrag.
            </p>
            <p>
              Die übliche Preisspanne von {fmt(PHASE_BESTAND.preisProKwp.min)}–{fmt(PHASE_BESTAND.preisProKwp.max)} €/kWp gilt für jüngere Anlagen mit heutigen Tarifen – ältere Anlagen mit hohem Tarif liegen oft deutlich darüber, Anlagen kurz vor Förderende darunter. Mehr zum Verkauf lesen Sie unter <Link href="/bestandsanlagen">Bestandsanlagen</Link>.
            </p>
          </div>
        </>
      }
      annahmen={[
        ["Bewertung ab", String(BESTAND.bewertungsjahr)],
        ["Diskontsatz (Spanne)", `${fmt(BESTAND.diskont.min * 100, 1)}–${fmt(BESTAND.diskont.max * 100, 1)} %`],
        ["Degradation", `${fmt(BESTAND.degradation * 100, 1)} % p. a.`],
        ["Betriebskosten Bestand", `${fmt(BESTAND.opexProKwp)} €/kWp·a`],
        ["Wechselrichtertausch", `${fmt(BESTAND.wechselrichterProKwp.min)}–${fmt(BESTAND.wechselrichterProKwp.max)} €/kWp`],
        ["Marktwert nach Förderung", `${fmt(ERLOESE.merchantCt, 1)} ct/kWh, +${fmt(ERLOESE.merchantSteigerung * 100)} % p. a.`],
        ["Nutzungsdauer", `${BESTAND.nutzungsdauer} Jahre (${BESTAND.nutzungsdauerSpanne.min}–${BESTAND.nutzungsdauerSpanne.max})`],
        ["Rückbau", `${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp`],
        ["Übliche Preise Bestand", `${fmt(PHASE_BESTAND.preisProKwp.min)}–${fmt(PHASE_BESTAND.preisProKwp.max)} €/kWp`],
      ]}
      quellen={[
        { name: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
        { name: "EEG 2023", url: "https://www.gesetze-im-internet.de/eeg_2014/" },
        { name: "PVGIS", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
      ]}
      faq={FAQ}
      querverweise={[
        { href: "/bestandsanlagen", titel: "Bestandsanlagen", text: "Verkaufen oder kaufen: Bewertung, Due Diligence, Ablauf und Provision." },
        { href: "/projektboerse?phase=cod", titel: "Bestand in der Börse", text: "Laufende Anlagen in der Projektbörse – Teaser öffentlich, Details nach NDA." },
        { href: "/rechner/projektbewertung", titel: "Projektbewertung", text: "Projektrechte vor dem Bau: Kaufpreisspanne je Phase." },
      ]}
      cta={{
        eyebrow: "Für Verkäufer und Käufer",
        title: "Aus der Rechnung eine belastbare Bewertung machen?",
        text: "Mit Ihren Ertragsdaten, Verträgen und Wartungsprotokollen bewerten wir die Anlage konkret – und bringen sie auf Wunsch vertraulich in die Projektbörse.",
        primary: { label: "Anlage bewerten lassen", href: "/bestandsanlagen#anfrage" },
        secondary: { label: "Bestand in der Börse", href: "/projektboerse?phase=cod" },
      }}
    />
  );
}
