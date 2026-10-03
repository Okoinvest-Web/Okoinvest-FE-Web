// /portal/eg/gruendung – Gemeinschaft gründen bzw. zu ÖkoInvest wechseln (WP5, Auftraggeber): eigene Gründungsaufträge
// mit Fortschritt und nächsten Fristen, Pakete, Förder-Check. Rechte: angemeldet; sichtbar sind nur eigene Aufträge bzw. die
// der Gemeinschaften, in denen das Konto Vorstand ist (grAuftraege).

import Link from "next/link";
import { ArrowRight, ClipboardList, HandCoins, Repeat, Rocket } from "lucide-react";
import { Badge, Karte, Leer, PfeilLink, QualitaetsBalken, SeitenKopf } from "@/components/Portal/ui";
import { FristBadge, datumDe, eurDe } from "@/components/Portal/EG/Gruendung/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { GR_PAKETE } from "@/lib/plattform/eg/gruendung";

export const metadata = { title: "Gemeinschaft gründen" };
const ICON = { check: ClipboardList, gruendung: Rocket, komplett: Rocket, wechsel: Repeat };

export default async function Seite() {
  const n = await portalNutzer();
  const d = await laden(() => egBackend().grAuftraege(n, {}));
  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Energiegemeinschaften"
        titel="Gemeinschaft gründen oder wechseln"
        text="Von der Machbarkeit über Statuten, Vereinsbehörde, Finanzamt, Marktpartner und Netzbetreiber bis zur ersten Anmeldung – oder der Wechsel Ihrer bestehenden Gemeinschaft ohne Neuanmeldung der Zählpunkte."
        aktionen={<Link href="/portal/eg/gruendung/neu" className="inline-flex h-11 items-center gap-2 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white hover:bg-ov-700">Anfrage starten<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>}
      />
      {d.auftraege.length ? (
        <Karte titel="Ihre Aufträge">
          <ul className="divide-y divide-ink-100">
            {d.auftraege.map((a) => (
              <li key={a.id} className="py-4 first:pt-0 last:pb-0">
                <Link href={`/portal/eg/gruendung/${a.id}`} className="group block">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-[16.5px] font-bold text-ink-900 group-hover:text-ov-800">{a.arbeitsname}</p>
                      <p className="text-[13px] text-ink-500">{a.paketLabel} · {a.modellKurz} · {a.plz} {a.ort} · angefragt am {datumDe(a.erstelltAm)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2"><Badge ton={a.ton}>{a.statusLabel}</Badge>{a.angebot && a.status === "angebot" && <Badge ton="info">Angebot {eurDe(a.angebot.betragNetto)} netto</Badge>}</div>
                  </div>
                  {a.auftragAm && <div className="mt-3 max-w-md"><QualitaetsBalken quote={a.fortschritt.prozent} label="Pflichtschritte erledigt" klein /></div>}
                  {a.fortschritt.naechste.length > 0 && a.auftragAm && (
                    <ul className="mt-2 flex flex-wrap gap-2 text-[12.5px] text-ink-600">
                      {a.fortschritt.naechste.map((s) => <li key={s.schluessel} className="flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1">{s.label}<FristBadge frist={s.frist} ampel={s.ampel} /></li>)}
                    </ul>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Karte>
      ) : (
        <Leer icon={Rocket} titel="Noch kein Auftrag" text="Erzählen Sie uns von Ihrer Idee – wir prüfen Netzgebiet, Nahebereich und Wirtschaftlichkeit und machen Ihnen ein Angebot." aktion={<PfeilLink href="/portal/eg/gruendung/neu">Anfrage starten</PfeilLink>} />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(GR_PAKETE).map(([k, p]) => {
          const I = ICON[k];
          return (
            <Karte key={k} titel={p.label} aktion={<I aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
              <p className="text-[14px] leading-relaxed text-ink-600">{p.text}</p>
              <ul className="mt-3 list-disc space-y-0.5 pl-5 text-[13.5px] text-ink-700">{p.leistungen.map((l) => <li key={l}>{l}</li>)}</ul>
              <PfeilLink href={`/portal/eg/gruendung/neu?paket=${k}`} className="mt-3">Dieses Paket anfragen</PfeilLink>
            </Karte>
          );
        })}
      </div>
      <Karte titel="Förder-Check" aktion={<HandCoins aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <p className="text-[14px] leading-relaxed text-ink-600">Welche Förderungen kommen für Ihre Anlagen und Ihre Gemeinschaft in Frage? EAG-Investitionszuschuss, Marktprämie, Klima- und Energiefonds und Landesstellen – mit Quellen und Stand.</p>
        <PfeilLink href="/portal/eg/gruendung/foerdercheck" className="mt-3">Zum Förder-Check</PfeilLink>
      </Karte>
    </div>
  );
}
