import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { enviarMensajeAsistente, respuestaLocalAsistente, type MensajeIA } from '../../api/asistente';
import hamburguesaIA from '../../assets/img/hamburguesa-ia.svg';
import '../../styles/asistente.css';

const SUGERENCIAS = [
  'Resume las ventas',
  'Explícame el IVA',
  '¿Qué comprar esta semana?',
  'Sugiere una promoción',
];

export default function AsistenteWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeIA[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente admin. Pregúntame sobre ventas, IVA, inventario o promociones.' },
  ]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (texto?: string) => {
    const contenido = (texto ?? input).trim();
    if (!contenido || cargando) return;
    const nuevos: MensajeIA[] = [...mensajes, { role: 'user', content: contenido }];
    setMensajes(nuevos);
    setInput('');
    setCargando(true);
    try {
      const r = await enviarMensajeAsistente(
        contenido,
        { pagina: location.pathname },
        nuevos,
      );
      setMensajes([...nuevos, { role: 'assistant', content: r }]);
    } catch {
      // Sin backend: respuesta local inmediata
      setMensajes([...nuevos, { role: 'assistant', content: respuestaLocalAsistente(contenido, location.pathname) }]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="ia-fab"
        onClick={() => setAbierto(!abierto)}
        aria-label="Abrir asistente IA"
        title="Asistente IA del administrador"
      >
        {abierto ? '✕' : <img src={hamburguesaIA} alt="Asistente IA" className="ia-fab-img" />}
      </button>

      {abierto && (
        <div className="ia-panel" role="dialog" aria-label="Asistente IA">
          <div className="ia-header">
            <img src={hamburguesaIA} alt="" className="ia-header-img" />
            <div style={{ flex: 1 }}>
              <div className="ia-title">Asistente Admin</div>
              <div className="ia-sub">Página: {location.pathname} • Solo administradores</div>
            </div>
            <button type="button" className="ia-expand" title="Abrir página completa" onClick={() => navigate('/asistente-ia')}>
              ⛶
            </button>
          </div>

          <div className="ia-messages">
            {mensajes.map((m, i) => (
              <div key={i} className={`ia-msg ia-${m.role}`}>
                {m.content}
              </div>
            ))}
            {cargando && <div className="ia-msg ia-assistant ia-typing">Escribiendo…</div>}
          </div>

          <div className="ia-chips">
            {SUGERENCIAS.map((s) => (
              <button key={s} type="button" className="ia-chip" onClick={() => enviar(s)}>
                {s}
              </button>
            ))}
          </div>

          <div className="ia-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }}
              placeholder="Pregunta sobre ventas, IVA, stock…"
            />
            <button type="button" onClick={() => enviar()} disabled={cargando || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
