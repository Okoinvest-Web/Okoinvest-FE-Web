// src/lib/plattform/backend/demo/crm-ops.js – Sammel-Export der Backoffice-Operationen (Demo)

export { crmKontakte, crmKontakt, crmKontaktSpeichern, crmBeziehung, crmOrganisationen, crmOrganisation, crmOrganisationSpeichern, crmAktivitaetAnlegen, crmDubletten, crmZusammenfuehren, crmMassenaktion } from "./crm";
export { akquise, akquiseSetzen, gebiete, gebieteSpeichern, akquiseZuweisen } from "./akquise";
export { automationen, automationSpeichern, automationLoeschen, automationTestlauf, fristenPruefen, objektTagSetzen } from "./automation";
export { vorlagen, vorlageSpeichern, vorlageWiederherstellen, vorlageVorschau, vorlageSenden } from "./vorlagen";
export { bericht } from "./berichte";
export { backofficeRechte, backofficeRollenSetzen, protokollKette } from "./rechte";
