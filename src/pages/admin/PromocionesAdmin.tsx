import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, CSSProperties } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';
import AdminLoading from '../../components/AdminLoading';
import '../../styles/nu-admin.css';
import { useEscape } from '../../hooks/useEscape';

interface Producto {
  id: number;
  nombre: string;
  valor: number | string;
  img: string | null;
  categoria: string | null;
  estado: string;
}

interface Promocion {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number | string;
  imagen: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  productos: Producto[];
}

type EstadoPromo = 'Activa' | 'Programada' | 'Inactiva' | 'Finalizada';

const TITULO_GRUPO: Record<EstadoPromo, string> = {
  Activa: 'Promociones activas',
  Programada: 'Aún no disponibles',
  Inactiva: 'Promociones inactivas',
  Finalizada: 'Promociones finalizadas',
};

const ETIQUETA: Record<EstadoPromo, string> = {
  Activa: 'Activa',
  Programada: 'Aún no disponible',
  Inactiva: 'Inactiva',
  Finalizada: 'Finalizada',
};

const emptyForm = {
  nombre: '', descripcion: '', precio: '',
  fecha_inicio: '', fecha_fin: '', estado: 'Activa',
};

const num = (v: unknown): number => Number(v) || 0;
const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const toArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : ((v as { data?: T[] })?.data ?? []);

// Solo acepta URLs de imagen utilizables (absolutas, data/blob o /storage).
const imgValida = (img: string | null | undefined): boolean =>
  !!img && /^(https?:\/\/|data:|blob:|\/storage\/)/.test(img);

const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const hoyLocal = () => aISO(new Date());

// Máximo de días hacia adelante que se permite para las fechas de la promoción
const MAX_DIAS_ADELANTE = 365;
const fechaMasDias = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return aISO(d);
};

