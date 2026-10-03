import NichtGefundenSeite from "@/components/Wurzel/NichtGefundenSeite";

export const metadata = {
  title: "Seite nicht gefunden | ÖkoInvest",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NichtGefundenSeite />;
}
