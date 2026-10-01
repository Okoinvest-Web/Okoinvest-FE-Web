# WP3 Energiedaten, Verteilung, Simulation, Prognose

Stand 01.10.2026. Vertrag: [EG-SCHNITTSTELLEN.md](../EG-SCHNITTSTELLEN.md), Abschnitt 4 (WP3). Fachlich: [EG-FACHKONZEPT.md](../EG-FACHKONZEPT.md) 3.12, 4.1–4.10.

## Dateien

| Bereich | Dateien |
|---|---|
| Reine Regeln | `src/lib/plattform/eg/{messwerte,qualitaet,verteilung,simulation,prognose,optimierung,speicher}.js` |
| Python-Spiegel | `Backend-Import/.../plattform/eg_energie_kern.py`, Tests `plattform/tests/test_eg_energie_kern.py` (ohne Frappe), `test_eg_energie.py` (Bench) |
| Testvektoren | `src/lib/plattform/eg/testdaten/energie/vektoren.json`, erzeugt mit `node scripts/eg-energie-testdaten.mjs` (`--pruefen`) |
| Backend | `backend/demo/eg-energie.js`, `backend/demo/eg-energie-seed.js` (synthetische Daten, nichts gespeichert), `backend/frappe/eg-energie.js`, `plattform/api/eg_energie.py` |
| DocTypes | Plattform EG Messreihe (`EMR`, Tagesblock), Plattform EG Messmonat (`EMM`), Plattform EG Simulation (`ESI`) |
| Seiten | `/portal/admin/eg/[id]/energiedaten`, `/portal/admin/eg/simulation` (`?gemeinschaft=`), `/portal/admin/eg/[id]/simulation` (Weiterleitung), `/portal/eg/[id]/energie` (Organe) |
| APIs | `/api/admin/eg/[id]/energiedaten` (GET `ansicht=dashboard|qualitaet|abweichung|prognose|messreihen|optimierung|perioden`, POST `aktion=csv|reklamieren|empfangen`), `/api/admin/eg/simulation`, `/api/portal/eg/[id]/energie` |
| Tests | `node scripts/plattform-test-eg-energie.mjs --nur-logik` bzw. gegen den Server |

## Ergänzungen der Signaturen (abwärtskompatibel)

- `enMessreihen(n, {…, aufloesung: "viertelstunde"|"tag"|"monat"})` – Summen je Tag bzw. Monat (Dashboard).
- `enPeriodenwerte` liefert je Zählpunkt zusätzlich `groessenJeZeitfenster` (Zeitfenster-ID des gültigen Tarifs, `""` = Grundpreis) und `groessenJeTarif` (`{tarifId: {zeitfenster: {groesse: kWh}}}`) für TOU (Wunsch WP4), außerdem `fehlendeWerte`, `l3Werte`, `abrechenbar`.
- `enQualitaet(n, gid, {monat, reklamation?: {zaehlpunktId, von, bis, gruende}})` – mit `reklamation` wird die Nachforderung über WP2 (`edaNachforderung`, Python `eg_eda.nachforderung_intern`) gestellt; solange WP2 501 liefert, Status „vorgemerkt“.
- `enCsvImport(n, gid, {csv, zaehlpunktId?, datei?, ausfuehren = true})` – `ausfuehren: false` = Vorschau.
- `enSimulation(n, {daten: {…, gemeinschaftId?, nurVorlage?, speichern?}})`, `enPrognose(n, gid, {tage?, wetter?})`.
- Zusatz-Export `enDashboard(n, gid)` (Demo und Frappe), nicht in `EG_OPERATIONEN`.
- Öffentlicher Simulationskern für WP6: `simulationOeffentlich(daten)` aus `eg/simulation.js` (keine Namen, ≤ 30 Teilnehmer, ohne Eingabe im Ergebnis).

## Patch an WP1

1. `Backend-Import/werkzeuge/desk_rechte.py` (EG-Block): DocTypes „Plattform EG Messreihe“, „Plattform EG Messmonat“, „Plattform EG Simulation“ wie „Plattform EG Zaehlpunkt“ (System Manager schreiben; ÖkoInvest Admin, Buchhaltung, Leser, Energie lesen). Bis dahin meldet `pruefen.py` drei Warnungen (0 Fehler).
2. `docs/API.md` (Abschnitt Energiegemeinschaften): Routen und Ergänzungen oben übernehmen.
3. `eg/navigation.js`: Reiter „Energiedaten“ zeigt auf `/energiedaten` (vorhanden); `EG_BROTKRUMEN` hat `simulation` und `energiedaten` (vorhanden), `energie` fehlt für den Organ-Reiter → bitte `energie: "Energiedaten"` ergänzen.
