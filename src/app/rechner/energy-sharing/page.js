// src/app/rechner/energy-sharing/page.js – Energy Sharing / Energiegemeinschaft DE, AT, CH

import Link from "next/link";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import EnergySharingRechner from "@/components/Rechner/EnergySharingRechner";
import { GEMEINSCHAFTEN } from "@/lib/invest/markt";
import { MIXE, SPEICHER_PLUS } from "@/lib/rechner/energySharing";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/rechner/energy-sharing";
const R = GEMEINSCHAFTEN.rechner;

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Energy-Sharing-Rechner DE, AT, CH | ÖkoInvest",
  description:
    "Energy Sharing rechnen: geteilter Strom, Netzentgelt-Abschlag (EEG lokal/regional, LEG), Vorteil je Teilnehmer und Erlös des Erzeugers – DE, AT, CH.",
  keywords: ["Energy Sharing Rechner", "§ 42c EnWG Rechner", "LEG Schweiz Rechner", "Strom teilen Nachbarschaft", "Energy Sharing Deutschland"],
});

const at = R.at.rabatte;
const ch = R.ch.rabatte;

const FAQ = [
  {
    q: "Was ist Energy Sharing?",
    a: "Beim Energy Sharing nutzen mehrere Haushalte, Betriebe oder Gemeinden gemeinsam den Strom einer Anlage in ihrer Nähe – über das öffentliche Netz. Gezählt wird jede Viertelstunde: Was die Anlage in dieser Zeit erzeugt und die Teilnehmenden gleichzeitig verbrauchen, ist geteilter Strom. Den Rest liefert wie bisher der eigene Stromlieferant.",
  },
  {
    q: "Wo lohnt sich eine Energiegemeinschaft am meisten?",
    a: `Nach aktuellem Stand in Österreich: Lokale Erneuerbare-Energie-Gemeinschaften erhalten ${fmt(at[0].anteil * 100)} % Abschlag auf den Arbeitspreis des Netznutzungsentgelts, regionale ${fmt(at[1].anteil * 100)} %; dazu entfallen Abgaben auf den geteilten Strom. In der Schweiz gibt es in der lokalen Elektrizitätsgemeinschaft (LEG) ${fmt(ch[0].anteil * 100)} % bzw. ${fmt(ch[1].anteil * 100)} % Abschlag auf die Netznutzung. In Deutschland entsteht der Vorteil beim Energy Sharing nach § 42c EnWG bisher nur über den Preis zwischen Erzeuger und Teilnehmenden.`,
  },
  {
    q: "Wie viel Strom kann eine Gemeinschaft wirklich teilen?",
    a: `Nur so viel, wie zeitgleich verbraucht wird. Haushalte verbrauchen viel abends, Betriebe tagsüber. Wir rechnen deshalb mit einer Gleichzeitigkeitsgrenze: ${MIXE.map((m) => `${m.label} rund ${fmt(m.a * 100)} %`).join(", ")} des Verbrauchs können höchstens aus PV gedeckt werden, mit Speicher etwa ${fmt(SPEICHER_PLUS * 100)} Prozentpunkte mehr. Große Anlagen erzeugen darüber hinaus vor allem Überschuss.`,
  },
  {
    q: "Kann Strom aus einem Solarpark geteilt werden?",
    a: "Grundsätzlich ja, wenn Park und Teilnehmende im zulässigen Gebiet liegen: in Österreich im Nahebereich des Netzes (lokal Niederspannung, regional Mittelspannung), in der Schweiz innerhalb der Gemeinde und in Deutschland im Netzgebiet des Verteilnetzbetreibers. Oft wird dazu ein Anteil des Parks einer Genossenschaft oder der Gemeinschaft zugeordnet.",
  },
  {
    q: "Was kostet die Abrechnung?",
    a: `Jede Gemeinschaft braucht Messdaten je Viertelstunde, eine Verteilung der Mengen und eine Abrechnung. Dafür rechnen wir je Teilnehmer und Jahr mit etwa ${fmt(R.de.verwaltung)} € (DE), ${fmt(R.at.verwaltung)} € (AT) und ${fmt(R.ch.verwaltung)} CHF (CH). Bei geringen geteilten Mengen können diese Kosten den Vorteil aufzehren.`,
  },
  {
    q: "Was ändert sich in Österreich mit dem ElWG?",
    a: "Mit dem Elektrizitätswirtschaftsgesetz werden die Regeln für Energiegemeinschaften ab Oktober 2026 neu geordnet; unter anderem kommt das direkte Teilen zwischen Einzelnen hinzu. Bestehende Gemeinschaften laufen weiter. Einzelne Details waren zuletzt noch offen – wir halten die Werte im Rechner aktuell.",
  },
];

