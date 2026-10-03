// Abschnittskopf mit id (für aria-labelledby) – optisch wie ui/SectionHeading
import Reveal from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/SectionHeading";
import { cn } from "@/components/ui/cn";

export default function Kopf({ id, eyebrow, titel, lead, dark = false, align = "left", className, children }) {
  const mitte = align === "center";
  return (
    <Reveal className={cn("max-w-3xl", mitte && "mx-auto text-center", className)}>
      {eyebrow && (
        <Eyebrow dark={dark} className={cn("mb-4", mitte && "justify-center")}>
          {eyebrow}
        </Eyebrow>
      )}
      <h2 id={id} className={cn("ov-h2 text-balance", dark ? "text-white" : "text-ink-900")}>
        {titel}
      </h2>
      {lead && <p className={cn("ov-lead mt-5 text-pretty", dark ? "text-white/70" : "text-ink-600", mitte && "mx-auto max-w-2xl")}>{lead}</p>}
      {children}
    </Reveal>
  );
}
