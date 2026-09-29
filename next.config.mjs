/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ausgabeverzeichnis umschaltbar (wie oekovolt.de): Build-Verifikation läuft
  // mit NEXT_DIST_DIR=.next-verify neben einem laufenden Server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  trailingSlash: false,
  compress: true,
  poweredByHeader: false,

  async headers() {
    const sicherheit = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
    ];
    return [
      { source: "/:path*", headers: sicherheit },
      // Portal und Login nie in Suchmaschinen, nie zwischenspeichern
      { source: "/portal/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
      ...["/login", "/registrieren", "/passwort-vergessen"].map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] })),
    ];
  },
};

export default nextConfig;
