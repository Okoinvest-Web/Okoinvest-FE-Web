// /portal/admin/eg/[id] – Backoffice: eine Energiegemeinschaft. Reiter (?reiter=): stammdaten (Stammdaten, Status, Organe,
// Hinweise), mitglieder (Mitglieder & Zählpunkte mit Massenbearbeitung, CSV-Import/-Export), anlagen (Anlagen, Tarife,
// Verteilschlüssel). Weitere Reiter anderer Pakete über EgReiter (EDA, Energiedaten, Abrechnung …). WP1.

import { Factory, Landmark, ReceiptText, ScrollText, ShieldCheck, Users } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte, Kennzahl, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { Klappe } from "@/components/Portal/Mitglied/teile";
import EgReiter from "@/components/Portal/EG/Stamm/EgReiter";
import { AnlageNeu, OrganBeenden, OrganNeu, StammdatenFormular, StatusWechsel, TarifNeu } from "@/components/Portal/EG/Stamm/Formulare";
import { CsvImport, MitgliedNeu, MitgliederTabelle, TeilnahmeKorrektur } from "@/components/Portal/EG/Stamm/Mitglieder";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { ANLAGE_ARTEN, GEMEINSCHAFT_STATUS, NUTZUNGSMODELLE, TARIF_STATUS, EG_TEAMROLLEN } from "@/lib/plattform/eg/modell";
import { datum } from "@/lib/plattform/format";

export const metadata = { title: "Energiegemeinschaft" };
const zahl = (x, s = 0) => (x === null || x === undefined || x === "" ? "–" : Number(x).toLocaleString("de-DE", { maximumFractionDigits: s }));
const CSV_SPALTEN = ["mitgliedsnummer", "art", "vorname", "nachname", "firma", "strasse", "plz", "ort", "email", "iban", "sepa_referenz", "sepa_datum", "steuerstatus", "uid", "zaehlpunkt", "richtung", "teilnahmefaktor", "kwp"];

