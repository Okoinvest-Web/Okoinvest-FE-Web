// /portal/pachtvertraege – Pachtakte für Flächen-, Dach- und Agri-PV-Eigentümer (Team 1): Vertrag und Fristen,
// Rückbausicherheit und Rückbau (Abnahme durch den Eigentümer), Anliegen (Kündigung, Eigentümerwechsel, Erbfall,
// Zahlungsaufteilung, Verlängerung), Agri-PV-Bewirtschaftungsnachweise und Jahresbescheinigungen als PDF.

import Link from "next/link";
import { CalendarClock, FileDown, FileSignature, HandCoins, Leaf, LandPlot, ShieldCheck, Wrench } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Angaben, Badge, Hinweis, Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { AgriNachweisFormular, AnliegenFormular, Schritte } from "@/components/Portal/Pachtakte/Formulare";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";
import { ANLIEGEN_ARTEN, ANLIEGEN_OFFEN, ANLIEGEN_STATUS, AGRI_NACHWEIS_ARTEN, AGRI_NACHWEIS_EINHEITEN, AGRI_NACHWEIS_KULTUREN, AGRI_NACHWEIS_STATUS, LAND_TEXT, RUECKBAU_STATUS, SICHERHEIT_STATUS, datumDe } from "@/lib/plattform/pachtakte";
import { PACHTVERTRAG_STATUS, euro } from "@/lib/plattform/finanzen/index.js";
import { heute as heuteWien } from "@/lib/plattform/finanzen/basis.js";

export const metadata = { title: "Pachtverträge" };

const TON_STATUS = { aktiv: "ok", gekuendigt: "warn", beendet: "neutral", entwurf: "neutral" };

function Verlauf({ liste = [] }) {
  if (!liste.length) return null;
  return (
    <ol className="mt-3 space-y-1.5 border-l border-ink-200 pl-4 text-[13px] leading-relaxed text-ink-600">
      {[...liste].reverse().map((x, i) => (
        <li key={i}>
          <span className="font-semibold text-ink-800">{new Date(x.am).toLocaleDateString("de-DE")}</span> · {x.wer === "admin" ? "ÖkoInvest" : "Sie"}: {ANLIEGEN_STATUS[x.nach]?.label || RUECKBAU_STATUS[x.nach]?.label || AGRI_NACHWEIS_STATUS[x.nach]?.label || SICHERHEIT_STATUS[x.nach]?.label || x.nach}
          {x.text ? <> – {x.text}</> : null}
        </li>
      ))}
    </ol>
  );
}

function Fristen({ fristen }) {
  if (!fristen.length) return <p className="text-[14px] text-ink-500">Fristen erscheinen, sobald Pachtbeginn und Laufzeit feststehen.</p>;
  return (
    <ul className="space-y-2.5">
      {fristen.map((f) => (
        <li key={f.id} className={cn("rounded-2xl px-4 py-3 ring-1 ring-inset", f.ton === "warn" ? "bg-sun-300/20 ring-sun-400/40" : f.ton === "neutral" ? "bg-ink-50 ring-ink-200" : "bg-white ring-ink-200/70")}>
          <p className="flex flex-wrap items-baseline justify-between gap-2 text-[14px]">
            <span className="font-semibold text-ink-900">{f.titel}</span>
            <span className="ov-num text-[13px] font-semibold text-ink-700">{datumDe(f.datum)}{f.tage !== null ? (f.tage < 0 ? " · vorbei" : ` · in ${f.tage.toLocaleString("de-DE")} Tagen`) : ""}</span>
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{f.text}</p>
        </li>
      ))}
    </ul>
  );
}

