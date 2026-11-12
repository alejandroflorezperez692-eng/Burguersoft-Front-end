import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './Toast';
import { useEscape } from '../hooks/useEscape';
import { normalizarRol } from '../utils/roles';
import '../styles/nu-admin.css';
import '../styles/nuevo-pedido.css';
import SelectOscuro from './SelectOscuro';
import { METODOS_MOSTRADOR } from '../utils/pagos';

interface Adicion { id: number; nombre: string; precio: number | string; tipo?: string; estado?: string }
interface Producto { id: number; nombre: string; valor: number; img?: string | null; estado?: string; categoria?: string; adiciones?: Adicion[] }
interface Promocion { id: number; nombre: string; precio: number; estado?: string }
interface PedidoMesa { id: number; estado: string; valor_total: number; items: { nombre: string; cantidad: number }[] }
interface Mesa { numero: number; estado: 'Libre' | 'Ocupada' | 'Por cobrar'; total?: number; pedidos?: PedidoMesa[]; mesero?: { id: number; nombre: string; apellido: string } | null }
type Item = { tipo: 'producto' | 'combo'; id: number; nombre: string; precio: number; img?: string | null; agotado?: boolean; cat: string };

const METODOS = METODOS_MOSTRADOR;
const TIPOS = [
  { v: 'Consumir', t: 'En el local' },
  { v: 'Domicilio', t: 'Domicilio' },
  { v: 'Recoger', t: 'Para recoger' },
];
const money = (n: number) => `$${n.toLocaleString('es-CO')}`;
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const toArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

const MESAS_BASE: Mesa[] = [1, 2, 3, 4].map((n) => ({ numero: n, estado: 'Libre' }));

const imgOk = (s?: string | null) => !!s && /^(https?:\/\/|data:|blob:|\/storage\/)/.test(s);

function precargarImagenes(lista: Producto[]) {
  lista.forEach((p) => {
    if (imgOk(p.img)) {
      const i = new Image();
      i.decoding = 'async';
      i.src = p.img as string;
    }
  });
}

function leerCache<T>(k: string): T | null {
  try { const s = sessionStorage.getItem(k); return s ? (JSON.parse(s) as T) : null; } catch { return null; }
}

const cache: {
  productos: Producto[] | null;
  promociones: Promocion[] | null;
  mesas: Mesa[] | null;
} = {
  productos: leerCache<Producto[]>('nv:productos'),
  promociones: leerCache<Promocion[]>('nv:promociones'),
  mesas: leerCache<Mesa[]>('nv:mesas'),
};

// Si ya hay productos en caché, las fotos empiezan a bajar apenas carga la app
if (cache.productos) precargarImagenes(cache.productos);

function fijar<K extends keyof typeof cache>(k: K, v: NonNullable<(typeof cache)[K]>) {
  cache[k] = v as (typeof cache)[K];
  try { sessionStorage.setItem('nv:' + k, JSON.stringify(v)); } catch { /* sin storage */ }
  if (k === 'productos') precargarImagenes(v as Producto[]);
}

/** Llamar antes de abrir el modal para que todo aparezca al instante. */
export function precargarNuevaVenta() {
  apiClient.get('/productos').then(({ data }) => fijar('productos', toArray<Producto>(data))).catch(() => {});
  apiClient.get('/promociones').then(({ data }) => fijar('promociones', toArray<Promocion>(data))).catch(() => {});
  apiClient.get('/mesas').then(({ data }) => fijar('mesas', toArray<Mesa>(data))).catch(() => {});
}

interface Props {
  abierto: boolean;
  onClose: () => void;
  onCreada?: () => void;
  mesaInicial?: number | null;
}

