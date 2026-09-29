// src/lib/plattform/backend/demo/pdf.js
//
// Minimaler PDF-Erzeuger für Demo-Dokumente (eine Seite, Helvetica, WinAnsi).
// Dient nur dazu, dass Datenraum und Downloads in der Vorführung echte Dateien liefern.

const WIN_ANSI = { "ä": "\\344", "ö": "\\366", "ü": "\\374", "Ä": "\\304", "Ö": "\\326", "Ü": "\\334", "ß": "\\337", "–": "\\226", "€": "\\200", "·": "\\267" };

function pdfText(s) {
  return String(s)
    .replace(/[\\()]/g, (z) => `\\${z}`)
    .replace(/[äöüÄÖÜß–€·]/g, (z) => WIN_ANSI[z])
    .replace(/[^\x20-\x7e\\0-9]/g, "?");
}

export function demoPdf(titel, zeilen = []) {
  const inhalt = [
    "BT /F1 20 Tf 60 780 Td (" + pdfText(titel) + ") Tj ET",
    "BT /F1 10 Tf 60 758 Td (" + pdfText("DEMO-DOKUMENT – fiktive Angaben, kein echtes Projekt") + ") Tj ET",
    ...zeilen.map((z, i) => `BT /F1 12 Tf 60 ${720 - i * 20} Td (${pdfText(z)}) Tj ET`),
  ].join("\n");

  const objekte = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(inhalt, "latin1")} >>\nstream\n${inhalt}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objekte.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objekte.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objekte.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
