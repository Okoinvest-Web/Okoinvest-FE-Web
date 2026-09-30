// src/app/angebot/[code]/page.js – personalisierte Angebotsseite der Akquise-Kampagnen (Link/QR-Code im Serienbrief).
//
// Öffentlich, aber nur per Einmalcode erreichbar; noindex/nofollow, kein Referrer, keine Statistik (GoogleAnalytics nimmt
// /angebot aus). Zeigt ausschließlich den Flächen-Steckbrief – KEINE Eigentümerdaten (Name, Anschrift), keine
// Flurstücksnummern, keine Kampagnendaten. Daten synchron aus dem Plattform-Backend (Demo: readFileSync im Speicher).

import { headers } from "next/headers";
import { Leaf, MapPin, PlugZap, Ruler, ShieldCheck, Sun } from "lucide-react";
import Section from "@/components/ui/Section";
import PachtRechner from "@/components/Flaeche/PachtRechner";
import { AngebotAnfrage, AufrufMelden, Widerspruch } from "@/components/Angebot/AngebotAktionen";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";
import { akqLimit } from "@/lib/plattform/server/akquise2";
import { codeNormalisieren } from "@/lib/plattform/akquise-kampagne";
import { ipAdresse } from "@/lib/ipAdresse";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { fmt } from "@/lib/rechner/annahmen";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ihr Flächen-Steckbrief | ÖkoInvest",
  description: "Persönlicher Steckbrief Ihrer Fläche mit unverbindlicher Pachtspanne und Pachtrechner – nur über Ihren persönlichen Code erreichbar.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

const REGION = (land, bl) => {
  if (land === "AT") return "at";
  if (land === "CH") return "ch";
  if (["Bayern", "Baden-Württemberg"].includes(bl)) return "de-sued";
  if (["Brandenburg", "Berlin", "Sachsen", "Sachsen-Anhalt", "Thüringen"].includes(bl)) return "de-ost";
  if (["Schleswig-Holstein", "Hamburg", "Niedersachsen", "Bremen", "Mecklenburg-Vorpommern"].includes(bl)) return "de-nord";
  return "de-west";
};

/** Umriss der Fläche als SVG-Pfad (lokal projiziert, ohne Koordinaten im HTML) */
function umriss(geometrie) {
  const polys = geometrie?.type === "MultiPolygon" ? geometrie.coordinates : geometrie?.type === "Polygon" ? [geometrie.coordinates] : [];
  const pkt = polys.flatMap((p) => p[0] || []);
  if (!pkt.length) return null;
  const lat0 = pkt.reduce((s, q) => s + q[1], 0) / pkt.length;
  const kx = Math.cos((lat0 * Math.PI) / 180);
  const xy = (q) => [q[0] * kx, -q[1]];
  const alle = pkt.map(xy);
  const [minX, minY] = [Math.min(...alle.map((a) => a[0])), Math.min(...alle.map((a) => a[1]))];
  const [maxX, maxY] = [Math.max(...alle.map((a) => a[0])), Math.max(...alle.map((a) => a[1]))];
  const s = 280 / Math.max(maxX - minX, maxY - minY || 1e-9);
  const ox = (300 - (maxX - minX) * s) / 2;
  const oy = (300 - (maxY - minY) * s) / 2;
  return polys.map((p) => (p[0] || []).map((q, i) => { const [x, y] = xy(q); return `${i ? "L" : "M"}${(ox + (x - minX) * s).toFixed(1)} ${(oy + (y - minY) * s).toFixed(1)}`; }).join(" ") + " Z").join(" ");
}

function Hinweisseite({ titel, text }) {
  return (
    <Section tone="sand" space="lg">
      <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center ring-1 ring-ink-200/70">
        <h1 className="font-display text-[26px] font-extrabold text-ink-900">{titel}</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">{text}</p>
        <a href="/flaeche-verpachten" className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white hover:bg-ov-700">Mehr zur Flächenverpachtung</a>
      </div>
    </Section>
  );
}

