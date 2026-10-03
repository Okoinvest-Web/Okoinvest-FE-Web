import { notFound } from "next/navigation";
import { Angaben, Badge, Karte, SeitenKopf } from "@/components/Portal/ui";
import { Fortschritt, KycStatusBadge, RisikoBadge } from "@/components/Portal/Kyc/teile";
import CompliancePruefung from "@/components/Portal/Kyc/CompliancePruefung";
import IdentPruefung from "@/components/Portal/Kyc/IdentPruefung"; // Eigene Identifizierung: MRZ, Weg, Videoidentifizierung
import RegisterSuche from "@/components/Portal/Dienste/RegisterSuche"; // Dienste: Registerauszug im KYC-Fall hinterlegen
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { kycBackend } from "@/lib/plattform/backend/kyc";
import { unterrollen } from "@/lib/plattform/rechte";
import { datum, datumZeit } from "@/lib/plattform/format";
import { KYC_KONTROLLE_ARTEN, KYC_MITTEL_QUELLEN, KYC_TICKETS, kycLand, kycStatusLabel } from "@/lib/plattform/kyc";

export const metadata = { title: "KYC-Fall" };

export default async function ComplianceFallSeite({ params }) {
  const n = await portalNutzer({ admin: true });
  if (!unterrollen(n).includes("compliance")) notFound(); // Personendaten und Unterlagen nur für die Compliance
  const { id } = await params;
  const f = await laden(() => kycBackend().kycFallDetail(n, id));
  const p = f.person || {};
  const adr = p.adresse || {};
  const unternehmen = f.kontotyp === "unternehmen";

  return (
    <>
      <SeitenKopf
        eyebrow={`Compliance · ${unternehmen ? "KYB" : "KYC"} · ${f.id}`}
        titel={f.bezeichnung}
        text={`Konto: ${f.konto?.name || "–"} (${f.konto?.email || "–"}) · Rollen: ${(f.konto?.rollen || []).join(", ")}`}
        aktionen={
          <div className="flex flex-wrap gap-2">
            <KycStatusBadge status={f.status} intern />
            <RisikoBadge stufe={f.risiko} />
            {f.vierAugen && <Badge ton="info">Vier-Augen</Badge>}
            {f.investorTypLabel && <Badge>{f.investorTypLabel}</Badge>}
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Karte titel={unternehmen ? "Handelnde Person" : "Person"}>
            <Angaben
              items={[
                { label: "Name", wert: [p.vorname, p.nachname].filter(Boolean).join(" ") },
                { label: "Geburtsdatum / -ort", wert: `${datum(p.geburtsdatum)} · ${p.geburtsort || "–"}` },
                { label: "Staatsangehörigkeit", wert: kycLand(p.staatsangehoerigkeit) },
                { label: "Anschrift", wert: `${adr.strasse || ""}, ${adr.plz || ""} ${adr.ort || ""}, ${kycLand(adr.land)}` },
                { label: "Ausweis", wert: `${p.ausweis?.art || "–"} · Nr. ${p.ausweis?.nummer || "–"} · ${p.ausweis?.behoerde || "–"}` },
                { label: "Gültig bis", wert: datum(p.ausweis?.gueltigBis) },
                { label: "PEP-Selbstauskunft", wert: f.pep?.istPep ? `Ja – ${f.pep.funktion}` : f.pep?.naheStehend ? `Nahestehend – ${f.pep.funktion}` : "Nein" },
                { label: "Steuerliche Ansässigkeit", wert: f.steuer?.land ? `${kycLand(f.steuer.land)}${f.steuer.steuerId ? ` · ${f.steuer.steuerId}` : ""}` : "" },
                f.mittelherkunft?.ticket && { label: "Ticket / Mittelherkunft", wert: `${KYC_TICKETS[f.mittelherkunft.ticket]?.label} · ${(f.mittelherkunft.quellen || []).map((q) => KYC_MITTEL_QUELLEN[q]).join(", ")}${f.mittelherkunft.text ? ` – ${f.mittelherkunft.text}` : ""}`, breit: true },
              ]}
            />
          </Karte>
          {unternehmen && (
            <Karte titel="Unternehmen, wirtschaftlich Berechtigte, Vertretung">
              <Angaben
                items={[
                  { label: "Firma", wert: `${f.firma?.name || "–"} (${f.firma?.rechtsform || "–"})` },
                  { label: "Register", wert: `${f.firma?.registernummer || "–"} · ${f.firma?.registergericht || ""} · ${kycLand(f.firma?.land)}` },
                  { label: "Sitz", wert: f.firma?.sitz },
                  { label: "Struktur", wert: [f.firma?.mehrstufig && "mehrstufig", f.firma?.treuhand && "Treuhand/Stiftung"].filter(Boolean).join(", ") || "einfach" },
                  { label: "Einreicher vertretungsberechtigt", wert: f.einreicherVertretungsberechtigt === false ? "Nein – Vollmacht nötig" : "Ja" },
                ]}
              />
              <h3 className="mt-5 text-[13px] font-semibold uppercase tracking-wider text-ink-500">Wirtschaftlich Berechtigte</h3>
              <ul className="mt-2 divide-y divide-ink-100">
                {(f.ubos || []).map((u) => (
                  <li key={u.id} className="py-2 text-[14px] text-ink-800">
                    <strong>{u.vorname} {u.nachname}</strong> · geb. {datum(u.geburtsdatum)} · {kycLand(u.wohnsitzland)} · {KYC_KONTROLLE_ARTEN[u.kontrolleArt]}{u.anteil ? ` · ${u.anteil} %` : ""}{u.pep ? " · PEP" : ""}
                  </li>
                ))}
                {!(f.ubos || []).length && <li className="py-2 text-[14px] text-ink-500">Keine erfasst.</li>}
              </ul>
              <h3 className="mt-4 text-[13px] font-semibold uppercase tracking-wider text-ink-500">Vertretungsberechtigte</h3>
              <ul className="mt-2 divide-y divide-ink-100">
                {(f.vertreter || []).map((x) => (
                  <li key={x.id} className="py-2 text-[14px] text-ink-800"><strong>{x.vorname} {x.nachname}</strong> · {x.funktion} · geb. {datum(x.geburtsdatum)}{x.istEinreicher ? " · Einreicher" : ""}</li>
                ))}
              </ul>
            </Karte>
          )}
          <IdentPruefung fall={JSON.parse(JSON.stringify(f))} ichId={n.id} />
          <CompliancePruefung fall={JSON.parse(JSON.stringify(f))} ichId={n.id} />
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Prüfstand">
          <Karte titel="Prüfstand">
            <Fortschritt quote={f.fortschrittGeprueft.quote} text="Pflichtpunkte mit geprüften Unterlagen" />
            {f.fortschrittGeprueft.fehlend.length > 0 && (
              <ul className="mt-3 space-y-1 text-[13px] text-ink-700">
                {f.fortschrittGeprueft.fehlend.map((a) => <li key={a.id}>· {a.label}</li>)}
              </ul>
            )}
            <div className="mt-4" />
            <Angaben spalten={1} items={[
              { label: "Risiko (Regeln)", wert: `${f.risikoRegel.stufe} (${f.risikoRegel.punkte} Punkte)${f.risikoRegel.gruende.length ? `: ${f.risikoRegel.gruende.join("; ")}` : ""}` },
              f.risikoDetail?.manuell && { label: "Manuell eingestuft", wert: `${f.risikoDetail.stufe} – ${f.risikoDetail.begruendung}` },
              { label: "Sanktionsabgleich", wert: f.sanktionenDetail ? `${f.sanktionenDetail.status} · ${datumZeit(f.sanktionenDetail.letzterAbgleich)} · Liste ${f.sanktionenDetail.listeStand}` : "noch nicht" },
              { label: "Nächste Überprüfung", wert: f.naechstePruefung ? datum(f.naechstePruefung) : "" },
              { label: "Löschung ab", wert: f.loeschenAb ? datum(f.loeschenAb) : "nach Ende der Geschäftsbeziehung + 5 Jahre" },
            ]} />
          </Karte>
          {(f.pruefergebnisse || []).length > 0 && (
            <Karte titel="Externe Prüfergebnisse" untertitel="Hinweise angebundener Dienste – entscheiden nicht selbst">
              <ul className="space-y-2.5">
                {f.pruefergebnisse.map((e) => (
                  <li key={e.id} className="text-[13.5px] text-ink-800">
                    <p className="flex flex-wrap items-center gap-2"><strong>{e.quelle}</strong> · {e.art} <Badge ton={e.ergebnis === "ok" ? "ok" : e.ergebnis === "auffaellig" || e.ergebnis === "fehler" ? "warn" : "neutral"}>{e.ergebnis}</Badge></p>
                    <p className="text-ink-600">{e.zusammenfassung}</p>
                    <p className="text-[12px] text-ink-500">{datumZeit(e.am)}{e.rohdatenRef ? ` · Rohdaten: ${e.rohdatenRef}` : ""}</p>
                  </li>
                ))}
              </ul>
            </Karte>
          )}
          {unternehmen && <RegisterSuche kycFallId={f.id} land={f.firma?.land || "AT"} q={f.firma?.name || ""} nummer={f.firma?.registernummer || ""} titel="Registerauszug abrufen" kompakt />}{/* Dienste */}
          <Karte titel="Verlauf">
            <ol className="space-y-3">
              {[...(f.verlauf || [])].reverse().map((x, i) => (
                <li key={i} className="text-[13.5px]">
                  <p className="font-semibold text-ink-900">{kycStatusLabel(x.status, { intern: true })} <span className="font-normal text-ink-500">· {datumZeit(x.am)}{x.von ? ` · ${x.von}` : ""}{x.oeffentlich === false ? " · intern" : ""}</span></p>
                  {x.kommentar && <p className="mt-0.5 whitespace-pre-line text-ink-600">{x.kommentar}</p>}
                </li>
              ))}
            </ol>
          </Karte>
          <Karte titel="Zugriffsprotokoll" untertitel="Einträge im Revisionsprotokoll (Hash-Kette)">
            <ul className="space-y-2">
              {(f.zugriffe || []).slice(0, 25).map((z) => (
                <li key={z.id} className="text-[12.5px] text-ink-700">
                  <span className="font-semibold">{datumZeit(z.am)}</span> · {z.nutzer} · {z.text}
                  <span className="block truncate font-mono text-[11px] text-ink-400" title={z.hash}>{z.hash}</span>
                </li>
              ))}
            </ul>
          </Karte>
        </aside>
      </div>
    </>
  );
}
