"use client";

// Closing-Raum (Backoffice): Stammdaten (Struktur, Kaufpreis, SPV, Meilensteine), Signing-Checkliste mit KYC beider Seiten,
// Closing Conditions (Status, Nachweis, eigene CPs), Notartermin, Kaufpreiszahlung (Treuhand), Closing vollziehen
// (→ Projekt verkauft, Provision, Provisionsrechnung), Übergabe, Abbruch. Alle Prüfungen serverseitig (409/422 mit Gründen).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CheckCircle2, Circle, Flag, Plus, Save, Stamp, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Hinweis, Karte } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { CL_STRUKTUREN, CL_VERANTWORTLICH, CP_STATUS } from "@/lib/plattform/closing/closing";

const datumText = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join(".") : "");
const lokal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const z = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
};

function useAktion(id, setC) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  async function los(body, { patch = false, ok = "" } = {}) {
    setFehler("");
    setErfolg("");
    setLaeuft(true);
    try {
      const r = await senden(patch ? `/api/admin/closing/${id}` : `/api/admin/closing/${id}/aktion`, { method: patch ? "PATCH" : "POST", body });
      setC(r.closing);
      if (ok) setErfolg(ok);
      router.refresh();
      return true;
    } catch (x) {
      setFehler(x.message);
      return false;
    } finally {
      setLaeuft(false);
    }
  }
  return { los, fehler, erfolg, laeuft };
}

function Meldung({ a }) {
  return (a.fehler || a.erfolg) ? <div className="mt-3 space-y-2"><FehlerBox>{a.fehler}</FehlerBox><ErfolgBox>{a.erfolg}</ErfolgBox></div> : null;
}

