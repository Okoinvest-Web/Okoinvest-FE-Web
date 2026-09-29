// CookieDetails.js
import React from "react";

const CookieDetails = ({ service }) => {
  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm space-y-3">
      <p>
        <strong>Zweck:</strong> {service?.purpose}
      </p>

      <p className="font-medium mt-2">Anbieter:</p>
      <p>{service?.provider}</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Telefon: {service?.contact.phone}</li>
        <li>E-Mail: {service?.contact.email}</li>
        <li>
          <a
            href={service?.contact.privacy}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Datenschutzerklärung des Anbieters
          </a>
        </li>
      </ul>

      {service?.cookies && (
        <>
          <p className="font-medium mt-2">Verwendete Cookies:</p>
          <ul className="list-disc pl-5 space-y-1">
            {service?.cookies.map((cookie, index) => (
              <li key={index}>
                {cookie.name && (
                  <span>
                    <strong>Technischer Cookie Name:</strong>
                    {cookie.name} <br />
                  </span>
                )}
                {cookie.type && (
                  <span>
                    &nbsp;&nbsp;&nbsp;&nbsp;<strong>Typ:</strong> {cookie.type} <br />
                  </span>
                )}
                {cookie.host && (
                  <span>
                    &nbsp;&nbsp;&nbsp;&nbsp;<strong>Host:</strong> {cookie.host} <br />
                  </span>
                )}
                {cookie.duration && (
                  <span>
                    &nbsp;&nbsp;&nbsp;&nbsp;<strong>Dauer:</strong>
                    {cookie.duration}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {service?.storage && (
        <>
          <p className="font-medium mt-2">Lokaler Speicher (Local Storage):</p>
          <ul className="list-disc pl-5 space-y-1">
            {service?.storage.map((item, index) => (
              <li key={index}>
                <strong>{item.name}</strong> ({item.type}) - {item.host} - {item.duration}
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="font-medium mt-2">
        Datenverarbeitung in Drittländern:
        {service?.dataProcessing?.countries?.map((country, index) => (
          <span key={index}>
            &nbsp;{country.name} {country.sub && <sup>{country.sub} </sup>} ,
          </span>
        ))}
      </p>

      <p className="font-medium mt-2">
        Sicherheitsmechanismen:
        {service?.dataProcessing?.mechanisms?.map((mechanism, index) => (
          <span key={index}>
            {mechanism.name}
            <sup>{mechanism.sub}</sup>
          </span>
        ))}
      </p>
    </div>
  );
};

export default CookieDetails;
