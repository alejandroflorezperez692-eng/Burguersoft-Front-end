import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

interface Alerta {
  tipo: 'stock' | 'precio';
  nivel: 'alta' | 'media' | 'info';
  titulo: string;
  detalle: string;
}

interface AvisoEmergente {
  alerta: Alerta;
  extra: number;
}

const CLAVE_LEIDAS = 'notificaciones_leidas';
const CADA_MS = 10_000; // revisa si hay alertas nuevas cada 10 segundos
const DURACION_AVISO = 3000; // el aviso se queda 3 segundos
const DURACION_SALIDA = 300; // animación de subida

const ICONO: Record<Alerta['tipo'], string> = { stock: '📦', precio: '💲' };

const claveAlerta = (a: Alerta) => `${a.tipo}|${a.titulo}`;

function leerLeidas(): string[] {
  try {
    const raw = localStorage.getItem(CLAVE_LEIDAS);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/* ---------- Sonido de campanita (Web Audio, no necesita archivos) ---------- */
let audioCtx: AudioContext | null = null;
let sonidoPendiente = false;

function obtenerAudio(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  } catch {
    return null;
  }
}

function reproducir(ctx: AudioContext) {
  try {
    const t0 = ctx.currentTime + 0.02;
    [
      { freq: 880, inicio: 0 },
      { freq: 1318.5, inicio: 0.14 },
    ].forEach(({ freq, inicio }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + inicio);
      gain.gain.exponentialRampToValueAtTime(0.28, t0 + inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + inicio + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + inicio);
      osc.stop(t0 + inicio + 0.75);
    });
  } catch {
    /* si falla el audio, no pasa nada */
  }
}

function sonarCampanita() {
  const ctx = obtenerAudio();
  if (!ctx) return;

  if (ctx.state === 'running') {
    reproducir(ctx);
    return;
  }

  // Intenta activarlo ahora mismo; si el navegador lo permite, suena al instante
  ctx
    .resume()
    .then(() => {
      if (ctx.state === 'running') reproducir(ctx);
      else sonidoPendiente = true;
    })
    .catch(() => {
      sonidoPendiente = true;
    });
}

