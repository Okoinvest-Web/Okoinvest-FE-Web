import { redirect } from "next/navigation";
import AuthRahmen from "@/components/Plattform/AuthRahmen";
import LoginFormular from "@/components/Plattform/LoginFormular";
import { abs } from "@/data/site";
import { aktuellerNutzer } from "@/lib/plattform/server/seite";
import { istDemo } from "@/lib/plattform/backend";
import { sicheresZiel } from "@/lib/plattform/client";
import { DEMO_KONTEN, DEMO_PASSWORT } from "@/lib/plattform/backend/demo/seed";
import { rolleLabel } from "@/lib/plattform/konstanten";

export const dynamic = "force-dynamic";

// Weitere Demo-Konten aus den Fach-Seeds (Energie, Entwicklung, Backoffice-Unterrollen)
const WEITERE_DEMO_KONTEN = [
  { email: "kommune@example.com", label: "Gemeinde", gruppe: "Kunden & Partner" },
  { email: "gutachter@example.com", label: "Gutachter/Planer", gruppe: "Kunden & Partner" },
  { email: "bank@example.com", label: "Bank (Leitung)", gruppe: "Kunden & Partner" },
  { email: "bank-sachbearbeitung@example.com", label: "Bank (Sachbearbeitung)", gruppe: "Kunden & Partner" },
  { email: "deal-investor1@example.com", label: "Zweiter Investor (Bieter)", gruppe: "Kunden & Partner" },
  { email: "lieferant@example.com", label: "Energieversorger", gruppe: "Kunden & Partner" },
  { email: "energie-kunde1@example.com", label: "Reststrom-Kunde", gruppe: "Kunden & Partner" },
  { email: "mitglied@example.com", label: "Mitglied (Sonnenland)", gruppe: "Energiegemeinschaft" },
  { email: "eg-obmann@example.com", label: "Obmann", gruppe: "Energiegemeinschaft" },
  { email: "eg-kassier@example.com", label: "Kassier", gruppe: "Energiegemeinschaft" },
  { email: "eg-pruefer@example.com", label: "Rechnungsprüfer", gruppe: "Energiegemeinschaft" },
  { email: "bo-akquise@example.com", label: "Akquise", gruppe: "Backoffice" },
  { email: "bo-projektleitung@example.com", label: "Projektleitung", gruppe: "Backoffice" },
  { email: "bo-transaktion@example.com", label: "Transaktion", gruppe: "Backoffice" },
  { email: "bo-compliance@example.com", label: "Compliance", gruppe: "Backoffice" },
  { email: "bo-compliance2@example.com", label: "Compliance (Vier-Augen)", gruppe: "Backoffice" },
  { email: "bo-buchhaltung@example.com", label: "Buchhaltung", gruppe: "Backoffice" },
  { email: "bo-betrieb@example.com", label: "Anlagenbetrieb", gruppe: "Backoffice" },
  { email: "bo-energie@example.com", label: "Energie", gruppe: "Backoffice" },
  { email: "bo-lesen@example.com", label: "Nur lesen", gruppe: "Backoffice" },
];

export const metadata = {
  title: "Anmelden | ÖkoInvest",
  description: "Anmeldung zum Portal von ÖkoInvest: Status Ihrer Anfragen, Flächen und Projekte, Projektbörse, Dokumente und Nachrichten an einem Ort.",
  alternates: { canonical: abs("/login") },
  robots: { index: false, follow: true },
};

export default async function Login({ searchParams }) {
  const sp = await searchParams;
  const weiter = typeof sp?.weiter === "string" ? sicheresZiel(sp.weiter, "") : "";
  const nutzer = await aktuellerNutzer().catch(() => null);
  if (nutzer) redirect(weiter || "/portal");

  const demoKonten = istDemo()
    ? [
        ...DEMO_KONTEN.map((k) => ({ email: k.email, label: rolleLabel(k.rollen[0]), gruppe: k.rollen[0] === "admin" ? "Backoffice" : "Kunden & Partner" })),
        ...WEITERE_DEMO_KONTEN,
      ].map((k) => ({ ...k, passwort: DEMO_PASSWORT() }))
    : [];

  return (
    <AuthRahmen eyebrow="Portal" titel="Willkommen zurück" text="Melden Sie sich an, um Status, Dokumente und Nachrichten zu Ihren Vorgängen zu sehen.">
      <LoginFormular weiter={weiter} hinweis={typeof sp?.hinweis === "string" ? sp.hinweis : ""} demoKonten={demoKonten} demo={istDemo()} />
    </AuthRahmen>
  );
}
