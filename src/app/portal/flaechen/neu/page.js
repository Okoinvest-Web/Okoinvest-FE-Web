import { ShieldCheck, Clock, Coins } from "lucide-react";
import FlaecheFormular from "@/components/Portal/FlaecheFormular";
import { begriffeFuer } from "@/components/Portal/Flaeche/Fachanzeige"; // Fachprüfung Flächen: Lexikon-Popover im Formular
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { PACHT, PROVISION } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Fläche hinzufügen" };

export default async function FlaecheNeu() {
  const n = await portalNutzer({ rollen: ["flaeche", "landwirt"] });
  const agri = n.rollen.includes("landwirt") && !n.rollen.includes("flaeche");
  return (
    <div>
      <SeitenKopf eyebrow="Flächen" titel="Fläche hinzufügen" text="Je genauer die Angaben, desto schneller die Vorprüfung. Alles lässt sich später ergänzen." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Karte>
          <FlaecheFormular agriStandard={agri} begriffe={begriffeFuer()} />
        </Karte>
        <aside className="space-y-4">
          <div className="rounded-3xl bg-navy-950 p-6 text-white">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">So geht es weiter</p>
            <ul className="mt-4 space-y-4 text-[14px] leading-relaxed text-white/75">
              <li className="flex gap-3"><Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> Vorprüfung: Lage, Schutzgebiete, Planungsrecht und Netz grob – Rückmeldung in der Regel innerhalb weniger Wochen.</li>
              <li className="flex gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> Standortanalyse: Netzverknüpfung, Ertrag, Genehmigungsfähigkeit.</li>
              <li className="flex gap-3"><Coins aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> Pachtangebot im Portal – übliche Spanne für Freiflächen-PV {fmt(PACHT.freiflaecheProHa.min)}–{fmt(PACHT.freiflaecheProHa.max)} € je ha und Jahr, abhängig von Standort und Netz.</li>
            </ul>
          </div>
          <p className="rounded-2xl bg-ov-50 px-4 py-3 text-[13.5px] leading-relaxed text-ov-900 ring-1 ring-ov-200">Für Flächeneigentümer ist die Plattform {PROVISION.flaeche.text.replace("für Flächeneigentümer ", "")}.</p>
        </aside>
      </div>
    </div>
  );
}
