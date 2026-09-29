"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Mail, Share2 } from "lucide-react";
import { cn } from "@/components/ui/cn";

/**
 * Teilen-Leiste für Social Media – datenschutzfreundlich:
 * reine Links, keine Skripte oder Pixel der Netzwerke. Daten fließen erst,
 * wenn jemand aktiv auf ein Netzwerk klickt.
 *
 * props:
 *  url       absolute URL der Seite (kanonisch)
 *  titel     Titel für WhatsApp/X/E-Mail
 *  text      optionaler Begleittext (E-Mail, WhatsApp)
 *  netze     Reihenfolge der Netzwerke
 *  kampagne  utm_campaign (z. B. "jobs", "ratgeber")
 *  kompakt   nur Icons, ohne Überschrift
 *  label     Überschrift der Leiste
 */
const NETZE = {
  linkedin: {
    name: "LinkedIn",
    farbe: "hover:bg-[#0A66C2] hover:text-white hover:ring-[#0A66C2]",
    link: ({ u }) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    popup: true,
    pfad: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  xing: {
    name: "XING",
    farbe: "hover:bg-[#006567] hover:text-white hover:ring-[#006567]",
    link: ({ u }) => `https://www.xing.com/spi/shares/new?url=${u}`,
    popup: true,
    pfad: "M18.188 0c-.517 0-.741.325-.927.66 0 0-7.455 13.224-7.702 13.657.015.024 4.919 9.023 4.919 9.023.17.308.436.66.967.66h3.454c.211 0 .375-.078.463-.22.089-.151.089-.346-.009-.536l-4.879-8.916a.022.022 0 0 1 0-.022L22.139.756c.095-.191.097-.387.006-.535C22.056.078 21.894 0 21.686 0h-3.498zM3.648 4.74c-.211 0-.385.074-.473.216-.09.149-.078.339.02.531l2.34 4.05a.022.022 0 0 1 0 .021L1.86 16.051c-.099.188-.093.381 0 .529.085.142.239.234.45.234h3.461c.518 0 .766-.348.945-.667l3.734-6.609-2.378-4.155c-.172-.315-.434-.659-.962-.659H3.648z",
  },
  whatsapp: {
    name: "WhatsApp",
    farbe: "hover:bg-[#25D366] hover:text-white hover:ring-[#25D366]",
    link: ({ u, t }) => `https://wa.me/?text=${t}%20${u}`,
    pfad: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z",
  },
  facebook: {
    name: "Facebook",
    farbe: "hover:bg-[#1877F2] hover:text-white hover:ring-[#1877F2]",
    link: ({ u }) => `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    popup: true,
    pfad: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647z",
  },
  x: {
    name: "X",
    farbe: "hover:bg-black hover:text-white hover:ring-black",
    link: ({ u, t }) => `https://x.com/intent/post?text=${t}&url=${u}`,
    popup: true,
    pfad: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z",
  },
  telegram: {
    name: "Telegram",
    farbe: "hover:bg-[#26A5E4] hover:text-white hover:ring-[#26A5E4]",
    link: ({ u, t }) => `https://t.me/share/url?url=${u}&text=${t}`,
    pfad: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  },
};

function Marke({ pfad }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor">
      <path d={pfad} />
    </svg>
  );
}

export default function Teilen({
  url,
  titel,
  text,
  netze = ["linkedin", "xing", "whatsapp", "facebook", "x"],
  kampagne = "teilen",
  kompakt = false,
  label = "Teilen",
  className,
}) {
  const [kopiert, setKopiert] = useState(false);
  const [nativ, setNativ] = useState(false);

  useEffect(() => {
    setNativ(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const mitUtm = (quelle) => {
    try {
      const u = new URL(url);
      u.searchParams.set("utm_source", quelle);
      u.searchParams.set("utm_medium", "social");
      u.searchParams.set("utm_campaign", kampagne);
      return u.toString();
    } catch {
      return url;
    }
  };

  const oeffnen = (e, netz) => {
    if (!NETZE[netz].popup) return;
    const w = 600;
    const h = 560;
    const fenster = window.open(e.currentTarget.href, "teilen", `width=${w},height=${h},left=${(window.screen.width - w) / 2},top=${(window.screen.height - h) / 2},noopener,noreferrer`);
    if (fenster !== null) e.preventDefault();
  };

  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const feld = document.createElement("textarea");
      feld.value = url;
      document.body.appendChild(feld);
      feld.select();
      document.execCommand("copy");
      feld.remove();
    }
    setKopiert(true);
    setTimeout(() => setKopiert(false), 2200);
  };

  const nativTeilen = async () => {
    try {
      await navigator.share({ title: titel, text: text || titel, url: mitUtm("native") });
    } catch {
      /* abgebrochen */
    }
  };

  const knopf =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink-700 ring-1 ring-inset ring-ink-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500";

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2.5", className)}>
      {!kompakt && <p className="mr-1 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</p>}
      <ul className="flex flex-wrap items-center gap-2">
        {nativ && (
          <li className="sm:hidden">
            <button type="button" onClick={nativTeilen} className={cn(knopf, "w-auto gap-2 bg-navy-950 px-4 text-[14px] font-semibold text-white ring-navy-950")}>
              <Share2 aria-hidden="true" className="h-4 w-4" />
              Teilen
            </button>
          </li>
        )}
        {netze.map((n) => {
          const netz = NETZE[n];
          if (!netz) return null;
          const href = netz.link({ u: encodeURIComponent(mitUtm(n)), t: encodeURIComponent(titel) });
          return (
            <li key={n}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={(e) => oeffnen(e, n)}
                aria-label={`Auf ${netz.name} teilen`}
                title={`Auf ${netz.name} teilen`}
                className={cn(knopf, netz.farbe)}
              >
                <Marke pfad={netz.pfad} />
              </a>
            </li>
          );
        })}
        <li>
          <a
            href={`mailto:?subject=${encodeURIComponent(titel)}&body=${encodeURIComponent(`${text ? `${text}\n\n` : ""}${mitUtm("email")}`)}`}
            aria-label="Per E-Mail teilen"
            title="Per E-Mail teilen"
            className={cn(knopf, "hover:bg-ov-500 hover:text-white hover:ring-ov-500")}
          >
            <Mail aria-hidden="true" className="h-[18px] w-[18px]" />
          </a>
        </li>
        <li>
          <button
            type="button"
            onClick={kopieren}
            aria-label={kopiert ? "Link kopiert" : "Link kopieren"}
            title="Link kopieren"
            className={cn(knopf, kopiert ? "bg-ov-500 text-white ring-ov-500" : "hover:bg-navy-950 hover:text-white hover:ring-navy-950")}
          >
            {kopiert ? <Check aria-hidden="true" className="h-[18px] w-[18px]" /> : <Link2 aria-hidden="true" className="h-[18px] w-[18px]" />}
          </button>
        </li>
      </ul>
      <span role="status" aria-live="polite" className={kopiert ? "text-[13px] font-medium text-ov-700" : "sr-only"}>
        {kopiert ? "Link kopiert" : ""}
      </span>
    </div>
  );
}
