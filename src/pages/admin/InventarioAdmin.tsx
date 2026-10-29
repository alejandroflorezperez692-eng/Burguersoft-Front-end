import { useEffect, useState } from 'react';
import type React from 'react';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';
import Paginacion, { paginar } from '../../components/Paginacion';
import { useToast } from '../../components/Toast';
import { useEscape } from '../../hooks/useEscape';
import '../../styles/nu-admin.css';

interface MateriaPrima {
  id: number;
  nombre: string;
  tipo?: string | null;
  valor: number;
  cantidad: number;
  unidad_medida?: string | null;
  marca_id: number;
  estado?: string | null;
}

interface Marca {
  id: number;
  nombre: string;
}

const num = (v: unknown): number => Number(v ?? 0) || 0;
const moneda = (v: number) => `$${v.toLocaleString('es-CO')}`;

type EstadoStock = 'disponible' | 'bajo' | 'agotado';

const estadoKey = (stock: unknown): EstadoStock => {
  const s = num(stock);
  return s > 10 ? 'disponible' : s > 0 ? 'bajo' : 'agotado';
};

const textoEstado = (stock: unknown) => {
  const k = estadoKey(stock);
  return k === 'disponible' ? 'Disponible' : k === 'bajo' ? 'Bajo' : 'Agotado';
};

const claseBadge = (stock: unknown) => {
  const k = estadoKey(stock);
  return k === 'agotado' ? 'badge-danger' : k === 'bajo' ? 'badge-warning' : 'badge-success';
};

const toArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

export default function InventarioAdmin() {
  const [items, setItems] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoStock>('todos');
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<MateriaPrima | null>(null);
  const { showToast } = useToast();

  const load = async () => {
    setLoading(true);
    const [r1, r2] = await Promise.allSettled([
      apiClient.get('/materias-primas'),
      apiClient.get('/marcas'),
    ]);

    if (r1.status === 'fulfilled') {
      setItems(toArray<MateriaPrima>(r1.value.data));
    } else {
      showToast('No se pudo cargar el inventario', true);
    }
    if (r2.status === 'fulfilled') {
      setMarcas(toArray<Marca>(r2.value.data));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Al cambiar un filtro volvemos a la página 1
  useEffect(() => { setPagina(1); }, [q, filtroEstado]);

  useEscape([[!!detalle, () => setDetalle(null)]]);

  const marcaNombre = (id: unknown): string =>
    marcas.find((x) => x.id === id)?.nombre ?? '';

  const filtered = items
    .filter((m) => {
      if (q && !(m.nombre ?? '').toLowerCase().includes(q.toLowerCase())) return false;
      if (filtroEstado !== 'todos' && estadoKey(m.cantidad) !== filtroEstado) return false;
      return true;
    })
    .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'));

  const { visibles, paginaActual } = paginar(filtered, pagina);
  const esInactivo = (m: MateriaPrima) => m.estado === 'Inactivo';
  const hayFiltros = q !== '' || filtroEstado !== 'todos';

  const filaDetalle = (etiqueta: string, valor: React.ReactNode) => (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', gap: 16,
        padding: '10px 0', borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--text-400)', fontWeight: 600 }}>{etiqueta}</span>
      <span style={{ fontWeight: 700, textAlign: 'right' }}>{valor}</span>
    </div>
  );

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Inventario</h1>
          <p className="subtitulo">Consulta las existencias de toda tu materia prima</p>
        </div>
      </div>

      <div className="mn-search-wrap" style={{ marginBottom: 14 }}>
        <svg className="mn-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="mn-search"
          type="text"
          placeholder="Buscar insumo..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mn-filtros">
        <div className="mn-field">
          <label>Stock</label>
          <select
            className={filtroEstado !== 'todos' ? 'activo' : ''}
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as 'todos' | EstadoStock)}
          >
            <option value="todos">Todos</option>
            <option value="disponible">Disponible</option>
            <option value="bajo">Bajo</option>
            <option value="agotado">Agotado</option>
          </select>
        </div>

        {hayFiltros && (
          <button
            type="button"
            className="mn-btn-cancel"
            onClick={() => { setQ(''); setFiltroEstado('todos'); }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <AdminLoading texto="Cargando inventario" subtexto="Revisando tus existencias" />
      ) : (
        <div className="tabla-responsive">
          <table className="data-table" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>Nombre del insumo</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((m) => (
                <tr key={m.id} className={esInactivo(m) ? 'fila-inactiva' : undefined}>
                  <td style={{ fontWeight: 600 }}>{m.nombre ?? 'Sin nombre'}</td>
                  <td>{m.tipo || '—'}</td>
                  <td style={{ fontWeight: 600 }}>
                    {num(m.cantidad).toLocaleString('es-CO')}
                    {m.unidad_medida ? (
                      <span style={{ marginLeft: 8, fontWeight: 500, color: 'var(--text-400)' }}>
                        {m.unidad_medida}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span className={`badge ${claseBadge(m.cantidad)}`}>{textoEstado(m.cantidad)}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="mn-btn-edit"
                      style={{ flex: 'none', padding: '7px 18px' }}
                      onClick={() => setDetalle(m)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>
                    No se encontraron insumos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && <Paginacion total={filtered.length} pagina={paginaActual} onCambiar={setPagina} />}

      {detalle && (
        <div className="mn-modal-overlay" onClick={() => setDetalle(null)}>
          <div
            className="mn-modal-box"
            style={{ maxWidth: 460, textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 4px', fontSize: 20 }}>{detalle.nombre}</h3>
            <div style={{ marginBottom: 14 }}>
              <span className={`badge ${claseBadge(detalle.cantidad)}`}>{textoEstado(detalle.cantidad)}</span>
            </div>

            {filaDetalle('Tipo', detalle.tipo || '—')}
            {filaDetalle(
              'Cantidad en stock',
              `${num(detalle.cantidad).toLocaleString('es-CO')}${detalle.unidad_medida ? ` ${detalle.unidad_medida}` : ''}`,
            )}
            {filaDetalle('Precio por unidad', moneda(num(detalle.valor)))}
            {filaDetalle('Precio total', moneda(num(detalle.valor) * num(detalle.cantidad)))}
            {filaDetalle('Proveedor', marcaNombre(detalle.marca_id) || '—')}
            {filaDetalle(
              'Estado',
              <span className={`badge ${esInactivo(detalle) ? 'badge-danger' : 'badge-success'}`}>
                {esInactivo(detalle) ? 'Inactivo' : 'Activo'}
              </span>,
            )}

            <div className="mn-modal-actions" style={{ marginTop: 22 }}>
              <button type="button" className="mn-btn-cancel" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}