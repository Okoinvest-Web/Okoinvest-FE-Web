// src/app/manifest.js – Web-App-Manifest der ÖkoInvest-Website
export default function manifest() {
  return {
    name: "ÖkoInvest – Flächen, Projekte, Kapital, Strom",
    short_name: "ÖkoInvest",
    description: "Projektentwicklung für Freiflächen-PV, Agri-PV und Solarcarports – mit Projektbörse, Investoren-Plattform und virtuellem Kraftwerk.",
    start_url: "/",
    display: "standalone",
    background_color: "#03122b",
    theme_color: "#669933",
    lang: "de",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
