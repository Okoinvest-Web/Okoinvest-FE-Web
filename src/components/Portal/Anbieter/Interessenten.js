"use client";

// Interessenten des Projekts (pseudonym wie im Deal-Room): Status, LOI-Eckdaten, Stellungnahme des Verkäufers
// (Zustimmung / Verhandeln / Ablehnung) zu LOI und Geboten im Bieterverfahren und Vorkenntnis-Meldung nach § 4 Abs. 2 Besondere Bedingungen (zehn Werktage).

import { useState } from "react";
import { Clock, FileSignature, UserCheck } from "lucide-react";
import { Angaben, Badge, Hinweis, StatusBadge } from "@/components/Portal/ui";
import { Chip, ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { VORKENNTNIS_NACHWEIS, VORKENNTNIS_STATUS, VOTUM_ARTEN } from "@/lib/plattform/anbieter/regeln.js";
import { eur, knopfPrimaer, knopfSekundaer, tag, useAnbieterAktion, zeit } from "./gemeinsam";

// Stellungnahme zur LOI bzw. – mit `gebot` – zu einem Gebot im Bieterverfahren (gleiche Arten, Ablehnung sperrt Annahme/Zuschlag)
function Votum({ akte, setAkte, i, gebot = null }) {
  const a = useAnbieterAktion(akte.projekt.id, setAkte);
  const [art, setArt] = useState("zustimmung");
  const [kommentar, setKommentar] = useState("");
  const [gegen, setGegen] = useState("");
  const k = gebot ? `${i.interesseId}-${gebot.id}` : i.interesseId;
  const body = gebot ? { aktion: "gebot_votum", gebotId: gebot.id } : { aktion: "votum", interesseId: i.interesseId };
  return (
    <form className="mt-3 space-y-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70" onSubmit={(e) => { e.preventDefault(); a.los({ ...body, art, kommentar, gegenvorschlag: gegen }, "Stellungnahme an ÖkoInvest übermittelt."); }}>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">{gebot ? "Ihre Stellungnahme zu diesem Gebot" : "Ihre Stellungnahme zu dieser LOI"}</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(VOTUM_ARTEN).map(([kk, x]) => <Chip key={kk} type="radio" name={`votum-${k}`} value={kk} checked={art === kk} onChange={() => setArt(kk)}>{x.label}</Chip>)}
        </div>
        <p className="mt-2 text-[13px] text-ink-600">{gebot ? VOTUM_ARTEN[art].text.replace("Annahme dieser LOI", "Zuschlag auf dieses Gebot").replace("Diese LOI soll nicht angenommen werden.", "Auf dieses Gebot soll kein Zuschlag erfolgen.") : VOTUM_ARTEN[art].text} {gebot ? "Den Zuschlag erteilt ÖkoInvest in Abstimmung mit Ihnen; nach einer Ablehnung ist der Zuschlag auf dieses Gebot gesperrt." : "Angenommen wird die LOI durch ÖkoInvest in Abstimmung mit Ihnen; nach einer Ablehnung ist die Annahme gesperrt."}</p>
      </fieldset>
      {art === "verhandeln" && (
        <Feld id={`gv-${k}`} label="Gegenvorschlag Kaufpreis (optional, €)">
          <input id={`gv-${k}`} inputMode="numeric" className={eingabe} value={gegen} onChange={(e) => setGegen(e.target.value)} />
        </Feld>
      )}
      <Feld id={`vk-${k}`} label={art === "zustimmung" ? "Anmerkung (optional)" : "Begründung"} pflicht={art !== "zustimmung"}>
        <textarea id={`vk-${k}`} className={textbereich} value={kommentar} onChange={(e) => setKommentar(e.target.value)} maxLength={1500} />
      </Feld>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <button type="submit" className={knopfPrimaer} disabled={a.laeuft}><FileSignature aria-hidden="true" className="h-4 w-4" /> Stellungnahme abgeben</button>
    </form>
  );
}

function Vorkenntnis({ akte, setAkte, i }) {
  const a = useAnbieterAktion(akte.projekt.id, setAkte);
  const [offen, setOffen] = useState(false);
  const [begruendung, setBegruendung] = useState("");
  const [nachweisArt, setNachweisArt] = useState("korrespondenz");
  const [nachweisDatum, setNachweisDatum] = useState("");
  const [dokumentId, setDokumentId] = useState("");
  if (!offen) return <button type="button" className={knopfSekundaer} onClick={() => setOffen(true)}><UserCheck aria-hidden="true" className="h-4 w-4" /> Vorkenntnis melden</button>;
  return (
    <form className="mt-3 space-y-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70" onSubmit={(e) => { e.preventDefault(); a.los({ aktion: "vorkenntnis_melden", interesseId: i.interesseId, begruendung, nachweisArt, nachweisDatum, dokumentId }, "Meldung übermittelt – ÖkoInvest prüft den Nachweis."); }}>
      <p className="text-[13.5px] leading-relaxed text-ink-700">War Ihnen dieser Interessent für genau dieses Projekt schon vor der Anzeige über die Plattform bekannt? Melden Sie es mit Nachweis innerhalb von zehn Werktagen (bis {tag(i.vorkenntnisFrist)}, ohne Feiertage gerechnet). Sie erfahren den Namen dafür nicht – ÖkoInvest gleicht Ihren Nachweis ab.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld id={`na-${i.interesseId}`} label="Art des Nachweises">
          <select id={`na-${i.interesseId}`} className={auswahlfeld} value={nachweisArt} onChange={(e) => setNachweisArt(e.target.value)}>
            {Object.entries(VORKENNTNIS_NACHWEIS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Feld>
        <Feld id={`nd-${i.interesseId}`} label="Datum des Nachweises" pflicht>
          <input id={`nd-${i.interesseId}`} type="date" className={eingabe} value={nachweisDatum} onChange={(e) => setNachweisDatum(e.target.value)} required />
        </Feld>
      </div>
      <Feld id={`nb-${i.interesseId}`} label="Woher kennen Sie den Interessenten? (Unternehmen, Ansprechpartner, Anlass)" pflicht>
        <textarea id={`nb-${i.interesseId}`} className={textbereich} value={begruendung} onChange={(e) => setBegruendung(e.target.value)} maxLength={2000} />
      </Feld>
      {akte.dokumente?.length > 0 && (
        <Feld id={`ndok-${i.interesseId}`} label="Nachweis-Dokument aus dem Datenraum (optional)" hinweis="Nicht für Investoren freigeben – Kategorie „allgemein“ verwenden.">
          <select id={`ndok-${i.interesseId}`} className={auswahlfeld} value={dokumentId} onChange={(e) => setDokumentId(e.target.value)}>
            <option value="">– kein Dokument –</option>
            {akte.dokumente.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Feld>
      )}
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={knopfPrimaer} disabled={a.laeuft || begruendung.trim().length < 20 || !nachweisDatum}>Meldung senden</button>
        <button type="button" className={knopfSekundaer} onClick={() => setOffen(false)}>Abbrechen</button>
      </div>
    </form>
  );
}

function VorkenntnisEntscheiden({ akte, setAkte, vk }) {
  const a = useAnbieterAktion(akte.projekt.id, setAkte, { admin: true });
  const [grund, setGrund] = useState("");
  return (
    <div className="mt-2 space-y-2">
      <input aria-label="Begründung" className={eingabe} value={grund} onChange={(e) => setGrund(e.target.value)} placeholder="Begründung (Pflicht bei Ablehnung)" maxLength={1000} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={knopfPrimaer} disabled={a.laeuft} onClick={() => a.los({ aktion: "vorkenntnis_entscheiden", id: vk.id, entscheidung: "anerkannt", grund }, "Vorkenntnis anerkannt.")}>Anerkennen</button>
        <button type="button" className={knopfSekundaer} disabled={a.laeuft} onClick={() => a.los({ aktion: "vorkenntnis_entscheiden", id: vk.id, entscheidung: "abgelehnt", grund }, "Vorkenntnis nicht anerkannt.")}>Nicht anerkennen</button>
      </div>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </div>
  );
}

export default function Interessenten({ akte, setAkte }) {
  const liste = akte.interessenten || [];
  const admin = akte.rolle === "admin";
  const schreiben = akte.rechte.schreiben;
  if (!liste.length) return <p className="text-[14px] text-ink-500">Noch keine Interessenten mit NDA. Nach der Veröffentlichung erscheinen Investoren hier pseudonym („Investor A“ …), sobald sie die Vertraulichkeitsvereinbarung akzeptiert haben.</p>;
  return (
    <ul className="space-y-3">
      {liste.map((i) => (
        <li key={i.interesseId} className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200/70">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-[15.5px] font-bold text-ink-900">
              {i.pseudonym}
              {admin && i.investor && <span className="ml-2 text-[13px] font-normal text-ink-600">{i.investor.vorname} {i.investor.nachname}{i.investor.firma ? ` · ${i.investor.firma}` : ""}</span>}
            </p>
            <StatusBadge art="interesse" status={i.status} />
          </div>
          <p className="mt-1 text-[12.5px] text-ink-500">Angezeigt seit {zeit(i.angezeigtAm)}{i.vorkenntnisOffen ? ` · Vorkenntnis meldbar bis ${tag(i.vorkenntnisFrist)}` : ""}</p>

          {i.loi && (
            <div className="mt-3 rounded-xl bg-ink-50 p-3.5 ring-1 ring-inset ring-ink-200/60">
              <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">LOI vom {zeit(i.loi.am)}</p>
              <Angaben items={i.loi.zeilen.map((z) => ({ label: z.label, wert: z.wert, breit: z.label === "Inhalt" || z.label === "Bedingungen" }))} />
            </div>
          )}
          {i.votum && (
            <p className="mt-3 text-[14px] text-ink-800">
              <Badge ton={VOTUM_ARTEN[i.votum.art]?.ton}>{i.votum.label}</Badge>
              <span className="ml-2">{i.votum.von} · {zeit(i.votum.am)}{i.votum.gegenvorschlag ? ` · Gegenvorschlag ${i.votum.gegenvorschlag.toLocaleString("de-DE")} €` : ""}</span>
              {i.votum.kommentar && <span className="mt-1 block text-ink-600">{i.votum.kommentar}</span>}
            </p>
          )}
          {!admin && schreiben && i.votumMoeglich && !i.votum && <Votum akte={akte} setAkte={setAkte} i={i} />}
          {!admin && schreiben && i.votumMoeglich && i.votum && <details className="mt-2 text-[13.5px]"><summary className="cursor-pointer font-semibold text-ov-700">Stellungnahme ändern</summary><Votum akte={akte} setAkte={setAkte} i={i} /></details>}
          {admin && i.votumMoeglich && !i.votum && <p className="mt-2 inline-flex items-center gap-1 text-[13px] text-ink-500"><Clock aria-hidden="true" className="h-3.5 w-3.5" /> Stellungnahme des Verkäufers steht aus.</p>}

          {i.gebote?.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Gebote im Bieterverfahren</p>
              {i.gebote.map((g) => (
                <div key={g.id} className="rounded-xl bg-ink-50 p-3.5 text-[13.5px] text-ink-800 ring-1 ring-inset ring-ink-200/60">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">Runde {g.runde}{g.rundeLabel ? ` · ${g.rundeLabel}` : ""}</span>
                    <span className="ov-num">{eur(g.preisGesamt)}</span>
                    <Badge>{g.statusLabel}</Badge>
                    <span className="text-ink-500">{zeit(g.am)}{g.version > 1 ? ` · Version ${g.version}` : ""}</span>
                  </p>
                  {g.bedingungen && <p className="mt-1 text-ink-600">{g.bedingungen}</p>}
                  {g.votum && (
                    <p className="mt-2">
                      <Badge ton={VOTUM_ARTEN[g.votum.art]?.ton}>{g.votum.label}</Badge>
                      <span className="ml-2">{g.votum.von} · {zeit(g.votum.am)}{g.votum.gegenvorschlag ? ` · Gegenvorschlag ${g.votum.gegenvorschlag.toLocaleString("de-DE")} €` : ""}</span>
                      {g.votum.kommentar && <span className="mt-1 block text-ink-600">{g.votum.kommentar}</span>}
                    </p>
                  )}
                  {!admin && schreiben && g.votumMoeglich && !g.votum && <Votum akte={akte} setAkte={setAkte} i={i} gebot={g} />}
                  {!admin && schreiben && g.votumMoeglich && g.votum && <details className="mt-2"><summary className="cursor-pointer font-semibold text-ov-700">Stellungnahme ändern</summary><Votum akte={akte} setAkte={setAkte} i={i} gebot={g} /></details>}
                  {admin && g.votumMoeglich && !g.votum && <p className="mt-2 inline-flex items-center gap-1 text-[13px] text-ink-500"><Clock aria-hidden="true" className="h-3.5 w-3.5" /> Stellungnahme des Verkäufers steht aus.</p>}
                </div>
              ))}
            </div>
          )}

          {i.vorkenntnis ? (
            <div className="mt-3 text-[13.5px] text-ink-700">
              <Badge ton={VORKENNTNIS_STATUS[i.vorkenntnis.status]?.ton}>Vorkenntnis: {i.vorkenntnis.statusLabel}</Badge>
              {i.vorkenntnis.verspaetet && <Badge className="ml-2">nach Fristablauf</Badge>}
              <p className="mt-1">{VORKENNTNIS_NACHWEIS[i.vorkenntnis.nachweisArt]} vom {tag(i.vorkenntnis.nachweisDatum)}: {i.vorkenntnis.begruendung}</p>
              {i.vorkenntnis.grund && <p className="mt-1 text-ink-600">Begründung ÖkoInvest: {i.vorkenntnis.grund}</p>}
              {admin && schreiben && i.vorkenntnis.status === "gemeldet" && <VorkenntnisEntscheiden akte={akte} setAkte={setAkte} vk={i.vorkenntnis} />}
            </div>
          ) : (
            !admin && schreiben && <div className="mt-3"><Vorkenntnis akte={akte} setAkte={setAkte} i={i} /></div>
          )}
        </li>
      ))}
      {!admin && <li><Hinweis ton="neutral">Namen und Kontaktdaten erfahren Sie erst nach der Kontaktfreigabe durch ÖkoInvest. Direkte Kontaktaufnahme vorher ist nach dem Umgehungsschutz nicht vorgesehen.</Hinweis></li>}
    </ul>
  );
}
