import { Fragment, useEffect, useState, type CSSProperties } from 'react';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';
import Paginacion, { paginar } from '../../components/Paginacion';

import { useToast } from '../../components/Toast';

import { useAuth } from '../../hooks/useAuth';
import { normalizarRol } from '../../utils/roles';
import { useEscape } from '../../hooks/useEscape';
import TrazabilidadModal from '../../components/TrazabilidadModal';


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
  mesa?: number | null;
  notas?: string | null;
  usuario?: {
    nombre: string;
    apellido: string;
    correo?: string | null;
    email?: string | null;
    telefono?: string | null;
    phone?: string | null;
    Tdocumento?: string | null;
    Ndocumento?: string | null;
  };
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

const normalizar = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const fechaLocal = (fecha?: string | null) =>
  fecha ? new Date(fecha).toLocaleDateString('en-CA') : '';

const fmtDia = (f?: string | null) =>
  f ? new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtHora = (f?: string | null) =>
  f ? new Date(f).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';

export default function VentasAdmin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const alertar = (m: any) => showToast(String(m), true);
   const esAdmin = normalizarRol(user?.role) === 'admin';
  const esMesero = normalizarRol(user?.role) === 'mesero';

  
  const [items, setItems] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [filtroEntrega, setFiltroEntrega] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [pagina, setPagina] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [tipoEntrega, setTipoEntrega] = useState(esMesero ? 'Consumir' : 'Domicilio');
  const [clienteNombre, setClienteNombre] = useState('');
  const [mesa, setMesa] = useState('');
  const [notas, setNotas] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [productoId, setProductoId] = useState<number>(0);
  const [cantidad, setCantidad] = useState('1');
  const [carrito, setCarrito] = useState<{ producto_id: number; cantidad: number }[]>([]);
  const [promocionId, setPromocionId] = useState<number>(0);
  const [cantidadCombo, setCantidadCombo] = useState('1');
  const [combos, setCombos] = useState<{ promocion_id: number; cantidad: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [historialId, setHistorialId] = useState<number | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [cierreAbierto, setCierreAbierto] = useState(false);
  const [cierreDesde, setCierreDesde] = useState('');
  const [cierreHasta, setCierreHasta] = useState('');
  const [, setVersion] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        apiClient.get('/ventas'),
        apiClient.get('/productos'),
        apiClient.get('/promociones'),
      ]);
      setItems(toArray<Venta>(r1.data));
      setProductos(toArray<Producto>(r2.data));
      setPromociones(toArray<Promocion>(r3.data));
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

  const { visibles, paginaActual } = paginar(filtered, pagina);

  const sinNada = carrito.length === 0 && combos.length === 0;
  const rojoProducto: CSSProperties | undefined =
    intentado && sinNada
      ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px rgba(192, 57, 43, 0.12)' }
      : undefined;

  const save = () => {
    setIntentado(true);
    if (sinNada) return;
    if (tipoEntrega === 'Consumir' && !mesa) return;
    const body = {
      carrito,
      combos: combos.length ? combos : undefined,
      metodo_pago: metodoPago,
      tipo_entrega: tipoEntrega,
      cliente_nombre: clienteNombre.trim() || undefined,
      mesa: tipoEntrega === 'Consumir' ? Number(mesa) : undefined,
      notas: notas.trim() || undefined,
    };
    apiClient.post('/ventas', body).then(() => {
      cerrarFormulario();
      load();
    }).catch((e) => {
      const d = (e as any)?.response?.data;
      const msg = d?.error || d?.message || (Object.values(d?.errors ?? {}) as string[][])[0]?.[0];
      alertar(msg || 'No se pudo registrar la venta. Revisa los datos.');
    });
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
    setMesa('');
    setNotas('');
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

    /* ===== Días, cierre del día e impresión ===== */
  const NO_VENDIDOS = ['Cancelado', 'Reembolsada', 'Rechazada'];
  const esVendida = (v: Venta) => v?.estado === 'Pagado';
  const hoyStr = new Date().toLocaleDateString('en-CA');
  const moneda = (n: number) => `$${Math.round(n || 0).toLocaleString('es-CO')}`;
  const escHtml = (t: unknown) =>
    String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

  const fmtLargo = (clave: string) =>
    new Date(`${clave}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const etiquetaDia = (clave: string) => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    if (clave === hoyStr) return `Hoy · ${fmtLargo(clave)}`;
    if (clave === ayer.toLocaleDateString('en-CA')) return `Ayer · ${fmtLargo(clave)}`;
    return fmtLargo(clave);
  };

  const resumenDia = (clave: string) => {
    const delDia = filtered.filter((v) => fechaLocal(v?.fecha) === clave);
    const vendidas = delDia.filter(esVendida);
    return {
      ventas: delDia.length,
      total: vendidas.reduce((a, v) => a + (Number(v?.valor_total) || 0), 0),
    };
  };

  const abrirCierre = (desde?: string, hasta?: string) => {
    const d = desde || fechaDesde || hoyStr;
    setCierreDesde(d);
    setCierreHasta(hasta || (desde ? desde : fechaHasta) || d);
    setCierreAbierto(true);
  };

  const calcularCierre = () => {
    const desde = cierreDesde || hoyStr;
    const hasta = cierreHasta || desde;

    const base = (items ?? []).filter((v) => {
      const f = fechaLocal(v?.fecha);
      if (f < desde || f > hasta) return false;
      if (filtroMetodo && v?.metodo_pago !== filtroMetodo) return false;
      if (filtroEntrega && v?.tipo_entrega !== filtroEntrega) return false;
      return true;
    });

    const vendidas = base.filter(esVendida);
    const pendientes = base.filter((v) => !esVendida(v) && !NO_VENDIDOS.includes(v?.estado));
    const anuladas = base.filter((v) => NO_VENDIDOS.includes(v?.estado));

    const prod = new Map<string, { cantidad: number; total: number }>();
    const combos = new Map<string, number>();
    const metodos = new Map<string, { ventas: number; total: number }>();

    vendidas.forEach((v) => {
      (v?.detalles ?? []).forEach((d) => {
        const nombre = d?.producto?.nombre ?? 'Producto';
        const a = prod.get(nombre) ?? { cantidad: 0, total: 0 };
        a.cantidad += Number(d?.cantidad) || 0;
        a.total += Number(d?.subtotal) || (Number(d?.cantidad) || 0) * (Number(d?.precio_unitario) || 0);
        prod.set(nombre, a);
      });
      (v?.promociones ?? []).forEach((p) => {
        combos.set(p?.nombre, (combos.get(p?.nombre) ?? 0) + 1);
      });
      const m = metodos.get(v?.metodo_pago ?? '—') ?? { ventas: 0, total: 0 };
      m.ventas += 1;
      m.total += Number(v?.valor_total) || 0;
      metodos.set(v?.metodo_pago ?? '—', m);
    });

    const productos = [...prod.entries()]
      .map(([nombre, x]) => ({ nombre, ...x }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return {
      desde,
      hasta,
      vendidas: vendidas.length,
      total: vendidas.reduce((a, v) => a + (Number(v?.valor_total) || 0), 0),
      unidades: productos.reduce((a, p) => a + p.cantidad, 0),
      productos,
      combos: [...combos.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })),
      metodos: [...metodos.entries()].map(([nombre, x]) => ({ nombre, ...x })),
      pendientes: { n: pendientes.length, total: pendientes.reduce((a, v) => a + (Number(v?.valor_total) || 0), 0) },
      anuladas: anuladas.length,
    };
  };

  const imprimirCierre = () => {
    const c = calcularCierre();
    const w = window.open('', '_blank', 'width=460,height=720');
    if (!w) {
      alertar('Permite las ventanas emergentes para poder imprimir.');
      return;
    }
    const rango = c.desde === c.hasta ? fmtLargo(c.desde) : `${fmtLargo(c.desde)} al ${fmtLargo(c.hasta)}`;
    const filasProd = c.productos.length
      ? c.productos.map((p) => `<tr><td>${escHtml(p.nombre)}</td><td class="r">${p.cantidad}</td><td class="r">${moneda(p.total)}</td></tr>`).join('')
      : '<tr><td colspan="3" class="c">Sin ventas en este periodo</td></tr>';
    const filasCombos = c.combos.map((p) => `<tr><td>${escHtml(p.nombre)}</td><td class="r">${p.cantidad}</td><td class="r">—</td></tr>`).join('');
    const filasMetodos = c.metodos.map((m) => `<tr><td>${escHtml(m.nombre)}</td><td class="r">${m.ventas}</td><td class="r">${moneda(m.total)}</td></tr>`).join('');

 w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cierre del día</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#1a0f0a;max-width:380px;margin:0 auto;padding:16px;font-size:13px}
h1{font-size:19px;margin:0 0 2px;text-align:center}
.sub{text-align:center;color:#6b4a2b;margin:0 0 4px;text-transform:capitalize}
.gen{text-align:center;color:#888;font-size:11px;margin:0 0 12px}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin:16px 0 2px}
table{width:100%;border-collapse:collapse}
th{font-size:11px;text-transform:uppercase;text-align:left;border-bottom:2px solid #1a0f0a;padding:4px 0}
td{padding:4px 0;border-bottom:1px dashed #bbb}
.r{text-align:right}.c{text-align:center;color:#888}
th.r{text-align:right}
.tot{display:flex;justify-content:space-between;font-size:17px;font-weight:700;border-top:2px solid #1a0f0a;margin-top:12px;padding-top:8px}
.nota{color:#6b4a2b;font-size:12px;margin:6px 0 0}
</style></head><body>
<h1>Cierre del día</h1>
<p class="sub">${escHtml(rango)}</p>
<p class="gen">Impreso: ${escHtml(new Date().toLocaleString('es-CO'))}</p>
<h2>Productos vendidos</h2>
<table><thead><tr><th>Producto</th><th class="r">Cant.</th><th class="r">Subtotal</th></tr></thead><tbody>${filasProd}</tbody></table>
${filasCombos ? `<h2>Combos</h2><table><thead><tr><th>Combo</th><th class="r">Cant.</th><th class="r"></th></tr></thead><tbody>${filasCombos}</tbody></table>` : ''}
<h2>Por método de pago</h2>
<table><thead><tr><th>Método</th><th class="r">Ventas</th><th class="r">Total</th></tr></thead><tbody>${filasMetodos || '<tr><td colspan="3" class="c">—</td></tr>'}</tbody></table>
<div class="tot"><span>TOTAL DEL DÍA</span><span>${moneda(c.total)}</span></div>
<p class="nota">${c.vendidas} ventas pagadas · ${c.unidades} productos</p>
${c.pendientes.n ? `<p class="nota">Pendientes de cobro: ${c.pendientes.n} (${moneda(c.pendientes.total)}) — no incluidos en el total</p>` : ''}
${c.anuladas ? `<p class="nota">Canceladas / rechazadas: ${c.anuladas}</p>` : ''}
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const cierre = cierreAbierto ? calcularCierre() : null;

  const detalle = detalleId !== null ? items.find((x) => x.id === detalleId) ?? null : null;

  useEscape([
    [cierreAbierto, () => setCierreAbierto(false)],
    [detalle !== null, () => setDetalleId(null)],
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
      </div>
      

      {showForm && (
        <div className="modal-overlay open" onClick={cerrarFormulario}>
        <div className="modal-box" style={{ maxWidth: 780, width: '95%', padding: 0 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ background: 'var(--text-900)', padding: '18px 28px' }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--surface)' }}>Registrar Venta</h3>
            <button type="button" className="mn-form-cerrar" onClick={cerrarFormulario} aria-label="Cerrar">×</button>
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
            {tipoEntrega === 'Consumir' && (
              <div className="form-group">
                <label>Mesa *</label>
                <select
                  value={mesa}
                  onChange={(e) => setMesa(e.target.value)}
                  style={intentado && !mesa ? { borderColor: 'var(--danger)' } : undefined}
                >
                  <option value="">Elige la mesa</option>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>Mesa {n}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Notas para cocina (opcional)</label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: sin tomate, extra bacon"
                maxLength={255}
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
              <th>Fecha</th>
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
                <td className="vt-num">#{v?.id}</td>
                <td className="vt-fecha">
                  <span>{fmtDia(v?.fecha)}</span>
                  <small>{fmtHora(v?.fecha)}</small>
                </td>
                <td className="vt-cliente">
                  <strong>{nombreCliente(v) || '—'}</strong>
                  <small>
                    {v?.tipo_entrega === 'Consumir' && v?.mesa ? `Mesa ${v.mesa}` : v?.tipo_entrega ?? ''}
                  </small>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ padding: '5px 10px', fontSize: 12, whiteSpace: 'nowrap', marginTop: 8 }}
                    onClick={() => setDetalleId(v.id)}
                  >
                    Ver detalle
                  </button>
                </td>
                <td className="vt-total">${Number(v?.valor_total || 0).toLocaleString('es-CO')}</td>
                <td><span className="badge badge-info">{v?.metodo_pago ?? ''}</span></td>
                <td>
                  <span className="vt-estado" data-estado={v?.estado ?? ''}>{v?.estado ?? '—'}</span>
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
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron ventas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion total={filtered.length} pagina={paginaActual} onCambiar={setPagina} />

      {historialId !== null && (
        <TrazabilidadModal ventaId={historialId} onClose={() => setHistorialId(null)} />
      )}

      {detalle && (
        <div className="modal-overlay open" onClick={() => setDetalleId(null)}>
          <div className="modal-box vt-det" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="modal-x" onClick={() => setDetalleId(null)} aria-label="Cerrar">×</button>   {/* ➕ */}
          <div className="vt-det-head">
              <div>
                <h3>Venta #{detalle.id}</h3>
                <p>{fmtDia(detalle.fecha)} · {fmtHora(detalle.fecha)}</p>
              </div>
              <span className="vt-estado" data-estado={detalle.estado}>{detalle.estado}</span>
            </div>

            <section className="vt-det-sec">
              <h4>Cliente</h4>
              <dl className="vt-det-grid">
                <div><dt>Nombre</dt><dd>{nombreCliente(detalle) || '—'}</dd></div>
                <div><dt>Correo</dt><dd>{detalle.usuario?.correo || detalle.usuario?.email || '—'}</dd></div>
                <div><dt>Teléfono</dt><dd>{detalle.usuario?.telefono || detalle.usuario?.phone || '—'}</dd></div>
                <div>
                  <dt>Documento</dt>
                  <dd>
                    {detalle.usuario?.Ndocumento
                      ? `${detalle.usuario?.Tdocumento ? detalle.usuario.Tdocumento + ' ' : ''}${detalle.usuario.Ndocumento}`
                      : '—'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="vt-det-sec">
              <h4>Pedido</h4>
              <dl className="vt-det-grid">
                <div><dt>Entrega</dt><dd>{detalle.tipo_entrega || '—'}</dd></div>
                {detalle.tipo_entrega === 'Consumir' && detalle.mesa ? (
                  <div><dt>Mesa</dt><dd>{detalle.mesa}</dd></div>
                ) : null}
                <div><dt>Método de pago</dt><dd>{detalle.metodo_pago || '—'}</dd></div>
                {detalle.notas ? (
                  <div className="vt-det-full"><dt>Notas</dt><dd>{detalle.notas}</dd></div>
                ) : null}
              </dl>
            </section>

            <section className="vt-det-sec">
              <h4>Productos</h4>
              <div className="vt-det-lineas">
                {(detalle.detalles ?? []).map((d, i) => (
                  <div className="vt-det-linea" key={`d${i}`}>
                    <span><b>{d?.cantidad ?? 0}×</b> {d?.producto?.nombre ?? 'Producto'}</span>
                    <span className="vt-det-pu">${Number(d?.precio_unitario || 0).toLocaleString('es-CO')} c/u</span>
                    <strong>${Number(d?.subtotal || 0).toLocaleString('es-CO')}</strong>
                  </div>
                ))}
                {(detalle.promociones ?? []).map((p, i) => (
                  <div className="vt-det-linea" key={`p${i}`}>
                    <span>{p?.nombre} <span className="badge badge-info">Combo</span></span>
                  </div>
                ))}
              </div>
            </section>

            <div className="vt-det-total">
              <span>Total</span>
              <strong>${Number(detalle.valor_total || 0).toLocaleString('es-CO')}</strong>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setDetalleId(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}