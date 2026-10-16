import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { enviarMensajeAsistente, respuestaLocalAsistente, type MensajeIA } from '../../api/asistente';
import '../../styles/asistente.css';

const ATAJOS = [
  { titulo: '📊 Resumen de ventas', prompt: 'Dame un resumen de ventas: total hoy, ticket promedio y top productos' },
  { titulo: '🧾 IVA de facturas', prompt: 'Explícame cuánto IVA 19% he generado y cómo se desglosa en las facturas' },
  { titulo: '📦 Stock y compras', prompt: '¿Qué materia prima está baja y qué debería comprar esta semana?' },
  { titulo: '🎉 Crear promoción', prompt: 'Créame una promoción para el fin de semana con nombre, texto y precio con IVA' },
];

export default function AsistenteAdmin() {
  const location = useLocation();
  const [mensajes, setMensajes] = useState<MensajeIA[]>([
    { role: 'assistant', content: 'Bienvenido al centro de IA 🤖. Aquí analizo tus ventas, IVA, inventario y te ayudo a redactar promociones. Elige un atajo o escríbeme abajo.' },
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
      const r = await enviarMensajeAsistente(contenido, { pagina: '/asistente-ia' }, nuevos);
      setMensajes([...nuevos, { role: 'assistant', content: r }]);
    } catch {
      setMensajes([...nuevos, { role: 'assistant', content: respuestaLocalAsistente(contenido, location.pathname) }]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Asistente IA</h1>
          <p className="subtitulo">Ayuda al administrador: análisis de ventas, IVA 19%, inventario y promociones. Solo admin.</p>
        </div>
        <span className="badge badge-info" style={{ alignSelf: 'center' }}>BETA • vía backend /api/asistente/chat</span>
      </div>

      <div className="ia-page-grid">
        <div className="ia-shortcuts">
          {ATAJOS.map((a) => (
            <button key={a.titulo} type="button" className="ia-shortcut-card" onClick={() => enviar(a.prompt)}>
              <strong>{a.titulo}</strong>
              <span>{a.prompt}</span>
            </button>
          ))}
          <div className="ia-hint">
            <strong>¿Cómo conecto la IA real?</strong>
            <p>Crea en tu backend Laravel: <code>POST /api/asistente/chat</code> que reciba <code>{'{mensaje, pagina, resumen, historial}'}</code> y devuelva <code>{'{respuesta}'}</code>. El frontend ya lo llama con el token. Mientras tanto funciona en modo local.</p>
          </div>
        </div>

        <div className="ia-chat-full">
          <div className="ia-messages ia-messages-lg">
            {mensajes.map((m, i) => (
              <div key={i} className={`ia-msg ia-${m.role}`}>{m.content}</div>
            ))}
            {cargando && <div className="ia-msg ia-assistant ia-typing">Analizando datos…</div>}
          </div>
          <div className="ia-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }}
              placeholder="Ej: ¿Cuánto IVA generé hoy? ¿Qué producto se vende más?"
            />
            <button type="button" className="btn-primary" onClick={() => enviar()} disabled={cargando || !input.trim()}>
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
