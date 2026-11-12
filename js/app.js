/* ============================================================
   LARVEX – Lógica principal
   ============================================================ */

// ---------- Utilidades ----------
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ---------- Estado global ----------
let mapa;
let marcadoresReportes = [];
let reportes = [];
let mapaListo = false;

// ============================================================
// 1. INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  inicializarMenu();
  // ============================================================
// ENCABEZADO SÓLIDO AL HACER SCROLL
// ============================================================
function inicializarEncabezadoScroll() {
  const header = document.getElementById('encabezado');
  if (!header) return;

  window.addEventListener('scroll', () => {
    // Si bajamos más de 50 píxeles, el menú se vuelve sólido
    if (window.scrollY > 50) {
      header.classList.remove('transparente');
      header.classList.add('solido');
    } else {
      // Si volvemos arriba, vuelve a ser transparente
      header.classList.add('transparente');
      header.classList.remove('solido');
    }
  });
}
  inicializarTema();
  inicializarEncabezadoScroll();
  inicializarScrollSuave();
  inicializarBarraProgreso();
  inicializarEnlacesActivos();
  inicializarMapa();
  inicializarFormularioReporte();
  inicializarJuego();
  cargarRanking();
  inicializarPestanasRanking();
  verificarAlertaLluvia();
  cargarReportesGuardados();
});

// ============================================================
// MENÚ HAMBURGUESA
// ============================================================
function inicializarMenu() {
  const boton = $('#boton-menu');
  const menu = $('#menu-principal');

  if (!boton || !menu) return;

  boton.addEventListener('click', () => {
    const abierto = menu.classList.toggle('abierto');
    boton.classList.toggle('abierto', abierto);
    boton.setAttribute('aria-expanded', abierto);
  });

  // Cerrar al hacer clic en un enlace
  $$('.enlace-menu', menu).forEach(enlace => {
    enlace.addEventListener('click', () => {
      menu.classList.remove('abierto');
      boton.classList.remove('abierto');
      boton.setAttribute('aria-expanded', 'false');
    });
  });
}

// ============================================================
// MODO OSCURO (automático 19:00–06:00 + botón manual)
// ============================================================
function inicializarTema() {
  const boton = $('#boton-tema');
  if (!boton) return;

  const hora = new Date().getHours();
  const esNoche = hora >= 19 || hora < 6;

  // Preferencia guardada
  const guardado = localStorage.getItem('larvex-tema');
  if (guardado === 'oscuro' || (!guardado && esNoche)) {
    document.body.classList.add('modo-oscuro');
    boton.textContent = '☀️';
    boton.setAttribute('aria-label', 'Cambiar a modo claro');
  } else {
    boton.textContent = '🌙';
    boton.setAttribute('aria-label', 'Cambiar a modo oscuro');
  }

  boton.addEventListener('click', () => {
    document.body.classList.toggle('modo-oscuro');
    const oscuro = document.body.classList.contains('modo-oscuro');
    boton.textContent = oscuro ? '☀️' : '🌙';
    boton.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    localStorage.setItem('larvex-tema', oscuro ? 'oscuro' : 'claro');
  });
}

// ============================================================
// SCROLL SUAVE CON LENIS
// ============================================================
function inicializarScrollSuave() {
  // Lenis se inicializa globalmente; aquí solo manejamos los enlaces internos
  if (typeof Lenis === 'undefined') return;

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Enlaces internos
  $$('a[href^="#"]').forEach(enlace => {
    enlace.addEventListener('click', (e) => {
      const target = enlace.getAttribute('href');
      if (target === '#') return;
      const elemento = $(target);
      if (elemento) {
        e.preventDefault();
        lenis.scrollTo(elemento, { offset: -80 });
      }
    });
  });

  // Exponer lenis para ScrollTrigger si es necesario
  window.lenis = lenis;
}

// ============================================================
// BARRA DE PROGRESO DE LECTURA
// ============================================================
function inicializarBarraProgreso() {
  const barra = $('#barra-progreso');
  if (!barra) return;

  window.addEventListener('scroll', () => {
    const alturaTotal = document.documentElement.scrollHeight - window.innerHeight;
    const progreso = (window.scrollY / alturaTotal) * 100;
    barra.style.width = `${progreso}%`;
  }, { passive: true });
}

