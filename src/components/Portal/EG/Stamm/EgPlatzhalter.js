// Platzhalter für Seiten des Moduls Energiegemeinschaften, die ein anderes Arbeitspaket baut (WP1 legt sie an, damit
// Menü und Brotkrumen keine toten Links haben). Das zuständige Paket ersetzt die page.js vollständig.

import { Construction } from "lucide-react";
import { Leer, SeitenKopf } from "@/components/Portal/ui";

export default function EgPlatzhalter({ eyebrow = "Energiegemeinschaften", titel, text, wp }) {
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={eyebrow} titel={titel} text={text} />
      <Leer icon={Construction} titel="In Vorbereitung" text={`Diese Ansicht wird gerade aufgebaut (${wp}). Stammdaten, Mitglieder und Zählpunkte stehen bereits unter „Energiegemeinschaften“ zur Verfügung.`} />
    </div>
  );
}
