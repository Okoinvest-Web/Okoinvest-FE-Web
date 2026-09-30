"use client";

// Mehrere gespeicherte Suchprofile je Investor (zusätzlich zum Hauptprofil mit Alarm am Konto).
// Je Profil: Trefferzahl in der Börse, beste Treffer; „Als Alarm-Profil übernehmen“ setzt das Hauptprofil.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { LAENDER, PROJEKT_TYPEN, SUCHPROFIL_SCHWELLE } from "@/lib/plattform/konstanten";
import { SUCHPROFILE_MAX } from "@/lib/plattform/dealroom";
import { PHASEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { Chip, eingabe, Feld, FehlerBox, ErfolgBox } from "@/components/Portal/felder";

const LEER = { name: "", mwpMin: "", mwpMax: "", phasen: [], laender: [], typen: [], ticketMin: "", ticketMax: "", schwelle: SUCHPROFIL_SCHWELLE.standard };
const num = (s) => (s === "" || s === null || s === undefined ? null : Number(String(s).replace(/\s/g, "").replace(",", ".")));

function beschreibung(p) {
  const teile = [];
  if (p.mwpMin || p.mwpMax) teile.push(`${p.mwpMin ? fmt(p.mwpMin) : "0"}–${p.mwpMax ? fmt(p.mwpMax) : "∞"} MWp`);
  if (p.phasen?.length) teile.push(p.phasen.map((x) => PHASEN.find((y) => y.id === x)?.kurz || x).join(", "));
  if (p.laender?.length) teile.push(p.laender.join("/"));
  if (p.typen?.length) teile.push(p.typen.map((t) => PROJEKT_TYPEN[t]).join(", "));
  if (p.ticketMax) teile.push(`Ticket bis ${fmt(p.ticketMax / 1e6, 1)} Mio. €`);
  return teile.join(" · ") || "Alle Projekte";
}

export default function Suchprofile({ profile = [] }) {
  const router = useRouter();
  const [bearbeiten, setBearbeiten] = useState(null); // Index oder "neu"
  const [w, setW] = useState(LEER);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const umschalten = (feld, wert) => setW((x) => ({ ...x, [feld]: x[feld].includes(wert) ? x[feld].filter((y) => y !== wert) : [...x[feld], wert] }));

  const roh = (p) => ({ id: p.id, name: p.name, mwpMin: p.mwpMin, mwpMax: p.mwpMax, phasen: p.phasen, laender: p.laender, typen: p.typen, ticketMin: p.ticketMin, ticketMax: p.ticketMax, schwelle: p.schwelle });

  async function speichernListe(liste, text) {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      await senden("/api/portal/pipeline/suchprofile", { method: "PUT", body: { profile: liste } });
      setErfolg(text);
      setBearbeiten(null);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  function oeffnen(idx) {
    setFehler("");
    setErfolg("");
    setBearbeiten(idx);
    const p = idx === "neu" ? LEER : profile[idx];
    setW({ ...LEER, ...p, mwpMin: p.mwpMin ?? "", mwpMax: p.mwpMax ?? "", ticketMin: p.ticketMin ?? "", ticketMax: p.ticketMax ?? "" });
  }

  function formularSpeichern(e) {
    e.preventDefault();
    const eintrag = { ...w, mwpMin: num(w.mwpMin), mwpMax: num(w.mwpMax), ticketMin: num(w.ticketMin), ticketMax: num(w.ticketMax), schwelle: num(w.schwelle) };
    const liste = profile.map(roh);
    if (bearbeiten === "neu") liste.push(eintrag);
    else liste[bearbeiten] = { ...eintrag, id: profile[bearbeiten].id };
    speichernListe(liste, "Suchprofil gespeichert.");
  }

  async function alsAlarm(p) {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      await senden("/api/portal/suchprofil", { method: "PUT", body: { ...roh(p), benachrichtigen: true } });
      setErfolg(`„${p.name}“ ist jetzt Ihr Alarm-Profil – neue passende Projekte melden wir per Benachrichtigung.`);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="space-y-4">
      {profile.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {profile.map((p, i) => (
            <li key={p.id} className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-bold text-ink-900">{p.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-500">{beschreibung(p)} · ab {p.schwelle} % Passung</p>
                </div>
                <Link href="/portal/boerse?sortierung=passung" className="ov-num shrink-0 rounded-full bg-ov-50 px-2.5 py-1 text-[12.5px] font-bold text-ov-800 ring-1 ring-inset ring-ov-200">{p.treffer} {p.treffer === 1 ? "Treffer" : "Treffer"}</Link>
              </div>
              {p.beste?.length > 0 && (
                <ul className="mt-2.5 space-y-1">
                  {p.beste.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-2 text-[13px]">
                      <Link href={`/portal/boerse/${b.id}`} className="min-w-0 truncate text-ink-700 hover:text-ov-700">{b.titel}</Link>
                      <span className="ov-num shrink-0 text-ink-500">{b.score} %</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-ink-100 pt-3">
                <Button size="sm" variant="ghost" icon={Pencil} onClick={() => oeffnen(i)}>Bearbeiten</Button>
                <Button size="sm" variant="ghost" icon={BellRing} disabled={laeuft} onClick={() => alsAlarm(p)}>Als Alarm-Profil</Button>
                <Button size="sm" variant="ghost" icon={Trash2} disabled={laeuft} onClick={() => confirm(`Suchprofil „${p.name}“ löschen?`) && speichernListe(profile.filter((_, j) => j !== i).map(roh), "Suchprofil gelöscht.")}>Löschen</Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-ink-500">Noch keine gespeicherten Suchprofile. Legen Sie mehrere Profile an, z. B. „Baurecht DE ab 10 MWp“ und „Bestand mit Cashflow“.</p>
      )}
      {bearbeiten === null ? (
        profile.length < SUCHPROFILE_MAX && <Button size="sm" variant="secondary" icon={Plus} onClick={() => oeffnen("neu")}>Suchprofil anlegen</Button>
      ) : (
        <form onSubmit={formularSpeichern} className="space-y-4 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-[15px] font-bold text-ink-900">{bearbeiten === "neu" ? "Neues Suchprofil" : "Suchprofil bearbeiten"}</p>
            <button type="button" onClick={() => setBearbeiten(null)} className="rounded-full p-1 text-ink-500 hover:bg-ink-100" aria-label="Schließen"><X aria-hidden="true" className="h-4 w-4" /></button>
          </div>
          <Feld id="sp-name" label="Name" pflicht>
            <input id="sp-name" className={eingabe} value={w.name} maxLength={60} onChange={(e) => setW((x) => ({ ...x, name: e.target.value }))} placeholder="z. B. Baurecht DE ab 10 MWp" />
          </Feld>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feld id="sp-min" label="MWp von"><input id="sp-min" inputMode="decimal" className={eingabe} value={w.mwpMin} onChange={(e) => setW((x) => ({ ...x, mwpMin: e.target.value }))} /></Feld>
            <Feld id="sp-max" label="MWp bis"><input id="sp-max" inputMode="decimal" className={eingabe} value={w.mwpMax} onChange={(e) => setW((x) => ({ ...x, mwpMax: e.target.value }))} /></Feld>
            <Feld id="sp-tmax" label="Ticket bis (€)"><input id="sp-tmax" inputMode="numeric" className={eingabe} value={w.ticketMax} onChange={(e) => setW((x) => ({ ...x, ticketMax: e.target.value }))} /></Feld>
            <Feld id="sp-schwelle" label="Mindest-Passung (%)"><input id="sp-schwelle" type="number" min={SUCHPROFIL_SCHWELLE.min} max={SUCHPROFIL_SCHWELLE.max} className={eingabe} value={w.schwelle} onChange={(e) => setW((x) => ({ ...x, schwelle: e.target.value }))} /></Feld>
          </div>
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Phasen</legend>
            <div className="flex flex-wrap gap-2">{PHASEN.map((p) => <Chip key={p.id} value={p.id} checked={w.phasen.includes(p.id)} onChange={() => umschalten("phasen", p.id)}>{p.kurz}</Chip>)}</div>
          </fieldset>
          <div className={cn("grid gap-4 md:grid-cols-2")}>
            <fieldset>
              <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Länder</legend>
              <div className="flex flex-wrap gap-2">{Object.entries(LAENDER).map(([k, v]) => <Chip key={k} value={k} checked={w.laender.includes(k)} onChange={() => umschalten("laender", k)}>{v}</Chip>)}</div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Projekttypen</legend>
              <div className="flex flex-wrap gap-2">{Object.entries(PROJEKT_TYPEN).map(([k, v]) => <Chip key={k} value={k} checked={w.typen.includes(k)} onChange={() => umschalten("typen", k)}>{v}</Chip>)}</div>
            </fieldset>
          </div>
          <Button type="submit" size="sm" icon={laeuft ? Loader2 : Save} disabled={laeuft || !w.name.trim()}>Speichern</Button>
        </form>
      )}
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{erfolg}</ErfolgBox>
    </div>
  );
}
