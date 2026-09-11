"use client";

import Image from "next/image";
import { useState } from "react";
import type { World } from "@/lib/worlds";

type Certificate = NonNullable<World["prose"]["education"]>["certificates"][number];
const filters = [
  { id: "all", label: "Todo" },
  { id: "code", label: "Código" },
  { id: "design", label: "Diseño y UX" },
  { id: "marketing", label: "Marketing" },
] as const;

export function MillerCertificates({ certificates }: { certificates: Certificate[] }) {
  const [filter, setFilter] = useState<string>("all");
  const visible = certificates.filter((certificate) => filter === "all" || certificate.category === filter);
  const featured = filter === "all" ? visible.slice(0, 6) : visible;
  const remaining = filter === "all" ? visible.slice(6) : [];
  return (
    <div className="miller-archive">
      <noscript><style>{`.miller-filters { display: none; }`}</style></noscript>
      <div className="miller-archive__masthead">
        <span><i aria-hidden="true" /> ARCHIVO DE A BORDO</span>
      </div>
      <div className="miller-archive__toolbar">
        <div className="miller-filters" role="group" aria-label="Filtrar certificados por área">
          {filters.map(({ id, label }) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}><span className="miller-filter-light" aria-hidden="true" />{label}</button>
          ))}
        </div>
        <p aria-live="polite" aria-atomic="true">{visible.length} documentos</p>
      </div>
      <ul className="miller-certificates">
        {featured.map((certificate) => <CertificateCard key={certificate.id} certificate={certificate} index={certificates.indexOf(certificate) + 1} />)}
      </ul>
      {remaining.length > 0 ? (
        <details className="miller-archive-more">
          <summary>
            <span className="miller-archive-more__closed">Ver los {certificates.length} documentos <span aria-hidden="true">↓</span></span>
            <span className="miller-archive-more__open">Mostrar solo destacados <span aria-hidden="true">↑</span></span>
          </summary>
          <ul className="miller-certificates">
            {remaining.map((certificate) => <CertificateCard key={certificate.id} certificate={certificate} index={certificates.indexOf(certificate) + 1} />)}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function CertificateCard({ certificate, index }: { certificate: Certificate; index: number }) {
  return (
          <li className={certificate.kind === "program" ? "miller-certificate miller-certificate--program" : "miller-certificate"}>
            <a href={certificate.href} target="_blank" rel="noopener noreferrer" aria-label={`Ver certificado: ${certificate.title} (PDF, nueva pestaña)`}>
              <div className="miller-certificate__registry" aria-hidden="true"><span>M / {String(index).padStart(2, "0")}</span><span>{certificate.category === "code" ? "CÓDIGO" : certificate.category === "design" ? "DISEÑO / UX" : "MARKETING"}</span><i /></div>
              {certificate.preview ? (
                <div className="miller-certificate__preview">
                  <Image src={certificate.preview} alt={`Vista previa de ${certificate.title}`} width={960} height={743} sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 30vw" />
                </div>
              ) : null}
              <div className="miller-certificate__body">
                <span className="miller-certificate__kind">{certificate.kind === "program" ? "Programa" : certificate.kind === "role" ? "Certificación de rol" : "Curso"}{certificate.date ? ` / ${certificate.date}` : ""}</span>
                <h3>{certificate.title}</h3>
                <p>{certificate.issuer}</p>
                <div className="miller-certificate__bottom"><span>{certificate.detail}</span><span aria-hidden="true">ABRIR PDF ↗</span></div>
              </div>
            </a>
          </li>
  );
}
