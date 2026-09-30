// POST /api/portal/sicherheit/zwei-faktor – Zwei-Faktor-Anmeldung verwalten, { aktion, code?, passwort? }:
//   starten      → { ok, geheimnis, uri }            (Schlüssel für QR-Code/manuelle Eingabe, noch nicht aktiv)
//   bestaetigen  { code } → { ok, codes[10], status } (aktiv; neue Sitzung = Rotation, 2FA in dieser Sitzung erfüllt)
//   deaktivieren { passwort, code } → { ok, status }  (nicht bei Pflicht-2FA)
//   codes        { code } → { ok, codes[10], status } (neue Wiederherstellungscodes, alte ungültig)
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";
import { sitzungStarten } from "@/lib/plattform/server/anmeldung";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const POST = route({ ohne2fa: true, limit: "zweiFaktor" }, async ({ nutzer, body, request, ip }) => {
  const s = sicherheit();
  const code = typeof body.code === "string" ? body.code.slice(0, 20) : "";
  switch (body.aktion) {
    case "starten":
      return { ok: true, ...(await s.zweiFaktorStarten(nutzer)) };
    case "bestaetigen": {
      const r = await s.zweiFaktorBestaetigen(nutzer, { code });
      return sitzungStarten({ request, ip, nutzer, methode: "zwei-faktor-einrichtung", zweiFaktor: true, ersetzt: nutzer.sitzung?.id || null, daten: { codes: r.codes, status: r.status } });
    }
    case "deaktivieren":
      return { ok: true, status: await s.zweiFaktorDeaktivieren(nutzer, { passwort: String(body.passwort || ""), code }) };
    case "codes":
      return { ok: true, ...(await s.wiederherstellungscodesNeu(nutzer, { code })) };
    default:
      throw new PlattformFehler(422, "Unbekannte Aktion.");
  }
});
