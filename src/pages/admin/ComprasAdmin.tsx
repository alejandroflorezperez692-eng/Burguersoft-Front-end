import { Fragment, useEffect, useRef, useState } from 'react';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';
import ToastMessage, { useToast } from '../../components/Toast';
import '../../styles/nu-admin.css';

interface DetalleCompra {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  materia_prima_id: number;
  marca_id: number;
  materia_prima?: { nombre: string };
  marca?: { nombre: string };
}

interface Compra {
  id: number;
  fecha: string;
  metodo_pago: string;
  valor_total: number;
  detalles: DetalleCompra[];
}

interface MateriaPrima { id: number; nombre: string; valor: number; }
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

const METODOS = ['Efectivo', 'Nequi', 'Daviplata'];
const UNIDADES = ['Kg', 'Gramos', 'Libras', 'Litros', 'Mililitros', 'Unidades', 'Paquetes', 'Cajas', 'Bolsas', 'Botellas', 'Latas'];
const soloDigitos = (v: string): string => v.replace(/\D/g, '');
const miles = (v: string): string => v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function Desplegable({ value, onChange, opciones, placeholder = 'Seleccionar...' }: {
  value: string;
  onChange: (v: string) => void;
  opciones: string[];
  placeholder?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '11px 14px',
          border: `1.5px solid ${abierto ? 'var(--brand)' : 'var(--border)'}`,
          borderRadius: 'var(--r-sm)',
          background: 'var(--surface-2)',
          color: value ? 'var(--text-900)' : 'var(--text-400)',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{value || placeholder}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: 'var(--text-900)',
            flexShrink: 0,
            transform: abierto ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {abierto && (
        <ul
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 30,
            maxHeight: 220,
            overflowY: 'auto',
            margin: 0,
            padding: 6,
            listStyle: 'none',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {opciones.map((o) => (
            <li
              key={o}
              onClick={() => { onChange(o); setAbierto(false); }}
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: o === value ? 700 : 500,
                color: o === value ? 'var(--brand)' : 'var(--text-900)',
                background: o === value ? 'rgba(232, 130, 26, 0.12)' : 'transparent',
              }}
              onMouseEnter={(e) => { if (o !== value) e.currentTarget.style.background = 'rgba(232, 130, 26, 0.08)'; }}
              onMouseLeave={(e) => { if (o !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const etiquetaFecha = (clave: string): string => {
  const hoy = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const claveDe = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  const [y, m, d] = clave.split('-').map(Number);
  const larga = new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const texto = larga.charAt(0).toUpperCase() + larga.slice(1);
  if (clave === claveDe(hoy)) return `Hoy · ${texto}`;
  if (clave === claveDe(ayer)) return `Ayer · ${texto}`;
  return texto;
};

export default function ComprasAdmin() {
  const [items, setItems] = useState<Compra[]>([]);
  const [materias, setMaterias] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const { toast, showToast } = useToast();
  const [lineas, setLineas] = useState<Linea[]>([
    { materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' },
  ]);
  const [modalDetalle, setModalDetalle] = useState<Compra | null>(null);
  const [loading, setLoading] = useState(true);
  const cargado = useRef(false);

  const load = () => {
    Promise.all([
      apiClient.get<Compra[]>('/compras'),
      apiClient.get<MateriaPrima[]>('/materias-primas'),
      apiClient.get<Marca[]>('/marcas'),
    ]).then(([r1, r2, r3]) => {
      setItems(r1.data);
      setMaterias(r2.data);
      setMarcas(r3.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
  if (cargado.current) return;
  cargado.current = true;
  load();
}, []);

  const filtered = items.filter((c) =>
    String(c.id).includes(q) || c.metodo_pago.toLowerCase().includes(q.toLowerCase())
  );

  const [diasVisibles, setDiasVisibles] = useState(5);

  const grupos = Object.entries(
    [...filtered]
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
      .reduce<Record<string, Compra[]>>((acc, c) => {
        const clave = c.fecha.slice(0, 10);
        (acc[clave] = acc[clave] || []).push(c);
        return acc;
      }, {})
  );
  const gruposVisibles = grupos.slice(0, diasVisibles);

  const totalMes = items.filter((c) => {
    const d = new Date(c.fecha);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((a, c) => a + Number(c.valor_total), 0);

  const totalHisto = items.reduce((a, c) => a + Number(c.valor_total), 0);

  const addLinea = () => {
    setLineas([...lineas, { materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' }]);
  };

  const removeLinea = (i: number) => {
    setLineas(lineas.filter((_, idx) => idx !== i));
  };

  const updateLinea = (i: number, field: keyof Linea, value: string | number | null) => {
  const copy = [...lineas];
  const antes = copy[i];
  const nueva = { ...antes, [field]: value };

  // Autocompleta el precio total con el último precio guardado del insumo
  if (field === 'materia_prima_id' || field === 'cantidad') {
    const autoDe = (l: Linea): string => {
      const m = materias.find((x) => x.id === l.materia_prima_id);
      const c = Number(l.cantidad);
      return m && c > 0 ? String(Math.round(Number(m.valor) * c)) : '';
    };
    // Solo se sobreescribe si está vacío o si era el precio automático anterior
    if (antes.precio_unitario === '' || antes.precio_unitario === autoDe(antes)) {
      nueva.precio_unitario = autoDe(nueva);
    }
  }

  copy[i] = nueva;
  setLineas(copy);
};

  const total = lineas.reduce((a, l) => a + (Number(l.precio_unitario) || 0), 0);

const save = () => {
  if (!metodoPago) { showToast('Selecciona el método de pago', true); return; }
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    const n = `Insumo ${i + 1}`;
    if (l.materia_prima_id === null && !l.nombre_nuevo.trim()) { showToast(`${n}: escribe el nombre del insumo nuevo`, true); return; }
    if (!(Number(l.cantidad) > 0)) { showToast(`${n}: escribe la cantidad`, true); return; }
    if (l.materia_prima_id === null && !l.unidad_medida.trim()) { showToast(`${n}: selecciona la unidad de medida`, true); return; }
    if (!(Number(l.precio_unitario) > 0)) { showToast(`${n}: escribe el precio total`, true); return; }
    if (!l.marca_id) { showToast(`${n}: selecciona el proveedor`, true); return; }
  }

  const hoy = new Date();
  const payload = {
    fecha: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`,
    metodo_pago: metodoPago,
    items: lineas.map((l) => ({
      materia_prima_id: l.materia_prima_id,
      cantidad: Number(l.cantidad),
      precio_total: Number(l.precio_unitario),
      marca_id: l.marca_id,
      nombre_nuevo: l.materia_prima_id ? undefined : l.nombre_nuevo.trim(),
      tipo: l.materia_prima_id ? undefined : l.tipo,
      unidad_medida: l.materia_prima_id ? undefined : l.unidad_medida.trim(),
    })),
  };
  apiClient.post('/compras', payload).then(() => {
    showToast('Compra registrada: el stock se sumó a Materia Prima');
    setShowForm(false);
    setMetodoPago('');
    setLineas([{ materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' }]);
    load();
  }).catch((e) => {
    const d = e?.response?.data;
    showToast(d?.errors ? (Object.values(d.errors) as string[][])[0][0] : d?.message || 'No se pudo registrar la compra', true);
  });
};

  const del = (id: number) => {
    if (!confirm('¿Eliminar esta compra? Se revertirá el stock.')) return;
    apiClient.delete(`/compras/${id}`).then(() => load());
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
          <span className="stat-val">{items.filter((c) => { const d = new Date(c.fecha); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length}</span>
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
           <label>Método de pago <span className="mn-req">*</span></label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              <option value="">Seleccionar...</option>
              {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {lineas.map((l, i) => (
           <div
              key={i}
              className="grid-lineas"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14,
                padding: '38px 16px 16px',
                marginBottom: 16,
                border: '1px solid var(--border)',
                borderRadius: 14,
                background: 'var(--surface-2)',
                position: 'relative',
              }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Insumo (elige o crea uno nuevo) <span className="mn-req">*</span></label>
                <select value={l.materia_prima_id ?? '__nuevo__'} onChange={(e) => updateLinea(i, 'materia_prima_id', e.target.value === '__nuevo__' ? null : Number(e.target.value))}>
                  <option value="__nuevo__">+ Nuevo insumo</option>
                  {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>

              {l.materia_prima_id === null && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Nombre <span className="mn-req">*</span></label>
                  <input value={l.nombre_nuevo} onChange={(e) => updateLinea(i, 'nombre_nuevo', e.target.value)} />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cantidad <span className="mn-req">*</span></label>
                <input type="number" value={l.cantidad} onChange={(e) => updateLinea(i, 'cantidad', e.target.value)} />
              </div>

              {l.materia_prima_id === null && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Unidad <span className="mn-req">*</span></label>
                  <Desplegable value={l.unidad_medida} onChange={(v) => updateLinea(i, 'unidad_medida', v)} opciones={UNIDADES} />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Precio total <span className="mn-req">*</span></label>
                <input type="text" inputMode="numeric" placeholder="$ 0" value={miles(l.precio_unitario)} onChange={(e) => updateLinea(i, 'precio_unitario', soloDigitos(e.target.value))} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Proveedor <span className="mn-req">*</span></label>
                <select value={l.marca_id} onChange={(e) => updateLinea(i, 'marca_id', Number(e.target.value))}>
                  <option value={0}>Seleccionar...</option>
                  {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              {lineas.length > 1 && (
                <button className="btn-icon btn-icon-del" onClick={() => removeLinea(i)} style={{ position: 'absolute', top: 6, right: 8 }}>✕</button>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <button className="btn-primary" onClick={addLinea}>+ Agregar insumo</button>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 18, color: 'var(--text-900)' }}>Total: ${total.toLocaleString('es-CO')}</span>
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
        <AdminLoading texto="Cargando compras" subtexto="Reuniendo tus abastecimientos" />
      ) : (
        <>
  <div className="tabla-responsive">
    <table className="data-table">
      <thead>
        <tr>
          <th>Compra</th>
          <th>Método de pago</th>
          <th>Insumos</th>
          <th>Total</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {gruposVisibles.map(([clave, lista]) => (
          <Fragment key={clave}>
            <tr>
              <td colSpan={5} style={{ background: 'var(--surface-2)', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-900)' }}>{etiquetaFecha(clave)}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-400)' }}>
                    {lista.length} {lista.length === 1 ? 'compra' : 'compras'} ·{' '}
                    <span style={{ color: 'var(--brand)', fontWeight: 800 }}>
                      ${lista.reduce((a, c) => a + Number(c.valor_total), 0).toLocaleString('es-CO')}
                    </span>
                  </span>
                </div>
              </td>
            </tr>
            {lista.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 700 }}>#{c.id}</td>
                <td><span className="badge badge-info">{c.metodo_pago}</span></td>
                <td>{(c.detalles ?? []).length}</td>
                <td style={{ fontWeight: 700 }}>${Number(c.valor_total).toLocaleString('es-CO')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="mn-btn-edit" style={{ flex: 'none', padding: '7px 14px' }} onClick={() => setModalDetalle(c)}>Ver detalle</button>
                    <button type="button" className="mn-btn-del" style={{ flex: 'none', padding: '7px 14px' }} onClick={() => del(c.id)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </Fragment>
        ))}
        {grupos.length === 0 && (
          <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron compras</td></tr>
        )}
      </tbody>
    </table>
  </div>

    {grupos.length > diasVisibles && (
    <div style={{ textAlign: 'center', marginTop: 18 }}>
      <button className="btn-primary" onClick={() => setDiasVisibles(diasVisibles + 5)}>
        Ver más días ({grupos.length - diasVisibles} restantes)
      </button>
    </div>
  )}
</>
      )}

      {modalDetalle && (
        <div className="modal-overlay open" onClick={() => setModalDetalle(null)}>
          <div className="modal-box" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2>Factura Compra #{modalDetalle.id}</h2>
            <p style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-400)' }}>
              {new Date(modalDetalle.fecha).toLocaleDateString()} — {modalDetalle.metodo_pago}
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
                  {modalDetalle.detalles.map((d) => (
                    <tr key={d.id}>
                      <td>{d.materia_prima?.nombre ?? 'N/A'}</td>
                      <td>{d.marca?.nombre ?? 'N/A'}</td>
                      <td>{d.cantidad}</td>
                      <td>${Number(d.precio_unitario).toLocaleString('es-CO')}</td>
                      <td style={{ fontWeight: 600 }}>${Number(d.subtotal).toLocaleString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 16 }}>
              Total: ${Number(modalDetalle.valor_total).toLocaleString()}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
       <ToastMessage toast={toast} />
    </div>
  
  );
}
