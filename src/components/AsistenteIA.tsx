import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
}

const SUGERENCIAS = [
  '¿Cuánto vendí hoy?',
  '¿Qué insumos se me están acabando?',
  '¿Cuánto he gastado en compras este mes?',
  '¿Qué se vendió más esta semana?',
  '¿Subió el precio de algún insumo?',
];
const ICONOS = ['💰', '📦', '🧾', '🔥', '📈'];

/** Burgi: hamburguesa-robot dibujada en SVG (quieta, solo parpadea) */
function BurgiRobot({ size, uid }: { size: number; uid: string }) {
  const g = (n: string) => `${uid}-${n}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={g('pan')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc15a" />
          <stop offset="1" stopColor="#e98a1d" />
        </linearGradient>
        <linearGradient id={g('panAbajo')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2a33a" />
          <stop offset="1" stopColor="#d9791a" />
        </linearGradient>
        <linearGradient id={g('metal')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9d1db" />
          <stop offset="0.5" stopColor="#8f9aa8" />
          <stop offset="1" stopColor="#6b7684" />
        </linearGradient>
        <linearGradient id={g('visor')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a3142" />
          <stop offset="1" stopColor="#161a26" />
        </linearGradient>
        <radialGradient id={g('led')} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffd0c8" />
          <stop offset="0.45" stopColor="#ff5a45" />
          <stop offset="1" stopColor="#c9271a" />
        </radialGradient>
      </defs>

      {/* Cuerpo de la hamburguesa */}
      <path d="M14 72 H86 C86 84 80 90 70 90 H30 C20 90 14 84 14 72 Z" fill={`url(#${g('panAbajo')})`} />
      <rect x="11" y="60" width="78" height="14" rx="7" fill="#6a3719" />
      <rect x="11" y="68" width="78" height="6" rx="3" fill="#4f2811" />
      <path d="M10 56 H90 L90 60 L78 60 L73 70 L67 60 L33 60 L28 67 L22 60 L10 60 Z" fill="#ffc72c" />
      <rect x="12" y="50" width="76" height="7" rx="3.5" fill="#e5392b" />
      <path d="M10 45 H90 Q95 45 94 50 Q93 53 88 52 Q82 58 76 52 T64 52 T52 52 T40 52 T28 52 T16 52 Q10 57 7 51 Q5 45 10 45 Z" fill="#5cb83a" />

      {/* Antena con luz */}
      <rect x="48.8" y="12" width="2.4" height="14" rx="1.2" fill={`url(#${g('metal')})`} />
      <circle className="burgi-led" cx="50" cy="10" r="4.6" fill={`url(#${g('led')})`} />
      <circle cx="48.4" cy="8.4" r="1.3" fill="#fff" opacity="0.7" />

      {/* Orejas metálicas */}
      <rect x="5.5" y="33" width="8" height="13" rx="3.5" fill={`url(#${g('metal')})`} />
      <rect x="86.5" y="33" width="8" height="13" rx="3.5" fill={`url(#${g('metal')})`} />
      <circle cx="9.5" cy="39.5" r="1.4" fill="#4b5563" />
      <circle cx="90.5" cy="39.5" r="1.4" fill="#4b5563" />

      {/* Pan de arriba */}
      <path d="M12 47 C12 18 88 18 88 47 Z" fill={`url(#${g('pan')})`} />
      <path d="M24 36 C27 29 33 25.5 40 24.5" stroke="#fff2c9" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.6" />

      {/* Visor y ojos */}
      <rect x="25" y="29" width="50" height="17" rx="8.5" fill={`url(#${g('visor')})`} />
      <rect x="25" y="29" width="50" height="17" rx="8.5" fill="none" stroke="#fff2c9" strokeOpacity="0.35" strokeWidth="1" />
      <g className="burgi-ojos">
        <rect x="34.5" y="33" width="8" height="9" rx="4" fill="#7df9ff" />
        <rect x="57.5" y="33" width="8" height="9" rx="4" fill="#7df9ff" />
        <circle cx="37" cy="35.3" r="1.3" fill="#fff" opacity="0.85" />
        <circle cx="60" cy="35.3" r="1.3" fill="#fff" opacity="0.85" />
      </g>

      {/* Semillas de ajonjolí */}
      <g fill="#fff4d0">
        <ellipse cx="20" cy="41" rx="2.6" ry="1.5" transform="rotate(-20 20 41)" />
        <ellipse cx="80" cy="41" rx="2.6" ry="1.5" transform="rotate(20 80 41)" />
        <ellipse cx="33" cy="27" rx="2.4" ry="1.4" transform="rotate(-25 33 27)" />
        <ellipse cx="67" cy="27" rx="2.4" ry="1.4" transform="rotate(25 67 27)" />
      </g>
    </svg>
  );
}

