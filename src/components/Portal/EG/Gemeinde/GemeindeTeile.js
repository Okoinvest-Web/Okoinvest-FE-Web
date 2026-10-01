// Gemeinde-Sicht Energiegemeinschaft (WP6, Fachkonzept 6.2 Nr. 8; Marktanalyse P2 Nr. 16): Sammelansicht der
// Gemeindegebäude, Sozialquote nach § 68 Abs. 6 ElWG (mindestens 10 % der Gemeinde-Erzeugung für schutzbedürftige
// Haushalte) und Bürgerbeteiligung – über andere Mitglieder nur Summen, keine Namen. Server- und Client-tauglich.

import { HeartHandshake, Info, Users } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Badge, Tabelle, zelle } from "@/components/Portal/ui";
import { ct, kwh, pct, zpKurz } from "@/components/Portal/EG/Mitglied/format";

export function SozialquoteMonitor({ sq }) {
  const ist = sq.quotePct;
  const skala = Math.max(20, Math.ceil(((ist || 0) + 5) / 10) * 10);
  const ton = sq.status === "erfuellt" ? "ok" : sq.status === "unter" ? "warn" : "neutral";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy-950 text-ov-300"><HeartHandshake aria-hidden="true" className="h-5 w-5" /></span>
          <div>
            <p className="font-display text-[18px] font-bold text-ink-900">{ist === null ? "Noch keine Werte" : `${pct(ist, 1)} für schutzbedürftige Haushalte`}</p>
            <p className="mt-0.5 text-[13.5px] text-ink-600">Mindestens {sq.sollPct} % der von der Gemeinde für die gemeinsame Nutzung erzeugten Menge (ElWG § 68 Abs. 6)</p>
          </div>
        </div>
        <Badge ton={ton}>{sq.status === "erfuellt" ? "erfüllt" : sq.status === "unter" ? "unter Mindestanteil" : "keine Daten"}</Badge>
      </div>
      <div>
        <div className="relative h-4 rounded-full bg-ink-100" role="img" aria-label={`Sozialquote ${ist === null ? "ohne Daten" : `${ist} Prozent`}, Mindestanteil ${sq.sollPct} Prozent`}>
          {ist !== null && <div className={cn("h-4 rounded-full", sq.status === "erfuellt" ? "bg-ov-500" : "bg-sun-400")} style={{ width: `${Math.min(100, (ist / skala) * 100)}%` }} />}
          <span aria-hidden="true" className="absolute -top-1 h-6 w-0.5 rounded-full bg-navy-950" style={{ left: `${(sq.sollPct / skala) * 100}%` }} />
        </div>
        <div aria-hidden="true" className="mt-1 flex justify-between text-[11.5px] text-ink-400"><span>0 %</span><span style={{ marginLeft: `${(sq.sollPct / skala) * 100 - 8}%` }}>Soll {sq.sollPct} %</span><span>{skala} %</span></div>
      </div>
      <p className="text-[14px] leading-relaxed text-ink-700">{sq.text}</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Wert label="Gemeinde-Erzeugung (Jahr)" wert={kwh(sq.erzeugungKwh)} />
        <Wert label="davon an Schutzbedürftige" wert={kwh(sq.anSchutzbeduerftigeKwh)} />
        <Wert label="Schutzbedürftige Haushalte" wert={sq.schutzbeduerftigeHaushalte} />
        <Wert label="Sozialkontingent im Preisblatt" wert={sq.kontingentPct ? pct(sq.kontingentPct) : "keines"} />
      </dl>
      {sq.hinweise.length > 0 && (
        <ul className="space-y-1.5 rounded-2xl bg-sand-50 p-4 text-[13.5px] leading-relaxed text-ink-700 ring-1 ring-ink-200/70">
          {sq.hinweise.map((h) => <li key={h} className="flex gap-2"><Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />{h}</li>)}
        </ul>
      )}
      <p className="text-[12.5px] leading-relaxed text-ink-500">Näherung aus den Periodenwerten des Netzbetreibers: Eigendeckung der schutzbedürftigen Haushalte anteilig zur Gemeinde-Erzeugung. Steuerbar über Sozialtarif bzw. Kontingent und die Teilnahmefaktoren. Rechtliche Auslegung der Quote (zu bestätigen).</p>
    </div>
  );
}

