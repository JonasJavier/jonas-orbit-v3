import { defineCopy } from "@/lib/i18n";

/**
 * El texto de «Sobre mí», en los dos idiomas.
 *
 * Vive fuera del componente porque es contenido —la voz de Jonás—, no texto de
 * interfaz, y porque junto al marcado ocupaba más que el propio marcado. Cada
 * foto lleva su título y su pie para el visor (`data-title`, `data-caption`),
 * el nombre accesible del botón que la amplía y su texto alternativo.
 */
export type AboutPhoto = {
  title: string;
  caption: string;
  label: string;
  alt: string;
};

type Node = { title: string; lead: string; alt: string };

export const ABOUT_COPY = defineCopy({
  es: {
    heroEyebrow: "01 / SOBRE MÍ",
    heroHidden: "Sobre mí. ",
    heroTitle: "Mi pequeño universo.",
    heroNote: ["Misma persona,", "distintos cielos."],
    constellation: "Explora las seis constelaciones",
    portraitAlt: "Jonás Javier Encarnación, desarrollador full-stack y diseñador UX/UI, sonriendo con abrigo y luces al fondo",
    place: "BONAO · REPÚBLICA DOMINICANA",
    nodes: {
      roots: { title: "Mis raíces", lead: "Donde empezó todo.", alt: "Río rodeado de vegetación en Bonao" },
      people: { title: "Mi gente", lead: "Las personas que hacen hogar.", alt: "Jonás con su familia en una asamblea internacional" },
      self: { title: "Cómo soy", lead: "Todavía aprendiendo.", alt: "Jonás junto al mar" },
      enjoy: { title: "Lo que disfruto", lead: "Curiosidad, naturaleza y buenas historias.", alt: "Una gran cascada entre vegetación" },
      path: { title: "Mi camino", lead: "Servir, aprender y compartir.", alt: "Un momento compartido durante un voluntariado" },
      dream: { title: "Lo que sueño", lead: "Una vida sencilla. Mucho por descubrir.", alt: "Una persona contemplando un lago entre montañas" },
    } satisfies Record<string, Node>,
    invitation: "Elige una constelación",
    journeyNav: "Tu lugar en la historia",
    backToMap: "Volver a la constelación",

    rootsEyebrow: "01 / EL PUNTO DE PARTIDA",
    rootsTitle: "Mis raíces.",
    rootsPlace: "Bonao · República Dominicana",
    rootsCoordinates: "18°56′ N · 70°25′ O",
    rootsWords: "Crecí entre ríos y montañas.",
    rootsStory:
      "Bonao es mi punto de partida. Crecer rodeado de montañas, ríos y tanto verde dejó algo en mí: todavía busco esos lugares cuando quiero desconectarme, pensar o simplemente mirar. De ahí viene buena parte de mi gusto por explorar.",
    rootsPhoto: {
      title: "Mis raíces",
      caption: "Entre ríos y montañas, con mis amigos.",
      label: "Ampliar fotografía de la cascada con mis amigos",
      alt: "Jonás con sus amigos frente a una cascada rodeada de vegetación",
    },
    rootsNext: "Y LAS PERSONAS QUE ME ACOMPAÑAN",

    peopleEyebrow: "02 / MIS VÍNCULOS",
    peopleTitle: "Mi gente.",
    peopleLead: "Mi familia es mi primer hogar.",
    peopleSub: "La alegría de mi madre, el esfuerzo de mi padre y la amistad de mi hermana.",
    familyPhoto: {
      title: "Mi familia",
      caption: "Juntos en una asamblea internacional.",
      label: "Ampliar fotografía de mi familia",
      alt: "Jonás y su familia en el auditorio de una asamblea internacional",
    },
    childhoodPhoto: {
      title: "Desde pequeños",
      caption: "Aquí hablábamos de nuestras metas, entre ellas ir a Betel.",
      label: "Ampliar recuerdo de infancia con mi mejor amigo",
      alt: "Jonás y su mejor amigo de niños, frente a unas filas de asientos",
    },
    bethelPhoto: {
      title: "Un sueño compartido",
      caption: "Con mi mejor amigo durante nuestra etapa en Betel.",
      label: "Ampliar fotografía de los dos amigos en Betel",
      alt: "Jonás y su mejor amigo en Betel",
    },
    friendsLine: "Mi mejor amigo y yo, cumpliendo metas y sueños juntos.",
    grandparentsPhoto: {
      title: "Mis abuelos",
      caption: "Lo que aprendí a su lado.",
      label: "Ampliar fotografía de mis abuelos maternos",
      alt: "Los abuelos maternos de Jonás juntos en una mesa",
    },
    grandparentsEyebrow: "MIS ABUELOS",
    grandparentsLine: "Cariño, sabiduría y muchos recuerdos.",
    peopleNext: "UN POCO MÁS DE MÍ",

    selfPhoto: {
      title: "Junto al mar",
      caption: "Un momento al aire libre.",
      label: "Ampliar retrato junto al mar",
      alt: "Retrato de Jonás de perfil junto al mar",
    },
    selfEyebrow: "03 / MI FORMA DE SER",
    selfTitle: "Un poco de mí.",
    selfLead: "Curioso por naturaleza.",
    selfStory:
      "Me gusta entender las cosas a fondo, hacer preguntas y descubrir algo nuevo cada día. Disfruto explorar lugares, estar en contacto con la naturaleza y conocer personas con distintas formas de ver el mundo.",
    selfAlone:
      "También valoro mucho mi tiempo a solas. Me gusta tener espacio para pensar, imaginar y perderme un poco en mi propio mundo.",
    traitsEyebrow: "Así me describen mis amigos",
    traits: ["Tranquilo", "Auténtico", "Amable", "Servicial"],
    faith:
      "Mi fe es una parte importante de quien soy. Guía mis valores, mis decisiones y mi esfuerzo diario por hacer el bien.",
    selfNext: "LAS COSAS QUE DISFRUTO",

    enjoyEyebrow: "04 / LO QUE DISFRUTO",
    enjoyTitle: "Lo que disfruto.",
    enjoyLead: "Siempre hay algo por descubrir.",
    waterfallPhoto: {
      title: "Explorar",
      caption: "Montañas, ríos y tiempo al aire libre.",
      label: "Ampliar fotografía de la cascada",
      alt: "Una persona al pie de una gran cascada cubierta de vegetación",
    },
    photographyEyebrow: "FOTOGRAFÍA",
    photographyTitle: ["Mirar. Detenerme.", "Recordar."],
    photographyBody: "Fotografío para guardar paisajes, pequeños detalles y buenos momentos.",
    companyEyebrow: "EN BUENA COMPAÑÍA",
    companyTitle: "Y si es con amigos, mejor.",
    dayPhoto: {
      title: "Un día con amigos",
      caption: "Buenos momentos con mis amigos.",
      label: "Ampliar fotografía: Un día con amigos",
      alt: "Amigos con chalecos salvavidas junto a una moto acuática",
    },
    waterPhoto: {
      title: "Dentro del agua",
      caption: "Salir a descubrir, juntos.",
      label: "Ampliar fotografía: Dentro del agua",
      alt: "Dos personas con casco y chaleco dentro del agua, entre paredes de roca",
    },
    plansEyebrow: "EXPLORAR",
    plansTitle: "Mis planes favoritos.",
    plansBody: "Montañas, ríos, lugares nuevos y tiempo con amigos.",
    musicEyebrow: "MÚSICA",
    musicTitle: "La música que me acompaña.",
    musicBody: "Bandas sonoras, baladas de siempre y canciones con un poco de nostalgia.",
    storiesEyebrow: "HISTORIAS",
    storiesTitle: "Después de los créditos.",
    storiesBody: "Cine, anime y series para seguir pensando un rato más.",
    enjoyNext: "EXPERIENCIAS QUE ME HAN FORMADO",

    pathEyebrow: "05 / EXPERIENCIAS QUE ME HAN FORMADO",
    pathTitle: "Mi camino.",
    pathMotto: ["Servir.", "Aprender.", "Compartir."],
    preachingEyebrow: "COMPARTIR · LA PREDICACIÓN",
    preachingTitle: "Conectar con las personas.",
    preachingBody:
      "Compartir la Biblia con otras personas ha formado parte de mi vida desde pequeño. Con los años, me ha enseñado a interesarme más por quienes tengo delante. También me ha ayudado a crecer socialmente y, sobre todo, a fortalecer mi fe.",
    preachingPhoto: {
      title: "En la predicación",
      caption: "Compartiendo con otros.",
      label: "Ampliar fotografía: Compartiendo con otros",
      alt: "Un grupo de distintas edades al aire libre durante la predicación",
    },
    littlePhoto: {
      title: "Desde pequeño",
      caption: "Predicando desde niño.",
      label: "Ampliar fotografía: Predicando desde niño",
      alt: "Un adulto y tres niños compartiendo un momento de la etapa de predicación",
    },
    volunteerEyebrow: "SERVIR · EL VOLUNTARIADO",
    volunteerTitle: "Hombro con hombro.",
    volunteerBody:
      "El voluntariado ha sido una constante en mi vida: una forma de servir, aprender y crecer junto a otros.",
    volunteerPhoto: {
      title: "Voluntariado",
      caption: "Servir nos hace felices.",
      label: "Ampliar fotografía: Servir nos hace felices",
      alt: "Voluntarios junto a un muro, varios con chalecos de trabajo",
    },
    workPhoto: {
      title: "En plena actividad",
      caption: "Un esfuerzo que se disfruta.",
      label: "Ampliar fotografía: Un esfuerzo que se disfruta",
      alt: "Tres voluntarios sobre una plataforma de trabajo",
    },
    pathNext: "Y TODAVÍA QUEDA CAMINO",

    dreamEyebrow: "06 / HACIA DONDE MIRO",
    dreamTitle: "Lo que sueño.",
    dreamBody:
      "Una vida sencilla, cerca de la naturaleza, con tiempo para la gente que quiero, trabajo que me entusiasme y lugares que todavía no conozco.",
    dreamScript: ["Todavía queda mucho", "por descubrir."],
    dreamPhoto: {
      title: "Lo que sueño",
      caption: "Una vida sencilla, cerca de la naturaleza.",
      label: "Ampliar fotografía junto al lago",
      alt: "Una persona de espaldas mirando un lago y las montañas",
    },

    endingEyebrow: "ESTO ES LO QUE LLEVO CONMIGO",
    endingTitle: ["Mi pequeño universo", "sigue creciendo."],
    endingBack: "VOLVER A LA CONSTELACIÓN ↑",
    endingOrbit: "VOLVER A ORBIT ↗",
    nextDestination: "Siguiente destino",
  },
  en: {
    heroEyebrow: "01 / ABOUT ME",
    heroHidden: "About me. ",
    heroTitle: "My little universe.",
    heroNote: ["Same person,", "different skies."],
    constellation: "Explore the six constellations",
    portraitAlt: "Jonás Javier Encarnación, full-stack developer and UX/UI designer, smiling in a coat with lights behind him",
    place: "BONAO · DOMINICAN REPUBLIC",
    nodes: {
      roots: { title: "My roots", lead: "Where it all began.", alt: "A river surrounded by greenery in Bonao" },
      people: { title: "My people", lead: "The people who make a home.", alt: "Jonás with his family at an international convention" },
      self: { title: "Who I am", lead: "Still learning.", alt: "Jonás by the sea" },
      enjoy: { title: "What I enjoy", lead: "Curiosity, nature and good stories.", alt: "A large waterfall among greenery" },
      path: { title: "My path", lead: "Serving, learning and sharing.", alt: "A shared moment while volunteering" },
      dream: { title: "What I dream of", lead: "A simple life. So much to discover.", alt: "Someone gazing at a lake between mountains" },
    },
    invitation: "Choose a constellation",
    journeyNav: "Your place in the story",
    backToMap: "Back to the constellation",

    rootsEyebrow: "01 / WHERE IT STARTED",
    rootsTitle: "My roots.",
    rootsPlace: "Bonao · Dominican Republic",
    rootsCoordinates: "18°56′ N · 70°25′ W",
    rootsWords: "I grew up between rivers and mountains.",
    rootsStory:
      "Bonao is where I started. Growing up surrounded by mountains, rivers and so much green left something in me: I still look for places like that when I want to disconnect, think or simply take it all in. That’s where a lot of my love for exploring comes from.",
    rootsPhoto: {
      title: "My roots",
      caption: "Between rivers and mountains, with my friends.",
      label: "Enlarge photo of the waterfall with my friends",
      alt: "Jonás with his friends in front of a waterfall surrounded by greenery",
    },
    rootsNext: "AND THE PEOPLE BESIDE ME",

    peopleEyebrow: "02 / MY BONDS",
    peopleTitle: "My people.",
    peopleLead: "My family is my first home.",
    peopleSub: "My mother’s joy, my father’s hard work and my sister’s friendship.",
    familyPhoto: {
      title: "My family",
      caption: "Together at an international convention.",
      label: "Enlarge photo of my family",
      alt: "Jonás and his family in the auditorium of an international convention",
    },
    childhoodPhoto: {
      title: "Since we were kids",
      caption: "This is where we talked about our goals, like going to Bethel.",
      label: "Enlarge childhood memory with my best friend",
      alt: "Jonás and his best friend as kids, in front of rows of seats",
    },
    bethelPhoto: {
      title: "A shared dream",
      caption: "With my best friend during our time at Bethel.",
      label: "Enlarge photo of the two friends at Bethel",
      alt: "Jonás and his best friend at Bethel",
    },
    friendsLine: "My best friend and me, reaching goals and dreams together.",
    grandparentsPhoto: {
      title: "My grandparents",
      caption: "What I learned at their side.",
      label: "Enlarge photo of my maternal grandparents",
      alt: "Jonás’s maternal grandparents together at a table",
    },
    grandparentsEyebrow: "MY GRANDPARENTS",
    grandparentsLine: "Love, wisdom and so many memories.",
    peopleNext: "A LITTLE MORE ABOUT ME",

    selfPhoto: {
      title: "By the sea",
      caption: "A moment outdoors.",
      label: "Enlarge portrait by the sea",
      alt: "Profile portrait of Jonás by the sea",
    },
    selfEyebrow: "03 / WHO I AM",
    selfTitle: "A little about me.",
    selfLead: "Curious by nature.",
    selfStory:
      "I like getting to the bottom of things, asking questions and discovering something new every day. I enjoy exploring new places, spending time in nature and meeting people who see the world differently.",
    selfAlone:
      "I also really value my time alone. I like having room to think, to imagine and to get a little lost in my own world.",
    traitsEyebrow: "How my friends describe me",
    traits: ["Calm", "Genuine", "Kind", "Helpful"],
    faith:
      "My faith is an important part of who I am. It guides my values, my choices and my everyday effort to do good.",
    selfNext: "THE THINGS I ENJOY",

    enjoyEyebrow: "04 / WHAT I ENJOY",
    enjoyTitle: "What I enjoy.",
    enjoyLead: "There’s always something to discover.",
    waterfallPhoto: {
      title: "Exploring",
      caption: "Mountains, rivers and time outdoors.",
      label: "Enlarge photo of the waterfall",
      alt: "A person at the foot of a large waterfall covered in greenery",
    },
    photographyEyebrow: "PHOTOGRAPHY",
    photographyTitle: ["Look. Pause.", "Remember."],
    photographyBody: "I take photos to hold on to landscapes, small details and good moments.",
    companyEyebrow: "IN GOOD COMPANY",
    companyTitle: "Even better with friends.",
    dayPhoto: {
      title: "A day with friends",
      caption: "Good times with my friends.",
      label: "Enlarge photo: A day with friends",
      alt: "Friends in life jackets next to a jet ski",
    },
    waterPhoto: {
      title: "In the water",
      caption: "Heading out to discover, together.",
      label: "Enlarge photo: In the water",
      alt: "Two people in helmets and life jackets in the water, between rock walls",
    },
    plansEyebrow: "EXPLORE",
    plansTitle: "My favorite plans.",
    plansBody: "Mountains, rivers, new places and time with friends.",
    musicEyebrow: "MUSIC",
    musicTitle: "The music that keeps me company.",
    musicBody: "Film scores, timeless ballads and songs with a touch of nostalgia.",
    storiesEyebrow: "STORIES",
    storiesTitle: "After the credits.",
    storiesBody: "Films, anime and series that keep me thinking a little longer.",
    enjoyNext: "EXPERIENCES THAT SHAPED ME",

    pathEyebrow: "05 / EXPERIENCES THAT SHAPED ME",
    pathTitle: "My path.",
    pathMotto: ["Serve.", "Learn.", "Share."],
    preachingEyebrow: "SHARE · THE PREACHING WORK",
    preachingTitle: "Connecting with people.",
    preachingBody:
      "Sharing the Bible with others has been part of my life since I was a child. Over the years, it has taught me to care more about the people right in front of me. It has also helped me grow socially and, above all, strengthen my faith.",
    preachingPhoto: {
      title: "In the preaching work",
      caption: "Sharing with others.",
      label: "Enlarge photo: Sharing with others",
      alt: "A group of people of different ages outdoors during the preaching work",
    },
    littlePhoto: {
      title: "Since I was little",
      caption: "Preaching since I was a kid.",
      label: "Enlarge photo: Preaching since I was a kid",
      alt: "An adult and three children sharing a moment during the preaching work",
    },
    volunteerEyebrow: "SERVE · VOLUNTEERING",
    volunteerTitle: "Shoulder to shoulder.",
    volunteerBody:
      "Volunteering has been a constant in my life: a way to serve, to learn and to grow alongside others.",
    volunteerPhoto: {
      title: "Volunteering",
      caption: "Serving makes us happy.",
      label: "Enlarge photo: Serving makes us happy",
      alt: "Volunteers next to a wall, several in work vests",
    },
    workPhoto: {
      title: "Hard at work",
      caption: "Hard work we enjoy.",
      label: "Enlarge photo: Hard work we enjoy",
      alt: "Three volunteers on a work platform",
    },
    pathNext: "AND THERE’S STILL A WAY TO GO",

    dreamEyebrow: "06 / WHERE I’M HEADED",
    dreamTitle: "What I dream of.",
    dreamBody:
      "A simple life, close to nature, with time for the people I love, work that excites me and places I’ve yet to see.",
    dreamScript: ["There’s still so much", "left to discover."],
    dreamPhoto: {
      title: "What I dream of",
      caption: "A simple life, close to nature.",
      label: "Enlarge photo by the lake",
      alt: "A person seen from behind looking out at a lake and the mountains",
    },

    endingEyebrow: "THIS IS WHAT I CARRY WITH ME",
    endingTitle: ["My little universe", "keeps growing."],
    endingBack: "BACK TO THE CONSTELLATION ↑",
    endingOrbit: "BACK TO ORBIT ↗",
    nextDestination: "Next destination",
  },
});
