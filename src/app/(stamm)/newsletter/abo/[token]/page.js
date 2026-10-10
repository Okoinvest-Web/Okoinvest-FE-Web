// src/app/(stamm)/newsletter/abo/[token]/page.js – Bestätigen und Verwalten eines Newsletter-Abos (Welle 3, Paket NL)
//
// Ein Link für beides (src/lib/newsletter/dienst.js):
//   offen       → Bestätigungsseite mit Knopf (POST /api/newsletter/bestaetigen) – ein GET bestätigt nie
//   aktiv       → Land und Themen, Abmeldung mit einem Klick (POST /api/newsletter/abmelden)
//   abgemeldet | ersetzt | abgelaufen | unbekannt → neutraler Hinweis
// noindex/nofollow, kein Referrer (Token in der Adresse), dynamisch, nicht in der Sitemap, keine Länderfassung
// (src/lib/land/zonen.js OHNE_LAND). Die Seite zeigt nie Personendaten (auch nicht die E-Mail-Adresse).

import { MailCheck, MailX } from "lucide-react";
import Link from "@/components/Land/Link";
import AboAktion from "@/components/Newsletter/AboAktion";
import { lesen } from "@/lib/newsletter/dienst";
import { THEMEN, themaIn } from "@/lib/newsletter/themen";
import { DOI, KENNZEICHNUNG_RECHT } from "@/lib/newsletter/texte";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = {
  title: "Newsletter | ÖkoInvest",
  description: "Newsletter-Anmeldung bestätigen oder abmelden.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
  referrer: "no-referrer",
  alternates: { canonical: null },
};

const LAND = { de: { DE: "Deutschland", AT: "Österreich", CH: "die Schweiz" }, en: { DE: "Germany", AT: "Austria", CH: "Switzerland" } };

const TEXTE = {
  de: {
    fehler: ["Gerade nicht erreichbar", "Bitte versuchen Sie es in einigen Minuten erneut."],
    offenZusatz: "Mit der Bestätigung ist Ihre Anmeldung aktiv. Haben Sie nichts bestellt, schließen Sie diese Seite einfach – Ihre Angaben verfallen dann automatisch.",
    aktivTitel: "Ihr Newsletter",
    aktivText: (l) => `Sie erhalten den Newsletter für ${LAND.de[l] || "Ihr Land"} zu diesen Themen:`,
    abmeldenText: "Abmelden geht mit einem Klick und wirkt sofort für alle Newsletter an Ihre Adresse. Ihre Adresse löschen wir dabei; den Nachweis Ihrer Einwilligung bewahren wir ohne Adresse auf.",
    abmelden: "Jetzt abmelden",
    aendern: "Themen oder Land ändern? Melden Sie sich einfach neu an – nach der Bestätigung ersetzt die neue Anmeldung die alte.",
    neu: "Zur Anmeldung",
    zustand: {
      abgemeldet: ["Sie sind abgemeldet", "Über diesen Link erhalten Sie keinen Newsletter mehr. Ihre Adresse ist gelöscht."],
      ersetzt: ["Diese Anmeldung wurde ersetzt", "Eine neuere, bestätigte Anmeldung an dieselbe Adresse gilt jetzt. Abmelden können Sie sich auch hier – das beendet alle Newsletter an Ihre Adresse."],
      abgelaufen: ["Dieser Link ist abgelaufen", "Bestätigungslinks gelten 48 Stunden. Danach löschen wir die Angaben. Sie können sich jederzeit neu anmelden."],
      unbekannt: ["Dieser Link ist ungültig", "Über diesen Link besteht keine Anmeldung. Sie erhalten darüber keinen Newsletter."],
    },
  },
  en: {
    fehler: ["Currently unavailable", "Please try again in a few minutes."],
    offenZusatz: "Once confirmed, your subscription is active. If you did not subscribe, simply close this page – your details will then be deleted automatically.",
    aktivTitel: "Your newsletter",
    aktivText: (l) => `You receive the newsletter for ${LAND.en[l] || "your country"} on these topics:`,
    abmeldenText: "Unsubscribing takes one click and applies immediately to all newsletters sent to your address. We delete your address; we keep the record of your consent without the address.",
    abmelden: "Unsubscribe now",
    aendern: "Want to change topics or country? Simply subscribe again – once confirmed, the new subscription replaces the old one.",
    neu: "Go to subscription",
    zustand: {
      abgemeldet: ["You are unsubscribed", "You no longer receive the newsletter via this link. Your address has been deleted."],
      ersetzt: ["This subscription was replaced", "A newer, confirmed subscription for the same address now applies. You can also unsubscribe here – this ends all newsletters to your address."],
      abgelaufen: ["This link has expired", "Confirmation links are valid for 48 hours. After that we delete the details. You can subscribe again at any time."],
      unbekannt: ["This link is invalid", "There is no subscription for this link. You do not receive a newsletter via it."],
    },
  },
};

