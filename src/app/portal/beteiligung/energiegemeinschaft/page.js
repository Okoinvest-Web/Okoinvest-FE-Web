// /portal/beteiligung/energiegemeinschaft – Teilnahme an einer Energiegemeinschaft (AT EEG/BEG, DE Energy Sharing § 42c EnWG,
// CH LEG/ZEV): Stammdaten mit Zählpunkt bzw. Marktlokation, Auswahl der Gemeinschaft im Netzgebiet, Status der Anmeldung,
// Verteilschlüssel, monatliche Abrechnung bzw. Gutschrift (PDF), Kündigung.

import Link from "next/link";
import { ArrowRight, Info, Receipt, Users, Zap } from "lucide-react";
import Begriff from "@/components/Portal/Bedienung/Begriff";
import { Angaben, Badge, Hinweis, Karte, Leer, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { EgFormular } from "@/components/Portal/Fach/Beteiligung";
import { EgBeitritt, EgKuendigen } from "@/components/Portal/Mitglied/Portal";
import { PdfLink } from "@/components/Portal/Mitglied/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { mitgliedBackend } from "@/lib/plattform/backend/mitglied";
import { GEMEINSCHAFT_STATUS, TEILNAHME_STATUS, VERTEILSCHLUESSEL } from "@/lib/plattform/mitglied/gemeinschaft";
import { datum, eur } from "@/lib/plattform/format";

export const metadata = { title: "Energiegemeinschaft" };
const kwh = (x) => `${Number(x || 0).toLocaleString("de-DE", { maximumFractionDigits: 1 })} kWh`;

export default async function EnergiegemeinschaftSeite() {
  const n = await portalNutzer({ rollen: ["mitglied"] });
  const d = await laden(() => mitgliedBackend().mgUebersicht(n));
  const { stamm, gemeinschaften, teilnahmen, abrechnungen } = d.eg;
  const laufend = teilnahmen.filter((t) => ["beantragt", "angemeldet", "aktiv"].includes(t.status));
  const offene = gemeinschaften.filter((g) => !laufend.some((t) => t.egId === g.id));
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Mitglied · Energiegemeinschaft" titel="Strom aus der Nachbarschaft" text="Teilnahmedaten, Anmeldung beim Netzbetreiber, Verteilschlüssel und Ihre monatliche Abrechnung." />
      <Hinweis ton="info" icon={Info} titel="Ihre Energiegemeinschaft hat ein neues Zuhause">
        Für Gemeinschaften in Österreich finden Sie Status je Zählpunkt, Gemeinschaftsstrom, Preisblatt und Belege jetzt unter „Energiegemeinschaft“. Die Angaben auf dieser Seite bleiben bis zur Umstellung sichtbar.{" "}
        <Link href="/portal/eg" className="inline-flex items-center gap-1 font-semibold text-ov-700 hover:text-ov-800">Zur neuen Übersicht<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
      </Hinweis>

      {laufend.map((t) => {
        const g = gemeinschaften.find((x) => x.id === t.egId);
        return (
          <Karte key={t.id} titel={<span className="inline-flex flex-wrap items-center gap-2">{t.egName} <Badge ton={TEILNAHME_STATUS[t.status]?.ton}>{t.statusLabel}</Badge></span>} untertitel={g ? `${g.formLabel} · ${g.netzbetreiber}` : ""} aktion={<EgKuendigen t={t} />}>
            <div className="space-y-4">
              {t.status === "angemeldet" && g?.land === "AT" && <Hinweis ton="warn">Bitte bestätigen Sie im Webportal Ihres Netzbetreibers die Freigabe Ihrer Viertelstundenwerte für die Gemeinschaft (Opt-in). Danach wird die Teilnahme aktiv.</Hinweis>}
              {t.bis && <Hinweis ton="neutral">Die Teilnahme endet zum {datum(t.bis)}.</Hinweis>}
              <Angaben spalten={3} items={[
                { label: "Zählpunkt bzw. Marktlokation", wert: t.stamm?.zaehlpunkt || t.stamm?.maloId },
                { label: "Teilnahme als", wert: t.stamm?.rolle === "beides" ? "Prosumer (Bezug und Einspeisung)" : t.stamm?.rolle === "einspeisung" ? "Erzeuger" : "Verbraucher" },
                { label: "Aktiv seit", wert: t.ab ? datum(t.ab) : "–" },
                { label: "Preis Bezug aus der Gemeinschaft", wert: g ? `${String(g.tarifBezugCt).replace(".", ",")} ${g.waehrung.ct}/kWh` : "" },
                { label: "Preis Einspeisung", wert: g ? `${String(g.tarifEinspeisungCt).replace(".", ",")} ${g.waehrung.ct}/kWh` : "" },
                { label: "Verteilschlüssel", wert: g ? `${VERTEILSCHLUESSEL[g.verteilschluessel]?.label}${t.anteilPct ? ` (${t.anteilPct} %)` : ""}` : "" },
                { label: "Netzentgelt", wert: g?.rabatt?.label },
              ]} />
              {g && <p className="text-[13px] leading-relaxed text-ink-500">{g.schluesselText}</p>}
            </div>
          </Karte>
        );
      })}

      <Karte titel="Abrechnungen" untertitel="Monatlich: Bezug aus der Gemeinschaft, Gutschrift für eingespeisten Strom, Saldo" aktion={<Receipt aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        {abrechnungen.length ? (
          <Tabelle kopf={["Monat", "Verbrauch", "Aus der Gemeinschaft", "Deckung", "Eingespeist", "Saldo", "Vorteil (geschätzt)", ""]}>
            {abrechnungen.map((a) => (
              <tr key={a.id}>
                <td className={zelle}>{a.monat.split("-").reverse().join("/")}{a.geschaetzt && <span className="ml-1 text-[12px] text-ink-500">(geschätzt)</span>}</td>
                <td className={`${zelle} ov-num`}>{kwh(a.verbrauchKwh)}</td>
                <td className={`${zelle} ov-num`}>{kwh(a.bezugGemeinschaftKwh)}</td>
                <td className={`${zelle} ov-num`}>{String(a.deckungPct).replace(".", ",")} %</td>
                <td className={`${zelle} ov-num`}>{a.einspeisungGemeinschaftKwh ? kwh(a.einspeisungGemeinschaftKwh) : "–"}</td>
                <td className={`${zelle} ov-num font-semibold`}>{eur(a.saldoEur)}</td>
                <td className={`${zelle} ov-num`}>{eur(a.ersparnisEur)}</td>
                <td className={zelle}><PdfLink href={`/api/portal/mitglied/pdf?art=eg&id=${a.id}`}>PDF</PdfLink></td>
              </tr>
            ))}
          </Tabelle>
        ) : (
          <Leer icon={Receipt} titel="Noch keine Abrechnung" text="Die erste Abrechnung erhalten Sie nach dem ersten vollen Monat Ihrer aktiven Teilnahme." />
        )}
      </Karte>

      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Gemeinschaften in Ihrer Region" aktion={<Users aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          {offene.length ? (
            <ul className="space-y-4">
              {offene.map((g) => (
                <li key={g.id} className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200/80">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">{g.name} <Badge ton={GEMEINSCHAFT_STATUS[g.status]?.ton}>{g.statusLabel}</Badge></p>
                  <p className="mt-1 text-[13.5px] text-ink-600">{g.formLabel} · {g.gebiet || g.netzbetreiber} · Bezug {String(g.tarifBezugCt).replace(".", ",")} {g.waehrung.ct}/kWh, Einspeisung {String(g.tarifEinspeisungCt).replace(".", ",")} {g.waehrung.ct}/kWh{g.grundgebuehrMonat ? `, Grundgebühr ${eur(g.grundgebuehrMonat)}/Monat` : ""}</p>
                  <div className="mt-3"><EgBeitritt eg={g} /></div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-500">{gemeinschaften.length ? "Sie nehmen an allen verfügbaren Gemeinschaften teil." : "Derzeit ist keine Gemeinschaft hinterlegt. Speichern Sie Ihre Teilnahmedaten – wir melden uns, sobald eine Gemeinschaft in Ihrem Netzgebiet startet."}</p>
          )}
        </Karte>
        <Karte titel="Ihre Teilnahmedaten" untertitel="Teilnahme mit Zählpunkt bzw. Marktlokation" aktion={<Zap aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          <p className="mb-4 text-[14px] leading-relaxed text-ink-600">
            Österreich: <Begriff id="eeg-gemeinschaft">Erneuerbare-Energie-Gemeinschaft</Begriff> bzw. <Begriff id="buergerenergiegemeinschaft">Bürgerenergiegemeinschaft</Begriff> mit <Begriff id="zaehlpunkt">Zählpunktnummer</Begriff>. Deutschland: <Begriff id="energy-sharing">Energy Sharing</Begriff> mit <Begriff id="marktlokation">Marktlokations-ID</Begriff>. Schweiz: <Begriff id="leg">LEG</Begriff> bzw. <Begriff id="zev">ZEV</Begriff>.
          </p>
          {laufend.length > 0 && <Hinweis ton="neutral" className="mb-4">Änderungen gelten für neue Beitritte; für eine laufende Teilnahme melden Sie Änderungen bitte über Nachrichten.</Hinweis>}
          <EgFormular eg={stamm} />
        </Karte>
      </div>
    </div>
  );
}