// ============================================================
// ENLACES ACTIVOS SEGÚN SECCIÓN VISIBLE
// ============================================================
function inicializarEnlacesActivos() {
  const secciones = $$('main section[id]');
  const enlaces = $$('.enlace-menu');

  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
      if (entrada.isIntersecting) {
        const id = entrada.target.id;
        enlaces.forEach(enlace => {
          enlace.classList.toggle('activo', enlace.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  secciones.forEach(sec => observer.observe(sec));
}

// ============================================================
// 5. MAPA Y REPORTES (LEAFLET)
// ============================================================
function inicializarMapa() {
  const contenedor = $('#mapa');
  if (!contenedor || typeof L === 'undefined') return;

  // Coordenadas de Trujillo
  mapa = L.map('mapa', {
    center: [-8.11, -79.03],
    zoom: 13,
    zoomControl: true,
    attributionControl: true,
  });

  // Capa satelital Esri World Imagery (sin API key, con atribución)
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    }
  ).addTo(mapa);

  // Capa de nombres de calles y lugares encima
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 19,
      attribution: '&copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS',
    }
  ).addTo(mapa);

  mapaListo = true;

  // Clic en el mapa para seleccionar ubicación
  mapa.on('click', (e) => {
    const { lat, lng } = e.latlng;
    window._ubicacionSeleccionada = { lat, lng };
    const estado = $('#estado-ubicacion');
    if (estado) {
      estado.textContent = `Ubicación seleccionada: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  });
}

// ============================================================
// FORMULARIO DE REPORTE
// ============================================================
function inicializarFormularioReporte() {
  const form = $('#formulario-reporte');
  if (!form) return;

  // Botón de geolocalización
  const botonUbicacion = $('#boton-ubicacion');
  if (botonUbicacion) {
    botonUbicacion.addEventListener('click', () => {
      if (!navigator.geolocation) {
        $('#estado-ubicacion').textContent = 'Geolocalización no disponible.';
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          window._ubicacionSeleccionada = { lat: latitude, lng: longitude };
          $('#estado-ubicacion').textContent = `Ubicación actual: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          if (mapa) {
            mapa.setView([latitude, longitude], 15);
            L.marker([latitude, longitude]).addTo(mapa);
          }
        },
        () => {
          $('#estado-ubicacion').textContent = 'No se pudo obtener la ubicación. Selecciona en el mapa.';
        }
      );
    });
  }

  // Envío del formulario
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const referencia = $('#referencia').value.trim();
    const tipoFoco = $('#tipo-foco').value;
    const descripcion = $('#descripcion').value.trim();
    const ubicacion = window._ubicacionSeleccionada;

    if (!referencia || !tipoFoco) {
      alert('Completa la referencia y el tipo de foco.');
      return;
    }
    if (!ubicacion) {
      alert('Selecciona una ubicación en el mapa o usa tu ubicación actual.');
      return;
    }

    // Crear reporte
    const reporte = {
      id: Date.now(),
      referencia,
      tipoFoco,
      descripcion,
      lat: ubicacion.lat,
      lng: ubicacion.lng,
      fecha: new Date().toISOString(),
    };

    reportes.push(reporte);
    guardarReportes();

    // Añadir marcador
    agregarMarcadorReporte(reporte);

    // Actualizar contador
    actualizarContadorReportes();

    // Calcular semáforo
    actualizarSemaforo(reporte);

    // Limpiar formulario
    form.reset();
    window._ubicacionSeleccionada = null;
    $('#estado-ubicacion').textContent = '';

    alert('Reporte guardado en este navegador.');
  });
}

function agregarMarcadorReporte(reporte) {
  if (!mapa || !mapaListo) return;

  // Determinar color según riesgo
  const riesgo = calcularRiesgo(reporte.lat, reporte.lng);
  const colores = { verde: '#2ecc71', amarillo: '#f1c40f', rojo: '#e74c3c' };

  const marcador = L.circleMarker([reporte.lat, reporte.lng], {
    radius: 10,
    fillColor: colores[riesgo],
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9,
  }).addTo(mapa);

  // Popup con información
  const fecha = new Date(reporte.fecha);
  const fechaStr = fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  const horaStr = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  const popupHTML = `
    <strong>${reporte.tipoFoco.replace('-', ' ')}</strong><br>
    ${reporte.referencia}<br>
    <em>${fechaStr} ${horaStr}</em><br>
    Riesgo: <strong style="color:${colores[riesgo]}">${riesgo}</strong>
  `;

  marcador.bindPopup(popupHTML);
  marcador.reporteId = reporte.id;
  marcadoresReportes.push(marcador);
}