export function GebaeudeTabelle({ gebaeude = [] }) {
  return (
    <Tabelle kopf={["Gebäude / Anlage", "Zählpunkt", "Status", "Jahr: Verbrauch bzw. Erzeugung", "aus der Gemeinschaft", "Ersparnis (Schätzung)"]}>
      {gebaeude.map((t) => (
        <tr key={t.id}>
          <td className={zelle}><span className="font-semibold text-ink-900">{t.bezeichnung || t.richtungLabel}</span><span className="block text-[12.5px] text-ink-500">{t.richtungLabel}</span></td>
          <td className={cn(zelle, "font-mono text-[13px]")}>{zpKurz(t.zaehlpunktnummer)}</td>
          <td className={zelle}><Badge ton={t.ton}>{t.statusLabel}</Badge></td>
          <td className={cn(zelle, "ov-num")}>{t.jahr ? kwh(t.richtung === "erzeugung" ? t.jahr.erzeugungKwh : t.jahr.verbrauchKwh) : "–"}</td>
          <td className={cn(zelle, "ov-num")}>{t.jahr ? (t.richtung === "erzeugung" ? `${kwh(t.jahr.eingebrachtKwh)} eingebracht` : `${kwh(t.jahr.eigendeckungKwh)} (${pct(t.jahr.anteilPct)})`) : "–"}</td>
          <td className={cn(zelle, "ov-num")}>{t.jahr && t.richtung !== "erzeugung" ? `${t.jahr.ersparnis.gesamtEur.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "–"}</td>
        </tr>
      ))}
    </Tabelle>
  );
}

export function Beteiligung({ b, tarif }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Wert label="Aktive Mitglieder" wert={b.mitgliederAktiv} gross />
        <Wert label="Offene Beitrittsanträge" wert={b.antraegeOffen} gross />
        <Wert label="Zustimmungen offen" wert={b.zustimmungOffen} gross />
        <Wert label="Interessierte im Gebiet" wert={b.interessenImGebiet} gross />
      </dl>
      {b.nachArt.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink-700"><Users aria-hidden="true" className="h-4 w-4 text-ov-600" /> Wer mitmacht</p>
          <div className="flex h-3.5 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
            {b.nachArt.map((a, i) => <span key={a.art} className={["bg-ov-500", "bg-navy-600", "bg-ov-300", "bg-navy-300", "bg-sun-400", "bg-ink-400", "bg-ov-700"][i % 7]} style={{ width: `${(a.anzahl / b.mitgliederAktiv) * 100}%` }} />)}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-600">{b.nachArt.map((a) => <li key={a.art}>{a.label}: <span className="ov-num font-semibold text-ink-800">{a.anzahl}</span></li>)}</ul>
        </div>
      )}
      {tarif && <p className="text-[13px] text-ink-600">Preisblatt „{tarif.bezeichnung}“: Bezug {ct(tarif.bezugspreisCt)}, Einspeisung {ct(tarif.einspeisepreisCt)} je kWh{tarif.sozialtarif?.bezugspreisCt ? ` · Sozialtarif ${ct(tarif.sozialtarif.bezugspreisCt)}` : ""}. Bei Gemeinden muss der Preis fremdüblich sein (Beihilferecht) – bitte dokumentieren.</p>}
    </div>
  );
}

function Wert({ label, wert, gross = false }) {
  return (
    <div className="rounded-2xl bg-sand-50 p-3.5 ring-1 ring-ink-200/60">
      <dt className="text-[12.5px] text-ink-500">{label}</dt>
      <dd className={cn("ov-num mt-0.5 font-display font-extrabold text-ink-900", gross ? "text-[26px]" : "text-[18px]")}>{wert}</dd>
    </div>
  );
}
