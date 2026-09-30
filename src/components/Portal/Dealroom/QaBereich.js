"use client";

// Q&A im Deal-Room: Investor fragt (Kategorie), ÖkoInvest moderiert (Freigabe, Anonymisierung, Frist),
// Anbieter antwortet, ÖkoInvest gibt die Antwort frei (nur für den Fragenden oder für alle NDA-Investoren).
// Anbieter und Investoren sehen sich gegenseitig nicht (Pseudonyme) – der Server erzwingt das.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, EyeOff, Loader2, MessageCircleQuestion, Search, Send, ShieldCheck, Undo2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { datum, datumZeit } from "@/lib/plattform/format";
import { FRAGE_STATUS, QA_FRIST_TAGE, QA_KATEGORIEN } from "@/lib/plattform/dealroom";
import { Badge } from "@/components/Portal/ui";
import { eingabe, textbereich, FehlerBox, ErfolgBox, Chip } from "@/components/Portal/felder";

const OEFF_STATUS = { offen: { label: "Offen", ton: "warn" }, beantwortet: { label: "Beantwortet", ton: "ok" }, abgelehnt: { label: "Nicht zugelassen", ton: "neutral" } };

function chip(aktiv) {
  return cn("inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium ring-1 ring-inset transition-colors", aktiv ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300");
}

function useAktion() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  async function los(url, body, text) {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      await senden(url, { body });
      setErfolg(text);
      router.refresh();
      return true;
    } catch (e) {
      setFehler(e.message);
      return false;
    } finally {
      setLaeuft(false);
    }
  }
  return { laeuft, fehler, erfolg, los };
}

function NeueFrage({ projektId }) {
  const [kategorie, setKategorie] = useState("technisch");
  const [text, setText] = useState("");
  const a = useAktion();
  async function absenden(e) {
    e.preventDefault();
    if (await a.los("/api/portal/qa", { projektId, kategorie, text }, "Ihre Frage ist eingegangen. ÖkoInvest prüft sie und leitet sie anonymisiert an den Anbieter weiter.")) setText("");
  }
  return (
    <form onSubmit={absenden} className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
      <h3 className="font-display text-[16px] font-bold text-ink-900">Neue Frage stellen</h3>
      <fieldset className="mt-3">
        <legend className="sr-only">Kategorie</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(QA_KATEGORIEN).map(([k, v]) => (
            <Chip key={k} type="radio" name="qa-kategorie" value={k} checked={kategorie === k} onChange={() => setKategorie(k)}>{v}</Chip>
          ))}
        </div>
      </fieldset>
      <label htmlFor="qa-text" className="sr-only">Ihre Frage</label>
      <textarea
        id="qa-text"
        rows={3}
        className={cn(textbereich, "mt-3")}
        value={text}
        maxLength={3000}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.ctrlKey || e.metaKey) && absenden(e)}
        placeholder="Zum Beispiel: Welche Auflagen enthält die Netzanschlusszusage?"
      />
      <p className="mt-2 flex items-start gap-2 text-[12.5px] leading-snug text-ink-500">
        <EyeOff aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Der Anbieter erfährt nicht, wer fragt. Kontaktangaben (E-Mail, Telefon, Links) werden automatisch entfernt. Strg + Enter sendet.
      </p>
      <div className="mt-3 space-y-2">
        <FehlerBox>{a.fehler}</FehlerBox>
        <ErfolgBox>{a.erfolg}</ErfolgBox>
      </div>
      <Button type="submit" size="sm" icon={a.laeuft ? Loader2 : Send} className="mt-3" disabled={a.laeuft || text.trim().length < 10}>Frage senden</Button>
    </form>
  );
}

