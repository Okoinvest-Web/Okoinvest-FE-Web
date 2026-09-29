import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Home, Sun } from "lucide-react";
import Button from "@/components/ui/Button";

export const metadata = {
  title: "Seite nicht gefunden | Ökovolt",
  robots: { index: false, follow: true },
};

const ZIELE = [
  { titel: "Photovoltaikanlage", text: "Komplettanlage vom Fachbetrieb", href: "/produkte/photovoltaikanlage", icon: Sun },
  { titel: "Solarrechner", text: "Ertrag & Ersparnis berechnen", href: "/solarrechner", icon: Calculator },
  { titel: "Ratgeber", text: "Kosten, Förderung, Technik", href: "/ratgeber", icon: BookOpen },
];

export default function NotFound() {
  return (
    <section className="ov-noise relative isolate overflow-hidden bg-navy-950 text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10" />
      <div aria-hidden="true" className="absolute left-1/2 top-1/3 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-ov-500/25 blur-[140px]" />
      <div className="ov-container flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
        <p aria-hidden="true" className="ov-hero-in select-none font-display text-[clamp(7rem,5rem+10vw,14rem)] font-extrabold leading-none tracking-tighter">
          <span className="ov-text-gradient-light">4</span>
          <span className="inline-block animate-ov-float text-sun-400">☀</span>
          <span className="ov-text-gradient-light">4</span>
        </p>
        <h1 className="ov-h2 ov-hero-in mt-4" style={{ "--ov-delay": "100ms" }}>Diese Seite hat heute keine Sonne abbekommen.</h1>
        <p className="ov-lead ov-hero-in mx-auto mt-5 max-w-xl text-white/65" style={{ "--ov-delay": "180ms" }}>
          Die gesuchte Seite existiert nicht oder wurde verschoben. Diese Wege führen garantiert ans Ziel:
        </p>
        <ul className="ov-hero-in mt-10 grid w-full max-w-3xl gap-3 sm:grid-cols-3" style={{ "--ov-delay": "260ms" }}>
          {ZIELE.map((z) => (
            <li key={z.href}>
              <Link href={z.href} className="group ov-glass flex h-full flex-col items-start rounded-3xl p-5 text-left transition-colors hover:bg-white/15">
                <z.icon aria-hidden="true" className="h-6 w-6 text-ov-300" />
                <span className="mt-4 font-display text-[17px] font-bold">{z.titel}</span>
                <span className="mt-1 text-[14px] text-white/60">{z.text}</span>
                <ArrowRight aria-hidden="true" className="mt-4 h-4 w-4 text-white/50 transition-transform group-hover:translate-x-1 group-hover:text-white" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="ov-hero-in mt-10" style={{ "--ov-delay": "320ms" }}>
          <Button href="/" size="lg" icon={Home}>Zur Startseite</Button>
        </div>
      </div>
    </section>
  );
}