export default async function AngebotSeite({ params }) {
  const { code: roh } = await params;
  const code = codeNormalisieren(decodeURIComponent(roh || ""));
  try {
    akqLimit("angebotLesen", ipAdresse({ headers: await headers() }));
  } catch (e) {
    if (e instanceof PlattformFehler) return <Hinweisseite titel="Zu viele Aufrufe" text="Bitte versuchen Sie es in einigen Minuten erneut." />;
    throw e;
  }
  const a = code ? await akquise2Backend().angebotFuerCode(code) : null;
  if (!a) return <Hinweisseite titel="Code nicht gefunden" text="Dieser persönliche Code ist nicht (mehr) gültig. Bitte prüfen Sie die Eingabe – der Code steht in unserem Schreiben rechts oben." />;
  if (a.gesperrt) return <Hinweisseite titel="Kein weiteres Anschreiben" text="Zu diesem Code liegt ein Widerspruch vor. Wir schreiben Sie nicht mehr an; Ihre Daten sind für weitere Kontaktaufnahmen gesperrt." />;

  const pfad = umriss(a.geometrie);
  const pachtMittel = Math.round((a.pacht.proHaMin + a.pacht.proHaMax) / 2 / 100) * 100;
  const kulisse = a.land === "DE" && a.kulisse
    ? [a.kulisse.privilegiert && "im privilegierten 200-m-Streifen an Autobahn bzw. zweigleisiger Bahn (§ 35 BauGB)", a.kulisse.randstreifen && "im EEG-Randstreifen (500 m) an Autobahn oder Schiene", a.kulisse.benachteiligt && "im benachteiligten Gebiet (EEG-Förderkulisse)", a.kulisse.moor && "auf Moorboden (Moor-PV mit Wiedervernässung)"].filter(Boolean)
    : [];
  const zeilen = [
    { icon: MapPin, label: "Lage", wert: `${a.gemeinde}${a.bundesland ? `, ${a.bundesland}` : ""}` },
    { icon: Ruler, label: "Fläche (Bereich)", wert: `rund ${fmt(a.ha, 1)} ha · ${a.flurstueckeAnzahl} Flurstück${a.flurstueckeAnzahl === 1 ? "" : "e"}` },
    { icon: Sun, label: "Mögliche Leistung", wert: `etwa ${fmt(a.mwp, 1)} MWp` },
    { icon: Leaf, label: "Pacht (unverbindlich)", wert: `${fmt(a.pacht.proHaMin)}–${fmt(a.pacht.proHaMax)} € je ha und Jahr · rund ${fmt(a.pacht.jahrMin)}–${fmt(a.pacht.jahrMax)} € pro Jahr` },
    a.netzKm != null && { icon: PlugZap, label: "Netzanschluss", wert: `geschätzt ca. ${fmt(a.netzKm, 1)} km Kabeltrasse zum nächsten geeigneten Netzknoten` },
  ].filter(Boolean);

  return (
    <>
      <AufrufMelden code={code} />
      <Section tone="navy" space="md" className="ov-noise">
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-ov-300">Ihr persönlicher Flächen-Steckbrief{a.demo ? " · DEMO" : ""}</p>
        <h1 className="mt-3 max-w-3xl font-display text-[32px] font-extrabold leading-tight tracking-tight text-white md:text-[46px]">Ihre Fläche in {a.gemeinde}</h1>
        <p className="ov-lead mt-4 max-w-2xl text-white/80">
          Nach unserer ersten Einschätzung eignet sich der Bereich mit rund {fmt(a.ha, 1)} ha für einen Solarpark mit etwa {fmt(a.mwp, 1)} MWp. Hier sehen Sie unverbindlich, was die Fläche bringen kann – und können die Pacht selbst durchrechnen.
        </p>
      </Section>

      <Section tone="sand" space="md">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink-200/70">
            {pfad ? (
              <svg viewBox="0 0 300 300" role="img" aria-label="Umriss des Flächenbereichs (schematisch, ohne Maßstab)" className="mx-auto h-auto w-full max-w-[320px]">
                <rect x="0" y="0" width="300" height="300" rx="24" fill="#f3f6ef" />
                <path d={pfad} fill="#8cba58" fillOpacity="0.55" stroke="#436621" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            ) : null}
            <p className="mt-3 text-center text-[12.5px] text-ink-500">Umriss schematisch, ohne Maßstab und ohne Hintergrundkarte.</p>
          </div>
          <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink-200/70 md:p-8">
            <h2 className="font-display text-[22px] font-bold text-ink-900">Steckbrief</h2>
            <dl className="mt-4 space-y-3.5">
              {zeilen.map((z) => (
                <div key={z.label} className="flex gap-3">
                  <z.icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
                  <div className="min-w-0"><dt className="text-[12.5px] font-medium text-ink-500">{z.label}</dt><dd className="text-[15px] text-ink-900">{z.wert}</dd></div>
                </div>
              ))}
            </dl>
            {kulisse.length > 0 && <p className="mt-5 rounded-2xl bg-ov-50 px-4 py-3 text-[14px] text-ov-900 ring-1 ring-ov-200">Pluspunkt: Die Fläche liegt {kulisse.join(" und ")}.</p>}
            <p className="mt-5 text-[13px] leading-relaxed text-ink-500">Alle Werte sind Schätzungen aus öffentlichen Geodaten. Maßgeblich sind Netzanschluss-Auskunft, Baurecht (Gemeinde) und Naturschutz – das prüfen wir für Sie kostenfrei. Möglich sind langfristige Pacht (in der Regel 25 bis 30 Jahre) oder Agri-PV, bei der die Bewirtschaftung weiterläuft.</p>
          </div>
        </div>
      </Section>

      <Section tone="white" space="md">
        <h2 className="ov-h2 font-display text-ink-900">Pacht selbst durchrechnen</h2>
        <p className="ov-lead mt-2 max-w-2xl text-ink-600">Vorbelegt mit Ihrer Fläche und der Mitte der Spanne. Passen Sie Modell, Laufzeit und Vergleich mit der Ackerpacht an.</p>
        <div className="mt-6"><PachtRechner start={{ ha: a.ha, regionId: REGION(a.land, a.bundesland), proHa: pachtMittel }} /></div>
      </Section>

      <Section tone="sand" space="md" id="kontakt">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink-200/70 md:p-8">
            <h2 className="font-display text-[22px] font-bold text-ink-900">Interesse? Unverbindlich Kontakt aufnehmen</h2>
            <p className="mt-2 text-[14.5px] text-ink-600">Wir melden uns mit einem Termin für ein Gespräch oder eine Begehung. Alternativ antworten Sie formlos per Brief.</p>
            <div className="mt-5"><AngebotAnfrage code={code} bereitsGestellt={a.anfrageGestellt} /></div>
          </div>
          <div className="space-y-4">
            <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink-200/70">
              <h2 className="flex items-center gap-2 font-display text-[18px] font-bold text-ink-900"><ShieldCheck className="h-5 w-5 text-ov-600" aria-hidden="true" /> Kein Interesse?</h2>
              <p className="mt-2 text-[14px] text-ink-600">Dann müssen Sie nichts tun. Möchten Sie keine Schreiben mehr von uns erhalten, genügt ein Klick – wir vermerken den Widerspruch dauerhaft.</p>
              <div className="mt-4"><Widerspruch code={code} /></div>
            </div>
            <p className="px-2 text-[12.5px] leading-relaxed text-ink-500">Diese Seite ist nur über Ihren persönlichen Code erreichbar, wird nicht von Suchmaschinen erfasst und enthält keine Angaben zu Ihrer Person. Informationen zum Datenschutz: <a href="/datenschutz" className="font-semibold text-ov-700 underline">Datenschutzerklärung</a>.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
