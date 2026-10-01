// Detailansicht eines Gründungsauftrags (WP5) – gemeinsam für Auftraggeber (/portal/eg/gruendung/[id]) und Backoffice
// (/portal/admin/eg/gruendung/[id]). Serverkomponente; interaktive Teile in Auftrag.js, Dokumente.js, Wechsel.js, Foerder.js.

import Link from "next/link";
import { BadgeCheck, CalendarClock, FileSignature, Landmark, ListChecks, ShieldCheck } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte, Kennzahl, QualitaetsBalken, SeitenKopf } from "@/components/Portal/ui";
import { Klappe } from "@/components/Portal/Mitglied/teile";
import { VORLAGEN } from "@/lib/plattform/eg/vertraege";
import { AuftragAktionen, AuftragNotiz, SchrittListe } from "./Auftrag";
import { DokumentGenerator } from "./Dokumente";
import { FoerderCheck } from "./Foerder";
import { ImportAssistent, Kontrollabrechnung } from "./Wechsel";
import { Befunde, datumDe, eurDe, zahlDe } from "./teile";

function Formular({ f }) {
  return (
    <div id={`hilfe-${f.art}`} className="scroll-mt-24 rounded-2xl bg-white p-4 ring-1 ring-inset ring-ink-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-display text-[15px] font-bold text-ink-900">{f.titel}</p>
        {f.fehlend?.length > 0 ? <Badge ton="warn">{f.fehlend.length} Angabe(n) offen</Badge> : <Badge ton="ok">vollständig</Badge>}
      </div>
      <p className="mt-0.5 text-[12.5px] text-ink-500">{[f.stelle, f.frist, f.quelle].filter(Boolean).join(" · ")}</p>
      {f.felder?.length > 0 && (
        <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-[13.5px] sm:grid-cols-[minmax(0,14rem)_1fr]">
          {f.felder.map((x) => (
            <div key={x.label} className="contents">
              <dt className="text-ink-500">{x.label}</dt>
              <dd className={x.offen ? "text-sun-500" : "break-words text-ink-900"}>{x.wert || "noch offen"}</dd>
            </div>
          ))}
        </dl>
      )}
      {f.wege?.length > 0 && (
        <ul className="mt-3 space-y-1 text-[13px] text-ink-700">
          {f.wege.map((w) => <li key={w.netzbetreiber}><span className="font-semibold">{w.netzbetreiber}:</span> {w.weg}{w.kontakt ? ` · ${w.kontakt}` : ""}{w.formular ? ` · ${w.formular}` : ""}{w.besonderheiten ? ` · ${w.besonderheiten}` : ""}</li>)}
        </ul>
      )}
      {f.hinweise?.length > 0 && <ul className="mt-3 space-y-1 text-[13px] text-ink-600">{f.hinweise.map((h, i) => <li key={i}>– {h}</li>)}</ul>}
      {f.link && <a href={f.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[13px] font-semibold text-ov-700 hover:text-ov-800">Anleitung der Koordinationsstelle</a>}
    </div>
  );
}

export default function AuftragSeite({ auftrag: a, netzbetreiber = [], gemeinschaften = [], art = "kunde" }) {
  const bo = art === "admin" && a.rolle === "backoffice";
  const schreiben = bo && a.darfSchreiben;
  const kunde = a.alsAuftraggeber;
  const g = a.gemeinschaft;
  const f = a.fortschritt;
  const felder = Object.fromEntries(a.vorlagen.map((v) => [v.id, VORLAGEN[v.id]?.felder || []]));
  const zurueck = art === "admin" ? "/portal/admin/eg/gruendung" : "/portal/eg/gruendung";
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={`${a.paketLabel} · ${a.id}`} titel={a.arbeitsname} text={`${a.modellLabel} · Zonelevel ${a.zonelevel} (${a.zonelevelLabel}) · ${a.rechtsformLabel} · ${a.plz} ${a.ort}`} aktionen={<Link href={zurueck} className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Alle Aufträge</Link>}>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge ton={a.ton}>{a.statusLabel}</Badge>
          {a.signatur && <Badge ton={a.signatur.status === "abgeschlossen" ? "ok" : "info"}>Unterschrift: {a.signatur.statusLabel}</Badge>}
          {g && <Badge ton="info">Gemeinschaft: {g.statusLabel}</Badge>}
          {a.demo && <Badge>Demo</Badge>}
        </div>
      </SeitenKopf>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl label="Fortschritt (Pflichtschritte)" wert={`${f.prozent} %`} hinweis={`${f.erledigt} von ${f.pflicht} erledigt`} icon={ListChecks} />
        <Kennzahl label="Fristen" wert={f.ueberfaellig ? `${f.ueberfaellig} überfällig` : f.bald ? `${f.bald} bald fällig` : "im Plan"} hinweis={f.naechste[0] ? `Nächster Schritt: ${f.naechste[0].label}` : "keine offenen Schritte"} icon={CalendarClock} />
        <Kennzahl label="Angebot" wert={a.angebot ? eurDe(a.angebot.betragNetto) : "–"} hinweis={a.angebot ? `netto · gültig bis ${datumDe(a.angebot.gueltigBis)}` : "in Vorbereitung"} icon={FileSignature} />
        <Kennzahl label="EDA-bereit" wert={a.edaBereit.bereit ? "ja" : g ? `${a.edaBereit.fehlend.length} offen` : "–"} hinweis={g ? g.name : "Gemeinschaft noch nicht angelegt"} icon={ShieldCheck} />
      </div>

      {a.hinweise.length > 0 && <Hinweis ton={a.hinweise.some((h) => h.stufe === "warn") ? "warn" : "info"} titel="Hinweise zur Konstellation"><Befunde liste={a.hinweise} /></Hinweis>}
      {a.signatur?.status === "laufend" && kunde && (
        <Hinweis ton="info" titel="Ihr Auftrag liegt zur Unterschrift bereit">
          Bitte unterschreiben Sie das Angebot elektronisch: <Link className="font-semibold text-ov-700 underline" href={a.signatur.link}>Zur Unterschrift</Link>. Danach startet die Gründung automatisch.
        </Hinweis>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {a.status === "anfrage" && !bo && <Hinweis ton="info" titel="Anfrage eingegangen">Wir prüfen Ihre Angaben und erstellen ein Angebot. Sie werden im Portal und per E-Mail benachrichtigt.</Hinweis>}
          <Karte titel="Fahrplan" untertitel="Schritte mit Fristen, Zuständigkeit, Nachweisen und Rechtsgrundlage">
            <QualitaetsBalken quote={f.prozent} label="Pflichtschritte erledigt" />
            <div className="mt-5"><SchrittListe auftragId={a.id} schritte={a.schritte} bo={schreiben} kunde={kunde && !["anfrage", "angebot"].includes(a.status)} gemeinschaftId={g?.id || ""} rechtsform={g?.rechtsform || a.rechtsform} /></div>
          </Karte>

          {a.paket === "wechsel" && (
            <Karte titel="Wechsel: Umstellungsplan" untertitel="Stichtag, Parallellauf, Kontrollabrechnung und ElWG-Anpassung (Fachkonzept 2.6)">
              {a.umstellungsplan?.stichtag ? (
                <div className="space-y-3">
                  <Angaben items={[{ label: "Stichtag (erster Monat bei ÖkoInvest)", wert: datumDe(a.umstellungsplan.stichtag) }, { label: "Letzte Abrechnung beim bisherigen Dienstleister", wert: a.umstellungsplan.letzteAltabrechnung }, { label: "Parallellauf", wert: `${datumDe(a.umstellungsplan.parallelVon)} – ${datumDe(a.umstellungsplan.parallelBis)}` }, { label: "Erste Abrechnung frühestens", wert: datumDe(a.umstellungsplan.ersteAbrechnungAb) }]} />
                  <ol className="divide-y divide-ink-100 text-[13.5px]">{a.umstellungsplan.termine.map((t) => <li key={t.schluessel} className="flex justify-between gap-3 py-1.5"><span className={t.vergangen ? "text-ink-400" : "text-ink-800"}>{t.label}</span><span className="ov-num shrink-0 text-ink-600">{datumDe(t.datum)}</span></li>)}</ol>
                </div>
              ) : <p className="text-[14px] text-ink-600">Noch kein Stichtag festgelegt.</p>}
              {a.umstellungsplan?.warnungen?.length > 0 && <div className="mt-3"><Befunde liste={a.umstellungsplan.warnungen.map((t) => ({ stufe: "warn", text: t }))} /></div>}
              {a.elwg && (
                <div className="mt-5">
                  <p className="text-[14px] font-semibold text-ink-900">ElWG-Anpassungspaket ({a.elwg.offen} offen, Pflicht bis zum Stichtag)</p>
                  <ul className="mt-2 space-y-1.5 text-[13.5px]">{a.elwg.punkte.map((p) => <li key={p.id} className="flex gap-2"><Badge ton={p.status === "erfuellt" ? "ok" : p.status === "offen" ? "warn" : "neutral"}>{p.status}</Badge><span className="min-w-0">{p.text} <span className="text-[12px] text-ink-500">({p.quelle})</span></span></li>)}</ul>
                </div>
              )}
            </Karte>
          )}

          {a.paket === "wechsel" && bo && g && (
            <>
              <Karte titel="Import aus dem bisherigen System" untertitel="Mitglieder, Zählpunkte, Teilnahmefaktoren, Consent-IDs, Preise, offene Salden" id="wechsel-import">
                {schreiben ? <ImportAssistent gemeinschaftId={g.id} auftragId={a.id} importe={a.importe} /> : <p className="text-[14px] text-ink-600">Import nur mit Schreibrecht im Bereich „Energiegemeinschaften“.</p>}
              </Karte>
              <Karte titel="Probe- bzw. Kontrollabrechnung" untertitel="„Ihre erste Abrechnung bei uns prüfen wir gemeinsam – zeilengenau.“">
                <Kontrollabrechnung auftragId={a.id} kontrolle={a.kontrolle} stichtag={a.stichtag} />
              </Karte>
            </>
          )}

          <Karte titel="Muster und Dokumente" untertitel="Statuten, Verträge, Vollmacht, Anzeigen – befüllt mit den Daten des Auftrags" id="dokumente">
            <DokumentGenerator vorlagen={a.vorlagen} felder={felder} auftragId={a.id} gemeinschaftId={g?.id && (bo || a.rolle === "organ") ? g.id : ""} dokumente={a.dokumente} vorgaben={a.statutenEingaben} />
          </Karte>

          {Object.keys(a.formulare).length > 0 && (
            <Karte titel="Ausfüllhilfen" untertitel="Behörden, Finanzamt, ebUtilities, Netzbetreiber und EDA – vorbefüllt aus den Stammdaten">
              <div className="space-y-3">{Object.values(a.formulare).map((x) => <Formular key={x.art} f={x} />)}</div>
            </Karte>
          )}

          <Karte titel="Förder-Check" untertitel="Bund, Klima- und Energiefonds, Länder – mit Quellen und Stand" id="foerdercheck">
            <FoerderCheck auftragId={a.id} start={{ modell: a.modell, bundesland: a.bundesland, gemeindeBeteiligt: a.gemeindeBeteiligt, anlagen: [...(a.erzeugungKwp ? [{ art: "pv", kwp: String(a.erzeugungKwp), speicherKwh: "", status: "geplant", bezeichnung: "geplante PV" }] : []), ...(a.speicherKwh ? [{ art: "speicher", kwp: "", speicherKwh: String(a.speicherKwh), status: "geplant", bezeichnung: "Speicher" }] : [])] }} speicherbar />
          </Karte>
        </div>

        <div className="space-y-6">
          {(a.aktionen.length > 0) && (
            <Karte titel={bo ? "Steuerung" : "Ihre nächsten Schritte"}>
              <AuftragAktionen auftrag={a} netzbetreiber={netzbetreiber} gemeinschaften={gemeinschaften} />
            </Karte>
          )}
          {a.angebot && (
            <Karte titel={`Angebot ${a.angebot.nummer}`}>
              <Angaben spalten={1} items={[{ label: "Honorar", wert: `${eurDe(a.angebot.betragNetto)} netto · ${eurDe(a.angebot.betragBrutto)} brutto` }, { label: "Gültig bis", wert: datumDe(a.angebot.gueltigBis) }, { label: "Zahlungsplan", wert: a.angebot.zahlungsplan }, { label: "Hinweise", wert: a.angebot.hinweise }]} />
              <ul className="mt-3 list-disc space-y-0.5 pl-5 text-[13.5px] text-ink-700">{a.angebot.leistungen.map((l) => <li key={l}>{l}</li>)}</ul>
              <a href={`/api/portal/eg/dokument?vorlage=gruendungsauftrag&auftragId=${a.id}`} target="_blank" rel="noopener" className="mt-3 inline-block text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">Angebot als PDF</a>
            </Karte>
          )}
          {g && (
            <Karte titel="Gemeinschaft" untertitel={g.statusLabel}>
              <Angaben spalten={1} items={[{ label: "Name", wert: g.name }, { label: "ZVR / FN", wert: g.zvrZahl || g.firmenbuchnummer }, { label: "Marktpartner-ID", wert: g.marktpartnerId }, { label: "Gemeinschafts-ID", wert: g.gemeinschaftsId }, { label: "EDA-Anbindung", wert: g.edaAnbindung }, { label: "Erzeugungsleistung", wert: `${zahlDe(g.kennzahlen?.erzeugungsleistungKw, 1)} kW` }]} />
              {!a.edaBereit.bereit && a.edaBereit.fehlend.length > 0 && <div className="mt-3"><p className="text-[13px] font-semibold text-ink-700">Bis „EDA-bereit“ fehlt:</p><ul className="mt-1 space-y-0.5 text-[13px] text-ink-600">{a.edaBereit.fehlend.map((x) => <li key={x}>– {x}</li>)}</ul></div>}
              {bo && <Link href={`/portal/admin/eg/${g.id}`} className="mt-3 inline-block text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">Stammdaten öffnen</Link>}
              {(bo || a.rolle === "organ") && <Link href={bo ? `/portal/admin/eg/${g.id}/organe` : `/portal/eg/${g.id}/verein`} className="ml-4 mt-3 inline-block text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">Organe und Versammlungen</Link>}
            </Karte>
          )}
          {a.organCheck && (
            <Karte titel="Organe" untertitel={`${a.organCheck.besetzung.leitung} im Leitungsorgan · ${a.organCheck.besetzung.pruefer} Rechnungsprüfer`}>
              <Befunde liste={a.organCheck.befunde} leer="Besetzung vollständig." />
            </Karte>
          )}
          {a.lieferantenpflichten && (
            <Karte titel="Lieferantenpflichten (§ 69 ElWG)" untertitel={a.lieferantenpflichten.grund}>
              <ul className="space-y-1.5 text-[13.5px]">{a.lieferantenpflichten.pflichten.map((p) => <li key={p.id} className="flex gap-2"><Badge ton={p.status === "erfuellt" ? "ok" : p.status === "offen" ? "warn" : "neutral"}>{p.status === "nicht_noetig" ? "–" : p.status}</Badge><span className="min-w-0">{p.titel}<span className="block text-[12px] text-ink-500">{p.hinweis} ({p.quelle})</span></span></li>)}</ul>
            </Karte>
          )}
          <Karte titel="Rechtsform" untertitel="Entscheidungshilfe – keine Rechtsberatung">
            <p className="text-[14px] text-ink-800"><BadgeCheck aria-hidden="true" className="mr-1 inline h-4 w-4 text-ov-600" />Empfehlung: <strong>{a.rechtsformHilfe.alternativen.find((x) => x.empfohlen)?.label || "keine eigene Rechtsperson"}</strong></p>
            <ul className="mt-2 space-y-1 text-[13px] text-ink-600">{a.rechtsformHilfe.begruendung.map((b) => <li key={b}>– {b}</li>)}</ul>
            {a.rechtsformHilfe.alternativen.length > 0 && (
              <Klappe titel="Vergleich der Rechtsformen" className="mt-3">
                <div className="space-y-3 text-[13px]">{a.rechtsformHilfe.alternativen.map((x) => <div key={x.rechtsform}><p className="font-semibold text-ink-900">{x.label}{x.empfohlen ? " (empfohlen)" : ""}</p><p className="text-ov-800">+ {x.pro.join(" · ")}</p><p className="text-ink-600">– {x.contra.join(" · ")}</p></div>)}</div>
              </Klappe>
            )}
          </Karte>
          <Karte titel="Verlauf und Nachrichten">
            <AuftragNotiz auftragId={a.id} bo={bo} />
            <ol className="mt-4 space-y-2.5 text-[13.5px]">{[...a.verlauf].reverse().slice(0, 30).map((v, i) => <li key={i}><span className="text-ink-500">{datumDe(v.am)} · {v.vonName}{v.oeffentlich ? "" : " · intern"}</span><span className="block text-ink-800">{v.text}</span></li>)}</ol>
          </Karte>
          {bo && <Karte titel="Auftraggeber"><Angaben spalten={1} items={[{ label: "Name", wert: a.auftraggeber?.name }, { label: "E-Mail", wert: a.auftraggeber?.email }, { label: "Ansprechperson", wert: [a.ansprechpartner?.name, a.ansprechpartner?.email, a.ansprechpartner?.telefon].filter(Boolean).join(" · ") }, { label: "Nachricht", wert: a.nachricht }, { label: "Bestehend", wert: a.bestehend ? `${a.bestehend.name} · ${a.bestehend.altdienstleister} · ${a.bestehend.mitglieder} Mitglieder · ${a.bestehend.zaehlpunkte} ZP` : "" }]} /><p className="mt-2 text-[12px] text-ink-500"><Landmark aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />Netzbetreiber: {netzbetreiber.find((x) => x.id === a.netzbetreiberId)?.name || "unbekannt"}</p></Karte>}
        </div>
      </div>
    </div>
  );
}
