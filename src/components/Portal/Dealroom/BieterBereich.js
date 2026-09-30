"use client";

// Strukturiertes Bieterverfahren im Deal-Room.
//   Investor: Runde, Countdown, verdecktes Gebot (Preis gesamt oder €/kWp, Bedingungen, Finanzierung, Zeitplan),
//             nur eigene Gebote sichtbar, Zurückziehen solange die Runde offen ist
//   Anbieter: Stand und – nach Freigabe durch ÖkoInvest – anonymisierte Vergleichsmatrix
//   Backoffice: Start, Frist, Erinnerung, Runde beenden, Shortlist für die verbindliche Runde, Zuschlag,
//               Verkauf abschließen (→ Provision über den bestehenden Automaten), Abbruch
// Alle Regeln (Fristablauf, Verdecktheit, Zulassung) erzwingt der Server.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Coins, EyeOff, Gavel, Loader2, Play, Send, Square, Trophy, Undo2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { datumZeit, eur } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";
import { GEBOT_PFLICHT, GEBOT_STATUS, RUNDEN_ARTEN, VERFAHREN_STATUS, gebotGesamt } from "@/lib/plattform/dealroom";
import { statusLabel } from "@/lib/plattform/prozesse";
import { Badge, Hinweis } from "@/components/Portal/ui";
import { auswahlfeld, eingabe, textbereich, Feld, FehlerBox, ErfolgBox, Chip } from "@/components/Portal/felder";
import Countdown from "./Countdown";

const lokal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const z = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
};
const iso = (lokalWert) => (lokalWert ? new Date(lokalWert).toISOString() : "");
const inTagen = (t) => lokal(new Date(Date.now() + t * 86400e3).toISOString());
// Ganzzahl (Euro) aus „2.400.000“ bzw. Dezimalzahl aus „95,5“ oder „95.5“
const zahl = (s) => (s === "" || s === null || s === undefined ? "" : Number(String(s).replace(/[^\d]/g, "")));
const dezimal = (s) => (s === "" || s === null || s === undefined ? "" : Number(String(s).replace(/\s/g, "").replace(",", ".")));

function useAktion() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  async function los(url, body, text, method = "POST") {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      const r = await senden(url, { method, body });
      setErfolg(text || r?.verfahren?.hinweis || "Erledigt.");
      router.refresh();
      return r;
    } catch (e) {
      setFehler(e.message);
      return null;
    } finally {
      setLaeuft(false);
    }
  }
  return { laeuft, fehler, erfolg, los };
}

function Meldungen({ a }) {
  if (!a.fehler && !a.erfolg) return null;
  return (
    <div className="mt-3 space-y-2">
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </div>
  );
}

function Kopf({ vf }) {
  const s = VERFAHREN_STATUS[vf.status] || { label: vf.status, ton: "neutral" };
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge ton={s.ton}>{s.label}</Badge>
          <Badge ton="info">Runde {vf.runde.nr} · {RUNDEN_ARTEN[vf.runde.art]?.label}</Badge>
          {vf.pflicht?.length > 0 && <span className="text-[12.5px] text-ink-500">Pflicht: Preis, {vf.pflicht.map((p) => GEBOT_PFLICHT[p]).join(", ")}</span>}
        </div>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">{RUNDEN_ARTEN[vf.runde.art]?.text}</p>
        {vf.hinweis && <p className="mt-2 max-w-2xl whitespace-pre-line text-[14px] leading-relaxed text-ink-800">{vf.hinweis}</p>}
        {vf.runden.length > 1 && (
          <ol className="mt-3 flex flex-wrap gap-1.5 text-[12px] text-ink-500">
            {vf.runden.map((r) => (
              <li key={r.nr} className={cn("rounded-full px-2.5 py-1 ring-1 ring-inset", r.nr === vf.runde.nr ? "bg-navy-50 text-navy-800 ring-navy-100" : "ring-ink-200")}>
                Runde {r.nr}: {RUNDEN_ARTEN[r.art]?.kurz} bis {datumZeit(r.beendetAm || r.frist)}
              </li>
            ))}
          </ol>
        )}
      </div>
      {["laufend", "auswertung"].includes(vf.status) && <Countdown frist={vf.runde.beendetAm || vf.runde.frist} label="Angebotsfrist" gross className="shrink-0" />}
    </div>
  );
}

