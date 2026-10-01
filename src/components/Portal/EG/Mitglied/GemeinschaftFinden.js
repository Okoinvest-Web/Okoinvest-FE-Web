"use client";

// Gemeinschaftssuche nach PLZ bzw. Zählpunkt (WP6, Marktanalyse P2 Nr. 18) und Interesse-Formular (Fachkonzept 2.1).
// Rangfolge: eg/interesse.js gemeinschaftenSuchen (gleiche Regel wie im Backend). Ohne Treffer: Interesse hinterlegen –
// wir melden uns, sobald in der Nähe eine Gemeinschaft entsteht. `oeffentlich`: Formular mit Name/E-Mail, Links über die Registrierung.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, MapPin, Users } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { gemeinschaftenSuchen, INTERESSE_EINWILLIGUNG, INTERESSE_ROLLEN } from "@/lib/plattform/eg/interesse";
import { EG_MODELLE } from "@/lib/plattform/eg/modell";
import { ct } from "./format";

const feld = "h-11 w-full rounded-xl border-0 bg-white px-3.5 text-[15px] text-ink-900 ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-ov-500";
const PASSUNG = { nahe: { label: "In Ihrer Nähe", ton: "bg-ov-600 text-white" }, netzgebiet: { label: "Gleiches Netzgebiet", ton: "bg-ov-50 text-ov-800 ring-1 ring-ov-200" }, oesterreichweit: { label: "Österreichweit", ton: "bg-navy-50 text-navy-800 ring-1 ring-navy-100" } };

