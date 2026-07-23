export interface UniverseFact {
  value: string;
  label: string;
}

export interface UniversePanel {
  eyebrow: string;
  title: string;
  description: string;
  tags?: string[];
  href?: string;
  linkLabel?: string;
}

export interface UniverseWorld {
  slug: string;
  number: string;
  cosmicName: string;
  label: string;
  eyebrow: string;
  shortLabel: string;
  summary: string;
  introduction: string;
  accent: string;
  secondary: string;
  visual: "tesseract" | "station" | "water" | "ship" | "desert" | "black-hole" | "beacon";
  orbit: {
    size: number;
    duration: number;
    delay: number;
    planetSize: number;
  };
  facts: UniverseFact[];
  panels: UniversePanel[];
  closing: string;
}

export const worlds: UniverseWorld[] = [
  {
    slug: "historia",
    number: "01",
    cosmicName: "Tesseracto",
    label: "Mi historia",
    eyebrow: "Origen y propósito",
    shortLabel: "Historia",
    summary: "El punto donde la ingeniería, el diseño y la narrativa visual se encuentran.",
    introduction:
      "Soy Jonás Javier Encarnación, desarrollador full-stack y creador multidisciplinario. Mi forma de trabajar nace de una convicción: una solución digital puede ser técnicamente sólida, visualmente memorable y profundamente útil al mismo tiempo.",
    accent: "#f2c879",
    secondary: "#73d7ff",
    visual: "tesseract",
    orbit: { size: 34, duration: 38, delay: -7, planetSize: 32 },
    facts: [
      { value: "Código + diseño", label: "Una sola práctica" },
      { value: "Web + multimedia", label: "Un campo amplio" },
      { value: "Curiosidad", label: "El motor constante" },
    ],
    panels: [
      {
        eyebrow: "Capítulo 01",
        title: "Construir con intención",
        description:
          "Me interesa comprender el problema antes de elegir la herramienta. Por eso conecto arquitectura, experiencia de usuario y comunicación visual desde el inicio.",
        tags: ["Pensamiento de producto", "Sistemas", "Experiencia"],
      },
      {
        eyebrow: "Capítulo 02",
        title: "Dos hemisferios, una visión",
        description:
          "El desarrollo me permite convertir procesos en productos. El diseño, la fotografía y el marketing me ayudan a darles claridad, carácter y una historia que las personas puedan recordar.",
        tags: ["Full-stack", "Diseño multimedia", "Fotografía"],
      },
      {
        eyebrow: "Capítulo 03",
        title: "Crear para avanzar",
        description:
          "Disfruto transformar ideas complejas en experiencias sencillas. Cada proyecto es una oportunidad para aprender, refinar el sistema y elevar el resultado.",
        tags: ["Aprendizaje continuo", "Iteración", "Calidad"],
      },
    ],
    closing: "Mi historia no separa creatividad y tecnología: las mantiene en la misma órbita.",
  },
  {
    slug: "formacion",
    number: "02",
    cosmicName: "Cooper Station",
    label: "Formación y trayectoria",
    eyebrow: "Aprendizaje en expansión",
    shortLabel: "Formación",
    summary:
      "Una estación construida con fundamentos técnicos, cultura visual y estrategia digital.",
    introduction:
      "Mi formación cruza disciplinas que normalmente viven separadas. Estudié los fundamentos de la computación y el desarrollo web con CS50, me formé durante cerca de un año en diseño multimedia y actualmente estudio Marketing Digital.",
    accent: "#7fe5ff",
    secondary: "#a9b5ff",
    visual: "station",
    orbit: { size: 48, duration: 50, delay: -21, planetSize: 28 },
    facts: [
      { value: "CS50x", label: "Fundamentos de computación" },
      { value: "CS50W", label: "Programación web" },
      { value: "En curso", label: "Marketing Digital" },
    ],
    panels: [
      {
        eyebrow: "Harvard University",
        title: "CS50x",
        description:
          "Fundamentos de ciencias de la computación, resolución de problemas, algoritmos, estructuras de datos y pensamiento computacional.",
        tags: ["Computer Science", "Algoritmos", "Fundamentos"],
      },
      {
        eyebrow: "Harvard University",
        title: "CS50W",
        description:
          "Profundización en programación web con Python, JavaScript, bases de datos, seguridad, escalabilidad y construcción de aplicaciones modernas.",
        tags: ["Python", "JavaScript", "Web"],
      },
      {
        eyebrow: "Formación creativa",
        title: "Diseño Multimedia",
        description:
          "Cerca de un año desarrollando criterio visual y práctica en composición, comunicación, diseño digital y producción multimedia.",
        tags: ["Composición", "Identidad", "Narrativa visual"],
      },
      {
        eyebrow: "Carrera en curso",
        title: "Marketing Digital",
        description:
          "Formación orientada a estrategia, audiencias, comunicación y crecimiento de productos y marcas en entornos digitales.",
        tags: ["Estrategia", "Audiencias", "Comunicación"],
      },
    ],
    closing: "Aprendo para conectar mejor las decisiones técnicas, humanas y de negocio.",
  },
  {
    slug: "desarrollo",
    number: "03",
    cosmicName: "Miller",
    label: "Desarrollo full-stack",
    eyebrow: "Ingeniería de producto",
    shortLabel: "Desarrollo",
    summary:
      "Aplicaciones, sitios web y sistemas empresariales diseñados para funcionar en el mundo real.",
    introduction:
      "Trabajo de extremo a extremo: modelo datos, construyo APIs y lógica de negocio, diseño interfaces y preparo el producto para evolucionar. El objetivo no es acumular tecnología, sino crear sistemas claros, mantenibles y útiles.",
    accent: "#55d9ff",
    secondary: "#5e7dff",
    visual: "water",
    orbit: { size: 48, duration: 50, delay: -4, planetSize: 36 },
    facts: [
      { value: "Full-stack", label: "De la idea al producto" },
      { value: "Backend", label: "Reglas y datos confiables" },
      { value: "Frontend", label: "Interfaces que orientan" },
    ],
    panels: [
      {
        eyebrow: "Núcleo",
        title: "Backend y APIs",
        description:
          "Lógica de negocio, modelos de datos, permisos, integraciones y servicios preparados para procesos reales.",
        tags: ["Python", "Django", "Django REST Framework", "Redis"],
      },
      {
        eyebrow: "Interfaz",
        title: "Frontend moderno",
        description:
          "Experiencias responsivas, componentes reutilizables y estados de interfaz que hacen comprensible un sistema complejo.",
        tags: ["JavaScript", "TypeScript", "React", "HTML", "CSS"],
      },
      {
        eyebrow: "Operación",
        title: "Entrega y evolución",
        description:
          "Versionado, entornos reproducibles y una arquitectura que facilita probar, desplegar y continuar mejorando.",
        tags: ["Git", "GitHub", "Docker", "APIs REST"],
      },
      {
        eyebrow: "Enfoque",
        title: "Software para personas",
        description:
          "Validaciones claras, flujos previsibles y decisiones visuales que reducen fricción para usuarios y equipos.",
        tags: ["UX", "Accesibilidad", "Rendimiento"],
      },
    ],
    closing: "La mejor arquitectura es la que resuelve hoy sin bloquear lo que vendrá mañana.",
  },
  {
    slug: "proyectos",
    number: "04",
    cosmicName: "Endurance",
    label: "Proyectos y sistemas",
    eyebrow: "Misiones construidas",
    shortLabel: "Proyectos",
    summary:
      "Trabajo aplicado: desde operaciones empresariales hasta experiencias web con identidad propia.",
    introduction:
      "He contribuido a diseñar y construir sistemas empresariales, aplicaciones web y sitios digitales. Aquí reúno las líneas de trabajo que mejor muestran cómo combino estrategia, desarrollo y diseño.",
    accent: "#f0bc72",
    secondary: "#7fe5ff",
    visual: "ship",
    orbit: { size: 62, duration: 64, delay: -35, planetSize: 30 },
    facts: [
      { value: "Producto", label: "Problema antes que tecnología" },
      { value: "Sistema", label: "Flujos conectados" },
      { value: "Evolución", label: "Mejora continua" },
    ],
    panels: [
      {
        eyebrow: "Caso destacado",
        title: "Sistema empresarial de gestión operativa",
        description:
          "Una plataforma que conecta flujos, usuarios, registros, reportes y operaciones internas en un mismo entorno de trabajo.",
        tags: ["Django", "Redis", "Datos", "UX de operaciones"],
        href: "/projects/omsta/",
        linkLabel: "Abrir caso de estudio",
      },
      {
        eyebrow: "Línea de trabajo",
        title: "Aplicaciones web",
        description:
          "Productos interactivos con reglas de negocio, roles, automatizaciones y experiencias pensadas para tareas reales.",
        tags: ["Full-stack", "APIs", "Dashboards"],
      },
      {
        eyebrow: "Línea de trabajo",
        title: "Sitios web",
        description:
          "Sitios rápidos y responsivos que traducen una identidad en una experiencia digital clara y convincente.",
        tags: ["Frontend", "Narrativa", "Rendimiento"],
      },
      {
        eyebrow: "Experimento interactivo",
        title: "Jonas Orbit",
        description:
          "Este portafolio: una interfaz espacial multipágina creada para convertir trayectoria, capacidades y personalidad en una experiencia explorable.",
        tags: ["Next.js", "TypeScript", "Motion", "Diseño de interacción"],
        href: "/projects/jonas-orbit/",
        linkLabel: "Ver cómo fue construido",
      },
    ],
    closing: "Cada misión debe contar qué cambió, cómo se construyó y por qué la solución importa.",
  },
  {
    slug: "creatividad",
    number: "05",
    cosmicName: "Edmunds",
    label: "Creatividad visual",
    eyebrow: "Diseño, fotografía y estrategia",
    shortLabel: "Creatividad",
    summary: "Mi lado más fuerte: observar, componer y convertir ideas en imágenes con intención.",
    introduction:
      "La creatividad no es una capa decorativa de mi trabajo; es una forma de investigar, organizar y comunicar. El diseño multimedia, la fotografía y el marketing digital alimentan mi manera de construir productos.",
    accent: "#ff9b6b",
    secondary: "#f5cf83",
    visual: "desert",
    orbit: { size: 62, duration: 64, delay: -9, planetSize: 38 },
    facts: [
      { value: "Multimedia", label: "Lenguaje visual" },
      { value: "Fotografía", label: "Mirada personal" },
      { value: "Marketing", label: "Contexto y audiencia" },
    ],
    panels: [
      {
        eyebrow: "Disciplina",
        title: "Diseño multimedia",
        description:
          "Composición, identidad, piezas digitales y sistemas visuales pensados para comunicar con orden y personalidad.",
        tags: ["Dirección visual", "Composición", "Identidad"],
      },
      {
        eyebrow: "Práctica personal",
        title: "Fotografía",
        description:
          "Mi forma de entrenar la observación: luz, textura, instante y encuadre. Una práctica que también transforma cómo diseño interfaces.",
        tags: ["Luz", "Composición", "Narrativa"],
      },
      {
        eyebrow: "Perspectiva",
        title: "Marketing digital",
        description:
          "Entender el contexto, la audiencia y el objetivo permite que una idea no solo se vea bien, sino que llegue con claridad.",
        tags: ["Estrategia", "Contenido", "Audiencias"],
      },
      {
        eyebrow: "Método",
        title: "Concepto antes que ornamento",
        description:
          "Busco una idea central fuerte y dejo que tipografía, color, ritmo e interacción trabajen juntos para sostenerla.",
        tags: ["Concepto", "Sistema", "Consistencia"],
      },
    ],
    closing: "Diseñar es decidir qué debe sentir, entender y recordar una persona.",
  },
  {
    slug: "laboratorio",
    number: "06",
    cosmicName: "Gargantúa",
    label: "Laboratorio",
    eyebrow: "Exploración y prototipos",
    shortLabel: "Laboratorio",
    summary:
      "Un campo de pruebas para interacción, movimiento, visualización y nuevas formas de contar.",
    introduction:
      "Este es el espacio donde una pregunta puede convertirse en prototipo. Exploro movimiento, interfaces espaciales y automatización para descubrir recursos que luego mejoran productos reales.",
    accent: "#ffb45c",
    secondary: "#d8e6ff",
    visual: "black-hole",
    orbit: { size: 76, duration: 82, delay: -48, planetSize: 34 },
    facts: [
      { value: "Prototipo", label: "Aprender haciendo" },
      { value: "Movimiento", label: "Guiar, no distraer" },
      { value: "Rendimiento", label: "La experiencia primero" },
    ],
    panels: [
      {
        eyebrow: "Experimento 01",
        title: "Navegación orbital",
        description:
          "Un sistema solar accesible y responsivo donde cada cuerpo funciona como puerta narrativa hacia una parte del portafolio.",
        tags: ["Interacción", "CSS", "Motion"],
      },
      {
        eyebrow: "Experimento 02",
        title: "Movimiento con propósito",
        description:
          "Transiciones que comunican jerarquía, dirección y estado, con respeto por la preferencia de movimiento reducido.",
        tags: ["Microinteracciones", "Accesibilidad", "Performance"],
      },
      {
        eyebrow: "Experimento 03",
        title: "Visuales procedurales",
        description:
          "Planetas, atmósferas, estrellas y campos gravitacionales creados con código para mantener una identidad original y ligera.",
        tags: ["CSS", "Gradientes", "Sistemas visuales"],
      },
    ],
    closing:
      "Experimentar no es añadir ruido: es encontrar una forma mejor de hacer visible una idea.",
  },
  {
    slug: "contacto",
    number: "07",
    cosmicName: "Ranger",
    label: "Contacto",
    eyebrow: "Abrir un canal",
    shortLabel: "Contacto",
    summary: "Ideas, productos, colaboraciones o una misión difícil: conversemos.",
    introduction:
      "Si buscas a alguien que pueda pensar el sistema, construir el producto y cuidar cómo se siente, estás en la frecuencia correcta.",
    accent: "#ff6f91",
    secondary: "#72ddff",
    visual: "beacon",
    orbit: { size: 76, duration: 82, delay: -16, planetSize: 26 },
    facts: [
      { value: "Producto", label: "Aplicaciones y sitios web" },
      { value: "Sistema", label: "Procesos empresariales" },
      { value: "Colaboración", label: "Diseño + desarrollo" },
    ],
    panels: [
      {
        eyebrow: "Misión",
        title: "Construir un producto",
        description:
          "Desde una primera idea hasta una aplicación funcional con arquitectura, interfaz y experiencia coherentes.",
      },
      {
        eyebrow: "Misión",
        title: "Mejorar un sistema",
        description:
          "Convertir flujos complejos en procesos claros, confiables y más fáciles de operar.",
      },
      {
        eyebrow: "Misión",
        title: "Crear una presencia digital",
        description:
          "Un sitio con estrategia, identidad visual y una implementación rápida y accesible.",
      },
    ],
    closing: "La próxima misión puede comenzar con un mensaje breve.",
  },
];

export function getWorldBySlug(slug: string) {
  return worlds.find((world) => world.slug === slug);
}

export function getAdjacentWorlds(slug: string) {
  const index = worlds.findIndex((world) => world.slug === slug);

  if (index === -1) {
    return { previous: worlds[worlds.length - 1], next: worlds[0] };
  }

  return {
    previous: worlds[(index - 1 + worlds.length) % worlds.length],
    next: worlds[(index + 1) % worlds.length],
  };
}
