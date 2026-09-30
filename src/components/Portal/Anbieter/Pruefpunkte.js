"use client";

// Rückfragen / Nachbesserung: Backoffice legt Prüfpunkte mit Frist an, Anbieter antwortet, Backoffice schließt ab
// oder öffnet erneut. Offene Rückfragen sperren das Einreichen, ungeklärte Pflichtpunkte die Veröffentlichung.

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Send } from "lucide-react";
import { Badge, Hinweis } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { PRUEFPUNKT_BEREICHE, PRUEFPUNKT_FRIST } from "@/lib/plattform/anbieter/regeln.js";
import { HinweisListe, knopfPrimaer, knopfSekundaer, tag, useAnbieterAktion, zeit } from "./gemeinsam";

function Punkt({ pp, akte, setAkte }) {
  const admin = akte.rolle === "admin";
  const a = useAnbieterAktion(akte.projekt.id, setAkte, { admin });
  const [antwort, setAntwort] = useState("");
  const [kommentar, setKommentar] = useState("");
  const schreiben = akte.rechte.schreiben;
  return (
    <li className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200/70">
      <div className="flex flex-wrap items-center gap-2">
        <Badge ton={pp.ton}>{pp.statusLabel}</Badge>
        <Badge>{PRUEFPUNKT_BEREICHE[pp.bereich] || pp.bereich}</Badge>
        {pp.pflicht && <Badge ton="dunkel">Pflicht</Badge>}
        {pp.status === "offen" && pp.fristAm && (
          <span className={`inline-flex items-center gap-1 text-[12.5px] ${pp.ueberfaellig ? "font-semibold text-red-700" : "text-ink-500"}`}>
            <Clock aria-hidden="true" className="h-3.5 w-3.5" /> Antwort bis {tag(pp.fristAm)}{pp.ueberfaellig ? " – überfällig" : ""}
          </span>
        )}
      </div>
      <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-900">{pp.text}</p>
      <p className="mt-1 text-[12px] text-ink-500">{pp.erstelltVon ? `${pp.erstelltVon} · ` : ""}{zeit(pp.erstelltAm)}</p>
      {pp.antwort && (
        <div className="mt-3 rounded-xl bg-ov-50/60 px-3.5 py-2.5 text-[14px] leading-relaxed text-ink-800 ring-1 ring-inset ring-ov-200">
          <p className="text-[12px] font-semibold text-ov-800">Antwort{pp.beantwortetVon ? ` von ${pp.beantwortetVon}` : ""} · {zeit(pp.beantwortetAm)}</p>
          <p className="mt-1 whitespace-pre-line">{pp.antwort}</p>
        </div>
      )}
      {pp.kommentar && <p className="mt-2 text-[13.5px] text-ink-600"><span className="font-semibold">Backoffice:</span> {pp.kommentar}</p>}

      {!admin && schreiben && pp.status === "offen" && (
        <form className="mt-3 space-y-2" onSubmit={async (e) => { e.preventDefault(); if (await a.los({ aktion: "pruefpunkt_antworten", id: pp.id, antwort }, "Antwort gesendet – das Backoffice prüft sie.")) setAntwort(""); }}>
          <label htmlFor={`pp-${pp.id}`} className="sr-only">Antwort</label>
          <textarea id={`pp-${pp.id}`} className={textbereich} value={antwort} onChange={(e) => setAntwort(e.target.value)} placeholder="Ihre Antwort – ggf. mit Hinweis auf das hochgeladene Dokument im Datenraum" maxLength={3000} />
          <button type="submit" className={knopfPrimaer} disabled={a.laeuft || antwort.trim().length < 5}><Send aria-hidden="true" className="h-4 w-4" /> Antwort senden</button>
        </form>
      )}
      {admin && schreiben && ["offen", "beantwortet", "erledigt"].includes(pp.status) && (
        <div className="mt-3 space-y-2">
          <label htmlFor={`ppk-${pp.id}`} className="sr-only">Kommentar</label>
          <input id={`ppk-${pp.id}`} className={eingabe} value={kommentar} onChange={(e) => setKommentar(e.target.value)} placeholder="Kommentar (Pflicht bei „erneut öffnen“)" maxLength={1000} />
          <div className="flex flex-wrap gap-2">
            {pp.status !== "erledigt" && <button type="button" className={knopfPrimaer} disabled={a.laeuft} onClick={() => a.los({ aktion: "pruefpunkt", id: pp.id, schritt: "erledigt", kommentar }, "Prüfpunkt erledigt.")}><CheckCircle2 aria-hidden="true" className="h-4 w-4" /> Erledigt</button>}
            {pp.status !== "offen" && <button type="button" className={knopfSekundaer} disabled={a.laeuft} onClick={() => a.los({ aktion: "pruefpunkt", id: pp.id, schritt: "erneut", kommentar }, "Erneut an den Anbieter.")}>Erneut öffnen</button>}
            {pp.status !== "erledigt" && <button type="button" className={knopfSekundaer} disabled={a.laeuft} onClick={() => a.los({ aktion: "pruefpunkt", id: pp.id, schritt: "verwerfen", kommentar }, "Prüfpunkt entfällt.")}>Entfällt</button>}
          </div>
        </div>
      )}
      <div className="mt-2 space-y-2"><FehlerBox>{a.fehler}</FehlerBox><ErfolgBox>{a.erfolg}</ErfolgBox></div>
    </li>
  );
}

