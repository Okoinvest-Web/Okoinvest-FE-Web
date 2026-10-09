"use client";

// src/components/formular/useFormular.js
//
// Formularzustand mit Inline-Validierung beim Verlassen des Felds (danach live beim Korrigieren),
// Erfolgshäkchen für gültige, berührte Felder und Fokusführung zum ersten Fehler (+ Schütteln).
// Die maßgebliche Prüfung bleibt serverseitig – das hier ist Nutzerführung.
//
//   const form = useFormular({ email: "" }, { email: [regel.pflicht("…"), regel.email()] });
//   <Textfeld id={`${id}-email`} label="E-Mail" {...form.feld("email")} />
//   onSubmit: if (!form.pruefeAlles()) return;

import { useCallback, useMemo, useRef, useState } from "react";
import { signal } from "@/components/ui/motion";
import { regeln as basisRegeln } from "@/components/Portal/Bedienung/pruefung";
import { passwortFehler } from "@/lib/plattform/validierung";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { meldungFuer } from "@/lib/sprache/meldungen";

/** Prüfregeln: Basis aus Bedienung/pruefung + Formular-spezifische Ergänzungen */
export const regel = {
  ...basisRegeln,
  /** Passwortregel wie auf dem Server (validierung.passwortFehler) */
  passwort: () => (v) => (v ? passwortFehler(v) : ""),
  /** Wert muss einem anderen Feld entsprechen (Passwort wiederholen) */
  gleich: (feld, text = "Die Eingaben stimmen nicht überein.") => (v, alle) => (v && alle?.[feld] && v !== alle[feld] ? text : ""),
  /** Checkbox muss gesetzt sein */
  haken: (text = "Bitte bestätigen Sie diesen Punkt.") => (v) => (v ? "" : text),
  /** Mindestens ein Eintrag in einer Liste */
  auswahl: (text = "Bitte wählen Sie mindestens eine Option.") => (v) => (Array.isArray(v) && v.length ? "" : text),
};

function ersterFehler(liste = [], wert, alle) {
  for (const r of liste) {
    const m = r(wert, alle);
    if (m) return m;
  }
  return "";
}

const leer = (v) => v === undefined || v === null || v === "" || v === false || (Array.isArray(v) && !v.length);

export default function useFormular(startwerte, schema = {}) {
  const [werte, setWerte] = useState(startwerte);
  const [fehler, setFehler] = useState({});
  const [beruehrt, setBeruehrt] = useState({});
  const werteRef = useRef(startwerte);
  const beruehrtRef = useRef({});
  const formRef = useRef(null);
  const sprache = useSprache();

  const markiere = useCallback((neu) => {
    beruehrtRef.current = neu;
    setBeruehrt(neu);
  }, []);

  const pruefe = useCallback(
    (feld, alle = werteRef.current) => {
      const m = ersterFehler(schema[feld], alle?.[feld], alle);
      setFehler((f) => (f[feld] === m ? f : { ...f, [feld]: m }));
      return !m;
    },
    [schema]
  );

  /** Wert setzen; berührte Felder live nachprüfen (auch abhängige, z. B. „Passwort wiederholen“) */
  const setze = useCallback(
    (feld, wert) => {
      const neu = { ...werteRef.current, [feld]: wert };
      werteRef.current = neu;
      setWerte(neu);
      const b = beruehrtRef.current;
      const geprueft = {};
      for (const k of Object.keys(schema)) if (b[k]) geprueft[k] = ersterFehler(schema[k], neu[k], neu);
      if (Object.keys(geprueft).length) setFehler((f) => ({ ...f, ...geprueft }));
    },
    [schema]
  );

  /** Mehrere Werte auf einmal (z. B. Entwurf wiederherstellen, Demo-Konto übernehmen) */
  const setzeAlle = useCallback((teil) => {
    const neu = { ...werteRef.current, ...teil };
    werteRef.current = neu;
    setWerte(neu);
  }, []);

  const verlassen = useCallback(
    (feld) => {
      if (!beruehrtRef.current[feld]) markiere({ ...beruehrtRef.current, [feld]: true });
      pruefe(feld);
    },
    [pruefe, markiere]
  );

  /** Alles prüfen; erstes fehlerhaftes Feld fokussieren und schütteln. Rückgabe: true = gültig */
  const pruefeAlles = useCallback(() => {
    const alle = werteRef.current;
    const neu = {};
    for (const k of Object.keys(schema)) neu[k] = ersterFehler(schema[k], alle[k], alle);
    setFehler(neu);
    markiere(Object.fromEntries(Object.keys(schema).map((k) => [k, true])));
    const erster = Object.keys(neu).find((k) => neu[k]);
    if (erster && typeof document !== "undefined") {
      requestAnimationFrame(() => {
        const wurzel = formRef.current || document;
        const el = wurzel.querySelector(`[data-feld="${erster}"]`);
        if (el) {
          el.focus();
          signal(el.closest("[data-feld-huelle]") || el, "schuetteln");
        }
      });
    }
    return !erster;
  }, [schema, markiere]);

  /** Serverfehler einem Feld zuordnen (z. B. „E-Mail bereits registriert“) */
  const setzeFehler = useCallback(
    (feld, text) => {
      setFehler((f) => ({ ...f, [feld]: text }));
      markiere({ ...beruehrtRef.current, [feld]: true });
    },
    [markiere]
  );

  const istGueltig = (name) => !!beruehrt[name] && !fehler[name] && !leer(werte[name]);

  /** Props für Textfeld/PasswortFeld (checkbox: true → checked statt value) */
  const feld = (name, { checkbox = false } = {}) => ({
    name,
    "data-feld": name,
    ...(checkbox
      ? {
          checked: !!werte[name],
          onChange: (e) => {
            setze(name, e.target.checked);
            verlassen(name);
          },
        }
      : { value: werte[name] ?? "", onChange: (e) => setze(name, e.target.value) }),
    onBlur: () => verlassen(name),
    fehler: beruehrt[name] ? meldungFuer(fehler[name], sprache) : "",
    gueltig: istGueltig(name),
  });

  const anzahlFehler = useMemo(() => Object.values(fehler).filter(Boolean).length, [fehler]);

  return { werte, setze, setzeAlle, fehler, beruehrt, feld, gueltig: istGueltig, pruefe, pruefeAlles, verlassen, setzeFehler, anzahlFehler, formRef };
}
