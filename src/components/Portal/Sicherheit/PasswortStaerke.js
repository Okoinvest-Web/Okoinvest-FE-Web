// Stärkeanzeige für neue Passwörter (vier Segmente + Tipps). Die verbindliche Prüfung erfolgt serverseitig.
import { passwortStaerke } from "@/lib/plattform/passwortStaerke";
import { cn } from "@/components/ui/cn";

const FARBE = ["bg-ink-200", "bg-sun-500", "bg-sun-400", "bg-ov-400", "bg-ov-600"];

export default function PasswortStaerke({ passwort, email, name, id }) {
  if (!passwort) return null;
  const s = passwortStaerke(passwort, { email, name });
  return (
    <div id={id} className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= s.stufe ? FARBE[s.stufe] : "bg-ink-100")} />
        ))}
      </div>
      <p className="mt-1.5 text-[12.5px] text-ink-600">
        Passwortstärke: <strong className="font-semibold text-ink-900">{s.label}</strong>
        {s.tipps.length > 0 && <span> · {s.tipps.join(" ")}</span>}
      </p>
    </div>
  );
}
