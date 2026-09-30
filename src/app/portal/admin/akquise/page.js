import Link from "next/link";
import { AlarmClock, Gauge, LandPlot, Landmark, MapPinned, Megaphone, Search, Star, UserX } from "lucide-react";
import { Karte, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import { auswahlfeld, eingabe } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { AkquiseTabelle, GebieteEditor } from "@/components/Portal/Backoffice/Akquise";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { LAENDER } from "@/lib/plattform/konstanten";
import { PROZESSE } from "@/lib/plattform/prozesse";
import { darfLesen, darfSchreiben } from "@/lib/plattform/rechte"; // darfLesen: Akquise-Karte (Geodaten)
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Akquise & Gebiete" };

export default async function AdminAkquise({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const filter = {
    land: LAENDER[sp?.land] ? sp.land : "",
    prioritaet: ["A", "B", "C"].includes(sp?.prioritaet) ? sp.prioritaet : "",
    sla: ["gruen", "gelb", "rot"].includes(sp?.sla) ? sp.sla : "",
    zustaendigId: typeof sp?.zustaendig === "string" ? sp.zustaendig.slice(0, 40) : "",
    status: PROZESSE.flaeche.status[sp?.status] ? sp.status : "",
    q: typeof sp?.q === "string" ? sp.q.slice(0, 80) : "",
  };
  const r = await backend().akquise(n, Object.fromEntries(Object.entries(filter).filter(([, x]) => x)));
  const k = r.kennzahlen;
  const schreiben = darfSchreiben(n, "akquise");
  const link = (extra) => `/portal/admin/akquise?${new URLSearchParams({ ...Object.fromEntries(Object.entries(filter).filter(([, x]) => x)), ...extra })}`;

  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Akquise-Pipeline Flächen" text="Score aus dem Flächencheck, Priorität, Zuständigkeit nach Gebiet und SLA-Ampel für den Erstkontakt (innerhalb von 2 Werktagen)." />
      {darfLesen(n, "geodaten") && ( // Geodaten & Akquise-Engine: Einstieg in die Akquise-Karte
        <Link href="/portal/admin/akquise/karte" className="ov-card-hover flex items-center gap-4 rounded-3xl bg-navy-900 p-5 text-white ring-1 ring-navy-800">
          <MapPinned aria-hidden="true" className="h-8 w-8 shrink-0 text-ov-400" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[17px] font-bold">Akquise-Karte: neue Flächen finden</span>
            <span className="block text-[13.5px] text-white/75">Kandidatenflächen mit Score, Umspannwerke, Trassenlänge und Netzanschlusskosten, Schutzgebiete – übernehmen mit einem Klick.</span>
          </span>
          <span className="hidden rounded-full bg-ov-600 px-4 py-2 text-[14px] font-semibold sm:inline">Karte öffnen</span>
        </Link>
      )}
      {darfLesen(n, "geodaten") && ( // Akquise Ausbaustufe 2: Kampagnen und Gemeinde-Screening
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/portal/admin/akquise/kampagnen" className="ov-card-hover flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70">
            <Megaphone aria-hidden="true" className="h-7 w-7 shrink-0 text-ov-600" />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[16px] font-bold text-ink-900">Akquise-Kampagnen</span>
              <span className="block text-[13px] text-ink-600">Grundbuch, Serienbrief mit persönlichem Link, Rücklauf, Nachfassen, Sperrliste.</span>
            </span>
          </Link>
          <Link href="/portal/admin/akquise/gemeinden" className="ov-card-hover flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70">
            <Landmark aria-hidden="true" className="h-7 w-7 shrink-0 text-ov-600" />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[16px] font-bold text-ink-900">Gemeinde-Screening</span>
              <span className="block text-[13px] text-ink-600">Ranking der Gemeinden nach Potenzial, Netz, Bauleitplanung und Wettbewerb.</span>
            </span>
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl label="Offene Flächen" wert={fmt(k.anzahl)} hinweis={`${fmt(k.ha)} ha · ≈ ${fmt(k.mwp)} MWp Potenzial`} icon={LandPlot} />
        <Kennzahl label="Priorität A" wert={fmt(k.prioA)} hinweis={`Score im Mittel ${k.scoreMittel}`} icon={Star} href={link({ prioritaet: "A" })} />
        <Kennzahl label="Erstkontakt überfällig" wert={fmt(k.slaRot)} hinweis={`${fmt(k.slaGelb)} knapp oder verspätet`} icon={AlarmClock} href={link({ sla: "rot" })} ton={k.slaRot ? "dunkel" : "hell"} />
        <Kennzahl label="Ohne Zuständigen" wert={fmt(k.ohneZustaendig)} hinweis="Auswählen → „Nach Gebiet zuweisen“" icon={UserX} href={link({ zustaendig: "ohne" })} />
      </div>

      <form method="get" className="grid gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink-200/70 md:grid-cols-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))_auto]">
        <label className="relative md:col-span-3 xl:col-span-1">
          <span className="sr-only">Suche</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-ink-400" />
          <input name="q" defaultValue={filter.q} placeholder="Fläche, Ort, PLZ, Kontakt, Tag" className={cn(eingabe, "pl-11")} />
        </label>
        <label>
          <span className="sr-only">Land</span>
          <select name="land" defaultValue={filter.land} className={auswahlfeld}>
            <option value="">Alle Länder</option>
            {Object.entries(LAENDER).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Priorität</span>
          <select name="prioritaet" defaultValue={filter.prioritaet} className={auswahlfeld}>
            <option value="">Alle Prioritäten</option>
            <option value="A">A – sofort</option>
            <option value="B">B – normal</option>
            <option value="C">C – später</option>
          </select>
        </label>
        <label>
          <span className="sr-only">SLA</span>
          <select name="sla" defaultValue={filter.sla} className={auswahlfeld}>
            <option value="">SLA: alle</option>
            <option value="rot">überfällig</option>
            <option value="gelb">knapp / verspätet</option>
            <option value="gruen">im Plan</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Zuständig</span>
          <select name="zustaendig" defaultValue={filter.zustaendigId} className={auswahlfeld}>
            <option value="">Alle Zuständigen</option>
            <option value="ohne">ohne Zuständigen</option>
            {r.konten.map((x) => <option key={x.id} value={x.id}>{[x.vorname, x.nachname].join(" ")}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select name="status" defaultValue={filter.status} className={auswahlfeld}>
            <option value="">Alle Status</option>
            {["entwurf", "eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag", "planung"].map((s) => <option key={s} value={s}>{PROZESSE.flaeche.status[s].label}</option>)}
          </select>
        </label>
        <button type="submit" className="h-12 rounded-full bg-navy-700 px-6 text-[15px] font-semibold text-white hover:bg-navy-800">Filtern</button>
      </form>
      {Object.values(filter).some(Boolean) && (
        <p className="-mt-3 text-[13px]"><Link href="/portal/admin/akquise" className="font-semibold text-ov-700">Filter zurücksetzen</Link> · {r.flaechen.length} von {k.anzahl} Flächen</p>
      )}

      <AkquiseTabelle flaechen={r.flaechen} konten={r.konten} darfSchreiben={schreiben} />

      <Karte id="gebiete" titel="Gebietszuordnung" untertitel="PLZ-Bereiche, Bundesländer/Kantone oder ganze Länder → zuständige Person" aktion={<MapPinned aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <GebieteEditor gebiete={r.gebiete} konten={r.konten} darfSchreiben={schreiben} />
      </Karte>

      <p className="flex items-center gap-2 text-[12.5px] text-ink-500">
        <Gauge aria-hidden="true" className="h-4 w-4" /> Score = Flächencheck (Größe, Nutzung, Besonderheiten, Netzentfernung, Eigentum, Land). Erstkontakt zählt ab Anruf, E-Mail oder Termin im CRM, einer Nachricht des Backoffice oder dem ersten Statuswechsel.
      </p>
    </div>
  );
}
