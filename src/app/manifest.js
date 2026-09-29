export default function manifest() {
  return {
    name: "Ökovolt Solartechnik Deutschland",
    short_name: "Ökovolt",
    description: "Photovoltaik, Stromspeicher, Wallbox & Wärmepumpe – mit Rechnern und Live-Strompreis.",
    start_url: "/",
    display: "standalone",
    background_color: "#03122b",
    theme_color: "#669933",
    lang: "de-DE",
    icons: [{ src: "/logo_blue.png", sizes: "any", type: "image/png" }],
  };
}
