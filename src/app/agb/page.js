import AGComponent from "@/components/Agb/agb";
import LegalShell from "@/components/Reusable/LegalShell";
import { hreflangLanguages } from "@/lib/hreflang";

export const metadata = {
  title: "Allgemeine Geschäftsbedingungen (AGB) | Ökovolt",
  alternates: { canonical: "https://www.oekovolt.de/agb", languages: hreflangLanguages("https://www.oekovolt.de/agb") },
  description:
    "Die Allgemeinen Geschäftsbedingungen der Ökovolt GmbH Solartechnik – transparent und verständlich. Informieren Sie sich über unsere Vertragsbedingungen.",
  keywords: [
    "AGB",
    "ÖKOVOLT GmbH",
    "Solarenergie Lösungen",
    "Photovoltaikanlagen",
    "Installationsdienstleistungen",
  ],
  openGraph: {
    type: "website",
    url: "https://www.oekovolt.de/agb",
    title: "Allgemeine Geschäftsbedingungen (AGB) | Ökovolt",
    description: "Die Allgemeinen Geschäftsbedingungen der Ökovolt GmbH Solartechnik – transparent und verständlich. Informieren Sie sich über unsere Vertragsbedingungen.",
    images: [
      {
        url: "https://www.oekovolt.de/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Ökovolt Deutschland",
      },
    ],
  },
};

export default function AgbPage() {
  return (
    <LegalShell titel="Allgemeine Geschäftsbedingungen" pfad="/agb" lead="Die Vertragsbedingungen der ÖKOVOLT GmbH Solartechnik.">
      <AGComponent />
    </LegalShell>
  );
}
