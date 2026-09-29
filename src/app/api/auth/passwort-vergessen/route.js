// POST /api/auth/passwort-vergessen – { email } → immer { ok: true } (keine Konto-Enumeration)
import { route, basisUrl } from "@/lib/plattform/server/route";

export const POST = route({ auth: false, limit: "passwort" }, async ({ body, backend, request, ip }) => {
  await backend.passwortVergessen({ email: body.email, basisUrl: basisUrl(request), ip });
  return { ok: true };
});