function calcularRiesgo(lat, lng) {
  // Contar reportes cercanos (radio ~200m)
  const radio = 0.002; // aprox 200m en grados
  const cercanos = reportes.filter(r => {
    const dLat = Math.abs(r.lat - lat);
    const dLng = Math.abs(r.lng - lng);
    return dLat < radio && dLng < radio;
  }).length;

  if (cercanos >= 4) return 'rojo';
  if (cercanos >= 2) return 'amarillo';
  return 'verde';
}

function actualizarSemaforo(reporte) {
  const riesgo = calcularRiesgo(reporte.lat, reporte.lng);
  if (riesgo === 'rojo') {
    // Mostrar aviso visible
    const aviso = document.createElement('div');
    aviso.className = 'aviso-alerta';
    aviso.textContent = '⚠️ Alerta: zona con alto riesgo de criaderos.';
    aviso.style.cssText = 'background:#e74c3c;color:#fff;padding:0.8rem;border-radius:8px;margin-top:1rem;text-align:center;';
    const panel = $('.panel-reporta');
    const existente = panel.querySelector('.aviso-alerta');
    if (existente) existente.remove();
    panel.appendChild(aviso);
  }
}

function guardarReportes() {
  localStorage.setItem('larvex-reportes', JSON.stringify(reportes));
}

function cargarReportesGuardados() {
  const guardados = localStorage.getItem('larvex-reportes');
  if (guardados) {
    try {
      reportes = JSON.parse(guardados);
      reportes.forEach(r => agregarMarcadorReporte(r));
      actualizarContadorReportes();
    } catch (e) {
      console.warn('Error al cargar reportes guardados', e);
    }
  }
}

// Contador animado
function actualizarContadorReportes() {
  const el = $('#total-reportes');
  if (!el) return;
  const total = reportes.length;
  animarNumero(el, total);
}

function animarNumero(elemento, destino) {
  const actual = parseInt(elemento.textContent, 10) || 0;
  if (actual === destino) return;
  const duracion = 500;
  const inicio = performance.now();

  function paso(tiempo) {
    const progreso = Math.min((tiempo - inicio) / duracion, 1);
    const valor = Math.floor(actual + (destino - actual) * progreso);
    elemento.textContent = valor;
    if (progreso < 1) requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);
}

// ============================================================
// 6. ALERTA DE LLUVIA (OPEN-METEO)
// ============================================================
async function verificarAlertaLluvia() {
  const banner = $('#banner-lluvia');
  const texto = $('#texto-banner');
  if (!banner || !texto) return;

  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=-8.11&longitude=-79.03&daily=precipitation_probability_max&timezone=America%2FLima&forecast_days=2';
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error('Error de red');
    const datos = await respuesta.json();

    // El índice 1 corresponde a mañana
    const probManana = datos.daily?.precipitation_probability_max?.[1];
    if (probManana !== undefined && probManana > 40) {
      texto.textContent = `Se pronostica lluvia para mañana en Trujillo (${probManana}% de probabilidad). Revisa recipientes, canaletas y depósitos hoy.`;
      banner.classList.remove('oculto');
      // Ajustar padding del body para que el banner no tape el encabezado
      document.body.style.paddingTop = banner.offsetHeight + 'px';

      $('#cerrar-banner').addEventListener('click', () => {
        banner.classList.add('oculto');
        document.body.style.paddingTop = '0';
      });
    }
    // Si no supera el 40%, no se muestra nada
  } catch (error) {
    // Error de conexión: no romper la página
    console.warn('No se pudo obtener el pronóstico de lluvia:', error);
  }
}

// ============================================================
// 7. JUEGO CAZADOR DE CRIADEROS
// ============================================================
const REGIONES = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho',
  'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
  'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima',
  'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
  'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
];

