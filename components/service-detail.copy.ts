import { defineCopy } from "@/lib/i18n";
import type { ServiceId } from "@/lib/service-slugs";

/**
 * El texto de las cuatro páginas de servicio, en los dos idiomas.
 *
 * Vive fuera del componente porque es contenido, no interfaz. Cada página
 * nombra una búsqueda: en español, la de quien contrata en República
 * Dominicana («desarrollo de software a medida en República Dominicana»); en
 * inglés, la de quien contrata en remoto desde cualquier país («Three.js
 * developer for hire»). Por eso el inglés no es una traducción literal.
 *
 * Contenido honesto (regla 8): cada afirmación sale de un caso publicado o de
 * este mismo sitio, sin precios, clientes ni cifras que el sitio no enseñe.
 * `proofs` va en el mismo orden que las pruebas de `service-detail-page.tsx`.
 */
type Item = { title: string; body: string };

export type ServiceDetail = {
  seoTitle: string;
  seoDescription: string;
  /** Nombre corto: miga de pan, enlaces entre servicios y JSON-LD. */
  name: string;
  kicker: string;
  heading: string;
  lead: string;
  buildsTitle: string;
  builds: readonly Item[];
  proofTitle: string;
  proofLead: string;
  proofs: readonly (Item & { alt: string })[];
  approachTitle: string;
  approach: readonly Item[];
  questions: readonly { q: string; a: string }[];
};

