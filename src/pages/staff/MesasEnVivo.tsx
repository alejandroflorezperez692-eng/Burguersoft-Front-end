import { useCallback, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { normalizarRol } from '../../utils/roles';
import { useToast } from '../../components/Toast';
import MotivoModal from '../../components/MotivoModal';
import { mensajeDeError } from '../../types/Trazabilidad';
import '../../styles/mesas.css';

interface PedidoMesa {
  id: number;
  estado: string;
  valor_total: number;
  cliente_nombre?: string | null;
  notas?: string | null;
  items: { nombre: string; cantidad: number }[];
}
interface Mesa {
  numero: number;
  estado: 'Libre' | 'Ocupada' | 'Por cobrar';
  total: number;
  minutos_ocupada: number | null;
  pedidos: PedidoMesa[];
}

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Daviplata', 'PSE', 'Bancolombia'];
const INTERVALO = 10000;

const tiempo = (min: number | null) => {
  if (min === null) return '';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
};

export default function MesasEnVivo() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const rol = normalizarRol(user?.role);
  const puedeCobrar = rol === 'admin' || rol === 'cajero';

  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<Record<number, string>>({});
  const [ocupada, setOcupada] = useState<number | null>(null);
  const [mover, setMover] = useState<{ pedido: PedidoMesa; destino: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/mesas');
      setMesas(Array.isArray(data) ? (data as Mesa[]) : []);
      setError(null);
    } catch {
      setError('No se pudieron cargar las mesas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => {
      if (!document.hidden) void load();
    }, INTERVALO);
    return () => window.clearInterval(t);
  }, [load]);

  const cobrar = async (m: Mesa) => {
    if (!window.confirm(`¿Cobrar la mesa ${m.numero} por $${m.total.toLocaleString('es-CO')}?`)) return;
    setOcupada(m.numero);
    try {
      await apiClient.post(`/mesas/${m.numero}/cobrar`, { metodo_pago: metodo[m.numero] || undefined });
      showToast(`Mesa ${m.numero} cobrada y liberada`, false);
      await load();
    } catch (e) {
      setError(mensajeDeError(e, `No se pudo cobrar la mesa ${m.numero}.`));
    } finally {
      setOcupada(null);
    }
  };

  const moverPedido = async (motivo: string) => {
    if (!mover) return;
    const { pedido, destino } = mover;
    setMover(null);
    try {
      await apiClient.patch(`/ventas/${pedido.id}/mesa`, { mesa: destino, motivo });
      showToast(`Pedido #${pedido.id} pasó a la mesa ${destino}`, false);
      await load();
    } catch (e) {
      setError(mensajeDeError(e, `No se pudo mover el pedido #${pedido.id}.`));
    }
  };

  return (
    <div className="mv-wrap">
      <div className="mv-head">
        <div>
          <h1 className="mv-titulo">Mesas</h1>
          <p className="mv-sub">Estado de las 4 mesas. Se actualiza solo cada {INTERVALO / 1000} segundos.</p>
        </div>
        <button type="button" className="mv-btn-sec" onClick={() => void load()}>Actualizar</button>
      </div>

      {error && (
        <div className="mv-error" role="alert">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar aviso">✕</button>
        </div>
      )}

      {loading ? (
        <p className="mv-vacio">Cargando mesas…</p>
      ) : (
        <div className="mv-grid">
          {mesas.map((m) => (
            <section key={m.numero} className={`mv-card mv-${m.estado.replace(' ', '-').toLowerCase()}`}>
              <header className="mv-card-head">
                <h2>Mesa {m.numero}</h2>
                <span className="mv-badge">{m.estado}</span>
              </header>

              {m.estado === 'Libre' ? (
                <p className="mv-libre">Sin pedidos abiertos.</p>
              ) : (
                <>
                  <div className="mv-resumen">
                    <span>Ocupada hace {tiempo(m.minutos_ocupada)}</span>
                    <strong>${m.total.toLocaleString('es-CO')}</strong>
                  </div>

                  <ul className="mv-pedidos">
                    {m.pedidos.map((p) => (
                      <li key={p.id}>
                        <div className="mv-pedido-top">
                          <span>#{p.id} · {p.estado}</span>
                          <span>${p.valor_total.toLocaleString('es-CO')}</span>
                        </div>
                        <div className="mv-items">
                          {p.items.map((it) => `${it.nombre} ×${it.cantidad}`).join(', ')}
                        </div>
                        {p.notas && <div className="mv-notas">📝 {p.notas}</div>}
                        <select
                          className="mv-mover"
                          value=""
                          onChange={(e) => e.target.value && setMover({ pedido: p, destino: Number(e.target.value) })}
                          aria-label={`Mover pedido #${p.id} a otra mesa`}
                        >
                          <option value="">Mover a otra mesa…</option>
                          {mesas.filter((x) => x.numero !== m.numero).map((x) => (
                            <option key={x.numero} value={x.numero}>Mesa {x.numero}</option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>

                  {puedeCobrar && (
                    <div className="mv-cobro">
                      <select
                        value={metodo[m.numero] ?? ''}
                        onChange={(e) => setMetodo((prev) => ({ ...prev, [m.numero]: e.target.value }))}
                      >
                        <option value="">Método de pago (el del pedido)</option>
                        {METODOS.map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                      <button
                        type="button"
                        className="mv-btn"
                        disabled={m.estado !== 'Por cobrar' || ocupada === m.numero}
                        title={m.estado !== 'Por cobrar' ? 'Aún hay pedidos sin servir' : undefined}
                        onClick={() => void cobrar(m)}
                      >
                        {ocupada === m.numero ? 'Cobrando…' : 'Cobrar cuenta'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          ))}
        </div>
      )}

      {mover && (
        <MotivoModal
          titulo={`Pasar el pedido #${mover.pedido.id} a la mesa ${mover.destino}`}
          descripcion="El cambio queda registrado en el historial con tu nombre y el motivo."
          confirmarTexto="Mover pedido"
          onClose={() => setMover(null)}
          onConfirm={(motivo) => void moverPedido(motivo)}
        />
      )}
    </div>
  );
}