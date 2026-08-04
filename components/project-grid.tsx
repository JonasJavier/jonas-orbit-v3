import type { Locale } from "@/content/site.data";
import type { Project } from "@/lib/projects";
import { ProjectCard } from "./project-card";

export function ProjectGrid({
  projects,
  locale,
}: {
  projects: Project[];
  locale: Locale;
}) {
  return (
    <div className="mission-archive" aria-labelledby="mission-archive-title">
      <div className="mission-archive__heading">
        <div>
          <p className="section-kicker">ARCHIVO DE MISIONES / EVIDENCIA REAL</p>
          <h3 id="mission-archive-title">Productos construidos, no conceptos.</h3>
        </div>
        <p>
          Cada ficha documenta el problema, mi contribución, una decisión técnica
          y el estado verificable del producto.
        </p>
      </div>
      <div className="project-grid">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} locale={locale} />
        ))}
      </div>
    </div>
  );
}
