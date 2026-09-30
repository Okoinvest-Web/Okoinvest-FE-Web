"use client";

// Mitgliederbereich (Client-Teile): Beitrittserklärung, Aktionen der Mitgliedschaft (weitere Anteile, Kündigung, Übertragung,
// Zurückziehen), eingehende Übertragung, Online-Abstimmung, Beitritt/Kündigung Energiegemeinschaft.
// Alle Prüfungen serverseitig (mitglied/*.js im Backend) – hier nur Eingabe und Anzeige der Meldungen.

import { useId, useState } from "react";
import Button from "@/components/ui/Button";
import { Feld, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { ANREDEN, MITGLIED_ARTEN, kuendigungsStichtag } from "@/lib/plattform/mitglied/genossenschaft";
import { STIMMEN } from "@/lib/plattform/mitglied/versammlung";
import { Klappe, Knopf, Meldung, useAktion } from "./teile";

const URL = "/api/portal/mitglied";
const eurDe = (x) => `${Number(x || 0).toLocaleString("de-DE", { maximumFractionDigits: 2 })} €`;
const datumDe = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");

// ---------------------------------------------------------------- Beitrittserklärung

export function BeitrittFormular({ geno, konto = {} }) {
  const id = useId();
  const a = useAktion(URL);
  const [b, setB] = useState({ art: "privat", anrede: "", vorname: konto.vorname || "", nachname: konto.nachname || "", firma: konto.firma || "", vertretung: "", strasse: "", plz: "", ort: "", land: geno.land, geburtsdatum: "", iban: "", kontoinhaber: "", freistellung: false, anteile: String(Math.max(geno.minAnteile, 4)), bestaetigt: {} });
  const setze = (k, v) => setB((x) => ({ ...x, [k]: v }));
  const org = ["unternehmen", "kommune", "verein"].includes(b.art);
  const anteile = Math.max(0, Math.round(Number(b.anteile) || 0));
  async function absenden(e) {
    e.preventDefault();
    await a.ausfuehren({ aktion: "beitritt", genoId: geno.id, daten: { ...b, anteile } }, "Ihre Beitrittserklärung ist eingegangen. Bitte laden Sie die Erklärung als PDF, unterschreiben Sie sie und laden Sie den Scan in Ihrer Anfrage hoch – danach entscheidet der Vorstand über die Zulassung.");
  }
  return (
    <form onSubmit={absenden} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Feld id={`${id}-art`} label="Beitritt als" pflicht>
          <select id={`${id}-art`} className={auswahlfeld} value={b.art} onChange={(e) => setze("art", e.target.value)}>
            {Object.entries(MITGLIED_ARTEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-an`} label="Geschäftsanteile" pflicht hinweis={`${anteile} × ${eurDe(geno.anteilEur)} = ${eurDe(anteile * geno.anteilEur)} · erlaubt ${geno.minAnteile}–${geno.maxAnteile}`}>
          <input id={`${id}-an`} inputMode="numeric" required className={eingabe} value={b.anteile} onChange={(e) => setze("anteile", e.target.value)} />
        </Feld>
        {!org && (
          <Feld id={`${id}-anr`} label="Anrede">
            <select id={`${id}-anr`} className={auswahlfeld} value={b.anrede} onChange={(e) => setze("anrede", e.target.value)}>
              <option value="">–</option>
              {Object.entries(ANREDEN).filter(([k]) => k !== "firma").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Feld>
        )}
        {org && (
          <Feld id={`${id}-fi`} label="Name der Organisation" pflicht className="sm:col-span-2">
            <input id={`${id}-fi`} required className={eingabe} value={b.firma} onChange={(e) => setze("firma", e.target.value)} />
          </Feld>
        )}
        <Feld id={`${id}-vn`} label={org ? "Vorname (Ansprechperson)" : "Vorname"} pflicht={!org}>
          <input id={`${id}-vn`} required={!org} className={eingabe} value={b.vorname} onChange={(e) => setze("vorname", e.target.value)} />
        </Feld>
        <Feld id={`${id}-nn`} label={org ? "Nachname (Ansprechperson)" : "Nachname"} pflicht>
          <input id={`${id}-nn`} required className={eingabe} value={b.nachname} onChange={(e) => setze("nachname", e.target.value)} />
        </Feld>
        {org ? (
          <Feld id={`${id}-vt`} label="Vertreten durch (Funktion, Name)" pflicht>
            <input id={`${id}-vt`} required className={eingabe} value={b.vertretung} onChange={(e) => setze("vertretung", e.target.value)} />
          </Feld>
        ) : (
          <Feld id={`${id}-gb`} label="Geburtsdatum" hinweis="freiwillig, hilft bei Namensgleichheit">
            <input id={`${id}-gb`} type="date" className={eingabe} value={b.geburtsdatum} onChange={(e) => setze("geburtsdatum", e.target.value)} />
          </Feld>
        )}
        <Feld id={`${id}-st`} label="Straße und Hausnummer" pflicht className="sm:col-span-3">
          <input id={`${id}-st`} required autoComplete="street-address" className={eingabe} value={b.strasse} onChange={(e) => setze("strasse", e.target.value)} />
        </Feld>
        <Feld id={`${id}-plz`} label="Postleitzahl" pflicht>
          <input id={`${id}-plz`} required autoComplete="postal-code" className={eingabe} value={b.plz} onChange={(e) => setze("plz", e.target.value)} />
        </Feld>
        <Feld id={`${id}-ort`} label="Ort" pflicht className="sm:col-span-2">
          <input id={`${id}-ort`} required autoComplete="address-level2" className={eingabe} value={b.ort} onChange={(e) => setze("ort", e.target.value)} />
        </Feld>
        <Feld id={`${id}-iban`} label="IBAN für Auszahlungen" pflicht className="sm:col-span-2" hinweis="Dividenden, Rückvergütungen und das Auseinandersetzungsguthaben">
          <input id={`${id}-iban`} required autoComplete="off" className={eingabe} value={b.iban} onChange={(e) => setze("iban", e.target.value)} />
        </Feld>
        <Feld id={`${id}-ki`} label="Kontoinhaber">
          <input id={`${id}-ki`} className={eingabe} value={b.kontoinhaber} onChange={(e) => setze("kontoinhaber", e.target.value)} placeholder={org ? b.firma : `${b.vorname} ${b.nachname}`.trim()} />
        </Feld>
      </div>
      {geno.land === "DE" && !org && (
        <label className="flex items-start gap-3 text-[14px] text-ink-700">
          <input type="checkbox" checked={b.freistellung} onChange={(e) => setze("freistellung", e.target.checked)} className="mt-1 h-4 w-4 accent-[#558227]" />
          <span>Ich erteile der Genossenschaft einen Freistellungsauftrag bzw. reiche ihn gesondert ein (Sparer-Pauschbetrag bei der Kapitalertragsteuer).</span>
        </label>
      )}
      <fieldset className="space-y-2">
        <legend className="mb-1 text-[13.5px] font-semibold text-ink-700">Erklärungen *</legend>
        {geno.hinweise.map((h) => (
          <label key={h.id} className="flex items-start gap-3 rounded-2xl bg-white p-3.5 text-[13.5px] leading-relaxed text-ink-700 ring-1 ring-inset ring-ink-200/70">
            <input type="checkbox" checked={b.bestaetigt[h.id] === true} onChange={(e) => setze("bestaetigt", { ...b.bestaetigt, [h.id]: e.target.checked })} className="mt-1 h-4 w-4 shrink-0 accent-[#558227]" />
            <span>{h.text}</span>
          </label>
        ))}
      </fieldset>
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Button type="submit" disabled={a.laeuft}>{a.laeuft ? "Wird gesendet …" : "Beitritt verbindlich erklären"}</Button>
      <p className="text-[12.5px] leading-relaxed text-ink-500">Mit dem Absenden geben Sie eine unbedingte Beitrittserklärung ab. Die Mitgliedschaft entsteht erst mit der Zulassung durch den Vorstand; die Erklärung ist zusätzlich zu unterschreiben (Form laut Satzung). Bis zur Zulassung können Sie sie zurückziehen.</p>
    </form>
  );
}

// ---------------------------------------------------------------- Aktionen der Mitgliedschaft

export function MitgliedschaftAktionen({ m, geno, heute }) {
  const id = useId();
  const a = useAktion(URL);
  const [z, setZ] = useState({ anteile: "2", bestaetigt: false });
  const [k, setK] = useState({ art: "teil", anteile: "1", grund: "", bestaetigt: false });
  const [u, setU] = useState({ art: "teil", anteile: "1", anEmail: "", bestaetigt: false });
  const offeneKuendigung = m.kuendigungen.find((x) => ["eingereicht", "bestaetigt"].includes(x.status));
  const offeneUebertragung = m.uebertragungen.find((x) => x.richtung === "aus" && ["angefragt", "angenommen"].includes(x.status));
  const stichtag = kuendigungsStichtag(heute, geno.kuendigungsfristMonate, geno.geschaeftsjahrEnde);

  if (m.status === "erklaert") {
    return (
      <div className="space-y-3">
        <Meldung fehler={a.fehler} ok={a.ok} />
        <Knopf variante="gefahr" disabled={a.laeuft} onClick={() => window.confirm("Beitrittserklärung wirklich zurückziehen?") && a.ausfuehren({ aktion: "zurueckziehen", id: m.id }, "Die Beitrittserklärung ist zurückgezogen.")}>Beitrittserklärung zurückziehen</Knopf>
      </div>
    );
  }
  if (m.status !== "aktiv") return null;
  return (
    <div className="space-y-3">
      <Meldung fehler={a.fehler} ok={a.ok} />
      {geno.registerStatus === "eingetragen" && (
        <Klappe titel="Weitere Anteile zeichnen">
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "zeichnen", id: m.id, anteile: Number(z.anteile), bestaetigt: { einzahlung: z.bestaetigt } }, "Die Zeichnung ist beantragt – der Vorstand entscheidet über die Zulassung."); }}>
            <Feld id={`${id}-za`} label="Weitere Anteile" hinweis={`${Number(z.anteile) || 0} × ${eurDe(geno.anteilEur)} = ${eurDe((Number(z.anteile) || 0) * geno.anteilEur)}`}>
              <input id={`${id}-za`} inputMode="numeric" className={eingabe} value={z.anteile} onChange={(e) => setZ({ ...z, anteile: e.target.value })} />
            </Feld>
            <label className="flex items-start gap-3 text-[13.5px] text-ink-700 sm:col-span-2 sm:pt-7">
              <input type="checkbox" checked={z.bestaetigt} onChange={(e) => setZ({ ...z, bestaetigt: e.target.checked })} className="mt-1 h-4 w-4 accent-[#558227]" />
              <span>Ich verpflichte mich, die Einzahlungen auf die weiteren Anteile zu leisten{geno.land === "DE" ? " (§ 15b GenG)" : ""}.</span>
            </label>
            <div className="sm:col-span-3"><Knopf variante="primary" type="submit" disabled={a.laeuft}>Zeichnung beantragen</Knopf></div>
          </form>
        </Klappe>
      )}
      <Klappe titel={offeneKuendigung ? "Kündigung eingereicht" : "Kündigen"}>
        {offeneKuendigung ? (
          <div className="space-y-3 text-[14px] text-ink-700">
            <p>{offeneKuendigung.art === "voll" ? "Kündigung der Mitgliedschaft" : `Kündigung von ${offeneKuendigung.anteile} Anteilen`} zum {datumDe(offeneKuendigung.wirksamZum)} ({offeneKuendigung.status === "bestaetigt" ? "vom Vorstand bestätigt" : "wartet auf Bestätigung"}).</p>
            {offeneKuendigung.status === "eingereicht" && <Knopf disabled={a.laeuft} onClick={() => a.ausfuehren({ aktion: "kuendigungZuruecknehmen", id: m.id, kuendigungId: offeneKuendigung.id }, "Die Kündigung ist zurückgenommen.")}>Kündigung zurücknehmen</Knopf>}
          </div>
        ) : (
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); if (window.confirm("Kündigung verbindlich einreichen?")) a.ausfuehren({ aktion: "kuendigen", id: m.id, art: k.art, anteile: Number(k.anteile), grund: k.grund, bestaetigt: k.bestaetigt }, "Die Kündigung ist eingereicht."); }}>
            <Feld id={`${id}-ka`} label="Umfang">
              <select id={`${id}-ka`} className={auswahlfeld} value={k.art} onChange={(e) => setK({ ...k, art: e.target.value })}>
                <option value="teil">Einzelne Anteile kündigen</option>
                <option value="voll">Mitgliedschaft kündigen</option>
              </select>
            </Feld>
            {k.art === "teil" && (
              <Feld id={`${id}-kn`} label="Anzahl Anteile" hinweis={`Pflichtbeteiligung ${geno.minAnteile} Anteil(e) bleibt bestehen`}>
                <input id={`${id}-kn`} inputMode="numeric" className={eingabe} value={k.anteile} onChange={(e) => setK({ ...k, anteile: e.target.value })} />
              </Feld>
            )}
            <Feld id={`${id}-kg`} label="Grund (optional)" className={k.art === "teil" ? "" : "sm:col-span-2"}>
              <input id={`${id}-kg`} className={eingabe} value={k.grund} onChange={(e) => setK({ ...k, grund: e.target.value })} />
            </Feld>
            <p className="text-[13px] leading-relaxed text-ink-600 sm:col-span-3">Frist laut Satzung: {geno.kuendigungsfristMonate} Monate zum Ende des Geschäftsjahres – bei Eingang heute wirksam zum <strong>{datumDe(stichtag)}</strong>.{geno.land === "DE" ? " Das Auseinandersetzungsguthaben wird in der Regel binnen sechs Monaten danach ausgezahlt (§ 73 GenG), eine Beteiligung an Rücklagen besteht nicht." : " Auszahlung laut Satzung."}</p>
            <label className="flex items-start gap-3 text-[13.5px] text-ink-700 sm:col-span-3">
              <input type="checkbox" checked={k.bestaetigt} onChange={(e) => setK({ ...k, bestaetigt: e.target.checked })} className="mt-1 h-4 w-4 accent-[#558227]" />
              <span>Ich kündige verbindlich zum genannten Stichtag.</span>
            </label>
            <div className="sm:col-span-3"><Knopf variante="gefahr" type="submit" disabled={a.laeuft}>Kündigung einreichen</Knopf></div>
          </form>
        )}
      </Klappe>
      <Klappe titel={offeneUebertragung ? "Übertragung offen" : "Anteile übertragen"}>
        {offeneUebertragung ? (
          <p className="text-[14px] text-ink-700">{offeneUebertragung.anteile} Anteile an {offeneUebertragung.gegenName} – {offeneUebertragung.status === "angefragt" ? "wartet auf Annahme durch den Empfänger" : "angenommen, Zustimmung des Vorstands offen"}.</p>
        ) : (
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "uebertragen", id: m.id, art: u.art, anteile: Number(u.anteile), anEmail: u.anEmail, bestaetigt: u.bestaetigt }, "Die Übertragung ist angefragt – der Empfänger muss annehmen, danach stimmt der Vorstand zu."); }}>
            <Feld id={`${id}-ue`} label="E-Mail des Empfängers" pflicht hinweis="Der Empfänger muss Mitglied der Genossenschaft sein.">
              <input id={`${id}-ue`} type="email" required className={eingabe} value={u.anEmail} onChange={(e) => setU({ ...u, anEmail: e.target.value })} />
            </Feld>
            <Feld id={`${id}-uart`} label="Umfang">
              <select id={`${id}-uart`} className={auswahlfeld} value={u.art} onChange={(e) => setU({ ...u, art: e.target.value })}>
                <option value="teil">Einzelne Anteile</option>
                <option value="voll">Gesamtes Geschäftsguthaben (Sie scheiden aus)</option>
              </select>
            </Feld>
            {u.art === "teil" && (
              <Feld id={`${id}-un`} label="Anzahl Anteile">
                <input id={`${id}-un`} inputMode="numeric" className={eingabe} value={u.anteile} onChange={(e) => setU({ ...u, anteile: e.target.value })} />
              </Feld>
            )}
            <label className="flex items-start gap-3 text-[13.5px] text-ink-700 sm:col-span-3">
              <input type="checkbox" checked={u.bestaetigt} onChange={(e) => setU({ ...u, bestaetigt: e.target.checked })} className="mt-1 h-4 w-4 accent-[#558227]" />
              <span>Ich schließe mit dem Empfänger eine Vereinbarung über die Übertragung meines Geschäftsguthabens{geno.land === "DE" ? " (§ 76 GenG)" : ""}; sie wird mit Zustimmung des Vorstands wirksam.</span>
            </label>
            <div className="sm:col-span-3"><Knopf variante="primary" type="submit" disabled={a.laeuft}>Übertragung anfragen</Knopf></div>
          </form>
        )}
      </Klappe>
    </div>
  );
}

export function EingehendeUebertragung({ u }) {
  const a = useAktion(URL);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="min-w-0 flex-1 text-[14px] text-ink-700">Mitglied {u.vonNr} der {u.genoName} möchte Ihnen <strong>{u.anteile} Anteile</strong> ({eurDe(u.betragEur)} Geschäftsguthaben) übertragen.</p>
      <Knopf variante="primary" disabled={a.laeuft} onClick={() => a.ausfuehren({ aktion: "uebertragungAnnehmen", uebertragungId: u.id }, "Angenommen – der Vorstand stimmt noch zu.")}>Annehmen</Knopf>
      <Knopf disabled={a.laeuft} onClick={() => a.ausfuehren({ aktion: "uebertragungAblehnen", uebertragungId: u.id }, "Abgelehnt.")}>Ablehnen</Knopf>
      <div className="w-full"><Meldung fehler={a.fehler} ok={a.ok} /></div>
    </div>
  );
}

// ---------------------------------------------------------------- Abstimmung

export function Abstimmung({ gv }) {
  const a = useAktion(URL);
  const beschluesse = gv.tagesordnung.filter((t) => t.beschluss);
  const [s, setS] = useState({});
  async function absenden(e) {
    e.preventDefault();
    if (!window.confirm("Stimme verbindlich abgeben? Sie kann danach nicht mehr geändert werden.")) return;
    await a.ausfuehren({ aktion: "abstimmen", gvId: gv.id, stimmen: s }, "Ihre Stimme ist gespeichert. Vielen Dank.");
  }
  return (
    <form onSubmit={absenden} className="space-y-4">
      {beschluesse.map((t) => (
        <fieldset key={t.id} className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200/80">
          <legend className="px-1 text-[14.5px] font-semibold text-ink-900">{t.titel}</legend>
          {t.text && <p className="mb-3 text-[13.5px] leading-relaxed text-ink-600">{t.text}</p>}
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {Object.entries(STIMMEN).map(([k, v]) => (
              <label key={k} className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold ring-1 ring-inset has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500 ${s[t.id] === k ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-800 ring-ink-200"}`}>
                <input type="radio" name={t.id} value={k} checked={s[t.id] === k} onChange={() => setS({ ...s, [t.id]: k })} className="sr-only" />
                {v}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Button type="submit" disabled={a.laeuft || beschluesse.some((t) => !s[t.id])}>Stimme abgeben</Button>
      <p className="text-[12.5px] text-ink-500">Jedes Mitglied hat eine Stimme. Ihre Einzelstimme wird nicht veröffentlicht; im Protokoll erscheinen nur die Summen.</p>
    </form>
  );
}

// ---------------------------------------------------------------- Energiegemeinschaft

export function EgBeitritt({ eg }) {
  const a = useAktion(URL);
  const [best, setBest] = useState(false);
  const [anteil, setAnteil] = useState("");
  if (eg.hindernisse?.length) {
    return <ul className="list-disc space-y-1 pl-5 text-[13.5px] text-ink-600">{eg.hindernisse.map((h) => <li key={h}>{h}</li>)}</ul>;
  }
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "egBeitreten", egId: eg.id, daten: { bestaetigt: best, anteilPct: anteil } }, "Beitritt beantragt – wir melden Ihren Zählpunkt beim Netzbetreiber an."); }}>
      {eg.verteilschluessel === "statisch" && (
        <Feld id={`an-${eg.id}`} label="Gewünschter fester Anteil an der Erzeugung (%)">
          <input id={`an-${eg.id}`} inputMode="decimal" className={eingabe} value={anteil} onChange={(e) => setAnteil(e.target.value)} />
        </Feld>
      )}
      <label className="flex items-start gap-3 text-[13.5px] leading-relaxed text-ink-700">
        <input type="checkbox" checked={best} onChange={(e) => setBest(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#558227]" />
        <span>{eg.land === "AT" ? "Ich trete der Gemeinschaft bei, erteile die Freigabe meiner Viertelstundenwerte über das Portal meines Netzbetreibers und akzeptiere das Preisblatt." : "Ich trete der Gemeinschaft bei, stimme der Verarbeitung meiner Messwerte für die Abrechnung zu und akzeptiere das Preisblatt."}</span>
      </label>
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Knopf variante="primary" type="submit" disabled={a.laeuft || !best}>Beitritt beantragen</Knopf>
    </form>
  );
}

export function EgKuendigen({ t }) {
  const a = useAktion(URL);
  if (!["beantragt", "angemeldet", "aktiv"].includes(t.status) || t.bis) return null;
  return (
    <span className="inline-flex flex-col gap-2">
      <Knopf variante="gefahr" disabled={a.laeuft} onClick={() => window.confirm(t.status === "aktiv" ? "Teilnahme zum Monatsende kündigen?" : "Beitrittsantrag zurückziehen?") && a.ausfuehren({ aktion: "egKuendigen", id: t.id }, t.status === "aktiv" ? "Gekündigt zum Monatsende." : "Antrag zurückgezogen.")}>{t.status === "aktiv" ? "Zum Monatsende kündigen" : "Antrag zurückziehen"}</Knopf>
      <Meldung fehler={a.fehler} ok={a.ok} />
    </span>
  );
}
