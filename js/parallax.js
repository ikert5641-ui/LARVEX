/* ============================================================
   LARVEX – Efectos de scroll con GSAP + ScrollTrigger
   ============================================================ */
(function () {
  'use strict';

  // Verificar si GSAP y ScrollTrigger están disponibles
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('GSAP o ScrollTrigger no cargados. Se omiten las animaciones.');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Respetar prefers-reduced-motion
  const prefiereMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefiereMenosMovimiento) {
    // No aplicar animaciones
    return;
  }

  // Integración con Lenis (si existe)
  if (window.lenis) {
    window.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      window.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  // ----------------------------------------------------------
  // 1. Parallax de imágenes en secciones 2, 3 y 4
  // ----------------------------------------------------------
  const imagenesParallax = document.querySelectorAll('.imagen-seccion img');

  imagenesParallax.forEach((img) => {
    // Animación de escala y opacidad
      gsap.fromTo(
      img,
      { scale: 1, opacity: 0 }, // <-- Cambiamos el 0.7 por 1
      {
        scale: 1.15, // <-- Bajamos un poquito el 1.2 para que no se recorte tanto
        opacity: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: img,
          start: 'top bottom',
          end: '+=600',
          scrub: true,
        },
      }
    );

    // Movimiento vertical más lento que el scroll (parallax)
    gsap.to(img, {
      yPercent: -20,
      ease: 'none',
      scrollTrigger: {
        trigger: img,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });

  // ----------------------------------------------------------
  // 2. Aparición suave de textos y títulos
  // ----------------------------------------------------------
  const elementosTexto = document.querySelectorAll(
    '.titulo-seccion, .texto-seccion p, .texto-intro, .lista-equipo li, .seccion-fuentes li'
  );

  elementosTexto.forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // ----------------------------------------------------------
  // 3. Parallax del fondo de la sección Inicio
  // ----------------------------------------------------------
  const fondoInicio = document.getElementById('fondo-inicio');
  if (fondoInicio) {
    gsap.to(fondoInicio, {
      yPercent: 20,
      ease: 'none',
      scrollTrigger: {
        trigger: '#inicio',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  // ----------------------------------------------------------
  // 4. Animación de entrada de los botones de inicio
  // ----------------------------------------------------------
  const botonesInicio = document.querySelectorAll('.botones-inicio .boton');
  if (botonesInicio.length > 0) {
    gsap.fromTo(
      botonesInicio,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.2,
        ease: 'power2.out',
        delay: 0.3,
      }
    );
  }
})();