export default function NuevaVentaModal({ abierto, onClose, onCreada, mesaInicial }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const alertar = (m: unknown) => showToast(String(m), true);
  const rol = normalizarRol(user?.role);
  const esMesero = rol === 'mesero';
  const esAdmin = rol === 'admin';
  const puedeAsignarMesero = rol === 'admin' || rol === 'cajero';

  const [productos, setProductos] = useState<Producto[]>(cache.productos ?? []);
  const [promociones, setPromociones] = useState<Promocion[]>(cache.promociones ?? []);
  const [mesas, setMesas] = useState<Mesa[]>(cache.mesas ?? []);
  const [meseros, setMeseros] = useState<{ id: number; nombre: string; apellido: string }[]>([]);
  const [cargandoProd, setCargandoProd] = useState(!cache.productos);

  const [enviando, setEnviando] = useState(false);

  const [cat, setCat] = useState('Todos');
  const [tipoEntrega, setTipoEntrega] = useState('Consumir');
  const [mesa, setMesa] = useState<number | null>(null);
  const [cliente, setCliente] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [notas, setNotas] = useState('');
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [vista, setVista] = useState<'tarjetas' | 'lista'>(() => {
    try { return localStorage.getItem('nuevoPedidoVista') === 'lista' ? 'lista' : 'tarjetas'; } catch { return 'tarjetas'; }
  });
  const [carrito, setCarrito] = useState<{ producto_id: number; cantidad: number }[]>([]);
  const [combos, setCombos] = useState<{ promocion_id: number; cantidad: number }[]>([]);
  const [extras, setExtras] = useState<{ adicion_id: number; cantidad: number }[]>([]);

  useEffect(() => {
    try { localStorage.setItem('nuevoPedidoVista', vista); } catch { /* sin storage */ }
  }, [vista]);

  useEffect(() => { setPagina(1); }, [buscar, vista, cat]);

  const cargarMesas = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/mesas');
      const lista = toArray<Mesa>(data);
      fijar('mesas', lista.length ? lista : MESAS_BASE);
      setMesas(cache.mesas as Mesa[]);
    } catch {
      setMesas((prev) => (prev.length ? prev : MESAS_BASE));
    }
  }, []);

  useEffect(() => {
    if (!abierto) return;
    let vivo = true;

    // Lo que ya está en caché se muestra de inmediato
    if (cache.productos) setProductos(cache.productos);
    if (cache.promociones) setPromociones(cache.promociones);
    if (cache.mesas) setMesas(cache.mesas);

    // Cada petición va por separado: nadie espera a nadie
    apiClient.get('/productos')
      .then(({ data }) => {
        fijar('productos', toArray<Producto>(data));
        if (vivo) { setProductos(cache.productos as Producto[]); setCargandoProd(false); }
      })
      .catch(() => { if (vivo) setCargandoProd(false); });
    apiClient.get('/promociones')
      .then(({ data }) => {
        fijar('promociones', toArray<Promocion>(data));
        if (vivo) setPromociones(cache.promociones as Promocion[]);
      })
      .catch(() => {});
    cargarMesas();

    // F-036: admin y cajero pueden asignar el mesero de cada mesa.
    if (puedeAsignarMesero) {
      apiClient.get('/mesas/meseros')
        .then(({ data }) => { if (vivo) setMeseros(Array.isArray(data) ? data : []); })
        .catch(() => {});
    }

    setTipoEntrega('Consumir');
    if (mesaInicial) setMesa(mesaInicial);
    return () => { vivo = false; };
  }, [abierto, mesaInicial, cargarMesas, puedeAsignarMesero]);

  /* ---------- Items (productos + combos activos) ---------- */
  const todos = useMemo<Item[]>(() => [
    ...productos.map((p) => ({
      tipo: 'producto' as const, id: p.id, nombre: p.nombre, precio: Number(p.valor) || 0,
      img: imgOk(p.img) ? p.img : null, agotado: p.estado === 'Agotado', cat: p.categoria || 'Otros',
    })),
    ...promociones.filter((p) => p.estado === 'Activa').map((p) => ({
      tipo: 'combo' as const, id: p.id, nombre: p.nombre, precio: Number(p.precio) || 0, cat: 'Combos',
    })),
  ], [productos, promociones]);

  const categorias = useMemo(() => ['Todos', ...Array.from(new Set(todos.map((i) => i.cat)))], [todos]);

  const filtrados = useMemo(() => {
    const q = norm(buscar.trim());
    return todos.filter((i) => (cat === 'Todos' || i.cat === cat) && (!q || norm(i.nombre).includes(q)));
  }, [todos, buscar, cat]);

  const cantidadDe = (it: Item) =>
    it.tipo === 'producto'
      ? carrito.find((l) => l.producto_id === it.id)?.cantidad ?? 0
      : combos.find((c) => c.promocion_id === it.id)?.cantidad ?? 0;

  const cambiar = (it: Item, delta: number) => {
    const upd = <T extends { cantidad: number }>(lista: T[], igual: (x: T) => boolean, nuevo: T): T[] => {
      const i = lista.findIndex(igual);
      if (i < 0) return delta > 0 ? [...lista, nuevo] : lista;
      const cant = lista[i].cantidad + delta;
      return cant <= 0
        ? lista.filter((_, j) => j !== i)
        : lista.map((x, j) => (j === i ? { ...x, cantidad: Math.min(cant, 50) } : x));
    };
    if (it.tipo === 'producto') {
      setCarrito((l) => upd(l, (x) => x.producto_id === it.id, { producto_id: it.id, cantidad: 1 }));
    } else {
      setCombos((l) => upd(l, (x) => x.promocion_id === it.id, { promocion_id: it.id, cantidad: 1 }));
    }
  };

  const lineas = todos.filter((i) => cantidadDe(i) > 0);

  const adicionesDe = (productoId: number) =>
    (productos.find((p) => p.id === productoId)?.adiciones ?? [])
      .filter((a) => a.tipo === 'adicion' && (!a.estado || a.estado === 'Activo'));
  const cantExtra = (id: number) => extras.find((e) => e.adicion_id === id)?.cantidad ?? 0;
  const cambiarExtra = (id: number, delta: number) =>
    setExtras((l) => {
      const cant = (l.find((e) => e.adicion_id === id)?.cantidad ?? 0) + delta;
      if (cant <= 0) return l.filter((e) => e.adicion_id !== id);
      const nuevo = Math.min(cant, 50);
      return l.some((e) => e.adicion_id === id)
        ? l.map((e) => (e.adicion_id === id ? { ...e, cantidad: nuevo } : e))
        : [...l, { adicion_id: id, cantidad: nuevo }];
    });

  // Si quitan un producto del pedido, se van también sus adicionales
  useEffect(() => {
    setExtras((l) => l.filter((e) =>
      productos.some((p) => carrito.some((c) => c.producto_id === p.id) && p.adiciones?.some((a) => a.id === e.adicion_id))
    ));
  }, [carrito, productos]);

  const totalExtras = extras.reduce((s, e) => {
    const a = productos.flatMap((p) => p.adiciones ?? []).find((x) => x.id === e.adicion_id);
    return s + (Number(a?.precio) || 0) * e.cantidad;
  }, 0);
  const total = lineas.reduce((s, i) => s + i.precio * cantidadDe(i), 0) + totalExtras;

  const porPagina = 6;
  const paginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const visibles = filtrados.slice((pagina - 1) * porPagina, pagina * porPagina);
  const mesaActual = mesas.find((m) => m.numero === mesa);
  const tieneCuenta = tipoEntrega === 'Consumir' && (mesaActual?.pedidos?.length ?? 0) > 0;
  const etiqueta =
    tipoEntrega === 'Consumir' ? (mesa ? `Mesa ${mesa}` : '—')
    : tipoEntrega === 'Domicilio' ? 'Domicilio' : 'Para recoger';

  /* ---------- Mesas ---------- */
  const asignarMesero = async (numero: number, meseroId: string) => {
    try {
      const { data } = await apiClient.patch(`/mesas/${numero}/mesero`, {
        mesero_id: meseroId ? Number(meseroId) : null,
      });

      const actualizadas = mesas.map((m) =>
        m.numero === numero ? { ...m, mesero: data.mesero ?? null } : m,
      );
      setMesas(actualizadas);
      fijar('mesas', actualizadas);

      showToast(
        data.mesero
          ? `Mesa ${numero}: ${data.mesero.nombre} ${data.mesero.apellido}`
          : `Mesa ${numero} sin mesero`,
      );
    } catch (e) {
      const d = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
      alertar(d?.error || d?.message || 'No se pudo asignar el mesero');
    }
  };

  const crearMesa = async () => {
    try {
      const { data } = await apiClient.post('/mesas');
      await cargarMesas();
      setMesa(data.numero);
      showToast(`Mesa ${data.numero} creada`);
    } catch (e) {
      const d = (e as { response?: { data?: { message?: string } } })?.response?.data;
      alertar(d?.message || 'No se pudo crear la mesa');
    }
  };

  /* ---------- Guardar ---------- */
  const cerrar = () => {
    setCarrito([]); setCombos([]); setExtras([]); setMesa(null); setCliente(''); setDireccion('');
    setTelefono(''); setNotas(''); setBuscar('');
    onClose();
  };

    const guardar = () => {
    if (enviando) return;
    if (tipoEntrega === 'Consumir' && !mesa) return alertar('Elige la mesa');
    if (tipoEntrega === 'Domicilio' && !direccion.trim()) return alertar('Escribe la dirección de entrega');
    if (lineas.length === 0) return alertar('Agrega al menos un producto');

    const notasFinal = [
      tipoEntrega === 'Domicilio' ? `Dirección: ${direccion.trim()}` : '',
      tipoEntrega === 'Domicilio' && telefono.trim() ? `Tel: ${telefono.trim()}` : '',
      notas.trim(),
    ].filter(Boolean).join(' · ').slice(0, 255);

    setEnviando(true);
    apiClient
      .post('/ventas', {
        carrito,
        combos: combos.length ? combos : undefined,
        adiciones: extras.length ? extras : undefined,
        metodo_pago: metodoPago,
        tipo_entrega: tipoEntrega,
        cliente_nombre: cliente.trim() || undefined,
        mesa: tipoEntrega === 'Consumir' ? mesa : undefined,
        notas: notasFinal || undefined,
      })
      .then(() => { cerrar(); onCreada?.(); })
      .catch((e) => {
        const d = (e as { response?: { data?: { error?: string; message?: string; errors?: Record<string, string[]> } } })?.response?.data;
        alertar(d?.error || d?.message || Object.values(d?.errors ?? {})[0]?.[0] || 'No se pudo registrar el pedido.');
      })
      .finally(() => setEnviando(false));
  };

  useEscape([[abierto, cerrar]]);
  if (!abierto) return null;

  return (
    <div className="modal-overlay open" style={{ zIndex: 300 }} onClick={cerrar}>
      <div className="modal-box np-modal" onClick={(e) => e.stopPropagation()}>
        <header className="np-top">
          <div>
            <h3>Nuevo pedido</h3>
            <p>
              {tipoEntrega === 'Consumir' && !mesa ? 'Elige una mesa para empezar' : `Pedido: ${etiqueta}`}
            </p>
          </div>
          <button type="button" className="np-close" onClick={cerrar} aria-label="Cerrar">×</button>
        </header>

        <div className="np-cols">
          {/* 1. Tipo de pedido y mesas */}
          <aside className="np-panel">
            <h4><b>1</b> Tipo de pedido</h4>
            <SelectOscuro className="np-select" value={tipoEntrega} onChange={(e) => setTipoEntrega(e.target.value)}>
              {TIPOS.filter((t) => !esMesero || t.v === 'Consumir').map((t) => (
                <option key={t.v} value={t.v}>{t.t}</option>
              ))}
            </SelectOscuro>

            {tipoEntrega === 'Consumir' ? (
              <>
                <h5 className="np-sub">Mesas</h5>
                {mesas.length === 0 && <p className="np-hint">Cargando mesas…</p>}
                <div className="np-scroll">
                  <div className="np-mesas">
                    {mesas.map((m) => (
                      <button
                        type="button"
                        key={m.numero}
                        className={`np-mesa ${m.estado.toLowerCase().replace(' ', '-')}${mesa === m.numero ? ' sel' : ''}`}
                        onClick={() => setMesa(m.numero)}
                      >
                        <strong>Mesa {m.numero}</strong>
                        <span className="np-pill"><i />{m.estado}</span>
                        {m.mesero && <small>Mesero: {m.mesero.nombre} {m.mesero.apellido}</small>}
                        {m.estado !== 'Libre' && <small>{money(Number(m.total) || 0)}</small>}
                      </button>
                    ))}
                    {esAdmin && (
                      <button type="button" className="np-mesa np-nueva" onClick={crearMesa}>+ Nueva mesa</button>
                    )}
                  </div>
                </div>

                {puedeAsignarMesero && mesa && (
                  <div style={{ marginTop: 12 }}>
                    <label htmlFor="np-mesero" className="np-hint">Mesero de la mesa {mesa}</label>
                    <SelectOscuro
                      id="np-mesero"
                      className="np-select"
                      value={mesas.find((m) => m.numero === mesa)?.mesero?.id ?? ''}
                      onChange={(e) => void asignarMesero(mesa, e.target.value)}
                    >
                      <option value="">Sin asignar</option>
                      {meseros.map((m) => (
                        <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
                      ))}
                    </SelectOscuro>
                  </div>
                )}
              </>
            ) : (
              <p className="np-hint" style={{ marginTop: 14 }}>
                {tipoEntrega === 'Domicilio'
                  ? 'Completa la dirección de entrega en el paso 2.'
                  : 'El cliente recoge el pedido en el local.'}
              </p>
            )}
          </aside>

          {/* 2. Información del cliente + pedido */}
          <section className="np-panel">
            <h4><b>2</b> Información del cliente</h4>
            <div className="np-scroll">
              <div className="form-group">
                <label>Cliente (opcional)</label>
                <input type="text" maxLength={150} value={cliente} onChange={(e) => setCliente(e.target.value)} />
              </div>
              {tipoEntrega === 'Domicilio' && (
                <>
                  <div className="form-group">
                    <label>Dirección *</label>
                    <input type="text" maxLength={120} value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Teléfono</label>
                    <input type="text" inputMode="numeric" maxLength={15} value={telefono}
                      onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))} />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Método de pago</label>
                <SelectOscuro value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </SelectOscuro>
              </div>
              <div className="form-group">
                <label>Notas para cocina</label>
                <input type="text" maxLength={120} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: sin tomate" />
              </div>

              {tieneCuenta && mesaActual && (
                <div className="np-previo">
                  <h5>Ya pidieron en la mesa {mesa}</h5>
                  {(mesaActual.pedidos ?? []).map((p) => (
                    <div key={p.id} className="np-previo-item">
                      <span className="np-previo-head">#{p.id} · {p.estado}</span>
                      <span>{p.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')}</span>
                    </div>
                  ))}
                  <div className="np-previo-total">
                    <span>Cuenta actual</span><b>{money(Number(mesaActual.total) || 0)}</b>
                  </div>
                </div>
              )}

              <h5 className="np-sub">{tieneCuenta ? 'Nuevo pedido para agregar' : 'Pedido'}</h5>
              {lineas.length === 0 ? (
                <p className="np-hint">Agrega productos desde el menú.</p>
              ) : (
                lineas.map((it) => (
                  <div key={`l-${it.tipo}-${it.id}`}>
                    <div className="np-line">
                      <span className="np-line-name">{it.nombre}</span>
                      <div className="np-step">
                        <button type="button" onClick={() => cambiar(it, -1)}>−</button>
                        <strong>{cantidadDe(it)}</strong>
                        <button type="button" onClick={() => cambiar(it, 1)}>+</button>
                      </div>
                      <span className="np-line-price">{money(it.precio * cantidadDe(it))}</span>
                    </div>
                    {it.tipo === 'producto' && adicionesDe(it.id).length > 0 && (
                      <div className="np-extras">
                        <small>Adicionales</small>
                        {adicionesDe(it.id).map((a) => (
                          <div key={a.id} className="np-extra">
                            <span>{a.nombre} <em>+{money(Number(a.precio) || 0)}</em></span>
                            <div className="np-step">
                              <button type="button" onClick={() => cambiarExtra(a.id, -1)} disabled={!cantExtra(a.id)}>−</button>
                              <strong>{cantExtra(a.id)}</strong>
                              <button type="button" onClick={() => cambiarExtra(a.id, 1)}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="np-bottom">
              <div className="np-total">
                <span>{tieneCuenta ? 'Total a agregar' : 'Total'}</span><b>{money(total)}</b>
              </div>
              <button type="button" className="np-finalizar" disabled={lineas.length === 0 || enviando} onClick={guardar}>
                {enviando ? 'Enviando…' : tieneCuenta ? `Agregar a la mesa ${mesa}` : 'Finalizar pedido'}
              </button>
            </div>
          </section>

          {/* 3. Productos */}
          <section className="np-panel">
            <h4><b>3</b> Productos</h4>
            <div className="np-tools">
              <input type="text" placeholder="Buscar producto por nombre..." value={buscar}
                onChange={(e) => setBuscar(e.target.value)} />
              <div className="mn-view-toggle" role="group" aria-label="Cambiar vista">
                <button type="button" className={vista === 'lista' ? 'active' : ''} onClick={() => setVista('lista')} title="Lista">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
                  </svg>
                </button>
                <button type="button" className={vista === 'tarjetas' ? 'active' : ''} onClick={() => setVista('tarjetas')} title="Tarjetas">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" />
                    <rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="np-cats">
              {categorias.map((c) => (
                <button key={c} type="button" className={c === cat ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>

            <div className={vista === 'lista' ? 'np-list' : 'np-grid'}>
              {visibles.map((it) => {
                const cant = cantidadDe(it);
                return (
                  <article key={`${it.tipo}-${it.id}`} className={`np-card${cant ? ' in' : ''}`}>
                    <div className="np-img">
                      {it.img
                        ? <img src={it.img} alt={it.nombre} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        : <span>{it.nombre.charAt(0).toUpperCase()}</span>}
                      {cant > 0 && <em className="np-badge">{cant}</em>}
                    </div>
                    <div className="np-info">
                      <strong>{it.nombre}</strong>
                      {it.tipo === 'combo' && <span className="np-tag">Combo</span>}
                      <span className="np-precio">{money(it.precio)}</span>
                    </div>
                    <div className="np-ctrl">
                      {cant === 0 ? (
                        <button type="button" className="np-add" disabled={it.agotado} onClick={() => cambiar(it, 1)}>
                          {it.agotado ? 'Agotado' : 'Agregar'}
                        </button>
                      ) : (
                        <div className="np-step">
                          <button type="button" onClick={() => cambiar(it, -1)} aria-label="Quitar uno">−</button>
                          <strong>{cant}</strong>
                          <button type="button" onClick={() => cambiar(it, 1)} aria-label="Agregar uno">+</button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
              {filtrados.length === 0 && (
                <p className="np-hint">{cargandoProd ? 'Cargando productos…' : 'No hay productos.'}</p>
              )}
            </div>

            <nav className="np-pager" aria-label="Paginación">
              {pagina > 1 && (
                <button type="button" className="np-pg" onClick={() => setPagina((p) => p - 1)}>‹ Anterior</button>
              )}
              {Array.from({ length: paginas }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === paginas || Math.abs(n - pagina) <= 1)
                .map((n, i, arr) => (
                  <span key={n} className="np-pg-wrap">
                    {i > 0 && n - arr[i - 1] > 1 && <span className="np-pg-dots">…</span>}
                    <button type="button" className={`np-pg${n === pagina ? ' on' : ''}`} onClick={() => setPagina(n)}>
                      {n}
                    </button>
                  </span>
                ))}
              {pagina < paginas && (
                <button type="button" className="np-pg" onClick={() => setPagina((p) => p + 1)}>Siguiente ›</button>
              )}
            </nav>
          </section>
        </div>
      </div>
    </div>
  );
}