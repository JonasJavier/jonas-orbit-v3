export function Hero() {
  return (
    <header className="hero" aria-labelledby="hero-title">
      <div className="hero__copy">
        <p className="mission-kicker">
          <span>PORTAFOLIO / 2026</span>
          <span aria-hidden="true">COORD. 18.4861° N</span>
        </p>

        <h1 id="hero-title">
          <span className="hero__name">Jonás Javier Encarnación</span>
          Sistemas sólidos.
          <em>Experiencias que dejan señal.</em>
        </h1>

        <p className="hero__intro">
          Desarrollo productos full-stack y experiencias digitales donde
          arquitectura, claridad visual y propósito de negocio orbitan el mismo
          problema.
        </p>

        <div className="hero__actions" aria-label="Acciones principales">
          <a className="button button--primary" href="#proyectos">
            Ver proyectos
            <span aria-hidden="true">↘</span>
          </a>
          <a className="button button--secondary" href="#contacto">
            Trabajemos juntos
            <span aria-hidden="true">→</span>
          </a>
          <a
            className="text-link"
            download
            href="/cv/jonas-javier-cv-es.pdf"
          >
            Descargar CV <span aria-hidden="true">↓</span>
          </a>
        </div>

        <dl className="hero-proof" aria-label="Prueba profesional resumida">
          <div>
            <dt>01</dt>
            <dd>Sistema real en producción</dd>
          </div>
          <div>
            <dt>05</dt>
            <dd>Productos documentados</dd>
          </div>
          <div>
            <dt>360°</dt>
            <dd>Producto, código y dirección visual</dd>
          </div>
        </dl>
      </div>

      <div className="hero__visual" aria-hidden="true">
        <div className="orbital-instrument">
          <div className="orbital-instrument__halo" />
          <div className="orbit orbit--outer">
            <span className="orbit__node orbit__node--amber" />
          </div>
          <div className="orbit orbit--middle">
            <span className="orbit__node orbit__node--cyan" />
          </div>
          <div className="orbit orbit--inner">
            <span className="orbit__node orbit__node--white" />
          </div>
          <div className="orbital-instrument__core">
            <span>JJ</span>
            <small>ORBIT</small>
          </div>
          <span className="instrument-label instrument-label--a">SYS / ONLINE</span>
          <span className="instrument-label instrument-label--b">7 WORLDS</span>
          <span className="instrument-label instrument-label--c">F1A / SIGNAL</span>
        </div>
      </div>

      <a className="hero__scroll" href="#historia">
        <span aria-hidden="true" />
        Iniciar recorrido
      </a>
    </header>
  );
}