const PREGUNTAS = [
  {
    pregunta: '¿Cómo se transmite el dengue?',
    opciones: [
      'Por la picadura del mosquito Anopheles al atardecer',
      'Por la picadura de la hembra del Aedes aegypti',
      'Por el contacto con la saliva de una persona enferma',
      'Por ingerir agua que no ha sido hervida'
    ],
    correcta: 1,
    explicacion: 'El dengue se transmite por la picadura de la hembra infectada del Aedes aegypti. No se transmite de persona a persona.'
  },
  {
    pregunta: '¿Cuánto tiempo tarda una larva de Aedes aegypti en convertirse en zancudo adulto?',
    opciones: [
      'Entre 1 y 2 días en climas cálidos',
      'Alrededor de 7 a 10 días en condiciones favorables',
      'Hasta 20 días si el agua está sucia',
      'Solo 24 horas después de la picadura'
    ],
    correcta: 1,
    explicacion: 'En condiciones favorables, la larva pasa a adulto en unos 7 a 10 días. Por eso se recomienda revisar los recipientes cada semana.'
  },
  {
    pregunta: '¿Cuál de estos NO es un síntoma frecuente del dengue?',
    opciones: [
      'Fiebre alta de inicio repentino y sarpullido',
      'Dolor muscular, articular y detrás de los ojos',
      'Dolor de oído intenso y pérdida de audición',
      'Náuseas, vómitos y dolor de cabeza intenso'
    ],
    correcta: 2,
    explicacion: 'El dolor de oído no es un síntoma típico. Los síntomas comunes son fiebre alta, dolor de cabeza, dolor detrás de los ojos, dolor muscular, sarpullido, náuseas o vómitos.'
  },
  {
    pregunta: '¿Cuál es un signo de alarma que exige atención médica inmediata?',
    opciones: [
      'Estornudos frecuentes y congestión nasal',
      'Picazón leve en los brazos y piernas',
      'Dolor abdominal intenso y vómitos persistentes',
      'Sed excesiva y ganas de comer dulces'
    ],
    correcta: 2,
    explicacion: 'El dolor abdominal intenso y los vómitos persistentes son signos de alarma. También lo son el sangrado de nariz o encías y la somnolencia o irritabilidad.'
  },
  {
    pregunta: '¿Qué se recomienda hacer ante fiebre alta por posible dengue?',
    opciones: [
      'Tomar aspirina para bajar la fiebre rápidamente',
      'Esperar tres días en casa antes de ir al médico',
      'Beber solo líquidos fríos y reposar boca abajo',
      'Acudir al centro de salud y no automedicarse'
    ],
    correcta: 3,
    explicacion: 'Ante fiebre alta, se debe acudir al centro de salud más cercano y no automedicarse con aspirina ni ibuprofeno, ya que pueden agravar la enfermedad.'
  },
  {
    pregunta: '¿En qué consiste la descacharrización?',
    opciones: [
      'Fumigar toda la casa con insecticidas en aerosol',
      'Eliminar o voltear recipientes que acumulan agua',
      'Pintar las paredes de blanco para ahuyentar zancudos',
      'Usar repelente en el cuerpo todos los días'
    ],
    correcta: 1,
    explicacion: 'La descacharrización consiste en eliminar o voltear baldes, llantas, botellas y cualquier recipiente que pueda acumular agua y convertirse en criadero.'
  },
  {
    pregunta: '¿Dónde suele poner sus huevos el zancudo Aedes aegypti?',
    opciones: [
      'En agua sucia, estancada y con mal olor',
      'En la tierra seca de las macetas y jardines',
      'En agua limpia y quieta dentro de recipientes',
      'En las hojas de los árboles y arbustos'
    ],
    correcta: 2,
    explicacion: 'La hembra del Aedes aegypti prefiere agua limpia y quieta. Por eso los baldes, floreros, canaletas y llantas con agua de lluvia son criaderos ideales.'
  },
  {
    pregunta: '¿Cuál de estas medidas ayuda a prevenir el dengue en casa?',
    opciones: [
      'Dejar las llantas en el patio para que se sequen',
      'Acumular agua en botellas abiertas por si acaso',
      'Lavar con escobilla los bordes de baldes y tanques',
      'Cerrar todas las ventanas durante el día'
    ],
    correcta: 2,
    explicacion: 'Lavar con escobilla los bordes de baldes y tanques elimina los huevos del zancudo adheridos a las paredes. También se recomienda tapar depósitos y limpiar canaletas.'
  }
];

let juegoEstado = {
  nombre: '',
  region: '',
  indice: 0,
  puntaje: 0,
  aciertos: 0,
  respondidas: false,
};

function inicializarJuego() {
  const selectRegion = $('#region-jugador');
  if (selectRegion) {
    REGIONES.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      selectRegion.appendChild(opt);
    });
  }

  const botonComenzar = $('#boton-comenzar-juego');
  if (botonComenzar) {
    botonComenzar.addEventListener('click', comenzarJuego);
  }

  const botonSiguiente = $('#boton-siguiente');
  if (botonSiguiente) {
    botonSiguiente.addEventListener('click', siguientePregunta);
  }

  const botonReiniciar = $('#boton-jugar-de-nuevo');
  if (botonReiniciar) {
    botonReiniciar.addEventListener('click', reiniciarJuego);
  }

  const botonWhatsApp = $('#boton-compartir-whatsapp');
  if (botonWhatsApp) {
    botonWhatsApp.addEventListener('click', compartirWhatsApp);
  }
}

