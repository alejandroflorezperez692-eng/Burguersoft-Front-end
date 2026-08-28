import { useCallback, useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import {
  Hamburger,
  Pizza,
  Sandwich,
  CupSoda,
  IceCreamCone,
} from 'lucide-react';

const COLORES = ['#E8821A', '#c8382a', '#f5a623', '#d4761a', '#2c1810'];

type Icono = 'Hamburger' | 'Pizza' | 'Sandwich' | 'CupSoda' | 'IceCreamCone';

const ICONOS: Icono[] = ['Hamburger', 'Pizza', 'Sandwich', 'CupSoda', 'IceCreamCone'];

const MAPA_ICONOS: Record<Icono, typeof Hamburger> = {
  Hamburger,
  Pizza,
  Sandwich,
  CupSoda,
  IceCreamCone,
};

function IconoParticula({ icono, size }: { icono: Icono; size: number }) {
  const Componente = MAPA_ICONOS[icono];
  return (
    <Componente
      size={size}
      strokeWidth={1.6}
      color="#8a4a12"
      fill="rgba(232, 130, 26, 0.25)"
      aria-hidden="true"
    />
  );
}

type Particula = {
  id: number;
  icono: Icono;
  size: number;
  left: number;
  top: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
};

type Explosion = {
  id: number;
  x: number;
  y: number;
  icono: Icono;
};

let siguienteId = 0;

function iconoAleatorio(): Icono {
  return ICONOS[Math.floor(Math.random() * ICONOS.length)];
}

function generarUno(delay = 0): Particula {
  return {
    id: siguienteId++,
    icono: iconoAleatorio(),
    size: 34 + Math.random() * 30,
    left: Math.random() * 100,
    top: Math.random() * 62,
    duration: 11 + Math.random() * 14,
    delay,
    opacity: 0.75 + Math.random() * 0.25,
    color: COLORES[Math.floor(Math.random() * COLORES.length)],
  };
}

function generar() {
  return Array.from({ length: 35 }, (_, i) => generarUno(i * 0.9 + Math.random() * 0.4));
}

export default function FondoParticulas() {
  const [particulas, setParticulas] = useState<Particula[]>(generar);
  const [explosiones, setExplosiones] = useState<Explosion[]>([]);

  const explotar = useCallback((p: Particula, e: MouseEvent<HTMLElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const id = siguienteId++;
    setExplosiones((prev) => [...prev, { id, x, y, icono: p.icono }]);
    window.setTimeout(() => {
      setExplosiones((prev) => prev.filter((exp) => exp.id !== id));
    }, 700);

    // La partícula estalla y nace una nueva en su lugar
    setParticulas((prev) =>
      prev.map((part) => (part.id === p.id ? generarUno() : part))
    );
  }, []);

  const piezas = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angulo = (i / 12) * Math.PI * 2;
        const distancia = 30 + Math.random() * 50;
        return {
          x: Math.cos(angulo) * distancia,
          y: Math.sin(angulo) * distancia,
          rot: Math.random() * 360 - 180,
          delay: Math.random() * 0.05,
        };
      }),
    []
  );

  return (
    <>
      <div className="auth-fondo-animado" aria-hidden="true">
        {particulas.map((p) => (
          <button
            key={p.id}
            type="button"
            tabIndex={-1}
            className="auth-particula"
            onClick={(e) => explotar(p, e)}
            style={
              {
                left: `${p.left}%`,
                top: `${p.top}%`,
                '--p-opacidad': p.opacity,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              } as CSSProperties
            }
            aria-hidden="true"
          >
            <span className="auth-particula-emoji" style={{ color: p.color }}>
              <IconoParticula icono={p.icono} size={p.size} />
            </span>
          </button>
        ))}
      </div>

      {explosiones.map((exp) => (
        <div key={exp.id} className="auth-explosion" style={{ left: exp.x, top: exp.y }}>
          {piezas.map((pieza, i) => (
            <span
              key={i}
              className="auth-esquirla"
              style={
                {
                  '--ex': `${pieza.x}px`,
                  '--ey': `${pieza.y}px`,
                  '--er': `${pieza.rot}deg`,
                  '--ed': `${pieza.delay}s`,
                } as CSSProperties
              }
            >
              <IconoParticula icono={exp.icono} size={18} />
            </span>
          ))}
        </div>
      ))}
    </>
  );
}
