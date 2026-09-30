// /portal/beteiligung/genossenschaft – Mitgliedschaft: Beitrittserklärung (nur bei eingetragener Genossenschaft),
// Vormerkung (im Aufbau), Zulassung, Einzahlung mit Zahlungsangaben, Anteilsbestätigung (PDF), weitere Anteile,
// Kündigung mit Stichtag, Übertragung, Ausschüttungsmitteilungen und Verlauf.

import Link from "next/link";
import { Banknote, FileText, HandHeart, Info } from "lucide-react";
import Begriff from "@/components/Portal/Bedienung/Begriff";
import { Angaben, Badge, Hinweis, Karte, Leer, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { GenoFormular } from "@/components/Portal/Fach/Beteiligung";
import { BeitrittFormular, MitgliedschaftAktionen } from "@/components/Portal/Mitglied/Portal";
import { PdfLink } from "@/components/Portal/Mitglied/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { mitgliedBackend } from "@/lib/plattform/backend/mitglied";
import { GENO_REGISTER, KUENDIGUNG_STATUS, MITGLIED_STATUS, NACHSCHUSS, UEBERTRAGUNG_STATUS, ZEICHNUNG_STATUS } from "@/lib/plattform/mitglied/genossenschaft";
import { datum, datumZeit, eur } from "@/lib/plattform/format";

export const metadata = { title: "Genossenschaft" };

const ibanFormat = (s) => String(s || "").replace(/(.{4})/g, "$1 ").trim();

function Mitgliedschaft({ m, g, heute }) {
  const k = m.kennzahlen;
  return (
    <Karte
      titel={<span className="inline-flex flex-wrap items-center gap-2">{g.name} <Badge ton={MITGLIED_STATUS[m.status]?.ton}>{m.statusLabel}</Badge></span>}
      untertitel={m.nr ? `Mitgliedsnummer ${m.nr}` : `Beitrittserklärung vom ${datum(m.erklaertAm)}`}
      aktion={<span className="flex flex-wrap gap-2"><PdfLink href={`/api/portal/mitglied/pdf?art=beitritt&id=${m.id}`}>Beitrittserklärung</PdfLink>{m.status === "aktiv" && <PdfLink href={`/api/portal/mitglied/pdf?art=bestaetigung&id=${m.id}`}>Anteilsbestätigung</PdfLink>}</span>}
    >
      <div className="space-y-5">
        {m.status === "erklaert" && (
          <Hinweis ton="info" icon={FileText} titel="Nächster Schritt: unterschreiben">
            Laden Sie die Beitrittserklärung als PDF, unterschreiben Sie sie und laden Sie den Scan {m.vorgangId ? <Link className="font-semibold underline" href={`/portal/anfragen/${m.vorgangId}`}>in Ihrer Anfrage</Link> : "über Nachrichten"} hoch. Danach entscheidet der Vorstand über die Zulassung – Sie werden benachrichtigt.
          </Hinweis>
        )}
        {m.status === "abgelehnt" && <Hinweis ton="neutral" titel="Beitritt nicht zugelassen">{m.verlauf.at(-1)?.text}</Hinweis>}
        {["zugelassen", "aktiv"].includes(m.status) && k.offenEur > 0 && (
          <Hinweis ton="warn" icon={Banknote} titel={`Bitte überweisen Sie ${eur(k.offenEur)}${m.einzahlungFrist ? ` bis ${datum(m.einzahlungFrist)}` : ""}`}>
            <Angaben spalten={2} items={[{ label: "Empfänger", wert: g.kontoinhaber || g.name }, { label: "IBAN", wert: ibanFormat(g.iban) }, { label: "BIC", wert: g.bic }, { label: "Verwendungszweck", wert: m.verwendungszweck }]} />
          </Hinweis>
        )}
        <div className="grid gap-3 sm:grid-cols-4">
          {[["Anteile", String(m.anteile)], ["Nennwert", eur(k.nennwertEur)], ["Eingezahlt", eur(k.eingezahltEur)], ["Geschäftsguthaben", eur(k.guthabenEur)]].map(([l, w]) => (
            <div key={l} className="rounded-2xl bg-ink-50 px-4 py-3">
              <p className="text-[12.5px] text-ink-500">{l}</p>
              <p className="ov-num mt-0.5 font-display text-[18px] font-bold text-ink-900">{w}</p>
            </div>
          ))}
        </div>
        {(m.zeichnungen.length > 0 || m.kuendigungen.length > 0 || m.uebertragungen.length > 0) && (
          <ul className="space-y-2 text-[14px] text-ink-700">
            {m.zeichnungen.map((z) => <li key={z.id}>Weitere {z.anteile} Anteile ({eur(z.betragEur)}) vom {datum(z.am)}: <strong>{ZEICHNUNG_STATUS[z.status]}</strong></li>)}
            {m.kuendigungen.map((x) => <li key={x.id}>{x.art === "voll" ? "Kündigung der Mitgliedschaft" : `Kündigung von ${x.anteile} Anteilen`} zum {datum(x.wirksamZum)}: <strong>{KUENDIGUNG_STATUS[x.status]}</strong>{x.betragEur ? ` · Auseinandersetzungsguthaben ${eur(x.betragEur)}` : ""}{x.auszahlungBis && x.status !== "ausgezahlt" ? ` · Auszahlung bis ${datum(x.auszahlungBis)}` : ""}</li>)}
            {m.uebertragungen.map((u) => <li key={u.id}>Übertragung {u.richtung === "aus" ? "an" : "von"} {u.gegenName}: {u.anteile} Anteile – <strong>{UEBERTRAGUNG_STATUS[u.status]}</strong></li>)}
          </ul>
        )}
        <MitgliedschaftAktionen m={m} geno={g} heute={heute} />
        {m.verlauf.length > 0 && (
          <details className="text-[13.5px] text-ink-600">
            <summary className="cursor-pointer font-semibold text-ink-800">Verlauf ({m.verlauf.length})</summary>
            <ol className="mt-2 space-y-1.5">{m.verlauf.slice().reverse().map((v, i) => <li key={i}><span className="text-ink-500">{datumZeit(v.am)}</span> – {v.text}</li>)}</ol>
          </details>
        )}
      </div>
    </Karte>
  );
}

export default async function GenossenschaftSeite() {
  const n = await portalNutzer({ rollen: ["mitglied"] });
  const d = await laden(() => mitgliedBackend().mgUebersicht(n));
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Mitglied · Genossenschaft" titel="Meine Mitgliedschaft" text="Beitritt, Geschäftsanteile, Einzahlung, Kündigung und Übertragung. Verbindlich ist die Satzung der Genossenschaft – wir erbringen keine Anlageberatung." />

      {!d.genos.length && (
        <Karte titel="Vormerkung" untertitel="Unverbindlich – keine Zeichnung, keine Zahlung" aktion={<HandHeart aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          <GenoFormular geno={d.vormerkung} />
        </Karte>
      )}

      {d.genos.map((g) => {
        const m = d.mitgliedschaften.find((x) => x.genoId === g.id && !["abgelehnt", "zurueckgezogen"].includes(x.status)) || d.mitgliedschaften.filter((x) => x.genoId === g.id).at(-1);
        if (m && !["abgelehnt", "zurueckgezogen"].includes(m.status)) return <Mitgliedschaft key={g.id} m={m} g={g} heute={d.heute} />;
        return (
          <Karte key={g.id} titel={<span className="inline-flex flex-wrap items-center gap-2">{g.name} <Badge ton={GENO_REGISTER[g.registerStatus]?.ton}>{g.registerLabel}</Badge></span>} untertitel={g.registerStatus === "eingetragen" ? `${g.registerName} ${g.registerNr}${g.pruefungsverband ? ` · ${g.pruefungsverband}` : ""}` : GENO_REGISTER[g.registerStatus]?.text}>
            {m && <Hinweis ton="neutral" className="mb-4">Ihre frühere Beitrittserklärung: {m.statusLabel}.</Hinweis>}
            {g.registerStatus === "eingetragen" ? (
              <div className="space-y-5">
                <Angaben spalten={3} items={[{ label: "Geschäftsanteil", wert: eur(g.anteilEur) }, { label: "Pflichtbeteiligung", wert: `${g.minAnteile} Anteil(e), höchstens ${g.maxAnteile}` }, { label: "Kündigungsfrist", wert: `${g.kuendigungsfristMonate} Monate zum Geschäftsjahresende` }, { label: "Nachschusspflicht", wert: NACHSCHUSS[g.nachschusspflicht] }, { label: "Satzung", wert: g.satzungStand ? `Stand ${datum(g.satzungStand)}` : "–" }, { label: "Eintrittsgeld", wert: g.eintrittsgeldEur ? eur(g.eintrittsgeldEur) : "keins" }]} />
                {g.info && <p className="text-[13.5px] leading-relaxed text-ink-600">{g.info}</p>}
                <Hinweis ton="warn" icon={Info}>Geschäftsanteile sind eine unternehmerische Beteiligung ohne Einlagensicherung; Ausschüttungen sind nicht garantiert. Bitte lesen Sie die Satzung vor dem Beitritt. Mehr zur <Begriff id="energiegenossenschaft">Energiegenossenschaft</Begriff> und zur <Begriff id="nachschusspflicht">Nachschusspflicht</Begriff>.</Hinweis>
                <BeitrittFormular geno={g} konto={{ vorname: n.vorname, nachname: n.nachname, firma: n.firma }} />
              </div>
            ) : g.registerStatus === "aufbau" ? (
              <GenoFormular geno={d.vormerkung} />
            ) : (
              <p className="text-[14px] text-ink-600">Derzeit werden keine neuen Mitglieder aufgenommen. Wir informieren Sie, sobald wieder Anteile gezeichnet werden können.</p>
            )}
          </Karte>
        );
      })}

      <Karte id="ausschuettungen" titel="Ausschüttungen" untertitel="Beschluss der Generalversammlung über die Gewinnverwendung">
        {d.ausschuettungen.length ? (
          <Tabelle kopf={["Geschäftsjahr", "Art", "Brutto", "Steuerabzug", "Netto", "Status", ""]}>
            {d.ausschuettungen.map((a) => {
              const p = a.positionen.reduce((s, x) => ({ b: s.b + x.bruttoEur, st: s.st + x.steuerEur, n: s.n + x.nettoEur }), { b: 0, st: 0, n: 0 });
              return (
                <tr key={a.id}>
                  <td className={zelle}>{a.geschaeftsjahr}</td>
                  <td className={zelle}>{a.art === "dividende" ? `Dividende ${String(a.satzPct).replace(".", ",")} %` : `Rückvergütung ${String(a.ctProKwh).replace(".", ",")} ct/kWh`}</td>
                  <td className={`${zelle} ov-num`}>{eur(p.b)}</td>
                  <td className={`${zelle} ov-num`}>{eur(p.st)}</td>
                  <td className={`${zelle} ov-num font-semibold`}>{eur(p.n)}</td>
                  <td className={zelle}>{a.status === "ausgezahlt" ? `ausgezahlt ${datum(a.ausgezahltAm)}` : "beschlossen"}</td>
                  <td className={zelle}><PdfLink href={`/api/portal/mitglied/pdf?art=ausschuettung&id=${a.id}`}>Mitteilung</PdfLink></td>
                </tr>
              );
            })}
          </Tabelle>
        ) : (
          <Leer icon={Banknote} titel="Noch keine Ausschüttung" text="Über Dividenden bzw. Rückvergütungen beschließt die Generalversammlung nach Feststellung des Jahresabschlusses." />
        )}
      </Karte>
    </div>
  );
}
