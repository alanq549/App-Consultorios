import { useEffect, useState, useMemo } from "react";
import Particles from "@tsparticles/react";
import { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { RecursivePartial, IOptions } from "@tsparticles/engine";


// Hook para detectar el tema oscuro (sin cambios, ya que funciona bien para la detección)
const useDarkTheme = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      const isDarkActive = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      setIsDark(isDarkActive);
    };

    checkDark(); 

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return isDark;
};


export default function DynamicBackground() {
  const [ready, setReady] = useState(false);
  const isDark = useDarkTheme(); 

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setReady(true);
    });
  }, []);

  // Opciones de configuración de partículas para el tema de CONSULTORIO (Orden y Calma)
const particlesOptions: RecursivePartial<IOptions> = useMemo(() => ({
    fullScreen: false,
    background: {
      color: "transparent"
    },
    particles: {
      number: {
        value: 40, // Menos partículas para un look más limpio y menos cargado
        density: { enable: true, value_area: 1000 }
      },
      color: {
        // Colores profesionales: Blanco roto o Gris claro en el tema oscuro, Azul muy claro en el tema claro.
        value: isDark ? "#E0E0E0" : "#A6CBEF" 
      },
      shape: {
        type: "circle", 
      },
      opacity: {
        value: isDark ? 0.2 : 0.4, // Opacidad muy baja para que sea un fondo discreto
        random: false, // Menos variación de opacidad para un efecto más uniforme
      },
      size: {
        value: 1.5, // Partículas muy pequeñas para un efecto de "grano fino" o "flujo de datos"
        random: true,
        anim: { enable: false } // Desactivamos la animación de tamaño para estabilidad
      },
      links: {
        enable: true,
        distance: 180, // Distancia mayor, simulando una red organizada de información o conexiones
        color: isDark ? "#4F4F4F" : "#D0E0F0", // Líneas casi invisibles (Gris oscuro/Azul muy pálido)
        opacity: isDark ? 0.05 : 0.1, // Opacidad extremadamente baja para las líneas
        width: 1,
      },
      move: {
        enable: true,
        speed: 0.2, // Movimiento MUY lento y uniforme (sensación de flujo de datos estable)
        direction: "none",
        random: false,
        straight: false,
        out_mode: "bounce", // Hacen "rebotar" en los bordes en lugar de desaparecer
      },
    },
 interactivity: {
  events: {
    onhover: {
      enable: false,
    },
    onclick: {
      enable: false,
    },
    resize: {
      enable: true
    }
  }
}

  }), [isDark]); 

  if (!ready) return null;

return (
  <>
    <div className="medical-gradient-bg" />
    <div className="absolute inset-0 z-0 overflow-hidden">
      <Particles id="tsparticles-clinic" options={particlesOptions} />
    </div>
  </>
);

}