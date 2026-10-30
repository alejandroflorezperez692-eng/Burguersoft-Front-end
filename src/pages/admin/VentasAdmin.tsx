import { useEffect, useState, type CSSProperties } from 'react';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';
import Paginacion, { paginar } from '../../components/Paginacion';

import { useToast } from '../../components/Toast';

import { useAuth } from '../../hooks/useAuth';
import { normalizarRol } from '../../utils/roles';
import { useEscape } from '../../hooks/useEscape';
import MotivoModal from '../../components/MotivoModal';
import TrazabilidadModal from '../../components/TrazabilidadModal';
import { mensajeDeError, type MapaTransiciones } from '../../types/Trazabilidad';

interface DetalleVenta {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto?: { id?: number; nombre?: string };
}

interface PromocionVenta {
  id: number;
  nombre: string;
}

interface Venta {
  id: number;
  fecha: string;
  valor_total: number;
  metodo_pago: string;
  estado: string;
  tipo_entrega: string;
  usuario_id: number;
  cliente_nombre?: string | null;
  usuario?: { nombre: string; apellido: string };
  detalles: DetalleVenta[];
  promociones: PromocionVenta[];
}

interface Producto {
  id: number;
  nombre: string;
  valor: number;
}

interface Promocion {
  id: number;
  nombre: string;
  precio: number;
  estado?: string;
}

const METODOS = ['Efectivo', 'Daviplata', 'Bancolombia', 'Nequi'];
const TIPOS_ENTREGA = ['Domicilio', 'Recoger', 'Consumir'];
const ESTADOS = ['Registrado', 'Por verificar', 'Recepcionado', 'En preparación', 'Preparado', 'Servido', 'Pendiente de pago', 'Pagado', 'Cancelado', 'Reembolsada', 'Rechazada'];

const toArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

// Minúsculas y sin tildes, para búsquedas tolerantes
const normalizar = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// Fecha local en formato YYYY-MM-DD
const fechaLocal = (fecha?: string | null) =>
  fecha ? new Date(fecha).toLocaleDateString('en-CA') : '';

