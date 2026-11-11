import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { useEscape } from '../hooks/useEscape';
import { mensajeError } from '../utils/errores';
import '../styles/nuevo-pedido.css';

interface Adicion { id: number; nombre: string; precio: number | string; tipo?: string; estado?: string }
interface Producto {
  id: number;
  nombre: string;
  valor: number | string;
  img?: string | null;
  estado?: string;
  activo?: boolean;
  categoria?: string;
  adiciones?: Adicion[];
}
interface Promocion { id: number; nombre: string; precio: number | string; estado?: string }
type Item = { tipo: 'producto' | 'combo'; id: number; nombre: string; precio: number; img?: string | null; agotado?: boolean; cat: string };

interface Props {
  ventaId: number;
  numero?: number;
  onClose: () => void;
  onAgregado: (venta?: { valor_total?: number | string }) => void;
}

const money = (n: number) => `$${n.toLocaleString('es-CO')}`;
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const imgOk = (s?: string | null) => !!s && /^(https?:\/\/|data:|blob:|\/storage\/)/.test(s);
const toArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

/** El cliente agrega lo que olvidó pedir, mientras la cocina no tome el pedido. */
export default function ArreglarPedidoModal({ ventaId, numero, onClose, onAgregado }: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [cant, setCant] = useState<Record<number, number>>({});
  const [cantCombo, setCantCombo] = useState<Record<number, number>>({});
  const [extras, setExtras] = useState<{ adicion_id: number; cantidad: number }[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cat, setCat] = useState('Todos');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<'tarjetas' | 'lista'>(() => {
    try { return localStorage.getItem('arreglarPedidoVista') === 'lista' ? 'lista' : 'tarjetas'; } catch { return 'tarjetas'; }
  });

  useEscape([[true, onClose]]);

  useEffect(() => {
    try { localStorage.setItem('arreglarPedidoVista', vista); } catch { /* sin storage */ }
  }, [vista]);

  useEffect(() => {
    let vivo = true;
    // Cada petición va por separado: nadie espera a nadie
    apiClient.get('/productos')
      .then(({ data }) => { if (vivo) setProductos(toArray<Producto>(data)); })
      .catch(() => { if (vivo) setError('No se pudo cargar el menú.'); });
    apiClient.get('/promociones')
      .then(({ data }) => { if (vivo) setPromociones(toArray<Promocion>(data)); })
      .catch(() => {})
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  /* ---------- Items (productos + combos activos), igual que en Nuevo pedido ---------- */
  const todos = useMemo<Item[]>(() => [
    ...productos
      .filter((p) => p.activo !== false && p.estado !== 'Inactivo')
      .map((p) => ({
        tipo: 'producto' as const, id: p.id, nombre: p.nombre, precio: Number(p.valor) || 0,
        img: imgOk(p.img) ? p.img : null, agotado: p.estado === 'Agotado', cat: p.categoria || 'Otros',
      })),
    ...promociones.filter((p) => p.estado === 'Activa').map((p) => ({
      tipo: 'combo' as const, id: p.id, nombre: p.nombre, precio: Number(p.precio) || 0, cat: 'Combos',
    })),
  ], [productos, promociones]);

  const categorias = useMemo(() => ['Todos', ...Array.from(new Set(todos.map((i) => i.cat)))], [todos]);

  const visibles = useMemo(() => {
    const q = norm(busqueda.trim());
    return todos.filter(
      (i) => (cat === 'Todos' || i.cat === cat) && (!q || norm(i.nombre).includes(q))
    );
  }, [todos, busqueda, cat]);

  const cantidadDe = (it: Item) =>
    it.tipo === 'producto' ? cant[it.id] ?? 0 : cantCombo[it.id] ?? 0;

  const cambiar = (it: Item, d: number) => {
    if (it.tipo === 'producto') {
      setCant((prev) => {
        const n = Math.max(0, (prev[it.id] ?? 0) + d);
        const sig = { ...prev };
        if (n === 0) delete sig[it.id];
        else sig[it.id] = n;
        return sig;
      });
    } else {
      setCantCombo((prev) => {
        const n = Math.max(0, (prev[it.id] ?? 0) + d);
        const sig = { ...prev };
        if (n === 0) delete sig[it.id];
        else sig[it.id] = n;
        return sig;
      });
    }
  };

  /* ---------- Adicionales (igual que en Nuevo pedido) ---------- */
  const adicionesDe = (productoId: number) =>
    (productos.find((p) => p.id === productoId)?.adiciones ?? [])
      .filter((a) => a.tipo === 'adicion' && (!a.estado || a.estado === 'Activo'));
  const cantExtra = (id: number) => extras.find((e) => e.adicion_id === id)?.cantidad ?? 0;
  const cambiarExtra = (id: number, delta: number) =>
    setExtras((l) => {
      const cant2 = (l.find((e) => e.adicion_id === id)?.cantidad ?? 0) + delta;
      if (cant2 <= 0) return l.filter((e) => e.adicion_id !== id);
      const nuevo = Math.min(cant2, 50);
      return l.some((e) => e.adicion_id === id)
        ? l.map((e) => (e.adicion_id === id ? { ...e, cantidad: nuevo } : e))
        : [...l, { adicion_id: id, cantidad: nuevo }];
    });

  // Si quitan un producto, se van también sus adicionales
  useEffect(() => {
    setExtras((l) => l.filter((e) =>
      productos.some((p) => (cant[p.id] ?? 0) > 0 && p.adiciones?.some((a) => a.id === e.adicion_id))
    ));
  }, [cant, productos]);

  const totalExtras = extras.reduce((s, e) => {
    const a = productos.flatMap((p) => p.adiciones ?? []).find((x) => x.id === e.adicion_id);
    return s + (Number(a?.precio) || 0) * e.cantidad;
  }, 0);
  const total = todos.reduce((s, i) => s + i.precio * cantidadDe(i), 0) + totalExtras;
  const unidades =
    Object.values(cant).reduce((a, n) => a + n, 0) +
    Object.values(cantCombo).reduce((a, n) => a + n, 0);

  const enviar = async () => {
    if (unidades === 0 || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const { data } = await apiClient.post(`/ventas/${ventaId}/agregar-productos`, {
        carrito: Object.entries(cant).map(([id, cantidad]) => ({ producto_id: Number(id), cantidad })),
        combos: Object.entries(cantCombo).length
          ? Object.entries(cantCombo).map(([id, cantidad]) => ({ promocion_id: Number(id), cantidad }))
          : undefined,
        adiciones: extras.length ? extras : undefined,
      });
      onAgregado(data);
    } catch (e) {
      setError(mensajeError(e, 'No se pudo modificar el pedido.'));
      setEnviando(false);
    }
  };

  return (
    <div className="modal-overlay open" style={{ alignItems: 'center', paddingTop: 56 }} onClick={onClose}>
      <div
        className="modal-box np-modal"
        style={{ maxWidth: 620, width: '94%', height: 'auto', maxHeight: '78vh', display: 'flex', flexDirection: 'column', padding: 20, textAlign: 'left' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: '#3d2111' }}>
          Agregar al pedido{numero ? ` #${numero}` : ''}
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b5d4c' }}>
          Elige lo que olvidaste. Solo se puede mientras la cocina no haya tomado el pedido.
        </p>

        <div className="np-tools">
          <input type="text" placeholder="Buscar producto por nombre..." value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} />
          <div className="mn-view-toggle" role="group" aria-label="Cambiar vista">
            <button type="button" className={vista === 'lista' ? 'active' : ''} onClick={() => setVista('lista')} title="Vista de lista" data-tooltip="Vista de lista" aria-pressed={vista === 'lista'}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
            <button type="button" className={vista === 'tarjetas' ? 'active' : ''} onClick={() => setVista('tarjetas')} title="Vista de tarjetas" data-tooltip="Vista de tarjeta" aria-pressed={vista === 'tarjetas'}>
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

        <div className={vista === 'lista' ? 'np-list' : 'np-grid'} style={{ maxHeight: '38vh' }}>
          {cargando ? (
            <p className="np-hint">Cargando menú…</p>
          ) : visibles.length === 0 ? (
            <p className="np-hint">Sin resultados.</p>
          ) : (
            visibles.map((it) => {
              const n = cantidadDe(it);
              const adiciones = it.tipo === 'producto' ? adicionesDe(it.id) : [];
              return (
                <div key={`${it.tipo}-${it.id}`}>
                  <article className={`np-card${n ? ' in' : ''}`}>
                    <div className="np-img">
                      {it.img
                        ? <img src={it.img} alt={it.nombre} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        : <span>{it.nombre.charAt(0).toUpperCase()}</span>}
                      {n > 0 && <em className="np-badge">{n}</em>}
                    </div>
                    <div className="np-info">
                      <strong>{it.nombre}</strong>
                      {it.tipo === 'combo' && <span className="np-tag">Combo</span>}
                      <span className="np-precio">{money(it.precio)}</span>
                    </div>
                    <div className="np-ctrl">
                      {n === 0 ? (
                        <button type="button" className="np-add" disabled={it.agotado} onClick={() => cambiar(it, 1)}>
                          {it.agotado ? 'Agotado' : 'Agregar'}
                        </button>
                      ) : (
                        <div className="np-step">
                          <button type="button" onClick={() => cambiar(it, -1)} aria-label="Quitar uno">−</button>
                          <strong>{n}</strong>
                          <button type="button" onClick={() => cambiar(it, 1)} aria-label="Agregar uno">+</button>
                        </div>
                      )}
                    </div>
                  </article>
                  {n > 0 && adiciones.length > 0 && (
                    <div className="np-extras">
                      <small>Adicionales</small>
                      {adiciones.map((a) => (
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
              );
            })
          )}
        </div>

        {error && <p style={{ color: '#b3261e', fontSize: 13, margin: '10px 0 0' }}>{error}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <strong style={{ flex: 1, color: '#3d2111' }}>Se sumarán {money(total)}</strong>
          <button type="button" className="btn-cancel" onClick={onClose} disabled={enviando}>
            Cancelar
          </button>
          <button type="button" className="btn-save" onClick={enviar} disabled={unidades === 0 || enviando}>
            {enviando ? 'Guardando…' : 'Agregar al pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}
