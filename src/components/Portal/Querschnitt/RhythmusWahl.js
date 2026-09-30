"use client";

// E-Mail-Rhythmus (Querschnitt): sofort je Ereignis oder gesammelt als Tages-Digest (höchstens eine E-Mail am Tag,
// nur Anzahl je Ereignisart). Sicherheitsmeldungen kommen immer sofort.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { senden } from "@/lib/plattform/client";
import { MAIL_RHYTHMEN } from "@/lib/plattform/querschnitt";
import { datumZeit } from "@/lib/plattform/format";
import { FehlerBox, ErfolgBox } from "../felder";

export default function RhythmusWahl({ start = { rhythmus: "sofort" } }) {
  const router = useRouter();
  const [wert, setWert] = useState(start.rhythmus || "sofort");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");

  async function waehlen(r) {
    setWert(r);
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      await senden("/api/portal/querschnitt/rhythmus", { method: "PUT", body: { rhythmus: r } });
      setErfolg(r === "taeglich" ? "Tages-Digest aktiviert." : "E-Mails kommen wieder sofort.");
      router.refresh();
    } catch (x) {
      setFehler(x.message);
      setWert(start.rhythmus || "sofort");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <fieldset className="space-y-2" disabled={laeuft}>
      <legend className="mb-2 text-[13.5px] leading-relaxed text-ink-600">Wie oft dürfen wir Ihnen schreiben? Im Portal sehen Sie jedes Ereignis sofort; Sicherheitsmeldungen kommen immer sofort per E-Mail.</legend>
      {Object.entries(MAIL_RHYTHMEN).map(([k, r]) => (
        <label key={k} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-sand-50 p-3.5 ring-1 ring-inset ring-ink-200/70 has-[:checked]:bg-ov-50/60 has-[:checked]:ring-ov-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
          <input type="radio" name="mail-rhythmus" value={k} checked={wert === k} onChange={() => waehlen(k)} className="mt-1 h-4 w-4 shrink-0 accent-[#558227]" />
          <span className="min-w-0">
            <span className="block text-[14.5px] font-semibold text-ink-900">{r.label}</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-ink-600">{r.text}</span>
          </span>
        </label>
      ))}
      {wert === "taeglich" && (
        <p className="text-[12.5px] text-ink-500">
          {start.vorgemerkt ? `${start.vorgemerkt} Ereignis(se) für den nächsten Digest vorgemerkt.` : "Derzeit nichts vorgemerkt."}
          {start.digestZuletzt ? ` Letzter Digest: ${datumZeit(start.digestZuletzt)}.` : ""}
        </p>
      )}
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{erfolg}</ErfolgBox>
    </fieldset>
  );
}
