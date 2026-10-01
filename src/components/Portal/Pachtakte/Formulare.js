"use client";

// Pachtakte (Team 1): Formulare für Eigentümer und Backoffice – Anliegen stellen, Schritte ausführen (Antwort,
// Zurückziehen, Rückbau-Abnahme, Backoffice-Bearbeitung), Agri-PV-Bewirtschaftungsnachweis mit Live-Prüfung.
// Alle Regeln prüft der Server erneut (lib/plattform/pachtakte.js); hier nur Komfort und sofortige Rückmeldung.

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ErfolgBox, Feld, FehlerBox, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import {
  AGRI_BEWIRTSCHAFTER, AGRI_NACHWEIS_ARTEN, AGRI_NACHWEIS_EINHEITEN, AGRI_NACHWEIS_KULTUREN, ANLIEGEN_ARTEN, AUFTEILUNG_GRUNDLAGEN, ERBNACHWEISE,
  JA_NEIN_ENTFAELLT, KUENDIGUNG_GRUENDE, SICHERHEIT_ARTEN as SICHERHEIT_ARTEN_CLIENT, VERLAENGERUNG_WUENSCHE, WECHSEL_ANLAESSE, agriNachweisBereinigen, agriNachweisPruefen, anliegenInfo, datumDe,
} from "@/lib/plattform/pachtakte";
import { bestaetigen as rueckfrage } from "@/components/ui/Rueckfrage";

