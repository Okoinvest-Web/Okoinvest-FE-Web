import Impressum from "@/components/Impressum/impressum";
import LegalShell from "@/components/Reusable/LegalShell";
import { hreflangLanguages } from "@/lib/hreflang";

export const metadata = {
  alternates: { canonical: "https://www.oekovolt.de/impressum", languages: hreflangLanguages("https://www.oekovolt.de/impressum") },
  title: "Impressum | Ökovolt Deutschland",
  description: "Impressum der ÖKOVOLT GmbH Solartechnik in Türkheim: Anschrift, Vertretung, Registereintrag, Umsatzsteuer-ID und Haftungshinweise.",
  keywords: ["Impressum ÖKOVOLT GmbH", "Photovoltaik GmbH Impressum", "Rechtsform ÖKOVOLT", "Kontakt ÖKOVOLT", "Haftungshinweise ÖKOVOLT"],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website", locale: "de_DE",
    url: "https://www.oekovolt.de/impressum",
    siteName: "Ökovolt Deutschland",
    title: "Impressum | Ökovolt Deutschland",
    description: "Rechtliche Informationen der ÖKOVOLT GmbH Solartechnik.",
    images: [{ url: "https://www.oekovolt.de/og-image.jpg", width: 1200, height: 630, alt: "Ökovolt Deutschland" }],
  },
};

export default function ImpressumPage() {
  return (
    <LegalShell titel="Impressum" pfad="/impressum" lead="Angaben gemäß § 5 DDG zur ÖKOVOLT GmbH Solartechnik.">
      <Impressum />
    </LegalShell>
  );
}
