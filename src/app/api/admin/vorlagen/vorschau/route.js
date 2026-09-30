// POST /api/admin/vorlagen/vorschau – { vorlageId?, betreff?, text?, bezugArt?, bezugId?, kontaktId? } → gerenderter Text + Warnungen
import { route } from "@/lib/plattform/server/route";

export const POST = route({ admin: true }, async ({ backend, nutzer, body }) => ({ ok: true, vorschau: await backend.vorlageVorschau(nutzer, body) }));