const Optionen = ({ werte, leer = "Bitte wählen" }) => (
  <>
    {leer !== null && <option value="">{leer}</option>}
    {Object.entries(werte).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
  </>
);

function Personen({ id, liste, setListe, mitAnteil, titel }) {
  const setze = (i, k, w) => setListe(liste.map((p, j) => (j === i ? { ...p, [k]: w } : p)));
  const summe = liste.reduce((s, p) => s + (Number(String(p.anteilProzent || "").replace(",", ".")) || 0), 0);
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-[13.5px] font-semibold text-ink-700">{titel}</legend>
      {liste.map((p, i) => (
        <div key={i} className="grid gap-2 rounded-2xl bg-sand-50 p-3 ring-1 ring-inset ring-ink-200/70 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,0.7fr)_auto] sm:items-end">
          <Feld id={`${id}-n${i}`} label="Name" pflicht><input id={`${id}-n${i}`} className={eingabe} value={p.name} maxLength={120} onChange={(e) => setze(i, "name", e.target.value)} /></Feld>
          <Feld id={`${id}-e${i}`} label="E-Mail (optional)"><input id={`${id}-e${i}`} type="email" className={eingabe} value={p.email} maxLength={254} onChange={(e) => setze(i, "email", e.target.value)} /></Feld>
          {mitAnteil ? (
            <Feld id={`${id}-a${i}`} label="Anteil %"><input id={`${id}-a${i}`} inputMode="decimal" className={eingabe} value={p.anteilProzent} onChange={(e) => setze(i, "anteilProzent", e.target.value)} /></Feld>
          ) : <span />}
          <button type="button" onClick={() => setListe(liste.filter((_, j) => j !== i))} disabled={liste.length <= 1} className="inline-flex h-12 items-center justify-center rounded-xl px-3 text-ink-500 ring-1 ring-inset ring-ink-200 hover:text-ink-900 disabled:opacity-40" aria-label={`Eintrag ${i + 1} entfernen`}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setListe([...liste, { name: "", email: "", anteilProzent: "" }])} disabled={liste.length >= 20} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
          <Plus aria-hidden="true" className="h-4 w-4" /> Person hinzufügen
        </button>
        {mitAnteil && <p className={cn("ov-num text-[13px] font-semibold", Math.abs(summe - 100) < 0.01 ? "text-ov-700" : "text-ink-500")}>Summe {String(Math.round(summe * 100) / 100).replace(".", ",")} %</p>}
      </div>
    </fieldset>
  );
}

/** Neues Anliegen zu einem Pachtvertrag (Art wählbar je Vertragsstatus) */
export function AnliegenFormular({ vertragId, land = "DE", arten = [], heute }) {
  const id = useId();
  const router = useRouter();
  const [art, setArt] = useState(arten[0] || "");
  const [d, setD] = useState({});
  const [personen, setPersonen] = useState([{ name: "", email: "", anteilProzent: "" }]);
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const setze = (k, w) => setD((x) => ({ ...x, [k]: w }));
  const info = anliegenInfo(art, land);
  if (!arten.length) return <p className="text-[14px] text-ink-500">Für diesen Vertrag können derzeit keine Anliegen gestellt werden.</p>;

  function wechseln(a) {
    setArt(a);
    setD({});
    setPersonen(a === "zahlungsaufteilung" ? [{ name: "", email: "", anteilProzent: "" }, { name: "", email: "", anteilProzent: "" }] : [{ name: "", email: "", anteilProzent: "" }]);
    setFehler("");
    setOk("");
  }

  async function absenden(e) {
    e.preventDefault();
    if (laeuft) return;
    setFehler("");
    setLaeuft(true);
    const daten = { ...d };
    if (art === "erbfall") daten.erben = personen;
    if (art === "zahlungsaufteilung") daten.empfaenger = personen;
    if (art === "eigentuemerwechsel") daten.erwerber = { name: d.erwerberName || "", email: d.erwerberEmail || "", anschrift: d.erwerberAnschrift || "" };
    try {
      await senden("/api/portal/pachtakte/anliegen", { body: { vertragId, art, daten } });
      setOk("Ihr Anliegen ist eingegangen. Sie sehen den Stand unten in der Liste und erhalten eine Nachricht, sobald sich etwas ändert.");
      setD({});
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  const f = (k, label, props = {}, hinweis) => (
    <Feld id={`${id}-${k}`} label={label} pflicht={props.required} hinweis={hinweis}>
      <input id={`${id}-${k}`} className={eingabe} value={d[k] || ""} onChange={(e) => setze(k, e.target.value)} {...props} />
    </Feld>
  );
  const s = (k, label, werte, props = {}) => (
    <Feld id={`${id}-${k}`} label={label} pflicht={props.required}>
      <select id={`${id}-${k}`} className={auswahlfeld} value={d[k] || ""} onChange={(e) => setze(k, e.target.value)} {...props}><Optionen werte={werte} /></select>
    </Feld>
  );

  return (
    <form onSubmit={absenden} className="space-y-4">
      <Feld id={`${id}-art`} label="Worum geht es?" pflicht>
        <select id={`${id}-art`} className={auswahlfeld} value={art} onChange={(e) => wechseln(e.target.value)}>
          {arten.map((a) => <option key={a} value={a}>{ANLIEGEN_ARTEN[a].label}</option>)}
        </select>
      </Feld>
      {info && (
        <div className="rounded-2xl bg-navy-50 px-4 py-3.5 text-[13.5px] leading-relaxed text-navy-900 ring-1 ring-inset ring-navy-100">
          <p className="font-semibold">{info.text}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{info.hinweise.map((h) => <li key={h}>{h}</li>)}</ul>
          {info.unterlagen.length > 0 && (
            <p className="mt-2"><span className="font-semibold">Bitte bereithalten bzw. unter „Dokumente“ der Fläche hochladen:</span> {info.unterlagen.join(" · ")}</p>
          )}
        </div>
      )}

      {art === "kuendigung" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {s("grund", "Art der Beendigung", KUENDIGUNG_GRUENDE, { required: true })}
          {f("zumDatum", "Gewünschtes Vertragsende", { type: "date", required: true, min: heute })}
          <Feld id={`${id}-begr`} label="Begründung" pflicht={d.grund === "ausserordentlich"} className="sm:col-span-2" hinweis={d.grund === "ausserordentlich" ? "Beschreiben Sie den wichtigen Grund (mindestens 20 Zeichen)." : undefined}>
            <textarea id={`${id}-begr`} rows={3} maxLength={3000} className={textbereich} value={d.begruendung || ""} onChange={(e) => setze("begruendung", e.target.value)} />
          </Feld>
        </div>
      )}
      {art === "eigentuemerwechsel" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {s("anlass", "Anlass", WECHSEL_ANLAESSE, { required: true })}
          {f("stichtag", "Stichtag (Übergang von Nutzen und Lasten)", { type: "date", required: true })}
          {f("erwerberName", "Neuer Eigentümer (Name bzw. Firma)", { required: true, maxLength: 160 })}
          {f("erwerberEmail", "E-Mail des neuen Eigentümers", { type: "email", maxLength: 254 }, "Wir laden ihn damit ins Portal ein.")}
          {f("erwerberAnschrift", "Anschrift", { maxLength: 240 })}
          {f("anteilProzent", "Übertragener Anteil in %", { inputMode: "decimal", placeholder: "100" }, "Bei Teilübertragung (z. B. 50 % an ein Kind) angeben.")}
        </div>
      )}
      {art === "erbfall" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {f("verstorben", "Verstorbene Person", { required: true, maxLength: 160 })}
            {f("todestag", "Todesdatum", { type: "date", required: true, max: heute })}
            {s("nachweis", "Erbnachweis", ERBNACHWEISE[land] || ERBNACHWEISE.DE, { required: true })}
            {f("vertreter", "Wer handelt für alle Erben?", { maxLength: 160 }, "Pflicht bei mehreren Erben (z. B. bevollmächtigte Person).")}
          </div>
          <Personen id={`${id}-erben`} liste={personen} setListe={setPersonen} mitAnteil titel="Erben (Anteile optional – dann für alle)" />
        </div>
      )}
      {art === "zahlungsaufteilung" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {s("grundlage", "Grundlage", AUFTEILUNG_GRUNDLAGEN, { required: true })}
            {f("ab", "Aufteilung ab (optional)", { type: "date" })}
          </div>
          <Personen id={`${id}-empf`} liste={personen} setListe={setPersonen} mitAnteil titel="Empfänger und Anteile (zusammen 100 %)" />
        </div>
      )}
      {art === "verlaengerung" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {s("wunsch", "Ihr Wunsch", VERLAENGERUNG_WUENSCHE, { required: true })}
          {f("jahre", "Um wie viele Jahre? (optional)", { inputMode: "numeric" })}
        </div>
      )}
      <Feld id={`${id}-bm`} label="Anmerkung (optional)">
        <textarea id={`${id}-bm`} rows={2} maxLength={2000} className={textbereich} value={d.bemerkung || ""} onChange={(e) => setze("bemerkung", e.target.value)} />
      </Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{ok}</ErfolgBox>
      <Button type="submit" disabled={laeuft}>{laeuft ? "Wird gesendet …" : "Anliegen senden"}</Button>
    </form>
  );
}