const fechaLegible = (f?: string | null) =>
  f
    ? new Date(f.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

const estadoPromo = (p: Promocion): EstadoPromo => {
  if (p.estado === 'Inactiva') return 'Inactiva';
  if (p.estado === 'Finalizada') return 'Finalizada';
  const fin = p.fecha_fin?.slice(0, 10);
  if (fin && fin < hoyLocal()) return 'Finalizada';
  const ini = p.fecha_inicio?.slice(0, 10);
  if (ini && ini > hoyLocal()) return 'Programada';
  return 'Activa';
};

const mensajeError = (err: unknown, porDefecto: string): string => {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  const primero = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  return primero || data?.message || porDefecto;
};

function CardImg({ img, nombre }: { img: string | null; nombre: string }) {
  const [error, setError] = useState(false);
  if (!imgValida(img) || error) {
    return <div className="mn-card-noimg">{(nombre || '?').charAt(0).toUpperCase()}</div>;
  }
  return <img className="mn-card-img" src={img ?? ''} alt={nombre} onError={() => setError(true)} />;
}

export default function PromocionesAdmin() {
  const [promos, setPromos] = useState<Promocion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<'tarjetas' | 'lista'>(() => {
    try {
      return localStorage.getItem('promosAdminVista') === 'lista' ? 'lista' : 'tarjetas';
    } catch {
      return 'tarjetas';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('promosAdminVista', vista);
    } catch {
      /* si el navegador bloquea localStorage, no se guarda */
    }
  }, [vista]);
  const [guardando, setGuardando] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [buscarProd, setBuscarProd] = useState('');
  const [eliminar, setEliminar] = useState<Promocion | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [descuento, setDescuento] = useState('0');
  const [precioManual, setPrecioManual] = useState(false);
  const [descManual, setDescManual] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgActual, setImgActual] = useState(false);
  const [fechasOrig, setFechasOrig] = useState({ inicio: '', fin: '' });

  const fileRef = useRef<HTMLInputElement>(null);
  const { toast, showToast } = useToast();

  /* ---------- Carga de datos ---------- */
  const cargar = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        apiClient.get('/promociones'),
        apiClient.get('/productos'),
      ]);
      setPromos(toArray<Promocion>(r1.data));
      setProductos(toArray<Producto>(r2.data));
    } catch {
      showToast('No se pudieron cargar las promociones', true);
      setPromos([]);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Vista previa de la imagen elegida (y limpieza del object URL)
  useEffect(() => {
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  /* ---------- Cálculos del combo ---------- */
  const mapaProd = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const prodsSel = useMemo(
    () => seleccion.map((id) => mapaProd.get(id)).filter((p): p is Producto => !!p),
    [seleccion, mapaProd],
  );

  // Suma de lo que costaría comprar cada producto por separado
  const sumaNormal = useMemo(() => prodsSel.reduce((s, p) => s + num(p.valor), 0), [prodsSel]);
  const pct = Math.min(90, Math.max(0, num(descuento)));
  const precioSugerido = Math.round(sumaNormal * (1 - pct / 100));
  const precioForm = num(form.precio);
  const ahorroForm = sumaNormal - precioForm;

  /* ---------- Validación de fechas ---------- */
  const hoy = hoyLocal();
  const maxFecha = fechaMasDias(MAX_DIAS_ADELANTE);

  const errorFechas = useMemo(() => {
    const revisar = (v: string, original: string, nombre: string) => {
      if (!v || v === original) return ''; // al editar se permite conservar la fecha ya guardada
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${nombre} no es válida`;
      if (v < hoy) return `${nombre} no puede ser anterior a hoy`;
      if (v > maxFecha) return `${nombre} no puede pasar del ${fechaLegible(maxFecha)}`;
      return '';
    };
    const { fecha_inicio: ini, fecha_fin: fin } = form;
    return (
      revisar(ini, fechasOrig.inicio, 'La fecha de inicio') ||
      revisar(fin, fechasOrig.fin, 'La fecha fin') ||
      (ini && fin && fin < ini ? 'La fecha fin no puede ser anterior a la fecha de inicio' : '')
    );
  }, [form.fecha_inicio, form.fecha_fin, fechasOrig, hoy, maxFecha]);

  const descripcionAuto = useMemo(() => {
    if (!prodsSel.length) return '';
    const t = 'Incluye: ' + prodsSel.map((p) => p.nombre).join(' + ');
    return t.length > 255 ? t.slice(0, 254) + '…' : t;
  }, [prodsSel]);

  // Precio automático mientras el usuario no lo escriba a mano
  useEffect(() => {
    if (precioManual) return;
    setForm((f) => ({ ...f, precio: prodsSel.length ? String(precioSugerido) : '' }));
  }, [precioManual, precioSugerido, prodsSel.length]);

  // Descripción automática mientras el usuario no la escriba a mano
  useEffect(() => {
    if (descManual) return;
    setForm((f) => ({ ...f, descripcion: descripcionAuto }));
  }, [descManual, descripcionAuto]);

  /* ---------- Listado agrupado por estado ---------- */
  const grupos = useMemo(() => {
    const fil = buscar.toLowerCase().trim();
    const visibles = promos.filter(
      (p) =>
        !fil ||
        p.nombre.toLowerCase().includes(fil) ||
        (p.productos ?? []).some((x) => x.nombre.toLowerCase().includes(fil)),
    );
    const orden: EstadoPromo[] = ['Activa', 'Programada', 'Inactiva', 'Finalizada'];
    return orden
      .map((e) => [e, visibles.filter((p) => estadoPromo(p) === e)] as [EstadoPromo, Promocion[]])
      .filter(([, lista]) => lista.length > 0);
  }, [promos, buscar]);

  const activas = useMemo(() => promos.filter((p) => estadoPromo(p) === 'Activa').length, [promos]);

  const listaProd = useMemo(() => {
    const fil = buscarProd.toLowerCase().trim();
    return productos.filter(
      (p) => !fil || p.nombre.toLowerCase().includes(fil) || (p.categoria ?? '').toLowerCase().includes(fil),
    );
  }, [productos, buscarProd]);

  /* ---------- Formulario ---------- */
  const setCampo = (campo: keyof typeof emptyForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [campo]: e.target.value }));

  const toggleProd = (id: number) =>
    setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const cambiarDescuento = (e: ChangeEvent<HTMLInputElement>) => {
    setDescuento(e.target.value.replace(/\D/g, '').slice(0, 2));
    setPrecioManual(false);
  };

  const cambiarPrecio = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, precio: e.target.value.replace(/\D/g, '').slice(0, 9) }));
    setPrecioManual(true);
  };

  const cambiarDescripcion = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, descripcion: e.target.value }));
    setDescManual(true);
  };

  const elegirArchivo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setArchivo(f);
    setImgActual(false);
  };

  const limpiarFormulario = () => {
    setIntentado(false);
    setForm(emptyForm);
    setEditId(null);
    setSeleccion([]);
    setDescuento('0');
    setPrecioManual(false);
    setDescManual(false);
    setBuscarProd('');
    setArchivo(null);
    setPreview(null);
    setImgActual(false);
    setFechasOrig({ inicio: '', fin: '' });
    if (fileRef.current) fileRef.current.value = '';
    setMostrarForm(false);
  };

  const prepararEdicion = (p: Promocion) => {
    setIntentado(false);
    setEditId(p.id);
    setForm({
      nombre: p.nombre ?? '',
      descripcion: p.descripcion ?? '',
      precio: String(Math.round(num(p.precio))),
      fecha_inicio: p.fecha_inicio?.slice(0, 10) ?? '',
      fecha_fin: p.fecha_fin?.slice(0, 10) ?? '',
      estado: p.estado === 'Inactiva' ? 'Inactiva' : 'Activa',
    });
    setFechasOrig({ inicio: p.fecha_inicio?.slice(0, 10) ?? '', fin: p.fecha_fin?.slice(0, 10) ?? '' });
    setSeleccion((p.productos ?? []).map((x) => x.id));
    setDescuento('0');
    setPrecioManual(true); // conserva el precio guardado
    setDescManual(true);   // conserva la descripción guardada
    setBuscarProd('');
    setArchivo(null);
    setPreview(imgValida(p.imagen) ? p.imagen : null);
    setImgActual(!!p.imagen);
    if (fileRef.current) fileRef.current.value = '';
    setMostrarForm(false);
  };

  /* ---------- Guardar ---------- */
  const errores = {
    nombre: !form.nombre.trim(),
    productos: seleccion.length === 0,
    precio: precioForm <= 0,
    fechas: !!errorFechas,
  };

  const rojo = (malo: boolean): CSSProperties | undefined =>
    intentado && malo
      ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px rgba(192, 57, 43, 0.12)' }
      : undefined;

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setIntentado(true);
    if (!form.nombre.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (seleccion.length === 0) { showToast('Selecciona al menos un producto', true); return; }
    if (precioForm <= 0) { showToast('Ingresa un precio mayor a 0', true); return; }
    if (errorFechas) { showToast(errorFechas, true); return; }

    const fd = new FormData();
    fd.append('nombre', form.nombre.trim());
    fd.append('descripcion', form.descripcion.trim());
    fd.append('precio', String(precioForm));
    fd.append('fecha_inicio', form.fecha_inicio);
    fd.append('fecha_fin', form.fecha_fin);
    fd.append('estado', form.estado);
    seleccion.forEach((id) => fd.append('productos_ids[]', String(id)));
    if (archivo) fd.append('imagen', archivo);

    setGuardando(true);
    try {
      if (editId) {
        fd.append('_method', 'PUT');
        await apiClient.post(`/promociones/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await apiClient.post('/promociones', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      showToast(editId ? 'Promoción actualizada' : 'Promoción creada');
      limpiarFormulario();
      await cargar();
    } catch (err) {
      showToast(mensajeError(err, 'No se pudo guardar la promoción'), true);
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Eliminar ---------- */
  const confirmarEliminar = async () => {
    if (!eliminar) return;
    const p = eliminar;
    setEliminar(null);
    try {
      await apiClient.delete(`/promociones/${p.id}`);
      showToast('Promoción eliminada');
      if (editId === p.id) limpiarFormulario();
      await cargar();
    } catch (err) {
      showToast(mensajeError(err, 'No se pudo eliminar la promoción'), true);
    }
  };

  /* ---------- Formulario (panel para nueva, modal para editar) ---------- */
  const panelFormulario = (
    <div className="mn-form-panel" style={{ marginBottom: 0, border: 0, boxShadow: 'none' }}>
      <div className="mn-form-header">
        <h3>{editId ? 'Editar promoción' : 'Nueva promoción'}</h3>
      </div>

      <form onSubmit={guardar} noValidate>
        <div className="mn-form-body">
          <div className="mn-form-grid">

            {/* Columna izquierda: datos */}
            <div className="mn-form-left">
              <div className="mn-field">
                <label htmlFor="pm-nombre">Nombre <span className="mn-req">*</span></label>
                <input id="pm-nombre" style={rojo(errores.nombre)} type="text" maxLength={100} placeholder="Ej: Combo Familiar"
                  value={form.nombre} onChange={setCampo('nombre')} />
              </div>

              {/* Selector de productos */}
              <div className="mn-field">
                <label>
                  Productos del combo <span className="mn-req">*</span>
                  <span className="pm-count">{seleccion.length} {seleccion.length === 1 ? 'seleccionado' : 'seleccionados'}</span>
                </label>
                <input type="text" placeholder="Buscar producto o categoría..."
                  value={buscarProd} onChange={(e) => setBuscarProd(e.target.value)} />
                <div className="pm-picker" style={rojo(errores.productos)}>
                  {listaProd.length === 0 ? (
                    <div className="pm-picker-empty">No se encontraron productos</div>
                  ) : (
                    listaProd.map((p) => {
                      const on = seleccion.includes(p.id);
                      return (
                        <label key={p.id} className={`pm-prod${on ? ' on' : ''}`}>
                          <input type="checkbox" checked={on} onChange={() => toggleProd(p.id)} />
                          <span className="pm-prod-name">{p.nombre}</span>
                          <span className="pm-prod-cat">{p.categoria ?? ''}</span>
                          <span className="pm-prod-price">{fmt(num(p.valor))}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Precio calculado */}
              <div className="mn-row-3">
                <div className="mn-field">
                  <label>Precio normal</label>
                  <div className="pm-readonly">{fmt(sumaNormal)}</div>
                </div>
                <div className="mn-field">
                  <label htmlFor="pm-desc-pct">Descuento (%)</label>
                  <input id="pm-desc-pct" type="text" inputMode="numeric" placeholder="0"
                    value={descuento} onChange={cambiarDescuento} />
                </div>
                <div className="mn-field">
                  <label htmlFor="pm-precio">Precio del combo <span className="mn-req">*</span></label>
                  <input id="pm-precio" style={rojo(errores.precio)} type="text" inputMode="numeric" placeholder="$ 0"
                    value={form.precio ? Number(form.precio).toLocaleString('es-CO') : ''}
                    onChange={cambiarPrecio} />
                </div>
              </div>

              <div className="pm-hint">
                {seleccion.length === 0 ? (
                  'Elige los productos y el precio se calcula solo.'
                ) : precioManual ? (
                  <>
                    Precio escrito a mano.{' '}
                    <button type="button" className="pm-link" onClick={() => setPrecioManual(false)}>
                      Usar el sugerido ({fmt(precioSugerido)})
                    </button>
                  </>
                ) : (
                  'Precio calculado: suma de los productos menos el descuento.'
                )}
                {seleccion.length > 0 && ahorroForm > 0 && (
                  <strong className="pm-ok"> · El cliente ahorra {fmt(ahorroForm)}</strong>
                )}
                {seleccion.length > 0 && precioForm > 0 && ahorroForm < 0 && (
                  <strong className="pm-warn"> · Cuesta más que comprar por separado</strong>
                )}
              </div>

              <div className="mn-row-3">
                <div className="mn-field">
                  <label htmlFor="pm-ini">Fecha inicio</label>
                  <input id="pm-ini" style={rojo(errores.fechas)} type="date" value={form.fecha_inicio} min={hoy} max={maxFecha}
                    onChange={setCampo('fecha_inicio')} />
                </div>
                <div className="mn-field">
                  <label htmlFor="pm-fin">Fecha fin</label>
                  <input id="pm-fin" style={rojo(errores.fechas)} type="date" value={form.fecha_fin}
                    min={form.fecha_inicio && form.fecha_inicio > hoy ? form.fecha_inicio : hoy} max={maxFecha}
                    onChange={setCampo('fecha_fin')} />
                </div>
                <div className="mn-field">
                  <label htmlFor="pm-estado">Estado <span className="mn-req">*</span></label>
                  <select id="pm-estado" value={form.estado} onChange={setCampo('estado')}>
                    <option value="Activa">Activa</option>
                    <option value="Inactiva">Inactiva</option>
                  </select>
                </div>
              </div>

              {errorFechas && (
                <div className="pm-hint"><strong className="pm-warn">{errorFechas}</strong></div>
              )}

              <div className="mn-field">
                <label htmlFor="pm-desc">Descripción</label>
                <textarea id="pm-desc" maxLength={255} placeholder="Se llena sola al elegir los productos…"
                  value={form.descripcion} onChange={cambiarDescripcion} />
                <div className="pm-desc-bar">
                  {descManual && seleccion.length > 0 ? (
                    <button type="button" className="pm-link" onClick={() => setDescManual(false)}>
                      ↻ Generar descripción automática
                    </button>
                  ) : <span />}
                  <span className="mn-counter">{form.descripcion.length}/255</span>
                </div>
              </div>
            </div>

            {/* Columna derecha: imagen */}
            <div className="mn-form-right">
              <div className="mn-field">
                <label>Imagen de la promoción</label>
                <div className={`mn-upload${preview ? ' has-img' : ''}`} onClick={() => fileRef.current?.click()}>
                  {preview ? (
                    <img className="mn-upload-img" src={preview} alt="Vista previa" />
                  ) : (
                    <div className="mn-upload-empty">
                      <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor"
                        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      <strong>Haz clic para subir una imagen</strong>
                      <small>PNG, JPG o WEBP · máx. 4 MB</small>
                    </div>
                  )}
                </div>
                <div className="mn-upload-bar">
                  <span className="mn-upload-name">
                    {archivo ? archivo.name : imgActual ? 'Imagen actual' : 'Ningún archivo seleccionado'}
                  </span>
                  <button type="button" className="mn-btn-pick" onClick={() => fileRef.current?.click()}>
                    {preview ? 'Cambiar' : 'Seleccionar'}
                  </button>
                </div>
                <input ref={fileRef} className="mn-file-input" type="file" accept="image/*" onChange={elegirArchivo} />
              </div>
            </div>

          </div>
        </div>

        <div className="mn-form-footer">
          <button type="submit" className="mn-btn-submit" disabled={guardando}>
            {guardando ? 'Guardando…' : editId ? 'Guardar cambios' : 'Guardar Promoción'}
          </button>
          <button type="button" className="mn-btn-cancel" onClick={limpiarFormulario}>Cancelar</button>
        </div>
      </form>
    </div>
  );

  useEscape([
    [!!eliminar, () => setEliminar(null)],
    [mostrarForm || editId !== null, limpiarFormulario],
  ]);
  
  return (
    <div className="page-inner mn-page">
      <div className="page-header">
        <div>
          <h1>Combos y Promociones</h1>
          <p className="subtitulo">{activas} {activas === 1 ? 'promoción activa' : 'promociones activas'}</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => (mostrarForm ? limpiarFormulario() : setMostrarForm(true))}
        >
          {mostrarForm ? 'Cancelar' : '+ Añadir promoción'}
        </button>
      </div>

      {(mostrarForm || editId !== null) && (
        <div className="mn-modal-overlay">
          <div
            className="mn-modal-box"
            style={{ maxWidth: 980, width: '95%', maxHeight: '92vh', overflowY: 'auto', padding: 0, textAlign: 'left' }}
          >
            {panelFormulario}
          </div>
        </div>
      )}

      <div className="mn-toolbar">
        <div className="mn-search-wrap">
          <svg className="mn-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="mn-search" type="text" placeholder="Buscar por nombre de promoción o producto..."
            value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>

        <div className="mn-view-toggle" role="group" aria-label="Cambiar vista">
          <button type="button" className={vista === 'lista' ? 'active' : ''}
            onClick={() => setVista('lista')} title="Vista de lista" aria-pressed={vista === 'lista'}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
          <button type="button" className={vista === 'tarjetas' ? 'active' : ''}
            onClick={() => setVista('tarjetas')} title="Vista de tarjetas" aria-pressed={vista === 'tarjetas'}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" />
              <rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <AdminLoading texto="Cargando promociones" subtexto="Armando tus combos" />
      ) : grupos.length === 0 ? (
        <div className="mn-empty">
          No se encontraron promociones{buscar ? <> para "<strong>{buscar}</strong>"</> : ''}.
        </div>
      ) : vista === 'lista' ? (
        <div className="mn-table-wrap">
          <table className="mn-table">
            <thead>
              <tr>
                <th>Promoción</th>
                <th>Descripción</th>
                <th>Productos</th>
                <th>Vigencia</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {grupos.flatMap(([estado, lista]) => lista.map((p) => ({ p, estado }))).map(({ p, estado }) => {
                const normal = (p.productos ?? []).reduce((s, x) => s + num(x.valor), 0);
                const ahorro = normal - num(p.precio);
                return (
                  <tr key={p.id} className={estado === 'Inactiva' || estado === 'Finalizada' ? 'agotado' : ''}>
                    <td>
                      <div className="mn-table-prod">
                        <div className="mn-table-img"><CardImg img={p.imagen} nombre={p.nombre} /></div>
                        <strong>{p.nombre}</strong>
                      </div>
                    </td>
                    <td className="mn-table-desc">{p.descripcion || '—'}</td>
                    <td>
                      <div className="pm-chips" style={{ margin: 0 }}>
                        {(p.productos ?? []).map((x) => <span key={x.id} className="pm-chip">{x.nombre}</span>)}
                      </div>
                    </td>
                    <td className="pm-dates" style={{ whiteSpace: 'nowrap' }}>
                      {fechaLegible(p.fecha_inicio)}
                      {p.fecha_inicio && p.fecha_fin ? ' → ' : ''}
                      {fechaLegible(p.fecha_fin)}
                      {!p.fecha_inicio && !p.fecha_fin && '—'}
                    </td>
                    <td className="mn-table-price">
                      {fmt(num(p.precio))}
                      {ahorro > 0 && <span className="pm-old">{fmt(normal)}</span>}
                      {ahorro > 0 && <div className="pm-save">Ahorras {fmt(ahorro)}</div>}
                    </td>
                    <td><span className={`mn-card-estado mn-estado-${estado}`}>{ETIQUETA[estado]}</span></td>
                    <td>
                      <div className="mn-table-actions">
                        <button type="button" className="mn-btn-edit" onClick={() => prepararEdicion(p)}>Editar</button>
                        <button type="button" className="mn-btn-del" onClick={() => setEliminar(p)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mn-container">
          {grupos.map(([estado, lista]) => (
            <section key={estado}>
              <div className="mn-cat-header">
                <div className="mn-cat-name">{TITULO_GRUPO[estado]}</div>
                <div className="mn-cat-count">{lista.length} {lista.length === 1 ? 'promoción' : 'promociones'}</div>
              </div>
              <div className="mn-grid">
                {lista.map((p) => {
                  const normal = (p.productos ?? []).reduce((s, x) => s + num(x.valor), 0);
                  const ahorro = normal - num(p.precio);
                  return (
                    <article key={p.id} className={`mn-card${estado === 'Inactiva' || estado === 'Finalizada' ? ' agotado' : ''}`}>
                      <div className="mn-card-imgwrap"><CardImg img={p.imagen} nombre={p.nombre} /></div>
                      <div className="mn-card-body">
                        <div className="mn-card-name">{p.nombre}</div>
                        <div className="mn-card-desc">{p.descripcion || ''}</div>
                        {(p.productos ?? []).length > 0 && (
                          <div className="pm-chips">
                            {p.productos.map((x) => <span key={x.id} className="pm-chip">{x.nombre}</span>)}
                          </div>
                        )}
                        {(p.fecha_inicio || p.fecha_fin) && (
                          <div className="pm-dates">
                            {fechaLegible(p.fecha_inicio)}
                            {p.fecha_inicio && p.fecha_fin ? ' → ' : ''}
                            {fechaLegible(p.fecha_fin)}
                          </div>
                        )}
                        {estado === 'Programada' && (
                          <div className="pm-soon">Disponible desde el {fechaLegible(p.fecha_inicio)}</div>
                        )}
                        <div className="mn-card-meta">
                          <div className="mn-card-price">
                            {fmt(num(p.precio))}
                            {ahorro > 0 && <span className="pm-old">{fmt(normal)}</span>}
                          </div>
                          <span className={`mn-card-estado mn-estado-${estado}`}>{ETIQUETA[estado]}</span>
                        </div>
                        {ahorro > 0 && <div className="pm-save">Ahorras {fmt(ahorro)}</div>}
                      </div>
                      <div className="mn-card-actions">
                        <button type="button" className="mn-btn-edit" onClick={() => prepararEdicion(p)}>Editar</button>
                        <button type="button" className="mn-btn-del" onClick={() => setEliminar(p)}>Eliminar</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {eliminar && (
        <div className="mn-modal-overlay" onClick={() => setEliminar(null)}>
          <div className="mn-modal-box" onClick={(e) => e.stopPropagation()}>
            <p>¿Eliminar "{eliminar.nombre}"? Esta acción no se puede deshacer.</p>
            <div className="mn-modal-actions">
              <button type="button" className="mn-btn-cancel" onClick={() => setEliminar(null)}>Cancelar</button>
              <button type="button" className="mn-btn-confirm" onClick={confirmarEliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}