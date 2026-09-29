import PrivacyPolicy from "@/components/Datenschutz/datenschutz";
import LegalShell from "@/components/Reusable/LegalShell";
import { hreflangLanguages } from "@/lib/hreflang";

export const metadata = {
  alternates: { canonical: "https://www.oekovolt.de/datenschutz", languages: hreflangLanguages("https://www.oekovolt.de/datenschutz") },
  title: "Datenschutzerklärung | Ökovolt GmbH Solartechnik",
  description:
    "Datenschutz bei Ökovolt: Erfahren Sie, wie wir Ihre personenbezogenen Daten schützen, verarbeiten und welche Rechte Ihnen nach DSGVO zustehen.",
  keywords: [
    "Datenschutz",
    "ÖKOVOLT GmbH",
    "DSGVO",
    "Google Analytics",
    "Cookies",
  ],
  openGraph: {
    type: "website",
    url: "https://www.oekovolt.de/datenschutz",
    title: "Datenschutzerklärung | Ökovolt GmbH Solartechnik",
    description: "Datenschutzrechtliche Bestimmungen und Ihre Rechte bei ÖKOVOLT GmbH.",
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

export default function DatenschutzPage() {
  return (
    <LegalShell titel="Datenschutzerklärung" pfad="/datenschutz" lead="Wie wir Ihre personenbezogenen Daten verarbeiten und welche Rechte Ihnen nach der DSGVO zustehen.">
      <PrivacyPolicy />
    </LegalShell>
  );
}
