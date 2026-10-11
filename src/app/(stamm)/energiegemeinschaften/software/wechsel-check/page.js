// /energiegemeinschaften/software/wechsel-check – Wechsel-Check für bestehende Energiegemeinschaften in
// Österreich (Welle 3, Paket B7; Masterplan Abschnitt 5 „ElWG-Wechsel-Check“).
//
// Nur Österreich (TOOLS: laender ["AT"]): /at und die gemeinsame Seite zeigen den Check, /de und /ch den
// eigenen Länderhinweis (keine EG-Software für DE und CH). Logik: src/lib/eg-angebot/wechselCheck.js,
// Rechts- und Prozessaussagen aus dem Faktenregister (src/lib/fakten/daten/eg-at.js) mit Quelle und Stand.
// Lead: Wechselplan anfordern (POST /api/anfrage, typ energiegemeinschaft, Land AT).
// noindex bis zur Fachprüfung (Register src/lib/land/seiten.js index: false, englisch src/lib/sprache/seiten.js).

import Link from "@/components/Land/Link";
import { ArrowRight } from "lucide-react";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import WechselCheck from "@/components/Portal/EG/Angebot/WechselCheck";
import { FaktKasten } from "@/components/Portal/EG/Angebot/Teile";
import { egFakten } from "@/lib/eg-angebot/fakten";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";

const SCHLUESSEL = "/energiegemeinschaften/software/wechsel-check";
const PFAD = seitenPfad(SCHLUESSEL);

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Wechsel-Check Energiegemeinschaft Österreich | ÖkoInvest",
  description:
    "Software-Anbieter der Energiegemeinschaft wechseln? Sieben Fragen zeigen, ob sich der Wechsel lohnt und was vorher zu klären ist. Jetzt Check starten.",
  keywords: ["Energiegemeinschaft Anbieter wechseln", "EEG Software wechseln", "Energiegemeinschaft ElWG Wechsel", "Marktpartner-ID Energiegemeinschaft", "Energiegemeinschaft Betriebsführung"],
});
// Fachprüfung offen (Register index: false): auch die gemeinsame Seite trägt noindex
metadata.robots = { index: false, follow: true };

const metadataEn = rechnerMetadataEn({
  title: "Energy community switch check for Austria | ÖkoInvest",
  description:
    "Switch your energy community’s software provider? Seven questions show whether switching pays off and what to clarify first. Start the check now.",
  keywords: ["switch energy community provider Austria", "EEG software switch", "ElWG energy community", "market partner ID energy community", "energy community operational management"],
});

const LAND_HINWEISE = {
  DE: {
    de: "Den Wechsel-Check gibt es nur für Österreich: Er beruht auf dem österreichischen ElWG und dem Datenaustausch über EDA. Für Deutschland bieten wir keine Software für Energiegemeinschaften an.",
    en: "The switch check is available for Austria only: it is based on Austria’s ElWG and data exchange via EDA. We do not offer software for energy communities in Germany.",
  },
  CH: {
    de: "Den Wechsel-Check gibt es nur für Österreich. Für die Schweiz bieten wir keine Software für Energiegemeinschaften an – was für LEG und vZEV gilt, steht auf unserer Seite zu Energiegemeinschaften.",
    en: "The switch check is available for Austria only. We do not offer software for energy communities in Switzerland – what applies to LEGs and vZEVs is explained on our energy communities page.",
  },
};

const FAQ = [
  { q: "Müssen beim Anbieterwechsel alle Zählpunkte neu angemeldet werden?", a: "Nein, wenn nur der Software- oder Betriebsanbieter wechselt. Die Marktpartner-ID gehört der Gemeinschaft; der neue Anbieter erhält einen Zugang bzw. eine Bevollmächtigung, die Zustimmungen der Mitglieder bleiben bestehen. Anders ist es, wenn sich das Modell ändert, etwa von lokal auf regional – dann braucht es eine Neuanmeldung, egal bei welchem Anbieter." },
  { q: "Können wir jetzt Mitglieder aus anderen Netzgebieten aufnehmen?", a: (f) => `Laut Koordinationsstelle für Energiegemeinschaften (Stand ${f.stand}): ${f.text} Das gilt für alle Anbieter. Der Check weist darauf hin, wenn Sie das vorhaben.` },
  { q: "Wann ist der beste Zeitpunkt für einen Wechsel?", a: "Am Ende einer Abrechnungsperiode und – bei fester Laufzeit – zum Vertragsende. Vorher rechnen wir einen Monat parallel und vergleichen mit den Werten des Netzbetreibers. Die Anpassung der Verträge an das ElWG lässt sich gut mit dem Wechsel verbinden." },
  { q: "Was passiert mit meinen Antworten?", a: "Die Auswertung läuft in Ihrem Browser. Nur wenn Sie einen Wechselplan anfordern, gehen Ihre Antworten und das Ergebnis zusammen mit Ihren Kontaktdaten an uns – damit Sie nichts doppelt eingeben müssen." },
];