// ---------------------------------------------------------------- Investor

function GebotFormular({ vf, mwp }) {
  const letztes = vf.eigeneGebote.find((g) => g.runde === vf.runde.nr && g.status === "abgegeben");
  const [w, setW] = useState({
    preisModus: letztes?.preisModus || "proKwp",
    preis: letztes?.preis ? String(letztes.preis) : "",
    preisProKwp: letztes?.preisProKwp ? String(letztes.preisProKwp) : "",
    bedingungen: letztes?.bedingungen || "",
    finanzierung: letztes?.finanzierung || "",
    zeitplan: letztes?.zeitplan || "",
    gueltigBis: letztes?.gueltigBis || "",
  });
  const a = useAktion();
  const setze = (k, v) => setW((x) => ({ ...x, [k]: v }));
  const verbindlich = vf.runde.art === "verbindlich";
  const pf = new Set([...(vf.pflicht || []), ...(verbindlich ? ["finanzierung", "zeitplan"] : [])]);
  const gesamt = gebotGesamt({ preisModus: w.preisModus, preis: zahl(w.preis), preisProKwp: dezimal(w.preisProKwp) }, mwp);

  async function absenden(e) {
    e.preventDefault();
    await a.los("/api/portal/bieter", { verfahrenId: vf.id, ...w, preis: zahl(w.preis), preisProKwp: dezimal(w.preisProKwp) }, letztes ? "Gebot aktualisiert (neue Version)." : "Gebot verdeckt abgegeben.");
  }

  return (
    <form onSubmit={absenden} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Preisangabe</legend>
        <div className="flex flex-wrap gap-2">
          <Chip type="radio" name="preisModus" value="proKwp" checked={w.preisModus === "proKwp"} onChange={() => setze("preisModus", "proKwp")}>Preis je kWp</Chip>
          <Chip type="radio" name="preisModus" value="gesamt" checked={w.preisModus === "gesamt"} onChange={() => setze("preisModus", "gesamt")}>Kaufpreis gesamt</Chip>
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        {w.preisModus === "proKwp" ? (
          <Feld id="g-kwp" label="Preis (€/kWp)" pflicht hinweis={gesamt ? `entspricht ${eur(gesamt)} bei ${fmt(mwp, 1)} MWp` : undefined}>
            <input id="g-kwp" inputMode="decimal" className={eingabe} value={w.preisProKwp} onChange={(e) => setze("preisProKwp", e.target.value)} placeholder="z. B. 95" />
          </Feld>
        ) : (
          <Feld id="g-gesamt" label="Kaufpreis gesamt (€)" pflicht hinweis={gesamt && mwp ? `entspricht ${fmt(Math.round(gesamt / (mwp * 1000)))} €/kWp` : undefined}>
            <input id="g-gesamt" inputMode="numeric" className={eingabe} value={w.preis} onChange={(e) => setze("preis", e.target.value)} placeholder="z. B. 2400000" />
          </Feld>
        )}
        <Feld id="g-gueltig" label="Gültig bis">
          <input id="g-gueltig" type="date" className={eingabe} value={w.gueltigBis} onChange={(e) => setze("gueltigBis", e.target.value)} />
        </Feld>
      </div>
      <Feld id="g-bed" label={GEBOT_PFLICHT.bedingungen} pflicht={pf.has("bedingungen")}>
        <textarea id="g-bed" rows={2} className={textbereich} value={w.bedingungen} onChange={(e) => setze("bedingungen", e.target.value)} placeholder="z. B. vorbehaltlich technischer und rechtlicher Due Diligence" />
      </Feld>
      <div className="grid gap-4 md:grid-cols-2">
        <Feld id="g-fin" label={GEBOT_PFLICHT.finanzierung} pflicht={pf.has("finanzierung")} hinweis="Art der Finanzierung und Nachweis (z. B. Zusage Investmentkomitee, Term Sheet der Bank)">
          <textarea id="g-fin" rows={2} className={textbereich} value={w.finanzierung} onChange={(e) => setze("finanzierung", e.target.value)} />
        </Feld>
        <Feld id="g-zeit" label={GEBOT_PFLICHT.zeitplan} pflicht={pf.has("zeitplan")}>
          <textarea id="g-zeit" rows={2} className={textbereich} value={w.zeitplan} onChange={(e) => setze("zeitplan", e.target.value)} placeholder="z. B. Signing in 10 Wochen, Closing bei RTB" />
        </Feld>
      </div>
      <p className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-500">
        <EyeOff aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Verdecktes Gebot: Andere Bieter sehen Ihr Angebot nie. Der Anbieter sieht es erst nach Freigabe durch ÖkoInvest – und nur anonymisiert. Kontaktangaben in Freitexten werden entfernt.
      </p>
      <Meldungen a={a} />
      <Button type="submit" icon={a.laeuft ? Loader2 : Send} disabled={a.laeuft}>{letztes ? `Gebot aktualisieren (Version ${letztes.version + 1})` : "Gebot verdeckt abgeben"}</Button>
    </form>
  );
}

