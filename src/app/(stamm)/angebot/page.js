// src/app/angebot/page.js – Eingabe des persönlichen Codes aus dem Anschreiben (noindex).
import { CodeEingabe } from "@/components/Angebot/AngebotAktionen";
import { Briefbild, STECKBRIEF_INHALT, ZUSAGEN } from "@/components/Angebot/Buehne";
import Stagger from "@/components/ui/Stagger";
import { TextEnthuellung } from "@/components/motion";

export const metadata = {
  title: "Persönlicher Code | ÖkoInvest",
  description: "Geben Sie den persönlichen Code aus unserem Anschreiben ein, um den Steckbrief Ihrer Fläche mit unverbindlicher Pachtspanne und Pachtrechner zu öffnen.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AngebotCode() {
  return (
    <>
      <section aria-labelledby="code-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
        <div className="ov-container grid grid-cols-[minmax(0,1fr)] items-center gap-y-16 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-x-16">
          <div className="max-w-[36rem]">
            <p className="ov-hero-in inline-flex items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15" style={{ "--ov-delay": "40ms" }}>
              <span className="rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">Ihr Anschreiben</span>
              Flächen-Steckbrief öffnen
            </p>
            <h1 id="code-titel" className="ov-h1 mt-6 text-balance md:mt-8">
              <TextEnthuellung verzoegerung={80}>
                Persönlichen Code <span className="ov-text-gradient-light">eingeben</span>
              </TextEnthuellung>
            </h1>
            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75" style={{ "--ov-delay": "180ms" }}>
              Den Code finden Sie in unserem Schreiben rechts oben (zehn Zeichen, z. B. ABCDE-23456). Alternativ scannen Sie den QR-Code im Brief.
            </p>

            <div className="ov-hero-in relative mt-8 md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <div aria-hidden="true" className="absolute -inset-4 rounded-[2.25rem] bg-ov-500/20 blur-2xl" />
              <div className="relative rounded-[1.75rem] bg-white p-5 text-ink-900 shadow-e5 ring-1 ring-white/20 sm:p-6">
                <p className="mb-3 text-[13.5px] font-semibold text-ink-800">Ihr persönlicher Code</p>
                <CodeEingabe />
              </div>
            </div>

            <ul className="ov-hero-in mt-8 grid gap-3 sm:grid-cols-3" style={{ "--ov-delay": "320ms" }}>
              {ZUSAGEN.map((z) => (
                <li key={z.t} className="flex gap-3 sm:block">
                  <z.icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-300" />
                  <span className="min-w-0 sm:mt-2 sm:block">
                    <span className="block text-[14px] font-semibold leading-snug text-white">{z.t}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-white/65">{z.x}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ov-hero-in mx-auto w-full max-w-[460px] px-4 pb-8 pt-10 sm:px-8 lg:mr-0" style={{ "--ov-delay": "200ms" }}>
            <Briefbild />
          </div>
        </div>
      </section>

      <section aria-labelledby="inhalt-titel" className="bg-sand-50 py-16 md:py-24">
        <div className="ov-container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-700">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
                Ihr Steckbrief
              </p>
              <h2 id="inhalt-titel" className="ov-h2 mt-4 text-ink-900">Was Sie nach der Eingabe sehen</h2>
              <p className="ov-lead mt-5 text-ink-600">Eine erste, unverbindliche Einschätzung Ihrer Fläche – und die Möglichkeit, die Pacht selbst durchzurechnen. Kontakt nehmen nur Sie auf, wenn Sie möchten.</p>
            </div>
            <Stagger as="ul" schritt={90} className="grid gap-3 sm:grid-cols-2">
              {STECKBRIEF_INHALT.map((s, i) => (
                <li key={s.t} className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
                  <div className="flex items-center justify-between">
                    <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <span aria-hidden="true" className="ov-num font-display text-[28px] font-extrabold leading-none text-ink-100">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-4 font-display text-[17px] font-bold text-ink-900">{s.t}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{s.x}</p>
                </li>
              ))}
            </Stagger>
          </div>
        </div>
      </section>
    </>
  );
}
