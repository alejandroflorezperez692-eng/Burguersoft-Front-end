import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import { getEcho } from '../api/echo';
import { useEscape } from '../hooks/useEscape';

interface PedidoMesa {
  id: number;
  estado: string;
  valor_total: number;
  items: { nombre: string; cantidad: number }[];
}

interface Mesa {
  numero: number;
  estado: 'Libre' | 'Ocupada' | 'Por cobrar';
  total: number;
  minutos_ocupada: number | null;
  pedidos: PedidoMesa[];
}

const tiempo = (min: number | null) => {
  if (min === null) return '';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
};

const AYUDA: Record<Mesa['estado'], string> = {
  Libre: 'Disponible',
  Ocupada: 'Comiendo',
  'Por cobrar': 'Ya se va a ir: falta cobrar',
};

interface Props {
  abierto: boolean;
  onClose: () => void;
  /** Si se pasa, cada mesa muestra el botón para tomar un pedido en ella. */
  onTomarPedido?: (mesa: number) => void;
}

export default function MesasModal({ abierto, onClose, onTomarPedido }: Props) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/mesas');
      setMesas(Array.isArray(data) ? (data as Mesa[]) : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Se actualiza al instante cuando cambia un pedido (Reverb); el temporizador es solo respaldo
  useEffect(() => {
    if (!abierto) return;
    setLoading(true);
    void load();

    const echo = getEcho();
    const alCambiar = () => void load();
    echo?.channel('cocina').listen('.venta.actualizada', alCambiar);
    const t = window.setInterval(() => {
      if (!document.hidden) void load();
    }, echo ? 60000 : 8000);

    return () => {
      window.clearInterval(t);
      echo?.channel('cocina').stopListening('.venta.actualizada', alCambiar);
    };
  }, [abierto, load]);

  useEscape([[abierto, onClose]]);

  if (!abierto) return null;

  const libres = mesas.filter((m) => m.estado === 'Libre').length;
  const ocupadas = mesas.filter((m) => m.estado === 'Ocupada').length;
  const porCobrar = mesas.filter((m) => m.estado === 'Por cobrar').length;

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box mm-box" onClick={(e) => e.stopPropagation()}>
        <div className="mm-head">
          <div>
            <h3 className="mm-titulo">Mesas</h3>
            <p className="mm-resumen">
              {libres} libres · {ocupadas} ocupadas · {porCobrar} por cobrar
            </p>
          </div>
          <button type="button" className="mm-cerrar" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {error && <p className="mm-error">No se pudieron cargar las mesas.</p>}

        <div className="mm-grid">
          {mesas.map((m) => (
            <section className="mm-mesa" data-estado={m.estado} key={m.numero}>
              <header className="mm-mesa-head">
                <span className="mm-mesa-num">Mesa {m.numero}</span>
                <span className="mm-badge">{loading ? '…' : m.estado}</span>
              </header>

              <p className="mm-ayuda">{loading ? 'Cargando…' : AYUDA[m.estado]}</p>

              {!loading && m.estado !== 'Libre' && (
                <div className="mm-detalle">
                  <span>Hace {tiempo(m.minutos_ocupada)}</span>
                  <strong>${m.total.toLocaleString('es-CO')}</strong>
                  <span className="mm-items">
                    {m.pedidos.flatMap((p) => p.items.map((it) => `${it.cantidad}× ${it.nombre}`)).join(', ')}
                  </span>
                </div>
              )}

              {onTomarPedido && (
                <button type="button" className="mm-nuevo" onClick={() => onTomarPedido(m.numero)}>
                  {m.estado === 'Libre' ? 'Tomar pedido' : 'Agregar pedido'}
                </button>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}