function EigeneGebote({ vf }) {
  const a = useAktion();
  if (!vf.eigeneGebote?.length) return <p className="text-[14px] text-ink-500">Sie haben in diesem Verfahren noch kein Gebot abgegeben.</p>;
  return (
    <>
      <ul className="divide-y divide-ink-100">
        {vf.eigeneGebote.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="ov-num text-[15px] font-bold text-ink-900">{g.preisGesamt ? eur(g.preisGesamt) : "–"}{g.proKwp ? <span className="ml-2 text-[13px] font-medium text-ink-500">{fmt(g.proKwp)} €/kWp</span> : null}</p>
              <p className="text-[12.5px] text-ink-500">Runde {g.runde} · {RUNDEN_ARTEN[g.rundeArt]?.kurz} · Version {g.version} · {datumZeit(g.am)}</p>
            </div>
            <Badge ton={GEBOT_STATUS[g.status]?.ton}>{GEBOT_STATUS[g.status]?.label || g.status}</Badge>
            {g.status === "abgegeben" && g.runde === vf.runde.nr && vf.runde.offen && (
              <Button size="sm" variant="ghost" icon={Undo2} disabled={a.laeuft} onClick={() => confirm("Gebot wirklich zurückziehen?") && a.los(`/api/portal/bieter/gebote/${g.id}`, undefined, "Gebot zurückgezogen.", "DELETE")}>Zurückziehen</Button>
            )}
          </li>
        ))}
      </ul>
      <Meldungen a={a} />
    </>
  );
}

// ---------------------------------------------------------------- Vergleichsmatrix (Anbieter nach Freigabe, Backoffice)

