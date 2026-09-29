import { SearchX } from "lucide-react";
import Button from "@/components/ui/Button";

export default function PortalNichtGefunden() {
  return (
    <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center ring-1 ring-ink-200/70">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-600">
        <SearchX aria-hidden="true" className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-[22px] font-bold text-ink-900">Nicht gefunden</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-600">Diesen Eintrag gibt es nicht, oder Sie haben keinen Zugriff darauf.</p>
      <div className="mt-6 flex justify-center">
        <Button href="/portal" variant="secondary">Zur Übersicht</Button>
      </div>
    </div>
  );
}
