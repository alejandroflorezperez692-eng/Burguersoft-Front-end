import { useEffect, useState } from 'react';
import apiClient from '../api/client';

export interface ItemSugerido {
  materia_id: number;
  nombre: string;
  unidad: string;
  stock: number;
  necesario: number;
  comprar: number;
  costo_estimado: number;
  dias_restantes: number;
}

interface Respuesta {
  dias_cobertura: number;
  semanas_historial: number;
  costo_total: number;
  items: ItemSugerido[];
}

const moneda = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const num = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 });

export default function ComprasSugeridas({
  onAgregar,
}: {
  onAgregar?: (items: ItemSugerido[]) => void;
}) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  useEffect(() => {
    let vivo = true;
    apiClient
      .get<Respuesta>('/compras/sugeridas')
      .then(({ data }) => {
        if (vivo) setDatos(data);
      })
      .catch(() => {
        /* sin permiso o sin datos: la tarjeta no se muestra */
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (!datos) return null;

  const tarjeta = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    padding: 20,
    marginBottom: 24,
  } as const;

  if (datos.items.length === 0) {
    return (
      <div style={tarjeta}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Qué comprar esta semana</h3>
        <p style={{ fontSize: 13, color: 'var(--text-400)', margin: '6px 0 0' }}>
            Según tus ventas de las últimas {datos.semanas_historial} semanas, la cantidad que tienes alcanza para los próximos{' '}
          {datos.dias_cobertura} días.
        </p>
      </div>
    );
  }

  const filas = verTodos ? datos.items : datos.items.slice(0, 5);

  return (
    <div style={tarjeta}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>Qué comprar esta semana</h3>
          <p style={{ fontSize: 13, color: 'var(--text-400)', margin: '4px 0 0' }}>
            Calculado con tus ventas de las últimas {datos.semanas_historial} semanas para cubrir{' '}
            {datos.dias_cobertura} días.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-400)' }}>Costo estimado</div>
          <strong style={{ fontSize: 18 }}>{moneda(datos.costo_total)}</strong>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {filas.map((i) => (
          <div
            key={i.materia_id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 0',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div>
              <strong>{i.nombre}</strong>
              <div style={{ fontSize: 12, color: i.dias_restantes <= 3 ? 'var(--danger)' : 'var(--text-400)' }}>
                Tienes {num(i.stock)} {i.unidad} · alcanza para {num(i.dias_restantes)}{' '}
                {i.dias_restantes === 1 ? 'día' : 'días'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong>
                Comprar {num(i.comprar)} {i.unidad}
              </strong>
              <div style={{ fontSize: 12, color: 'var(--text-400)' }}>≈ {moneda(i.costo_estimado)}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
        {datos.items.length > 5 && (
          <button type="button" className="mn-btn-cancel" onClick={() => setVerTodos((v) => !v)}>
            {verTodos ? 'Ver menos' : `Ver todos (${datos.items.length})`}
          </button>
        )}
        {onAgregar && (
          <button type="button" className="btn-primary" onClick={() => onAgregar(datos.items)}>
            Crear compra con esta lista
          </button>
        )}
      </div>
    </div>
  );
}