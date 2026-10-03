// GET /api/admin/kanaele?tage=365 – Leads je Gruppen-/Partnerkanal und Kennung je Land (Welle 2, Paket GRP)
//
// Nur Backoffice mit Leserecht „Berichte“. Antwort enthält ausschließlich Zählwerte und Register-Kennungen –
// keine Namen, E-Mail-Adressen, IPs oder Vorgangsnummern. Keine Provisions- oder Vergütungswerte.
//
// Datenquelle: vorhandene Vorgänge (Feld herkunft). Bietet das Backend eine eigene Operation `kanalRohdaten`
// (Frappe, später), wird sie genutzt; sonst werden die Vorgänge einzeln gelesen (Demo-Backend, begrenzt).

import { route } from "@/lib/plattform/server/route";
import { kanalAuswertung } from "@/lib/gruppe/kanal";
import { PARTNER_ARTEN, PARTNER_REGISTER, ZIELE, istProduktion, kennungFinden } from "@/lib/gruppe/partner-register";

const MAX_VORGAENGE = 2000;
const BLOCK = 25;

export const GET = route({ admin: true, recht: "berichte" }, async ({ backend, nutzer, suche }) => {
  const tage = Math.min(3650, Math.max(1, Number.parseInt(suche.get("tage") || "365", 10) || 365));
  const ab = Date.now() - tage * 86400000;

  let roh;
  if (typeof backend.kanalRohdaten === "function") {
    roh = await backend.kanalRohdaten(nutzer, { ab: new Date(ab).toISOString() });
  } else {
    const liste = (await backend.vorgaenge(nutzer, { alle: true })).filter((x) => Date.parse(x.erstelltAm) >= ab);
    const auswahl = liste.slice(0, MAX_VORGAENGE);
    roh = [];
    for (let i = 0; i < auswahl.length; i += BLOCK) {
      const teil = await Promise.all(auswahl.slice(i, i + BLOCK).map((x) => backend.vorgang(nutzer, x.id).catch(() => null)));
      for (const vg of teil) if (vg) roh.push({ status: vg.status, erstelltAm: vg.erstelltAm, land: vg.kontakt?.land || "", herkunft: vg.herkunft || {} });
    }
    roh.unvollstaendig = liste.length > auswahl.length;
  }

  const produktion = istProduktion();
  return {
    ok: true,
    zeitraum: { tage, ab: new Date(ab).toISOString() },
    unvollstaendig: !!roh.unvollstaendig,
    auswertung: kanalAuswertung(roh),
    register: PARTNER_REGISTER.map((e) => ({
      kennung: e.kennung,
      art: e.art,
      artLabel: PARTNER_ARTEN[e.art] || e.art,
      land: e.land,
      status: e.status,
      wirksam: !!kennungFinden(e.kennung, { produktion }),
      ziele: (e.ziele || []).filter((z) => Object.hasOwn(ZIELE, z)),
      todo: e.todo || "",
    })),
    ziele: Object.entries(ZIELE).map(([id, z]) => ({ id, label: z.label, pfad: z.pfad })),
    produktion,
  };
});
