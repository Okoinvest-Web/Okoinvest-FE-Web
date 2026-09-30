// /portal/eid/demo?methode=…&state=…&nonce=…&code_challenge=… – DEMO-Simulator des eID-Ausstellers (ID Austria bzw.
// eID-Service Online-Ausweis). Nur bei Demo-Konfiguration und nur für einen offenen eigenen Vorgang; steht an der Stelle
// der Anmeldeseite des Ausstellers. Keine echte Identifizierung.
import { notFound } from "next/navigation";
import { SeitenKopf } from "@/components/Portal/ui";
import EidDemoAussteller from "@/components/Portal/Dienste/EidDemoAussteller";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { eidBackend } from "@/lib/plattform/backend/eid";
import { EID_METHODEN } from "@/lib/plattform/dienste/eid/methoden";

export const metadata = { title: "eID-Anmeldung (Simulation)", robots: { index: false } };

const wert = (x, max = 200) => (typeof x === "string" ? x.slice(0, max) : "");

export default async function EidDemoSeite({ searchParams }) {
  const n = await portalNutzer();
  const sp = await searchParams;
  const methode = wert(sp?.methode, 30);
  const d = await laden(() => eidBackend().eidStatus(n));
  const m = (d.methoden || []).find((x) => x.id === methode && x.demo);
  const offen = (d.vorgaenge || []).some((x) => x.methode === methode && x.status === "ausstehend" && x.demo);
  if (!m || !offen || !wert(sp?.state) || sp?.code_challenge_method !== "S256") notFound();
  return (
    <>
      <SeitenKopf eyebrow="Verifizierung · DEMO" titel={`${EID_METHODEN[methode].label} – Simulation`} text="Vorführmodus ohne echten eID-Dienst. Im Betrieb erscheint hier die offizielle Anmeldeseite des Ausstellers; das Ergebnis läuft durch denselben Prüfpfad (PKCE, signiertes ID-Token, state/nonce)." />
      <EidDemoAussteller methode={methode} label={EID_METHODEN[methode].label} state={wert(sp.state)} nonce={wert(sp.nonce)} codeChallenge={wert(sp.code_challenge, 128)} />
    </>
  );
}
