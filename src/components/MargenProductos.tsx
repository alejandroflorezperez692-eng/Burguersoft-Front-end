import { useEffect, useState } from 'react';
import apiClient from '../api/client';

interface ProductoMargen {
  id: number;
  nombre: string;
  precio: number;
  costo: number;
  ganancia: number;
  margen: number | null;
  en_alerta: boolean;
  precio_sugerido: number | null;
}

interface Respuesta {
  margen_minimo: number;
  productos: ProductoMargen[];
}

const moneda = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

export default function MargenProductos() {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  useEffect(() => {
    let vivo = true;
    apiClient
      .get<Respuesta>('/reportes/margen')
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

  const conReceta = datos.productos.filter((p) => p.margen !== null);
  const sinReceta = datos.productos.length - conReceta.length;
  const enAlerta = conReceta.filter((p) => p.en_alerta).length;
  const filas = verTodos ? conReceta : conReceta.slice(0, 8);

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: 20,
        marginBottom: 24,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 18 }}>Costo y margen por producto</h3>
      <p style={{ fontSize: 13, color: 'var(--text-400)', margin: '4px 0 14px' }}>
        Según la receta y el último precio de compra de cada insumo. Margen mínimo: {datos.margen_minimo}%.
        {enAlerta > 0 && (
          <strong style={{ color: 'var(--danger)' }}>
            {' '}
            {enAlerta} {enAlerta === 1 ? 'producto está' : 'productos están'} por debajo.
          </strong>
        )}
      </p>

      {conReceta.length === 0 ? (
        <p style={{ color: 'var(--text-400)' }}>Aún no hay productos con receta para calcular el margen.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-400)', fontSize: 12 }}>
                <th style={{ padding: '6px 8px' }}>Producto</th>
                <th style={{ padding: '6px 8px' }}>Precio</th>
                <th style={{ padding: '6px 8px' }}>Costo</th>
                <th style={{ padding: '6px 8px' }}>Ganancia</th>
                <th style={{ padding: '6px 8px' }}>Margen</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px' }}>{p.nombre}</td>
                  <td style={{ padding: '8px' }}>{moneda(p.precio)}</td>
                  <td style={{ padding: '8px' }}>{moneda(p.costo)}</td>
                  <td style={{ padding: '8px' }}>{moneda(p.ganancia)}</td>
                  <td style={{ padding: '8px' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: p.en_alerta ? 'var(--danger)' : '#1e8e4e',
                      }}
                    >
                      {p.margen}%
                    </span>
                    {p.en_alerta && p.precio_sugerido && (
                      <div style={{ fontSize: 11, color: 'var(--text-400)' }}>
                        Sugerido: {moneda(p.precio_sugerido)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13 }}>
        {conReceta.length > 8 ? (
          <button type="button" className="mn-btn-cancel" onClick={() => setVerTodos((v) => !v)}>
            {verTodos ? 'Ver menos' : `Ver todos (${conReceta.length})`}
          </button>
        ) : (
          <span />
        )}
        {sinReceta > 0 && (
          <span style={{ color: 'var(--text-400)' }}>
            {sinReceta} {sinReceta === 1 ? 'producto' : 'productos'} sin receta
          </span>
        )}
      </div>
    </div>
  );
}