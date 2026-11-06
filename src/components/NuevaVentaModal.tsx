import { useEffect, useState, type CSSProperties } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './Toast';
import { useEscape } from '../hooks/useEscape';
import { normalizarRol } from '../utils/roles';

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

const toArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

interface Props {
  abierto: boolean;
  onClose: () => void;
  /** Se llama cuando el pedido se guardó bien (para recargar el tablero). */
  onCreada?: () => void;
  /** Mesa que se escoge de entrada (cuando se abre desde el modal de mesas). */
  mesaInicial?: number | null;
}

/** Formulario para registrar un pedido/venta. Es el mismo que usa Ventas. */
export default function NuevaVentaModal({ abierto, onClose, onCreada, mesaInicial }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const alertar = (m: unknown) => showToast(String(m), true);
  const esMesero = normalizarRol(user?.role) === 'mesero';

  const [productos, setProductos] = useState<Producto[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);

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

  // Carga el menú y los combos cada vez que se abre el formulario
  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    Promise.all([apiClient.get('/productos'), apiClient.get('/promociones')])
      .then(([r1, r2]) => {
        if (!vivo) return;
        setProductos(toArray<Producto>(r1.data));
        setPromociones(toArray<Promocion>(r2.data));
      })
      .catch(() => {
        if (!vivo) return;
        setProductos([]);
        setPromociones([]);
      });
    if (mesaInicial) {
      setTipoEntrega('Consumir');
      setMesa(String(mesaInicial));
    }
    return () => {
      vivo = false;
    };
  }, [abierto, mesaInicial]);

  const sinNada = carrito.length === 0 && combos.length === 0;
  const rojoProducto: CSSProperties | undefined =
    intentado && sinNada
      ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px rgba(192, 57, 43, 0.12)' }
      : undefined;

  const cerrar = () => {
    setIntentado(false);
    setCarrito([]);
    setCombos([]);
    setProductoId(0);
    setCantidad('1');
    setPromocionId(0);
    setCantidadCombo('1');
    setClienteNombre('');
    setMesa('');
    setNotas('');
    onClose();
  };

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
    apiClient
      .post('/ventas', body)
      .then(() => {
        cerrar();
        onCreada?.();
      })
      .catch((e) => {
        const d = (e as { response?: { data?: { error?: string; message?: string; errors?: Record<string, string[]> } } })?.response?.data;
        const msg = d?.error || d?.message || Object.values(d?.errors ?? {})[0]?.[0];
        alertar(msg || 'No se pudo registrar la venta. Revisa los datos.');
      });
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


  useEscape([[abierto, cerrar]]);

  if (!abierto) return null;

  return (
        <div className="modal-overlay open" onClick={cerrar}>
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
            <button className="btn-cancel" onClick={cerrar}>Cancelar</button>
            <button className="btn-save" onClick={save}>Registrar</button>
          </div>
          </div>
        </div>
        </div>
  );
}