export const SERVICE_DETAIL = defineCopy<Record<ServiceId, ServiceDetail>>({
  es: {
    software: {
      seoTitle: "Desarrollo de software a medida en República Dominicana",
      seoDescription:
        "Sistemas a medida para empresas: ERP, herramientas internas, API REST e integraciones con Django y React. Desarrollador full-stack freelance en Santo Domingo.",
      name: "Software a medida",
      kicker: "SOFTWARE A MEDIDA · FULL-STACK",
      heading: "Software a medida para tu empresa.",
      lead: "Diseño y construyo los sistemas con los que trabaja un negocio: ERP, paneles internos, plataformas con usuarios y roles, y la API que los conecta. De la base de datos a la interfaz, desde Santo Domingo, en remoto o en persona.",
      buildsTitle: "Lo que construyo.",
      builds: [
        {
          title: "ERP y sistemas de gestión",
          body: "Reservas, cobros, contabilidad, nómina y sucursales en un solo sistema, con los comprobantes fiscales de la DGII cuando tu negocio los necesita.",
        },
        {
          title: "Herramientas internas",
          body: "Lo que hoy vive en hojas de cálculo y chats, convertido en flujos con permisos, historial y reportes.",
        },
        {
          title: "Backend y API REST",
          body: "Django REST Framework y PostgreSQL: autenticación, permisos por rol, pruebas automáticas y una API que tu web o tu app pueden consumir.",
        },
        {
          title: "Plataformas con usuarios",
          body: "Comunidades, catálogos y bases de conocimiento con búsqueda, notificaciones e historial de cambios.",
        },
      ],
      proofTitle: "Sistemas en producción.",
      proofLead: "Tres casos completos, con su diseño y su ingeniería explicados.",
      proofs: [
        {
          title: "OMSTA",
          body: "ERP en producción para una agencia de viajes dominicana: reservas, cobros, doble partida, DGII, nómina y sucursales.",
          alt: "Panel principal de OMSTA, el ERP de una agencia de viajes",
        },
        {
          title: "Network",
          body: "Red social con API REST en Django y React con TypeScript: feed por cursor, JWT con rotación y 132 pruebas.",
          alt: "Feed de Network con el editor, publicaciones y sugerencias de a quién seguir",
        },
        {
          title: "Wikiverse",
          body: "Enciclopedia hecha desde cero: revisiones inmutables, comparación palabra por palabra y búsqueda de texto completo en PostgreSQL.",
          alt: "Artículo de Wikiverse con índice lateral, infobox y un enlace rojo",
        },
      ],
      approachTitle: "Cómo lo hago.",
      approach: [
        {
          title: "Primero el proceso",
          body: "Entiendo cómo trabaja tu equipo antes de proponer pantallas: el sistema se adapta al negocio, no al revés.",
        },
        {
          title: "Datos que cuadran",
          body: "Reglas claras en la base de datos, permisos por rol e historial de quién cambió qué y cuándo.",
        },
        {
          title: "Avances que se usan",
          body: "Cada avance se publica en un enlace real para que tu equipo lo pruebe mientras se construye.",
        },
      ],
      questions: [
        {
          q: "¿Puedes conectarlo con lo que ya usamos?",
          a: "Sí, por API cuando el servicio la ofrece: pagos, correo, mensajería o contabilidad. Lo vemos en la primera conversación.",
        },
        {
          q: "¿Haces sólo el backend?",
          a: "Sí. Puedo encargarme sólo de la API y la base de datos, o del sistema completo con su web y su app móvil.",
        },
        {
          q: "¿Cuánto cuesta un sistema a medida?",
          a: "Depende del alcance. Después de la primera conversación te envío una propuesta escrita con fases, plazos y presupuesto, antes de empezar nada.",
        },
        {
          q: "¿Trabajas con empresas fuera de República Dominicana?",
          a: "Sí, en remoto y en español o en inglés. Estoy en UTC−4: el mismo horario que la costa este de EE. UU. en verano y una hora más en invierno.",
        },
      ],
    },
    web: {
      seoTitle: "Diseño de páginas web en República Dominicana",
      seoDescription:
        "Páginas web y tiendas online a medida para negocios: rápidas en el móvil, listas para Google y con un catálogo que administras tú. Desde Santo Domingo.",
      name: "Páginas web y tiendas",
      kicker: "PÁGINAS WEB · TIENDAS ONLINE",
      heading: "Páginas web y tiendas online para tu negocio.",
      lead: "Diseño y desarrollo la web de tu negocio desde cero, sin plantillas: rápida en el teléfono, preparada para aparecer en Google y con un panel para que tú mismo cambies productos, precios y fotos. Desde Santo Domingo, para negocios de aquí y de fuera.",
      buildsTitle: "Lo que construyo.",
      builds: [
        {
          title: "Webs de negocio",
          body: "Lo que haces, dónde estás y cómo contactarte, con tu marca y en español, en inglés o en los dos.",
        },
        {
          title: "Tiendas online",
          body: "Catálogo con categorías y filtros, carrito sin crear cuenta y pedidos que se cierran por WhatsApp, como se compra aquí.",
        },
        {
          title: "Reservas y formularios",
          body: "Citas, reservas y mensajes que se guardan en tu propio sistema, no en una bandeja de correo perdida.",
        },
        {
          title: "SEO técnico y velocidad",
          body: "Títulos, datos estructurados, sitemap e imágenes optimizadas para que Google entienda tu negocio desde el primer día.",
        },
      ],
      proofTitle: "Webs en línea.",
      proofLead: "Dos casos completos que puedes abrir desde tu teléfono.",
      proofs: [
        {
          title: "Delicaté",
          body: "Tienda de jabones artesanales dominicanos con dominio propio: catálogo administrable, carrito sin cuenta y pedidos por WhatsApp.",
          alt: "Portada de la tienda en línea de Delicaté",
        },
        {
          title: "Izak's Photos",
          body: "Estudio de fotografía de demostración, bilingüe: galería con enlaces compartibles, visor accesible y reservas guardadas en Django.",
          alt: "Portada de Izak's Photos con un retrato en luz cálida",
        },
      ],
      approachTitle: "Cómo lo hago.",
      approach: [
        {
          title: "Primero el teléfono",
          body: "Casi todos tus clientes llegarán desde el móvil: cada pantalla se diseña primero para el pulgar.",
        },
        {
          title: "Lista para Google",
          body: "Metadatos por página, datos estructurados y carga rápida. Lo aplico en mi propio sitio y lo mido en Search Console.",
        },
        {
          title: "La administras tú",
          body: "Un panel para cambiar productos, precios, fotos y textos sin depender de mí para cada cambio.",
        },
      ],
      questions: [
        {
          q: "¿Cuánto cuesta una página web en República Dominicana?",
          a: "Depende de lo que necesite: no cuesta lo mismo una web de presentación que una tienda con catálogo. Después de la primera conversación te envío una propuesta escrita con alcance, plazos y presupuesto.",
        },
        {
          q: "¿Usas plantillas o WordPress?",
          a: "No. Construyo cada web a medida con React y Django: el diseño y las funciones salen de tu negocio, no de una plantilla.",
        },
        {
          q: "¿Puedo vender por WhatsApp?",
          a: "Sí. La tienda puede cerrar cada pedido por WhatsApp, como hace Delicaté, sin que tus clientes tengan que crear una cuenta.",
        },
        {
          q: "¿La web será mía?",
          a: "Sí. El dominio queda a tu nombre y el código es tuyo al terminar de pagar. Me encargo de publicarla y te acompaño después de la entrega.",
        },
      ],
    },
    mobile: {
      seoTitle: "Desarrollo de apps móviles en República Dominicana",
      seoDescription:
        "Apps para iOS y Android con React Native y Expo, conectadas a la misma API que tu web. Desarrollador de apps freelance en Santo Domingo, en remoto o en persona.",
      name: "Apps móviles",
      kicker: "APPS MÓVILES · iOS Y ANDROID",
      heading: "Apps móviles para iOS y Android.",
      lead: "Desarrollo apps multiplataforma con React Native y Expo: una sola base de código para iOS y Android, conectada al mismo sistema que tu web, para que tu equipo o tus clientes trabajen desde el teléfono.",
      buildsTitle: "Lo que construyo.",
      builds: [
        {
          title: "Apps para tu equipo",
          body: "Reservas, cobros, clientes y avisos en el bolsillo de quien trabaja fuera de la oficina, con los mismos permisos que en la web.",
        },
        {
          title: "Apps para tus clientes",
          body: "Catálogos, reservas y cuentas de usuario con pantallas pensadas para usarse con una mano.",
        },
        {
          title: "La API que la app necesita",
          body: "Si todavía no tienes sistema, construyo también el backend en Django que la app consume.",
        },
        {
          title: "Compilación con EAS",
          body: "Versiones de prueba en los teléfonos de tu equipo y el paquete listo para App Store y Google Play con las cuentas de tu negocio.",
        },
      ],
      proofTitle: "Una app y su sistema.",
      proofLead: "La app de OMSTA y el ERP web al que se conecta: el mismo caso, de punta a punta.",
      proofs: [
        {
          title: "OMSTA móvil",
          body: "App en React Native y Expo para el equipo de una agencia de viajes: inicio, reservas, cobros, clientes y avisos.",
          alt: "Dos pantallas de la app móvil de OMSTA: inicio y reservas",
        },
        {
          title: "OMSTA web",
          body: "El ERP en producción que comparte datos con la app: lo que se registra en el teléfono aparece en la web.",
          alt: "Panel principal del ERP web de OMSTA",
        },
      ],
      approachTitle: "Cómo lo hago.",
      approach: [
        {
          title: "Una sola base de código",
          body: "React Native, Expo y TypeScript: iOS y Android avanzan juntos, sin escribir la app dos veces.",
        },
        {
          title: "La misma lógica que tu web",
          body: "La app consume la API del sistema, así que las reglas del negocio viven en un solo sitio.",
        },
        {
          title: "Diseño para el pulgar",
          body: "Cada pantalla se diseña para una mano, con las acciones frecuentes al alcance.",
        },
      ],
      questions: [
        {
          q: "¿Nativa o multiplataforma?",
          a: "Multiplataforma con React Native y Expo: la app usa los componentes nativos de cada sistema y se escribe una sola vez para iOS y Android.",
        },
        {
          q: "¿Puedes hacer también la web?",
          a: "Sí. Lo habitual es construir el sistema completo —API, web y app— para que todo comparta los mismos datos, como en OMSTA.",
        },
        {
          q: "¿Cuánto cuesta una app?",
          a: "Depende de las pantallas y de si ya tienes backend. Después de la primera conversación te envío una propuesta escrita con alcance, plazos y presupuesto.",
        },
      ],
    },
    "3d": {
      seoTitle: "Desarrollo web 3D con Three.js y WebGL",
      seoDescription:
        "Webs y apps 3D interactivas con Three.js, WebGL y shaders propios: escenas que corren en el teléfono y que Google puede leer, como Gargantúa en este sitio.",
      name: "Desarrollo 3D",
      kicker: "3D · THREE.JS · WEBGL",
      heading: "Webs y apps 3D con Three.js y WebGL.",
      lead: "Construyo experiencias 3D interactivas para la web y el teléfono: escenas para una marca, objetos que se giran, visualizaciones y sitios enteros como éste. Shaders propios, rendimiento medido en dispositivos reales y el contenido siempre legible para Google.",
      buildsTitle: "Lo que construyo.",
      builds: [
        {
          title: "Sitios web 3D",
          body: "Portadas y sitios completos con una escena en tiempo real que responde al visitante, como el sistema de este portafolio.",
        },
        {
          title: "Modelos y visores 3D",
          body: "Objetos que se observan de cerca, se giran y cambian de luz en el navegador, sin instalar nada.",
        },
        {
          title: "Shaders a medida",
          body: "GLSL propio: un agujero negro con lente gravitacional, un océano en movimiento, cristal iridiscente.",
        },
        {
          title: "3D en el teléfono",
          body: "Escenas que ajustan su resolución al ritmo de cada teléfono, en la web o dentro de una app con React Native y Expo.",
        },
      ],
      proofTitle: "Seis especímenes en tiempo real.",
      proofLead: "Cada uno se abre en el Observatorio de este sitio: míralos en vivo, también desde el móvil.",
      proofs: [
        {
          title: "Gargantúa",
          body: "Agujero negro trazado en tiempo real: disco de acreción, lente gravitacional y efecto Doppler.",
          alt: "Primer plano de Gargantúa, el agujero negro 3D de este sitio",
        },
        {
          title: "Tesseracto",
          body: "Hipercubo de cristal que gira en cuatro dimensiones, con membranas iridiscentes.",
          alt: "El Tesseracto de cristal en el Observatorio",
        },
        {
          title: "Endurance",
          body: "Nave de doce módulos con metal, paneles térmicos y ventanas encendidas.",
          alt: "La nave Endurance en 3D en el Observatorio",
        },
        {
          title: "Ranger",
          body: "Nave de descenso con casco loftado, metal cañón y pluma de propulsión.",
          alt: "La nave Ranger en 3D en el Observatorio",
        },
        {
          title: "Miller",
          body: "Un océano sin costa con oleaje y luz en tiempo real, hecho con shaders propios.",
          alt: "El planeta océano de Miller en 3D",
        },
        {
          title: "Edmunds",
          body: "Un planeta de roca seca con provincias minerales y relieve en tiempo real.",
          alt: "El planeta rocoso de Edmunds en 3D",
        },
      ],
      approachTitle: "Cómo lo hago.",
      approach: [
        {
          title: "Rendimiento medido",
          body: "Cada escena se mide en GPU real y en teléfonos: la resolución se adapta al dispositivo y la escena duerme cuando no se ve.",
        },
        {
          title: "Legible para Google",
          body: "El 3D nunca es el contenido: texto y enlaces viven en el HTML. Mi simulador de Gargantúa sale en Google Imágenes.",
        },
        {
          title: "Accesible",
          body: "Un solo interruptor apaga el movimiento, y los equipos modestos reciben una versión sin escena.",
        },
      ],
      questions: [
        {
          q: "¿Una web 3D funciona en el teléfono?",
          a: "Sí. La escena de este sitio corre en teléfonos: ajusta su resolución al ritmo de cada uno y ofrece una versión sin 3D a los equipos que no pueden con ella.",
        },
        {
          q: "¿El 3D perjudica el SEO?",
          a: "No si se hace bien: el canvas va detrás y el contenido real está en el HTML. Las páginas 3D de este sitio aparecen en Google y en Google Imágenes.",
        },
        {
          q: "¿Puedes usar mis modelos 3D?",
          a: "Sí, en formato glTF, o construyo la geometría en código, como los cuerpos de este sitio.",
        },
        {
          q: "¿Y dentro de una app móvil?",
          a: "Sí. Con React Native y Expo la escena puede vivir dentro de la app; y como web, se abre en cualquier teléfono sin instalar nada.",
        },
      ],
    },
  },
  en: {
    software: {
      seoTitle: "Custom Software Development — Django & React Developer",
      seoDescription:
        "Freelance full-stack developer building custom software: ERPs, internal tools, REST APIs and integrations with Django and React. Remote, US-friendly hours.",
      name: "Custom software",
      kicker: "CUSTOM SOFTWARE · FULL-STACK",
      heading: "Custom software for your business.",
      lead: "I design and build the systems a business runs on: ERPs, internal dashboards, platforms with users and roles, and the API that connects them. Full-stack, from the database to the interface, working remotely from the Dominican Republic on hours that overlap with the US.",
      buildsTitle: "What I build.",
      builds: [
        {
          title: "ERPs and business systems",
          body: "Bookings, payments, accounting, payroll and branches in one system, with the local tax rules built in when the country requires them.",
        },
        {
          title: "Internal tools",
          body: "What lives in spreadsheets and chat threads today, turned into workflows with permissions, history and reports.",
        },
        {
          title: "Backend and REST APIs",
          body: "Django REST Framework and PostgreSQL: authentication, role-based permissions, automated tests and an API your web or mobile app can rely on.",
        },
        {
          title: "Platforms with users",
          body: "Communities, catalogs and knowledge bases with search, notifications and change history.",
        },
      ],
      proofTitle: "Systems in production.",
      proofLead: "Three full case studies, with their design and engineering explained.",
      proofs: [
        {
          title: "OMSTA",
          body: "A production ERP for a Dominican travel agency: bookings, payments, double-entry accounting, tax compliance, payroll and branches.",
          alt: "The main dashboard of OMSTA, a travel agency ERP",
        },
        {
          title: "Network",
          body: "A social network with a Django REST API and a React + TypeScript app: cursor feed, rotating JWTs and 132 tests.",
          alt: "The Network feed with the composer, posts and who-to-follow suggestions",
        },
        {
          title: "Wikiverse",
          body: "An encyclopedia built from scratch: immutable revisions, word-level diffs and full-text search in PostgreSQL.",
          alt: "A Wikiverse article with a side table of contents, an infobox and a red link",
        },
      ],
      approachTitle: "How I work.",
      approach: [
        {
          title: "Process first",
          body: "I learn how your team works before proposing screens: the system adapts to the business, not the other way round.",
        },
        {
          title: "Data that adds up",
          body: "Clear rules in the database, role-based permissions and a history of who changed what, and when.",
        },
        {
          title: "Progress you can use",
          body: "Every step ships to a real link so your team can try it while it’s being built.",
        },
      ],
      questions: [
        {
          q: "Can you work with the tools we already use?",
          a: "Yes, through their APIs when they offer one: payments, email, messaging or accounting. We go through it in the first conversation.",
        },
        {
          q: "Do you take backend-only work?",
          a: "Yes. I can own just the API and the database, or the whole system with its web app and mobile app.",
        },
        {
          q: "How much does custom software cost?",
          a: "It depends on the scope. After our first conversation I send you a written proposal with phases, timeline and budget, before anything starts.",
        },
        {
          q: "Do you work with companies in the US and Europe?",
          a: "Yes, remotely, in English or Spanish. I’m on UTC−4: the same as US Eastern in summer and one hour ahead in winter, with an afternoon overlap with Europe.",
        },
      ],
    },
    web: {
      seoTitle: "Freelance Web Developer for Websites and Online Stores",
      seoDescription:
        "Custom websites and online stores built from scratch: fast on phones, ready for Google, bilingual if you need it, with a catalog you manage yourself. Remote.",
      name: "Websites and stores",
      kicker: "WEBSITES · ONLINE STORES",
      heading: "Websites and online stores for your business.",
      lead: "I design and build your business website from scratch, no templates: fast on phones, ready to be found on Google, and with an admin panel so you can change products, prices and photos yourself. Remote, in English or Spanish—or both, if you sell to both markets.",
      buildsTitle: "What I build.",
      builds: [
        {
          title: "Bilingual business sites",
          body: "English and Spanish, each page with its own URL and hreflang, so both versions can rank on Google.",
        },
        {
          title: "Online stores",
          body: "A catalog with categories and filters, a cart with no account required, and orders that can close over WhatsApp.",
        },
        {
          title: "Bookings and forms",
          body: "Appointments, bookings and messages saved in your own system, not lost in an inbox.",
        },
        {
          title: "Technical SEO and speed",
          body: "Titles, structured data, sitemaps and optimized images, so Google understands your business from day one.",
        },
      ],
      proofTitle: "Sites you can open.",
      proofLead: "Two full case studies, live, that you can try from your phone.",
      proofs: [
        {
          title: "Delicaté",
          body: "An online store for handmade Dominican soaps on its own domain: a manageable catalog, a no-account cart and orders over WhatsApp.",
          alt: "The home page of the Delicaté online store",
        },
        {
          title: "Izak's Photos",
          body: "A bilingual demo photography studio: a shareable gallery, an accessible viewer and bookings saved in Django.",
          alt: "The Izak's Photos home page with a warm-lit portrait",
        },
      ],
      approachTitle: "How I work.",
      approach: [
        {
          title: "Phone first",
          body: "Most of your customers arrive on a phone, so every screen is designed for the thumb first.",
        },
        {
          title: "Ready for Google",
          body: "Per-page metadata, structured data and fast loading. I use it on my own site and measure it in Search Console.",
        },
        {
          title: "You run it",
          body: "An admin panel to change products, prices, photos and copy without waiting on me for every edit.",
        },
      ],
      questions: [
        {
          q: "How much does a website cost?",
          a: "It depends on what it needs: a business site and a store with a catalog are different projects. After our first conversation I send you a written proposal with scope, timeline and budget.",
        },
        {
          q: "Do you use templates or WordPress?",
          a: "No. I build each site from scratch with React and Django: the design and features come from your business, not from a template.",
        },
        {
          q: "Can you build a site in English and Spanish?",
          a: "Yes. Each language gets its own URLs and hreflang so Google ranks both. This site works that way, and the blog explains how.",
        },
        {
          q: "Will the website be mine?",
          a: "Yes. The domain is in your name and the code is yours once it’s paid for. I handle the launch and support you after delivery.",
        },
      ],
    },
    mobile: {
      seoTitle: "React Native & Expo App Developer — iOS and Android",
      seoDescription:
        "Freelance React Native and Expo developer: cross-platform iOS and Android apps connected to the same API as your web app. Remote, in English or Spanish.",
      name: "Mobile apps",
      kicker: "MOBILE APPS · iOS AND ANDROID",
      heading: "Mobile apps for iOS and Android.",
      lead: "I build cross-platform apps with React Native and Expo: one codebase for iOS and Android, connected to the same system as your web app, so your team or your customers can work from their phones.",
      buildsTitle: "What I build.",
      builds: [
        {
          title: "Apps for your team",
          body: "Bookings, payments, customers and alerts in the pocket of whoever works away from the office, with the same permissions as on the web.",
        },
        {
          title: "Apps for your customers",
          body: "Catalogs, bookings and user accounts on screens designed for one hand.",
        },
        {
          title: "The API behind it",
          body: "If you don’t have a backend yet, I build the Django API the app needs too.",
        },
        {
          title: "Builds with EAS",
          body: "Test builds on your team’s phones, and the package ready for the App Store and Google Play under your company’s accounts.",
        },
      ],
      proofTitle: "One app, one system.",
      proofLead: "The OMSTA app and the web ERP it connects to: the same case, end to end.",
      proofs: [
        {
          title: "OMSTA mobile",
          body: "A React Native and Expo app for a travel agency’s team: home, bookings, payments, customers and alerts.",
          alt: "Two screens of the OMSTA mobile app: home and bookings",
        },
        {
          title: "OMSTA web",
          body: "The production ERP that shares its data with the app: what’s recorded on the phone shows up on the web.",
          alt: "The main dashboard of the OMSTA web ERP",
        },
      ],
      approachTitle: "How I work.",
      approach: [
        {
          title: "One codebase",
          body: "React Native, Expo and TypeScript: iOS and Android move forward together, without writing the app twice.",
        },
        {
          title: "Same logic as your web app",
          body: "The app consumes the system’s API, so the business rules live in one place.",
        },
        {
          title: "Designed for the thumb",
          body: "Every screen is designed for one hand, with frequent actions within reach.",
        },
      ],
      questions: [
        {
          q: "Native or cross-platform?",
          a: "Cross-platform with React Native and Expo: the app uses each system’s native components and is written once for iOS and Android.",
        },
        {
          q: "Can you build the web app too?",
          a: "Yes. The usual setup is the whole system—API, web and app—so everything shares the same data, as in OMSTA.",
        },
        {
          q: "How much does an app cost?",
          a: "It depends on the screens and on whether you already have a backend. After our first conversation I send you a written proposal with scope, timeline and budget.",
        },
      ],
    },
    "3d": {
      seoTitle: "Three.js Developer for Hire — 3D Websites and WebGL",
      seoDescription:
        "Freelance Three.js and WebGL developer: interactive 3D websites, product viewers and custom shaders that run on phones and stay readable to Google.",
      name: "3D development",
      kicker: "3D · THREE.JS · WEBGL",
      heading: "3D websites and apps with Three.js and WebGL.",
      lead: "I build interactive 3D experiences for the web and for phones: brand scenes, objects you can turn, visualizations and whole sites like this one. Custom shaders, performance measured on real devices, and content that stays readable to Google.",
      buildsTitle: "What I build.",
      builds: [
        {
          title: "3D websites",
          body: "Landing pages and full sites with a real-time scene that responds to the visitor, like the system on this portfolio.",
        },
        {
          title: "3D models and viewers",
          body: "Objects people can study up close, turn and relight in the browser, with nothing to install.",
        },
        {
          title: "Custom shaders",
          body: "Hand-written GLSL: a black hole with gravitational lensing, a moving ocean, iridescent glass.",
        },
        {
          title: "3D on phones",
          body: "Scenes that adapt their resolution to each phone’s frame rate, on the web or inside a React Native and Expo app.",
        },
      ],
      proofTitle: "Six specimens, in real time.",
      proofLead: "Each one opens in this site’s Observatory: see them live, on your phone too.",
      proofs: [
        {
          title: "Gargantua",
          body: "A black hole ray-traced in real time: accretion disk, gravitational lensing and Doppler shift.",
          alt: "A close-up of Gargantua, this site’s 3D black hole",
        },
        {
          title: "Tesseract",
          body: "A glass hypercube rotating through four dimensions, with iridescent membranes.",
          alt: "The glass Tesseract in the Observatory",
        },
        {
          title: "Endurance",
          body: "A twelve-module ship with metal, thermal panels and lit windows.",
          alt: "The Endurance ship in 3D in the Observatory",
        },
        {
          title: "Ranger",
          body: "A landing craft with a lofted hull, gunmetal plating and an engine plume.",
          alt: "The Ranger ship in 3D in the Observatory",
        },
        {
          title: "Miller",
          body: "A shoreless ocean with real-time waves and light, built with custom shaders.",
          alt: "Miller’s ocean planet in 3D",
        },
        {
          title: "Edmunds",
          body: "A dry rocky planet with mineral provinces and relief, in real time.",
          alt: "Edmunds’ rocky planet in 3D",
        },
      ],
      approachTitle: "How I work.",
      approach: [
        {
          title: "Measured performance",
          body: "Every scene is measured on real GPUs and phones: resolution adapts to the device, and the scene sleeps when it’s out of view.",
        },
        {
          title: "Readable to Google",
          body: "The 3D is never the content: text and links live in the HTML. My Gargantua simulator shows up in Google Images.",
        },
        {
          title: "Accessible",
          body: "One switch turns motion off, and low-end devices get a version without the scene.",
        },
      ],
      questions: [
        {
          q: "Does a 3D website work on phones?",
          a: "Yes. This site’s scene runs on phones: it adapts its resolution to each one’s frame rate and serves a version without 3D to devices that can’t handle it.",
        },
        {
          q: "Does 3D hurt SEO?",
          a: "Not when it’s done right: the canvas sits behind and the real content is in the HTML. This site’s 3D pages show up in Google Search and Google Images.",
        },
        {
          q: "Can you work with my 3D models?",
          a: "Yes, in glTF, or I build the geometry in code, like the bodies on this site.",
        },
        {
          q: "What about inside a mobile app?",
          a: "Yes. With React Native and Expo the scene can live inside the app; as a website, it opens on any phone with nothing to install.",
        },
      ],
    },
  },
});
