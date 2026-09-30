"use client";

// Vermittlungsauftrag (Provisionsvereinbarung) je Projekt: einfacher Auftrag oder Alleinvermittlung mit Mindestlaufzeit,
// Erklärung per getipptem Namen, PDF (Muster), Gegenbestätigung der Exklusivität durch das Backoffice, Beenden/Kündigen.

import { useState } from "react";
import { FileDown, FileSignature, ShieldCheck } from "lucide-react";
import DateiLink from "@/components/Portal/DateiLink";
import { Angaben, Badge, Hinweis } from "@/components/Portal/ui";
import { Chip, ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { MANDAT_ARTEN, MANDAT_DAUER, MANDAT_STATUS } from "@/lib/plattform/anbieter/regeln.js";
import { knopfNavy, knopfPrimaer, knopfSekundaer, tag, useAnbieterAktion, zeit } from "./gemeinsam";

export default function Mandat({ akte, setAkte }) {
  const { projekt: p, mandat: m, rolle, rechte } = akte;
  const admin = rolle === "admin";
  const a = useAnbieterAktion(p.id, setAkte);
  const bo = useAnbieterAktion(p.id, setAkte, { admin: true });
  const [art, setArt] = useState("einfach");
  const [dauer, setDauer] = useState(6);
  const [vorbehalte, setVorbehalte] = useState("");
  const [name, setName] = useState("");
  const [zustimmung, setZustimmung] = useState(false);
  const st = MANDAT_STATUS[m.stand?.status] || MANDAT_STATUS.keiner;
  const erteilt = !!m.erteiltAm && m.stand?.status !== "gekuendigt";
  const kannErteilen = rolle === "anbieter" && rechte.auftrag && !erteilt && p.status !== "verkauft";

  async function erteilen(e) {
    e.preventDefault();
    await a.los({ aktion: "mandat_erteilen", art, dauerMonate: dauer, vorbehalte: vorbehalte.split("\n"), name, zustimmung }, art === "exklusiv" ? "Auftrag erteilt. Die Exklusivität wird mit der Gegenbestätigung durch ÖkoInvest wirksam." : "Vermittlungsauftrag erteilt.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge ton={st.ton}>{m.stand?.status === "wirksam" && m.art === "exklusiv" && !m.stand.exklusivAktiv ? "Wirksam (Exklusivität beendet)" : st.label}</Badge>
        {m.stand?.exklusivAktiv && <Badge ton="dunkel"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" /> Exklusiv</Badge>}
        <DateiLink href={`/api/portal/anbieter/${p.id}/vermittlungsauftrag`} icon={FileDown}>{erteilt ? "Auftrag (PDF)" : "Muster ansehen (PDF)"}</DateiLink>
      </div>

      {erteilt && (
        <Angaben
          items={[
            { label: "Art", wert: m.artLabel },
            { label: "Mindestlaufzeit Exklusivität", wert: m.dauerMonate ? `${m.dauerMonate} Monate${m.mindestBis ? ` (bis ${tag(m.mindestBis)})` : " ab Gegenbestätigung"}` : "" },
            { label: "Erteilt", wert: `${zeit(m.erteiltAm)} · „${m.name}“` },
            { label: "Gegenbestätigt", wert: m.bestaetigtAm ? zeit(m.bestaetigtAm) : m.art === "exklusiv" ? "ausstehend" : "" },
            { label: "Exklusivität endet", wert: m.exklusivEndetAm ? tag(m.exklusivEndetAm) : "" },
            { label: "Provisionssatz", wert: p.provisionSatz != null ? `${(p.provisionSatz * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %` : "wird bei der Freigabe festgelegt" },
            { label: "Prüfsumme (SHA-256)", wert: m.sha256 ? `${m.sha256.slice(0, 16)}…` : "" },
            { label: "IP (Protokoll)", wert: admin ? m.ip : "" },
            { label: "Vorbehaltsliste (bekannte Interessenten)", wert: m.vorbehalte?.length ? m.vorbehalte.join(" · ") : "", breit: true },
          ]}
        />
      )}
      {m.stand?.status === "gekuendigt" && <Hinweis ton="neutral" titel="Auftrag gekündigt">Gekündigt am {zeit(m.gekuendigtAm)}. Ansprüche aus bereits nachgewiesenen Investoren und der Umgehungsschutz bleiben bestehen. Für ein erneutes Einreichen erteilen Sie einen neuen Auftrag.</Hinweis>}
      {!m.erteiltAm && m.altKlick && <Hinweis ton="info">Die Provisionsvereinbarung wurde bisher per Klick akzeptiert. Mit einem strukturierten Vermittlungsauftrag können Sie zusätzlich eine Exklusivität vereinbaren und eine Vorbehaltsliste bekannter Interessenten hinterlegen.</Hinweis>}

      {kannErteilen && (
        <form onSubmit={erteilen} className="space-y-4 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70 md:p-5">
          <fieldset>
            <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Art des Auftrags</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MANDAT_ARTEN).map(([id, x]) => (
                <Chip key={id} type="radio" name="mandat-art" value={id} checked={art === id} onChange={() => setArt(id)}>{x.label}</Chip>
              ))}
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{MANDAT_ARTEN[art].text}</p>
          </fieldset>
          {art === "exklusiv" && (
            <Feld id="mandat-dauer" label="Mindestlaufzeit der Exklusivität" hinweis="Danach zum Ende eines Monats beendbar; der Auftrag gilt dann als einfacher Auftrag weiter.">
              <select id="mandat-dauer" className={auswahlfeld} value={dauer} onChange={(e) => setDauer(Number(e.target.value))}>
                {MANDAT_DAUER.map((d) => <option key={d} value={d}>{d} Monate</option>)}
              </select>
            </Feld>
          )}
          <Feld id="mandat-vorbehalte" label="Bereits bekannte Interessenten (optional)" hinweis="Je Zeile ein Unternehmen, mit dem Sie zu diesem Projekt bereits Kontakt hatten. Nur für ÖkoInvest sichtbar (§ 4 Besondere Bedingungen).">
            <textarea id="mandat-vorbehalte" className={textbereich} value={vorbehalte} onChange={(e) => setVorbehalte(e.target.value)} maxLength={2400} />
          </Feld>
          <Feld id="mandat-name" label="Unterschrift: Ihr vollständiger Name" pflicht hinweis="Einfache elektronische Signatur – Zeitpunkt, IP-Adresse und Prüfsumme des Wortlauts werden protokolliert.">
            <input id="mandat-name" className={eingabe} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </Feld>
          <label className="flex items-start gap-3 text-[14px] leading-relaxed text-ink-700">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-ov-600" checked={zustimmung} onChange={(e) => setZustimmung(e.target.checked)} />
            <span>Ich erteile ÖkoInvest den Vermittlungsauftrag zu den Bedingungen im Muster (PDF) und den <a className="font-semibold text-ov-700 underline" href="/bedingungen/projektboerse" target="_blank" rel="noopener">Besonderen Bedingungen der Projektbörse</a>. Provision nur bei Abschluss.</span>
          </label>
          <FehlerBox>{a.fehler}</FehlerBox>
          <button type="submit" className={knopfPrimaer} disabled={a.laeuft || !zustimmung || name.trim().length < 2}>
            <FileSignature aria-hidden="true" className="h-4 w-4" /> Auftrag verbindlich erteilen
          </button>
        </form>
      )}

      {rolle === "anbieter" && rechte.auftrag && erteilt && (
        <div className="flex flex-wrap gap-2">
          {m.stand?.exklusivAktiv && m.bestaetigtAm && !m.exklusivEndetAm && (
            <button type="button" className={knopfSekundaer} disabled={a.laeuft} onClick={() => window.confirm("Exklusivität beenden? Sie endet zum Monatsende, frühestens zum Ende der Mindestlaufzeit.") && a.los({ aktion: "exklusivitaet_beenden" }, (x) => `Exklusivität endet am ${tag(x.mandat?.exklusivEndetAm)}.`)}>
              Exklusivität beenden
            </button>
          )}
          {!["veroeffentlicht", "reserviert", "verkauft"].includes(p.status) && (
            <button type="button" className={knopfSekundaer} disabled={a.laeuft} onClick={() => window.confirm("Vermittlungsauftrag kündigen? Das Projekt kann danach erst mit einem neuen Auftrag eingereicht werden.") && a.los({ aktion: "mandat_kuendigen" }, "Auftrag gekündigt.")}>
              Auftrag kündigen
            </button>
          )}
        </div>
      )}
      {admin && m.art === "exklusiv" && m.stand?.status === "wartet" && rechte.schreiben && (
        <button type="button" className={knopfNavy} disabled={bo.laeuft} onClick={() => bo.los({ aktion: "mandat_bestaetigen" }, "Exklusivität gegenbestätigt.")}>
          <ShieldCheck aria-hidden="true" className="h-4 w-4" /> Exklusivität gegenbestätigen
        </button>
      )}
      <FehlerBox>{erteilt ? a.fehler : ""}</FehlerBox>
      <FehlerBox>{bo.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg || bo.erfolg}</ErfolgBox>
    </div>
  );
}
