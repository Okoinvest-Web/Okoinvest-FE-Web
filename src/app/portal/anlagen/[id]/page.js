import Link from "next/link";
import {
  Activity, ArrowDownToLine, ArrowUpFromLine, BatteryCharging, Cpu, Download, FileText, Gauge, Gauge as Zaehler, Leaf, ScrollText, Settings2, Sun, TriangleAlert, Wrench,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Angaben, Hinweis, Karte, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import Reiter from "@/components/Portal/Anlagen/Reiter";
import LiveKopf from "@/components/Portal/Anlagen/LiveKopf";
import Verlauf from "@/components/Portal/Anlagen/Verlauf";
import StoerungenListe from "@/components/Portal/Anlagen/StoerungenListe";
import { AmpelBadge, Wert, eur0, pct } from "@/components/Portal/Anlagen/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { anlageMitStatus } from "@/lib/plattform/messdaten/auswertung";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";
import { messdaten } from "@/lib/plattform/messdaten";
import { LASTPROFILE, NETZSTROM_CT, kw, kwh, kwpText, prognoseMonatKwh, tonnen } from "@/lib/plattform/anlagen";
import { LAENDER } from "@/lib/plattform/konstanten";
import { datum } from "@/lib/plattform/format";
import { darfLesen } from "@/lib/plattform/rechte";

export const metadata = { title: "Anlage" };

const TAB_IDS = ["uebersicht", "zaehler", "stoerungen", "technik", "vertrag"];

function sollBisHeute(a) {
  const j = new Date();
  let s = 0;
  for (let m = 0; m < j.getMonth(); m++) s += prognoseMonatKwh(a, m, j.getFullYear());
  const tage = new Date(j.getFullYear(), j.getMonth() + 1, 0).getDate();
  return s + prognoseMonatKwh(a, j.getMonth(), j.getFullYear()) * (j.getDate() / tage);
}

export default async function AnlageSeite({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const n = await portalNutzer();
  const a = await laden(() => anlageMitStatus(n, id));
  const tab = TAB_IDS.includes(sp?.tab) ? sp.tab : "uebersicht";
  const basis = `/portal/anlagen/${a.id}`;
  const backoffice = a.meinZugriff === "backoffice";
  const offene = (a.stoerungen || []).filter((s) => s.status !== "behoben");
  const tabs = [
    { id: "uebersicht", label: "Übersicht", icon: Activity },
    { id: "zaehler", label: "Zählerstände", icon: Zaehler },
    { id: "stoerungen", label: "Störungen", icon: TriangleAlert, zaehler: offene.length },
    { id: "technik", label: "Technik & Wartung", icon: Wrench },
    { id: "vertrag", label: "Vertrag & Kosten", icon: FileText },
  ];

  let inhalt = null;
  if (tab === "zaehler") {
    const b = anlagenBackend();
    const [abrechnung, monitoring] = await Promise.all([laden(() => b.zaehlerMonatswerte(n, a.id)), messdaten().zaehlerMonat(a, { monate: 13 }).catch(() => [])]);
    inhalt = (
      <div className="space-y-6">
        <Hinweis ton="info" icon={Gauge} titel="Abrechnung nur über geeichte Zähler">
          Grundlage Ihrer Contracting-Abrechnung sind ausschließlich die Monatswerte der geeichten Messstellen bzw. des Smart-Meter-Gateways (Messstellenbetreiber). Die Live-Werte per MQTT dienen der Überwachung und können davon geringfügig abweichen.
        </Hinweis>
        <Karte
          titel="Monatswerte für die Abrechnung"
          untertitel="Zählerstände am Monatsende je Register (OBIS), Menge = Differenz zum Vormonat"
          aktion={<a href={`/api/portal/anlagen/${a.id}/zaehler?format=csv&art=abrechnung`} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800"><Download aria-hidden="true" className="h-4 w-4" /> CSV</a>}
        >
          {abrechnung.length ? (
            <Tabelle kopf={["Monat", "Zähler", "Register", "Zählerstand", "Menge", "Quelle"]}>
              {abrechnung.slice(0, 60).map((z, i) => (
                <tr key={`${z.monat}-${z.messpunktId}-${z.register}-${i}`}>
                  <td className={zelle}>{z.monat.slice(5)}/{z.monat.slice(0, 4)}</td>
                  <td className={zelle}><span className="font-medium text-ink-900">{z.bezeichnung}</span><br /><span className="text-[12.5px] text-ink-500">{z.zaehlernummer}</span></td>
                  <td className={zelle}>{z.register} {z.registerLabel}</td>
                  <td className={`${zelle} ov-num text-right`}>{Number(z.stand).toLocaleString("de-DE")} kWh</td>
                  <td className={`${zelle} ov-num text-right`}>{z.menge == null ? "–" : `${Number(z.menge).toLocaleString("de-DE")} kWh`}</td>
                  <td className={`${zelle} text-[12.5px] text-ink-500`}>{z.quelle}{z.geprueft ? " · geprüft" : ""}</td>
                </tr>
              ))}
            </Tabelle>
          ) : (
            <p className="text-[14px] text-ink-500">Noch keine Monatswerte vorhanden.</p>
          )}
        </Karte>
        <Karte
          titel="Monitoring-Zählerstände (MQTT)"
          untertitel="Stände zu Monatsbeginn und -ende aus den Messwerten des Datenloggers – nicht abrechnungsrelevant"
          aktion={<a href={`/api/portal/anlagen/${a.id}/zaehler?format=csv&art=monitoring`} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800"><Download aria-hidden="true" className="h-4 w-4" /> CSV</a>}
        >
          {monitoring.length ? (
            <Tabelle kopf={["Monat", "Erzeugung (Stand Ende)", "Erzeugung", "Netzbezug", "Einspeisung"]}>
              {[...monitoring].reverse().map((z) => (
                <tr key={z.monat}>
                  <td className={zelle}>{z.monat.slice(5)}/{z.monat.slice(0, 4)}{!z.vollstaendig && <span className="ml-1.5 text-[12px] text-ink-500">(laufend)</span>}</td>
                  <td className={`${zelle} ov-num text-right`}>{Math.round(z.ende.erzeugungKwh).toLocaleString("de-DE")} kWh</td>
                  <td className={`${zelle} ov-num text-right`}>{kwh(z.erzeugungKwh)}</td>
                  <td className={`${zelle} ov-num text-right`}>{kwh(z.netzbezugKwh)}</td>
                  <td className={`${zelle} ov-num text-right`}>{kwh(z.einspeisungKwh)}</td>
                </tr>
              ))}
            </Tabelle>
          ) : (
            <p className="text-[14px] text-ink-500">Keine Monitoring-Werte vorhanden.</p>
          )}
        </Karte>
      </div>
    );
  } else if (tab === "stoerungen") {
    const betrieb = backoffice && darfLesen(n, "anlagen") ? (await anlagenBackend().anlagenKunden(n).catch(() => ({ betrieb: [] }))).betrieb : [];
    inhalt = (
      <div className="space-y-5">
        {!backoffice && (
          <Hinweis ton="neutral" icon={TriangleAlert}>
            Störungen erkennt das Monitoring automatisch (keine Daten, Fehlercode, Leistung deutlich unter Erwartung, unplausible Zählerstände). Der Betrieb von ÖkoInvest quittiert und behebt sie – Sie werden bei neuen und behobenen Störungen benachrichtigt und können Hinweise ergänzen.
          </Hinweis>
        )}
        <StoerungenListe stoerungen={a.stoerungen || []} betrieb={betrieb} leer="Keine Störungen in dieser Auswahl." />
      </div>
    );
  } else if (tab === "technik") {
    inhalt = (
      <div className="space-y-6">
        <Karte titel="Komponenten" untertitel="Wechselrichter, Speicher, Zähler, Datenlogger">
          {a.komponenten?.length ? (
            <Tabelle kopf={["Art", "Hersteller / Modell", "Anzahl", "Leistung", "Seriennummer", "Garantie bis"]}>
              {a.komponenten.map((k) => (
                <tr key={k.id}>
                  <td className={zelle}>{k.artLabel}</td>
                  <td className={zelle}><span className="font-medium text-ink-900">{k.modell || "–"}</span><br /><span className="text-[12.5px] text-ink-500">{k.hersteller}</span>{k.bemerkung && <span className="mt-1 block text-[12.5px] text-ink-600">{k.bemerkung}</span>}</td>
                  <td className={`${zelle} ov-num`}>{k.anzahl}</td>
                  <td className={`${zelle} ov-num`}>{k.kapazitaetKwh ? `${k.kapazitaetKwh.toLocaleString("de-DE")} kWh · ` : ""}{k.leistungKw ? kw(k.leistungKw) : "–"}</td>
                  <td className={`${zelle} text-[13px]`}>{k.seriennummer || "–"}</td>
                  <td className={zelle}>{k.garantieBis ? datum(k.garantieBis) : "–"}</td>
                </tr>
              ))}
            </Tabelle>
          ) : (
            <p className="text-[14px] text-ink-500">Keine Komponenten erfasst.</p>
          )}
        </Karte>
        <Karte titel="Messpunkte & Zähler" untertitel="Abrechnungsrelevant sind nur geeichte Messstellen bzw. Smart-Meter-Gateways">
          {a.messpunkte?.length ? (
            <Tabelle kopf={["Messpunkt", "Zählernummer", "Messstelle", "Abrechnung", "Eichung gültig bis"]}>
              {a.messpunkte.map((m) => (
                <tr key={m.id}>
                  <td className={zelle}><span className="font-medium text-ink-900">{m.bezeichnung}</span><br /><span className="text-[12.5px] text-ink-500">{m.artLabel}</span></td>
                  <td className={`${zelle} text-[13px]`}>{m.zaehlernummer}</td>
                  <td className={`${zelle} text-[13px]`}>{m.messstelleLabel}{m.smgw ? " · SMGW" : ""}{m.msb ? <><br /><span className="text-ink-500">{m.msb}</span></> : null}</td>
                  <td className={zelle}>{m.abrechnungsrelevant ? <span className="rounded-full bg-ov-50 px-2.5 py-1 text-[12px] font-semibold text-ov-800 ring-1 ring-inset ring-ov-200">abrechnungsrelevant</span> : <span className="text-[13px] text-ink-500">Monitoring</span>}</td>
                  <td className={zelle}>{m.eichgueltigBis ? datum(m.eichgueltigBis) : "–"}</td>
                </tr>
              ))}
            </Tabelle>
          ) : (
            <p className="text-[14px] text-ink-500">Keine Messpunkte erfasst.</p>
          )}
        </Karte>
        <Karte titel="Wartungen" untertitel="Geplante und durchgeführte Arbeiten">
          {a.wartungen?.length ? (
            <ol className="space-y-3">
              {a.wartungen.map((w) => (
                <li key={w.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-sand-50 px-4 py-3 ring-1 ring-inset ring-ink-200/60">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{w.artLabel}</p>
                    <p className="text-[13px] text-ink-500">{datum(w.datum)}{w.dienstleister ? ` · ${w.dienstleister}` : ""}{w.naechsteFaelligkeit ? ` · nächste Fälligkeit ${datum(w.naechsteFaelligkeit)}` : ""}</p>
                    {w.bericht && <p className="mt-1 text-[14px] leading-relaxed text-ink-700">{w.bericht}</p>}
                  </div>
                  <span className={w.status === "geplant" ? "rounded-full bg-navy-50 px-2.5 py-1 text-[12px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-100" : "rounded-full bg-ov-50 px-2.5 py-1 text-[12px] font-semibold text-ov-800 ring-1 ring-inset ring-ov-200"}>{w.statusLabel}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[14px] text-ink-500">Keine Wartungen erfasst.</p>
          )}
        </Karte>
      </div>
    );
  } else if (tab === "vertrag") {
    const c = a.vertrag;
    const speicher = a.typ === "speicher";
    inhalt = c ? (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Karte titel="Contracting-Vertrag">
          <Angaben
            items={[
              { label: "Vertragsnummer", wert: c.nummer || "–" },
              { label: "Status", wert: { aktiv: "Aktiv", gekuendigt: "Gekündigt", beendet: "Beendet" }[c.status] || c.status },
              { label: "Beginn", wert: datum(c.beginn) },
              { label: "Laufzeit", wert: `${c.laufzeitJahre} Jahre (bis ${datum(c.ende)})` },
              { label: "Arbeitspreis PV-Strom", wert: speicher && !c.strompreisCt ? "entfällt (Monatsrate)" : `${Number(c.strompreisCt).toLocaleString("de-DE", { minimumFractionDigits: 2 })} ct/kWh netto` },
              { label: "Grundgebühr", wert: `${eur0(c.grundgebuehrMonat)} je Monat netto` },
              { label: "Indexierung", wert: c.indexierungPct ? `${Number(c.indexierungPct).toLocaleString("de-DE")} % p. a.` : "keine" },
              { label: "Kündigungsfrist", wert: `${c.kuendigungsfristMonate} Monate zum Laufzeitende` },
              c.bemerkung && { label: "Hinweis", wert: c.bemerkung, breit: true },
            ]}
          />
        </Karte>
        <Karte titel="Ihre Kosten und Ersparnis" untertitel={`Vergleich mit Netzstrom (Gewerbe, Richtwert ${NETZSTROM_CT.toLocaleString("de-DE")} ct/kWh netto)`}>
          {speicher ? (
            <p className="text-[14.5px] leading-relaxed text-ink-700">
              Beim Speicher-Contracting zahlen Sie eine feste Monatsrate von {eur0(c.grundgebuehrMonat)}. Die Ersparnis entsteht über den geringeren Leistungspreis (gekappte Lastspitzen) und wird mit Ihrer Netzabrechnung ausgewiesen – sie lässt sich aus den Monitoring-Werten nicht verlässlich berechnen.
            </p>
          ) : (
            <div className="-mx-5 overflow-x-auto md:-mx-6">
              <table className="w-full min-w-[420px] text-[14px]">
                <thead>
                  <tr className="border-b border-ink-100 text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                    <th className="px-5 py-2.5 text-left md:px-6" scope="col">Position</th>
                    <th className="px-3 py-2.5 text-right" scope="col">Laufender Monat</th>
                    <th className="px-5 py-2.5 text-right md:px-6" scope="col">Jahr bis heute</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {[
                    ["PV-Strom vor Ort", kwh(a.monat?.eigenverbrauchKwh), kwh(a.jahr?.eigenverbrauchKwh)],
                    ["Arbeitspreis", eur0(a.kosten?.monat?.arbeitEur), eur0(a.kosten?.jahr?.arbeitEur)],
                    ["Grundgebühr", eur0(a.kosten?.monat?.grundEur), eur0(a.kosten?.jahr?.grundEur)],
                    ["Ihre Kosten", eur0(a.kosten?.monat?.gesamtEur), eur0(a.kosten?.jahr?.gesamtEur), true],
                    ["Gleiche Menge aus dem Netz", eur0(a.kosten?.monat?.netzEur), eur0(a.kosten?.jahr?.netzEur)],
                  ].map(([l, m, j, fett]) => (
                    <tr key={l}>
                      <td className={`px-5 py-2.5 md:px-6 ${fett ? "font-semibold text-ink-900" : "text-ink-700"}`}>{l}</td>
                      <td className={`ov-num px-3 py-2.5 text-right ${fett ? "font-semibold" : ""}`}>{m}</td>
                      <td className={`ov-num px-5 py-2.5 text-right md:px-6 ${fett ? "font-semibold" : ""}`}>{j}</td>
                    </tr>
                  ))}
                  <tr className="bg-ov-50">
                    <td className="px-5 py-3 font-bold text-ov-900 md:px-6">Ersparnis</td>
                    <td className="ov-num px-3 py-3 text-right font-bold text-ov-900">{eur0(a.kosten?.monat?.ersparnisEur)}</td>
                    <td className="ov-num px-5 py-3 text-right font-bold text-ov-900 md:px-6">{eur0(a.kosten?.jahr?.ersparnisEur)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">
            Schätzung aus Monitoring-Werten, alle Beträge netto. Maßgeblich ist die Abrechnung auf Basis der geeichten Zähler. Der Vergleichspreis ist ein Richtwert für Neuverträge im Mittelstand; Ihr tatsächlicher Tarif kann abweichen.
          </p>
        </Karte>
      </div>
    ) : (
      <Hinweis ton="neutral" icon={FileText}>Für diese Anlage ist noch kein Contracting-Vertrag hinterlegt.</Hinweis>
    );
  } else {
    const soll = sollBisHeute(a);
    const ist = a.jahr?.erzeugungKwh || 0;
    inhalt = (
      <div className="space-y-6">
        <LiveKopf anlage={{ id: a.id, kwp: a.kwp, speicherKwh: a.speicherKwh, typ: a.typ }} initial={a.live} />
        {a.messfehler && <Hinweis ton="warn" icon={TriangleAlert}>Messdaten derzeit nicht verfügbar: {a.messfehler}</Hinweis>}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <Verlauf anlage={{ id: a.id, kwp: a.kwp, speicherKwh: a.speicherKwh }} />
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {a.kwp > 0 ? (
                <>
                  <Wert icon={Sun} label="Erzeugung heute" wert={kwh(a.heute?.erzeugungKwh)} />
                  <Wert icon={Sun} label="Erzeugung Monat" wert={kwh(a.monat?.erzeugungKwh)} />
                  <Wert icon={Gauge} label="Eigenverbrauch Jahr" wert={pct(a.quotenJahr?.eigenverbrauchsquote)} hinweis="Anteil PV vor Ort" />
                  <Wert icon={BatteryCharging} label="Autarkie Jahr" wert={pct(a.quotenJahr?.autarkie)} hinweis="Verbrauch aus PV" />
                </>
              ) : (
                <>
                  <Wert icon={BatteryCharging} label="Entladen heute" wert={kwh(a.heute?.entladenKwh)} />
                  <Wert icon={BatteryCharging} label="Geladen heute" wert={kwh(a.heute?.ladenKwh)} />
                </>
              )}
              <Wert icon={ArrowDownToLine} label="Netzbezug Jahr" wert={kwh(a.jahr?.netzbezugKwh)} />
              <Wert icon={ArrowUpFromLine} label="Einspeisung Jahr" wert={kwh(a.jahr?.einspeisungKwh)} />
            </div>
            {a.kwp > 0 && (
              <Karte titel="Soll-Ist im laufenden Jahr" innen="p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[12.5px] text-ink-500">Ist / Soll</p>
                    <p className={`ov-num font-display text-[30px] font-extrabold leading-none ${soll && ist / soll < 0.9 ? "text-red-700" : "text-ov-700"}`}>{pct(soll ? ist / soll : null)}</p>
                  </div>
                  <p className="text-right text-[13px] text-ink-600">Ist <span className="ov-num font-semibold text-ink-900">{kwh(ist)}</span><br />Soll <span className="ov-num font-semibold text-ink-900">{kwh(soll)}</span></p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={120} aria-valuenow={soll ? Math.round((ist / soll) * 100) : 0} aria-label="Ist im Verhältnis zum Soll">
                  <div className={`h-2 rounded-full ${soll && ist / soll < 0.9 ? "bg-red-500" : "bg-ov-500"}`} style={{ width: `${Math.min(100, soll ? (ist / soll) * 100 : 0)}%` }} />
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">Soll aus Region ({a.bundesland}), {kwpText(a.kwp)}, Bauart und Alterung; Monatsverteilung nach PVGIS. CO₂ vermieden: <span className="font-semibold text-ink-700">{tonnen(a.co2JahrKg)}</span>.</p>
              </Karte>
            )}
            <Karte titel="Offene Störungen" innen="p-5" aktion={<Link href={`${basis}?tab=stoerungen`} className="text-[14px] font-semibold text-ov-700 hover:text-ov-800">Alle</Link>}>
              {offene.length ? (
                <ul className="space-y-2">
                  {offene.slice(0, 4).map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-[14px]">
                      <span className="min-w-0 truncate text-ink-800">{s.titel}</span>
                      <span className="shrink-0 text-[12.5px] text-ink-500">{s.schwereLabel} · {s.statusLabel}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-ink-500">Keine offenen Störungen.</p>
              )}
            </Karte>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeitenKopf
        eyebrow={`${a.typLabel} · ${a.ort || a.bundesland}, ${LAENDER[a.land] || a.land}`}
        titel={a.name}
        text={[a.kwp ? kwpText(a.kwp) : null, a.speicherKwh ? `Speicher ${a.speicherKwh.toLocaleString("de-DE")} kWh / ${kw(a.speicherKw)}` : null, a.inbetriebnahme ? `in Betrieb seit ${datum(a.inbetriebnahme)}` : a.statusLabel, LASTPROFILE[a.lastprofil] ? `Verbraucher: ${LASTPROFILE[a.lastprofil]}` : null].filter(Boolean).join(" · ")}
        aktionen={
          <>
            <AmpelBadge id={a.ampel.id} grund={a.ampel.grund} />
            {backoffice && a.darfBearbeiten && <Button href={`/portal/admin/anlagen/${a.id}`} size="sm" variant="secondary" icon={Settings2}>Stammdaten & Geräte</Button>}
          </>
        }
      >
        {(a.organisation || (backoffice && a.kunde)) && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[13.5px] text-ink-500">
            <Cpu aria-hidden="true" className="h-4 w-4" />
            {a.organisation?.name}
            {backoffice && a.kunde ? ` · Ansprechpartner: ${a.kunde.name}` : ""}
            <span className="inline-flex items-center gap-1"><ScrollText aria-hidden="true" className="h-4 w-4" /> {a.id}</span>
            <span className="inline-flex items-center gap-1"><Leaf aria-hidden="true" className="h-4 w-4" /> {tonnen(a.co2JahrKg)} CO₂ vermieden (Jahr)</span>
          </p>
        )}
      </SeitenKopf>
      <Reiter basis={basis} aktiv={tab} tabs={tabs} />
      {inhalt}
    </>
  );
}