function Matrix({ vf, rolle, mwp }) {
  const a = useAktion();
  const rundeNr = vf.runde.nr;
  const zeilen = vf.matrix || [];
  const bester = Math.max(0, ...zeilen.filter((g) => g.runde === rundeNr).map((g) => g.preisGesamt || 0));
  const zuschlagMoeglich = rolle === "admin" && vf.status === "auswertung";
  if (!zeilen.length) return <p className="text-[14px] text-ink-500">Noch keine Gebote eingegangen.</p>;
  return (
    <>
      <div className="-mx-5 overflow-x-auto md:-mx-6">
        <table className="w-full min-w-[760px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-100 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">
              {["Rang", "Bieter", "Runde", "Preis gesamt", "€/kWp", "Abstand", "Bedingungen", "Finanzierung", "Zeitplan", ""].map((k, i) => (
                <th key={i} scope="col" className="px-3 py-2.5 first:pl-5 md:first:pl-6">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {zeilen.map((g, i) => {
              const aktuell = g.runde === rundeNr;
              const rang = aktuell ? zeilen.filter((x) => x.runde === rundeNr && (x.preisGesamt || 0) > (g.preisGesamt || 0)).length + 1 : null;
              const abstand = aktuell && bester && g.preisGesamt ? Math.round(((g.preisGesamt - bester) / bester) * 1000) / 10 : null;
              return (
                <tr key={g.id} className={cn(!aktuell && "text-ink-500", g.status === "zuschlag" && "bg-ov-50/60")}>
                  <td className="px-3 py-3 pl-5 align-top md:pl-6">{rang ? <span className={cn("ov-num inline-flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] font-bold", rang === 1 ? "bg-ov-600 text-white" : "bg-ink-100 text-ink-700")}>{rang}</span> : "–"}</td>
                  <td className="px-3 py-3 align-top">
                    <span className="font-semibold text-ink-900">{g.von?.pseudonym}</span>
                    {g.von?.investor && <span className="block text-[12px] text-ink-500">{g.von.investor.vorname} {g.von.investor.nachname}{g.von.investor.firma ? ` · ${g.von.investor.firma}` : ""}</span>}
                    {g.von?.name && <span className="block text-[12px] text-ink-500">{g.von.name}{g.von.firma ? ` · ${g.von.firma}` : ""}</span>}
                    {g.status !== "abgegeben" && <Badge ton={GEBOT_STATUS[g.status]?.ton} className="mt-1">{GEBOT_STATUS[g.status]?.label}</Badge>}
                  </td>
                  <td className="px-3 py-3 align-top">{g.runde} · {RUNDEN_ARTEN[g.rundeArt]?.kurz}{g.version > 1 ? ` (v${g.version})` : ""}</td>
                  <td className="ov-num whitespace-nowrap px-3 py-3 align-top font-bold text-ink-900">{g.preisGesamt ? eur(g.preisGesamt) : "–"}</td>
                  <td className="ov-num px-3 py-3 align-top">{g.proKwp ? fmt(g.proKwp) : "–"}</td>
                  <td className="ov-num px-3 py-3 align-top">{abstand === null ? "" : abstand === 0 ? "bestes" : `${fmt(abstand, 1)} %`}</td>
                  <td className="max-w-[220px] px-3 py-3 align-top"><span className="line-clamp-3">{g.bedingungen || "–"}</span></td>
                  <td className="max-w-[200px] px-3 py-3 align-top"><span className="line-clamp-3">{g.finanzierung || "–"}</span></td>
                  <td className="max-w-[180px] px-3 py-3 align-top"><span className="line-clamp-3">{g.zeitplan || "–"}</span></td>
                  <td className="px-3 py-3 align-top">
                    {zuschlagMoeglich && g.status === "abgegeben" && (
                      <Button size="sm" variant="primary" icon={Trophy} disabled={a.laeuft} onClick={() => confirm(`Zuschlag an ${g.von?.pseudonym} (${g.preisGesamt ? eur(g.preisGesamt) : "–"})? Das Projekt wird reserviert, alle übrigen Bieter werden informiert.`) && a.los(`/api/admin/bieter/${vf.id}`, { aktion: "zuschlag", gebotId: g.id }, "Zuschlag erteilt – Projekt reserviert.")}>
                        Zuschlag
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {mwp ? <p className="mt-3 text-[12px] text-ink-500">Abstand bezogen auf das beste Gebot der aktuellen Runde. Gebote früherer Runden grau.</p> : null}
      <Meldungen a={a} />
    </>
  );
}

// ---------------------------------------------------------------- Backoffice

function StartFormular({ projektId, interessenten = [] }) {
  const berechtigt = interessenten.filter((i) => ["nda_freigegeben", "loi_abgegeben"].includes(i.status));
  const [w, setW] = useState({ art: "indikativ", frist: inTagen(14), pflicht: ["bedingungen", "finanzierung"], hinweis: "", teilnehmer: berechtigt.map((i) => i.id) });
  const a = useAktion();
  const umschalten = (feld, wert) => setW((x) => ({ ...x, [feld]: x[feld].includes(wert) ? x[feld].filter((y) => y !== wert) : [...x[feld], wert] }));
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        a.los("/api/admin/bieter", { projektId, art: w.art, frist: iso(w.frist), pflicht: w.pflicht, hinweis: w.hinweis, teilnehmer: w.teilnehmer }, "Bieterverfahren gestartet – Teilnehmer wurden benachrichtigt.");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Feld id="bv-art" label="Erste Runde">
          <select id="bv-art" className={auswahlfeld} value={w.art} onChange={(e) => setW((x) => ({ ...x, art: e.target.value }))}>
            {Object.entries(RUNDEN_ARTEN).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
          </select>
        </Feld>
        <Feld id="bv-frist" label="Angebotsfrist" pflicht>
          <input id="bv-frist" type="datetime-local" className={eingabe} value={w.frist} onChange={(e) => setW((x) => ({ ...x, frist: e.target.value }))} />
        </Feld>
      </div>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Pflichtangaben (Preis ist immer Pflicht)</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GEBOT_PFLICHT).map(([k, v]) => <Chip key={k} value={k} checked={w.pflicht.includes(k)} onChange={() => umschalten("pflicht", k)}>{v}</Chip>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Teilnehmer (Datenraum frei)</legend>
        {berechtigt.length ? (
          <div className="flex flex-wrap gap-2">
            {berechtigt.map((i) => <Chip key={i.id} value={i.id} checked={w.teilnehmer.includes(i.id)} onChange={() => umschalten("teilnehmer", i.id)}>{i.pseudonym} · {i.investor?.vorname} {i.investor?.nachname}</Chip>)}
          </div>
        ) : (
          <p className="text-[14px] text-ink-500">Noch keine Interessenten mit freigegebenem Datenraum.</p>
        )}
      </fieldset>
      <Feld id="bv-hinweis" label="Hinweis an die Bieter (optional)">
        <textarea id="bv-hinweis" rows={2} className={textbereich} value={w.hinweis} onChange={(e) => setW((x) => ({ ...x, hinweis: e.target.value }))} placeholder="z. B. Bewertungsgrundlage, Ablauf, Ansprechpartner im Backoffice" />
      </Feld>
      <Meldungen a={a} />
      <Button type="submit" icon={a.laeuft ? Loader2 : Play} disabled={a.laeuft || !berechtigt.length}>Bieterverfahren starten</Button>
    </form>
  );
}

function Steuerung({ vf, projekt }) {
  const a = useAktion();
  const [frist, setFrist] = useState(lokal(vf.runde.frist));
  const [grund, setGrund] = useState("");
  const [abbruch, setAbbruch] = useState(false);
  const geboten = (vf.teilnehmer || []).filter((t) => t.geboten).map((t) => t.interesseId);
  const [shortlist, setShortlist] = useState(geboten);
  const [nFrist, setNFrist] = useState(inTagen(21));
  const [kaufpreis, setKaufpreis] = useState(vf.zuschlag?.preisGesamt ? String(vf.zuschlag.preisGesamt) : "");
  const url = `/api/admin/bieter/${vf.id}`;
  const laufend = vf.status === "laufend";
  const auswertung = vf.status === "auswertung";

  return (
    <div className="space-y-5">
      {(laufend || auswertung) && (
        <div className="flex flex-wrap items-end gap-2">
          <Feld id="st-frist" label="Frist der Runde" className="w-full sm:w-auto">
            <input id="st-frist" type="datetime-local" className={cn(eingabe, "h-10")} value={frist} onChange={(e) => setFrist(e.target.value)} />
          </Feld>
          <Button size="sm" variant="secondary" disabled={a.laeuft} onClick={() => a.los(url, { aktion: "frist", frist: iso(frist) }, "Frist geändert – Teilnehmer benachrichtigt.")}>Frist setzen</Button>
          {laufend && <Button size="sm" variant="secondary" icon={Bell} disabled={a.laeuft} onClick={() => a.los(url, { aktion: "erinnern" })}>Erinnern</Button>}
          {laufend && <Button size="sm" variant="secondary" icon={Square} disabled={a.laeuft} onClick={() => confirm("Runde jetzt beenden? Danach sind keine Gebote mehr möglich.") && a.los(url, { aktion: "beenden" }, "Runde beendet.")}>Runde beenden</Button>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-[14px] text-ink-800">
          <input type="checkbox" className="h-4 w-4 accent-ov-600" checked={vf.anbieterFreigabe} disabled={a.laeuft} onChange={(e) => a.los(url, { aktion: "anbieterFreigabe", an: e.target.checked }, e.target.checked ? "Bieterstand für den Anbieter freigegeben (anonymisiert)." : "Bieterstand für den Anbieter gesperrt.")} />
          Bieterstand für den Anbieter freigeben (anonymisiert)
        </label>
      </div>
      {vf.teilnehmer?.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-700">Teilnehmer Runde {vf.runde.nr} {vf.erinnertAm ? <span className="font-normal text-ink-500">· erinnert {datumZeit(vf.erinnertAm)}</span> : null}</p>
          <ul className="flex flex-wrap gap-2">
            {vf.teilnehmer.map((t) => (
              <li key={t.interesseId} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] ring-1 ring-inset", t.geboten ? "bg-ov-50 text-ov-900 ring-ov-200" : "bg-white text-ink-600 ring-ink-200")}>
                {t.geboten ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> : <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ink-300" />}
                {t.pseudonym} · {t.investor?.vorname} {t.investor?.nachname}
                <span className="sr-only">{t.geboten ? "hat geboten" : "noch kein Gebot"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {auswertung && (
        <form
          className="rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70"
          onSubmit={(e) => {
            e.preventDefault();
            a.los(url, { aktion: "naechsteRunde", teilnehmer: shortlist, frist: iso(nFrist), art: "verbindlich" }, "Verbindliche Runde gestartet – Shortlist benachrichtigt, Zugang zu Stufe 2.");
          }}
        >
          <p className="font-display text-[15px] font-bold text-ink-900">Nächste Runde: verbindliche Angebote</p>
          <p className="mt-1 text-[13px] text-ink-600">Shortlist wählen – die Bieter erhalten Zugang zu Datenraum-Stufe 2.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(vf.teilnehmer || []).map((t) => (
              <Chip key={t.interesseId} value={t.interesseId} checked={shortlist.includes(t.interesseId)} onChange={() => setShortlist((s) => (s.includes(t.interesseId) ? s.filter((x) => x !== t.interesseId) : [...s, t.interesseId]))}>
                {t.pseudonym}{t.geboten ? "" : " (ohne Gebot)"}
              </Chip>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Feld id="nr-frist" label="Frist verbindliche Runde">
              <input id="nr-frist" type="datetime-local" className={cn(eingabe, "h-10")} value={nFrist} onChange={(e) => setNFrist(e.target.value)} />
            </Feld>
            <Button type="submit" size="sm" icon={Play} disabled={a.laeuft || !shortlist.length}>Runde starten</Button>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-500">Oder direkt in der Vergleichsmatrix einen Zuschlag erteilen.</p>
        </form>
      )}
      {vf.status === "zuschlag" && vf.zuschlag && (
        <div className="rounded-2xl bg-ov-50 p-4 ring-1 ring-inset ring-ov-200">
          <p className="flex items-center gap-2 font-display text-[15px] font-bold text-ov-900"><Trophy aria-hidden="true" className="h-4 w-4" /> Zuschlag an {vf.zuschlag.von?.pseudonym}{vf.zuschlag.von?.investor ? ` · ${vf.zuschlag.von.investor.vorname} ${vf.zuschlag.von.investor.nachname}` : ""}</p>
          <p className="mt-1 text-[13.5px] text-ov-900">{datumZeit(vf.zuschlag.am)} · Gebot {vf.zuschlag.preisGesamt ? eur(vf.zuschlag.preisGesamt) : "–"} · Projekt {statusLabel("projekt", projekt.status)}</p>
          {["veroeffentlicht", "reserviert"].includes(projekt.status) && (
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                a.los("/api/admin/status", { art: "projekt", id: projekt.id, nach: "verkauft", extra: { interesseId: vf.zuschlag.interesseId, kaufpreis: zahl(kaufpreis), kommentar: "Abschluss nach Bieterverfahren." } }, "Verkauf abgeschlossen – Provision automatisch berechnet.");
              }}
            >
              <Feld id="vk-preis" label="Kaufpreis laut Kaufvertrag (€)">
                <input id="vk-preis" inputMode="numeric" className={cn(eingabe, "h-10")} value={kaufpreis} onChange={(e) => setKaufpreis(e.target.value)} />
              </Feld>
              <Button type="submit" size="sm" icon={Coins} disabled={a.laeuft || !zahl(kaufpreis)}>Verkauf abschließen</Button>
            </form>
          )}
        </div>
      )}
      {(laufend || auswertung) && (
        <div>
          {abbruch ? (
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); a.los(url, { aktion: "abbrechen", grund }, "Verfahren abgebrochen."); }}>
              <label htmlFor="bv-grund" className="sr-only">Begründung</label>
              <input id="bv-grund" className={cn(eingabe, "h-10")} value={grund} onChange={(e) => setGrund(e.target.value)} placeholder="Begründung (interne Dokumentation)" />
              <Button type="submit" size="sm" variant="navy" disabled={a.laeuft || grund.trim().length < 3}>Abbrechen bestätigen</Button>
            </form>
          ) : (
            <Button size="sm" variant="ghost" icon={XCircle} onClick={() => setAbbruch(true)}>Verfahren abbrechen …</Button>
          )}
        </div>
      )}
      <Meldungen a={a} />
    </div>
  );
}

// ---------------------------------------------------------------- Bereich

export default function BieterBereich({ projekt, rolle, verfahren: vf, interessenten = [] }) {
  const beendet = !vf || ["abgebrochen", "abgeschlossen"].includes(vf?.status);
  const mwp = projekt.mwp;
  const matrixSichtbar = useMemo(() => rolle === "admin" || (rolle === "anbieter" && vf?.anbieterFreigabe), [rolle, vf]);

  return (
    <div className="space-y-6">
      {vf && (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-[17px] font-bold text-ink-900"><Gavel aria-hidden="true" className="h-5 w-5 text-ov-600" /> Bieterverfahren</h2>
          <Kopf vf={vf} />
        </section>
      )}

      {rolle === "investor" && (
        <>
          {!vf && <Hinweis ton="info" titel="Kein Bieterverfahren aktiv">Für dieses Projekt läuft derzeit kein strukturiertes Bieterverfahren. Sie können im Exposé eine Absichtserklärung (LOI) abgeben – ÖkoInvest informiert Sie, sobald ein Verfahren startet.</Hinweis>}
          {vf?.zuschlagEigen === true && <Hinweis ton="ok" titel="Zuschlag erhalten">Ihr Angebot hat den Zuschlag erhalten. Das Projekt ist für Sie reserviert – ÖkoInvest begleitet Due Diligence und Kaufvertrag.</Hinweis>}
          {vf?.zuschlagEigen === false && <Hinweis ton="neutral" titel="Verfahren entschieden">Der Zuschlag ging an einen anderen Bieter.</Hinweis>}
          {vf && vf.zugelassen && vf.runde.offen && (
            <section className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
              <h2 className="mb-4 font-display text-[17px] font-bold text-ink-900">Ihr Gebot · Runde {vf.runde.nr}</h2>
              <GebotFormular key={vf.eigeneGebote.length} vf={vf} mwp={mwp} />
            </section>
          )}
          {vf && !vf.zugelassen && vf.status === "laufend" && <Hinweis ton="neutral">Sie sind für die laufende Runde nicht zugelassen.</Hinweis>}
          {vf && vf.status === "auswertung" && <Hinweis ton="info" titel="Frist abgelaufen">Die Angebotsfrist ist abgelaufen. ÖkoInvest wertet die Angebote aus und meldet sich.</Hinweis>}
          {vf && (
            <section className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
              <h2 className="mb-2 font-display text-[17px] font-bold text-ink-900">Ihre Gebote</h2>
              <EigeneGebote vf={vf} />
            </section>
          )}
        </>
      )}

      {rolle === "anbieter" && (
        <>
          {!vf && <Hinweis ton="info" titel="Noch kein Bieterverfahren">ÖkoInvest startet das Verfahren, sobald genügend Interessenten den Datenraum geprüft haben. Sie werden benachrichtigt.</Hinweis>}
          {vf && !matrixSichtbar && <Hinweis ton="neutral" titel="Bieterstand noch nicht freigegeben">Die Gebote sind verdeckt. ÖkoInvest gibt Ihnen den anonymisierten Vergleich frei, sobald die Runde ausgewertet wird.</Hinweis>}
        </>
      )}

      {rolle === "admin" && (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
          <h2 className="mb-4 font-display text-[17px] font-bold text-ink-900">{beendet ? "Bieterverfahren starten" : "Steuerung"}</h2>
          {beendet ? (
            projekt.status === "veroeffentlicht" ? <StartFormular projektId={projekt.id} interessenten={interessenten} /> : <p className="text-[14px] text-ink-500">Ein Verfahren ist nur für veröffentlichte, nicht reservierte Projekte möglich (aktuell: {statusLabel("projekt", projekt.status)}).</p>
          ) : (
            <Steuerung key={`${vf.id}-${vf.status}-${vf.runde.nr}`} vf={vf} projekt={projekt} />
          )}
        </section>
      )}

      {vf && matrixSichtbar && (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-[17px] font-bold text-ink-900">Vergleichsmatrix</h2>
            {rolle === "anbieter" && <Badge ton="info"><EyeOff aria-hidden="true" className="h-3.5 w-3.5" /> anonymisiert</Badge>}
          </div>
          <Matrix vf={vf} rolle={rolle} mwp={mwp} />
        </section>
      )}
    </div>
  );
}
