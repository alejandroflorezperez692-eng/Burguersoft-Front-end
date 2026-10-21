import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { AvatarBurgi, BurgiRobot, CHISPAS, Chispa } from './AsistenteIA';

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
}

const ESTILOS = `
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
  .burgi-input:focus{border-color:var(--brand,#E8821A) !important;box-shadow:0 0 0 3px rgba(232,130,26,.18)}
  .burgi-sug{transition:border-color .15s ease, background .15s ease, transform .15s ease}
  .burgi-sug:hover{border-color:var(--brand,#E8821A) !important;background:rgba(232,130,26,.09) !important;transform:translateX(3px)}
  .burgi-sug:focus-visible,.burgi-mini:focus-visible,.burgi-enviar:focus-visible{outline:2px solid var(--brand,#E8821A);outline-offset:2px}
  .burgi-enviar{transition:transform .15s ease, box-shadow .15s ease}
  .burgi-enviar:not(:disabled):hover{transform:scale(1.07);box-shadow:0 6px 16px rgba(232,130,26,.45)}
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
`;

export default function AsistenteCliente() {
  const { user } = useAuth();
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

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto]);

  // Burgi saluda una sola vez por sesión
  useEffect(() => {
    let yaSaludo = false;
    try { yaSaludo = sessionStorage.getItem('burgiSaludoCliente') === '1'; } catch { /* sin almacenamiento */ }
    if (yaSaludo) return;
    const abrir = setTimeout(() => setSaludo(true), 2000);
    const cerrar = setTimeout(() => setSaludo(false), 9000);
    try { sessionStorage.setItem('burgiSaludoCliente', '1'); } catch { /* sin almacenamiento */ }
    return () => { clearTimeout(abrir); clearTimeout(cerrar); };
  }, []);

  const primerNombre = (user?.name ?? '').split(' ')[0];
  const sugerencias: { texto: string; icono: string }[] = [
    { texto: '¿Qué me recomiendas?', icono: '🍔' },
    { texto: '¿Qué promociones hay?', icono: '🏷️' },
    ...(user ? [{ texto: '¿Cómo va mi pedido?', icono: '🧾' }] : []),
  ];

  const enviar = async (pregunta?: string) => {
    const mensaje = (pregunta ?? texto).trim();
    if (!mensaje || pensando) return;

    const historial = mensajes.slice(-8);
    setMensajes((m) => [...m, { role: 'user', content: mensaje }]);
    setTexto('');
    setPensando(true);

    try {
      const { data } = await apiClient.post<{ respuesta: string }>('/cliente/chat', { mensaje, historial });
      setMensajes((m) => [...m, { role: 'assistant', content: data.respuesta }]);
    } catch (e) {
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      const aviso = !err.response
        ? 'No hay conexión con el servidor. Intenta de nuevo en un momento.'
        : err.response.data?.message || 'No pude responder. Intenta de nuevo.';
      setMensajes((m) => [...m, { role: 'assistant', content: aviso }]);
    } finally {
      setPensando(false);
    }
  };

  return (
    <>
      <style>{ESTILOS}</style>

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
            height: 'min(560px, calc(100vh - 270px))',
            padding: 1.5,
            borderRadius: 28,
            background: 'linear-gradient(135deg, #E8821A, #ffc15a 45%, #7df9ff)',
            boxShadow: '0 24px 60px rgba(120, 60, 0, 0.28), 0 0 30px rgba(125, 249, 255, 0.25)',
            animation: 'burgiEntrar 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', borderRadius: 26.5, overflow: 'hidden', background: 'var(--surface, #fff)' }}>
            {/* Encabezado */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                background: 'radial-gradient(120% 160% at 0% 0%, rgba(232,130,26,0.20), rgba(232,130,26,0) 65%)',
                borderBottom: '1px solid var(--border, #f3dcc0)',
              }}
            >
              <AvatarBurgi size={46} uid="cliHead" online className={pensando ? 'burgi-piensa' : undefined} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 17, lineHeight: 1.2, color: 'var(--text-900, #1a0a00)' }}>Burgi</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-900, #1a0a00)', opacity: 0.65 }}>
                  {pensando ? 'Pensando…' : 'Menú, promociones y pedidos'}
                </div>
              </div>
              {mensajes.length > 0 && (
                <button
                  type="button"
                  className="burgi-mini"
                  onClick={() => setMensajes([])}
                  style={{ background: 'rgba(232,130,26,0.12)', border: 'none', color: 'var(--brand-deep, #b85f0c)', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                className="burgi-mini"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar a Burgi"
                style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(232,130,26,0.12)', border: 'none', color: 'var(--brand-deep, #b85f0c)', borderRadius: '50%', cursor: 'pointer', padding: 0 }}
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
                    <AvatarBurgi size={76} uid="cliVacio" />
                    <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--text-900, #1a0a00)', marginTop: 6 }}>
                      ¡Hola{primerNombre ? `, ${primerNombre}` : ''}! Soy Burgi
                    </div>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: 'var(--text-900, #1a0a00)', opacity: 0.75, lineHeight: 1.5, maxWidth: 280 }}>
                      Te ayudo con el menú, las promociones{user ? ' y el estado de tus pedidos' : ''}. Prueba con una pregunta:
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {sugerencias.map((s) => (
                      <button
                        key={s.texto}
                        type="button"
                        className="burgi-sug"
                        onClick={() => enviar(s.texto)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '9px 12px', borderRadius: 16, border: '1.5px solid var(--border, #f3dcc0)', background: 'rgba(232,130,26,0.04)', color: 'var(--text-900, #1a0a00)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
                      >
                        <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(232,130,26,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                          {s.icono}
                        </span>
                        <span style={{ flex: 1 }}>{s.texto}</span>
                        <span aria-hidden="true" style={{ color: 'var(--brand, #E8821A)', fontSize: 18, fontWeight: 800 }}>›</span>
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
                    <AvatarBurgi size={28} uid={`cliMsg${i}`} />
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '18px 18px 18px 4px',
                        background: 'rgba(232,130,26,0.08)',
                        border: '1px solid rgba(232,130,26,0.18)',
                        color: 'var(--text-900, #1a0a00)',
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
                  <AvatarBurgi size={28} uid="cliPiensa" className="burgi-piensa" />
                  <div style={{ display: 'flex', gap: 5, padding: '13px 16px', borderRadius: '18px 18px 18px 4px', background: 'rgba(232,130,26,0.08)', border: '1px solid rgba(232,130,26,0.18)' }}>
                    {[0, 0.15, 0.3].map((d) => (
                      <span key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand, #E8821A)', animation: `burgiPunto 1s ${d}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={fin} />
            </div>

            {/* Entrada */}
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px 14px', borderTop: '1px solid var(--border, #f3dcc0)', background: 'var(--surface, #fff)', alignItems: 'flex-end' }}>
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
                style={{ flex: 1, resize: 'none', maxHeight: 90, padding: '12px 16px', borderRadius: 22, border: '1.5px solid var(--border, #f3dcc0)', background: 'rgba(232,130,26,0.05)', color: 'var(--text-900, #1a0a00)', fontFamily: 'inherit', fontSize: 14, outline: 'none', lineHeight: 1.4 }}
              />
              <button
                type="button"
                className="burgi-enviar"
                onClick={() => enviar()}
                disabled={pensando || !texto.trim()}
                aria-label="Enviar"
                style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #E8821A, #cf6e12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', flexShrink: 0, opacity: pensando || !texto.trim() ? 0.5 : 1 }}
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
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border, #f3dcc0)',
            boxShadow: '0 8px 24px rgba(120, 60, 0, 0.18)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-900, #1a0a00)',
            lineHeight: 1.4,
            animation: 'burgiGlobo 0.3s ease-out',
          }}
        >
          ¡Hola! Soy Burgi. Pregúntame por el menú y las promociones.
        </div>
      )}

      {/* Botón flotante: orbe de cristal holográfico con Burgi dentro */}
      <div
        className={`burgi-dock${pensando ? ' burgi-piensa' : ''}`}
        style={{ position: 'fixed', right: 22, bottom: 88, zIndex: 250, width: 52, height: 52 }}
      >
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
          <BurgiRobot size={38} uid="cliBtn" />
          <span
            aria-hidden="true"
            style={{ position: 'absolute', top: 4, left: 9, width: 24, height: 12, borderRadius: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,0))', transform: 'rotate(-24deg)', pointerEvents: 'none' }}
          />
          <span aria-hidden="true" className="burgi-brillo" style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none' }} />
        </button>
      </div>
    </>
  );
}

/** Envuelve las páginas del cliente para mostrar el chat en todas ellas. */
export function ConAsistenteCliente() {
  return (
    <>
      <Outlet />
      <AsistenteCliente />
    </>
  );
}