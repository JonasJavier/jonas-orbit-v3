import { ContactChannels } from "./contact-channels";
import { ContactForm } from "./contact-form";

const OFFER_ROUTES = [
  {
    index: "01",
    title: "Producto web de principio a fin",
    audience: "Para una idea que necesita convertirse en una experiencia usable.",
    scope:
      "Descubrimiento, UX/UI, frontend, backend, datos, pruebas y despliegue.",
  },
  {
    index: "02",
    title: "Sistema interno más claro",
    audience: "Para equipos atrapados entre hojas de cálculo, mensajes y pasos manuales.",
    scope:
      "Flujos, permisos, paneles, reportes y una operación que el equipo pueda sostener.",
  },
  {
    index: "03",
    title: "Presencia digital con intención",
    audience: "Para marcas y profesionales que necesitan verse tan bien como trabajan.",
    scope:
      "Estrategia, identidad visual, sitio responsive, accesibilidad, SEO y conversión.",
  },
] as const;

export function RangerContact() {
  return (
    <div className="ranger-console">
      <div className="ranger-offer">
        <div className="ranger-offer__heading">
          <div>
            <p className="section-kicker">VENTANA DE COLABORACIÓN / ABIERTA</p>
            <h3>Diseño el sistema. Construyo el producto. Cuido la experiencia.</h3>
          </div>
          <p>
            Trabajo con empresas, equipos y profesionales que necesitan una solución
            web completa, no piezas desconectadas. Podemos empezar con una conversación
            breve y convertirla en alcance, prioridades y próximos pasos.
          </p>
        </div>

        <ol className="ranger-offer__routes">
          {OFFER_ROUTES.map((route) => (
            <li key={route.index}>
              <span aria-hidden="true">{route.index}</span>
              <h4>{route.title}</h4>
              <p>{route.audience}</p>
              <small>{route.scope}</small>
            </li>
          ))}
        </ol>

        <div className="ranger-offer__protocol">
          <p><span>01</span> Conversación inicial</p>
          <i aria-hidden="true" />
          <p><span>02</span> Alcance y ruta</p>
          <i aria-hidden="true" />
          <p><span>03</span> Construcción y entrega</p>
        </div>
      </div>

      <div className="ranger-actions">
        <div>
          <p className="section-kicker">SEÑAL DIRECTA / SIN INTERMEDIARIOS</p>
          <h3>Elige tu canal</h3>
          <p className="ranger-actions__intro">
            Si ya tienes contexto suficiente, escríbeme directamente. Para procesos
            de selección, también puedes descargar el CV en español o inglés.
          </p>
        </div>
        <div className="ranger-actions__cv">
          <a download href="/cv/jonas-javier-cv-es.pdf">
            CV español <span>PDF ↓</span>
          </a>
          <a download href="/cv/jonas-javier-cv-en-ats.pdf">
            CV English <span>PDF ↓</span>
          </a>
        </div>
      </div>

      <ContactChannels />
      <ContactForm />
    </div>
  );
}
