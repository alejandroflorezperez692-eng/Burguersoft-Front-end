import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface DetalleCompra {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  materia_prima_id: number;
  marca_id: number;
}

interface Compra {
  id: number;
  fecha: string;
  metodo_pago: string;
  valor_total: number;
  detalles?: DetalleCompra[];
}

interface MateriaPrima { id: number; nombre: string; }
interface Marca { id: number; nombre: string; }

interface Linea {
  materia_prima_id: number | null;
  cantidad: string;
  precio_unitario: string;
  marca_id: number;
  nombre_nuevo: string;
  tipo: string;
  unidad_medida: string;
}

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Daviplata'];

function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

function fechaCorta(f: string | undefined): string {
  if (!f) return '—';
  const d = new Date(f);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function ComprasAdmin() {
  const [items, setItems] = useState<Compra[]>([]);
  const [materias, setMaterias] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [lineas, setLineas] = useState<Linea[]>([
    { materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' },
  ]);
  const [modalDetalle, setModalDetalle] = useState<Compra | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/compras'),
      apiClient.get('/materias-primas'),
      apiClient.get('/marcas'),
    ]).then(([r1, r2, r3]) => {
      setItems(unwrap<Compra>(r1.data));
      setMaterias(unwrap<Record<string, unknown>>(r2.data).map((m) => ({
        id: Number(m.id ?? m.idmateria ?? 0),
        nombre: String(m.nombre ?? m.nombre_materia ?? ''),
      })));
      setMarcas(unwrap<Record<string, unknown>>(r3.data).map((m) => ({
        id: Number(m.id ?? m.idMarca ?? 0),
        nombre: String(m.nombre ?? m.nombre_marca ?? ''),
      })));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const materiaNombre = (id: number) => materias.find((m) => m.id === id)?.nombre ?? `#${id}`;
  const marcaNombre = (id: number) => marcas.find((m) => m.id === id)?.nombre ?? `#${id}`;

  const filtered = items.filter((c) =>
    String(c.id ?? '').includes(q) || (c.metodo_pago ?? '').toLowerCase().includes(q.toLowerCase())
  );

  const enMes = (f: string) => {
    const d = new Date(f);
    const now = new Date();
    return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const totalMes = items.filter((c) => c.fecha && enMes(c.fecha)).reduce((a, c) => a + Number(c.valor_total ?? 0), 0);

  const totalHisto = items.reduce((a, c) => a + Number(c.valor_total ?? 0), 0);

  const addLinea = () => {
    setLineas([...lineas, { materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: marcas[0]?.id ?? 0, nombre_nuevo: '', tipo: '', unidad_medida: '' }]);
  };

  const removeLinea = (i: number) => {
    setLineas(lineas.filter((_, idx) => idx !== i));
  };

  const updateLinea = (i: number, field: keyof Linea, value: string | number | null) => {
    const copy = [...lineas];
    copy[i] = { ...copy[i], [field]: value };
    setLineas(copy);
  };

  const total = lineas.reduce((a, l) => a + (Number(l.cantidad) * Number(l.precio_unitario) || 0), 0);

  const save = () => {
    const payload = {
      fecha: new Date().toISOString().slice(0, 10),
      metodo_pago: metodoPago,
      items: lineas.map((l) => ({
        materia_prima_id: l.materia_prima_id,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario),
        marca_id: l.marca_id,
        nombre_nuevo: l.materia_prima_id ? undefined : (l.nombre_nuevo || undefined),
        tipo: l.materia_prima_id ? undefined : (l.tipo || undefined),
        unidad_medida: l.materia_prima_id ? undefined : (l.unidad_medida || undefined),
      })),
    };
    apiClient.post('/compras', payload).then(() => {
      setShowForm(false);
      setLineas([{ materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: marcas[0]?.id ?? 0, nombre_nuevo: '', tipo: '', unidad_medida: '' }]);
      load();
    }).catch(() => alert('No se pudo registrar la compra (revisa los datos).'));
  };

  const del = (id: number) => {
    if (!confirm('¿Eliminar esta compra? Se revertirá el stock.')) return;
    apiClient.delete(`/compras/${id}`).then(() => load()).catch(() => alert('No se pudo eliminar la compra.'));
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión de Compras</h1>
          <p className="subtitulo">{items.length} compras registradas</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva compra'}
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Compras este mes</span>
          <span className="stat-val">{items.filter((c) => c.fecha && enMes(c.fecha)).length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Invertido este mes</span>
          <span className="stat-val">${totalMes.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total histórico</span>
          <span className="stat-val">${totalHisto.toLocaleString()}</span>
        </div>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-900)' }}>Registrar Compra</h3>
          <div className="form-group">
            <label>Método de pago</label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {lineas.map((l, i) => (
            <div key={i} className="grid-lineas">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>{i === 0 ? 'Insumo' : ''}</label>
                <select value={l.materia_prima_id ?? '__nuevo__'} onChange={(e) => updateLinea(i, 'materia_prima_id', e.target.value === '__nuevo__' ? null : Number(e.target.value))}>
                  <option value="__nuevo__">+ Nuevo insumo</option>
                  {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              {l.materia_prima_id === null && (
                <>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Nombre</label>
                    <input value={l.nombre_nuevo} onChange={(e) => updateLinea(i, 'nombre_nuevo', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Unidad</label>
                    <input value={l.unidad_medida} onChange={(e) => updateLinea(i, 'unidad_medida', e.target.value)} />
                  </div>
                </>
              )}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cantidad</label>
                <input type="number" value={l.cantidad} onChange={(e) => updateLinea(i, 'cantidad', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Precio Unit.</label>
                <input type="number" value={l.precio_unitario} onChange={(e) => updateLinea(i, 'precio_unitario', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Proveedor</label>
                <select value={l.marca_id} onChange={(e) => updateLinea(i, 'marca_id', Number(e.target.value))}>
                  {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              {lineas.length > 1 && (
                <button className="btn-icon btn-icon-del" onClick={() => removeLinea(i)} style={{ marginBottom: 0 }}>✕</button>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <button className="btn-primary" onClick={addLinea} style={{ background: 'var(--surface-3)', color: 'var(--text-900)', boxShadow: 'none' }}>+ Agregar insumo</button>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 18, color: 'var(--text-900)' }}>Total: ${total.toLocaleString()}</span>
          </div>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-save" onClick={save}>Registrar Compra</button>
          </div>
        </div>
      )}

      <div className="search-bar">
        <input placeholder="Buscar compra..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        <div className="tabla-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Método de pago</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{fechaCorta(c.fecha)}</td>
                <td><span className="badge badge-info">{c.metodo_pago ?? '—'}</span></td>
                <td style={{ fontWeight: 700 }}>${Number(c.valor_total ?? 0).toLocaleString()}</td>
                <td>
                  <button className="btn-icon btn-icon-edit" onClick={() => setModalDetalle(c)} title="Ver detalle">👁</button>
                  <button className="btn-icon btn-icon-del" onClick={() => del(c.id)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron compras</td></tr>
            )}
          </tbody>
        </table>
        </div>
      )}

      {modalDetalle && (
        <div className="modal-overlay open" onClick={() => setModalDetalle(null)}>
          <div className="modal-box" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2>Factura Compra #{modalDetalle.id}</h2>
            <p style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-400)' }}>
              {fechaCorta(modalDetalle.fecha)} — {modalDetalle.metodo_pago ?? '—'}
            </p>
            <div className="tabla-responsive" style={{ marginBottom: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Proveedor</th>
                    <th>Cant.</th>
                    <th>Precio Unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(modalDetalle.detalles ?? []).map((d) => (
                    <tr key={d.id}>
                      <td>{materiaNombre(d.materia_prima_id)}</td>
                      <td>{marcaNombre(d.marca_id)}</td>
                      <td>{d.cantidad}</td>
                      <td>${Number(d.precio_unitario ?? 0).toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>${Number(d.subtotal ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(modalDetalle.detalles ?? []).length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--text-400)' }}>Sin detalle</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 16 }}>
              Total: ${Number(modalDetalle.valor_total ?? 0).toLocaleString()}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
