"use client";

// Geführter Einstieg nach der Registrierung (4 Schritte je Rolle): Profil → erstes Objekt
// (Fläche / Suchprofil / Projekt / Anliegen) → Benachrichtigungen → fertig.
// Fortschrittsanzeige, jeder Schritt überspringbar, Zustand serverseitig am Konto
// (/api/portal/onboarding). Speichern über die bestehenden Portal-APIs.

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bell, Check, Compass, FolderPlus, Keyboard, LandPlot, Sparkles, UserRound, Zap, Users, Car, BatteryCharging, Building2, Gauge } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { BENACHRICHTIGUNG_ARTEN, LAENDER, PROJEKT_TYPEN, benachrichtigungArtenFuer, mailEinstellungenStandard } from "@/lib/plattform/konstanten";
import { OBJEKT_SCHRITT, ONBOARDING_SCHRITTE } from "@/lib/plattform/onboarding";
import { eingabe, auswahlfeld, labelKlasse, Chip, FehlerBox } from "@/components/Portal/felder";
import { FeldFehler, fehlerText, regeln, useFeldPruefung, zahlWert } from "../pruefung";
import { Tasten } from "../KuerzelTeile";

const SCHRITT_INFO = {
  profil: { titel: "Ihr Profil", icon: UserRound },
  objekt: { titel: "Erster Schritt", icon: Compass },
  benachrichtigungen: { titel: "Benachrichtigungen", icon: Bell },
  fertig: { titel: "Fertig", icon: Check },
};

async function zustandSpeichern(aenderung) {
  try {
    await senden("/api/portal/onboarding", { method: "PUT", body: aenderung });
  } catch {
    /* Fortschritt ist Komfort – ein Fehler darf den Einstieg nicht blockieren */
  }
}