export default async function EgDetail({ params, searchParams }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const sp = (await searchParams) || {};
  const reiter = ["mitglieder", "anlagen"].includes(sp.reiter) ? sp.reiter : "stammdaten";
  const d = await laden(() => egBackend().egGemeinschaft(n, id));
  const g = d.gemeinschaft;
  const r = d.rechte;
  const url = `/api/admin/eg/${g.id}`;
  const z = g.kennzahlen;
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={`${g.modellKurz} · Zonelevel ${g.zonelevel} · ${g.netzbetreiberNamen.join(", ") || "ohne Netzbetreiber"}`} titel={g.name} text={g.gemeinschaftsId ? `Gemeinschafts-ID ${g.gemeinschaftsId}${g.marktpartnerId ? ` · Marktpartner ${g.marktpartnerId}` : ""}` : "Gemeinschafts-ID noch nicht vergeben"}>
        <div className="mt-3 flex flex-wrap gap-2"><Badge ton={GEMEINSCHAFT_STATUS[g.status]?.ton}>{g.statusLabel}</Badge>{d.rollen.length > 0 && <Badge ton="info">{d.rollen.map((r) => EG_TEAMROLLEN[r]?.label || r).join(", ")}</Badge>}{g.demo && <Badge>Demo</Badge>}</div>
      </SeitenKopf>
      <EgReiter gemeinschaftId={g.id} aktiv={reiter} art="admin" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl label="Aktive Mitglieder" wert={zahl(z.mitgliederAktiv)} hinweis={z.mitgliederOffen ? `${z.mitgliederOffen} Anträge offen` : undefined} icon={Users} />
        <Kennzahl label="Aktive Zählpunkte" wert={zahl(z.zaehlpunkteAktiv)} hinweis={`${z.verbrauchAktiv} Verbrauch · ${z.erzeugungAktiv} Erzeugung`} icon={Landmark} />
        <Kennzahl label="Erzeugungsleistung" wert={`${zahl(z.erzeugungsleistungKw, 1)} kW`} hinweis={z.lieferantenpflichten ? "§ 69 ElWG: Lieferantenpflichten" : "unter der § 69-Schwelle"} icon={Factory} />
        <Kennzahl label="Netzentgelt (heute)" wert={g.netzentgelt?.reduktionPct ? `−${g.netzentgelt.reduktionPct} %` : "–"} hinweis={g.netzentgelt?.status === "platzhalter" ? "Platzhalter neue SNE-VO" : g.netzentgelt?.quelle} icon={ShieldCheck} />
      </div>
      {d.hinweise.length > 0 && (
        <Hinweis ton={d.hinweise.some((h) => h.stufe === "fehler") ? "warn" : "info"} titel="Hinweise">
          <ul className="list-disc space-y-1 pl-5">{d.hinweise.map((h, i) => <li key={i}>{h.text}</li>)}</ul>
        </Hinweis>
      )}

      {reiter === "stammdaten" && (
        <>
          <Karte titel="Stammdaten" untertitel="Rechtsdaten, Kennungen, Netz und Dienstleistung">
            <Angaben spalten={3} items={[{ label: "Rechtsform", wert: g.rechtsform }, { label: "ZVR / Firmenbuch", wert: g.zvrZahl || g.firmenbuchnummer || "–" }, { label: "Verteilmodell", wert: g.verteilmodell }, { label: "EDA-Anbindung", wert: g.edaAnbindung }, { label: "Sitz", wert: [g.sitzAdresse?.strasse, `${g.sitzAdresse?.plz || ""} ${g.sitzAdresse?.ort || ""}`.trim()].filter(Boolean).join(", ") || "–" }, { label: "Umsatzsteuer", wert: g.ustStatus }, { label: "Organisator", wert: g.dienstleistung?.aktiv ? `ÖkoInvest seit ${datum(g.dienstleistung.seit)}${g.organisatorAngezeigtAm ? `, angezeigt ${datum(g.organisatorAngezeigtAm)}` : ", Anzeige offen"}` : "–" }, { label: "IBAN", wert: g.iban || "–" }, { label: "Tarif", wert: g.tarifAktuell ? `${zahl(g.tarifAktuell.bezugspreisCt, 4)} / ${zahl(g.tarifAktuell.einspeisepreisCt, 4)} ct/kWh` : "kein gültiger Tarif" }]} />
            {r.organe_statuten >= 2 && <div className="mt-5"><Klappe titel="Stammdaten bearbeiten"><StammdatenFormular g={g} netzbetreiber={d.netzbetreiber} url={url} /></Klappe></div>}
          </Karte>
          {r.organe_statuten >= 2 && <Karte titel="Status der Gemeinschaft" untertitel={`Aktuell: ${g.statusLabel}`}><StatusWechsel g={g} url={url} /></Karte>}
          <Karte titel="Organe" untertitel="Teamrollen in der Gemeinschaft – Organe mit Portalkonto erhalten die Verwaltung unter „Energiegemeinschaft“." aktion={<ScrollText aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
            {d.organe.length ? (
              <Tabelle kopf={["Funktion", "Person", "Periode", "Zeichnung", ""]}>
                {d.organe.map((o) => (
                  <tr key={o.id} className={o.wirksam ? "" : "text-ink-400"}>
                    <td className={zelle}>{o.funktionLabel}</td>
                    <td className={zelle}>{o.personName}{o.kontoId ? <span className="block text-[12.5px] text-ink-500">Portalkonto</span> : null}</td>
                    <td className={zelle}>{datum(o.von)}–{o.bis ? datum(o.bis) : "offen"}</td>
                    <td className={zelle}>{o.zeichnungsberechtigt ? "ja" : "–"}</td>
                    <td className={zelle}>{r.organe_statuten >= 2 && <OrganBeenden organ={o} url={url} />}</td>
                  </tr>
                ))}
              </Tabelle>
            ) : <p className="text-[14px] text-ink-500">Noch keine Organe eingetragen.</p>}
            {r.organe_statuten >= 2 && <div className="mt-4"><Klappe titel="Funktion eintragen"><OrganNeu url={url} /></Klappe></div>}
          </Karte>
        </>
      )}

      {reiter === "mitglieder" && (
        <>
          <Karte titel="Mitglieder und Zählpunkte" untertitel={`${d.mitglieder.length} Mitglieder · ${d.zaehlpunkte.length} Zählpunkte · ${d.teilnahmen.length} Teilnahmen`} aktion={<Users aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
            <MitgliederTabelle mitglieder={d.mitglieder} teilnahmen={d.teilnahmen} zaehlpunkte={d.zaehlpunkte} rechte={r} url={url} exportUrl={url} />
          </Karte>
          {r.stammdaten >= 2 && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Karte titel="Mitglied erfassen"><MitgliedNeu url={url} /></Karte>
              <Karte titel="CSV-Import" untertitel="Massenpflege mit Vorschau – auch für den Wechsel von anderen Plattformen"><CsvImport url={url} spalten={CSV_SPALTEN} /></Karte>
            </div>
          )}
          {d.backofficeStufe >= 2 && d.rollen.includes("organisator") && d.teilnahmen.length > 0 && <TeilnahmeKorrektur teilnahmen={d.teilnahmen} zaehlpunkte={d.zaehlpunkte} url={url} />}
        </>
      )}

      {reiter === "anlagen" && (
        <>
          <Karte titel="Anlagen" untertitel={`${d.anlagen.length} Anlagen · Erzeugungsleistung ${zahl(z.erzeugungsleistungKw, 1)} kW`} aktion={<Factory aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
            {d.anlagen.length ? (
              <Tabelle kopf={["Anlage", "Art", "Leistung", "Nutzung", "Eigentümer", "Status"]}>
                {d.anlagen.map((a) => (
                  <tr key={a.id}>
                    <td className={zelle}>{a.bezeichnung}{a.haushalt ? <span className="block text-[12.5px] text-ink-500">Haushalt (§ 69: 30 kW)</span> : null}</td>
                    <td className={zelle}>{ANLAGE_ARTEN[a.art]}</td>
                    <td className={`${zelle} ov-num`}>{a.engpassleistungKw ? `${zahl(a.engpassleistungKw, 2)} kW` : a.kwp ? `${zahl(a.kwp, 2)} kWp` : "–"}</td>
                    <td className={zelle}>{NUTZUNGSMODELLE[a.nutzungsmodell]}</td>
                    <td className={zelle}>{d.mitglieder.find((m) => m.id === a.eigentuemerMitgliedId)?.name || a.betreiber || "–"}</td>
                    <td className={zelle}>{a.status}</td>
                  </tr>
                ))}
              </Tabelle>
            ) : <p className="text-[14px] text-ink-500">Noch keine Anlagen.</p>}
            {r.stammdaten >= 2 && <div className="mt-4"><Klappe titel="Anlage erfassen"><AnlageNeu url={url} mitglieder={d.mitglieder} /></Klappe></div>}
          </Karte>
          <Karte titel="Tarife" untertitel="Versioniert – ein neuer gültiger Tarif beendet den bisherigen am Vortag" aktion={<ReceiptText aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
            {d.tarife.length ? (
              <Tabelle kopf={["Tarif", "Gültig", "Bezug / Einspeisung (ct/kWh)", "Gebühren", "Zeitfenster", "Status"]}>
                {d.tarife.map((t) => (
                  <tr key={t.id}>
                    <td className={zelle}>{t.bezeichnung}<span className="block text-[12.5px] text-ink-500">{t.beschluss?.referenz}</span></td>
                    <td className={zelle}>{datum(t.gueltigAb)}–{t.gueltigBis ? datum(t.gueltigBis) : "offen"}</td>
                    <td className={`${zelle} ov-num`}>{zahl(t.bezugspreisCt, 4)} / {zahl(t.einspeisepreisCt, 4)}</td>
                    <td className={`${zelle} text-[13px]`}>Grund {zahl(t.grundgebuehrMonat, 2)} €/Mon. · Beitrag {zahl(t.mitgliedsbeitragJahr, 2)} €/Jahr</td>
                    <td className={`${zelle} text-[13px]`}>{(t.zeitfenster || []).map((f) => `${f.label} ${f.von}–${f.bis}${f.bezugspreisCt !== null && f.bezugspreisCt !== undefined ? ` (${zahl(f.bezugspreisCt, 4)} ct)` : ""}`).join(", ") || "–"}</td>
                    <td className={zelle}><Badge ton={t.status === "aktiv" ? "ok" : t.status === "entwurf" ? "info" : "neutral"}>{TARIF_STATUS[t.status]}</Badge></td>
                  </tr>
                ))}
              </Tabelle>
            ) : <p className="text-[14px] text-ink-500">Noch kein Tarif.</p>}
            {r.tarife >= 1 && <div className="mt-4"><Klappe titel="Neuer Tarif"><TarifNeu url={url} vorlage={g.tarifAktuell} darfBeschluss={r.tarife >= 2} /></Klappe></div>}
          </Karte>
          {g.verteilmodell === "statisch" && (
            <Karte titel="Verteilschlüssel (statisch)">
              {d.verteilschluessel.map((v) => <p key={v.id} className="text-[14px] text-ink-700">ab {datum(v.gueltigAb)}: {v.positionen.length} Positionen, Summe {zahl(v.summePct, 1)} % · {v.status}</p>)}
              {!d.verteilschluessel.length && <p className="text-[14px] text-ink-500">Noch kein Verteilschlüssel – Änderungen sendet WP2 per EC_PRT_CHANGE.</p>}
            </Karte>
          )}
        </>
      )}
    </div>
  );
}
