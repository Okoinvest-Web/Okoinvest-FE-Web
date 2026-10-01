"use client";

// Compliance-Prüfansicht „Eigene Identifizierung“: gewählter Weg und Zulässigkeit, MRZ-Befund (Ampel, Befunde, Zeilen),
// Videoidentifizierung mit Pflicht-Checkliste, Einmalcode (TAN), Abschluss mit Begründung und Protokollen als PDF.
// Alle Regeln prüft der Server (backend/demo/kycIdent.js bzw. plattform/api/kyc_ident.py).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, CircleDashed, ExternalLink, FileText, KeyRound, Play, Send, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Badge, Hinweis, Karte } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { datumZeit } from "@/lib/plattform/format";
import { KYC_VIDEO_ABBRUCHGRUENDE, KYC_VIDEO_CHECKLISTE, KYC_VIDEO_ERGEBNISSE, KYC_VIDEO_HINWEIS, KYC_VIDEO_DATENSCHUTZ } from "@/lib/plattform/kycIdent";
import { MrzAmpel, MrzBefundListe } from "./MrzEingabe";

const VIDEO_STATUS = { offen: "kein Termin", gebucht: "Termin gebucht", laufend: "Gespräch läuft", bestanden: "bestanden", abgebrochen: "abgebrochen", verdacht: "Verdacht" };
const STATUS_TON = { bestanden: "ok", verdacht: "warn", abgebrochen: "neutral", laufend: "info", gebucht: "info", offen: "neutral" };

function Punkt({ p, wert, aktiv, aktion }) {
  const [notiz, setNotiz] = useState(wert?.notiz || "");
  const Icon = wert ? (wert.ok ? CheckCircle2 : XCircle) : CircleDashed;
  return (
    <li className="rounded-2xl p-3 ring-1 ring-inset ring-ink-200">
      <div className="flex items-start gap-2">
        <Icon aria-hidden="true" className={cn("mt-0.5 h-[18px] w-[18px] shrink-0", wert ? (wert.ok ? "text-ov-600" : "text-danger-600") : "text-ink-400")} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink-900">{p.label}</p>
          <p className="text-[12.5px] text-ink-500">{p.hinweis}{wert ? ` · ${wert.ok ? "bestätigt" : "nicht bestätigt"} ${datumZeit(wert.am)}${wert.notiz ? ` – ${wert.notiz}` : ""}` : ""}</p>
        </div>
      </div>
      {aktiv && !p.automatisch && (
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input aria-label={`Notiz zu: ${p.label}`} className={cn(eingabe, "h-10")} placeholder="Notiz (optional)" value={notiz} onChange={(e) => setNotiz(e.target.value)} />
          <Button size="sm" onClick={() => aktion({ aktion: "punkt", punkt: p.id, ok: true, notiz })}>Bestätigt</Button>
          <Button size="sm" variant="secondary" onClick={() => aktion({ aktion: "punkt", punkt: p.id, ok: false, notiz })}>Nicht bestätigt</Button>
        </div>
      )}
    </li>
  );
}