export default function Assistent({ nutzer, rolle, startSchritt = 0, anzahl = {} }) {
  const router = useRouter();
  const [schritt, setSchritt] = useState(startSchritt);
  const [erledigt, setErledigt] = useState([]);
  const kopfRef = useRef(null);
  const ersterRender = useRef(true);
  const objektInfo = OBJEKT_SCHRITT[rolle] || OBJEKT_SCHRITT.mitglied;
  const name = ONBOARDING_SCHRITTE[schritt];

  useEffect(() => {
    if (ersterRender.current) {
      ersterRender.current = false;
      zustandSpeichern({ status: "laufend", schritt });
      return;
    }
    kopfRef.current?.focus();
  }, [schritt]);

  function weiter(merker) {
    const neu = merker ? [...new Set([...erledigt, merker])] : erledigt;
    setErledigt(neu);
    const naechster = Math.min(ONBOARDING_SCHRITTE.length - 1, schritt + 1);
    zustandSpeichern({ status: "laufend", schritt: naechster, erledigt: merker ? [merker] : [] });
    setSchritt(naechster);
  }

  async function beenden(status = "erledigt") {
    await zustandSpeichern({ status, erledigt: status === "erledigt" ? ["fertig"] : [] });
    router.push(rolle === "admin" ? "/portal/admin" : status === "erledigt" ? "/portal?hinweis=einstieg-fertig" : "/portal");
    router.refresh();
  }

  const quote = Math.round(((schritt + (name === "fertig" ? 1 : 0)) / ONBOARDING_SCHRITTE.length) * 100);

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">Geführter Einstieg</p>
        {name !== "fertig" && (
          <button type="button" onClick={() => beenden("uebersprungen")} className="text-[13.5px] font-semibold text-ink-500 underline-offset-4 hover:text-ink-800 hover:underline">
            Einführung überspringen
          </button>
        )}
      </div>

      {/* Fortschritt */}
      <div className="mt-3">
        <div className="h-2 rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={quote} aria-valuetext={`Schritt ${schritt + 1} von ${ONBOARDING_SCHRITTE.length}`} aria-label="Fortschritt des Einstiegs">
          <div className="h-2 rounded-full bg-ov-500 transition-[width] duration-500" style={{ width: `${Math.max(6, quote)}%` }} />
        </div>
        <ol className="mt-3 grid grid-cols-4 gap-2" aria-label="Schritte">
          {ONBOARDING_SCHRITTE.map((s, i) => {
            const info = s === "objekt" ? { ...SCHRITT_INFO.objekt, titel: objektInfo.kurz } : SCHRITT_INFO[s];
            const fertig = i < schritt;
            const aktiv = i === schritt;
            return (
              <li key={s} aria-current={aktiv ? "step" : undefined} className="min-w-0">
                <span className={cn("flex items-center gap-1.5 text-[12.5px] leading-tight", aktiv ? "font-semibold text-ink-900" : fertig ? "text-ov-700" : "text-ink-400")}>
                  <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", fertig ? "bg-ov-500 text-white" : aktiv ? "bg-navy-900 text-white" : "bg-ink-100 text-ink-500")}>
                    {fertig ? <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="truncate">{info.titel}</span>
                  {fertig && <span className="sr-only"> (erledigt)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <section aria-labelledby="einstieg-titel" className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 sm:p-8">
        {name === "profil" && <SchrittProfil nutzer={nutzer} kopfRef={kopfRef} weiter={weiter} />}
        {name === "objekt" && <SchrittObjekt rolle={rolle} info={objektInfo} kopfRef={kopfRef} weiter={weiter} anzahl={anzahl} nutzer={nutzer} />}
        {name === "benachrichtigungen" && <SchrittHinweise nutzer={nutzer} kopfRef={kopfRef} weiter={weiter} />}
        {name === "fertig" && <SchrittFertig rolle={rolle} kopfRef={kopfRef} beenden={beenden} erledigt={erledigt} />}
      </section>

      {schritt > 0 && name !== "fertig" && (
        <button type="button" onClick={() => setSchritt((s) => Math.max(0, s - 1))} className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-600 hover:text-ink-900">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Zurück
        </button>
      )}
    </div>
  );
}

function Kopf({ kopfRef, icon: Icon, titel, text }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-700">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <h1 id="einstieg-titel" ref={kopfRef} tabIndex={-1} className="font-display text-[24px] font-extrabold leading-tight tracking-tight text-ink-900 outline-none md:text-[28px]">{titel}</h1>
        {text && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{text}</p>}
      </div>
    </div>
  );
}

function Fuss({ laeuft, weiterText = "Speichern und weiter", ueberspringen, typ = "submit", onWeiter }) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
      {ueberspringen ? (
        <button type="button" onClick={ueberspringen} className="h-11 rounded-full px-4 text-[14.5px] font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900">Diesen Schritt überspringen</button>
      ) : <span />}
      <Button type={typ} onClick={onWeiter} disabled={laeuft} pfeil>{laeuft ? "Wird gespeichert …" : weiterText}</Button>
    </div>
  );
}

// ---------------------------------------------------------------- 1 Profil

const PROFIL_SCHEMA = {
  vorname: [regeln.pflicht("Bitte geben Sie Ihren Vornamen an."), regeln.laenge(1, 80, "Der Vorname")],
  nachname: [regeln.pflicht("Bitte geben Sie Ihren Nachnamen an."), regeln.laenge(1, 80, "Der Nachname")],
  telefon: [regeln.telefon()],
  firma: [regeln.laenge(0, 120, "Der Firmenname")],
};

function SchrittProfil({ nutzer, kopfRef, weiter }) {
  const id = useId();
  const [w, setW] = useState({ vorname: nutzer.vorname || "", nachname: nutzer.nachname || "", telefon: nutzer.telefon || "", firma: nutzer.firma || "" });
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const p = useFeldPruefung(PROFIL_SCHEMA);
  const setze = (k, v) => {
    const neu = { ...w, [k]: v };
    setW(neu);
    p.aendern(k, neu);
  };

  async function absenden(e) {
    e.preventDefault();
    if (!p.alles(w)) return;
    setLaeuft(true);
    setFehler("");
    try {
      await senden("/api/portal/profil", { method: "PATCH", body: w });
      weiter("profil");
    } catch (err) {
      setFehler(fehlerText(err));
    } finally {
      setLaeuft(false);
    }
  }

  const feld = (k, label, props = {}) => (
    <div className="min-w-0">
      <label htmlFor={`${id}-${k}`} className={labelKlasse}>{label}{PROFIL_SCHEMA[k][0] === regeln.pflicht ? "" : ""}</label>
      <input id={`${id}-${k}`} value={w[k]} onChange={(e) => setze(k, e.target.value)} className={cn(eingabe, p.fehler[k] && "ring-2 ring-red-400")} {...p.feldProps(k, `${id}-${k}`, w)} {...props} />
      <FeldFehler id={`${id}-${k}`} text={p.fehler[k]} />
    </div>
  );

  return (
    <form onSubmit={absenden} noValidate>
      <Kopf kopfRef={kopfRef} icon={UserRound} titel={`Willkommen, ${nutzer.vorname || "im Portal"}`} text="Zuerst ein kurzer Blick auf Ihre Kontaktdaten. Mit Telefonnummer können wir Rückfragen schneller klären – sie ist freiwillig." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {feld("vorname", "Vorname *", { autoComplete: "given-name", required: true })}
        {feld("nachname", "Nachname *", { autoComplete: "family-name", required: true })}
        {feld("telefon", "Telefon (empfohlen)", { autoComplete: "tel", inputMode: "tel", placeholder: "+49 …" })}
        {feld("firma", "Firma / Betrieb (optional)", { autoComplete: "organization" })}
      </div>
      <p className="mt-3 text-[12.5px] text-ink-500">* Pflichtangabe. E-Mail-Adresse: {nutzer.email}</p>
      <div className="mt-4"><FehlerBox>{fehler}</FehlerBox></div>
      <Fuss laeuft={laeuft} ueberspringen={() => weiter(null)} />
    </form>
  );
}

// ---------------------------------------------------------------- 2 Objekt (je Rolle)

function SchrittObjekt({ rolle, info, kopfRef, weiter, anzahl, nutzer }) {
  if (rolle === "flaeche") return <ObjektFlaeche info={info} kopfRef={kopfRef} weiter={weiter} anzahl={anzahl.flaechen || 0} />;
  if (rolle === "investor") return <ObjektSuchprofil info={info} kopfRef={kopfRef} weiter={weiter} vorhanden={nutzer.suchprofil} />;
  const karten = {
    anbieter: [
      { href: "/portal/projekte/neu", titel: "Projekt jetzt anlegen", text: "Titel, Typ, Leistung, Phase – Entwurf jederzeit speicherbar.", icon: FolderPlus },
      { href: "/projektboerse", titel: "Erst die Börse ansehen", text: "So sehen Investoren Ihren anonymen Teaser.", icon: Sparkles },
    ],
    unternehmen: [
      { href: "/reststrom", titel: "Reststrom-Pool", text: "Gebündelter Strombezug über das virtuelle Kraftwerk.", icon: Zap },
      { href: "/solarcarport", titel: "Solarcarport", text: "Parkplätze überdachen und Strom erzeugen.", icon: Car },
      { href: "/grossspeicher", titel: "Großspeicher", text: "Batteriespeicher für Gewerbe und Netz.", icon: BatteryCharging },
    ],
    mitglied: [
      { href: "/genossenschaft", titel: "Genossenschaft", text: "Beteiligung an Solarparks in Ihrer Region.", icon: Users },
      { href: "/energiegemeinschaften", titel: "Energiegemeinschaft", text: "Strom gemeinsam erzeugen und nutzen.", icon: Building2 },
    ],
    admin: [
      { href: "/portal/admin", titel: "Cockpit öffnen", text: "Kennzahlen, überfällige Aufgaben, neue Vorgänge.", icon: Gauge },
      { href: "/portal/admin/aufgaben", titel: "Meine Aufgaben", text: "Wiedervorlagen und Zuständigkeiten.", icon: Check },
    ],
  }[rolle] || [];
  return (
    <div>
      <Kopf kopfRef={kopfRef} icon={rolle === "anbieter" ? FolderPlus : Compass} titel={info.titel} text={info.text} />
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {karten.map((k) => {
          const Icon = k.icon;
          return (
            <li key={k.href}>
              <Link href={k.href} onClick={() => zustandSpeichern({ erledigt: ["objekt"], schritt: 2 })} className="group flex h-full gap-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/70 hover:ring-ov-300">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ov-700 ring-1 ring-ink-200/70"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 font-semibold text-ink-900 group-hover:text-ov-700">{k.titel} <ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
                  <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-600">{k.text}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[13px] text-ink-500">Sie können auch erst weitermachen – der Punkt bleibt in Ihrer Checkliste „Erste Schritte“.</p>
      <Fuss typ="button" weiterText="Weiter" onWeiter={() => weiter(null)} />
    </div>
  );
}

const FLAECHE_SCHEMA = {
  bezeichnung: [regeln.pflicht("Bitte geben Sie der Fläche einen Namen, z. B. „Acker am Mühlweg“."), regeln.laenge(3, 120, "Die Bezeichnung")],
  plz: [(v, alle) => regeln.plz(alle?.land)(v)],
  ort: [regeln.laenge(0, 80, "Der Ort")],
  ha: [regeln.zahl({ min: 0.01, max: 100000, einheit: "ha", was: "Die Größe" })],
};

function ObjektFlaeche({ info, kopfRef, weiter, anzahl }) {
  const id = useId();
  const [w, setW] = useState({ bezeichnung: "", land: "DE", plz: "", ort: "", ha: "", agri: false });
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const p = useFeldPruefung(FLAECHE_SCHEMA);
  const setze = (k, v) => {
    const neu = { ...w, [k]: v };
    setW(neu);
    p.aendern(k, neu);
    if (k === "land") p.aendern("plz", neu);
  };
  async function absenden(e) {
    e.preventDefault();
    if (!p.alles(w)) return;
    setLaeuft(true);
    setFehler("");
    try {
      const ha = zahlWert(w.ha);
      await senden("/api/portal/flaechen", { body: { bezeichnung: w.bezeichnung, land: w.land, plz: w.plz, ort: w.ort, ha: ha === null ? "" : ha, agri: w.agri, nutzung: "acker", einreichen: false } });
      weiter("objekt");
    } catch (err) {
      setFehler(fehlerText(err));
    } finally {
      setLaeuft(false);
    }
  }
  const feld = (k, label, props = {}, klasse = "") => (
    <div className={cn("min-w-0", klasse)}>
      <label htmlFor={`${id}-${k}`} className={labelKlasse}>{label}</label>
      <input id={`${id}-${k}`} value={w[k]} onChange={(e) => setze(k, e.target.value)} className={cn(eingabe, p.fehler[k] && "ring-2 ring-red-400")} {...p.feldProps(k, `${id}-${k}`, w)} {...props} />
      <FeldFehler id={`${id}-${k}`} text={p.fehler[k]} />
    </div>
  );
  return (
    <form onSubmit={absenden} noValidate>
      <Kopf kopfRef={kopfRef} icon={LandPlot} titel={info.titel} text={info.text} />
      {anzahl > 0 && <p className="mt-4 rounded-2xl bg-ov-50 px-4 py-3 text-[14px] text-ov-900 ring-1 ring-ov-200">Sie haben bereits {anzahl} {anzahl === 1 ? "Fläche" : "Flächen"} im Portal. Sie können eine weitere anlegen oder diesen Schritt überspringen.</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-6">
        {feld("bezeichnung", "Bezeichnung *", { placeholder: "z. B. Acker am Mühlweg", required: true }, "sm:col-span-6")}
        <div className="min-w-0 sm:col-span-2">
          <label htmlFor={`${id}-land`} className={labelKlasse}>Land</label>
          <select id={`${id}-land`} value={w.land} onChange={(e) => setze("land", e.target.value)} className={auswahlfeld}>
            {Object.entries(LAENDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {feld("plz", "PLZ", { inputMode: "numeric", autoComplete: "postal-code" }, "sm:col-span-2")}
        {feld("ha", "Größe in Hektar", { inputMode: "decimal", placeholder: "z. B. 12,5" }, "sm:col-span-2")}
        {feld("ort", "Ort / Gemeinde", { autoComplete: "address-level2" }, "sm:col-span-6")}
      </div>
      <label className="mt-4 flex items-start gap-3 text-[14px] text-ink-700">
        <input type="checkbox" checked={w.agri} onChange={(e) => setze("agri", e.target.checked)} className="mt-0.5 h-5 w-5 rounded accent-ov-600" />
        <span>Die Fläche soll landwirtschaftlich weiter genutzt werden (Agri-PV).</span>
      </label>
      <p className="mt-3 text-[12.5px] text-ink-500">Die Fläche wird als Entwurf gespeichert. Flurstücke, Unterlagen und die Einreichung zur Vorprüfung folgen auf der Flächenseite.</p>
      <div className="mt-4"><FehlerBox>{fehler}</FehlerBox></div>
      <Fuss laeuft={laeuft} weiterText="Fläche speichern" ueberspringen={() => weiter(null)} />
    </form>
  );
}

const SUCH_SCHEMA = {
  mwpMin: [regeln.zahl({ min: 0, max: 5000, einheit: "MWp", was: "Die Mindestgröße" })],
  mwpMax: [regeln.zahl({ min: 0, max: 5000, einheit: "MWp", was: "Die Höchstgröße" }), regeln.bereich("mwpMin", "Die Mindestgröße")],
};

function ObjektSuchprofil({ info, kopfRef, weiter, vorhanden }) {
  const id = useId();
  const [w, setW] = useState({
    typen: vorhanden?.typen || [],
    laender: vorhanden?.laender || [],
    mwpMin: vorhanden?.mwpMin ?? "",
    mwpMax: vorhanden?.mwpMax ?? "",
    benachrichtigen: vorhanden?.benachrichtigen ?? true,
  });
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const p = useFeldPruefung(SUCH_SCHEMA);
  const umschalten = (k, wert) => setW((x) => ({ ...x, [k]: x[k].includes(wert) ? x[k].filter((y) => y !== wert) : [...x[k], wert] }));
  const setze = (k, v) => {
    const neu = { ...w, [k]: v };
    setW(neu);
    p.aendern(k, neu);
    if (k === "mwpMin") p.aendern("mwpMax", neu);
  };
  async function absenden(e) {
    e.preventDefault();
    if (!p.alles(w)) return;
    setLaeuft(true);
    setFehler("");
    try {
      const n = (x) => (zahlWert(x) === null ? null : zahlWert(x));
      await senden("/api/portal/suchprofil", { method: "PUT", body: { ...(vorhanden || {}), typen: w.typen, laender: w.laender, mwpMin: n(w.mwpMin), mwpMax: n(w.mwpMax), benachrichtigen: w.benachrichtigen } });
      weiter("objekt");
    } catch (err) {
      setFehler(fehlerText(err));
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <form onSubmit={absenden} noValidate>
      <Kopf kopfRef={kopfRef} icon={Sparkles} titel={info.titel} text={info.text} />
      <fieldset className="mt-6">
        <legend className={labelKlasse}>Projekttypen</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PROJEKT_TYPEN).map(([k, v]) => <Chip key={k} name="typen" value={k} checked={w.typen.includes(k)} onChange={() => umschalten("typen", k)}>{v}</Chip>)}
        </div>
      </fieldset>
      <fieldset className="mt-5">
        <legend className={labelKlasse}>Länder</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(LAENDER).map(([k, v]) => <Chip key={k} name="laender" value={k} checked={w.laender.includes(k)} onChange={() => umschalten("laender", k)}>{v}</Chip>)}
        </div>
      </fieldset>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {["mwpMin", "mwpMax"].map((k) => (
          <div key={k} className="min-w-0">
            <label htmlFor={`${id}-${k}`} className={labelKlasse}>{k === "mwpMin" ? "Leistung ab (MWp)" : "Leistung bis (MWp)"}</label>
            <input id={`${id}-${k}`} inputMode="decimal" value={w[k]} onChange={(e) => setze(k, e.target.value)} className={cn(eingabe, p.fehler[k] && "ring-2 ring-red-400")} {...p.feldProps(k, `${id}-${k}`, w)} placeholder={k === "mwpMin" ? "z. B. 5" : "z. B. 50"} />
            <FeldFehler id={`${id}-${k}`} text={p.fehler[k]} />
          </div>
        ))}
      </div>
      <label className="mt-4 flex items-start gap-3 text-[14px] text-ink-700">
        <input type="checkbox" checked={w.benachrichtigen} onChange={(e) => setW((x) => ({ ...x, benachrichtigen: e.target.checked }))} className="mt-0.5 h-5 w-5 rounded accent-ov-600" />
        <span>Bei neuen passenden Projekten benachrichtigen (ab 70 % Passung, im Profil einstellbar).</span>
      </label>
      <p className="mt-3 text-[12.5px] text-ink-500">Phasen und Ticketgröße ergänzen Sie jederzeit unter „Profil & Suchprofil“.</p>
      <div className="mt-4"><FehlerBox>{fehler}</FehlerBox></div>
      <Fuss laeuft={laeuft} weiterText="Suchprofil speichern" ueberspringen={() => weiter(null)} />
    </form>
  );
}

// ---------------------------------------------------------------- 3 Benachrichtigungen

function SchrittHinweise({ nutzer, kopfRef, weiter }) {
  const arten = benachrichtigungArtenFuer(nutzer.rollen || []);
  const [w, setW] = useState(() => ({ ...mailEinstellungenStandard(), ...(nutzer.mailEinstellungen || {}) }));
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  async function absenden(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      await senden("/api/portal/benachrichtigungen", { method: "PUT", body: { einstellungen: Object.fromEntries(arten.map((k) => [k, !!w[k]])) } });
      weiter("benachrichtigungen");
    } catch (err) {
      setFehler(fehlerText(err));
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <form onSubmit={absenden}>
      <Kopf kopfRef={kopfRef} icon={Bell} titel="Worüber sollen wir Sie per E-Mail informieren?" text="Im Portal sehen Sie alles in der Glocke oben rechts. Per E-Mail kommt nur, was Sie hier wählen – ohne vertrauliche Inhalte." />
      <fieldset className="mt-6">
        <legend className="sr-only">E-Mail-Benachrichtigungen</legend>
        <ul className="divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-200/70">
          {arten.map((k) => {
            const a = BENACHRICHTIGUNG_ARTEN[k];
            return (
              <li key={k}>
                <label className="flex cursor-pointer items-start gap-3 px-4 py-3.5 hover:bg-sand-50">
                  <input type="checkbox" checked={!!w[k]} onChange={(e) => setW((x) => ({ ...x, [k]: e.target.checked }))} className="mt-0.5 h-5 w-5 shrink-0 rounded accent-ov-600" />
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold text-ink-900">{a.label}</span>
                    <span className="block text-[13px] leading-snug text-ink-500">{a.text}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <div className="mt-4"><FehlerBox>{fehler}</FehlerBox></div>
      <Fuss laeuft={laeuft} weiterText="Einstellungen speichern" ueberspringen={() => weiter(null)} />
    </form>
  );
}

// ---------------------------------------------------------------- 4 Fertig

function SchrittFertig({ rolle, kopfRef, beenden }) {
  const [laeuft, setLaeuft] = useState(false);
  return (
    <div>
      <Kopf kopfRef={kopfRef} icon={Check} titel="Alles bereit" text="Ihr Portal ist eingerichtet. Offene Punkte finden Sie jederzeit in der Checkliste „Erste Schritte“ auf der Übersicht." />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/70">
          <p className="flex items-center gap-2 font-semibold text-ink-900"><Keyboard aria-hidden="true" className="h-4 w-4 text-ov-700" /> Schnell ans Ziel</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">Mit <Tasten tasten={["Strg", "K"]} /> (Mac: ⌘ K) suchen Sie Flächen, Projekte, Nachrichten und Aktionen.</p>
        </div>
        <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/70">
          <p className="flex items-center gap-2 font-semibold text-ink-900"><Compass aria-hidden="true" className="h-4 w-4 text-ov-700" /> Hilfe an Fachbegriffen</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">Das kleine Fragezeichen neben Begriffen wie NDA oder LOI erklärt, was gemeint ist.</p>
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" href="/portal/hilfe">Hilfe ansehen</Button>
        <Button pfeil disabled={laeuft} onClick={async () => { setLaeuft(true); await beenden("erledigt"); }}>
          {rolle === "admin" ? "Zum Cockpit" : "Zur Übersicht"}
        </Button>
      </div>
    </div>
  );
}
