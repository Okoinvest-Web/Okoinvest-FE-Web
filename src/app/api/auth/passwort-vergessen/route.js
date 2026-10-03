// POST /api/auth/passwort-vergessen – { email } → immer { ok: true } (keine Konto-Enumeration)
//
// Rate-Limit doppelt: je IP (route: limit "passwort") UND je E-Mail-Adresse – analog zu Magic-Link.
// Ohne das Limit je Adresse ließen sich fremde Postfächer mit Reset-Mails fluten (schadet auch der
// Absender-Reputation der Domain). Das Limit gilt für jede Adresse gleich, verrät also kein Konto.
import { route, basisUrl } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { email as emailPruefen } from "@/lib/plattform/validierung";

export const POST = route({ auth: false, limit: "passwort" }, async ({ body, backend, request, ip }) => {
  const email = emailPruefen(body.email);
  if (email) rateLimit(`passwortEmail:${email}`, ...grenze("passwort"));
  await backend.passwortVergessen({ email: body.email, basisUrl: basisUrl(request), ip });
  return { ok: true };
});
