// CookieDetails.js – Detailangaben zu einem Dienst im Cookie-Banner
import React from "react";

const CookieDetails = ({ service }) => {
  const kontakt = service?.contact || {};
  const laender = service?.dataProcessing?.countries || [];
  const mechanismen = service?.dataProcessing?.mechanisms || [];
  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm space-y-3">
      <p>
        <strong>Zweck:</strong> {service?.purpose}
      </p>

      <p className="font-medium mt-2">Anbieter:</p>
      <p>{service?.provider}</p>
      <ul className="list-disc pl-5 space-y-1">
        {kontakt.phone && <li>Telefon: {kontakt.phone}</li>}
        {kontakt.email && <li>E-Mail: {kontakt.email}</li>}
        {kontakt.privacy && (
          <li>
            <a href={kontakt.privacy} target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:underline">
              Datenschutzerklärung des Anbieters
            </a>
          </li>
        )}
      </ul>

      {service?.cookies?.length > 0 && (
        <>
          <p className="font-medium mt-2">Verwendete Cookies:</p>
          <ul className="list-disc pl-5 space-y-1">
            {service.cookies.map((cookie) => (
              <li key={cookie.name}>
                <strong>{cookie.name}</strong>
                {cookie.type ? ` · ${cookie.type}` : ""}
                {cookie.host ? ` · ${cookie.host}` : ""}
                {cookie.duration ? ` · Laufzeit ${cookie.duration}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}

      {service?.storage?.length > 0 && (
        <>
          <p className="font-medium mt-2">Lokaler Speicher (Local Storage):</p>
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
          <span className="font-medium">Datenverarbeitung in Drittländern:</span> {laender.map((l) => l.name).join(", ")}
        </p>
      )}

      {mechanismen.length > 0 && (
        <p className="mt-2">
          <span className="font-medium">Garantie für die Übermittlung:</span> {mechanismen.map((m) => m.name).join(", ")}
        </p>
      )}
    </div>
  );
};

export default CookieDetails;