export default function GemeinschaftFinden({ gemeinschaften = [], plz: plzStart = "" }) {
  const [plz, setPlz] = useState(plzStart);
  const gueltig = /^\d{4}$/.test(plz);
  const treffer = useMemo(() => (gueltig ? gemeinschaftenSuchen(gemeinschaften, { plz }) : []), [gemeinschaften, plz, gueltig]);
  return (
    <div className="space-y-5">
      <div className="max-w-sm">
        <label htmlFor="eg-plz" className="mb-1.5 block text-[13.5px] font-medium text-ink-700">Postleitzahl Ihres Anschlusses</label>
        <div className="relative">
          <MapPin aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input id="eg-plz" inputMode="numeric" maxLength={4} value={plz} onChange={(e) => setPlz(e.target.value.replace(/\D/g, ""))} placeholder="z. B. 4910" className={cn(feld, "pl-10")} />
        </div>
      </div>
      {gueltig && (
        <div aria-live="polite">
          {treffer.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {treffer.map((t) => {
                const g = gemeinschaften.find((x) => x.id === t.id) || {};
                return (
                  <li key={t.id} className="flex flex-col rounded-3xl bg-white p-5 ring-1 ring-ink-200/70">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold", PASSUNG[t.passung].ton)}>{PASSUNG[t.passung].label}</span>
                      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">{EG_MODELLE[g.modell]?.kurz}</span>
                    </div>
                    <p className="mt-2 font-display text-[18px] font-bold text-ink-900">{g.name}</p>
                    <p className="mt-1 text-[13.5px] text-ink-600">{[g.ort, g.netzbetreiberNamen?.join(", ")].filter(Boolean).join(" · ")}</p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{t.grund}</p>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-[12.5px]">
                      <div className="rounded-xl bg-sand-50 px-2.5 py-2"><dt className="text-ink-500">Bezug</dt><dd className="ov-num font-semibold text-ink-900">{g.bezugspreisCt !== null ? `${ct(g.bezugspreisCt)}/kWh` : "–"}</dd></div>
                      <div className="rounded-xl bg-sand-50 px-2.5 py-2"><dt className="text-ink-500">Einspeisung</dt><dd className="ov-num font-semibold text-ink-900">{g.einspeisepreisCt !== null ? `${ct(g.einspeisepreisCt)}/kWh` : "–"}</dd></div>
                      <div className="rounded-xl bg-sand-50 px-2.5 py-2"><dt className="text-ink-500">Mitglieder</dt><dd className="ov-num flex items-center gap-1 font-semibold text-ink-900"><Users aria-hidden="true" className="h-3 w-3" />{g.mitglieder}</dd></div>
                    </dl>
                    <Link href={`/portal/eg/${t.id}/beitritt`} className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 self-start rounded-full bg-ov-600 px-4 text-[13.5px] font-semibold text-white hover:bg-ov-700">
                      Jetzt beitreten <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/70 md:p-6">
              <p className="font-display text-[17px] font-bold text-ink-900">Noch keine offene Gemeinschaft für PLZ {plz}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-600">Hinterlegen Sie Ihr Interesse – wir bündeln Interessierte je Netzgebiet und melden uns, sobald eine Gemeinschaft in Ihrer Nähe Mitglieder aufnimmt oder gegründet wird.</p>
              <div className="mt-4"><InteresseFormular plzStart={plz} /></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Interesse an einer Energiegemeinschaft (POST /api/eg/interesse). Angemeldet: E-Mail aus dem Konto. */
export function InteresseFormular({ plzStart = "", oeffentlich = false, herkunft = "portal" }) {
  const [d, setD] = useState({ vorname: "", nachname: "", email: "", plz: plzStart, rolle: "verbraucher", zaehlpunktnummer: "", jahresverbrauchKwh: "", einwilligung: false, website: "" });
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ergebnis, setErgebnis] = useState(null);
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  async function absenden(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      const { website, ...daten } = d;
      const r = await senden("/api/eg/interesse", { body: { daten: { ...daten, herkunft }, website } });
      setErgebnis(r);
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }
  if (ergebnis) {
    return (
      <div role="status" className="space-y-3 rounded-2xl bg-ov-50 p-4 ring-1 ring-ov-200">
        <p className="flex items-center gap-2 font-semibold text-ov-900"><Check aria-hidden="true" className="h-4 w-4" /> Danke – Ihr Interesse ist vorgemerkt.</p>
        {ergebnis.passend?.length ? (
          <>
            <p className="text-[14px] text-ink-700">Diese Gemeinschaften kommen bereits in Frage:</p>
            <ul className="space-y-2">
              {ergebnis.passend.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5 text-[14px] ring-1 ring-ink-200/70">
                  <span><strong>{p.name}</strong> <span className="text-ink-500">· {PASSUNG[p.passung]?.label}</span></span>
                  <Link href={oeffentlich ? `/registrieren?rolle=mitglied&weiter=${encodeURIComponent(`/portal/eg/${p.id}/beitritt`)}` : `/portal/eg/${p.id}/beitritt`} className="inline-flex items-center gap-1 font-semibold text-ov-700 hover:text-ov-800">Beitreten <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="text-[14px] text-ink-700">Wir melden uns, sobald eine passende Gemeinschaft Mitglieder aufnimmt.</p>}
      </div>
    );
  }
  return (
    <form onSubmit={absenden} className="space-y-4" noValidate>
      <input type="text" name="website" value={d.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {oeffentlich && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Feld label="Vorname"><input value={d.vorname} onChange={set("vorname")} className={feld} autoComplete="given-name" /></Feld>
          <Feld label="Nachname bzw. Organisation"><input value={d.nachname} onChange={set("nachname")} className={feld} autoComplete="family-name" required /></Feld>
          <Feld label="E-Mail" breit><input type="email" value={d.email} onChange={set("email")} className={feld} autoComplete="email" required /></Feld>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld label="Postleitzahl"><input inputMode="numeric" maxLength={4} value={d.plz} onChange={(e) => setD((x) => ({ ...x, plz: e.target.value.replace(/\D/g, "") }))} className={feld} required /></Feld>
        <Feld label="Jahresverbrauch in kWh (optional)"><input inputMode="numeric" value={d.jahresverbrauchKwh} onChange={set("jahresverbrauchKwh")} className={feld} placeholder="z. B. 3500" /></Feld>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-[13.5px] font-medium text-ink-700">Sie möchten</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(INTERESSE_ROLLEN).map(([k, r]) => (
            <label key={k} className={cn("cursor-pointer rounded-2xl px-3.5 py-3 text-[13.5px] ring-1 ring-inset transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500", d.rolle === k ? "bg-ov-50 ring-ov-400" : "bg-white ring-ink-200 hover:bg-ink-50")}>
              <input type="radio" name="eg-rolle" value={k} checked={d.rolle === k} onChange={set("rolle")} className="sr-only" />
              <span className="block font-semibold text-ink-900">{r.label}</span>
              <span className="mt-0.5 block text-[12.5px] text-ink-500">{r.text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Feld label="Zählpunktnummer (optional, 33 Zeichen von der Netzrechnung)"><input value={d.zaehlpunktnummer} onChange={set("zaehlpunktnummer")} className={feld} placeholder="AT 003000 …" autoComplete="off" /></Feld>
      <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-600">
        <input type="checkbox" checked={d.einwilligung} onChange={set("einwilligung")} className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-ov-600 focus:ring-ov-500" />
        <span>{INTERESSE_EINWILLIGUNG} <Link href="/datenschutz" className="font-semibold text-ov-700 underline-offset-2 hover:underline">Datenschutz</Link></span>
      </label>
      {fehler && <p role="alert" className="rounded-xl bg-sun-300/20 px-4 py-3 text-[14px] text-ink-900 ring-1 ring-sun-400/50">{fehler}</p>}
      <button type="submit" disabled={laeuft} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-ov-700 disabled:opacity-50">
        {laeuft ? "Senden …" : "Interesse hinterlegen"}
      </button>
    </form>
  );
}

function Feld({ label, children, breit = false }) {
  return (
    <label className={cn("block", breit && "sm:col-span-2")}>
      <span className="mb-1.5 block text-[13.5px] font-medium text-ink-700">{label}</span>
      {children}
    </label>
  );
}