/**
 * Schritte (Übergänge) ausführen – für Eigentümer und Backoffice. aktionen: [{ nach, aktion, pflicht[] }].
 * zusatz(nach) liefert weitere Felder [{ name, label, typ: text|date|textarea|select|zahl, optionen, pflicht, hinweis }].
 */
export function Schritte({ url, aktionen = [], basis = {}, zusatz = () => [], leerText = null, bestaetigen = {} }) {
  const id = useId();
  const router = useRouter();
  const [offen, setOffen] = useState(null);
  const [werte, setWerte] = useState({});
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  if (!aktionen.length) return leerText ? <p className="text-[13.5px] text-ink-500">{leerText}</p> : null;
  const a = aktionen.find((x) => x.nach === offen);
  const felder = a ? [...(a.pflicht || []).filter((p) => ["kommentar", "termin"].includes(p)).map((p) => (p === "kommentar" ? { name: "kommentar", label: "Kommentar bzw. Nachricht", typ: "textarea", pflicht: true } : { name: "termin", label: "Termin", typ: "date", pflicht: true })), ...zusatz(a.nach)] : [];
  if (a && !felder.some((x) => x.name === "kommentar")) felder.push({ name: "kommentar", label: "Kommentar (optional)", typ: "textarea" });

  async function ausfuehren(nach, direkt = false) {
    if (laeuft) return;
    const x = aktionen.find((y) => y.nach === nach);
    const braucht = (x.pflicht || []).length > 0 || zusatz(nach).length > 0;
    if (!direkt && braucht) {
      setOffen(nach);
      setWerte({});
      setFehler("");
      return;
    }
    if (bestaetigen[nach] && !(await rueckfrage({ titel: bestaetigen[nach], bestaetigenText: x.aktion, gefahr: true }))) return;
    setLaeuft(true);
    setFehler("");
    try {
      await senden(url, { body: { ...basis, nach, ...werte } });
      setOffen(null);
      setWerte({});
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {aktionen.map((x) => (
          <Button key={x.nach} type="button" size="sm" variant={["abgelehnt", "zurueckgezogen", "maengel", "rueckfrage"].includes(x.nach) ? "secondary" : "primary"} className="h-auto min-h-10 max-w-full whitespace-normal py-2 text-left" disabled={laeuft} onClick={() => ausfuehren(x.nach)} aria-expanded={offen === x.nach}>
            {x.aktion}
          </Button>
        ))}
      </div>
      {a && (
        <form onSubmit={(e) => { e.preventDefault(); ausfuehren(a.nach, true); }} className="space-y-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70">
          <p className="text-[14px] font-semibold text-ink-900">{a.aktion}</p>
          {felder.map((fd) => (
            <Feld key={fd.name} id={`${id}-${fd.name}`} label={fd.label} pflicht={fd.pflicht} hinweis={fd.hinweis}>
              {fd.typ === "textarea" ? (
                <textarea id={`${id}-${fd.name}`} rows={3} maxLength={2000} required={fd.pflicht} className={textbereich} value={werte[fd.name] || ""} onChange={(e) => setWerte((w) => ({ ...w, [fd.name]: e.target.value }))} />
              ) : fd.typ === "select" ? (
                <select id={`${id}-${fd.name}`} required={fd.pflicht} className={auswahlfeld} value={werte[fd.name] || ""} onChange={(e) => setWerte((w) => ({ ...w, [fd.name]: e.target.value }))}><Optionen werte={fd.optionen || {}} leer={fd.leer ?? "Bitte wählen"} /></select>
              ) : (
                <input id={`${id}-${fd.name}`} type={fd.typ === "date" ? "date" : "text"} inputMode={fd.typ === "zahl" ? "decimal" : undefined} required={fd.pflicht} className={eingabe} value={werte[fd.name] || ""} onChange={(e) => setWerte((w) => ({ ...w, [fd.name]: e.target.value }))} />
              )}
            </Feld>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={laeuft}>{laeuft ? "Wird gespeichert …" : "Bestätigen"}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOffen(null)}>Abbrechen</Button>
          </div>
        </form>
      )}
      <FehlerBox>{fehler}</FehlerBox>
    </div>
  );
}

const leerNachweis = (standard) => ({ jahr: String(Number(String(standard.heute || "").slice(0, 4)) - 1 || ""), art: standard.betrieb ? "betrieb" : "referenz", kultur: standard.kultur || "", kulturText: "", gesamtHa: standard.ha ? String(standard.ha).replace(".", ",") : "", bewirtschaftetHa: "", ertrag: "", einheit: standard.einheit || "dt", bewirtschafter: "selbst", bewirtschafterName: "", gap: "", gapAktenzeichen: "", besonderheiten: "" });

/** Agri-PV-Bewirtschaftungsnachweis (Entwurf speichern oder einreichen) mit Live-Prüfung nach DIN SPEC 91434 */
export function AgriNachweisFormular({ vertragId, nachweis = null, standard = {}, referenz = null, kategorie = "", land = "DE" }) {
  const id = useId();
  const router = useRouter();
  const [d, setD] = useState(() => (nachweis ? Object.fromEntries(Object.entries(nachweis.daten).map(([k, w]) => [k, typeof w === "number" ? String(w).replace(".", ",") : w ?? ""])) : leerNachweis(standard)));
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const setze = (k, w) => setD((x) => ({ ...x, [k]: w }));
  const vorschau = useMemo(() => {
    try {
      const b = agriNachweisBereinigen(d, { heute: standard.heute });
      return agriNachweisPruefen(b, { kategorie, referenz: b.art === "betrieb" && referenz?.einheit === b.einheit ? referenz : null, land });
    } catch {
      return null;
    }
  }, [d, kategorie, referenz, land, standard.heute]);

  async function speichern(einreichen) {
    if (laeuft) return;
    setFehler("");
    setOk("");
    setLaeuft(true);
    try {
      await senden("/api/portal/pachtakte/agri", { method: "PUT", body: { vertragId, id: nachweis?.id || null, daten: d, einreichen } });
      setOk(einreichen ? "Nachweis eingereicht – wir prüfen ihn und melden uns." : "Entwurf gespeichert.");
      if (!nachweis) setD(leerNachweis(standard));
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  const inp = (k, label, props = {}, hinweis) => (
    <Feld id={`${id}-${k}`} label={label} pflicht={props.required} hinweis={hinweis}>
      <input id={`${id}-${k}`} className={eingabe} value={d[k] ?? ""} onChange={(e) => setze(k, e.target.value)} {...props} />
    </Feld>
  );
  const sel = (k, label, werte, props = {}) => (
    <Feld id={`${id}-${k}`} label={label} pflicht={props.required}>
      <select id={`${id}-${k}`} className={auswahlfeld} value={d[k] ?? ""} onChange={(e) => setze(k, e.target.value)} {...props}><Optionen werte={werte} leer={props.leer ?? "Bitte wählen"} /></select>
    </Feld>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); speichern(true); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {inp("jahr", "Wirtschaftsjahr", { inputMode: "numeric", required: true })}
        {sel("art", "Art", standard.betrieb ? AGRI_NACHWEIS_ARTEN : { referenz: AGRI_NACHWEIS_ARTEN.referenz }, { required: true, leer: null })}
        {sel("kultur", "Kultur", AGRI_NACHWEIS_KULTUREN, { required: true })}
        {inp("kulturText", "Sorte / Nutzung (optional)", { maxLength: 120 })}
        {inp("gesamtHa", "Gesamtfläche Schlag (ha)", { inputMode: "decimal", required: true })}
        {inp("bewirtschaftetHa", "Landwirtschaftlich genutzt (ha)", { inputMode: "decimal", required: true }, "Ohne Aufständerung, Wege und nicht bewirtschaftbare Streifen.")}
        {inp("ertrag", "Ertrag je ha", { inputMode: "decimal", required: true })}
        {sel("einheit", "Einheit", AGRI_NACHWEIS_EINHEITEN, { required: true, leer: null })}
        {sel("bewirtschafter", "Bewirtschaftung", AGRI_BEWIRTSCHAFTER, { leer: null })}
        {d.bewirtschafter === "paechter" && inp("bewirtschafterName", "Bewirtschafter (Name)", { required: true, maxLength: 160 })}
        {sel("gap", land === "AT" ? "Mehrfachantrag (AMA) gestellt?" : land === "CH" ? "Direktzahlungen beantragt?" : "GAP-Antrag gestellt?", JA_NEIN_ENTFAELLT)}
        {inp("gapAktenzeichen", "Betriebs- bzw. Antragsnummer (optional)", { maxLength: 60 })}
      </div>
      <Feld id={`${id}-bs`} label="Besonderheiten (Witterung, Schäden, Kulturwechsel)">
        <textarea id={`${id}-bs`} rows={2} maxLength={2000} className={textbereich} value={d.besonderheiten ?? ""} onChange={(e) => setze("besonderheiten", e.target.value)} />
      </Feld>
      {vorschau && vorschau.punkte.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {vorschau.punkte.map((p) => (
            <li key={p.id} className={cn("rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ring-1 ring-inset", p.stufe === "ok" ? "bg-ov-50 text-ov-900 ring-ov-200" : p.stufe === "risiko" ? "bg-sun-300/20 text-ink-900 ring-sun-400/40" : "bg-navy-50 text-navy-900 ring-navy-100")}>
              <span className="font-semibold">{p.titel}.</span> {p.text}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[12.5px] leading-relaxed text-ink-500">Belege (Ernteaufzeichnungen, Lieferscheine, Mehrfachantrag) laden Sie bitte unter „Dokumente“ der Fläche hoch.</p>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{ok}</ErfolgBox>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={laeuft}>{laeuft ? "Wird gesendet …" : "Nachweis einreichen"}</Button>
        <Button type="button" variant="secondary" disabled={laeuft} onClick={() => speichern(false)}>Als Entwurf speichern</Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Backoffice (Client-Hüllen um „Schritte“, Felder je Schritt)

/** Backoffice: Anliegen bearbeiten – beim Erledigen je Art Wirkungsfelder (Kündigungsdatum, neues Konto, Stichtag) */
export function AnliegenBackofficeSchritte({ anliegen, konten = [] }) {
  const kontoOptionen = Object.fromEntries(konten.map((k) => [k.id, `${k.name} · ${k.email}`]));
  const zusatz = (nach) => {
    if (nach !== "erledigt") return [];
    if (anliegen.art === "kuendigung") return [{ name: "wirksamZum", label: "Kündigung wirksam zum", typ: "date", pflicht: !anliegen.daten?.zumDatum, hinweis: anliegen.daten?.zumDatum ? `Leer lassen = gewünschtes Datum ${datumDe(anliegen.daten.zumDatum)}` : undefined }];
    if (["eigentuemerwechsel", "erbfall"].includes(anliegen.art)) {
      return [
        { name: "neuesKontoId", label: "Vertrag übertragen auf Konto", typ: "select", optionen: kontoOptionen, leer: "Nicht übertragen (nur vermerken)", hinweis: "Künftige Gutschriften gehen an dieses Konto; Auszahlung erst nach dessen Verifizierung. Die Fläche wird mit übertragen." },
        ...(anliegen.art === "eigentuemerwechsel" ? [{ name: "ab", label: "Wirksam ab (Stichtag)", typ: "date", hinweis: anliegen.daten?.stichtag ? `Leer lassen = ${datumDe(anliegen.daten.stichtag)}` : undefined }] : []),
      ];
    }
    return [];
  };
  return <Schritte url={`/api/admin/pachtakte/anliegen/${anliegen.id}`} aktionen={anliegen.aktionen} zusatz={zusatz} />;
}

/** Backoffice: Rückbau-Schritte */
export function RueckbauBackofficeSchritte({ vertragId, aktionen = [] }) {
  return <Schritte url={`/api/admin/pachtakte/rueckbau/${vertragId}`} basis={{ ziel: "rueckbau" }} aktionen={aktionen} leerText="Kein Rückbau-Schritt offen." />;
}

/** Backoffice: Rückbausicherheit hinterlegen bzw. freigeben */
export function SicherheitBackoffice({ vertragId, status, rueckbauStatus, standard = {} }) {
  const aktionen = [];
  if (["keine", "vorgesehen"].includes(status)) aktionen.push({ nach: "hinterlegt", aktion: "Sicherheit als hinterlegt erfassen", pflicht: [] });
  if (status === "hinterlegt" && rueckbauStatus === "abgenommen") aktionen.push({ nach: "freigegeben", aktion: "Sicherheit freigeben", pflicht: ["kommentar"] });
  const zusatz = (nach) => (nach === "hinterlegt" ? [
    { name: "art", label: "Art", typ: "select", pflicht: true, optionen: SICHERHEIT_ARTEN_CLIENT },
    { name: "betrag", label: `Betrag in €${standard.betrag ? ` (vereinbart ${Number(standard.betrag).toLocaleString("de-DE")} €)` : ""}`, typ: "zahl", pflicht: true },
    { name: "geber", label: "Sicherungsgeber (z. B. Bank, Versicherer)", typ: "text", pflicht: true },
    { name: "hinterlegtAm", label: "Hinterlegt am", typ: "date", pflicht: true },
  ] : []);
  return <Schritte url={`/api/admin/pachtakte/rueckbau/${vertragId}`} basis={{ ziel: "sicherheit" }} aktionen={aktionen} zusatz={zusatz} leerText={status === "hinterlegt" ? "Freigabe erst nach Abnahme des Rückbaus." : "Kein Schritt offen."} />;
}

/** Backoffice: Vertrag nach Rückbau beenden */
export function VertragBeenden({ vertragId }) {
  return <Schritte url={`/api/admin/pachtakte/rueckbau/${vertragId}`} basis={{ ziel: "vertrag" }} aktionen={[{ nach: "beendet", aktion: "Pachtvertrag beenden", pflicht: ["kommentar"] }]} bestaetigen={{ beendet: "Vertrag endgültig beenden? Danach entstehen keine Gutschriften mehr." }} />;
}

/** Backoffice: Agri-PV-Nachweis bestätigen oder Rückfrage */
export function AgriBackofficeSchritte({ id, aktionen = [] }) {
  return <Schritte url={`/api/admin/pachtakte/agri/${id}`} aktionen={aktionen} />;
}
