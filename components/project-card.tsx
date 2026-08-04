import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/content/site.data";
import type { Project } from "@/lib/projects";

export function ProjectCard({
  project,
  locale,
}: {
  project: Project;
  locale: Locale;
}) {
  const isCaseStudy = project.kind === "case-study";

  return (
    <article
      className={`project-card${isCaseStudy ? " project-card--featured" : ""}`}
    >
      <Link
        className="project-card__media"
        href={`/${locale}/proyectos/${project.prose.slug}`}
        aria-label={`Ver ${isCaseStudy ? "caso de estudio" : "ficha"}: ${project.prose.title}`}
      >
        <Image
          src={project.prose.featuredImage.src}
          alt={project.prose.featuredImage.alt}
          fill
          sizes={isCaseStudy ? "(max-width: 760px) 100vw, 62vw" : "(max-width: 760px) 100vw, 34vw"}
        />
        <span className="project-card__scanline" aria-hidden="true" />
        <span className="project-card__status">{project.prose.statusLabel}</span>
      </Link>

      <div className="project-card__body">
        <p className="project-card__eyebrow">
          {String(project.order).padStart(2, "0")} · {project.prose.eyebrow}
        </p>
        <h3>
          <Link href={`/${locale}/proyectos/${project.prose.slug}`}>
            {project.prose.title}
          </Link>
        </h3>
        <p>{project.prose.summary}</p>
        <ul className="tag-list" aria-label={`Tecnologías de ${project.prose.title}`}>
          {project.prose.technologies.slice(0, isCaseStudy ? 5 : 4).map((technology) => (
            <li key={technology}>{technology}</li>
          ))}
        </ul>
        <Link className="project-card__link" href={`/${locale}/proyectos/${project.prose.slug}`}>
          {isCaseStudy ? "Abrir caso completo" : "Abrir ficha de misión"}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}
