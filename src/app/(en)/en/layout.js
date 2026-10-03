import EnKopfleiste from "@/components/En/EnKopfleiste";

/**
 * Rahmen aller englischen Seiten. <html lang="en"> setzt das Root-Layout
 * src/app/(en)/layout.js; das div bleibt als zusätzliche Auszeichnung.
 */
export default function EnLayout({ children }) {
  return (
    <div lang="en">
      <EnKopfleiste />
      {children}
    </div>
  );
}