function comenzarJuego() {
  const nombre = $('#nombre-jugador').value.trim();
  const region = $('#region-jugador').value;

  if (!nombre || !region) {
    alert('Escribe tu nombre y selecciona tu región.');
    return;
  }

  juegoEstado = {
    nombre,
    region,
    indice: 0,
    puntaje: 0,
    aciertos: 0,
    respondidas: false,
  };

  $('#juego-inicio').classList.add('oculto');
  $('#juego-preguntas').classList.remove('oculto');
  $('#juego-resultados').classList.add('oculto');

  mostrarPregunta();
}

function mostrarPregunta() {
  const p = PREGUNTAS[juegoEstado.indice];
  $('#numero-pregunta').textContent = `Pregunta ${juegoEstado.indice + 1} de ${PREGUNTAS.length}`;
  $('#puntaje-actual').textContent = `${juegoEstado.puntaje} puntos`;
  $('#progreso-juego').style.width = `${(juegoEstado.indice / PREGUNTAS.length) * 100}%`;
  $('#texto-pregunta').textContent = p.pregunta;

  const contenedor = $('#opciones-pregunta');
  contenedor.innerHTML = '';

  p.opciones.forEach((op, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'opcion';
    btn.textContent = op;
    btn.dataset.indice = i;
    btn.addEventListener('click', () => seleccionarOpcion(i));
    contenedor.appendChild(btn);
  });

  $('#retroalimentacion').classList.add('oculto');
  $('#boton-siguiente').classList.add('oculto');
  juegoEstado.respondidas = false;
}

function seleccionarOpcion(indice) {
  if (juegoEstado.respondidas) return;
  juegoEstado.respondidas = true;

  const p = PREGUNTAS[juegoEstado.indice];
  const opciones = $$('.opcion');
  const esCorrecta = indice === p.correcta;

  opciones.forEach((btn, i) => {
    if (i === p.correcta) btn.classList.add('correcta');
    if (i === indice && !esCorrecta) btn.classList.add('incorrecta');
    btn.disabled = true;
  });

  if (esCorrecta) {
    juegoEstado.puntaje += 100;
    juegoEstado.aciertos += 1;
  }

  const retro = $('#retroalimentacion');
  retro.classList.remove('oculto');
  retro.classList.add(esCorrecta ? 'exito' : 'error');
  retro.textContent = esCorrecta
    ? `✅ ¡Correcto! ${p.explicacion}`
    : `❌ Incorrecto. ${p.explicacion}`;

  $('#puntaje-actual').textContent = `${juegoEstado.puntaje} puntos`;
  $('#boton-siguiente').classList.remove('oculto');

  if (juegoEstado.indice === PREGUNTAS.length - 1) {
    $('#boton-siguiente').textContent = 'Ver resultado';
  }
}

function siguientePregunta() {
  juegoEstado.indice += 1;

  if (juegoEstado.indice >= PREGUNTAS.length) {
    finalizarJuego();
    return;
  }

  mostrarPregunta();
}

function finalizarJuego() {
  $('#juego-preguntas').classList.add('oculto');
  $('#juego-resultados').classList.remove('oculto');

  const puntaje = juegoEstado.puntaje;
  const aciertos = juegoEstado.aciertos;

  $('#puntaje-final').textContent = `${puntaje} / 800 puntos`;
  let mensaje = '';
  if (puntaje === 800) mensaje = '¡Excelente! Eres un experto en prevención del dengue.';
  else if (puntaje >= 500) mensaje = '¡Muy bien! Sabes lo necesario para cuidarte y cuidar a tu comunidad.';
  else if (puntaje >= 300) mensaje = 'Vas por buen camino. Repasa las secciones de prevención y vuelve a intentarlo.';
  else mensaje = 'Necesitas repasar un poco más. Lee las secciones de El problema y Prevención.';

  $('#mensaje-final').textContent = mensaje;

  // Guardar en ranking
  guardarEnRanking({
    nombre: juegoEstado.nombre,
    region: juegoEstado.region,
    puntaje,
    aciertos,
    total: PREGUNTAS.length,
    fecha: new Date().toISOString(),
  });

  cargarRanking();
}

function reiniciarJuego() {
  $('#juego-resultados').classList.add('oculto');
  $('#juego-inicio').classList.remove('oculto');
  $('#nombre-jugador').value = '';
  $('#region-jugador').value = '';
  juegoEstado = { nombre: '', region: '', indice: 0, puntaje: 0, aciertos: 0, respondidas: false };
}

