"use client";

// Service & Support – Ticket eröffnen, antworten (mit Anhang, intern für das Backoffice), Aktionen (Status, Priorität,
// Zuweisung; Kunde: schließen) und „Ticket aus Störung“ für den Betrieb.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Paperclip, Send } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { TICKET_KATEGORIEN, TICKET_PRIORITAETEN, TICKET_STATUS } from "@/lib/plattform/tickets";

export function TicketNeu({ anlagen = [], startKategorie = "" }) {
  const router = useRouter();
  const [kategorie, setKategorie] = useState(TICKET_KATEGORIEN[startKategorie] ? startKategorie : anlagen.length ? "stoerung" : "portal");
  const [betreff, setBetreff] = useState("");
  const [text, setText] = useState("");
  const [prioritaet, setPrioritaet] = useState("normal");
  const [anlageId, setAnlageId] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  async function absenden(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      const r = await senden("/api/portal/support", { body: { kategorie, betreff, text, prioritaet, anlageId: anlageId || undefined } });
      router.push(`/portal/support/${r.ticket.id}`);
    } catch (err) {
      setFehler(err.message);
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={absenden} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Feld id="tn-kat" label="Thema" hinweis={TICKET_KATEGORIEN[kategorie]?.text}>
          <select id="tn-kat" value={kategorie} onChange={(e) => setKategorie(e.target.value)} className={auswahlfeld}>
            {Object.entries(TICKET_KATEGORIEN).map(([id, k]) => <option key={id} value={id}>{k.label}</option>)}
          </select>
        </Feld>
        <Feld id="tn-prio" label="Dringlichkeit">
          <select id="tn-prio" value={prioritaet} onChange={(e) => setPrioritaet(e.target.value)} className={auswahlfeld}>
            {["niedrig", "normal", "hoch"].map((p) => <option key={p} value={p}>{TICKET_PRIORITAETEN[p].label} – Antwort in der Regel binnen {TICKET_PRIORITAETEN[p].reaktionH} Std.</option>)}
          </select>
        </Feld>
      </div>
      {anlagen.length > 0 && (
        <Feld id="tn-anlage" label="Betroffene Anlage (optional)">
          <select id="tn-anlage" value={anlageId} onChange={(e) => setAnlageId(e.target.value)} className={auswahlfeld}>
            <option value="">– keine –</option>
            {anlagen.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Feld>
      )}
      <Feld id="tn-betreff" label="Betreff" pflicht>
        <input id="tn-betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} className={eingabe} required minLength={4} maxLength={160} />
      </Feld>
      <Feld id="tn-text" label="Beschreibung" pflicht hinweis="Bitte keine Passwörter oder Bankdaten senden. Dateien (Foto, PDF) können Sie nach dem Absenden anhängen.">
        <textarea id="tn-text" value={text} onChange={(e) => setText(e.target.value)} className={textbereich} required minLength={10} maxLength={5000} />
      </Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <Button type="submit" disabled={laeuft} icon={Send}>{laeuft ? "Wird gesendet …" : "Anfrage senden"}</Button>
    </form>
  );
}

export function TicketAntwort({ ticketId, backoffice = false, darfAntworten = true }) {
  const router = useRouter();
  const datei = useRef(null);
  const [text, setText] = useState("");
  const [intern, setIntern] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  async function antworten(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      if (text.trim()) await senden(`/api/portal/support/${ticketId}`, { body: { text, intern } });
      const f = datei.current?.files?.[0];
      if (f) {
        const fd = new FormData();
        fd.append("datei", f);
        const res = await fetch(`/api/portal/support/${ticketId}/anhang`, { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || "Anhang konnte nicht hochgeladen werden.");
        datei.current.value = "";
      }
      setText("");
      setIntern(false);
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  if (!darfAntworten) return <p className="text-[13.5px] text-ink-500">Mit Ihrer Rolle können Sie dieses Ticket nur lesen.</p>;
  return (
    <form onSubmit={antworten} className="space-y-3">
      <label htmlFor="ta-text" className="sr-only">Antwort</label>
      <textarea id="ta-text" value={text} onChange={(e) => setText(e.target.value)} className={cn(textbereich, intern && "bg-sun-300/10 ring-sun-400/60")} maxLength={5000} placeholder={intern ? "Interne Notiz – für den Kunden unsichtbar" : "Ihre Nachricht …"} />
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
          <Paperclip aria-hidden="true" className="h-4 w-4" /> Datei anhängen
          <input ref={datei} type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" />
        </label>
        {backoffice && (
          <label className="inline-flex items-center gap-2 text-[13.5px] text-ink-700">
            <input type="checkbox" checked={intern} onChange={(e) => setIntern(e.target.checked)} className="h-4 w-4 accent-ov-600" />
            <Lock aria-hidden="true" className="h-3.5 w-3.5" /> Interne Notiz
          </label>
        )}
        <Button type="submit" size="sm" icon={Send} disabled={laeuft} className="ml-auto">{laeuft ? "Sendet …" : intern ? "Notiz speichern" : "Senden"}</Button>
      </div>
      <FehlerBox>{fehler}</FehlerBox>
    </form>
  );
}

export function TicketAktionen({ ticket, backoffice = false, konten = [] }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [info, setInfo] = useState("");
  async function aktion(body) {
    setFehler("");
    setInfo("");
    try {
      await senden(`/api/portal/support/${ticket.id}`, { method: "PATCH", body });
      setInfo("Gespeichert.");
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }
  if (!backoffice) {
    if (!ticket.darfAntworten || ticket.status === "geschlossen") return null;
    return (
      <div className="space-y-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => aktion({ aktion: "schliessen" })}>Anliegen ist erledigt – Ticket schließen</Button>
        <FehlerBox>{fehler}</FehlerBox>
      </div>
    );
  }
  return (
    <fieldset disabled={!ticket.darfBearbeiten} className="space-y-3">
      <Feld id="tk-status" label="Status">
        <select id="tk-status" value={ticket.status} onChange={(e) => aktion({ aktion: "status", status: e.target.value })} className={auswahlfeld}>
          {Object.entries(TICKET_STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
        </select>
      </Feld>
      <Feld id="tk-prio" label="Priorität (SLA)">
        <select id="tk-prio" value={ticket.prioritaet} onChange={(e) => aktion({ aktion: "prioritaet", prioritaet: e.target.value })} className={auswahlfeld}>
          {Object.entries(TICKET_PRIORITAETEN).map(([id, p]) => <option key={id} value={id}>{p.label} – Reaktion {p.reaktionH} h, Lösung {p.loesungH} h</option>)}
        </select>
      </Feld>
      <Feld id="tk-zust" label="Zuständig">
        <select id="tk-zust" value={ticket.zustaendig?.id || ""} onChange={(e) => e.target.value && aktion({ aktion: "zuweisen", zustaendigId: e.target.value })} className={auswahlfeld}>
          <option value="">– wählen –</option>
          {konten.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
      </Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{info}</ErfolgBox>
    </fieldset>
  );
}

export function AusStoerung({ stoerungen = [] }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  async function uebernehmen(id) {
    setFehler("");
    try {
      const r = await senden("/api/admin/support", { body: { stoerungId: id } });
      router.push(`/portal/support/${r.ticket.id}`);
    } catch (e) {
      setFehler(e.message);
    }
  }
  if (!stoerungen.length) return <p className="text-[13.5px] text-ink-500">Keine offenen Störungen ohne Ticket.</p>;
  return (
    <div className="space-y-2">
    <FehlerBox>{fehler}</FehlerBox>
    <ul className="space-y-2">
      {stoerungen.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 px-3 py-2.5">
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-ink-900">{s.titel}</span>
            <span className="block truncate text-[12.5px] text-ink-500">{s.anlage?.name} · {s.schwereLabel}</span>
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={() => uebernehmen(s.id)}>Als Ticket</Button>
        </li>
      ))}
    </ul>
    </div>
  );
}
