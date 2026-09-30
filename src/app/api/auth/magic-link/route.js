// POST /api/auth/magic-link – { email } → immer { ok: true } (keine Konto-Enumeration).
// Aktive Konten erhalten einen Anmelde-Link (15 min, einmalig, nur als Hash gespeichert).
import { route, basisUrl } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";
import { email as emailPruefen } from "@/lib/plattform/validierung";

export const POST = route({ auth: false, limit: "magicLink" }, async ({ body, request, ip }) => {
  const email = emailPruefen(body.email);
  if (email) {
    rateLimit(`magicLinkEmail:${email}`, ...grenze("magicLink"));
    await sicherheit().magicLinkAnfordern({ email, basisUrl: basisUrl(request), ip });
  }
  return { ok: true };
});