export default function Page() {
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="energy-sharing"
      breadcrumb="Energy-Sharing-Rechner"
      eyebrow="Für Bürger, Gemeinden und Betriebe · DACH"
      title={
        <>
          Strom teilen in der Nachbarschaft – <span className="ov-text-gradient-light">was bringt es wirklich?</span>
        </>
      }
      lead="Land wählen, Anlage und Teilnehmende eingeben: Sie sehen, wie viel Strom geteilt werden kann, welchen Netzentgeltvorteil es gibt und was Teilnehmende und Erzeuger davon haben."
      chips={["Deutschland, Österreich, Schweiz", "Gleichzeitigkeit berücksichtigt", "Netzentgelt-Abschlag", "Erzeuger und Teilnehmende"]}
      app={{
        name: "Energy-Sharing-Rechner DACH",
        description: "Schätzt geteilten Strom, Netzentgelt-Abschläge, Preisvorteile je Teilnehmer und Mehrerlöse für den Erzeuger in Energiegemeinschaften in Deutschland, Österreich und der Schweiz.",
        featureList: ["Energy Sharing § 42c EnWG", "EEG lokal/regional und BEG (AT)", "LEG (CH)", "Gleichzeitigkeit nach Teilnehmermix und Speicher", "Vorteil je Teilnehmer und Erlös des Erzeugers", "Größenkurve der Anlage"],
      }}
      rechner={<EnergySharingRechner />}
      erklaerung={
        <div className="ov-prose max-w-none">
          <h2>So rechnet der Energy-Sharing-Rechner</h2>
          <p>
            Die Anlage erzeugt je nach Region eine bestimmte Menge Strom im Jahr. Geteilt werden kann davon nur, was die Teilnehmenden <strong>in derselben Viertelstunde</strong> verbrauchen.
            Kleine Anlagen werden deshalb fast vollständig genutzt, große stoßen an eine Grenze, die vom Teilnehmermix abhängt. Wir bilden das mit einer Sättigungskurve ab – eine Näherung,
            die echte Lastgänge nicht ersetzt.
          </p>
          <p>
            Der <strong>Vorteil je geteilter Kilowattstunde</strong> setzt sich zusammen aus der Differenz zwischen dem Energiepreis Ihres Lieferanten und dem Preis in der Gemeinschaft, dem
            Abschlag auf das Netzentgelt (Österreich, Schweiz) und – in Österreich – entfallenden Abgaben. Davon ziehen wir die Kosten für Messung und Abrechnung ab. Der Erzeuger erhält den
            Gemeinschaftspreis statt der meist niedrigeren Einspeisevergütung.
          </p>
          <p>
            Die Regeln im Ländervergleich finden Sie unter <Link href="/energiegemeinschaften">Energiegemeinschaften</Link>, Hintergründe im Ratgeber{" "}
            <Link href="/ratgeber/energy-sharing-energiegemeinschaften">Energy Sharing</Link>.
          </p>
        </div>
      }
      annahmen={[
        ["DE: Netzentgeltvorteil", "keiner (§ 42c EnWG)"],
        ["AT: EEG lokal / regional", `−${fmt(at[0].anteil * 100)} % / −${fmt(at[1].anteil * 100)} % Netz-AP`],
        ["AT: Elektrizitätsabgabe 2026", `${fmt(R.at.abgabenCt, 2)} ct/kWh entfällt`],
        ["CH: LEG eine / mehrere Ebenen", `−${fmt(ch[0].anteil * 100)} % / −${fmt(ch[1].anteil * 100)} %`],
        ["Netz-AP (Standard)", `DE ${fmt(R.de.netzAp)} · AT ${fmt(R.at.netzAp)} ct · CH ${fmt(R.ch.netzAp)} Rp.`],
        ["Energiepreis Lieferant", `DE ${fmt(R.de.energiepreis)} · AT ${fmt(R.at.energiepreis)} ct · CH ${fmt(R.ch.energiepreis)} Rp.`],
        ["Gleichzeitigkeit", MIXE.map((m) => `${fmt(m.a * 100)} %`).join(" / ")],
        ["Speicher", `+${fmt(SPEICHER_PLUS * 100)} Prozentpunkte`],
      ]}
      quellen={[
        { name: "§ 42c EnWG", url: "https://www.gesetze-im-internet.de/enwg_2005/__42c.html" },
        { name: "Österreichische Koordinationsstelle Energiegemeinschaften", url: "https://energiegemeinschaften.gv.at/" },
        { name: "Stromliste.at – Regeln ab Oktober 2026", url: "https://stromliste.at/aktuelles/energiegemeinschaft-neue-regeln-oktober-2026" },
        { name: "BFE – Lokale Elektrizitätsgemeinschaften", url: "https://www.bfe.admin.ch/" },
      ]}
      faq={FAQ}
      faqTitel="Energy Sharing – gut zu wissen"
      querverweise={[
        { href: "/energiegemeinschaften", titel: "Energiegemeinschaften", text: "Die Modelle in Deutschland, Österreich und der Schweiz im Vergleich." },
        { href: "/genossenschaft", titel: "Genossenschaft", text: "Gemeinsam an Parks der Region beteiligen – Grundlage für viele Gemeinschaften." },
        { href: "/kommunen", titel: "Für Kommunen", text: "Wie Gemeinden Energiegemeinschaften anstoßen und Solarparks mitgestalten." },
      ]}
      cta={{
        eyebrow: "Energiegemeinschaften",
        title: "Eine Gemeinschaft mit Strom aus der Region gründen?",
        text: "Wir bringen Strom aus Parks im Nahebereich ein und unterstützen bei Gründung, Anmeldung beim Netzbetreiber und Organisation – in Deutschland, Österreich und der Schweiz.",
        primary: { label: "Energiegemeinschaften", href: "/energiegemeinschaften" },
        secondary: { label: "Kontakt aufnehmen", href: "/kontakt" },
      }}
    />
  );
}