function compartirWhatsApp() {
  const texto = `He jugado Cazador de Criaderos de Larvex y obtuve ${juegoEstado.puntaje}/800 puntos (${juegoEstado.aciertos}/8 aciertos). ¡Tú también puedes prevenir el dengue! https://andrw-07.github.io/Larvex/`;
  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank');
}

// ============================================================
// RANKING (localStorage)
// ============================================================
const CLAVE_RANKING = 'larvex-ranking';

function guardarEnRanking(registro) {
  let ranking = JSON.parse(localStorage.getItem(CLAVE_RANKING) || '[]');
  ranking.push(registro);
  // Mantener solo los últimos 50 para no crecer indefinidamente
  if (ranking.length > 50) ranking = ranking.slice(-50);
  localStorage.setItem(CLAVE_RANKING, JSON.stringify(ranking));
}

function cargarRanking() {
  const ranking = JSON.parse(localStorage.getItem(CLAVE_RANKING) || '[]');
  mostrarRankingMejores(ranking);
}

function mostrarRankingMejores(ranking) {
  const contenedor = $('#contenido-ranking');
  if (!contenedor) return;

  // Ordenar por puntaje descendente, luego por fecha
  const ordenado = [...ranking].sort((a, b) => b.puntaje - a.puntaje || new Date(b.fecha) - new Date(a.fecha));
  const top = ordenado.slice(0, 10);

  if (top.length === 0) {
    contenedor.innerHTML = '<p>Aún no hay jugadores registrados.</p>';
    return;
  }

  let html = '<table><thead><tr><th>#</th><th>Nombre</th><th>Región</th><th>Puntaje</th><th>Aciertos</th></tr></thead><tbody>';
  top.forEach((r, i) => {
    html += `<tr>
      <td>${i + 1}</td>
      <td>${r.nombre}</td>
      <td>${r.region}</td>
      <td>${r.puntaje}</td>
      <td>${r.aciertos}/${r.total}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  contenedor.innerHTML = html;
}

function mostrarRankingRegiones() {
  const ranking = JSON.parse(localStorage.getItem(CLAVE_RANKING) || '[]');
  const contenedor = $('#contenido-ranking');
  if (!contenedor) return;

  if (ranking.length === 0) {
    contenedor.innerHTML = '<p>Aún no hay datos por región.</p>';
    return;
  }

  // Agrupar por región
  const porRegion = {};
  ranking.forEach(r => {
    if (!porRegion[r.region]) {
      porRegion[r.region] = { puntajes: [], aciertos: [], total: 0 };
    }
    porRegion[r.region].puntajes.push(r.puntaje);
    porRegion[r.region].aciertos.push(r.aciertos);
    porRegion[r.region].total += 1;
  });

  const filas = Object.entries(porRegion).map(([region, datos]) => {
    const promedio = Math.round(datos.puntajes.reduce((a, b) => a + b, 0) / datos.puntajes.length);
    return { region, promedio, cantidad: datos.total };
  }).sort((a, b) => b.promedio - a.promedio);

  let html = '<table><thead><tr><th>Región</th><th>Promedio</th><th>Jugadores</th></tr></thead><tbody>';
  filas.forEach(f => {
    html += `<tr><td>${f.region}</td><td>${f.promedio}</td><td>${f.cantidad}</td></tr>`;
  });
  html += '</tbody></table>';
  contenedor.innerHTML = html;
}

function inicializarPestanasRanking() {
  const pestanas = $$('.pestana');
  pestanas.forEach(p => {
    p.addEventListener('click', () => {
      pestanas.forEach(x => x.classList.remove('activa'));
      p.classList.add('activa');
      if (p.dataset.pestana === 'mejores') {
        cargarRanking();
      } else {
        mostrarRankingRegiones();
      }
    });
  });
}

// MAPA DE CALOR
let capaCalor = null;
let mostrarCalor = false;

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-calor');
  if (!btn) return;

  btn.addEventListener('click', () => {
    mostrarCalor = !mostrarCalor;
    if (mostrarCalor) {
      btn.textContent = '📍 Ver Marcadores';
      btn.classList.replace('boton-secundario', 'boton-primario');
      dibujarCalor();
    } else {
      btn.textContent = '🔥 Ver Mapa de Calor';
      btn.classList.replace('boton-primario', 'boton-secundario');
      if (capaCalor) mapa.removeLayer(capaCalor);
      marcadoresReportes.forEach(m => mapa.addLayer(m));
    }
  });
});

function dibujarCalor() {
  if (!mapa) return;
  marcadoresReportes.forEach(m => mapa.removeLayer(m));
  if (reportes.length === 0) return;

  const puntos = reportes.map(r => {
    const riesgo = calcularRiesgo(r.lat, r.lng);
    let intensidad = riesgo === 'rojo' ? 1.0 : (riesgo === 'amarillo' ? 0.8 : 0.4);
    return [r.lat, r.lng, intensidad];
  });

  if (capaCalor) mapa.removeLayer(capaCalor);
  capaCalor = L.heatLayer(puntos, {
    radius: 35, blur: 20, maxZoom: 15,
    gradient: {0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red'}
  }).addTo(mapa);
}

// ============================================================
// CEREBRO V2 DE DEXTER - LÓGICA COMPLETA
// ============================================================
const conocimientoDexter = [
  {
    palabras: ["sintoma", "fiebre", "duele", "cabeza", "sarpullido", "malestar", "musculo"],
    respuesta: "Los síntomas más frecuentes del dengue son: fiebre alta repentina, dolor de cabeza intenso, dolor detrás de los ojos, dolores musculares y articulares, náuseas y sarpullido. Suelen aparecer entre 4 y 10 días después de la picadura."
  },
  {
    palabras: ["alarma", "grave", "sangrado", "vomito", "abdominal", "desmayo", "muerte", "urgencia"],
    respuesta: "¡ATENCIÓN MÉDICA INMEDIATA! Si presentas dolor abdominal intenso, vómitos persistentes, sangrado de encías o nariz, o mucha somnolencia/irritabilidad. No te automediques con aspirina ni ibuprofeno."
  },
  {
    palabras: ["tratamiento", "curar", "medicina", "pastilla", "paracetamol", "tomar"],
    respuesta: "No existe un medicamento específico para curar el dengue, solo tratamiento para aliviar los síntomas. Se recomienda reposo, abundante líquido y PARACETAMOL para la fiebre. ¡NUNCA tomes aspirina o ibuprofeno, ya que aumentan el riesgo de sangrado!"
  },
  {
    palabras: ["contagio", "persona", "saliva", "estornudo", "tocar", "beso", "abrazo"],
    respuesta: "El dengue NO se transmite de persona a persona por estar cerca, toser o darse la mano. Solo se contagia por la picadura de la hembra del zancudo Aedes aegypti infectada."
  },
  {
    palabras: ["prevencion", "prevenir", "evitar", "cuidado", "balde", "llanta", "tanque", "criaderos", "limpiar"],
    respuesta: "La medida más efectiva es la descacharrización: voltea baldes, tapa tanques de agua, lava con escobilla los bebederos de animales y elimina llantas o botellas viejas. ¡Recuerda: Sin criaderos, no hay mosquitos!"
  },
  {
    palabras: ["criadero", "larva", "huevo", "agua", "estancada", "charco", "pozo"],
    respuesta: "Un criadero es cualquier recipiente con agua limpia y estancada. A los zancudos les encanta el agua de lluvia acumulada en baldes, floreros, canaletas, botellas y hasta en una tapita de gaseosa."
  },
  {
    palabras: ["mosquito", "zancudo", "aedes", "pica", "vuela", "negro", "rayas"],
    respuesta: "El Aedes aegypti es un zancudo de color oscuro con rayas blancas en las patas. Pica principalmente al amanecer y al atardecer. Su peligro es que transmite el dengue, zika y chikungunya."
  },
  {
    palabras: ["picadura", "me pico", "me pico uno", "me picó", "pique"],
    respuesta: "Si te picó un zancudo, no entres en pánico. Lava la zona con agua y jabón. No te rasques para evitar infecciones. Mantente atento a los síntomas (fiebre, dolor) en los próximos 4 a 10 días. Si presentas fiebre alta, acude al médico."
  },
  {
    palabras: ["niño", "el niño", "lluvia", "clima", "calor", "inundacion"],
    respuesta: "El Fenómeno El Niño provoca lluvias intensas y aumento de temperatura. Esto genera agua estancada en las calles y patios, lo que crea el ambiente perfecto para que el zancudo se reproduzca rápidamente."
  },
  {
    palabras: ["vacuna", "qdenga", "inyeccion"],
    respuesta: "Existe una vacuna llamada Qdenga (TAK-003), recomendada para niños y adolescentes que viven en zonas de riesgo. Sin embargo, la medida más efectiva siempre será eliminar los criaderos en casa."
  },
  {
    palabras: ["reportar", "mapa", "zona", "reporte", "aqui", "aplicacion"],
    respuesta: "Puedes reportar una zona de riesgo usando nuestro mapa interactivo. Ve a la sección 'Reporta' en el menú de arriba, toca el mapa para ubicar el foco de agua estancada y envía el formulario."
  },
  {
    palabras: ["mito", "verdad", "falso", "creencia"],
    respuesta: "¡Cuidado con los mitos! El dengue no se cura con antibióticos, no solo da en zonas sucias (al zancudo le gusta el agua limpia), y la fumigación sola no es suficiente (hay que eliminar los huevos)."
  },
  {
    palabras: ["hola", "buenos", "tardes", "dias", "noches", "saludos", "que tal"],
    respuesta: "¡Hola! Soy Dexter, tu asistente de Larvex. ¿En qué te puedo ayudar hoy? Puedo hablarte sobre síntomas, prevención, el Fenómeno El Niño o cómo reportar una zona."
  },
  {
    palabras: ["gracias", "genial", "ayuda", "buen trabajo"],
    respuesta: "¡De nada! Juntos podemos prevenir el dengue en Trujillo y el Perú. Recuerda revisar tu patio y tapar tus depósitos de agua. ¿Tienes otra duda?"
  },
  {
    palabras: ["adios", "chau", "luego", "bye", "hasta"],
    respuesta: "¡Hasta luego! Recuerda revisar tu patio y tapar tus depósitos de agua hoy mismo. ¡Cuídate mucho!"
  }
];

document.addEventListener('DOMContentLoaded', () => {
  const btnChat = document.getElementById('boton-chat');
  const ventanaChat = document.getElementById('ventana-chat');
  const cerrarChat = document.getElementById('cerrar-chat');
  const inputChat = document.getElementById('input-chat');
  const enviarChat = document.getElementById('enviar-chat');
  const mensajesChat = document.getElementById('mensajes-chat');
  const indicadorEscribiendo = document.getElementById('indicador-escribiendo');

  if (!btnChat) return; 

  btnChat.addEventListener('click', () => {
    ventanaChat.classList.toggle('oculto');
    if (!ventanaChat.classList.contains('oculto')) inputChat.focus();
  });
  
  cerrarChat.addEventListener('click', () => ventanaChat.classList.add('oculto'));

  // Nueva lógica de puntuación para encontrar la mejor respuesta
  function obtenerRespuesta(textoUsuario) {
    const texto = textoUsuario.toLowerCase();
    let mejorRespuesta = null;
    let puntajeMaximo = 0;

    conocimientoDexter.forEach(item => {
      let puntajeActual = 0;
      item.palabras.forEach(palabra => {
        if (texto.includes(palabra)) {
          puntajeActual++;
        }
      });

      if (puntajeActual > puntajeMaximo) {
        puntajeMaximo = puntajeActual;
        mejorRespuesta = item.respuesta;
      }
    });

    if (puntajeMaximo === 0) {
      return "No tengo la respuesta exacta a eso. Te recomiendo leer las secciones de arriba o preguntarme sobre 'síntomas', 'prevención', 'picadura' o 'tratamiento'.";
    }

    return mejorRespuesta;
  }

  function enviarMensaje() {
    const textoUsuario = inputChat.value.trim();
    if (!textoUsuario) return;

    // 1. Mostrar mensaje del usuario
    const msjUser = document.createElement('p');
    msjUser.className = 'msj-user';
    msjUser.textContent = textoUsuario;
    mensajesChat.appendChild(msjUser);
    inputChat.value = '';
    mensajesChat.scrollTop = mensajesChat.scrollHeight;

    // 2. Mostrar "Escribiendo..."
    indicadorEscribiendo.classList.remove('oculto');
    mensajesChat.scrollTop = mensajesChat.scrollHeight;

    // 3. Dexter piensa y responde
    const respuestaFinal = obtenerRespuesta(textoUsuario);
    const tiempoPensar = 800 + (respuestaFinal.length * 5); // Tarda más si la respuesta es larga

    setTimeout(() => {
      indicadorEscribiendo.classList.add('oculto');
      
      const msjBot = document.createElement('p');
      msjBot.className = 'msj-bot';
      msjBot.textContent = respuestaFinal;
      mensajesChat.appendChild(msjBot);
      mensajesChat.scrollTop = mensajesChat.scrollHeight;
    }, tiempoPensar);
  }

  enviarChat.addEventListener('click', enviarMensaje);
  inputChat.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enviarMensaje();
  });
});