function FrageKarte({ f, rolle }) {
  const a = useAktion();
  const [text, setText] = useState(f.text);
  const [antwort, setAntwort] = useState(f.antwort || "");
  const [oeffentlich, setOeffentlich] = useState(rolle === "admin" ? !!f.oeffentlichVorschlag : !!f.oeffentlich);
  const [fristTage, setFristTage] = useState(String(QA_FRIST_TAGE.standard));
  const [grund, setGrund] = useState("");
  const [modus, setModus] = useState("");
  const url = `/api/portal/qa/${f.id}`;
  const s = rolle === "investor" ? OEFF_STATUS[f.status] || OEFF_STATUS.offen : FRAGE_STATUS[f.status] || { label: f.status, ton: "neutral" };
  const antwortSichtbar = !!f.antwort && (rolle !== "investor" || f.status === "beantwortet");
  const kannAntworten = (rolle === "anbieter" || rolle === "admin") && ["freigegeben", "beantwortet"].includes(f.status);

  return (
    <li className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge ton="info">{f.kategorieLabel}</Badge>
        <Badge ton={s.ton}>{s.label}</Badge>
        {f.ueberfaellig && <Badge ton="warn"><Clock aria-hidden="true" className="h-3.5 w-3.5" /> Frist überschritten</Badge>}
        {f.oeffentlich && <Badge ton="ok">Für alle NDA-Investoren</Badge>}
        <span className="ml-auto text-[12.5px] text-ink-500">
          {rolle === "investor" ? f.von : f.von?.investor ? `${f.von.pseudonym} · ${f.von.investor.vorname} ${f.von.investor.nachname}` : f.von?.name ? `${f.von.pseudonym} · ${f.von.name}` : f.von?.pseudonym} · {datum(f.erstelltAm)}
        </span>
      </div>
      {f.projektTitel && (
        <a href={`/portal/dealroom/${f.projektId}?tab=qa`} className="mt-2 inline-block text-[13px] font-semibold text-ov-700 hover:text-ov-800">{f.projektTitel}</a>
      )}
      <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-900">{f.text}</p>
      {rolle === "admin" && f.bereinigt && f.textOriginal && (
        <p className="mt-2 rounded-xl bg-sun-300/20 px-3 py-2 text-[12.5px] text-ink-700 ring-1 ring-inset ring-sun-400/40">
          <span className="font-semibold">Original (Kontaktangaben entfernt):</span> {f.textOriginal}
        </p>
      )}
      {f.fristAm && rolle !== "investor" && f.status === "freigegeben" && <p className="mt-2 text-[12.5px] text-ink-500">Antwort erbeten bis {datumZeit(f.fristAm)}</p>}
      {f.rueckfrage && rolle !== "investor" && <p className="mt-2 rounded-xl bg-navy-50 px-3 py-2 text-[13px] text-navy-900 ring-1 ring-inset ring-navy-100"><span className="font-semibold">Rückfrage von ÖkoInvest:</span> {f.rueckfrage}</p>}
      {rolle === "investor" && f.eigen && f.status === "offen" && (
        <p className="mt-2 text-[12.5px] text-ink-500">{f.statusIntern === "eingereicht" ? "ÖkoInvest prüft Ihre Frage." : "Beim Anbieter – die Antwort wird vor Freigabe von ÖkoInvest geprüft."}</p>
      )}
      {rolle === "investor" && f.status === "abgelehnt" && f.ablehnGrund && <p className="mt-2 text-[13px] text-ink-600">Begründung: {f.ablehnGrund}</p>}

      {antwortSichtbar && !(kannAntworten && rolle === "anbieter" && f.status === "freigegeben") && (
        <div className="mt-4 rounded-2xl bg-ov-50/70 px-4 py-3 ring-1 ring-inset ring-ov-200">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ov-800">
            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> {rolle === "investor" ? f.antwortVon : "Antwort des Anbieters"} · {datum(f.antwortAm)}
          </p>
          <p className="mt-1 whitespace-pre-line break-words text-[14.5px] leading-relaxed text-ink-900">{f.antwort}</p>
          {rolle === "admin" && f.antwortOriginal && <p className="mt-2 text-[12px] text-ink-600">Original: {f.antwortOriginal}</p>}
        </div>
      )}

      {kannAntworten && (rolle === "anbieter" || modus === "antworten") && (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            a.los(url, { aktion: "antworten", antwort, oeffentlich }, "Antwort gespeichert – ÖkoInvest prüft und gibt sie frei.");
          }}
        >
          <label htmlFor={`antwort-${f.id}`} className="text-[13px] font-semibold text-ink-700">{f.status === "beantwortet" ? "Antwort überarbeiten" : "Ihre Antwort"}</label>
          <textarea id={`antwort-${f.id}`} rows={3} className={textbereich} value={antwort} onChange={(e) => setAntwort(e.target.value)} maxLength={5000} />
          <label className="flex items-center gap-2 text-[13.5px] text-ink-700">
            <input type="checkbox" checked={oeffentlich} onChange={(e) => setOeffentlich(e.target.checked)} className="h-4 w-4 accent-ov-600" />
            Antwort für alle Interessenten mit NDA vorschlagen
          </label>
          <Button type="submit" size="sm" icon={a.laeuft ? Loader2 : Send} disabled={a.laeuft || antwort.trim().length < 5}>Antwort senden</Button>
        </form>
      )}

      {rolle === "admin" && (
        <div className="mt-4 border-t border-ink-100 pt-4">
          {f.status === "eingereicht" && (
            <div className="space-y-2">
              <label htmlFor={`text-${f.id}`} className="text-[13px] font-semibold text-ink-700">Text für den Anbieter (anonymisiert)</label>
              <textarea id={`text-${f.id}`} rows={3} className={textbereich} value={text} onChange={(e) => setText(e.target.value)} />
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-[13px] text-ink-700">
                  Frist
                  <input type="number" min={QA_FRIST_TAGE.min} max={QA_FRIST_TAGE.max} value={fristTage} onChange={(e) => setFristTage(e.target.value)} className={cn(eingabe, "h-9 w-20 px-3")} /> Tage
                </label>
                <Button size="sm" icon={ShieldCheck} disabled={a.laeuft} onClick={() => a.los(url, { aktion: "freigeben", text, fristTage: Number(fristTage) }, "Anonymisiert an den Anbieter weitergegeben.")}>Anonymisiert freigeben</Button>
                <Button size="sm" variant="secondary" icon={XCircle} disabled={a.laeuft} onClick={() => setModus(modus === "ablehnen" ? "" : "ablehnen")}>Ablehnen</Button>
              </div>
            </div>
          )}
          {f.status === "beantwortet" && (
            <div className="space-y-2">
              <label htmlFor={`fa-${f.id}`} className="text-[13px] font-semibold text-ink-700">Antwort prüfen (bei Bedarf kürzen/anonymisieren)</label>
              <textarea id={`fa-${f.id}`} rows={3} className={textbereich} value={antwort} onChange={(e) => setAntwort(e.target.value)} />
              <label className="flex items-center gap-2 text-[13.5px] text-ink-700">
                <input type="checkbox" checked={oeffentlich} onChange={(e) => setOeffentlich(e.target.checked)} className="h-4 w-4 accent-ov-600" />
                Für alle Interessenten mit NDA sichtbar{f.oeffentlichVorschlag ? " (vom Anbieter vorgeschlagen)" : ""}
              </label>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={CheckCircle2} disabled={a.laeuft} onClick={() => a.los(url, { aktion: "antwortFreigeben", antwort, oeffentlich }, "Antwort freigegeben.")}>Antwort freigeben</Button>
                <Button size="sm" variant="secondary" icon={Undo2} disabled={a.laeuft} onClick={() => setModus(modus === "zurueck" ? "" : "zurueck")}>An Anbieter zurück</Button>
                <Button size="sm" variant="ghost" icon={XCircle} disabled={a.laeuft} onClick={() => setModus(modus === "ablehnen" ? "" : "ablehnen")}>Ablehnen</Button>
              </div>
            </div>
          )}
          {f.status === "freigegeben" && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-[13px] text-ink-700">
                Frist neu
                <input type="number" min={QA_FRIST_TAGE.min} max={QA_FRIST_TAGE.max} value={fristTage} onChange={(e) => setFristTage(e.target.value)} className={cn(eingabe, "h-9 w-20 px-3")} /> Tage
              </label>
              <Button size="sm" variant="secondary" icon={Clock} disabled={a.laeuft} onClick={() => a.los(url, { aktion: "frist", fristTage: Number(fristTage) }, "Frist aktualisiert.")}>Frist setzen</Button>
              <Button size="sm" variant="ghost" disabled={a.laeuft} onClick={() => setModus(modus === "antworten" ? "" : "antworten")}>Selbst beantworten</Button>
              <Button size="sm" variant="ghost" icon={XCircle} disabled={a.laeuft} onClick={() => setModus(modus === "ablehnen" ? "" : "ablehnen")}>Ablehnen</Button>
            </div>
          )}
          {(modus === "ablehnen" || modus === "zurueck") && (
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                a.los(url, modus === "ablehnen" ? { aktion: "ablehnen", grund } : { aktion: "zurueckgeben", kommentar: grund, fristTage: Number(fristTage) }, modus === "ablehnen" ? "Frage abgelehnt." : "An den Anbieter zurückgegeben.");
              }}
            >
              <label htmlFor={`grund-${f.id}`} className="sr-only">{modus === "ablehnen" ? "Begründung" : "Rückfrage an den Anbieter"}</label>
              <input id={`grund-${f.id}`} className={cn(eingabe, "h-10")} value={grund} onChange={(e) => setGrund(e.target.value)} placeholder={modus === "ablehnen" ? "Begründung (sieht der Investor)" : "Was fehlt? (sieht der Anbieter)"} />
              <Button type="submit" size="sm" variant="navy" disabled={a.laeuft || grund.trim().length < 3}>{modus === "ablehnen" ? "Ablehnen" : "Zurückgeben"}</Button>
            </form>
          )}
        </div>
      )}
      {(a.fehler || a.erfolg) && (
        <div className="mt-3 space-y-2">
          <FehlerBox>{a.fehler}</FehlerBox>
          <ErfolgBox>{a.erfolg}</ErfolgBox>
        </div>
      )}
    </li>
  );
}

