import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SeitenKopf } from "@/components/Portal/ui";
import { DublettenListe } from "@/components/Portal/Backoffice/Crm";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Dubletten" };

export default async function CrmDubletten() {
  const n = await portalNutzer({ admin: true });
  const paare = await backend().crmDubletten(n);
  return (
    <div className="space-y-5">
      <Link href="/portal/admin/crm" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> CRM
      </Link>
      <SeitenKopf eyebrow="CRM" titel="Dubletten" text="Erkannt über gleiche E-Mail-Adresse, gleichen Namen mit gleicher PLZ oder Organisation, gleiche Telefonnummer oder Nachname + Initiale + PLZ. Leads aus Anfragen mit bekannter E-Mail werden automatisch dem vorhandenen Kontakt zugeordnet." />
      {darfSchreiben(n, "crm") ? (
        <DublettenListe paare={paare} />
      ) : (
        <ul className="space-y-2 text-[14px]">
          {paare.map((p) => <li key={`${p.a.id}|${p.b.id}`}>{p.score} % · {p.a.vorname} {p.a.nachname} ↔ {p.b.vorname} {p.b.nachname} ({p.gruende.join(", ")})</li>)}
        </ul>
      )}
    </div>
  );
}
