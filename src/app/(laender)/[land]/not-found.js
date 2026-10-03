// 404 in den Länderzonen, z. B. für Seiten, die im gestuften Start in diesem Land nicht
// freigegeben sind (src/lib/land/stufen.js). Linkziele bleiben im Land der Zone.
"use client";
import { usePathname } from "next/navigation";
import NichtGefundenSeite from "@/components/Wurzel/NichtGefundenSeite";
import { landAusPfad } from "@/lib/land";

export default function NotFound() {
  const { land } = landAusPfad(usePathname() || "/");
  return <NichtGefundenSeite land={land || "DE"} />;
}
