"use client";

// Inline-Formulare der Onboarding-Assistenten (Team B1): Profil, Untertyp, Suchprofil, Ticket & Struktur, Fläche/Dach,
// Benachrichtigungen. Gespeichert wird ausschließlich über die bestehenden Portal-APIs (Rechte/Validierung dort);
// danach lädt der Assistent den Stand aus echten Daten neu.

import { useEffect, useId, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { cn } from "@/components/ui/cn";
import Textfeldbaustein from "@/components/formular/Textfeld";
import { AbsendeKnopf, useAbsenden } from "@/components/formular/Absenden";
import { FormFehler } from "@/components/formular/Meldungen";
import { checkboxKlasse } from "@/components/formular/stil";
import { senden } from "@/lib/plattform/client";
import { BENACHRICHTIGUNG_ARTEN, LAENDER, PROJEKT_TYPEN, benachrichtigungArtenFuer, mailEinstellungenStandard } from "@/lib/plattform/konstanten";
import { DEAL_STRUKTUREN, ESG_ANFORDERUNGEN, FINANZIERUNGSWEISEN } from "@/lib/plattform/fach/suchprofil";
import { PHASEN } from "@/lib/invest/markt";
import { UNTERTYP_ZU_INVESTOR_TYP } from "@/lib/plattform/onboarding/pfade";
import { labelKlasse, Chip } from "@/components/Portal/felder";
import { fehlerText, regeln, useFeldPruefung, zahlWert } from "../pruefung";

/**
 * Gemeinsamer Rahmen: Absenden → API → Erfolgshäkchen im Knopf → Toast → onGespeichert() (Assistent lädt neu
 * und springt zum nächsten Schritt). Fehler in Klartext über fehlerText.
 */
function useSenden(onGespeichert) {
  const a = useAbsenden();
  async function los(fn) {
    await a.los(fn, {
      haltezeit: 700,
      toast: { titel: "Gespeichert", text: "Ihre Angaben sind übernommen." },
      danach: async () => {
        try {
          await onGespeichert();
        } catch (e) {
          a.setFehler(fehlerText(e));
        }
      },
    });
  }
  return { laeuft: a.status !== "bereit", status: a.status, fehler: a.fehler, los };
}

function Absenden({ status, text = "Speichern und weiter" }) {
  return (
    <div className="mt-6 flex justify-end">
      <AbsendeKnopf status={status} pfeil laedtText="Wird gespeichert …" erfolgText="Gespeichert" className="max-sm:w-full">
        {text}
      </AbsendeKnopf>
    </div>
  );
}

/** Feld mit Inline-Prüfung (pruefung.js) auf Basis des gemeinsamen Textfeld-Bausteins */
function Textfeld({ id, k, label, w, setze, p, props = {}, klasse = "", pflicht = false, optional = false, hinweis }) {
  const fid = `${id}-${k}`;
  const fp = p ? p.feldProps(k, fid, w) : {};
  const fehler = p?.fehler[k] || "";
  const gueltig = !!p?.beruehrt?.[k] && !fehler && String(w[k] ?? "").trim() !== "";
  return (
    <Textfeldbaustein
      id={fid}
      label={label}
      pflicht={pflicht}
      optional={optional}
      hinweis={hinweis}
      fehler={fehler}
      gueltig={gueltig}
      className={klasse}
      value={w[k]}
      onChange={(e) => setze(k, e.target.value)}
      onBlur={fp.onBlur}
      data-feld={fp["data-feld"]}
      {...props}
      required={undefined}
    />
  );
}

/** Auswahlliste im gemeinsamen Stil */
function Auswahl({ id, label, value, onChange, children }) {
  return (
    <Textfeldbaustein als="select" id={id} label={label} value={value} onChange={onChange}>
      {children}
    </Textfeldbaustein>
  );
}

// ---------------------------------------------------------------- Untertyp

export function UntertypWahl({ schritt, pfad, onWahl }) {
  const [laeuft, setLaeuft] = useState("");
  const [fehler, setFehler] = useState("");
  return (
    <div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2" role="list">
        {pfad.untertypen.map((u) => {
          const aktiv = pfad.untertyp === u.id;
          return (
            <li key={u.id}>
              <button
                type="button"
                aria-pressed={aktiv}
                disabled={!!laeuft}
                onClick={async () => {
                  setLaeuft(u.id);
                  setFehler("");
                  try {
                    await onWahl(u.id);
                  } catch (e) {
                    setFehler(fehlerText(e));
                  } finally {
                    setLaeuft("");
                  }
                }}
                className={cn("flex h-full w-full flex-col items-start gap-1 rounded-2xl p-4 text-left ring-1 ring-inset transition-colors", aktiv ? "bg-ov-50 ring-2 ring-ov-500" : "bg-sand-50 ring-ink-200/70 hover:ring-ov-300")}
              >
                <span className="font-semibold text-ink-900">{u.label}{laeuft === u.id ? " …" : ""}</span>
                {u.text && <span className="text-[13.5px] leading-snug text-ink-600">{u.text}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {schritt.erledigt && !pfad.untertypGewaehlt && <p className="mt-3 text-[13px] text-ink-500">Vorgeschlagen aus Ihren Daten – bitte bestätigen oder ändern.</p>}
      <div className="mt-4"><FormFehler>{fehler}</FormFehler></div>
    </div>
  );
}

// ---------------------------------------------------------------- Profil

const PROFIL_SCHEMA = (firmaPflicht) => ({
  vorname: [regeln.pflicht("Bitte geben Sie Ihren Vornamen an."), regeln.laenge(1, 80, "Der Vorname")],
  nachname: [regeln.pflicht("Bitte geben Sie Ihren Nachnamen an."), regeln.laenge(1, 80, "Der Nachname")],
  telefon: [regeln.telefon()],
  firma: [...(firmaPflicht ? [regeln.pflicht("Bitte geben Sie die Firma bzw. Organisation an.")] : []), regeln.laenge(0, 120, "Der Name")],
});

export function ProfilFormular({ nutzer, schritt, untertyp, onGespeichert }) {
  const id = useId();
  const firmaPflicht = !!schritt.firmaLabel && untertyp !== "privat";
  const [w, setW] = useState({ vorname: nutzer.vorname || "", nachname: nutzer.nachname || "", telefon: nutzer.telefon || "", firma: nutzer.firma || "" });
  const p = useFeldPruefung(PROFIL_SCHEMA(firmaPflicht));
  const s = useSenden(onGespeichert);
  const setze = (k, v) => {
    const neu = { ...w, [k]: v };
    setW(neu);
    p.aendern(k, neu);
  };
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); if (p.alles(w)) s.los(() => senden("/api/portal/profil", { method: "PATCH", body: w })); }}>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Textfeld id={id} k="vorname" label="Vorname" pflicht w={w} setze={setze} p={p} props={{ autoComplete: "given-name" }} />
        <Textfeld id={id} k="nachname" label="Nachname" pflicht w={w} setze={setze} p={p} props={{ autoComplete: "family-name" }} />
        <Textfeld id={id} k="telefon" label="Telefon" optional w={w} setze={setze} p={p} hinweis="Mit Vorwahl, z. B. +49 8245 123456." props={{ type: "tel", autoComplete: "tel", inputMode: "tel" }} />
        <Textfeld id={id} k="firma" label={schritt.firmaLabel || "Firma / Betrieb"} pflicht={firmaPflicht} optional={!firmaPflicht} w={w} setze={setze} p={p} props={{ autoComplete: "organization" }} />
      </div>
      <p className="mt-3 text-[13px] text-ink-500"><span aria-hidden="true" className="text-ov-700">*</span> Pflichtangabe · E-Mail-Adresse: {nutzer.email}</p>
      <div className="mt-4"><FormFehler>{s.fehler}</FormFehler></div>
      <Absenden status={s.status} />
    </form>
  );
}

// ---------------------------------------------------------------- Suchprofil (Investor)

const SUCH_SCHEMA = {
  mwpMin: [regeln.zahl({ min: 0, max: 5000, einheit: "MWp", was: "Die Mindestgröße" })],
  mwpMax: [regeln.zahl({ min: 0, max: 5000, einheit: "MWp", was: "Die Höchstgröße" }), regeln.bereich("mwpMin", "Die Mindestgröße")],
};

const umschalten = (setW, k, wert) => setW((x) => ({ ...x, [k]: x[k].includes(wert) ? x[k].filter((y) => y !== wert) : [...x[k], wert] }));
const n0 = (x) => (zahlWert(x) === null ? null : zahlWert(x));

export function SuchprofilFormular({ nutzer, untertyp, onGespeichert }) {
  const id = useId();
  const v = nutzer.suchprofil || {};
  const [w, setW] = useState({ typen: v.typen || [], laender: v.laender || [], phasen: v.phasen || [], mwpMin: v.mwpMin ?? "", mwpMax: v.mwpMax ?? "", benachrichtigen: v.benachrichtigen ?? true });
  const p = useFeldPruefung(SUCH_SCHEMA);
  const s = useSenden(onGespeichert);
  const setze = (k, x) => {
    const neu = { ...w, [k]: x };
    setW(neu);
    p.aendern(k, neu);
    if (k === "mwpMin") p.aendern("mwpMax", neu);
  };
  const absenden = (e) => {
    e.preventDefault();
    if (!p.alles(w)) return;
    const investorTyp = UNTERTYP_ZU_INVESTOR_TYP[untertyp] && !v.investorTyp ? UNTERTYP_ZU_INVESTOR_TYP[untertyp] : v.investorTyp;
    s.los(() => senden("/api/portal/suchprofil", { method: "PUT", body: { ...v, typen: w.typen, laender: w.laender, phasen: w.phasen, mwpMin: n0(w.mwpMin), mwpMax: n0(w.mwpMax), benachrichtigen: w.benachrichtigen, investorTyp } }));
  };
  return (
    <form noValidate onSubmit={absenden}>
      <fieldset className="mt-5">
        <legend className={labelKlasse}>Projekttypen</legend>
        <div className="flex flex-wrap gap-2">{Object.entries(PROJEKT_TYPEN).map(([k, t]) => <Chip key={k} name="typen" value={k} checked={w.typen.includes(k)} onChange={() => umschalten(setW, "typen", k)}>{t}</Chip>)}</div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className={labelKlasse}>Länder</legend>
        <div className="flex flex-wrap gap-2">{Object.entries(LAENDER).map(([k, t]) => <Chip key={k} name="laender" value={k} checked={w.laender.includes(k)} onChange={() => umschalten(setW, "laender", k)}>{t}</Chip>)}</div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className={labelKlasse}>Projektphasen</legend>
        <div className="flex flex-wrap gap-2">{PHASEN.map((ph) => <Chip key={ph.id} name="phasen" value={ph.id} checked={w.phasen.includes(ph.id)} onChange={() => umschalten(setW, "phasen", ph.id)}>{ph.kurz}</Chip>)}</div>
      </fieldset>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Textfeld id={id} k="mwpMin" label="Leistung ab (MWp)" w={w} setze={setze} p={p} props={{ inputMode: "decimal", placeholder: "z. B. 5" }} />
        <Textfeld id={id} k="mwpMax" label="Leistung bis (MWp)" w={w} setze={setze} p={p} props={{ inputMode: "decimal", placeholder: "z. B. 50" }} />
      </div>
      <label className="mt-4 flex items-start gap-3 text-[14px] text-ink-700">
        <input type="checkbox" checked={w.benachrichtigen} onChange={(e) => setW((x) => ({ ...x, benachrichtigen: e.target.checked }))} className={checkboxKlasse} />
        <span>Bei neuen passenden Projekten benachrichtigen (ab 70 % Passung, im Profil einstellbar).</span>
      </label>
      <div className="mt-4"><FormFehler>{s.fehler}</FormFehler></div>
      <Absenden status={s.status} text="Suchprofil speichern" />
    </form>
  );
}

// ---------------------------------------------------------------- Ticket & Struktur (Investor)

const TICKET_SCHEMA = {
  ticketMin: [regeln.zahl({ min: 0, max: 1e10, einheit: "€", was: "Das Mindestticket" })],
  ticketMax: [regeln.zahl({ min: 0, max: 1e10, einheit: "€", was: "Das Höchstticket" }), regeln.bereich("ticketMin", "Das Mindestticket")],
  renditeZielPct: [regeln.zahl({ min: 0, max: 30, einheit: "%", was: "Das Rendite-Ziel" })],
};

export function TicketFormular({ nutzer, untertyp, onGespeichert }) {
  const id = useId();
  const v = nutzer.suchprofil || {};
  const [w, setW] = useState({
    ticketMin: v.ticketMin ?? "", ticketMax: v.ticketMax ?? "", renditeZielPct: v.renditeZielPct ?? "", renditeBasis: v.renditeBasis || "ek",
    dealStrukturen: v.dealStrukturen || [], finanzierung: v.finanzierung || "", esg: v.esg || [],
  });
  const p = useFeldPruefung(TICKET_SCHEMA);
  const s = useSenden(onGespeichert);
  const setze = (k, x) => {
    const neu = { ...w, [k]: x };
    setW(neu);
    p.aendern(k, neu);
    if (k === "ticketMin") p.aendern("ticketMax", neu);
  };
  const absenden = (e) => {
    e.preventDefault();
    if (!p.alles(w)) return;
    s.los(() => senden("/api/portal/suchprofil", { method: "PUT", body: { ...v, ticketMin: n0(w.ticketMin), ticketMax: n0(w.ticketMax), renditeZielPct: n0(w.renditeZielPct), renditeBasis: w.renditeBasis, dealStrukturen: w.dealStrukturen, finanzierung: w.finanzierung, esg: w.esg } }));
  };
  return (
    <form noValidate onSubmit={absenden}>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Textfeld id={id} k="ticketMin" label="Eigenkapital je Transaktion ab (€)" w={w} setze={setze} p={p} props={{ inputMode: "decimal", placeholder: "z. B. 2000000" }} />
        <Textfeld id={id} k="ticketMax" label="bis (€)" w={w} setze={setze} p={p} props={{ inputMode: "decimal", placeholder: "z. B. 25000000" }} />
        <Textfeld id={id} k="renditeZielPct" label="Rendite-Ziel (% p. a.)" w={w} setze={setze} p={p} props={{ inputMode: "decimal", placeholder: "z. B. 7,5" }} />
        <Auswahl id={`${id}-basis`} label="Basis des Rendite-Ziels" value={w.renditeBasis} onChange={(e) => setze("renditeBasis", e.target.value)}>
          <option value="ek">Eigenkapital-IRR</option>
          <option value="projekt">Projekt-IRR</option>
        </Auswahl>
      </div>
      <fieldset className="mt-4">
        <legend className={labelKlasse}>Deal-Struktur</legend>
        <div className="flex flex-wrap gap-2">{Object.entries(DEAL_STRUKTUREN).map(([k, t]) => <Chip key={k} name="dealStrukturen" value={k} checked={w.dealStrukturen.includes(k)} onChange={() => umschalten(setW, "dealStrukturen", k)}>{t}</Chip>)}</div>
      </fieldset>
      <div className="mt-4">
        <Auswahl id={`${id}-fin`} label="Finanzierungsweise" value={w.finanzierung} onChange={(e) => setze("finanzierung", e.target.value)}>
          <option value="">Bitte wählen</option>
          {Object.entries(FINANZIERUNGSWEISEN).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </Auswahl>
      </div>
      {(untertyp === "fonds" || untertyp === "stadtwerk" || w.esg.length > 0) && (
        <fieldset className="mt-4">
          <legend className={labelKlasse}>ESG-Anforderungen</legend>
          <div className="flex flex-wrap gap-2">{Object.entries(ESG_ANFORDERUNGEN).map(([k, t]) => <Chip key={k} name="esg" value={k} checked={w.esg.includes(k)} onChange={() => umschalten(setW, "esg", k)}>{t}</Chip>)}</div>
        </fieldset>
      )}
      <div className="mt-4"><FormFehler>{s.fehler}</FormFehler></div>
      <Absenden status={s.status} />
    </form>
  );
}

// ---------------------------------------------------------------- Fläche / Dach

const FLAECHE_SCHEMA = (dach) => ({
  bezeichnung: [regeln.pflicht(dach ? "Bitte geben Sie dem Dach einen Namen, z. B. „Halle Nord“." : "Bitte geben Sie der Fläche einen Namen, z. B. „Acker am Mühlweg“."), regeln.laenge(3, 120, "Die Bezeichnung")],
  plz: [(x, alle) => regeln.plz(alle?.land)(x)],
  ort: [regeln.laenge(0, 80, "Der Ort")],
  groesse: [dach ? regeln.zahl({ min: 50, max: 500000, einheit: "m²", was: "Die Dachfläche" }) : regeln.zahl({ min: 0.01, max: 100000, einheit: "ha", was: "Die Größe" })],
});

/** Jüngste eigene Anfrage aus dem öffentlichen Flächencheck (für „Aus Flächencheck übernehmen“) */
function useFlaechencheck(aktiv) {
  const [anfrage, setAnfrage] = useState(null);
  useEffect(() => {
    if (!aktiv) return;
    let ab = false;
    senden("/api/portal/vorgaenge", { method: "GET" })
      .then((r) => {
        const liste = (r?.vorgaenge || []).filter((v) => ["flaeche", "agri"].includes(v.typ) && v.daten?.quelle === "flaechencheck" && v.daten?.eingaben);
        liste.sort((a, b) => String(b.erstellt || b.datum || "").localeCompare(String(a.erstellt || a.datum || "")));
        if (!ab) setAnfrage(liste[0] || null);
      })
      .catch(() => {});
    return () => {
      ab = true;
    };
  }, [aktiv]);
  return anfrage;
}

const haZahl = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Math.round(Number(x) * 100) / 100 : null);
const haAnzeige = (x) => String(x).replace(".", ",");

export function FlaecheFormular({ untertyp, anzahl = 0, onGespeichert }) {
  const id = useId();
  const dach = untertyp === "dach";
  const [w, setW] = useState({ bezeichnung: "", land: "DE", plz: "", ort: "", groesse: "", agri: untertyp === "landwirt" });
  const p = useFeldPruefung(FLAECHE_SCHEMA(dach));
  const s = useSenden(onGespeichert);
  const check = useFlaechencheck(!dach);
  const ce = check?.daten?.eingaben || null;
  const ceHa = ce ? haZahl(ce.flaecheHa) : null;
  /** Flächen-Entwurf direkt aus dem Flächencheck anlegen – keine Doppelerfassung (UX-Audit P1-8) */
  const uebernehmen = () => {
    if (!ce) return;
    const land = LAENDER[ce.land] ? ce.land : "DE";
    const agri = untertyp === "landwirt" || /agri/i.test(String(check.typ || ""));
    s.los(() => senden("/api/portal/flaechen", { body: { bezeichnung: `Fläche aus dem Flächencheck${ce.region ? ` – ${ce.region}` : ""}`.slice(0, 120), land, plz: "", ort: "", ha: ceHa ?? "", agri, nutzung: "acker", einreichen: false } }));
  };
  const setze = (k, x) => {
    const neu = { ...w, [k]: x };
    setW(neu);
    p.aendern(k, neu);
    if (k === "land") p.aendern("plz", neu);
  };
  const absenden = (e) => {
    e.preventDefault();
    if (!p.alles(w)) return;
    const g = zahlWert(w.groesse);
    const ha = g === null ? "" : dach ? Math.round((g / 10000) * 10000) / 10000 : g;
    s.los(() => senden("/api/portal/flaechen", { body: { bezeichnung: w.bezeichnung, land: w.land, plz: w.plz, ort: w.ort, ha, agri: !dach && w.agri, nutzung: dach ? "dach" : "acker", einreichen: false } }));
  };
  return (
    <form noValidate onSubmit={absenden}>
      {anzahl > 0 && <p className="mt-4 rounded-2xl bg-ov-50 px-4 py-3 text-[14px] text-ov-900 ring-1 ring-ov-200">Sie haben bereits {anzahl} {anzahl === 1 ? "Objekt" : "Objekte"} im Portal – dieser Schritt ist erledigt. Sie können ein weiteres anlegen.</p>}
      {ce && anzahl === 0 && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-sand-200 animate-ov-einblenden sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-ov-200">
              <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[14.5px] font-semibold text-ink-900">Ihr Flächencheck liegt vor</p>
              <p className="text-[13.5px] leading-snug text-ink-600">{[ceHa ? `${haAnzeige(ceHa)} ha` : null, ce.nutzung, ce.region].filter(Boolean).join(" · ")} – als Entwurf übernehmen, Details später ergänzen.</p>
            </div>
          </div>
          <button type="button" onClick={uebernehmen} disabled={s.laeuft} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-[14.5px] font-semibold text-ov-800 ring-1 ring-inset ring-ov-300 transition-colors hover:bg-ov-50 disabled:opacity-60">
            Aus Flächencheck übernehmen
          </button>
        </div>
      )}
      {ce && anzahl === 0 && <p className="mt-4 text-[13px] text-ink-500">Oder eine andere Fläche von Hand anlegen:</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-6">
        <Textfeld id={id} k="bezeichnung" label="Bezeichnung" pflicht w={w} setze={setze} p={p} hinweis={dach ? "Ein Name, unter dem Sie das Dach wiederfinden, z. B. „Halle Nord“." : "Ein Name, unter dem Sie die Fläche wiederfinden, z. B. „Acker am Mühlweg“."} klasse="sm:col-span-6" />
        <div className="min-w-0 sm:col-span-2">
          <Auswahl id={`${id}-land`} label="Land" value={w.land} onChange={(e) => setze("land", e.target.value)}>
            {Object.entries(LAENDER).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </Auswahl>
        </div>
        <Textfeld id={id} k="plz" label="PLZ" w={w} setze={setze} p={p} props={{ inputMode: "numeric", autoComplete: "postal-code" }} klasse="sm:col-span-2" />
        <Textfeld id={id} k="groesse" label={dach ? "Dachfläche in m²" : "Größe in Hektar"} w={w} setze={setze} p={p} props={{ inputMode: "decimal", placeholder: dach ? "z. B. 4.500" : "z. B. 12,5" }} klasse="sm:col-span-2" />
        <Textfeld id={id} k="ort" label="Ort / Gemeinde" w={w} setze={setze} p={p} props={{ autoComplete: "address-level2" }} klasse="sm:col-span-6" />
      </div>
      {!dach && (
        <label className="mt-4 flex items-start gap-3 text-[14px] text-ink-700">
          <input type="checkbox" checked={w.agri} onChange={(e) => setze("agri", e.target.checked)} className={checkboxKlasse} />
          <span>Die Fläche soll landwirtschaftlich weiter genutzt werden (Agri-PV).</span>
        </label>
      )}
      <p className="mt-3 text-[13px] text-ink-500">Gespeichert als Entwurf. Flurstücke, Fachangaben und Unterlagen folgen auf der Flächenseite.</p>
      <div className="mt-4"><FormFehler>{s.fehler}</FormFehler></div>
      <Absenden status={s.status} text={dach ? "Dach speichern" : "Fläche speichern"} />
    </form>
  );
}

// ---------------------------------------------------------------- Benachrichtigungen

export function BenachrichtigungenFormular({ nutzer, onGespeichert }) {
  const arten = benachrichtigungArtenFuer(nutzer.rollen || []);
  const [w, setW] = useState(() => ({ ...mailEinstellungenStandard(), ...(nutzer.mailEinstellungen || {}) }));
  const s = useSenden(onGespeichert);
  return (
    <form onSubmit={(e) => { e.preventDefault(); s.los(() => senden("/api/portal/benachrichtigungen", { method: "PUT", body: { einstellungen: Object.fromEntries(arten.map((k) => [k, !!w[k]])) } })); }}>
      <fieldset className="mt-5">
        <legend className="sr-only">E-Mail-Benachrichtigungen</legend>
        <ul className="divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-200/70">
          {arten.map((k) => (
            <li key={k}>
              <label className="flex cursor-pointer items-start gap-3 px-4 py-3.5 hover:bg-sand-50">
                <input type="checkbox" checked={!!w[k]} onChange={(e) => setW((x) => ({ ...x, [k]: e.target.checked }))} className={checkboxKlasse} />
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-semibold text-ink-900">{BENACHRICHTIGUNG_ARTEN[k].label}</span>
                  <span className="block text-[13px] leading-snug text-ink-500">{BENACHRICHTIGUNG_ARTEN[k].text}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <div className="mt-4"><FormFehler>{s.fehler}</FormFehler></div>
      <Absenden status={s.status} text="Einstellungen speichern" />
    </form>
  );
}
