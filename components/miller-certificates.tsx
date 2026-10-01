"use client";

import Image from "next/image";
import { useState } from "react";
import { defineCopy } from "@/lib/i18n";
import { playSfx } from "@/lib/sfx";
import type { World } from "@/lib/worlds";
import { useLocale } from "./locale-provider";
import { IssuerLogo } from "./miller-issuer-logo";

type Certificate = NonNullable<World["prose"]["education"]>["certificates"][number];

const COPY = defineCopy({
  es: {
    filters: { all: "Todo", code: "Código", design: "Diseño y UX", marketing: "Marketing" },
    registry: { code: "CÓDIGO", design: "DISEÑO / UX", marketing: "MARKETING" },
    kind: { program: "Programa", role: "Certificación de rol", course: "Curso" },
    masthead: "ARCHIVO DE A BORDO",
    filterLabel: "Filtrar certificados por área",
    count: (n: number) => `${n} documentos`,
    showAll: (n: number) => `Ver los ${n} documentos`,
    showFeatured: "Mostrar solo destacados",
    open: (title: string) => `Ver certificado: ${title} (PDF, nueva pestaña)`,
    preview: (title: string) => `Vista previa de ${title}`,
    openPdf: "ABRIR PDF ↗",
  },
  en: {
    filters: { all: "All", code: "Code", design: "Design and UX", marketing: "Marketing" },
    registry: { code: "CODE", design: "DESIGN / UX", marketing: "MARKETING" },
    kind: { program: "Program", role: "Role certification", course: "Course" },
    masthead: "SHIP’S ARCHIVE",
    filterLabel: "Filter certificates by area",
    count: (n: number) => `${n} documents`,
    showAll: (n: number) => `See all ${n} documents`,
    showFeatured: "Show featured only",
    open: (title: string) => `View certificate: ${title} (PDF, opens in a new tab)`,
    preview: (title: string) => `Preview of ${title}`,
    openPdf: "OPEN PDF ↗",
  },
});

const FILTER_IDS = ["all", "code", "design", "marketing"] as const;

export function MillerCertificates({ certificates }: { certificates: Certificate[] }) {
  const copy = COPY[useLocale()];
  const [filter, setFilter] = useState<string>("all");
  const visible = certificates.filter((certificate) => filter === "all" || certificate.category === filter);
  const featured = filter === "all" ? visible.slice(0, 6) : visible;
  const remaining = filter === "all" ? visible.slice(6) : [];
  return (
    <div className="miller-archive">
      <noscript><style>{`.miller-filters { display: none; }`}</style></noscript>
      <div className="miller-archive__masthead">
        <span><i aria-hidden="true" /> {copy.masthead}</span>
      </div>
      <div className="miller-archive__toolbar">
        <div className="miller-filters" role="group" aria-label={copy.filterLabel}>
          {FILTER_IDS.map((id) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => { setFilter(id); playSfx("detent"); }}><span className="miller-filter-light" aria-hidden="true" />{copy.filters[id]}</button>
          ))}
        </div>
        <p aria-live="polite" aria-atomic="true">{copy.count(visible.length)}</p>
      </div>
      <ul className="miller-certificates">
        {featured.map((certificate) => <CertificateCard key={certificate.id} certificate={certificate} index={certificates.indexOf(certificate) + 1} />)}
      </ul>
      {remaining.length > 0 ? (
        <details className="miller-archive-more">
          <summary>
            <span className="miller-archive-more__closed">{copy.showAll(certificates.length)} <span aria-hidden="true">↓</span></span>
            <span className="miller-archive-more__open">{copy.showFeatured} <span aria-hidden="true">↑</span></span>
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
  /*
    Una gota por documento apuntado. La receta trae 260 ms de separación, que
    es lo que impide que barrer la rejilla con el ratón suene a lluvia: en un
    archivo de treinta tarjetas eso sería ruido, no ambiente.
  */
  const copy = COPY[useLocale()];
  const drip = () => playSfx("drop");
  return (
          <li className={certificate.kind === "program" ? "miller-certificate miller-certificate--program" : "miller-certificate"}>
            <a href={certificate.href} target="_blank" rel="noopener noreferrer" onPointerEnter={drip} onFocus={drip} aria-label={copy.open(certificate.title)}>
              <div className="miller-certificate__registry" aria-hidden="true"><span>M / {String(index).padStart(2, "0")}</span><span>{copy.registry[certificate.category]}</span><i /></div>
              {certificate.preview ? (
                <div className="miller-certificate__preview">
                  <Image src={certificate.preview} alt={copy.preview(certificate.title)} width={960} height={743} sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 30vw" />
                </div>
              ) : null}
              <div className="miller-certificate__body">
                <span className="miller-certificate__kind">{copy.kind[certificate.kind]}{certificate.date ? ` / ${certificate.date}` : ""}</span>
                <h3>{certificate.title}</h3>
                <p className="miller-certificate__issuer"><IssuerLogo issuer={certificate.issuer} /><span>{certificate.issuer}</span></p>
                <div className="miller-certificate__bottom"><span>{certificate.detail}</span><span aria-hidden="true">{copy.openPdf}</span></div>
              </div>
            </a>
          </li>
  );
}