function AnliegenListe({ anliegen }) {
  if (!anliegen.length) return <p className="text-[14px] text-ink-500">Noch keine Anliegen zu diesem Vertrag.</p>;
  return (
    <ul className="space-y-3">
      {anliegen.map((a) => (
        <li key={a.id} className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-ink-200/70">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">{ANLIEGEN_ARTEN[a.art]?.kurz || a.artLabel}</p>
              <p className="text-[13px] text-ink-600">{a.zusammenfassung}</p>
            </div>
            <Badge ton={ANLIEGEN_STATUS[a.status]?.ton}>{a.statusLabel}</Badge>
          </div>
          <p className="mt-2 text-[13px] text-ink-500">{ANLIEGEN_STATUS[a.status]?.text}{ANLIEGEN_OFFEN.includes(a.status) && a.bearbeitungBis ? ` Ziel für unsere Rückmeldung: ${datumDe(a.bearbeitungBis)}.` : ""}</p>
          {a.ergebnis?.text && (
            <Hinweis ton="ok" className="mt-3" titel="Ergebnis">
              {a.ergebnis.text}
              {a.ergebnis.wirksamZum ? ` Vertragsende: ${datumDe(a.ergebnis.wirksamZum)}.` : ""}
            </Hinweis>
          )}
          {ANLIEGEN_OFFEN.includes(a.status) && a.unterlagen.length > 0 && <p className="mt-2 text-[12.5px] text-ink-500">Benötigte Unterlagen: {a.unterlagen.join(" · ")}</p>}
          <Verlauf liste={a.verlauf} />
          {a.aktionen.length > 0 && (
            <div className="mt-3">
              <Schritte url={`/api/portal/pachtakte/anliegen/${a.id}`} aktionen={a.aktionen} bestaetigen={{ zurueckgezogen: "Anliegen wirklich zurückziehen?" }} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function AgriBereich({ akte, heute }) {
  const { agri, vertrag, flaeche } = akte;
  const betrieb = !!vertrag.beginn;
  const standard = { heute, betrieb, ha: vertrag.flaecheHa, kultur: "", einheit: agri.referenz?.einheit || "dt" };
  return (
    <Karte titel={<span className="inline-flex items-center gap-2"><Leaf aria-hidden="true" className="h-5 w-5 text-ov-600" />Agri-PV: Bewirtschaftungsnachweise</span>} untertitel="DIN SPEC 91434: landwirtschaftlicher Ertrag mindestens 66 % des Referenzertrags, Flächenverlust höchstens 10 % (Kategorie I) bzw. 15 % (Kategorie II)">
      <p className="mb-4 text-[14px] leading-relaxed text-ink-600">
        {betrieb
          ? "Bitte erfassen Sie nach jeder Ernte das Betriebsjahr. Die Nachweise sichern Genehmigung und Förderfähigkeit und sind Grundlage für Gespräche mit Behörden."
          : "Vor dem Bau erfassen Sie Referenzjahre (Erträge ohne Anlage). Ihr Durchschnitt ist später der Vergleichswert für die Betriebsjahre."}
        {agri.referenz ? ` Aktueller Vergleichswert: ${String(agri.referenz.wert).replace(".", ",")} ${AGRI_NACHWEIS_EINHEITEN[agri.referenz.einheit] || ""} (${agri.referenz.quelle}).` : ""}
        {!flaeche?.kategorie ? " Die Agri-PV-Kategorie ist in den Flächenangaben noch offen – der Flächenverlust wird dann nur allgemein eingeordnet." : ""}
      </p>
      {agri.nachweise.length > 0 && (
        <ul className="mb-5 space-y-3">
          {agri.nachweise.map((x) => (
            <li key={x.id} className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-ink-200/70">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-ink-900">{x.daten.jahr} · {AGRI_NACHWEIS_ARTEN[x.daten.art]}</p>
                <Badge ton={AGRI_NACHWEIS_STATUS[x.status]?.ton}>{x.statusLabel}</Badge>
              </div>
              <p className="mt-1 text-[13px] text-ink-600">
                {AGRI_NACHWEIS_KULTUREN[x.daten.kultur]}{x.daten.kulturText ? ` (${x.daten.kulturText})` : ""} · {String(x.daten.ertrag).replace(".", ",")} {AGRI_NACHWEIS_EINHEITEN[x.daten.einheit]} · {String(x.daten.bewirtschaftetHa).replace(".", ",")} von {String(x.daten.gesamtHa).replace(".", ",")} ha bewirtschaftet
              </p>
              {x.pruefung.punkte.length > 0 && (
                <ul className="mt-2 space-y-1 text-[13px] leading-relaxed">
                  {x.pruefung.punkte.map((p) => <li key={p.id} className={p.stufe === "risiko" ? "font-medium text-ink-900" : "text-ink-600"}>{p.stufe === "ok" ? "Erfüllt: " : p.stufe === "risiko" ? "Achtung: " : ""}{p.titel}</li>)}
                </ul>
              )}
              <Verlauf liste={x.verlauf} />
              {x.bearbeitbar && (
                <details className="mt-3 rounded-2xl bg-sand-50 ring-1 ring-ink-200/70">
                  <summary className="cursor-pointer list-none px-4 py-3 text-[14px] font-semibold text-ov-700 [&::-webkit-details-marker]:hidden">{x.status === "rueckfrage" ? "Nachweis ergänzen und erneut einreichen" : "Entwurf bearbeiten"}</summary>
                  <div className="border-t border-ink-200/70 p-4"><AgriNachweisFormular vertragId={vertrag.id} nachweis={x} standard={standard} referenz={agri.referenz} kategorie={agri.kategorie} land={vertrag.land} /></div>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
      {vertrag.status !== "beendet" && (
        <details className="rounded-2xl bg-sand-50 ring-1 ring-ink-200/70" open={!agri.nachweise.length}>
          <summary className="cursor-pointer list-none px-4 py-3 text-[14.5px] font-semibold text-ov-700 [&::-webkit-details-marker]:hidden">Neues Wirtschaftsjahr erfassen</summary>
          <div className="border-t border-ink-200/70 p-4 md:p-5"><AgriNachweisFormular vertragId={vertrag.id} standard={standard} referenz={agri.referenz} kategorie={agri.kategorie} land={vertrag.land} /></div>
        </details>
      )}
    </Karte>
  );
}

function Akte({ akte, heute }) {
  const { vertrag, flaeche, angebot, sicherheit, rueckbau } = akte;
  const offeneArten = akte.anliegen.filter((a) => ANLIEGEN_OFFEN.includes(a.status)).map((a) => a.art);
  const arten = Object.entries(ANLIEGEN_ARTEN).filter(([k, a]) => a.nurStatus.includes(vertrag.status) && !offeneArten.includes(k)).map(([k]) => k);
  return (
    <section aria-labelledby={`v-${vertrag.id}`} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`v-${vertrag.id}`} className="font-display text-[21px] font-bold text-ink-900">{vertrag.bezeichnung}</h2>
          <p className="text-[13.5px] text-ink-500">{vertrag.objektLabel || (vertrag.objektArt === "dach" ? "Dach / Gebäude" : "Fläche")} · {LAND_TEXT[vertrag.land] || vertrag.land}{vertrag.flaecheHa ? ` · ${Number(vertrag.flaecheHa).toLocaleString("de-DE")} ha` : ""} · Vertrag {vertrag.id}</p>
        </div>
        <Badge ton={TON_STATUS[vertrag.status]}>{PACHTVERTRAG_STATUS[vertrag.status]?.label || vertrag.status}</Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Karte titel={<span className="inline-flex items-center gap-2"><FileSignature aria-hidden="true" className="h-5 w-5 text-ov-600" />Vertrag</span>}>
          <Angaben
            items={[
              { label: "Modell", wert: vertrag.modellLabel },
              { label: "Jahrespacht aktuell", wert: vertrag.jahrespachtAktuell !== null && vertrag.jahrespachtAktuell !== undefined ? euro(vertrag.jahrespachtAktuell) : vertrag.modell === "umsatz" ? "nach Stromerlösen" : null },
              { label: "Vertrag geschlossen", wert: vertrag.vertragsdatum ? datumDe(vertrag.vertragsdatum) : null },
              { label: "Pachtbeginn", wert: vertrag.beginn ? datumDe(vertrag.beginn) : `mit ${vertrag.beginnLabel || "Baubeginn"}` },
              { label: "Grundlaufzeit", wert: vertrag.laufzeitJahre ? `${vertrag.laufzeitJahre} Jahre${vertrag.ende ? ` (bis ${datumDe(vertrag.ende)})` : ""}` : null },
              { label: "Verlängerung", wert: angebot?.verlaengerungJahre ? `Option um ${angebot.verlaengerungJahre} Jahre${angebot.verlaengerung ? ` – ${angebot.verlaengerung}` : ""}` : angebot ? "nicht vorgesehen" : null },
              { label: "Zahlung", wert: vertrag.faelligkeitLabel ? `${vertrag.faelligkeitLabel}, ${vertrag.zahlweise === "vorschuessig" ? "im Voraus" : "im Nachhinein"}` : null },
              { label: "Vertragsende laut Kündigung", wert: vertrag.kuendigungZum ? datumDe(vertrag.kuendigungZum) : null },
            ]}
          />
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-semibold">
            <Link href="/portal/abrechnungen" className="text-ov-700 hover:text-ov-800">Abrechnungen</Link>
            <Link href="/portal/grundbuch" className="text-ov-700 hover:text-ov-800">Grundbuch & Dienstbarkeit</Link>
            {flaeche && <Link href={`/portal/flaechen/${flaeche.id}`} className="text-ov-700 hover:text-ov-800">Fläche & Projektstatus</Link>}
          </div>
        </Karte>

        <Karte titel={<span className="inline-flex items-center gap-2"><CalendarClock aria-hidden="true" className="h-5 w-5 text-ov-600" />Fristen</span>} untertitel="Erfahrungswerte und Vertragsdaten – verbindlich ist Ihr Vertrag">
          <Fristen fristen={akte.fristen} />
        </Karte>

        <Karte titel={<span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden="true" className="h-5 w-5 text-ov-600" />Rückbausicherheit</span>} untertitel="Sichert den Rückbau, falls der Betreiber ausfällt">
          <div className="flex flex-wrap items-center gap-2">
            <Badge ton={SICHERHEIT_STATUS[sicherheit.status]?.ton}>{sicherheit.statusLabel}</Badge>
            {sicherheit.artLabel && <span className="text-[13.5px] text-ink-600">{sicherheit.artLabel}</span>}
          </div>
          <Angaben
            items={[
              { label: "Betrag", wert: sicherheit.betrag ? euro(sicherheit.betrag) : null },
              { label: "Sicherungsgeber", wert: sicherheit.geber },
              { label: "Hinterlegt am", wert: sicherheit.hinterlegtAm ? datumDe(sicherheit.hinterlegtAm) : null },
              { label: "Vereinbart ab", wert: sicherheit.ab === "baubeginn" ? "Baubeginn" : sicherheit.ab === "spaeter" ? "später (laut Vertrag)" : null },
            ]}
          />
          {sicherheit.hinweise.map((h, i) => <Hinweis key={i} ton={h.ton} className="mt-3">{h.text}</Hinweis>)}
          <Verlauf liste={sicherheit.verlauf} />
        </Karte>

        <Karte titel={<span className="inline-flex items-center gap-2"><Wrench aria-hidden="true" className="h-5 w-5 text-ov-600" />Rückbau & Rückgabe</span>}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge ton={RUECKBAU_STATUS[rueckbau.status]?.ton}>{rueckbau.statusLabel}</Badge>
            {rueckbau.termin && <span className="ov-num text-[13.5px] text-ink-600">Termin {datumDe(rueckbau.termin)}</span>}
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{rueckbau.text}</p>
          {rueckbau.status === "abnahme_bereit" && <Hinweis ton="warn" className="mt-3">Prüfen Sie vor der Bestätigung: Module, Gestelle, Kabel, Fundamente und Zaun entfernt; Boden gelockert und eingeebnet; Zufahrten und Drainagen wiederhergestellt. Mängel melden Sie hier mit Beschreibung – Fotos gern über „Dokumente“ der Fläche.</Hinweis>}
          <Verlauf liste={rueckbau.verlauf} />
          {rueckbau.aktionen.length > 0 && <div className="mt-3"><Schritte url={`/api/portal/pachtakte/rueckbau/${vertrag.id}`} aktionen={rueckbau.aktionen} bestaetigen={{ abgenommen: "Rückbau als abgenommen bestätigen? Danach werden Sicherheit und Dienstbarkeit freigegeben." }} /></div>}
        </Karte>
      </div>

      <Karte titel={<span className="inline-flex items-center gap-2"><HandCoins aria-hidden="true" className="h-5 w-5 text-ov-600" />Anliegen zum Vertrag</span>} untertitel="Kündigung, Eigentümerwechsel, Erbfall, mehrere Eigentümer, Verlängerung">
        <AnliegenListe anliegen={akte.anliegen} />
        {arten.length > 0 && (
          <details className="mt-5 rounded-2xl bg-sand-50 ring-1 ring-ink-200/70">
            <summary className="cursor-pointer list-none px-4 py-3 text-[14.5px] font-semibold text-ov-700 [&::-webkit-details-marker]:hidden">Neues Anliegen</summary>
            <div className="border-t border-ink-200/70 p-4 md:p-5"><AnliegenFormular vertragId={vertrag.id} land={vertrag.land} arten={arten} heute={heute} /></div>
          </details>
        )}
      </Karte>

      {akte.agri.moeglich && <AgriBereich akte={akte} heute={heute} />}
    </section>
  );
}

export default async function PachtvertraegeSeite() {
  const n = await portalNutzer({ rollen: ["flaeche", "landwirt"] });
  const d = await laden(() => pachtakteBackend().meinePachtakte(n));
  const heute = heuteWien();
  return (
    <div className="space-y-10">
      <SeitenKopf
        eyebrow="Portal · Pacht"
        titel="Pachtverträge"
        text="Ihr Vertrag nach der Unterschrift: Fristen, Rückbausicherheit, Rückbau, Anliegen wie Kündigung, Eigentümerwechsel oder Erbfall – und die Jahresbescheinigung für Ihre Steuerberatung."
        aktionen={<Button href="/portal/abrechnungen" size="sm" variant="secondary">Zu den Abrechnungen</Button>}
      />
      {d.bescheinigungsJahre.length > 0 && (
        <Karte titel={<span className="inline-flex items-center gap-2"><FileDown aria-hidden="true" className="h-5 w-5 text-ov-600" />Jahresbescheinigungen</span>} untertitel="Summe Ihrer Pacht-Gutschriften je Kalenderjahr als PDF – mit steuerlichen Hinweisen">
          <ul className="flex flex-wrap gap-2">
            {d.bescheinigungsJahre.map((j) => (
              <li key={j}><a href={`/api/portal/pachtakte/bescheinigung/${j}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:ring-ink-300"><FileDown aria-hidden="true" className="h-4 w-4 text-ov-600" />{j}</a></li>
            ))}
          </ul>
          {d.auszahlung && !d.auszahlung.ok && <p className="mt-3 text-[13px] text-ink-600">Hinweis: Auszahlungen sind gesperrt, bis Ihre <Link href="/portal/verifizierung" className="font-semibold text-ov-700">Verifizierung</Link> abgeschlossen ist.</p>}
        </Karte>
      )}
      {d.vertraege.length ? (
        d.vertraege.map((a) => <Akte key={a.vertrag.id} akte={a} heute={heute} />)
      ) : (
        <Leer icon={LandPlot} titel="Noch kein Pachtvertrag" text="Sobald Sie ein Pachtangebot angenommen haben und der Vertrag unterschrieben ist, finden Sie hier Fristen, Sicherheiten, Anliegen und Bescheinigungen." aktion={<Button href="/portal/flaechen" size="sm" variant="secondary">Zu meinen Flächen</Button>} />
      )}
      {d.frueher.length > 0 && (
        <Karte titel="Übertragene Verträge" untertitel="Nach Eigentümerwechsel oder Erbfall – Ihre bisherigen Abrechnungen bleiben unter „Abrechnungen“ abrufbar">
          <ul className="space-y-1.5 text-[14px] text-ink-700">
            {d.frueher.map((x) => <li key={x.id}>{x.bezeichnung}{x.uebergabe?.ab ? ` – übertragen zum ${datumDe(x.uebergabe.ab)}` : x.uebergabe?.am ? ` – übertragen am ${new Date(x.uebergabe.am).toLocaleDateString("de-DE")}` : ""}</li>)}
          </ul>
        </Karte>
      )}
      <Hinweis ton="neutral">Die Hinweise auf dieser Seite erklären den üblichen Ablauf und ersetzen keine Rechts- oder Steuerberatung. Verbindlich sind Ihr Pachtvertrag und die Eintragungen im Grundbuch.</Hinweis>
    </div>
  );
}