const FAQ_EN = [
  { q: "Do all metering points have to be re-registered when switching provider?", a: "No, if only the software or operations provider changes. The market partner ID belongs to the community; the new provider receives access or a power of attorney, and the members’ consents remain in place. It is different if the model changes, for example from local to regional – then re-registration is needed, whichever provider you use." },
  { q: "Can we admit members from other grid areas now?", a: (f) => `According to the Coordination Office for Energy Communities (as of ${f.stand}): ${f.text} This applies to all providers. The check points this out if you are planning it.` },
  { q: "When is the best time to switch?", a: "At the end of a billing period and – with a fixed term – at the end of the contract. Beforehand, we calculate in parallel for one month and compare with the grid operator’s values. Adapting the contracts to the ElWG can easily be combined with the switch." },
  { q: "What happens to my answers?", a: "The evaluation runs in your browser. Only if you request a switching plan are your answers and the result sent to us together with your contact details – so you do not have to enter anything twice." },
];

/** FAQ mit Antworten aus dem Faktenregister (Funktion → Text) */
const faqMit = (liste, fakt) => liste.map((x) => (typeof x.a === "function" ? { ...x, a: x.a(fakt) } : x));

export default async function Page({ params }) {
  const land = await seitenLand(params);
  const en = spracheDerAnfrage() === "en";
  const fakten = egFakten({ sprache: en ? "en" : "de" });
  // Österreich-Inhalte nur auf /at und der gemeinsamen Seite (dort als „Österreich“ gekennzeichnet); DE/CH: Länderhinweis
  const nurAt = !land || land === "AT";
  const netzgebiet = fakten.netzgebiet?.abgelaufen ? (en ? "outdated, being reviewed" : "Stand abgelaufen, wird geprüft") : en ? "probably from April 2027" : "voraussichtlich ab April 2027";
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="eg-wechsel-check"
      breadcrumb={en ? "Switch check" : "Wechsel-Check"}
      eyebrow={en ? "For existing energy communities · Austria" : "Für bestehende Energiegemeinschaften · Österreich"}
      title={
        en ? (
          <>
            Switch provider: <span className="ov-text-gradient-light">worthwhile and possible?</span>
          </>
        ) : (
          <>
            Anbieter wechseln: <span className="ov-text-gradient-light">sinnvoll und möglich?</span>
          </>
        )
      }
      lead={
        en
          ? "Seven questions for boards of existing communities. The result says honestly whether a switch pays off, what to clarify first – and what applies to every provider under the ElWG."
          : "Sieben Fragen für Vorstände bestehender Gemeinschaften. Das Ergebnis sagt ehrlich, ob sich ein Wechsel lohnt, was vorher zu klären ist – und was nach ElWG für jeden Anbieter gilt."
      }
      chips={en ? ["EEG, BEG and GEA", "With sources", "No registration"] : ["EEG, BEG und GEA", "Mit Quellen", "Ohne Anmeldung"]}
      app={
        en
          ? { name: "Energy community switch check", description: "Whether switching the software or operations provider of an energy community in Austria is worthwhile and possible.", featureList: ["Assessment: worthwhile and possible", "What to clarify before switching", "ElWG notes with sources"] }
          : { name: "Wechsel-Check Energiegemeinschaft", description: "Ob sich der Wechsel des Software- oder Betriebsanbieters einer Energiegemeinschaft in Österreich lohnt und möglich ist.", featureList: ["Einschätzung: sinnvoll und möglich", "Was vor dem Wechsel zu klären ist", "ElWG-Hinweise mit Quellen"] }
      }
      landHinweise={LAND_HINWEISE}
      rechner={<WechselCheck fakten={fakten} />}
      erklaerung={
        !nurAt ? (
          <div>
            <h2 className="ov-h2 text-ink-900">{en ? "Energy communities in your country" : "Energiegemeinschaften in Ihrem Land"}</h2>
            <p className="mt-4 text-[16.5px] leading-relaxed text-ink-600">
              {land === "CH"
                ? en
                  ? "In Switzerland, local electricity communities (LEG) and self-consumption groupings (vZEV) apply. What that means and what we contribute is explained on our energy communities page."
                  : "In der Schweiz gelten lokale Elektrizitätsgemeinschaften (LEG) und virtuelle Zusammenschlüsse zum Eigenverbrauch (vZEV). Was das bedeutet und was wir beitragen, steht auf unserer Seite zu Energiegemeinschaften."
                : en
                  ? "In Germany, energy sharing follows its own rules. What that means and what we contribute is explained on our energy communities page."
                  : "In Deutschland gelten für Energy Sharing eigene Regeln. Was das bedeutet und was wir beitragen, steht auf unserer Seite zu Energiegemeinschaften."}
            </p>
            <Link href="/energiegemeinschaften" className="group mt-6 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ov-700 underline-offset-4 hover:text-ov-800 hover:underline">
              {en ? "To energy communities" : "Zu den Energiegemeinschaften"}
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        ) : (
        <div>
          <h2 className="ov-h2 text-ink-900">{en ? "How the check works" : "So prüfen wir"}</h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-ink-600">
            {en
              ? "We answer two questions separately. Worthwhile: only your answers about what is not working count – if everything works, the result is “probably not”. Possible: what needs to be clarified before a switch (contract, access to the EDA portal, model). The notes below apply to every provider, not only to us."
              : "Wir beantworten zwei Fragen getrennt. Sinnvoll: Es zählen nur Ihre Angaben zu dem, was nicht gut läuft – läuft alles, heißt das Ergebnis „eher nicht“. Möglich: Was vor einem Wechsel zu klären ist (Vertrag, Zugang zum EDA-Portal, Modell). Die Hinweise unten gelten für jeden Anbieter, nicht nur für uns."}
          </p>
          <div className="mt-8 grid gap-3">
            <FaktKasten fakt={fakten.netzgebiet} titel={en ? "Grid operator restriction" : "Netzbetreiber-Einschränkung"} en={en} className="bg-white" />
            <FaktKasten fakt={fakten.ohneNeuanmeldung} titel={en ? "Switching provider without re-registration" : "Anbieterwechsel ohne Neuanmeldung"} en={en} className="bg-white" />
            <FaktKasten fakt={fakten.modellwechsel} titel={en ? "Changing the model means re-registration" : "Modellwechsel heißt Neuanmeldung"} en={en} className="bg-white" />
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link href="/energiegemeinschaften/software/preise" className="ov-lift group flex flex-col rounded-2xl bg-navy-950 p-5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-300">{en ? "What does it cost?" : "Was kostet es?"}</span>
              <span className="mt-1.5 inline-flex items-center gap-1.5 font-display text-[16.5px] font-bold">
                {en ? "Price sheet" : "Zum Preisblatt"}
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </span>
            </Link>
            <Link href="/energiegemeinschaften/software" className="ov-lift group flex flex-col rounded-2xl bg-white p-5 ring-1 ring-ink-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">{en ? "For boards and municipalities" : "Für Vorstände und Gemeinden"}</span>
              <span className="mt-1.5 inline-flex items-center gap-1.5 font-display text-[16.5px] font-bold text-ink-900">
                {en ? "Platform and operational management" : "Plattform und Betriebsführung"}
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </span>
            </Link>
          </div>
        </div>
        )
      }
      annahmen={
        en
          ? [
              ["Assessment", "rule-based, from your answers"],
              ["Prices and fees", "not part of the check"],
              ["Switching provider", "without re-registration"],
              ["Model change", "re-registration of all metering points"],
              ["Across grid operators", netzgebiet],
              ["Parallel run before cut-over", "one month"],
            ]
          : [
              ["Einschätzung", "regelbasiert, aus Ihren Angaben"],
              ["Preise und Gebühren", "nicht Teil des Checks"],
              ["Anbieterwechsel", "ohne Neuanmeldung"],
              ["Modellwechsel", "Neuanmeldung aller Zählpunkte"],
              ["Netzbetreiberübergreifend", netzgebiet],
              ["Parallellauf vor dem Stichtag", "ein Monat"],
            ]
      }
      quellen={[
        { name: en ? "Coordination Office for Energy Communities – FAQs on the ElWG" : "Koordinationsstelle für Energiegemeinschaften – FAQs zum ElWG", url: "https://energiegemeinschaften.gv.at/faqs-zum-elwg/" },
        { name: en ? "EDA – energy community handbook (HA II)" : "EDA – Handbuch Energiegemeinschaften (HA II)" },
      ]}
      faq={nurAt ? faqMit(en ? FAQ_EN : FAQ, fakten.netzgebiet) : []}
      querverweise={
        !nurAt
          ? en
            ? [
                { href: seitenPfad("/energiegemeinschaften"), titel: "Energy communities", text: "Models in DE, AT and CH compared." },
                { href: seitenPfad("/rechner/energy-sharing"), titel: "Energy sharing calculator", text: "Calculate the benefit per participant in DE, AT and CH." },
              ]
            : [
                { href: seitenPfad("/energiegemeinschaften"), titel: "Energiegemeinschaften", text: "Modelle in DE, AT und CH im Vergleich." },
                { href: seitenPfad("/rechner/energy-sharing"), titel: "Energy-Sharing-Rechner", text: "Vorteil je Teilnehmer in DE, AT und CH berechnen." },
              ]
          : en
          ? [
              { href: seitenPfad("/energiegemeinschaften/software"), titel: "Platform & operation", text: "Software, operational management and founding for communities." },
              { href: seitenPfad("/energiegemeinschaften/software/preise"), titel: "Price sheet", text: "Set-up, base fee and amount per metering point." },
              { href: seitenPfad("/energiegemeinschaften/rechner"), titel: "Energy community calculator", text: "Savings from energy price, grid fee and levy." },
            ]
          : [
              { href: seitenPfad("/energiegemeinschaften/software"), titel: "Plattform & Betrieb", text: "Software, Betriebsführung und Gründung für Gemeinschaften." },
              { href: seitenPfad("/energiegemeinschaften/software/preise"), titel: "Preisblatt", text: "Einrichtung, Grundgebühr und Betrag je Zählpunkt." },
              { href: seitenPfad("/energiegemeinschaften/rechner"), titel: "Energiegemeinschaft-Rechner", text: "Ersparnis aus Energiepreis, Netzentgelt und Abgabe." },
            ]
      }
      cta={
        !nurAt
          ? en
            ? { eyebrow: "Together instead of alone", title: "Power from the region for your community.", text: "We check which installation is in the proximity area and which model fits in your country.", primary: { label: "To energy communities", href: seitenPfad("/energiegemeinschaften") }, secondary: { label: "Contact", href: seitenPfad("/kontakt") } }
            : { eyebrow: "Gemeinsam statt allein", title: "Strom aus der Region für Ihre Gemeinschaft.", text: "Wir prüfen, welche Anlage im Nahebereich liegt und welches Modell in Ihrem Land passt.", primary: { label: "Zu den Energiegemeinschaften", href: seitenPfad("/energiegemeinschaften") }, secondary: { label: "Kontakt", href: seitenPfad("/kontakt") } }
          : en
          ? { eyebrow: "Switching", title: "Switch with a plan and a parallel run.", text: "Cut-over date, parallel run and an offer for your community – we plan the switch with you.", primary: { label: "Request switching plan", href: "#rechner" }, secondary: { label: "Platform & operation", href: seitenPfad("/energiegemeinschaften/software") } }
          : { eyebrow: "Wechsel", title: "Wechseln mit Plan und Parallellauf.", text: "Stichtag, Parallellauf und Angebot für Ihre Gemeinschaft – wir planen den Wechsel mit Ihnen.", primary: { label: "Wechselplan anfordern", href: "#rechner" }, secondary: { label: "Plattform & Betrieb", href: seitenPfad("/energiegemeinschaften/software") } }
      }
    />
  );
}

export const generateMetadata = seitenMetadata(SCHLUESSEL, metadata, { en: metadataEn });
