// src/app/angebot/page.js – Eingabe des persönlichen Codes aus dem Anschreiben (noindex).
import Section from "@/components/ui/Section";
import { CodeEingabe } from "@/components/Angebot/AngebotAktionen";

export const metadata = {
  title: "Persönlicher Code | ÖkoInvest",
  description: "Geben Sie den persönlichen Code aus unserem Anschreiben ein, um den Steckbrief Ihrer Fläche mit unverbindlicher Pachtspanne und Pachtrechner zu öffnen.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AngebotCode() {
  return (
    <Section tone="sand" space="lg">
      <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 ring-1 ring-ink-200/70">
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-ov-700">Ihr Anschreiben</p>
        <h1 className="mt-2 font-display text-[26px] font-extrabold text-ink-900">Persönlichen Code eingeben</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-600">Den Code finden Sie in unserem Schreiben rechts oben (zehn Zeichen, z. B. ABCDE-23456). Alternativ scannen Sie den QR-Code im Brief.</p>
        <div className="mt-6"><CodeEingabe /></div>
      </div>
    </Section>
  );
}
