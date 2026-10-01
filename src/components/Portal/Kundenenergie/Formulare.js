"use client";

// Formulare der Kundenseite Energie: Anliegen einreichen (Einspruch, Kündigung, Verlängerung, Übernahme), Störung melden,
// Kunden- und Backoffice-Aktionen an Anliegen, Schritte des Lieferantenwechsels. Validierung maßgeblich auf dem Server
// (backend/demo/kundenenergie.js bzw. Frappe); hier nur Bedienung. Mutationen als JSON über senden() (CSRF: Origin + JSON).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileWarning, Send, TriangleAlert, Undo2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Chip, ErfolgBox, Feld, FehlerBox, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { ANLIEGEN_ARTEN, EINSPRUCH_GRUENDE } from "@/lib/plattform/kundenenergie";
import { bestaetigen } from "@/components/ui/Rueckfrage";

function useAktion() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  async function los(url, body, { erfolgText = "Gespeichert.", danach } = {}) {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      const r = await senden(url, { body });
      setErfolg(typeof erfolgText === "function" ? erfolgText(r) : erfolgText);
      if (danach) danach(r);
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

const euro = (x) => (Number.isFinite(x) ? `${x.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "–");
const tag = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");
const heuteIso = () => new Date().toISOString().slice(0, 10);

const WAHL = [
  ["einspruch", "Rechnung beanstanden"],
  ["stoerung", "Störung melden"],
  ["kuendigung", "Kündigung"],
  ["verlaengerung", "Verlängerung"],
  ["kaufoption", "Übernahme der Anlage"],
];
const AUSWIRKUNG = { kein_ertrag: "Anlage liefert keinen Strom", weniger_ertrag: "Deutlich weniger Strom als üblich", sicherheit: "Sicherheitsrelevant (Geruch, Rauch, Beschädigung)", sonstiges: "Sonstiges (z. B. Anzeige, Geräusch)" };

/** Neues Anliegen bzw. Störungsmeldung – `auswahl` aus /api/portal/kundenenergie/anliegen?auswahl=1 */
export function AnliegenFormular({ auswahl, vorwahl = {} }) {
  const a = useAktion();
  const [art, setArt] = useState(WAHL.some(([k]) => k === vorwahl.art) ? vorwahl.art : "einspruch");
  const belege = auswahl?.belege || [];
  const anlagen = (auswahl?.anlagen || []).filter((x) => ["kunde", "team-schreiben"].includes(x.meinZugriff));
  const [f, setF] = useState({
    belegId: belege.some((b) => b.id === vorwahl.beleg) ? vorwahl.beleg : belege[0]?.id || "",
    anlageId: anlagen.some((x) => x.id === vorwahl.anlage) ? vorwahl.anlage : anlagen[0]?.id || "",
    grund: "menge", text: "", betragStrittigEur: "", wunschJahre: "5", wunschTermin: "", titel: "", auswirkung: "weniger_ertrag", bestaetigt: false,
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const anlage = anlagen.find((x) => x.id === f.anlageId) || null;
  const beleg = belege.find((b) => b.id === f.belegId) || null;
  const k = anlage?.vertrag?.kuendigung;
  const fehltVertrag = art !== "einspruch" && art !== "stoerung" && anlage && !anlage.vertrag;

  async function absenden(e) {
    e.preventDefault();
    if (art === "stoerung") {
      await a.los("/api/portal/kundenenergie/stoerung", { anlageId: f.anlageId, titel: f.titel, text: f.text, auswirkung: f.auswirkung }, { erfolgText: "Danke – die Störung ist gemeldet, der Betrieb ist informiert.", danach: () => setF((x) => ({ ...x, titel: "", text: "" })) });
      return;
    }
    if (art === "kuendigung" && !f.bestaetigt) return;
    const body = art === "einspruch" ? { art, belegId: f.belegId, grund: f.grund, text: f.text, betragStrittigEur: f.betragStrittigEur } : { art, anlageId: f.anlageId, text: f.text, wunschJahre: f.wunschJahre, wunschTermin: f.wunschTermin, bestaetigt: art === "kuendigung" ? f.bestaetigt : undefined };
    await a.los("/api/portal/kundenenergie/anliegen", body, { erfolgText: (r) => `Eingegangen – Ihr Anliegen ${r.anliegen?.id} wird bis voraussichtlich ${tag(r.anliegen?.zielAm)} bearbeitet.`, danach: () => setF((x) => ({ ...x, text: "", betragStrittigEur: "", bestaetigt: false })) });
  }

  return (
    <form onSubmit={absenden} className="grid gap-5" noValidate>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Worum geht es?</legend>
        <div className="flex flex-wrap gap-2">
          {WAHL.map(([k2, l]) => <Chip key={k2} type="radio" name="art" value={k2} checked={art === k2} onChange={() => setArt(k2)}>{l}</Chip>)}
        </div>
      </fieldset>

      {art === "einspruch" ? (
        belege.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Feld id="ke-beleg" label="Rechnung" pflicht className="md:col-span-2">
              <select id="ke-beleg" className={auswahlfeld} value={f.belegId} onChange={set("belegId")}>
                {belege.map((b) => <option key={b.id} value={b.id}>{b.nummer} · {tag(b.zeitraum?.von)}–{tag(b.zeitraum?.bis)} · {euro(b.brutto)}</option>)}
              </select>
            </Feld>
            <Feld id="ke-grund" label="Grund" pflicht>
              <select id="ke-grund" className={auswahlfeld} value={f.grund} onChange={set("grund")}>
                {Object.entries(EINSPRUCH_GRUENDE).map(([k2, l]) => <option key={k2} value={k2}>{l}</option>)}
              </select>
            </Feld>
            <Feld id="ke-betrag" label="Strittiger Betrag in € (optional)" hinweis={beleg ? `Rechnungsbetrag ${euro(beleg.brutto)} brutto` : ""}>
              <input id="ke-betrag" className={eingabe} inputMode="decimal" value={f.betragStrittigEur} onChange={set("betragStrittigEur")} placeholder="z. B. 180,00" />
            </Feld>
          </div>
        ) : (
          <p className="rounded-2xl bg-sand-50 px-4 py-3 text-[14px] text-ink-600 ring-1 ring-sand-200">Es liegen noch keine Contracting-Rechnungen vor, die Sie beanstanden könnten.</p>
        )
      ) : anlagen.length ? (
        <Feld id="ke-anlage" label="Anlage" pflicht>
          <select id="ke-anlage" className={auswahlfeld} value={f.anlageId} onChange={set("anlageId")}>
            {anlagen.map((x) => <option key={x.id} value={x.id}>{x.name}{x.ort ? ` · ${x.ort}` : ""}</option>)}
          </select>
        </Feld>
      ) : (
        <p className="rounded-2xl bg-sand-50 px-4 py-3 text-[14px] text-ink-600 ring-1 ring-sand-200">Ihrem Konto ist keine Anlage mit Schreibrecht zugeordnet. Bitte wenden Sie sich an die Inhaberin bzw. den Inhaber Ihrer Organisation.</p>
      )}

      {art === "stoerung" && anlagen.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Feld id="ke-titel" label="Was ist los?" pflicht hinweis="Kurz und konkret, z. B. „Wechselrichter 2 zeigt rote LED“">
            <input id="ke-titel" className={eingabe} value={f.titel} onChange={set("titel")} maxLength={140} />
          </Feld>
          <Feld id="ke-auswirkung" label="Auswirkung">
            <select id="ke-auswirkung" className={auswahlfeld} value={f.auswirkung} onChange={set("auswirkung")}>
              {Object.entries(AUSWIRKUNG).map(([k2, l]) => <option key={k2} value={k2}>{l}</option>)}
            </select>
          </Feld>
          {f.auswirkung === "sicherheit" && (
            <p role="alert" className="flex gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[14px] text-red-800 ring-1 ring-red-200 md:col-span-2"><TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />Bei Rauch, Brandgeruch oder Gefahr für Personen: Bereich meiden und sofort die Feuerwehr bzw. den Notruf verständigen. Die Meldung im Portal ersetzt keinen Notruf.</p>
          )}
        </div>
      )}

      {art === "kuendigung" && anlage?.vertrag && (
        <div className={cn("rounded-2xl px-4 py-3 text-[14px] leading-relaxed ring-1", k?.fristgerecht ? "bg-navy-50 text-navy-900 ring-navy-100" : "bg-sun-300/20 text-ink-900 ring-sun-400/40")}>
          Laufzeitende {tag(anlage.vertrag.ende)} · Kündigungsfrist {anlage.vertrag.kuendigungsfristMonate} Monate · {k?.fristgerecht ? <>fristgerecht bis <strong>{tag(k.stichtag)}</strong> (noch {k.tage} Tage)</> : <>Frist am {tag(k?.stichtag)} abgelaufen – bitte stattdessen eine Verlängerung bzw. Rückfrage stellen</>}
          {anlage.vertrag.endschaft && <span className="block text-[13px] text-ink-600">Vereinbarte Endschaftsregelung: {{ kaufoption: "Kaufoption", uebergang: "Übergang", verlaengerung: "Verlängerung", rueckbau: "Rückbau" }[anlage.vertrag.endschaft] || anlage.vertrag.endschaft}{anlage.vertrag.kaufoptionEur ? ` (Kaufpreis laut Vertrag ${euro(anlage.vertrag.kaufoptionEur)} netto)` : ""}</span>}
        </div>
      )}
      {art === "verlaengerung" && anlage?.vertrag && (
        <Feld id="ke-jahre" label="Gewünschte Verlängerung (Jahre)" pflicht hinweis={`Aktuelles Laufzeitende ${tag(anlage.vertrag.ende)}`}>
          <input id="ke-jahre" className={eingabe} inputMode="numeric" value={f.wunschJahre} onChange={set("wunschJahre")} />
        </Feld>
      )}
      {art === "kaufoption" && anlage?.vertrag && (
        <Feld id="ke-termin" label="Wunschtermin der Übernahme" hinweis={anlage.vertrag.kaufoptionEur ? `Im Vertrag vereinbart: ${euro(anlage.vertrag.kaufoptionEur)} netto zum Laufzeitende – ein verbindliches Angebot erhalten Sie im Portal.` : "Sie erhalten ein verbindliches Angebot im Portal."}>
          <input id="ke-termin" type="date" className={eingabe} min={heuteIso()} value={f.wunschTermin} onChange={set("wunschTermin")} />
        </Feld>
      )}
      {fehltVertrag && <p className="text-[14px] text-ink-600">Für diese Anlage ist kein Stromliefervertrag hinterlegt.</p>}

      <Feld id="ke-text" label={art === "einspruch" ? "Begründung" : art === "stoerung" ? "Beschreibung (optional)" : "Nachricht (optional)"} pflicht={art === "einspruch"} hinweis={art === "einspruch" ? "Bitte nennen Sie z. B. den abweichenden Zählerstand mit Datum oder den aus Ihrer Sicht richtigen Preis." : ""}>
        <textarea id="ke-text" className={textbereich} value={f.text} onChange={set("text")} maxLength={3000} />
      </Feld>
      {art === "kuendigung" && (
        <label className="flex items-start gap-2 text-[14px] leading-snug text-ink-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ov-600" checked={f.bestaetigt} onChange={set("bestaetigt")} />
          Ich erkläre für mein Unternehmen die ordentliche Kündigung des Stromliefervertrags zum Laufzeitende. Die Kündigung wird mit Zeitpunkt und Konto protokolliert und von ÖkoInvest schriftlich bestätigt.
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" icon={art === "stoerung" ? TriangleAlert : Send} disabled={a.laeuft || (art === "einspruch" ? !belege.length : !anlagen.length) || (art === "kuendigung" && (!f.bestaetigt || !k?.fristgerecht))}>
          {a.laeuft ? "Bitte warten …" : art === "stoerung" ? "Störung melden" : art === "kuendigung" ? "Kündigung absenden" : art === "einspruch" ? "Einspruch einreichen" : "Anfrage senden"}
        </Button>
        {art !== "stoerung" && <span className="text-[12.5px] text-ink-500">Bearbeitungsziel: {ANLIEGEN_ARTEN[art]?.zielTage} Tage</span>}
      </div>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </form>
  );
}

/** Kundenaktionen an einem Anliegen: zurückziehen, Angebot annehmen/ablehnen */
export function AnliegenKundenAktionen({ anliegen: x }) {
  const a = useAktion();
  const [ok, setOk] = useState(false);
  const ids = x.aktionen.map((y) => y.id);
  if (!ids.length) return null;
  const url = `/api/portal/kundenenergie/anliegen/${x.id}`;
  return (
    <div className="grid gap-3">
      {ids.includes("annehmen") && (
        <label className="flex items-start gap-2 text-[14px] leading-snug text-ink-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ov-600" checked={ok} onChange={(e) => setOk(e.target.checked)} />
          Ich nehme das Angebot für mein Unternehmen an. Der Nachtrag bzw. Kaufvertrag wird mir zur Unterschrift übermittelt.
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {ids.includes("annehmen") && <Button size="sm" icon={Check} disabled={a.laeuft || !ok} onClick={() => a.los(url, { aktion: "annehmen", bestaetigt: true }, { erfolgText: "Angebot angenommen." })}>Angebot annehmen</Button>}
        {ids.includes("ausschlagen") && <Button size="sm" variant="secondary" icon={X} disabled={a.laeuft} onClick={async () => (await bestaetigen({ titel: "Angebot ablehnen?", text: "Das Angebot verfällt und kann danach nicht mehr angenommen werden.", bestaetigenText: "Angebot ablehnen", gefahr: true })) && a.los(url, { aktion: "ausschlagen" }, { erfolgText: "Angebot abgelehnt." })}>Nicht annehmen</Button>}
        {ids.includes("zurueckziehen") && <Button size="sm" variant="ghost" icon={Undo2} disabled={a.laeuft} onClick={async () => (await bestaetigen({ titel: "Anliegen zurückziehen?", text: "Die Bearbeitung wird beendet.", bestaetigenText: "Anliegen zurückziehen", gefahr: true })) && a.los(url, { aktion: "zurueckziehen" }, { erfolgText: "Zurückgezogen." })}>Zurückziehen</Button>}
      </div>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </div>
  );
}

/** Backoffice: Prüfen, Entscheiden, Angebot unterbreiten */
export function AnliegenBoAktionen({ anliegen: x }) {
  const a = useAktion();
  const ids = x.aktionen.map((y) => y.id);
  const entscheid = ids.filter((id) => ["stattgeben", "teilweise", "ablehnen", "bestaetigen", "angebot"].includes(id));
  const [aktion, setAktion] = useState(entscheid[0] || "");
  const [f, setF] = useState({ begruendung: "", korrekturEur: x.betragStrittigEur ?? "", betragEur: "", stichtag: x.wunschTermin || "", jahre: x.wunschJahre ?? 5, preisCt: "", grundgebuehrMonat: "", gueltigBis: "", text: "" });
  const set = (k) => (e) => setF((y) => ({ ...y, [k]: e.target.value }));
  if (!ids.length) return <p className="text-[13.5px] text-ink-500">Keine Aktion möglich.</p>;
  const url = `/api/admin/finanzen/anliegen/${x.id}`;
  const label = x.aktionen.reduce((m, y) => ({ ...m, [y.id]: y.label }), {});
  return (
    <div className="grid gap-3">
      {ids.includes("pruefen") && <div><Button size="sm" variant="secondary" disabled={a.laeuft} onClick={() => a.los(url, { aktion: "pruefen" }, { erfolgText: "In Prüfung." })}>In Prüfung nehmen</Button></div>}
      {entscheid.length > 0 && (
        <div className="grid gap-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
          <div className="flex flex-wrap gap-2">{entscheid.map((id) => <Chip key={id} type="radio" name={`akt-${x.id}`} value={id} checked={aktion === id} onChange={() => setAktion(id)}>{label[id]}</Chip>)}</div>
          {aktion === "angebot" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {x.art === "kaufoption" ? (
                <>
                  <Feld id={`bet-${x.id}`} label="Kaufpreis netto (€)" pflicht><input id={`bet-${x.id}`} className={eingabe} inputMode="decimal" value={f.betragEur} onChange={set("betragEur")} /></Feld>
                  <Feld id={`st-${x.id}`} label="Übergabestichtag" pflicht><input id={`st-${x.id}`} type="date" className={eingabe} value={f.stichtag} onChange={set("stichtag")} /></Feld>
                </>
              ) : (
                <>
                  <Feld id={`j-${x.id}`} label="Verlängerung (Jahre)" pflicht><input id={`j-${x.id}`} className={eingabe} inputMode="numeric" value={f.jahre} onChange={set("jahre")} /></Feld>
                  <Feld id={`p-${x.id}`} label="Arbeitspreis (ct/kWh netto)" pflicht><input id={`p-${x.id}`} className={eingabe} inputMode="decimal" value={f.preisCt} onChange={set("preisCt")} /></Feld>
                  <Feld id={`g-${x.id}`} label="Grundgebühr (€/Monat, optional)"><input id={`g-${x.id}`} className={eingabe} inputMode="decimal" value={f.grundgebuehrMonat} onChange={set("grundgebuehrMonat")} /></Feld>
                </>
              )}
              <Feld id={`gb-${x.id}`} label="Angebot gültig bis" pflicht><input id={`gb-${x.id}`} type="date" className={eingabe} min={heuteIso()} value={f.gueltigBis} onChange={set("gueltigBis")} /></Feld>
              <Feld id={`t-${x.id}`} label="Erläuterung (optional)" className="sm:col-span-2"><textarea id={`t-${x.id}`} className={cn(textbereich, "min-h-[80px]")} value={f.text} onChange={set("text")} /></Feld>
            </div>
          ) : (
            <>
              {["stattgeben", "teilweise"].includes(aktion) && (
                <Feld id={`k-${x.id}`} label="Korrektur (Gutschrift) in € netto" pflicht={aktion === "teilweise"} hinweis="Die Buchhaltung erhält einen Klärfall zur Gutschrift bzw. Korrekturrechnung.">
                  <input id={`k-${x.id}`} className={eingabe} inputMode="decimal" value={f.korrekturEur} onChange={set("korrekturEur")} />
                </Feld>
              )}
              <Feld id={`b-${x.id}`} label={aktion === "bestaetigen" ? "Bestätigungstext an den Kunden" : "Begründung an den Kunden"} pflicht>
                <textarea id={`b-${x.id}`} className={cn(textbereich, "min-h-[88px]")} value={f.begruendung} onChange={set("begruendung")} />
              </Feld>
            </>
          )}
          <div><Button size="sm" icon={FileWarning} disabled={a.laeuft || !aktion} onClick={() => a.los(url, { aktion, ...f }, { erfolgText: "Gespeichert – der Kunde ist benachrichtigt." })}>{label[aktion] || "Speichern"}</Button></div>
        </div>
      )}
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </div>
  );
}

/** Schritt des Lieferantenwechsels bestätigen (Kunde, Versorger oder Backoffice – URL je Rolle) */
export function WechselSchrittKnopf({ url, schritt, label }) {
  const a = useAktion();
  const [offen, setOffen] = useState(false);
  const [bemerkung, setB] = useState("");
  return (
    <div className="grid gap-2">
      {offen ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input aria-label="Bemerkung (optional)" className={eingabe} value={bemerkung} onChange={(e) => setB(e.target.value)} maxLength={300} placeholder="Bemerkung (optional, z. B. Vertragsnummer)" />
          <div className="flex gap-2">
            <Button size="sm" icon={Check} disabled={a.laeuft} onClick={() => a.los(url, { schritt, bemerkung }, { erfolgText: "Bestätigt." })}>Bestätigen</Button>
            <Button size="sm" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>
          </div>
        </div>
      ) : (
        <div><Button size="sm" variant="secondary" icon={Check} onClick={() => setOffen(true)}>{label}</Button></div>
      )}
      <FehlerBox>{a.fehler}</FehlerBox>
    </div>
  );
}
