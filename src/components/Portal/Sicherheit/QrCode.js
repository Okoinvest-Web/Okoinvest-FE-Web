// QR-Code als eigenes SVG (Encoder: src/lib/plattform/qr.js, ohne Fremdpakete). Server- und Client-tauglich.
import { qrSvg } from "@/lib/plattform/qr";
import { cn } from "@/components/ui/cn";

export default function QrCode({ text, label = "QR-Code", className }) {
  const { groesse, pfad } = qrSvg(text);
  return (
    <svg viewBox={`0 0 ${groesse} ${groesse}`} role="img" aria-label={label} shapeRendering="crispEdges" className={cn("block h-auto w-full rounded-2xl bg-white", className)}>
      <rect width={groesse} height={groesse} fill="#ffffff" />
      <path d={pfad} className="fill-navy-950" />
    </svg>
  );
}