function Stammdaten({ c, setC }) {
  const a = useAktion(c.id, setC);
  const [f, setF] = useState({ struktur: c.struktur, kaufpreis: c.kaufpreis || "", spvName: c.spvName || "", anteilProzent: c.anteilProzent || 100, earnOut: c.earnOut || "", ms: (c.meilensteine || []).map((m) => `${m.label} | ${m.betrag} | ${m.bedingung || ""}`).join("\n") });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const vorbereitung = c.status === "vorbereitung";
  function speichern(ev) {
    ev.preventDefault();
    const meilensteine = f.ms.split("\n").map((z) => z.split("|").map((x) => x.trim())).filter((z) => z[0]).map(([label, betrag, bedingung]) => ({ label, betrag: Number(String(betrag || "").replace(/[^\d]/g, "")), bedingung }));
    const body = { spvName: f.spvName, anteilProzent: Number(f.anteilProzent), earnOut: f.earnOut, meilensteine };
    if (vorbereitung) Object.assign(body, { struktur: f.struktur, kaufpreis: Number(f.kaufpreis) });
    a.los(body, { patch: true, ok: "Gespeichert." });
  }
  return (
    <form onSubmit={speichern} className="grid gap-3 sm:grid-cols-2">
      <Feld id="cl-str" label="Transaktionsstruktur" hinweis={CL_STRUKTUREN[f.struktur]?.text}>
        <select id="cl-str" value={f.struktur} onChange={set("struktur")} disabled={!vorbereitung} className={auswahlfeld}>{Object.entries(CL_STRUKTUREN).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select>
      </Feld>
      <Feld id="cl-kp" label="Kaufpreis (€)" hinweis={vorbereitung ? "Vorbelegt aus Zuschlag bzw. LOI – mit dem Signing fest." : "Mit dem Signing festgelegt."}>
        <input id="cl-kp" type="number" min="1" value={f.kaufpreis} onChange={set("kaufpreis")} disabled={!vorbereitung} className={eingabe} />
      </Feld>
      {f.struktur === "share" && (
        <>
          <Feld id="cl-spv" label="Projektgesellschaft (SPV)"><input id="cl-spv" value={f.spvName} onChange={set("spvName")} className={eingabe} /></Feld>
          <Feld id="cl-ant" label="Verkaufte Anteile (%)"><input id="cl-ant" type="number" min="1" max="100" value={f.anteilProzent} onChange={set("anteilProzent")} className={eingabe} /></Feld>
        </>
      )}
      <Feld id="cl-ms" label="Meilensteinzahlungen (je Zeile „Bezeichnung | Betrag | Bedingung“)" className="sm:col-span-2"><textarea id="cl-ms" value={f.ms} onChange={set("ms")} className={textbereich} placeholder="Rate bei COD | 500000 | Inbetriebnahme bis 09/2027" /></Feld>
      <Feld id="cl-eo" label="Earn-out (optional)" className="sm:col-span-2"><input id="cl-eo" value={f.earnOut} onChange={set("earnOut")} className={eingabe} /></Feld>
      <div className="sm:col-span-2"><Button type="submit" size="sm" variant="navy" icon={Save} disabled={a.laeuft}>Speichern</Button><Meldung a={a} /></div>
    </form>
  );
}

function Signing({ c, setC }) {
  const a = useAktion(c.id, setC);
  const vorbereitung = c.status === "vorbereitung";
  return (
    <div>
      <ul className="divide-y divide-ink-100">
        {c.signingStand.map((p) => (
          <li key={p.schluessel} className="flex flex-wrap items-start justify-between gap-2 py-3">
            <div className="flex min-w-0 items-start gap-2.5">
              {p.erledigt ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> : <Circle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-300" />}
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{p.label}{p.auto && <span className="font-normal text-ink-500"> (automatisch aus KYC)</span>}</p>
                <p className="text-[12.5px] leading-snug text-ink-500">{p.text}{p.am ? ` · erledigt ${datumText(p.am)}` : ""}</p>
              </div>
            </div>
            {!p.auto && vorbereitung && c.darfBearbeiten && (
              <Button type="button" size="sm" variant="ghost" disabled={a.laeuft} onClick={() => a.los({ aktion: "signing_punkt", schluessel: p.schluessel, erledigt: !p.erledigt })}>{p.erledigt ? "Zurücksetzen" : "Erledigt"}</Button>
            )}
            {p.auto && <Badge ton={p.erledigt ? "ok" : "warn"}>{p.erledigt ? "verifiziert" : "nicht verifiziert"}</Badge>}
          </li>
        ))}
      </ul>
      {vorbereitung && c.darfBearbeiten && (
        <div className="mt-3 border-t border-ink-100 pt-3">
          {!c.signingPruefung.ok && (
            <Hinweis ton="warn" titel="Signing noch nicht möglich" className="mb-3">
              <ul className="list-disc pl-5">{c.signingPruefung.gruende.map((g) => <li key={g}>{g}</li>)}</ul>
            </Hinweis>
          )}
          <Button type="button" size="sm" icon={BadgeCheck} disabled={a.laeuft} onClick={() => a.los({ aktion: "signing" }, { ok: "Signing bestätigt." })}>Signing bestätigen</Button>
        </div>
      )}
      <Meldung a={a} />
    </div>
  );
}

function CpZeile({ c, x, setC }) {
  const a = useAktion(c.id, setC);
  const [status, setStatus] = useState(x.status === "offen" || x.status === "gemeldet" ? "erfuellt" : x.status);
  const [nachweis, setNachweis] = useState(x.nachweis || "");
  const [offen, setOffen] = useState(false);
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-900">{x.label}</p>
          <p className="text-[12.5px] leading-snug text-ink-500">{x.text}</p>
          <p className="mt-1 text-[12.5px] text-ink-700">
            {x.verantwortlichLabel}
            {x.frist && ` · Frist ${datumText(x.frist)}`}
            {x.nachweis && ` · Nachweis: ${x.nachweis}`}
            {x.erfuelltAm && ` · ${datumText(x.erfuelltAm)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge ton={CP_STATUS[x.status]?.ton}>{x.statusLabel}</Badge>
          {c.darfBearbeiten && <Button type="button" size="sm" variant="ghost" onClick={() => setOffen((o) => !o)} aria-expanded={offen}>{offen ? "Schließen" : "Bearbeiten"}</Button>}
        </div>
      </div>
      {offen && (
        <form onSubmit={(e) => { e.preventDefault(); a.los({ aktion: "cp", schluessel: x.schluessel, status, nachweis }).then((ok) => ok && setOffen(false)); }} className="mt-2 grid gap-2 rounded-2xl bg-ink-50 p-3 sm:grid-cols-[200px_minmax(0,1fr)_auto]">
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={auswahlfeld}>{Object.entries(CP_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select>
          <input aria-label="Nachweis" value={nachweis} onChange={(e) => setNachweis(e.target.value)} placeholder="Nachweis (Dokument, Datum, Aktenzeichen) bzw. Begründung des Verzichts" className={eingabe} />
          <Button type="submit" size="sm" variant="navy" icon={Save} disabled={a.laeuft}>Speichern</Button>
          <div className="sm:col-span-3"><Meldung a={a} /></div>
        </form>
      )}
    </li>
  );
}

function Bedingungen({ c, setC }) {
  const a = useAktion(c.id, setC);
  const [neu, setNeu] = useState({ label: "", verantwortlich: "verkaeufer", frist: "" });
  return (
    <div>
      <ul className="divide-y divide-ink-100">{c.cps.map((x) => <CpZeile key={`${x.schluessel}-${x.status}`} c={c} x={x} setC={setC} />)}</ul>
      {c.darfBearbeiten && (
        <form onSubmit={(e) => { e.preventDefault(); a.los({ aktion: "cp_neu", ...neu }, { ok: "Bedingung ergänzt." }).then((ok) => ok && setNeu({ label: "", verantwortlich: "verkaeufer", frist: "" })); }} className="mt-3 grid gap-2 border-t border-ink-100 pt-3 sm:grid-cols-[minmax(0,1fr)_190px_160px_auto]">
          <input aria-label="Neue Bedingung" value={neu.label} onChange={(e) => setNeu((x) => ({ ...x, label: e.target.value }))} placeholder="Weitere Bedingung, z. B. Zustimmung Gemeinde" className={eingabe} />
          <select aria-label="Verantwortlich" value={neu.verantwortlich} onChange={(e) => setNeu((x) => ({ ...x, verantwortlich: e.target.value }))} className={auswahlfeld}>{Object.entries(CL_VERANTWORTLICH).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <input aria-label="Frist" type="date" value={neu.frist} onChange={(e) => setNeu((x) => ({ ...x, frist: e.target.value }))} className={eingabe} />
          <Button type="submit" size="sm" variant="secondary" icon={Plus} disabled={a.laeuft}>Hinzufügen</Button>
        </form>
      )}
      <Meldung a={a} />
    </div>
  );
}

function NotarZahlung({ c, setC }) {
  const a = useAktion(c.id, setC);
  const [notar, setNotar] = useState({ name: c.notar?.name || "", kanzlei: c.notar?.kanzlei || "", email: c.notar?.email || "", ort: c.notar?.ort || "", termin: lokal(c.notar?.termin) });
  const [z, setZ] = useState({ treuhand: !!c.zahlung?.treuhand, kontoHinweis: c.zahlung?.kontoHinweis || "", faelligAm: c.zahlung?.faelligAm || "" });
  const [eingang, setEingang] = useState({ datum: new Date().toISOString().slice(0, 10), betrag: "" });
  const setN = (k) => (e) => setNotar((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className="space-y-5">
      <form onSubmit={(e) => { e.preventDefault(); a.los({ notar: { ...notar, termin: notar.termin ? new Date(notar.termin).toISOString() : "" } }, { patch: true, ok: "Notartermin gespeichert." }); }} className="grid gap-3 sm:grid-cols-2">
        <p className="text-[13px] text-ink-600 sm:col-span-2">Notar/Notarin als externer Kontakt – der Termin geht als Kalenderdatei an beide Seiten (Portal).</p>
        <Feld id="cl-nn" label="Notar/Notarin"><input id="cl-nn" value={notar.name} onChange={setN("name")} disabled={!c.darfBearbeiten} className={eingabe} /></Feld>
        <Feld id="cl-nk" label="Kanzlei / Notariat"><input id="cl-nk" value={notar.kanzlei} onChange={setN("kanzlei")} disabled={!c.darfBearbeiten} className={eingabe} /></Feld>
        <Feld id="cl-ne" label="E-Mail (optional)"><input id="cl-ne" type="email" value={notar.email} onChange={setN("email")} disabled={!c.darfBearbeiten} className={eingabe} /></Feld>
        <Feld id="cl-nt" label="Termin"><input id="cl-nt" type="datetime-local" value={notar.termin} onChange={setN("termin")} disabled={!c.darfBearbeiten} className={eingabe} /></Feld>
        <Feld id="cl-no" label="Ort" className="sm:col-span-2"><input id="cl-no" value={notar.ort} onChange={setN("ort")} disabled={!c.darfBearbeiten} className={eingabe} /></Feld>
        {c.darfBearbeiten && <div className="sm:col-span-2"><Button type="submit" size="sm" variant="navy" icon={Save} disabled={a.laeuft}>Notartermin speichern</Button></div>}
      </form>
      <div className="border-t border-ink-100 pt-4">
        <form onSubmit={(e) => { e.preventDefault(); a.los({ zahlung: z }, { patch: true, ok: "Zahlungsweg gespeichert." }); }} className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-[14px] text-ink-700 sm:col-span-2">
            <input type="checkbox" checked={z.treuhand} disabled={!c.darfBearbeiten} onChange={(e) => setZ((x) => ({ ...x, treuhand: e.target.checked }))} className="h-4 w-4 accent-ov-600" />
            Zahlung über Treuhand-/Notaranderkonto
          </label>
          {z.treuhand && <p className="text-[12.5px] text-ink-500 sm:col-span-2">{c.zahlung?.hinweis}</p>}
          <Feld id="cl-zk" label="Konto / Hinweis"><input id="cl-zk" value={z.kontoHinweis} onChange={(e) => setZ((x) => ({ ...x, kontoHinweis: e.target.value }))} disabled={!c.darfBearbeiten} className={eingabe} /></Feld>
          <Feld id="cl-zf" label="Fällig am"><input id="cl-zf" type="date" value={z.faelligAm} onChange={(e) => setZ((x) => ({ ...x, faelligAm: e.target.value }))} disabled={!c.darfBearbeiten} className={eingabe} /></Feld>
          {c.darfBearbeiten && <div className="sm:col-span-2"><Button type="submit" size="sm" variant="secondary" icon={Save} disabled={a.laeuft}>Zahlungsweg speichern</Button></div>}
        </form>
        {c.zahlung?.eingangAm ? (
          <Hinweis ton="ok" className="mt-3">Zahlungseingang bestätigt am {datumText(c.zahlung.eingangAm)}{c.zahlung.betrag ? ` über ${Number(c.zahlung.betrag).toLocaleString("de-DE")} €` : ""}.</Hinweis>
        ) : c.status === "signing" && c.darfBearbeiten ? (
          <form onSubmit={(e) => { e.preventDefault(); a.los({ aktion: "zahlung_eingang", datum: eingang.datum, betrag: eingang.betrag ? Number(eingang.betrag) : undefined }, { ok: "Zahlungseingang bestätigt." }); }} className="mt-3 grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
            <input aria-label="Eingang am" type="date" value={eingang.datum} onChange={(e) => setEingang((x) => ({ ...x, datum: e.target.value }))} className={eingabe} />
            <input aria-label="Betrag" type="number" min="1" value={eingang.betrag} onChange={(e) => setEingang((x) => ({ ...x, betrag: e.target.value }))} placeholder={`Betrag (Standard: ${Number(c.kaufpreis || 0).toLocaleString("de-DE")} €)`} className={eingabe} />
            <Button type="submit" size="sm" variant="navy" disabled={a.laeuft}>Eingang bestätigen</Button>
          </form>
        ) : null}
      </div>
      <Meldung a={a} />
    </div>
  );
}

function Abschluss({ c, setC }) {
  const a = useAktion(c.id, setC);
  const [grund, setGrund] = useState("");
  if (c.status === "vollzogen") {
    return (
      <div>
        <ul className="divide-y divide-ink-100">
          {c.uebergabe.map((u) => (
            <li key={u.schluessel} className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div className="flex min-w-0 items-start gap-2.5">
                {u.erledigt ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> : <Circle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-300" />}
                <div className="min-w-0"><p className="font-semibold text-ink-900">{u.label}</p><p className="text-[12.5px] leading-snug text-ink-500">{u.text}</p></div>
              </div>
              {c.darfUebergabe && <Button type="button" size="sm" variant="ghost" disabled={a.laeuft} onClick={() => a.los({ aktion: "uebergabe", schluessel: u.schluessel, erledigt: !u.erledigt })}>{u.erledigt ? "Zurücksetzen" : "Erledigt"}</Button>}
            </li>
          ))}
        </ul>
        <Meldung a={a} />
      </div>
    );
  }
  if (!c.darfBearbeiten) return <p className="text-[14px] text-ink-500">Der Closing-Raum ist abgeschlossen.</p>;
  return (
    <div className="space-y-4">
      {!c.closingPruefung.ok && (
        <Hinweis ton="warn" titel="Closing noch nicht möglich">
          <ul className="list-disc pl-5">{c.closingPruefung.gruende.map((g) => <li key={g}>{g}</li>)}</ul>
        </Hinweis>
      )}
      <p className="text-[13.5px] text-ink-600">Mit dem Closing wird das Projekt als verkauft gebucht; die Provision entsteht automatisch und das Finanzen-Modul erzeugt die Provisionsrechnung an den Verkäufer.</p>
      <Button type="button" icon={Stamp} disabled={a.laeuft || c.status !== "signing"} onClick={() => a.los({ aktion: "closing" }, { ok: "Closing vollzogen – Provision und Rechnung angelegt." })}>Closing vollziehen</Button>
      <div className="border-t border-ink-100 pt-4">
        <Feld id="cl-ab" label="Deal abbrechen – Grund"><input id="cl-ab" value={grund} onChange={(e) => setGrund(e.target.value)} className={cn(eingabe, "max-w-xl")} /></Feld>
        <Button type="button" size="sm" variant="ghost" icon={XCircle} className="mt-2" disabled={a.laeuft} onClick={() => a.los({ aktion: "abbrechen", grund })}>Abbrechen</Button>
      </div>
      <Meldung a={a} />
    </div>
  );
}

export default function ClosingRaum({ closing }) {
  const [c, setC] = useState(closing);
  return (
    <div className="space-y-6">
      <Karte titel="1. Struktur & Kaufpreis" untertitel={`${c.strukturLabel} · Kaufpreis ${Number(c.kaufpreis || 0).toLocaleString("de-DE")} € (${c.kaufpreisQuelle === "zuschlag" ? "Zuschlag" : c.kaufpreisQuelle === "loi" ? "LOI" : "vereinbart"})`}>
        {c.darfBearbeiten ? <Stammdaten c={c} setC={setC} /> : <p className="text-[14px] text-ink-600">{c.spvName ? `${c.anteilProzent} % an ${c.spvName}` : c.strukturLabel}</p>}
      </Karte>
      <Karte titel="2. Signing-Checkliste" untertitel={c.signingAm ? `Signing am ${datumText(c.signingAm)}` : "KYC beider Seiten, Bonität, Finanzierung, Gremien, Due Diligence, Vertrag"}>
        <Signing c={c} setC={setC} />
      </Karte>
      <Karte titel="3. Closing Conditions" untertitel={`${c.cpsGesamt - c.cpsOffen} von ${c.cpsGesamt} erfüllt oder verzichtet`}>
        <Bedingungen c={c} setC={setC} />
      </Karte>
      <Karte titel="4. Notartermin & Kaufpreiszahlung">
        <NotarZahlung c={c} setC={setC} />
      </Karte>
      <Karte titel={c.status === "vollzogen" ? "6. Übergabe" : "5. Closing"} untertitel={c.status === "vollzogen" ? `Closing am ${datumText(c.vollzogenAm)}` : undefined} aktion={<Flag aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <Abschluss c={c} setC={setC} />
      </Karte>
    </div>
  );
}
