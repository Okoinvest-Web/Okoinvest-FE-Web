// Bewertung – acht Werttreiber und Beispielvergleich (gleiche Anlage, anderes Baujahr) als Spannen-Grafik + Tabelle
import Link from "next/link";
import { Activity, ArrowRight, CalendarClock, Camera, FileCheck2, LineChart, ScrollText, TrendingDown, Wrench } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Aufbau, { aufbau } from "@/components/Flaeche/Seite/Aufbau";
import { fmt, fmtMio } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";

/** Wert je kWp der Beispiele auf einer Skala, übliche Spanne als Band */
function SpannenGrafik({ beispiele, band }) {
  const werte = beispiele.map((b) => b.r.wertProKwp);
  const lo = Math.min(0, ...werte);
  const hi = Math.max(band.max, ...werte) * 1.22;
  const pos = (v) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="mt-8">
      <div className="relative ml-[4.5rem] h-6 sm:ml-24">
        <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11.5px] font-semibold text-ov-700" style={{ left: `calc((${pos(band.min)} + ${pos(band.max)}) / 2)` }}>
          übliche Spanne {fmt(band.min)}–{fmt(band.max)} €/kWp
        </span>
      </div>
      <Aufbau as="ul" schritt={140} className="space-y-3">
        {beispiele.map(({ jahr, ct, r }, i) => (
          <li key={jahr} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-0 sm:grid-cols-[6rem_minmax(0,1fr)]">
            <span className="text-[13px] leading-tight text-ink-600">
              <strong className="block font-display text-[15px] text-ink-900">IBN {jahr}</strong>
              {fmt(ct, 1)} ct
            </span>
            <span className="relative block h-9 rounded-xl bg-sand-50 ring-1 ring-inset ring-ink-100">
              <span aria-hidden="true" className="absolute inset-y-0 bg-ov-100/80" style={{ left: pos(band.min), width: `calc(${pos(band.max)} - ${pos(band.min)})` }} />
              <span aria-hidden="true" className={`absolute inset-y-1.5 left-1.5 rounded-lg ${aufbau.wachsen} ${r.einordnung === "ueber" ? "bg-ov-600" : r.einordnung === "unter" ? "bg-navy-400" : "bg-ov-400"}`} style={{ width: `calc(${pos(r.wertProKwp)} - 0.375rem)`, "--i": i }} />
              <span className={`ov-num absolute inset-y-0 flex items-center whitespace-nowrap pl-2 text-[13px] font-bold text-ink-900 ${aufbau.ein}`} style={{ left: pos(r.wertProKwp), "--i": i, "--ein-start": "550ms" }}>
                {fmt(r.wertProKwp)} €
              </span>
            </span>
          </li>
        ))}
      </Aufbau>
    </div>
  );
}