export default function QaBereich({ projektId, rolle, fragen = [], kannFragen = false }) {
  const [kat, setKat] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const statusOptionen =
    rolle === "investor"
      ? [["", "Alle"], ["offen", "Offen"], ["beantwortet", "Beantwortet"]]
      : [["", "Alle"], ...(rolle === "admin" ? [["moderation", "Zu moderieren"]] : []), ["offen", "Offen"], ["veroeffentlicht", "Beantwortet"]];
  const liste = useMemo(() => {
    const t = q.trim().toLowerCase();
    return fragen.filter((f) => {
      if (kat && f.kategorie !== kat) return false;
      if (status === "moderation" && !["eingereicht", "beantwortet"].includes(f.status)) return false;
      if (status === "offen" && !(rolle === "investor" ? f.status === "offen" : ["eingereicht", "freigegeben", "beantwortet"].includes(f.status))) return false;
      if ((status === "beantwortet" || status === "veroeffentlicht") && !["beantwortet", "veroeffentlicht"].includes(f.status)) return false;
      if (t && !`${f.text} ${f.antwort}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [fragen, kat, status, q, rolle]);

  return (
    <div className="space-y-5">
      {kannFragen && <NeueFrage projektId={projektId} />}
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink-200/70 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kategorie">
          <button type="button" className={chip(!kat)} aria-pressed={!kat} onClick={() => setKat("")}>Alle Kategorien</button>
          {Object.entries(QA_KATEGORIEN).map(([k, v]) => (
            <button key={k} type="button" className={chip(kat === k)} aria-pressed={kat === k} onClick={() => setKat(kat === k ? "" : k)}>{v}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
            {statusOptionen.map(([k, v]) => (
              <button key={k || "alle"} type="button" className={chip(status === k)} aria-pressed={status === k} onClick={() => setStatus(k)}>{v}</button>
            ))}
          </div>
          <label className="relative block w-full sm:w-52">
            <span className="sr-only">Fragen durchsuchen</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input className={cn(eingabe, "h-9 pl-9 text-[14px]")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen …" />
          </label>
        </div>
      </div>
      {liste.length ? (
        <ul className="space-y-4">{liste.map((f) => <FrageKarte key={`${f.id}-${f.status}-${f.antwortAm || ""}`} f={f} rolle={rolle} />)}</ul>
      ) : (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center">
          <MessageCircleQuestion aria-hidden="true" className="h-8 w-8 text-ink-400" />
          <p className="mt-3 font-display text-[17px] font-bold text-ink-900">{fragen.length ? "Keine Fragen zu diesem Filter" : "Noch keine Fragen"}</p>
          <p className="mt-1 max-w-md text-[14px] text-ink-600">
            {rolle === "investor" ? "Stellen Sie Ihre Fragen zu Technik, Recht, Kaufmännischem oder Netz – freigegebene Antworten „für alle“ erscheinen hier ebenfalls." : rolle === "anbieter" ? "Fragen erscheinen hier, sobald ÖkoInvest sie moderiert und anonymisiert freigegeben hat." : "Neue Fragen der Investoren erscheinen hier zur Moderation."}
          </p>
        </div>
      )}
    </div>
  );
}
