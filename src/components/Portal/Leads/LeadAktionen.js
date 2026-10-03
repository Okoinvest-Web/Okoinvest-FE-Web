"use client";

// src/components/Portal/Leads/LeadAktionen.js
//
// Aktionen je Anfrage im Lead-Desk (Welle 2, Paket B3): Absagecode mit Begründung, Widerruf eines Werbe-Zwecks,
// Löschung nach Art. 17. Alle Prüfungen (Rechte, Muster, Kette) laufen serverseitig (/api/admin/leads/*).
// Keine Personendaten in Meldungen; nach Erfolg wird die Seite neu geladen (router.refresh).

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, MessageSquareX, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { auswahlfeld, eingabe, labelKlasse, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { cn } from "@/components/ui/cn";

const ZWECKE = [
  ["werbeanruf", "Werbeanruf"],
  ["newsletter", "Newsletter / Alarm"],
  ["weitergabe_partner", "Weitergabe an Partner"],
  ["bericht", "Bericht per E-Mail"],
];
const KANAELE = [
  ["telefon", "am Telefon erklärt"],
  ["email", "per E-Mail erklärt"],
  ["backoffice", "sonstiger Weg"],
];

export default function LeadAktionen({ vorgangId, absageCodes = [], geloescht = false, darfSchreiben = true }) {
  const router = useRouter();
  const id = useId();
  const [offen, setOffen] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");
  const [meldung, setMeldung] = useState("");
  const [code, setCode] = useState(absageCodes[0]?.id || "");
  const [begruendung, setBegruendung] = useState(absageCodes[0]?.text || "");
  const [zweck, setZweck] = useState("werbeanruf");
  const [kanal, setKanal] = useState("telefon");
  const [bestaetigung, setBestaetigung] = useState("");
  const [grund, setGrund] = useState("");

  if (!darfSchreiben) return null;

  const schliessen = () => {
    setOffen("");
    setFehler("");
  };
  const ausfuehren = async (url, body, text) => {
    setLaedt(true);
    setFehler("");
    try {
      await senden(url, { body });
      setMeldung(text);
      setOffen("");
      router.refresh();
    } catch (e) {
      setFehler(e.message || "Das hat nicht geklappt.");
    } finally {
      setLaedt(false);
    }
  };
  const codeWaehlen = (neu) => {
    setCode(neu);
    setBegruendung(absageCodes.find((c) => c.id === neu)?.text || "");
  };
  const fehlerBox = fehler && (
    <p role="alert" className="mt-4 rounded-xl bg-danger-50 px-3 py-2 text-[13.5px] text-danger-800 ring-1 ring-inset ring-danger-200">
      {fehler}
    </p>
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="xs" variant="secondary" icon={MessageSquareX} onClick={() => setOffen("absage")} disabled={geloescht}>
        Absage
      </Button>
      <Button size="xs" variant="secondary" icon={Ban} onClick={() => setOffen("widerruf")} disabled={geloescht}>
        Widerruf
      </Button>
      <Button size="xs" variant="dangerLeise" icon={Trash2} onClick={() => setOffen("loeschen")} disabled={geloescht}>
        Art. 17
      </Button>
      <span aria-live="polite" className="sr-only">
        {meldung}
      </span>

      <Dialog
        offen={offen === "absage"}
        onSchliessen={schliessen}
        icon={MessageSquareX}
        titel="Absagecode setzen"
        text={`Vorgang ${vorgangId}. Die Begründung geht an den Interessenten, sobald der Vorgang auf „Abgelehnt“ gesetzt wird. Der Score entscheidet nie allein.`}
        aktionen={
          <>
            <Button variant="secondary" onClick={schliessen}>Abbrechen</Button>
            <Button variant="navy" laedt={laedt} onClick={() => ausfuehren("/api/admin/leads/absage", { vorgangId, code, begruendung }, "Absagecode gespeichert.")}>
              Speichern
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor={`${id}-code`} className={labelKlasse}>Absagecode</label>
            <select id={`${id}-code`} value={code} onChange={(e) => codeWaehlen(e.target.value)} className={auswahlfeld}>
              {absageCodes.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-begr`} className={labelKlasse}>Begründung an den Interessenten</label>
            <textarea id={`${id}-begr`} value={begruendung} maxLength={1000} onChange={(e) => setBegruendung(e.target.value)} className={textbereich} />
            <p className="mt-1.5 text-[12.5px] text-ink-500">Entwurf – Wortlaut prüft die Rechtsabteilung.</p>
          </div>
        </div>
        {fehlerBox}
      </Dialog>

      <Dialog
        offen={offen === "widerruf"}
        onSchliessen={schliessen}
        icon={Ban}
        titel="Widerruf eintragen"
        text="Der Widerruf wird als eigener Eintrag an die Einwilligungskette angehängt. Danach ist der Kanal technisch gesperrt."
        aktionen={
          <>
            <Button variant="secondary" onClick={schliessen}>Abbrechen</Button>
            <Button variant="navy" laedt={laedt} onClick={() => ausfuehren("/api/admin/leads/widerruf", { vorgangId, zweck, kanal }, "Widerruf eingetragen.")}>
              Widerruf eintragen
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-zweck`} className={labelKlasse}>Zweck</label>
            <select id={`${id}-zweck`} value={zweck} onChange={(e) => setZweck(e.target.value)} className={auswahlfeld}>
              {ZWECKE.map(([w, t]) => (
                <option key={w} value={w}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-kanal`} className={labelKlasse}>Wie wurde widerrufen?</label>
            <select id={`${id}-kanal`} value={kanal} onChange={(e) => setKanal(e.target.value)} className={auswahlfeld}>
              {KANAELE.map(([w, t]) => (
                <option key={w} value={w}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        {fehlerBox}
      </Dialog>

      <Dialog
        offen={offen === "loeschen"}
        onSchliessen={schliessen}
        icon={Trash2}
        ton="danger"
        titel="Personendaten löschen (Art. 17)"
        text="Name, E-Mail, Telefon und IP dieser Person werden entfernt, offene Einwilligungen gelten als widerrufen. Das Pseudonym bleibt als Nachweis in der Kette. Ein Portal-Konto bleibt bestehen (Compliance)."
        aktionen={
          <>
            <Button variant="secondary" onClick={schliessen}>Abbrechen</Button>
            <Button variant="danger" laedt={laedt} disabled={bestaetigung !== "LÖSCHEN"} onClick={() => ausfuehren("/api/admin/leads/loeschung", { vorgangId, grund, bestaetigung }, "Personendaten gelöscht.")}>
              Endgültig löschen
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor={`${id}-grund`} className={labelKlasse}>Anlass (ohne Personendaten)</label>
            <input id={`${id}-grund`} value={grund} maxLength={200} onChange={(e) => setGrund(e.target.value)} placeholder="z. B. Löschersuchen per E-Mail" className={eingabe} />
          </div>
          <div>
            <label htmlFor={`${id}-ok`} className={labelKlasse}>Zur Bestätigung „LÖSCHEN“ eingeben</label>
            <input id={`${id}-ok`} value={bestaetigung} onChange={(e) => setBestaetigung(e.target.value)} autoComplete="off" className={cn(eingabe, "font-mono tracking-wider")} />
          </div>
        </div>
        {fehlerBox}
      </Dialog>
    </div>
  );
}