export default function VentasAdmin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const alertar = (m: any) => showToast(String(m), true);
   const esAdmin = normalizarRol(user?.role) === 'admin';
  const esMesero = normalizarRol(user?.role) === 'mesero';

  
  const [items, setItems] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  
  // --- Filtros (Carlos) ---
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [filtroEntrega, setFiltroEntrega] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // --- Paginación (Develop) ---
  const [pagina, setPagina] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [tipoEntrega, setTipoEntrega] = useState(esMesero ? 'Consumir' : 'Domicilio');
  const [clienteNombre, setClienteNombre] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [productoId, setProductoId] = useState<number>(0);
  const [cantidad, setCantidad] = useState('1');
  const [carrito, setCarrito] = useState<{ producto_id: number; cantidad: number }[]>([]);
  const [promocionId, setPromocionId] = useState<number>(0);
  const [cantidadCombo, setCantidadCombo] = useState('1');
  const [combos, setCombos] = useState<{ promocion_id: number; cantidad: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [transiciones, setTransiciones] = useState<MapaTransiciones | null>(null);
  const [cambioConMotivo, setCambioConMotivo] = useState<{ venta: Venta; estado: string } | null>(null);
  const [historialId, setHistorialId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        apiClient.get('/ventas'),
        apiClient.get('/productos'),
        apiClient.get('/promociones'),
        apiClient.get('/pedidos/transiciones').catch(() => null),
      ]);
      setItems(toArray<Venta>(r1.data));
      setProductos(toArray<Producto>(r2.data));
      setPromociones(toArray<Promocion>(r3.data));
      setTransiciones((r4?.data as MapaTransiciones | undefined) ?? null);
    } catch {
      setItems([]);
      setProductos([]);
      setPromociones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const nombreCliente = (v: Venta) =>
    v?.cliente_nombre || (v?.usuario ? `${v.usuario.nombre} ${v.usuario.apellido}`.trim() : '');

  const textoBusqueda = normalizar(q).trim();

  // --- Lógica de Filtrado (Carlos) ---
  const filtered = (items ?? []).filter((v) => {
    if (textoBusqueda) {
      const haystack = normalizar(
        [
          v?.id,
          nombreCliente(v),
          ...(v?.detalles ?? []).map((d) => d?.producto?.nombre),
          ...(v?.promociones ?? []).map((p) => p?.nombre),
        ].join(' ')
      );
      if (!haystack.includes(textoBusqueda)) return false;
    }

    if (filtroEstado && v?.estado !== filtroEstado) return false;
    if (filtroMetodo && v?.metodo_pago !== filtroMetodo) return false;
    if (filtroEntrega && v?.tipo_entrega !== filtroEntrega) return false;

    const fechaVenta = fechaLocal(v?.fecha);
    if (fechaDesde && fechaVenta < fechaDesde) return false;
    if (fechaHasta && fechaVenta > fechaHasta) return false;

    return true;
  });

  const hayFiltros = Boolean(
    q || filtroEstado || filtroMetodo || filtroEntrega || fechaDesde || fechaHasta
  );

  const limpiarFiltros = () => {
    setQ('');
    setFiltroEstado('');
    setFiltroMetodo('');
    setFiltroEntrega('');
    setFechaDesde('');
    setFechaHasta('');
    setPagina(1);
  };

  const totalFiltrado = filtered.reduce((a, v) => a + (Number(v?.valor_total) || 0), 0);

  // --- Paginación (Develop) ---
  const { visibles, paginaActual } = paginar(filtered, pagina);

  const sinNada = carrito.length === 0 && combos.length === 0;
  const rojoProducto: CSSProperties | undefined =
    intentado && sinNada
      ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px rgba(192, 57, 43, 0.12)' }
      : undefined;

  const save = () => {
    setIntentado(true);
    if (sinNada) return;
    const body = {
      carrito,
      combos: combos.length ? combos : undefined,
      metodo_pago: metodoPago,
      tipo_entrega: tipoEntrega,
      cliente_nombre: clienteNombre.trim() || undefined,
    };
    apiClient.post('/ventas', body).then(() => {
      cerrarFormulario();
      load();
    }).catch(() => alertar('No se pudo registrar la venta. Revisa el stock y los datos.'));
  };

  const cerrarFormulario = () => {
    setIntentado(false);
    setShowForm(false);
    setCarrito([]);
    setCombos([]);
    setProductoId(0);
    setCantidad('1');
    setPromocionId(0);
    setCantidadCombo('1');
    setClienteNombre('');
  };

  const buscarProducto = (id: number) => (productos ?? []).find((p) => p?.id === id);

  const agregarAlCarrito = () => {
    if (!productoId) return;
    const cant = Math.max(1, Math.floor(Number(cantidad) || 1));

    setCarrito((prev) => {
      const existente = prev.findIndex((l) => l.producto_id === productoId);

      if (existente >= 0) {
        const copia = [...prev];
        copia[existente] = { ...copia[existente], cantidad: copia[existente].cantidad + cant };
        return copia;
      }

      return [...prev, { producto_id: productoId, cantidad: cant }];
    });

    setProductoId(0);
    setCantidad('1');
  };

  const quitarDelCarrito = (id: number) =>
    setCarrito((prev) => prev.filter((l) => l.producto_id !== id));

  const buscarPromocion = (id: number) => (promociones ?? []).find((p) => p?.id === id);

  const agregarCombo = () => {
    if (!promocionId) return;
    const cant = Math.max(1, Math.floor(Number(cantidadCombo) || 1));

    setCombos((prev) => {
      const existente = prev.findIndex((c) => c.promocion_id === promocionId);

      if (existente >= 0) {
        const copia = [...prev];
        copia[existente] = { ...copia[existente], cantidad: copia[existente].cantidad + cant };
        return copia;
      }

      return [...prev, { promocion_id: promocionId, cantidad: cant }];
    });

    setPromocionId(0);
    setCantidadCombo('1');
  };

  const quitarCombo = (id: number) =>
    setCombos((prev) => prev.filter((c) => c.promocion_id !== id));

  const totalProductos = carrito.reduce(
    (acumulado, linea) => acumulado + (Number(buscarProducto(linea.producto_id)?.valor) || 0) * linea.cantidad,
    0
  );

  const totalCombos = combos.reduce(
    (acumulado, combo) => acumulado + (Number(buscarPromocion(combo.promocion_id)?.precio) || 0) * combo.cantidad,
    0
  );

  const totalCarrito = totalProductos + totalCombos;

  const updateEstado = (id: number, estado: string, motivo?: string) => {
    apiClient.patch(`/ventas/${id}/estado`, { estado, motivo })
      .then(() => { load(); })
      .catch((e) => alertar(mensajeDeError(e, 'No se pudo cambiar el estado.')));
  };

  // "Rechazada" solo la puede marcar el cliente desde "Mis pedidos";
  // el admin no puede ponerla (excepto verla si el pedido ya la tiene).
  const opcionesEstado = (v: Venta) => {
    const t = transiciones?.[v.estado];
    const base = ESTADOS.filter((e) => e !== 'Rechazada' || v.estado === 'Rechazada');
    if (!t) return base.map((e) => ({ estado: e, habilitado: true, conMotivo: e === 'Cancelado' }));

    return base
      .filter((e) => e === v.estado || t.directas.includes(e) || t.con_motivo.includes(e))
      .map((e) => ({
        estado: e,
        habilitado: true,
        conMotivo: e !== v.estado && (e === 'Cancelado' || t.con_motivo.includes(e)),
      }));
  };

  const pedirCambioEstado = (v: Venta, estado: string) => {
    const op = opcionesEstado(v).find((o) => o.estado === estado);
    if (op?.conMotivo) {
      setCambioConMotivo({ venta: v, estado });
      return;
    }
    updateEstado(v.id, estado);
  };

  const verFactura = async (id: number) => {
    const ventana = window.open('', '_blank');

    try {
      const respuesta = await apiClient.get(`/ventas/${id}/recibo.pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([respuesta.data], { type: 'application/pdf' }));

      if (ventana) {
        ventana.location.href = url;
      } else {
        window.open(url, '_blank');
      }

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      ventana?.close();
      alertar('No se pudo abrir la factura.');
    }
  };

  useEscape([
    [showForm, cerrarFormulario],
  ]);

  if (loading) {
    return <AdminLoading texto="Cargando ventas" subtexto="Preparando tus pedidos y movimientos" />;
  }

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>{esAdmin ? 'Gestión de Ventas' : 'Caja'}</h1>
          <p className="subtitulo">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva venta'}
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay open" onClick={cerrarFormulario}>
        <div className="modal-box" style={{ maxWidth: 780, width: '95%', padding: 0 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ background: 'var(--text-900)', padding: '18px 28px' }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--surface)' }}>Registrar Venta</h3>
          </div>
          <div style={{ padding: 28 }}>
          <div className="grid-registro">
            <div className="form-group">
              <label>Producto</label>
              <select value={productoId} style={rojoProducto} onChange={(e) => setProductoId(Number(e.target.value))}>
                <option value={0}>Seleccionar...</option>
                {(productos ?? []).map((p) => <option key={p?.id ?? p?.nombre} value={p?.id}>{p?.nombre ?? 'Sin nombre'} — ${Number(p?.valor || 0).toLocaleString('es-CO')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad</label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') agregarAlCarrito(); }}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-cancel"
            onClick={agregarAlCarrito}
            disabled={!productoId}
            style={{ marginTop: 4, padding: '8px 18px', fontSize: 13, opacity: productoId ? 1 : 0.5, cursor: productoId ? 'pointer' : 'not-allowed' }}
          >
            Agregar producto
          </button>

          <div className="grid-registro" style={{ marginTop: 18 }}>
            <div className="form-group">
              <label>Combo (opcional)</label>
              <select value={promocionId} onChange={(e) => setPromocionId(Number(e.target.value))}>
                <option value={0}>Seleccionar combo...</option>
                {(promociones ?? [])
                  .filter((p) => p?.estado === 'Activa')
                  .map((p) => (
                    <option key={p?.id} value={p?.id}>
                      {p?.nombre ?? 'Combo'} — ${Number(p?.precio || 0).toLocaleString('es-CO')}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad de combos</label>
              <input
                type="number"
                min={1}
                value={cantidadCombo}
                onChange={(e) => setCantidadCombo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') agregarCombo(); }}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-cancel"
            onClick={agregarCombo}
            disabled={!promocionId}
            style={{ marginTop: 4, padding: '8px 18px', fontSize: 13, opacity: promocionId ? 1 : 0.5, cursor: promocionId ? 'pointer' : 'not-allowed' }}
          >
            Agregar combo
          </button>

          <div style={{ marginTop: 18 }}>
            {carrito.length === 0 && combos.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-400)', margin: 0 }}>Aún no has agregado productos ni combos.</p>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                {carrito.map((linea) => {
                  const prod = buscarProducto(linea.producto_id);
                  return (
                    <div
                      key={linea.producto_id}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                    >
                      <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-900)' }}>{prod?.nombre ?? 'Producto'}</span>
                      <span style={{ color: 'var(--text-600)' }}>x{linea.cantidad}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-900)', minWidth: 80, textAlign: 'right' }}>
                        ${((Number(prod?.valor) || 0) * linea.cantidad).toLocaleString('es-CO')}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitarDelCarrito(linea.producto_id)}
                        title="Quitar producto"
                        style={{ border: 'none', background: 'transparent', color: '#c0392b', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                {combos.map((combo) => {
                  const promo = buscarPromocion(combo.promocion_id);
                  return (
                    <div
                      key={`combo-${combo.promocion_id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, background: 'rgba(232, 98, 44, 0.04)' }}
                    >
                      <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-900)' }}>
                        {promo?.nombre ?? 'Combo'}{' '}
                        <span className="badge badge-info" style={{ fontSize: 10 }}>Combo</span>
                      </span>
                      <span style={{ color: 'var(--text-600)' }}>x{combo.cantidad}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-900)', minWidth: 80, textAlign: 'right' }}>
                        ${((Number(promo?.precio) || 0) * combo.cantidad).toLocaleString('es-CO')}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitarCombo(combo.promocion_id)}
                        title="Quitar combo"
                        style={{ border: 'none', background: 'transparent', color: '#c0392b', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid-registro" style={{ marginTop: 8 }}>
            <div className="form-group">
              <label>Método de pago</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tipo de entrega</label>
              <select value={tipoEntrega} onChange={(e) => setTipoEntrega(e.target.value)}>
                {TIPOS_ENTREGA.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cliente (opcional)</label>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre del cliente o dejar vacío"
                maxLength={150}
              />
            </div>
          </div>

          {carrito.length > 0 || combos.length > 0 ? (
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-900)', marginBottom: 2 }}>
              Total: ${totalCarrito.toLocaleString('es-CO')}
            </p>
          ) : null}
          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button className="btn-cancel" onClick={cerrarFormulario}>Cancelar</button>
            <button className="btn-save" onClick={save}>Registrar</button>
          </div>
          </div>
        </div>
        </div>
      )}

      <div className="search-bar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        
        {/* Fila 1: Búsqueda */}
        <div className="mn-search-wrap" style={{ marginBottom: 0 }}>
          <svg className="mn-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="mn-search"
            placeholder="Buscar por #, cliente, producto o combo..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setPagina(1); }}
            style={{ paddingLeft: 42 }} // <-- Esto arregla la superposición con el icono
          />
        </div>

        {/* Fila 2: Filtros (Carlos) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Estado</label>
            <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}>
              <option value="">Todos</option>
              {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Método de pago</label>
            <select value={filtroMetodo} onChange={(e) => { setFiltroMetodo(e.target.value); setPagina(1); }}>
              <option value="">Todos</option>
              {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Entrega</label>
            <select value={filtroEntrega} onChange={(e) => { setFiltroEntrega(e.target.value); setPagina(1); }}>
              <option value="">Todas</option>
              {TIPOS_ENTREGA.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Desde</label>
            <input
              type="date"
              value={fechaDesde}
              max={fechaHasta || undefined}
              onChange={(e) => { setFechaDesde(e.target.value); setPagina(1); }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={(e) => { setFechaHasta(e.target.value); setPagina(1); }}
            />
          </div>

          {hayFiltros && (
            <button type="button" className="btn-cancel" onClick={limpiarFiltros} style={{ padding: '8px 18px', fontSize: 13, height: 42 }}>
              Limpiar filtros
            </button>
          )}
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-600)', margin: 0 }}>
          {filtered.length} de {items.length} ventas
          {hayFiltros && ` · Total filtrado: $${Math.round(totalFiltrado).toLocaleString('es-CO')}`}
        </p>
      </div>

      <div className="tabla-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Método</th>
              <th>Estado</th>
              <th>Historial</th>
              <th>Factura</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((v) => (
              <tr key={v?.id}>
                <td>{v?.id}</td>
                <td style={{ fontWeight: 600 }}>{nombreCliente(v) || '—'}</td>
                <td>
                  <div className="venta-detalles">
                    {(v?.detalles ?? []).map((d, i) => (
                      <span key={`${d?.id}-${i}`} style={{ fontSize: 12, color: 'var(--text-600)' }}>
                        {d?.producto?.nombre ?? 'Producto'} x{d?.cantidad ?? 0}
                      </span>
                    ))}
                    {(v?.promociones ?? []).map((p, i) => (
                      <span key={`${p?.id}-${i}`} className="badge badge-info" style={{ fontSize: 10 }}>{p?.nombre}</span>
                    ))}
                  </div>
                </td>
                <td style={{ fontWeight: 700 }}>${Number(v?.valor_total || 0).toLocaleString('es-CO')}</td>
                <td><span className="badge badge-info">{v?.metodo_pago ?? ''}</span></td>
                <td>
                  <select
                    value={v?.estado ?? ''}
                    onChange={(e) => pedirCambioEstado(v, e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {opcionesEstado(v).map((o) => (
                      <option key={o.estado} value={o.estado} disabled={!o.habilitado}>
                        {o.estado}{o.conMotivo ? ' (requiere motivo)' : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ padding: '5px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                    onClick={() => setHistorialId(v.id)}
                  >
                    Ver historial
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-save"
                    style={{ padding: '5px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                    onClick={() => verFactura(v.id)}
                  >
                    Ver factura
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron ventas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion total={filtered.length} pagina={paginaActual} onCambiar={setPagina} />

      {historialId !== null && (
        <TrazabilidadModal ventaId={historialId} onClose={() => setHistorialId(null)} />
      )}

      {cambioConMotivo && (
        <MotivoModal
          titulo={
            cambioConMotivo.estado === 'Cancelado'
              ? `Cancelar el pedido #${cambioConMotivo.venta.id}`
              : `Cambiar el pedido #${cambioConMotivo.venta.id} a «${cambioConMotivo.estado}»`
          }
          descripcion={
            cambioConMotivo.estado === 'Cancelado'
              ? 'Indica por qué se cancela. Quedará registrado en el historial del pedido.'
              : `Este cambio sale del flujo normal (de «${cambioConMotivo.venta.estado}»). Indica el motivo; quedará registrado.`
          }
          confirmarTexto={cambioConMotivo.estado === 'Cancelado' ? 'Cancelar pedido' : 'Confirmar cambio'}
          onClose={() => setCambioConMotivo(null)}
          onConfirm={(motivo) => {
            const { venta, estado } = cambioConMotivo;
            setCambioConMotivo(null);
            updateEstado(venta.id, estado, motivo);
          }}
        />
      )}
    </div>
  );
}