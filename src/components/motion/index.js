/**
 * Motion-System 3 – ein Import-Pfad für alle Bewegungs-Primitive.
 *
 *   import { TextEnthuellung, Zaehler, PfadZeichnen, Spotlight } from "@/components/motion";
 *
 * Server-taugliche Bausteine (kein Client-JS): TextEnthuellung, PfadZeichnen, Parallax,
 * Spotlight, Magnetisch, KippKarte, Einblenden (= ui/Reveal), Gruppe (= ui/Stagger).
 * Client-Bausteine: Zaehler, ScrollFortschritt, Laufband (= ui/Marquee).
 * Global eingebunden (LayoutWrapper, nicht selbst einbinden): MotionInteraktion, RevealObserver.
 * Hilfen für eigene Client-Logik: useFreieUnterkante (feste Leisten unten) sowie – direkt aus
 * "@/components/ui/motion" importieren – DAUER, KURVE, useReduzierteBewegung, useSichtbar,
 * mitUebergang, signal.
 */
export { default as TextEnthuellung } from "./TextEnthuellung";
export { default as Zaehler } from "./Zaehler";
export { default as PfadZeichnen } from "./PfadZeichnen";
export { default as Parallax } from "./Parallax";
export { default as Spotlight } from "./Spotlight";
export { default as Magnetisch } from "./Magnetisch";
export { default as KippKarte } from "./KippKarte";
export { default as ScrollFortschritt } from "./ScrollFortschritt";
export { default as useFreieUnterkante } from "./useFreieUnterkante";
export { default as Einblenden } from "@/components/ui/Reveal";
export { default as Gruppe } from "@/components/ui/Stagger";
export { default as Laufband } from "@/components/ui/Marquee";
