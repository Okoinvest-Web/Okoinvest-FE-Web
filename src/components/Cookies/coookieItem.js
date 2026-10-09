// CookieDetails.js – Detailangaben zu einem Dienst im Cookie-Banner
import React from "react";

const TEXTE = {
  de: { zweck: "Zweck:", anbieter: "Anbieter:", telefon: "Telefon", email: "E-Mail", dse: "Datenschutzerklärung des Anbieters", cookies: "Verwendete Cookies:", laufzeit: "Laufzeit", speicher: "Lokaler Speicher (Local Storage):", drittland: "Datenverarbeitung in Drittländern:", garantie: "Garantie für die Übermittlung:" },
  en: { zweck: "Purpose:", anbieter: "Provider:", telefon: "Phone", email: "Email", dse: "Provider's privacy policy", cookies: "Cookies used:", laufzeit: "duration", speicher: "Local storage:", drittland: "Data processing in third countries:", garantie: "Safeguard for the transfer:" },
};

const CookieDetails = ({ service, sprache = "de" }) => {
  const t = sprache === "en" ? TEXTE.en : TEXTE.de;
  const kontakt = service?.contact || {};
  const laender = service?.dataProcessing?.countries || [];
  const mechanismen = service?.dataProcessing?.mechanisms || [];
  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm space-y-3">
      <p>
        <strong>{t.zweck}</strong> {service?.purpose}
      </p>

      <p className="font-medium mt-2">{t.anbieter}</p>
      <p>{service?.provider}</p>
      <ul className="list-disc pl-5 space-y-1">
        {kontakt.phone && <li>{t.telefon}: {kontakt.phone}</li>}
        {kontakt.email && <li>{t.email}: {kontakt.email}</li>}
        {kontakt.privacy && (
          <li>
            <a href={kontakt.privacy} target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:underline">
              {t.dse}
            </a>
          </li>
        )}
      </ul>

      {service?.cookies?.length > 0 && (
        <>
          <p className="font-medium mt-2">{t.cookies}</p>
          <ul className="list-disc pl-5 space-y-1">
            {service.cookies.map((cookie) => (
              <li key={cookie.name}>
                <strong>{cookie.name}</strong>
                {cookie.type ? ` · ${cookie.type}` : ""}
                {cookie.host ? ` · ${cookie.host}` : ""}
                {cookie.duration ? ` · ${t.laufzeit} ${cookie.duration}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}

      {service?.storage?.length > 0 && (
        <>
          <p className="font-medium mt-2">{t.speicher}</p>
          <ul className="list-disc pl-5 space-y-1">
            {service.storage.map((item) => (
              <li key={item.name}>
                <strong>{item.name}</strong> ({item.type}) – {item.host} – {item.duration}
              </li>
            ))}
          </ul>
        </>
      )}

      {laender.length > 0 && (
        <p className="mt-2">
          <span className="font-medium">{t.drittland}</span> {laender.map((l) => l.name).join(", ")}
        </p>
      )}

      {mechanismen.length > 0 && (
        <p className="mt-2">
          <span className="font-medium">{t.garantie}</span> {mechanismen.map((m) => m.name).join(", ")}
        </p>
      )}
    </div>
  );
};

export default CookieDetails;
