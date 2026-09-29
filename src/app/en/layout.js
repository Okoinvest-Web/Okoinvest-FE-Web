import EnKopfleiste from "@/components/En/EnKopfleiste";

/**
 * Rahmen aller englischen Seiten. <html lang> bleibt global "de" (Root-Layout);
 * der Inhalt wird hier als Englisch ausgezeichnet, damit Screenreader und
 * Suchmaschinen die Sprache korrekt erkennen.
 */
export default function EnLayout({ children }) {
  return (
    <div lang="en">
      <EnKopfleiste />
      {children}
    </div>
  );
}