/** Avatar de Burgi: mini orbe de cristal con el robot dentro */
function AvatarBurgi({ size, uid, online, className }: { size: number; uid: string; online?: boolean; className?: string }) {
  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexShrink: 0,
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 32% 24%, #ffffff 0%, #fff4e2 38%, #ffe0b8 72%, #cdf6ff 100%)',
        boxShadow: 'inset 0 -3px 6px rgba(232,130,26,.25), inset 0 2px 4px rgba(255,255,255,.95), 0 0 0 1.5px rgba(232,130,26,.45)',
      }}
    >
      <BurgiRobot size={Math.round(size * 0.74)} uid={uid} />
      {online && (
        <span aria-hidden="true" style={{ position: 'absolute', right: -1, bottom: 0, width: 12, height: 12, borderRadius: '50%', background: '#2ecc71', border: '2px solid var(--surface)' }} />
      )}
    </span>
  );
}

/** Chispas ✨ que titilan alrededor del orbe (posición relativa al botón de 52px) */
const CHISPAS = [
  { left: 41, top: -8, size: 12, color: '#ffb02e', dur: 2.6, delay: 0 },
  { left: 51, top: 31, size: 9, color: '#35d0e0', dur: 3.1, delay: 0.9 },
  { left: -9, top: 5, size: 10, color: '#35d0e0', dur: 2.9, delay: 1.5 },
  { left: -6, top: 40, size: 7, color: '#ffb02e', dur: 2.4, delay: 0.5 },
  { left: 14, top: -10, size: 7, color: '#E8821A', dur: 3.3, delay: 2 },
];

function Chispa({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ display: 'block', filter: `drop-shadow(0 0 3px ${color})` }}>
      <path d="M10 0 C10.8 6 14 9.2 20 10 C14 10.8 10.8 14 10 20 C9.2 14 6 10.8 0 10 C6 9.2 9.2 6 10 0 Z" fill={color} />
    </svg>
  );
}