export default function IdentPruefung({ fall: f, ichId }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [code, setCode] = useState("");
  const [notiz, setNotiz] = useState("");
  const [ergebnis, setErgebnis] = useState("bestanden");
  const [abbruchgrund, setAbbruchgrund] = useState("");
  const [begruendung, setBegruendung] = useState("");
  const [zeilenZeigen, setZeilenZeigen] = useState(false);
  const video = f.video || { status: "offen", protokolle: [] };
  const laufend = (video.protokolle || []).find((p) => !p.beendetAm) || null;
  const meins = laufend && laufend.durchfuehrenderId === ichId;
  const abgeschlossen = ["verifiziert", "abgelehnt"].includes(f.status);
  const methode = (f.methoden || []).find((m) => m.id === f.methode);

  async function aktion(body, text = "Gespeichert.") {
    setFehler("");
    setErfolg("");
    try {
      const r = await senden(`/api/admin/compliance/${f.id}/video`, { body });
      setErfolg(r.hinweis || text);
      if (body.aktion === "tan_pruefen") setCode("");
      if (body.aktion === "notiz") setNotiz("");
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }

  return (
    <Karte titel="Identifizierung" untertitel="Gewählter Weg, MRZ-Prüfung und Videoidentifizierung durch die Compliance">
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{erfolg}</ErfolgBox>
      {(f.identGruende || []).length > 0 && (
        <Hinweis ton="warn" icon={AlertTriangle} className="mb-4" titel="Vor einer Verifizierung zu klären">
          <ul className="list-disc pl-5">{f.identGruende.map((g) => <li key={g}>{g}</li>)}</ul>
        </Hinweis>
      )}

      <h3 className="text-[13px] font-semibold uppercase tracking-wider text-ink-500">Weg</h3>
      <p className="mt-1 text-[14px] text-ink-800">{methode ? methode.label : f.methode || "Noch kein Weg gewählt (bisheriges Verfahren: Unterlagen)."}{methode && !methode.zulaessig ? ` – ${methode.grund}` : ""}</p>
      <p className="mt-1 text-[12.5px] text-ink-500">Zulässig für diesen Fall: {(f.methoden || []).filter((m) => m.zulaessig).map((m) => m.label).join(" · ") || "–"}</p>

      <h3 className="mt-5 flex flex-wrap items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-500">MRZ-Prüfung {f.mrz && <MrzAmpel ampel={f.mrz.ampel} />}</h3>
      {!f.mrz ? (
        <p className="mt-1 text-[14px] text-ink-500">Keine MRZ erfasst.</p>
      ) : (
        <div className="mt-2">
          <p className="text-[13px] text-ink-600">{f.mrz.formatLabel} · geprüft {datumZeit(f.mrz.geprueftAm)} · {f.mrz.zusammenfassung}</p>
          <MrzBefundListe befund={f.mrz} className="mt-2" />
          {f.mrz.zeilen && (
            <div className="mt-2">
              <button type="button" className="text-[13px] font-semibold text-ov-700 underline underline-offset-2" onClick={() => setZeilenZeigen(!zeilenZeigen)} aria-expanded={zeilenZeigen}>{zeilenZeigen ? "Zeilen ausblenden" : "Abgetippte Zeilen anzeigen"}</button>
              {zeilenZeigen && <pre className="mt-2 overflow-x-auto rounded-xl bg-ink-50 p-3 font-mono text-[12.5px] leading-relaxed text-ink-900">{f.mrz.zeilen.join("\n")}</pre>}
            </div>
          )}
        </div>
      )}

      <h3 className="mt-5 flex flex-wrap items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-500">
        Videoidentifizierung <Badge ton={STATUS_TON[video.status]}>{VIDEO_STATUS[video.status] || video.status}</Badge>
      </h3>
      {video.termin && <p className="mt-1 text-[14px] text-ink-800">Termin: {video.termin.zeitraum}{video.termin.mitarbeiter ? ` · im Kalender bei ${video.termin.mitarbeiter}` : ""}</p>}
      <p className="mt-1 text-[13px] text-ink-600">
        Videokonferenz-Werkzeug: {f.videoLink ? <a href={f.videoLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-ov-700 underline underline-offset-2">Link öffnen <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /></a> : "kein Link hinterlegt (Einstellungen)"}
      </p>
      <p className="mt-2 rounded-xl bg-sand-50 px-3 py-2 text-[12.5px] leading-relaxed text-ink-600">{KYC_VIDEO_HINWEIS} {KYC_VIDEO_DATENSCHUTZ}</p>

      {!laufend && !abgeschlossen && f.ichDarfVideo !== false && (
        <Button className="mt-3" size="sm" variant="navy" icon={Play} onClick={() => aktion({ aktion: "start" }, "Gespräch begonnen.")}>Gespräch beginnen</Button>
      )}
      {laufend && !meins && <Hinweis ton="info" className="mt-3">Dieses Gespräch führt {laufend.durchfuehrender || "eine andere Person"} (seit {datumZeit(laufend.gestartetAm)}).</Hinweis>}

      {laufend && (
        <div className="mt-4 space-y-4">
          <ol className="space-y-2">
            {KYC_VIDEO_CHECKLISTE.map((p) => <Punkt key={`${p.id}-${laufend.punkte?.[p.id]?.am || ""}`} p={p} wert={laufend.punkte?.[p.id]} aktiv={meins} aktion={aktion} />)}
          </ol>
          {meins && (
            <>
              <div className="rounded-2xl bg-navy-50 p-4">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-navy-900"><KeyRound aria-hidden="true" className="h-4 w-4" /> Einmalcode (TAN)</p>
                <p className="mt-1 text-[12.5px] text-navy-900/80">{laufend.tan ? `Gesendet ${datumZeit(laufend.tan.gesendetAm)} · gültig bis ${datumZeit(laufend.tan.gueltigBis)} · Fehlversuche ${laufend.tan.versuche}${laufend.tan.bestaetigt ? " · bestätigt" : ""}` : "Noch nicht gesendet. Die Person erhält den Code per E-Mail und liest ihn vor."}</p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <Button size="sm" variant="secondary" icon={Send} onClick={() => aktion({ aktion: "tan_senden", kanal: "email" }, "Code gesendet.")}>{laufend.tan ? "Neuen Code senden" : "Code per E-Mail senden"}</Button>
                  {laufend.tan && !laufend.tan.bestaetigt && (
                    <>
                      <label className="block">
                        <span className="mb-1 block text-[12px] font-semibold text-ink-600">Vorgelesener Code</span>
                        <input className={cn(eingabe, "h-10 w-[140px] font-mono tracking-[0.2em]")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
                      </label>
                      <Button size="sm" disabled={code.length !== 6} onClick={() => aktion({ aktion: "tan_pruefen", code })}>Prüfen</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <Feld id="v-notiz" label="Protokollnotiz"><input id="v-notiz" className={eingabe} value={notiz} onChange={(e) => setNotiz(e.target.value)} /></Feld>
                <Button size="md" variant="secondary" onClick={() => aktion({ aktion: "notiz", text: notiz })}>Notiz speichern</Button>
              </div>
              <div className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200">
                <p className="text-[14px] font-semibold text-ink-900">Gespräch abschließen</p>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Ergebnis der Videoidentifizierung">
                  {Object.entries(KYC_VIDEO_ERGEBNISSE).map(([k, e]) => (
                    <label key={k} className={cn("inline-flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-medium ring-1 ring-inset", ergebnis === k ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200")}>
                      <input type="radio" name="v-ergebnis" value={k} checked={ergebnis === k} onChange={() => setErgebnis(k)} className="sr-only" />{e.label}
                    </label>
                  ))}
                </div>
                {ergebnis === "abgebrochen" && (
                  <Feld id="v-abbruch" label="Abbruchgrund" pflicht className="mt-3">
                    <select id="v-abbruch" className={auswahlfeld} value={abbruchgrund} onChange={(e) => setAbbruchgrund(e.target.value)}>
                      <option value="">Bitte wählen</option>
                      {Object.entries(KYC_VIDEO_ABBRUCHGRUENDE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </Feld>
                )}
                <Feld id="v-begr" label={ergebnis === "verdacht" ? "Begründung (intern – die Person wird nicht informiert)" : "Begründung"} pflicht className="mt-3">
                  <textarea id="v-begr" className={textbereich} value={begruendung} onChange={(e) => setBegruendung(e.target.value)} />
                </Feld>
                <Button className="mt-3" onClick={() => aktion({ aktion: "abschluss", ergebnis, abbruchgrund, begruendung })}>Ergebnis speichern</Button>
              </div>
            </>
          )}
        </div>
      )}

      {(video.protokolle || []).filter((p) => p.beendetAm).length > 0 && (
        <>
          <h3 className="mt-5 text-[13px] font-semibold uppercase tracking-wider text-ink-500">Protokolle</h3>
          <ul className="mt-2 divide-y divide-ink-100">
            {video.protokolle.filter((p) => p.beendetAm).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-navy-700" />
                <div className="min-w-0 flex-1 text-[13.5px] text-ink-800">
                  <p><strong>{p.id}</strong> · {datumZeit(p.gestartetAm)} – {datumZeit(p.beendetAm)} · {p.durchfuehrender || "–"}</p>
                  <p className="text-[12.5px] text-ink-500">{p.begruendung}{p.abbruchgrund ? ` (${KYC_VIDEO_ABBRUCHGRUENDE[p.abbruchgrund]})` : ""}</p>
                  <p className="truncate font-mono text-[11px] text-ink-400" title={p.hash}>{p.hash}</p>
                </div>
                <Badge ton={KYC_VIDEO_ERGEBNISSE[p.ergebnis]?.ton}>{KYC_VIDEO_ERGEBNISSE[p.ergebnis]?.label || p.ergebnis}</Badge>
                <Button size="sm" variant="secondary" href={`/api/admin/compliance/${f.id}/video?protokoll=${p.id}&anzeigen=1`} target="_blank" rel="noopener">PDF</Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Karte>
  );
}
