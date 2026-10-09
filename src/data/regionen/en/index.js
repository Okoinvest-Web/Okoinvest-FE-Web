// src/data/regionen/en/index.js – englische Fassungen der Regionalseiten (Sprachmodell).
// Je Region eine Datei mit derselben Struktur wie die deutsche (über uebersetze() darübergelegt);
// NAMEN_EN gilt für alle Regionen (Karte, Listen, Nachbarn). Erzeugt aus den vorhandenen Dateien.

import badenWuerttemberg from "./baden-wuerttemberg";
import bayern from "./bayern";
import berlin from "./berlin";
import brandenburg from "./brandenburg";
import bremen from "./bremen";
import burgenland from "./burgenland";
import hamburg from "./hamburg";
import hessen from "./hessen";
import kaernten from "./kaernten";
import mecklenburgVorpommern from "./mecklenburg-vorpommern";
import niederoesterreich from "./niederoesterreich";
import niedersachsen from "./niedersachsen";
import nordrheinWestfalen from "./nordrhein-westfalen";
import oberoesterreich from "./oberoesterreich";
import rheinlandPfalz from "./rheinland-pfalz";
import saarland from "./saarland";
import sachsen from "./sachsen";
import sachsenAnhalt from "./sachsen-anhalt";
import salzburg from "./salzburg";
import schleswigHolstein from "./schleswig-holstein";
import schweiz from "./schweiz";
import steiermark from "./steiermark";
import thueringen from "./thueringen";
import tirol from "./tirol";
import vorarlberg from "./vorarlberg";
import wien from "./wien";

export const NAMEN_EN = {
  "schleswig-holstein": { name: "Schleswig-Holstein", inName: "in Schleswig-Holstein" },
  "bremen": { name: "Bremen", inName: "in Bremen" },
  "hamburg": { name: "Hamburg", inName: "in Hamburg" },
  "mecklenburg-vorpommern": { name: "Mecklenburg-Western Pomerania", inName: "in Mecklenburg-Western Pomerania" },
  "nordrhein-westfalen": { name: "North Rhine-Westphalia", inName: "in North Rhine-Westphalia" },
  "niedersachsen": { name: "Lower Saxony", inName: "in Lower Saxony" },
  "sachsen-anhalt": { name: "Saxony-Anhalt", inName: "in Saxony-Anhalt" },
  "brandenburg": { name: "Brandenburg", inName: "in Brandenburg" },
  "berlin": { name: "Berlin", inName: "in Berlin" },
  "rheinland-pfalz": { name: "Rhineland-Palatinate", inName: "in Rhineland-Palatinate" },
  "hessen": { name: "Hesse", inName: "in Hesse" },
  "thueringen": { name: "Thuringia", inName: "in Thuringia" },
  "sachsen": { name: "Saxony", inName: "in Saxony" },
  "saarland": { name: "Saarland", inName: "in Saarland" },
  "baden-wuerttemberg": { name: "Baden-Württemberg", inName: "in Baden-Württemberg" },
  "bayern": { name: "Bavaria", inName: "in Bavaria" },
  "vorarlberg": { name: "Vorarlberg", inName: "in Vorarlberg" },
  "tirol": { name: "Tyrol", inName: "in Tyrol" },
  "salzburg": { name: "Salzburg", inName: "in Salzburg" },
  "oberoesterreich": { name: "Upper Austria", inName: "in Upper Austria" },
  "niederoesterreich": { name: "Lower Austria", inName: "in Lower Austria" },
  "wien": { name: "Vienna", inName: "in Vienna" },
  "kaernten": { name: "Carinthia", inName: "in Carinthia" },
  "steiermark": { name: "Styria", inName: "in Styria" },
  "burgenland": { name: "Burgenland", inName: "in Burgenland" },
  "schweiz": { name: "Switzerland", inName: "in Switzerland" },
};

/** Inhalte je Region (nur Regionen mit vollständiger englischer Fassung) */
export const INHALT_EN = {
  "baden-wuerttemberg": badenWuerttemberg,
  "bayern": bayern,
  "berlin": berlin,
  "brandenburg": brandenburg,
  "bremen": bremen,
  "burgenland": burgenland,
  "hamburg": hamburg,
  "hessen": hessen,
  "kaernten": kaernten,
  "mecklenburg-vorpommern": mecklenburgVorpommern,
  "niederoesterreich": niederoesterreich,
  "niedersachsen": niedersachsen,
  "nordrhein-westfalen": nordrheinWestfalen,
  "oberoesterreich": oberoesterreich,
  "rheinland-pfalz": rheinlandPfalz,
  "saarland": saarland,
  "sachsen": sachsen,
  "sachsen-anhalt": sachsenAnhalt,
  "salzburg": salzburg,
  "schleswig-holstein": schleswigHolstein,
  "schweiz": schweiz,
  "steiermark": steiermark,
  "thueringen": thueringen,
  "tirol": tirol,
  "vorarlberg": vorarlberg,
  "wien": wien,
};