export default function AsistenteIA() {
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [saludo, setSaludo] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, pensando, abierto]);

  useEffect(() => {
    if (abierto) setTimeout(() => entrada.current?.focus(), 80);
  }, [abierto]);

  // Burgi saluda una sola vez por sesión
  useEffect(() => {
    let yaSaludo = false;
    try { yaSaludo = sessionStorage.getItem('burgiSaludo') === '1'; } catch { /* sin almacenamiento */ }
    if (yaSaludo) return;
    const abrir = setTimeout(() => setSaludo(true), 1800);
    const cerrar = setTimeout(() => setSaludo(false), 9000);
    try { sessionStorage.setItem('burgiSaludo', '1'); } catch { /* sin almacenamiento */ }
    return () => { clearTimeout(abrir); clearTimeout(cerrar); };
  }, []);

  const enviar = async (pregunta?: string) => {
    const mensaje = (pregunta ?? texto).trim();
    if (!mensaje || pensando) return;

    const historial = mensajes.slice(-10);
    setMensajes((m) => [...m, { role: 'user', content: mensaje }]);
    setTexto('');
    setPensando(true);

    try {
      const { data } = await apiClient.post<{ respuesta: string }>('/asistente/chat', {
        mensaje,
        pagina: pathname,
        historial,
      });
      setMensajes((m) => [...m, { role: 'assistant', content: data.respuesta }]);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      let aviso: string;
      if (!status) aviso = 'No hay conexión con el servidor. Verifica que el backend esté encendido.';
      else if (status === 401) aviso = 'Tu sesión expiró. Cierra sesión y vuelve a entrar.';
      else if (status === 403) aviso = 'Esta función es solo para administradores.';
      else if (status >= 500) aviso = `El servidor tuvo un error (${status}). El detalle está en storage/logs/laravel.log del backend.`;
      else aviso = `No pude responder (error ${status}).`;
      setMensajes((m) => [...m, { role: 'assistant', content: aviso }]);
    } finally {
      setPensando(false);
    }
  };

  return (
    <>
      <style>{`
        /* Burgi NO se mueve: parpadea, su antena late y el orbe brilla con chispas */
        .burgi-ojos{transform-box:fill-box;transform-origin:center;animation:burgiParpadeo 5s ease-in-out infinite}
        .burgi-led{animation:burgiLed 2.6s ease-in-out infinite}
        .burgi-piensa .burgi-ojos{animation:burgiEscanea 1s ease-in-out infinite}
        .burgi-piensa .burgi-led{animation-duration:.7s}
        .burgi-brillo{background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.85) 50%,transparent 65%);background-size:260% 100%;background-position:160% 0;animation:burgiBarrido 5.5s ease-in-out infinite}
        .burgi-piensa .burgi-brillo{animation-duration:1.6s}
        .burgi-chispa{opacity:0;animation-name:burgiChispa;animation-iteration-count:infinite;animation-timing-function:ease-in-out}
        .burgi-piensa .burgi-chispa{animation-duration:1.1s !important}
        .burgi-btn{transition:box-shadow .25s ease}
        .burgi-btn:hover{box-shadow:inset 0 -6px 12px rgba(232,130,26,.3),inset 0 4px 8px rgba(255,255,255,.95),0 0 0 1.5px rgba(232,130,26,.7),0 0 26px rgba(125,249,255,.55),0 8px 24px rgba(232,130,26,.45) !important}
        .burgi-btn:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(232,130,26,.4),0 8px 24px rgba(232,130,26,.45) !important}
        .burgi-input:focus{border-color:var(--brand) !important;box-shadow:0 0 0 3px rgba(232,130,26,.18)}
        .burgi-sug{transition:border-color .15s ease, background .15s ease, transform .15s ease}
        .burgi-sug:hover{border-color:var(--brand) !important;background:rgba(232,130,26,.09) !important;transform:translateX(3px)}
        .burgi-sug:focus-visible,.burgi-mini:focus-visible,.burgi-enviar:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
        .burgi-enviar{transition:transform .15s ease, box-shadow .15s ease}
        .burgi-enviar:not(:disabled):hover{transform:scale(1.07);box-shadow:0 6px 16px rgba(232,130,26,.45)}
        /* Si se abre el panel de accesibilidad, Burgi se esconde para no taparse */
        body:has(.acc-panel.open) .burgi-dock,
        body:has(.acc-panel.open) .burgi-dialogo,
        body:has(.acc-panel.open) .burgi-globo{display:none}
        @keyframes burgiBarrido{0%{background-position:160% 0}55%,100%{background-position:-60% 0}}
        @keyframes burgiChispa{0%,100%{opacity:0;transform:scale(.3) rotate(0deg)}50%{opacity:1;transform:scale(1) rotate(45deg)}}
        @keyframes burgiParpadeo{0%,90%,100%{transform:scaleY(1)}93%{transform:scaleY(.08)}96%{transform:scaleY(1)}}
        @keyframes burgiLed{0%,100%{opacity:.7}50%{opacity:1}}
        @keyframes burgiEscanea{0%,100%{transform:translateX(-2.2px)}50%{transform:translateX(2.2px)}}
        @keyframes burgiPunto{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
        @keyframes burgiEntrar{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
        @keyframes burgiGlobo{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion: reduce){
          .burgi-ojos,.burgi-led,.burgi-brillo{animation:none !important}
          .burgi-chispa{animation:none !important;opacity:.85;transform:scale(.8)}
        }
      `}</style>

      {abierto && (
        <div
          role="dialog"
          className="burgi-dialogo"
          aria-label="Burgi, asistente de El Oriente"
          style={{
            position: 'fixed',
            right: 24,
            bottom: 154,
            zIndex: 250,
            width: 'min(380px, calc(100vw - 32px))',
            height: 'min(600px, calc(100vh - 180px))',
            padding: 1.5,
            borderRadius: 28,
            background: 'linear-gradient(135deg, #E8821A, #ffc15a 45%, #7df9ff)',
            boxShadow: '0 24px 60px rgba(120, 60, 0, 0.28), 0 0 30px rgba(125, 249, 255, 0.25)',
            animation: 'burgiEntrar 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', borderRadius: 26.5, overflow: 'hidden', background: 'var(--surface)' }}>
            {/* Encabezado */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                background: 'radial-gradient(120% 160% at 0% 0%, rgba(232,130,26,0.20), rgba(232,130,26,0) 65%)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <AvatarBurgi size={46} uid="burgiHead" online className={pensando ? 'burgi-piensa' : undefined} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 17, lineHeight: 1.2, color: 'var(--text-900)' }}>Burgi</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-900)', opacity: 0.65 }}>
                  {pensando ? 'Pensando…' : 'Ventas, compras e inventario'}
                </div>
              </div>
              {mensajes.length > 0 && (
                <button
                  type="button"
                  className="burgi-mini"
                  onClick={() => setMensajes([])}
                  style={{ background: 'rgba(232,130,26,0.12)', border: 'none', color: 'var(--brand-deep)', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                className="burgi-mini"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar a Burgi"
                style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(232,130,26,0.12)', border: 'none', color: 'var(--brand-deep)', borderRadius: '50%', cursor: 'pointer', padding: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Mensajes */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mensajes.length === 0 && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, padding: '8px 4px 4px' }}>
                    <AvatarBurgi size={76} uid="burgiVacio" />
                    <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--text-900)', marginTop: 6 }}>¡Hola! Soy Burgi</div>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: 'var(--text-900)', opacity: 0.75, lineHeight: 1.5, maxWidth: 280 }}>
                      Respondo con los datos reales de tu negocio. Prueba con una pregunta:
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {SUGERENCIAS.map((sug, i) => (
                      <button
                        key={sug}
                        type="button"
                        className="burgi-sug"
                        onClick={() => enviar(sug)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '9px 12px', borderRadius: 16, border: '1.5px solid var(--border)', background: 'rgba(232,130,26,0.04)', color: 'var(--text-900)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(232,130,26,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                          {ICONOS[i]}
                        </span>
                        <span style={{ flex: 1 }}>{sug}</span>
                        <span aria-hidden="true" style={{ color: 'var(--brand)', fontSize: 18, fontWeight: 800 }}>›</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {mensajes.map((m, i) =>
                m.role === 'user' ? (
                  <div
                    key={i}
                    style={{
                      alignSelf: 'flex-end',
                      maxWidth: '82%',
                      padding: '10px 14px',
                      borderRadius: '18px 18px 4px 18px',
                      background: 'linear-gradient(135deg, #E8821A, #cf6e12)',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 500,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      boxShadow: '0 4px 12px rgba(232,130,26,0.28)',
                    }}
                  >
                    {m.content}
                  </div>
                ) : (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '92%' }}>
                    <AvatarBurgi size={28} uid={`burgiMsg${i}`} />
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '18px 18px 18px 4px',
                        background: 'rgba(232,130,26,0.08)',
                        border: '1px solid rgba(232,130,26,0.18)',
                        color: 'var(--text-900)',
                        fontSize: 14,
                        fontWeight: 500,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                ),
              )}

              {pensando && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <AvatarBurgi size={28} uid="burgiPiensa" className="burgi-piensa" />
                  <div style={{ display: 'flex', gap: 5, padding: '13px 16px', borderRadius: '18px 18px 18px 4px', background: 'rgba(232,130,26,0.08)', border: '1px solid rgba(232,130,26,0.18)' }}>
                    {[0, 0.15, 0.3].map((d) => (
                      <span key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand)', animation: `burgiPunto 1s ${d}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={fin} />
            </div>

            {/* Entrada */}
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface)', alignItems: 'flex-end' }}>
              <textarea
                ref={entrada}
                className="burgi-input"
                rows={1}
                value={texto}
                maxLength={500}
                placeholder="Pregúntale a Burgi..."
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                  }
                }}
                style={{ flex: 1, resize: 'none', maxHeight: 90, padding: '12px 16px', borderRadius: 22, border: '1.5px solid var(--border)', background: 'rgba(232,130,26,0.05)', color: 'var(--text-900)', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.4, outline: 'none' }}
              />
              <button
                type="button"
                className="burgi-enviar"
                onClick={() => enviar()}
                disabled={pensando || !texto.trim()}
                aria-label="Enviar"
                style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #E8821A, #cf6e12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: pensando || !texto.trim() ? 'default' : 'pointer', opacity: pensando || !texto.trim() ? 0.45 : 1, flexShrink: 0 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3.4 20.4 21 12 3.4 3.6l0 6.5 12 1.9-12 1.9z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Globo de saludo */}
      {saludo && !abierto && (
        <div
          className="burgi-globo"
          style={{
            position: 'fixed',
            right: 90,
            bottom: 96,
            zIndex: 250,
            maxWidth: 210,
            padding: '10px 14px',
            borderRadius: '14px 14px 4px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-900)',
            lineHeight: 1.4,
            animation: 'burgiGlobo 0.3s ease-out',
          }}
        >
          ¡Hola! Soy Burgi. Pregúntame lo que quieras de tu negocio.
        </div>
      )}

      {/* Botón flotante: orbe de cristal holográfico con Burgi dentro */}
      <div
        className={`burgi-dock${pensando ? ' burgi-piensa' : ''}`}
        style={{ position: 'fixed', right: 22, bottom: 88, zIndex: 250, width: 52, height: 52 }}
      >
        {/* Chispas alrededor */}
        {CHISPAS.map((c, i) => (
          <span
            key={i}
            className="burgi-chispa"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: c.left,
              top: c.top,
              zIndex: 2,
              pointerEvents: 'none',
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
            }}
          >
            <Chispa size={c.size} color={c.color} />
          </span>
        ))}

        <button
          type="button"
          className="burgi-btn"
          onClick={() => { setAbierto(!abierto); setSaludo(false); }}
          aria-label={abierto ? 'Cerrar a Burgi' : 'Abrir a Burgi, el asistente'}
          title="Burgi, tu asistente"
          style={{
            position: 'relative',
            zIndex: 1,
            width: 52,
            height: 52,
            boxSizing: 'border-box',
            padding: 0,
            margin: 0,
            lineHeight: 0,
            overflow: 'hidden',
            borderRadius: '50%',
            border: 'none',
            background: 'radial-gradient(circle at 32% 24%, #ffffff 0%, #fff4e2 38%, #ffe0b8 72%, #cdf6ff 100%)',
            boxShadow: 'inset 0 -5px 10px rgba(232,130,26,.25), inset 0 3px 7px rgba(255,255,255,.95), 0 0 0 1.5px rgba(232,130,26,.5), 0 0 16px rgba(125,249,255,.4), 0 6px 18px rgba(232,130,26,.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <BurgiRobot size={38} uid="burgiBtn" />

          {/* Reflejo de cristal (fijo) */}
          <span
            aria-hidden="true"
            style={{ position: 'absolute', top: 4, left: 9, width: 24, height: 12, borderRadius: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,0))', transform: 'rotate(-24deg)', pointerEvents: 'none' }}
          />
          {/* Destello holográfico que cruza el orbe */}
          <span aria-hidden="true" className="burgi-brillo" style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none' }} />
        </button>
      </div>
    </>
  );
}