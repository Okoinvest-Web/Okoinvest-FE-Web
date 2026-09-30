// src/lib/plattform/portfolio/pdf.js
//
// PDF des Quartals- bzw. Jahresberichts einer Portfolio-Position (nur serverseitig, nutzt dienste/pdf.js → server/pdf.js).

import { dokumentePdf } from "../dienste/pdf";
import { berichtDokumente } from "./bericht";

const dateiName = (s) => String(s || "bericht").normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(0, 80);

/** { pdf, name } aus pfBerichtDaten ({ stammdaten, bericht, empfaenger }) */
export function portfolioBerichtPdf({ stammdaten, bericht, empfaenger = "" }, { demo = false, erzeugtAm = new Date().toISOString() } = {}) {
  const dokumente = berichtDokumente(stammdaten, bericht, { empfaenger, erzeugtAm });
  const pdf = dokumentePdf(dokumente, { titel: dokumente[0].titel, kennzeichen: `VERTRAULICH · PORTFOLIO · ${bericht.periode}`, demo });
  return { pdf, name: `${dateiName(`${stammdaten.id}-${bericht.art === "jahr" ? "jahresbericht" : "quartalsbericht"}-${bericht.periode}`)}.pdf` };
}