function NeuerPunkt({ akte, setAkte }) {
  const a = useAnbieterAktion(akte.projekt.id, setAkte, { admin: true });
  const [bereich, setBereich] = useState("datenblatt");
  const [text, setText] = useState("");
  const [pflicht, setPflicht] = useState(true);
  const [frist, setFrist] = useState(PRUEFPUNKT_FRIST.standard);
  return (
    <form className="space-y-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70" onSubmit={async (e) => { e.preventDefault(); if (await a.los({ aktion: "pruefpunkt_anlegen", bereich, text, pflicht, fristTage: frist }, "Rückfrage an den Anbieter gesendet.")) setText(""); }}>
      <p className="font-display text-[15px] font-bold text-ink-900">Neue Rückfrage an den Anbieter</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld id="pp-bereich" label="Bereich">
          <select id="pp-bereich" className={auswahlfeld} value={bereich} onChange={(e) => setBereich(e.target.value)}>
            {Object.entries(PRUEFPUNKT_BEREICHE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Feld>
        <Feld id="pp-frist" label="Frist (Tage)">
          <input id="pp-frist" type="number" min={PRUEFPUNKT_FRIST.min} max={PRUEFPUNKT_FRIST.max} className={eingabe} value={frist} onChange={(e) => setFrist(e.target.value)} />
        </Feld>
      </div>
      <Feld id="pp-text" label="Rückfrage bzw. Nachbesserung" pflicht>
        <textarea id="pp-text" className={textbereich} value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} placeholder="z. B. Bitte Netzzusage vom … in den Datenraum (Stufe 1) laden und Befristung im Datenblatt ergänzen." />
      </Feld>
      <label className="flex items-center gap-2 text-[14px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={pflicht} onChange={(e) => setPflicht(e.target.checked)} /> Pflicht vor der Veröffentlichung</label>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <button type="submit" className={knopfPrimaer} disabled={a.laeuft || text.trim().length < 10}><Send aria-hidden="true" className="h-4 w-4" /> Rückfrage senden</button>
    </form>
  );
}

export default function Pruefpunkte({ akte, setAkte }) {
  const liste = akte.pruefpunkte || [];
  const admin = akte.rolle === "admin";
  const offen = liste.filter((x) => x.status === "offen").length;
  return (
    <div className="space-y-4">
      {!admin && offen > 0 && <Hinweis ton="warn" icon={AlertTriangle} titel={`${offen} Rückfrage${offen === 1 ? "" : "n"} offen`}>Das Einreichen ist erst möglich, wenn alle Rückfragen beantwortet sind. Antworten Sie direkt am Punkt; Unterlagen laden Sie im Datenraum hoch.</Hinweis>}
      {liste.length ? (
        <ul className="space-y-3">{liste.map((pp) => <Punkt key={pp.id} pp={pp} akte={akte} setAkte={setAkte} />)}</ul>
      ) : (
        <p className="text-[14px] text-ink-500">{admin ? "Noch keine Rückfragen. Legen Sie bei Lücken im Datenblatt oder in den Unterlagen einen Prüfpunkt mit Frist an – der Anbieter wird benachrichtigt." : "Keine Rückfragen des Backoffice. Sobald das Backoffice Nachbesserungen wünscht, erscheinen sie hier mit Frist."}</p>
      )}
      {admin && akte.rechte.schreiben && akte.projekt.status !== "verkauft" && <NeuerPunkt akte={akte} setAkte={setAkte} />}
    </div>
  );
}

export function Anonymitaet({ akte }) {
  const an = akte.anonymitaet || { treffer: [], ok: true };
  return (
    <div className="space-y-3">
      {an.ok && !an.treffer.length ? (
        <Hinweis ton="ok" icon={CheckCircle2}>Keine identifizierenden Angaben im öffentlichen Teaser gefunden (Titel, Region, Beschreibung, Highlights).</Hinweis>
      ) : (
        <>
          {!an.ok && <Hinweis ton="warn" icon={AlertTriangle} titel="Veröffentlichung gesperrt">Der Teaser nennt vertrauliche oder identifizierende Angaben. Bitte im Entwurf neutral formulieren (z. B. „Freifläche in Schwaben, Nähe Autobahn“ statt Gemeinde oder Flurstück).</Hinweis>}
          <HinweisListe hinweise={an.treffer.map((t) => ({ stufe: t.stufe, text: t.text }))} />
        </>
      )}
      <p className="text-[12.5px] leading-relaxed text-ink-500">Automatische Prüfung gegen Ihre vertraulichen Angaben (Gemeinde, Gemarkung, Flurstücke, Netzbetreiber), Kontaktdaten, Adressen und Koordinaten. Das Backoffice prüft zusätzlich manuell.</p>
    </div>
  );
}