export default function NotificacionesBoton() {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [leidas, setLeidas] = useState<string[]>(leerLeidas);
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState<AvisoEmergente | null>(null);
  const [avisoSaliendo, setAvisoSaliendo] = useState(false);
  const [sonando, setSonando] = useState(false);

  const contenedor = useRef<HTMLDivElement>(null);
  const conocidas = useRef<Set<string> | null>(null);
  const timers = useRef<number[]>([]);
  const leidasRef = useRef<string[]>(leidas);
  const sinLeerRef = useRef(0);

  const visibles = alertas.filter((a) => !leidas.includes(claveAlerta(a)));
  const sinLeer = visibles.length;
  sinLeerRef.current = sinLeer;

  const limpiarTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const sacudirCampana = useCallback(() => {
    setSonando(true);
    window.setTimeout(() => setSonando(false), 1000);
  }, []);

  const cerrarAviso = useCallback(() => {
    limpiarTimers();
    setAvisoSaliendo(true);
    timers.current.push(
      window.setTimeout(() => {
        setAviso(null);
        setAvisoSaliendo(false);
      }, DURACION_SALIDA),
    );
  }, []);

  const mostrarAviso = useCallback(
    (nuevas: Alerta[]) => {
      limpiarTimers();
      setAvisoSaliendo(false);
      setAviso({ alerta: nuevas[0], extra: nuevas.length - 1 });
      sonarCampanita();
      sacudirCampana();
      timers.current.push(window.setTimeout(cerrarAviso, DURACION_AVISO));
    },
    [cerrarAviso, sacudirCampana],
  );

  const cargar = useCallback(() => {
    apiClient
      .get<{ alertas: Alerta[] }>('/alertas')
      .then(({ data }) => {
        const lista = Array.isArray(data?.alertas) ? data.alertas : [];
        setAlertas(lista);

        const clavesActuales = new Set(lista.map(claveAlerta));
        const vigentes = leidasRef.current.filter((k) => clavesActuales.has(k));
        if (vigentes.length !== leidasRef.current.length) {
        leidasRef.current = vigentes;
        setLeidas(vigentes);
        try {
            localStorage.setItem(CLAVE_LEIDAS, JSON.stringify(vigentes));
        } catch {
            /* sin almacenamiento */
        }
        }

        const previas = conocidas.current;
        const nuevas = lista.filter((a) => {
          const k = claveAlerta(a);
          return !leidasRef.current.includes(k) && (previas === null || !previas.has(k));
        });
        conocidas.current = new Set(lista.map(claveAlerta));

        if (nuevas.length > 0) mostrarAviso(nuevas);
      })
      .catch(() => setAlertas([]));
  }, [mostrarAviso]);

    useEffect(() => {
    cargar();
    const id = setInterval(cargar, CADA_MS);

    const alVolver = () => {
        if (!document.hidden) cargar();
    };
    window.addEventListener('focus', alVolver);
    document.addEventListener('visibilitychange', alVolver);

    return () => {
        clearInterval(id);
        window.removeEventListener('focus', alVolver);
        document.removeEventListener('visibilitychange', alVolver);
    };
    }, [cargar]);

  // Desbloquea el audio con el primer clic/tecla y toca el sonido que quedó pendiente
  useEffect(() => {
    const ctx = obtenerAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => undefined);

    const desbloquear = () => {
      const c = obtenerAudio();
      if (!c) return;
      c.resume()
        .then(() => {
          if (c.state !== 'running') return;
          if (sonidoPendiente && sinLeerRef.current > 0) {
            sonidoPendiente = false;
            reproducir(c);
          }
          quitar();
        })
        .catch(() => undefined);
    };

    const eventos = ['pointerdown', 'click', 'keydown', 'touchstart', 'mousemove'] as const;
    const quitar = () => eventos.forEach((e) => window.removeEventListener(e, desbloquear));
    eventos.forEach((e) => window.addEventListener(e, desbloquear, { passive: true }));

    return quitar;
  }, []);

  useEffect(() => () => limpiarTimers(), []);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const marcarTodas = () => {
    const todas = alertas.map(claveAlerta);
    leidasRef.current = todas;
    sonidoPendiente = false;
    setLeidas(todas);
    try {
      localStorage.setItem(CLAVE_LEIDAS, JSON.stringify(todas));
    } catch {
      /* sin almacenamiento */
    }
  };

  return (
    <div className="notif" ref={contenedor}>
      <button
        type="button"
        className={`notif-btn${abierto ? ' open' : ''}${sonando ? ' ring' : ''}`}
        onClick={() => setAbierto((v) => !v)}
        aria-label={sinLeer > 0 ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
        aria-haspopup="true"
        aria-expanded={abierto}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {sinLeer > 0 && <span className="notif-badge">{sinLeer > 9 ? '9+' : sinLeer}</span>}
      </button>

      {abierto && (
        <div className="notif-panel" role="dialog" aria-label="Notificaciones">
          <div className="notif-head">
            <strong>Notificaciones</strong>
            {sinLeer > 0 && (
              <button type="button" className="notif-link" onClick={marcarTodas}>
                Marcar como leídas
              </button>
            )}
          </div>

          <div className="notif-lista">
            {visibles.length === 0 ? (
                <p className="notif-vacio">No tienes notificaciones por ahora 🎉</p>
                ) : (
                visibles.map((a) => {
                const nueva = !leidas.includes(claveAlerta(a));
                return (
                  <div key={claveAlerta(a)} className={`notif-item nivel-${a.nivel}${nueva ? ' nueva' : ''}`}>
                    <span className="notif-ico" aria-hidden="true">{ICONO[a.tipo]}</span>
                    <div>
                      <p className="notif-titulo">{a.titulo}</p>
                      <p className="notif-detalle">{a.detalle}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            type="button"
            className="notif-pie"
            onClick={() => {
              setAbierto(false);
              navigate('/inicio');
            }}
          >
            Ver resumen en Inicio
          </button>
        </div>
      )}

      {aviso &&
        createPortal(
          <div
            className={`notif-toast nivel-${aviso.alerta.nivel}${avisoSaliendo ? ' salir' : ''}`}
            role="alert"
            onClick={() => {
              cerrarAviso();
              setAbierto(true);
            }}
          >
            <span className="notif-toast-ico" aria-hidden="true">{ICONO[aviso.alerta.tipo]}</span>
            <div className="notif-toast-txt">
              <p className="notif-toast-titulo">{aviso.alerta.titulo}</p>
              <p className="notif-toast-detalle">{aviso.alerta.detalle}</p>
              {aviso.extra > 0 && (
                <p className="notif-toast-mas">
                  +{aviso.extra} notificación{aviso.extra > 1 ? 'es' : ''} más
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}