function Rahmen({ sprache = "de", children }) {
  return (
    <div lang={sprache} className="mx-auto max-w-[680px] px-4 pb-16 pt-28 sm:px-6 md:pt-32">
      <section className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/80 md:p-9">{children}</section>
      <p className="mt-4 text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-500">{sprache === "en" ? "Draft · legal review" : KENNZEICHNUNG_RECHT}</p>
    </div>
  );
}

const H1 = "font-display text-[clamp(1.5rem,1.2rem+1vw,2rem)] font-extrabold leading-tight tracking-tight text-ink-900";
const KNOPF = "mt-6 inline-flex min-h-11 items-center rounded-full bg-ov-600 px-5 text-[15px] font-semibold text-white hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2";
const SYMBOL = "flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200";

export default async function NewsletterAboSeite({ params }) {
  const { token } = await params;
  let r;
  try {
    r = await lesen({ token });
  } catch {
    return (
      <Rahmen>
        <h1 className={H1}>{TEXTE.de.fehler[0]}</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-700">{TEXTE.de.fehler[1]}</p>
      </Rahmen>
    );
  }
  const sprache = r?.abo?.sprache === "en" ? "en" : "de";
  const t = TEXTE[sprache];

  if (r?.zustand === "offen") {
    const d = DOI[sprache];
    return (
      <Rahmen sprache={sprache}>
        <span aria-hidden="true" className={SYMBOL}>
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className={`mt-5 ${H1}`}>{d.titel}</h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-ink-700">{d.text}</p>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{t.offenZusatz}</p>
        <div className="mt-7">
          <AboAktion token={token} art="bestaetigen" sprache={sprache}>
            {d.knopf}
          </AboAktion>
        </div>
      </Rahmen>
    );
  }

  if (r?.zustand === "aktiv") {
    const gewaehlt = THEMEN.filter((x) => r.abo.themen?.includes(x.id)).map((x) => themaIn(x, sprache));
    return (
      <Rahmen sprache={sprache}>
        <span aria-hidden="true" className={SYMBOL}>
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className={`mt-5 ${H1}`} data-newsletter-zustand="aktiv">
          {t.aktivTitel}
        </h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-ink-700">{t.aktivText(r.abo.land)}</p>
        <ul className="mt-3 space-y-2">
          {gewaehlt.map((x) => (
            <li key={x.id} className="rounded-2xl bg-sand-50 px-4 py-3 ring-1 ring-ink-200/60">
              <span className="block text-[14.5px] font-semibold text-ink-900">{x.titel}</span>
              <span className="block text-[13px] leading-snug text-ink-600">{x.text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 border-t border-ink-100 pt-6">
          <p className="flex items-start gap-2 text-[14px] leading-relaxed text-ink-600">
            <MailX aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
            {t.abmeldenText}
          </p>
          <div className="mt-5">
            <AboAktion token={token} art="abmelden" sprache={sprache}>
              {t.abmelden}
            </AboAktion>
          </div>
          <p className="mt-6 text-[13.5px] leading-relaxed text-ink-600">
            {t.aendern}{" "}
            <Link href={sprache === "en" ? "/en/newsletter" : "/newsletter"} className="font-medium text-ov-700 underline underline-offset-2">
              {t.neu}
            </Link>
          </p>
        </div>
      </Rahmen>
    );
  }

  // Endzustände: Sprache aus dem Grabstein (ohne Personendaten), sonst Deutsch
  const ts = TEXTE[r?.sprache === "en" ? "en" : "de"];
  const [titel, text] = ts.zustand[r?.zustand] || ts.zustand.unbekannt;
  const spracheEnde = r?.sprache === "en" ? "en" : "de";
  return (
    <Rahmen sprache={spracheEnde}>
      <h1 className={H1} data-newsletter-zustand={r?.zustand || "unbekannt"}>
        {titel}
      </h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-ink-700">{text}</p>
      {r?.zustand === "ersetzt" && (
        <div className="mt-6">
          <AboAktion token={token} art="abmelden" sprache={spracheEnde}>
            {ts.abmelden}
          </AboAktion>
        </div>
      )}
      <Link href={spracheEnde === "en" ? "/en/newsletter" : "/newsletter"} className={KNOPF}>
        {ts.neu}
      </Link>
    </Rahmen>
  );
}
