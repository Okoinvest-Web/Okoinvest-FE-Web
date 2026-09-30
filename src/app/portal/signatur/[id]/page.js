import { Download, FileCheck2, FileText, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { Angaben, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { Fortschritt, Protokoll, SignaturStatus, UnterzeichnerListe } from "@/components/Portal/Signatur/teile";
import SignaturUnterschreiben from "@/components/Portal/Signatur/SignaturUnterschreiben";
import { SignaturAktionen } from "@/components/Portal/Signatur/SignaturVerwaltung";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { datum, datumZeit } from "@/lib/plattform/format";

export const metadata = { title: "Dokument unterschreiben" };

const groesse = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default async function SignaturDetailSeite({ params }) {
  const n = await portalNutzer();
  const { id } = await params;
  const v = await laden(() => serviceBackend().signatur(n, id));
  const pdf = `/api/portal/signatur/${v.id}/pdf`;

  return (
    <>
      <SeitenKopf eyebrow={`${v.artLabel} · ${v.id}`} titel={v.titel} aktionen={<SignaturStatus status={v.status} label={v.statusLabel} />}>
        <p className="mt-2 text-[14px] text-ink-600">
          Bereitgestellt von {v.ersteller?.name || "ÖkoInvest"} am {datum(v.erstelltAm)}
          {v.frist && v.status === "laufend" ? ` · Frist ${datum(v.frist)}` : ""}
          {v.abgeschlossenAm ? ` · abgeschlossen ${datumZeit(v.abgeschlossenAm)} Uhr` : ""}
        </p>
      </SeitenKopf>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {v.ichBinDran && (
            <Karte titel="Jetzt unterschreiben" untertitel="Einfache elektronische Signatur (EES) – keine qualifizierte Signatur">
              <SignaturUnterschreiben vorgang={v} meinName={[n.vorname, n.nachname].filter(Boolean).join(" ")} />
            </Karte>
          )}
          {v.status === "abgeschlossen" && v.signiert && (
            <Hinweis ton="ok" icon={FileCheck2} titel="Vollständig unterschrieben">
              Das signierte PDF enthält das unveränderte Original und angehängt die Prüfseite mit allen Unterschriften.
              <span className="mt-1 block break-all text-[12.5px]">SHA-256 (signiert): {v.signiert.sha256}</span>
            </Hinweis>
          )}
          {v.status === "widerrufen" && v.widerruf && <Hinweis ton="warn" titel="Widerrufen">Am {datumZeit(v.widerruf.am)} Uhr: {v.widerruf.grund}</Hinweis>}
          {v.nachricht && <Hinweis ton="info" titel="Nachricht">{v.nachricht}</Hinweis>}

          <Karte titel="Unterzeichner" untertitel={v.reihenfolge ? "Feste Reihenfolge – die nächste Person wird automatisch benachrichtigt" : "Beliebige Reihenfolge"} aktion={<Fortschritt {...v.fortschritt} />}>
            <UnterzeichnerListe unterzeichner={v.unterzeichner} reihenfolge={v.reihenfolge} />
          </Karte>

          <Karte titel="Protokoll" untertitel="Zeitpunkt, Aktion, IP-Adresse, Browser und Prüfsumme (IP anderer Personen gekürzt)">
            <Protokoll eintraege={v.protokoll} />
          </Karte>
        </div>

        <aside className="min-w-0 space-y-6">
          <Karte titel="Dokument">
            <Angaben
              spalten={1}
              items={[
                { label: "Datei", wert: `${v.dokument.name} · ${groesse(v.dokument.groesse)}${v.dokument.seiten ? ` · ${v.dokument.seiten} ${v.dokument.seiten === 1 ? "Seite" : "Seiten"}` : ""}` },
                { label: "SHA-256 Original", wert: <span className="break-all font-mono text-[12.5px]">{v.dokument.sha256}</span> },
                v.signiert && { label: "SHA-256 signiert", wert: <span className="break-all font-mono text-[12.5px]">{v.signiert.sha256}</span> },
              ]}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <Button href={`${pdf}?anzeigen=1`} prefetch={false} target="_blank" rel="noopener" size="sm" variant="secondary" icon={FileText}>Original ansehen</Button>
              {v.signiert && <Button href={`${pdf}?variante=signiert`} prefetch={false} size="sm" icon={Download}>Signiertes PDF</Button>}
            </div>
          </Karte>
          {(v.darfErinnern || v.darfWiderrufen) && (
            <Karte titel="Backoffice">
              <SignaturAktionen id={v.id} darfErinnern={v.darfErinnern} darfWiderrufen={v.darfWiderrufen} />
            </Karte>
          )}
          <Karte titel="Rechtlicher Hinweis">
            <p className="flex gap-2 text-[13.5px] font-semibold leading-relaxed text-ink-900">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
              {v.kennzeichnung}
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-600">{v.rechtshinweis}</p>
          </Karte>
        </aside>
      </div>
    </>
  );
}
