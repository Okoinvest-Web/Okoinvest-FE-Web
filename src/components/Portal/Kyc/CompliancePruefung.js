"use client";

// Prüfarbeitsplatz der Compliance: Unterlagen mit Prüfliste (je Dokumentart), Sanktionstreffer bewerten, Risiko manuell,
// Entscheidung (verifiziert / nachgefordert / abgelehnt) inkl. Vier-Augen-Zweitfreigabe, Notizen, Ende der Geschäftsbeziehung.
// Alle Regeln prüft der Server (backend/demo/kyc.js bzw. plattform/api/kyc.py).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, FileText, RefreshCw, ShieldAlert, UserCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Hinweis, Karte } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { datum, dateigroesse } from "@/lib/plattform/format";
import { KYC_PRUEFPUNKTE, ibanMaskiert } from "@/lib/plattform/kyc";

function DokumentPruefung({ d, aktiv, aktion }) {
  const [punkte, setPunkte] = useState(() => Object.fromEntries(d.pruefpunkte.map((p) => [p, !!d.pruefung?.punkte?.[p]])));
  const [notiz, setNotiz] = useState(d.pruefung?.notiz || "");
  const alle = d.pruefpunkte.every((p) => punkte[p]);
  return (
    <li className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><FileText aria-hidden="true" className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-900">{d.artLabel}{d.flaeche ? ` – ${d.flaeche}` : ""}</p>
          <p className="truncate text-[12.5px] text-ink-500">{d.name} · {dateigroesse(d.groesse)} · {datum(d.am)}{d.ausgestelltAm ? ` · ausgestellt ${datum(d.ausgestelltAm)}` : ""} · SHA-256 {String(d.sha256 || "").slice(0, 12)}…</p>
        </div>
        <Badge ton={d.status === "ok" ? "ok" : d.status === "abgelehnt" ? "warn" : "neutral"}>{d.status === "ok" ? "geprüft" : d.status === "abgelehnt" ? "nicht akzeptiert" : "ungeprüft"}</Badge>
        <Button href={`/api/admin/compliance/dokumente/${d.id}?anzeigen=1`} target="_blank" rel="noopener" size="sm" variant="secondary" icon={Eye}>Ansehen</Button>
      </div>
      {aktiv && (
        <div className="mt-3 border-t border-ink-100 pt-3">
          <fieldset>
            <legend className="text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">Prüfliste</legend>
            <div className="mt-2 grid gap-1.5">
              {d.pruefpunkte.map((p) => (
                <label key={p} className="flex items-start gap-2 text-[14px] text-ink-800">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ov-600" checked={punkte[p]} onChange={(e) => setPunkte({ ...punkte, [p]: e.target.checked })} />
                  {KYC_PRUEFPUNKTE[p]}
                </label>
              ))}
            </div>
          </fieldset>
          <Feld id={`n-${d.id}`} label="Notiz (bei Ablehnung Pflicht, wird dem Nutzer angezeigt)" className="mt-3">
            <input id={`n-${d.id}`} className={eingabe} value={notiz} onChange={(e) => setNotiz(e.target.value)} />
          </Feld>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" icon={CheckCircle2} disabled={!alle} onClick={() => aktion({ aktion: "pruefliste", dokumentId: d.id, punkte, ergebnis: "ok", notiz })}>Geprüft</Button>
            <Button size="sm" variant="secondary" onClick={() => aktion({ aktion: "pruefliste", dokumentId: d.id, punkte, ergebnis: "abgelehnt", notiz })}>Nicht akzeptieren</Button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function CompliancePruefung({ fall: f, ichId }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [ergebnis, setErgebnis] = useState("verifiziert");
  const [grund, setGrund] = useState("");
  const [risiko, setRisiko] = useState(f.risiko || "mittel");
  const [risikoGrund, setRisikoGrund] = useState("");
  const [bewertung, setBewertung] = useState({});
  const [notiz, setNotiz] = useState("");
  const [ende, setEnde] = useState("");
  const inPruefung = ["eingereicht", "in_pruefung", "zweitpruefung"].includes(f.status);
  const zweit = f.status === "zweitpruefung";
  const offeneTreffer = (f.sanktionenDetail?.treffer || []).filter((t) => !t.bewertung).length;

  async function aktion(body, text = "Gespeichert.") {
    setFehler("");
    setErfolg("");
    try {
      const r = await senden(`/api/admin/compliance/${f.id}`, { body });
      setErfolg(r.hinweis || text);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }

  return (
    <>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{erfolg}</ErfolgBox>

      {f.status === "eingereicht" && (
        <Hinweis ton="info" icon={UserCheck} titel="Neu eingereicht">
          <Button size="sm" variant="navy" className="mt-2" onClick={() => aktion({ aktion: "uebernehmen" }, "Fall übernommen.")}>Prüfung übernehmen</Button>
        </Hinweis>
      )}

      <Karte titel="Unterlagen" untertitel="Entschlüsselte Ansicht nur für die Compliance – jeder Aufruf wird protokolliert.">
        <ul className="space-y-3">
          {f.dokumente.map((d) => <DokumentPruefung key={`${d.id}-${d.status}`} d={d} aktiv={inPruefung && !zweit} aktion={aktion} />)}
          {!f.dokumente.length && <li className="text-[14px] text-ink-500">Keine Unterlagen.</li>}
        </ul>
        {f.bank && (
          <div className="mt-4 rounded-2xl bg-ink-50 p-4 text-[14px] text-ink-800">
            <p className="font-semibold">Bankverbindung</p>
            <p className="mt-1 font-mono">{f.bank.ibanFormatiert || ibanMaskiert(f.bank.iban)}</p>
            <p className="mt-1">Kontoinhaber: {f.bank.kontoinhaber || "–"}</p>
            <p className="mt-1 text-[13px]">
              IBAN-Prüfziffer: <strong>{f.bank.ibanPruefung?.ok ? "korrekt" : f.bank.ibanPruefung?.fehler || "–"}</strong> · Inhaber = geprüfte Person/Firma: <strong>{f.bank.inhaberPasst ? "ja" : "nein – bitte klären"}</strong>
            </p>
          </div>
        )}
      </Karte>

      <Karte titel="Sanktionslisten-Abgleich" untertitel={f.sanktionenDetail ? `Liste ${f.sanktionenDetail.listeStand} · ${f.sanktionenDetail.listeQuelle}` : ""}
        aktion={<Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => aktion({ aktion: "abgleich" })}>Neu abgleichen</Button>}>
        {!(f.sanktionenDetail?.treffer || []).length ? (
          <p className="text-[14px] text-ov-800">Kein Treffer für {f.abgleiche?.[0]?.prueflinge ?? "–"} geprüfte Namen.</p>
        ) : (
          <ul className="space-y-3">
            {f.sanktionenDetail.treffer.map((t) => {
              const key = `${t.eintragId}|${t.prueflingName}`;
              return (
                <li key={key} className="rounded-2xl bg-sun-300/15 p-4 ring-1 ring-inset ring-sun-400/40">
                  <p className="flex flex-wrap items-center gap-2 text-[14px] text-ink-900">
                    <ShieldAlert aria-hidden="true" className="h-4 w-4" />
                    <strong>{t.prueflingName}</strong> ({t.pruefling}) ↔ <strong>{t.name}</strong>
                    <Badge ton="warn">{Math.round(t.score * 100)} %</Badge>
                    <Badge>Geburtsdatum {t.geburtsdatum}</Badge>
                    <span className="text-[12.5px] text-ink-500">{t.euRef || t.eintragId} {t.programm}</span>
                  </p>
                  {t.bewertung ? (
                    <p className="mt-2 text-[13.5px] text-ink-700">Bewertet: <strong>{t.bewertung === "ausgeschlossen" ? "kein Treffer (Namensgleichheit)" : "Treffer bestätigt"}</strong> – {t.begruendung}</p>
                  ) : (
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <input aria-label="Begründung" className={eingabe} placeholder="Begründung (z. B. abweichendes Geburtsdatum, andere Staatsangehörigkeit)" value={bewertung[key] || ""} onChange={(e) => setBewertung({ ...bewertung, [key]: e.target.value })} />
                      <Button size="sm" variant="secondary" onClick={() => aktion({ aktion: "treffer", eintragId: t.eintragId, prueflingName: t.prueflingName, bewertung: "ausgeschlossen", begruendung: bewertung[key] || "" })}>Kein Treffer</Button>
                      <Button size="sm" variant="navy" onClick={() => aktion({ aktion: "treffer", eintragId: t.eintragId, prueflingName: t.prueflingName, bewertung: "bestaetigt", begruendung: bewertung[key] || "" })}>Bestätigen</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">Ein bestätigter Treffer: Geldwäschebeauftragten einbeziehen, keine Mittel bereitstellen, Meldepflicht prüfen. Der Kunde darf darüber nicht informiert werden – im Portal sieht er weiterhin „In Prüfung“.</p>
      </Karte>

      <Karte titel="Risiko">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <Feld id="r-stufe" label="Stufe">
            <select id="r-stufe" className={auswahlfeld} value={risiko} onChange={(e) => setRisiko(e.target.value)}>
              <option value="niedrig">Niedrig</option><option value="mittel">Mittel</option><option value="hoch">Hoch</option>
            </select>
          </Feld>
          <Feld id="r-grund" label="Begründung der manuellen Einstufung"><input id="r-grund" className={eingabe} value={risikoGrund} onChange={(e) => setRisikoGrund(e.target.value)} /></Feld>
          <Button size="md" variant="secondary" onClick={() => aktion({ aktion: "risiko", stufe: risiko, begruendung: risikoGrund })}>Einstufen</Button>
        </div>
      </Karte>

      {inPruefung && (
        <Karte titel={zweit ? "Zweitfreigabe (Vier-Augen)" : "Entscheidung"} untertitel={zweit ? (f.ichBinErstpruefer ? "Sie haben die Erstprüfung durchgeführt – die Zweitfreigabe muss eine andere Person erteilen." : "Erstprüfung positiv. Bitte unabhängig prüfen.") : f.vierAugen ? "Hohes Risiko: nach Ihrer Freigabe ist eine Zweitfreigabe durch eine weitere Person nötig." : ""}>
          {offeneTreffer > 0 && <Hinweis ton="warn" className="mb-3">Offene Sanktionstreffer: {offeneTreffer}. Eine Verifizierung ist erst nach Bewertung möglich.</Hinweis>}
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ergebnis">
            {[["verifiziert", "Verifiziert"], ["nachgefordert", "Nachfordern"], ["abgelehnt", "Ablehnen"]].map(([k, l]) => (
              <label key={k} className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-medium ring-1 ring-inset ${ergebnis === k ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200"}`}>
                <input type="radio" name="ergebnis" value={k} checked={ergebnis === k} onChange={() => setErgebnis(k)} className="sr-only" />{l}
              </label>
            ))}
          </div>
          <Feld id="e-grund" label={ergebnis === "nachgefordert" ? "Was ist nachzureichen? (wird dem Nutzer angezeigt)" : ergebnis === "abgelehnt" ? "Begründung (intern, der Nutzer erhält einen neutralen Hinweis)" : "Vermerk (optional)"} className="mt-3">
            <textarea id="e-grund" className={textbereich} value={grund} onChange={(e) => setGrund(e.target.value)} />
          </Feld>
          <Button className="mt-3" disabled={zweit && f.ichBinErstpruefer} onClick={() => aktion({ aktion: zweit ? "zweitfreigabe" : "entscheiden", ergebnis, grund })}>
            {zweit ? "Zweitfreigabe speichern" : "Entscheidung speichern"}
          </Button>
        </Karte>
      )}

      <Karte titel="Notiz und Fristen">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Feld id="k-notiz" label="Interne Notiz"><input id="k-notiz" className={eingabe} value={notiz} onChange={(e) => setNotiz(e.target.value)} /></Feld>
          <Button variant="secondary" onClick={() => aktion({ aktion: "notiz", text: notiz })}>Notiz speichern</Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Feld id="k-ende" label="Ende der Geschäftsbeziehung" hinweis={f.beziehungEnde ? `Eingetragen: ${datum(f.beziehungEnde)} · Löschung ab ${datum(f.loeschenAb)}` : "Startet die Aufbewahrungsfrist (5 Jahre ab Ende des Kalenderjahres)."}>
            <input id="k-ende" type="date" className={eingabe} value={ende} onChange={(e) => setEnde(e.target.value)} />
          </Feld>
          <Button variant="secondary" onClick={() => aktion({ aktion: "beziehungEnde", datum: ende })}>Eintragen</Button>
        </div>
        <p className="mt-3 text-[12.5px] text-ink-500">Angemeldet als {ichId}. Alle Aktionen werden mit Zeitpunkt im Revisionsprotokoll vermerkt.</p>
      </Karte>
    </>
  );
}