export default function Bewertung({ beispiele, band, bestand, merchantCt, stand }) {
  const treiber = [
    { icon: CalendarClock, title: "Restlaufzeit der Förderung", text: "In Deutschland 20 Jahre plus Rest des Inbetriebnahmejahres. Hohe Alttarife tragen oft den Großteil des Werts – bis zum letzten Förderjahr." },
    { icon: Activity, title: "Ertragshistorie vs. Prognose", text: "Gemessene Jahre gegen Einstrahlung und Gutachten. Minderertrag hat Ursachen – behebbar oder dauerhaft." },
    { icon: TrendingDown, title: "Degradation", text: `Ältere Module verlieren meist rund ${fmt(bestand.degradation * 100, 1)} % pro Jahr, einzelne Modultypen deutlich mehr – Kennlinienmessungen zeigen es.` },
    { icon: Wrench, title: "Wechsel­richter­tausch", text: `Nach ${bestand.wechselrichterJahre.min}–${bestand.wechselrichterJahre.max} Jahren meist fällig, grob ${fmt(bestand.wechselrichterProKwp.min)}–${fmt(bestand.wechselrichterProKwp.max)} €/kWp. Steht er bevor, mindert er den Kaufpreis.` },
    { icon: ScrollText, title: "Pacht- und Dachvertrag", text: "Endet der Vertrag vor der technischen Nutzungsdauer, endet auch der Cashflow. Eine gesicherte Verlängerung hebt den Wert." },
    { icon: Camera, title: "Technische Due Diligence", text: "Begehung, Thermografie per Drohne, Kennlinien, Isolationsmessung, Zustand von Unterkonstruktion, Kabeln und Station." },
    { icon: FileCheck2, title: "Anlagenzertifikat & Netz", text: "Anlagen- bzw. Einheitenzertifikat, Netzanschlussvertrag, Konformitätsnachweise, Registrierung im Marktstammdatenregister." },
    { icon: LineChart, title: "Marktpreis nach Förderende", text: `Danach zählt der Solar-Marktwert – wir rechnen vorsichtig mit ${fmt(merchantCt, 1)} ct/kWh. Ein PPA kann das Risiko begrenzen.` },
  ];

  return (
    <section data-abschnitt="bewertung" aria-labelledby="bewertung-titel" className="bg-sand-50 py-20 md:py-28">
      <div className="ov-container">
        <SectionHeading
          eyebrow="Bewertung"
          title={<span id="bewertung-titel">Was den Wert einer laufenden Anlage bestimmt.</span>}
          lead="Grundlage ist der Ertragswert (DCF): alle künftigen Einnahmen und Ausgaben, Jahr für Jahr, abgezinst mit der Renditeerwartung des Käufers. Diese acht Punkte bewegen ihn am stärksten."
        />

        <ol className="mt-10 grid gap-px overflow-hidden rounded-3xl bg-ink-200/70 ring-1 ring-ink-200/70 sm:grid-cols-2 md:mt-12 lg:grid-cols-4">
          {treiber.map((t, i) => (
            <Reveal as="li" key={t.title} delay={(i % 4) * 60} className="flex flex-col bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
                  <t.icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <span aria-hidden="true" className="ov-num font-display text-[13px] font-bold text-ink-300">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-[17px] font-bold leading-snug text-ink-900">{t.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{t.text}</p>
            </Reveal>
          ))}
        </ol>

        {/* Drei Beispiele */}
        <Reveal className="mt-8 overflow-hidden rounded-[1.75rem] bg-white shadow-e2 ring-1 ring-ink-200/70">
          <div>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 p-6 md:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
              <div>
              <p className="text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">Beispielrechnung</p>
              <h3 className="mt-2 font-display text-[22px] font-bold leading-tight text-ink-900">Gleiche Anlage, anderes Baujahr – anderer Wert</h3>
              <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-600">
                2 MWp Freifläche in Süddeutschland, 1.000 kWh/kWp gemessen, Pacht 6.000 €/Jahr, Wechselrichtertausch 2029, Diskontsatz {fmt(bestand.diskont.standard * 100, 1)} %, Bewertung ab {bestand.bewertungsjahr}.
              </p>
              </div>
              <div>
                <SpannenGrafik beispiele={beispiele} band={band} />
                <p className="mt-3 text-[12.5px] text-ink-500">Ertragswert je kWp · Band: übliche Spanne für Bestandsanlagen</p>
              </div>
            </div>
            <div className="border-t border-ink-100 bg-sand-50/60 p-6 md:p-8">
              <div tabIndex={0} role="region" aria-label="Beispielbewertungen" className="overflow-x-auto rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                <table className="w-full min-w-[620px] text-left text-[14px]">
                  <thead className="text-[11.5px] uppercase tracking-[0.08em] text-ink-500">
                    <tr className="border-b border-ink-200">
                      {["Inbetriebnahme", "Vergütung (Richtwert)", "Förderung bis", "Ertragswert", "je kWp", "Einordnung"].map((h) => (
                        <th key={h} scope="col" className="px-3 py-2.5 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="ov-num divide-y divide-ink-100 text-ink-700">
                    {beispiele.map(({ jahr, ct, r }) => (
                      <tr key={jahr}>
                        <th scope="row" className="px-3 py-3 font-semibold text-ink-900">{jahr}</th>
                        <td className="px-3 py-3">{fmt(ct, 1)} ct/kWh</td>
                        <td className="px-3 py-3">{r.foerderEnde}</td>
                        <td className="px-3 py-3">{fmtMio(r.wert, 2)}</td>
                        <td className="px-3 py-3 font-semibold text-ink-900">{fmt(r.wertProKwp)} €</td>
                        <td className="px-3 py-3">{r.einordnung === "ueber" ? "über der Spanne" : r.einordnung === "unter" ? "unter der Spanne" : "in der Spanne"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">
                Vergütungen sind grobe Richtwerte je Baujahr, keine Anlagendaten. Übliche Spanne für Bestandsanlagen {fmt(band.min)}–{fmt(band.max)} €/kWp. Vor Steuern und Fremdkapital. Stand {stand}.
              </p>
              <Link href={pfad("/rechner/bestandsanlage")} className="group mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14.5px] font-semibold text-ov-700 shadow-e1 ring-1 ring-ov-200 transition-colors hover:bg-ov-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                Mit eigenen Werten rechnen <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
