import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../components/Toast';
import AdminLoading from '../../components/AdminLoading';
import '../../styles/nu-admin.css';

type Estado = 'Disponible' | 'Agotado' | 'Por agotarse';

interface Producto {
  id: number;
  nombre: string;
  valor: number | string;
  descripcion: string | null;
  img: string | null;
  cantidad: number | string | null;
  categoria: string;
  estado: Estado;
}


const CATEGORIAS = [
  'Hamburguesa', 'Perros Caliente', 'Salchipapa', 'Fritos',
  'Arepas', 'Picada', 'Bebidas Frias', 'Bebidas Calientes', 'Pizza',
];

const emptyForm = { nombre: '', valor: '', estado: '', categoria: '', descripcion: '' };

const calcularEstado = (cantidad: number | string | null | undefined): Estado => {
  const n = parseInt(String(cantidad ?? ''), 10) || 0;
  if (n === 0) return 'Agotado';
  if (n <= 5) return 'Por agotarse';
  return 'Disponible';
};

const estadoClase = (e: Estado) => `mn-estado-${e.replace(/ /g, '_')}`;


const mensajeError = (err: unknown, porDefecto: string): string => {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  const primero = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  const msg = primero || data?.message || porDefecto;
  if (/23503|foreign key|sale_details|llave for[aá]nea/i.test(msg)) {
    return 'No se puede eliminar porque tiene ventas registradas. Edítalo y cambia su estado a Agotado.';
  }
  return msg;
};

// Solo acepta URLs de imagen utilizables (absolutas, data/blob o /storage).
// Los valores legacy tipo "../uploads/..." nunca resuelven y solo generan ruido 404.
const imgValida = (img: string | null | undefined): boolean =>
  !!img && /^(https?:\/\/|data:|blob:|\/storage\/)/.test(img);

function CardImg({ img, nombre }: { img: string | null; nombre: string }) {
  const [error, setError] = useState(false);
  if (!imgValida(img) || error) {
    return <div className="mn-card-noimg">{(nombre || '?').charAt(0).toUpperCase()}</div>;
  }
  return <img className="mn-card-img" src={img ?? ''} alt={nombre} onError={() => setError(true)} />;
}

export default function MenuAdmin() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [eliminar, setEliminar] = useState<Producto | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgActual, setImgActual] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
 

  /* ---------- Carga de datos ---------- */
  const cargarProductos = useCallback(async () => {
    try {
      const r = await apiClient.get<Producto[]>('/productos');
      setProductos(Array.isArray(r.data) ? r.data : []);
    } catch {
      showToast('Error al cargar productos', true);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  cargarProductos();
}, [cargarProductos]);

  // Vista previa de la imagen elegida (y limpieza del object URL)
  useEffect(() => {
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  /* ---------- Catálogo agrupado ---------- */
  const grupos = useMemo(() => {
    const fil = buscar.toLowerCase().trim();
    const visibles = productos.filter(
      (p) => !fil || p.nombre.toLowerCase().includes(fil) || (p.categoria ?? '').toLowerCase().includes(fil),
    );
    const res: [string, Producto[]][] = [];
    CATEGORIAS.forEach((cat) => {
      const lista = visibles.filter((p) => p.categoria === cat);
      if (lista.length) res.push([cat, lista]);
    });
    const otras = visibles.filter((p) => !CATEGORIAS.includes(p.categoria));
    if (otras.length) res.push(['Otras', otras]);
    return res;
  }, [productos, buscar]);

  /* ---------- Formulario ---------- */
  const setCampo = (campo: keyof typeof emptyForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [campo]: e.target.value }));

  const elegirArchivo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setArchivo(f);
    setImgActual(false);
  };

  const limpiarFormulario = () => {
    setForm(emptyForm);
    setEditId(null);
    setArchivo(null);
    setPreview(null);
    setImgActual(false);
    if (fileRef.current) fileRef.current.value = '';
    setMostrarForm(false); 
  };

  const prepararEdicion = (p: Producto) => {
    setEditId(p.id);
    setForm({
      nombre: p.nombre,
      valor: String(Math.round(Number(p.valor))),
      estado: p.estado === 'Agotado' ? 'Agotado' : 'Disponible',
      categoria: p.categoria,
      descripcion: p.descripcion ?? '',
    });
    setArchivo(null);
    setPreview(imgValida(p.img) ? p.img : null);
    setImgActual(!!p.img);
    if (fileRef.current) fileRef.current.value = '';
    setMostrarForm(false);
  };

  /* ---------- Guardar ---------- */
  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (form.valor === '' || Number(form.valor) <= 0) { showToast('Ingresa un precio mayor a 0', true); return; }
    if (!form.categoria) { showToast('Selecciona una categoría', true); return; }
    if (!form.estado) { showToast('Selecciona un estado', true); return; }
    if (!form.descripcion.trim()) { showToast('La descripción es obligatoria', true); return; }
    if (!editId && !archivo) { showToast('La imagen es obligatoria', true); return; }

    const fd = new FormData();
    fd.append('nombre', form.nombre.trim());
    fd.append('valor', form.valor);
    fd.append('descripcion', form.descripcion.trim());
    fd.append('categoria', form.categoria);
    fd.append('estado', form.estado);
    if (archivo) fd.append('imagen', archivo);

    setGuardando(true);
    try {
      if (editId) {
        fd.append('_method', 'PUT');
        await apiClient.post(`/productos/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await apiClient.post('/productos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      showToast(editId ? 'Producto actualizado' : 'Producto agregado');
      limpiarFormulario();
      await cargarProductos();
    } catch (err) {
      showToast(mensajeError(err, 'Error al guardar el producto'), true);
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
      await apiClient.delete(`/productos/${p.id}`);
      showToast('Producto eliminado');
      if (editId === p.id) limpiarFormulario();
      await cargarProductos();
    } catch (err) {
      showToast(mensajeError(err, 'No se pudo eliminar el producto'), true);
    }
  };

  /* ---------- Formulario (panel para nuevo, modal para editar) ---------- */
  const panelFormulario = (
        <div className="mn-form-panel" ref={panelRef} style={editId !== null ? { marginBottom: 0, border: 0, boxShadow: 'none' } : undefined}>
          <div className="mn-form-header">
            <h3>{editId ? 'Editar producto' : 'Nuevo producto'}</h3>
          </div>

          <form onSubmit={guardar} noValidate>
          <div className="mn-form-body">
            <div className="mn-form-grid">

              {/* Columna izquierda: datos */}
              <div className="mn-form-left">
                <div className="mn-field">
                  <label htmlFor="mn-nombre">Nombre <span className="mn-req">*</span></label>
                  <input id="mn-nombre" type="text" maxLength={40} placeholder="Ej: Hamburguesa Especial"
                    value={form.nombre} onChange={setCampo('nombre')} />
                </div>

                <div className="mn-row-3">
                  <div className="mn-field">
                    <label htmlFor="mn-precio">Precio <span className="mn-req">*</span></label>
                    <input id="mn-precio" type="text" inputMode="numeric" placeholder="$ 0"
                      value={form.valor ? Number(form.valor).toLocaleString('es-CO') : ''}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, valor: e.target.value.replace(/\D/g, '').slice(0, 9) }))
                      } />
                  </div>
                  <div className="mn-field">
                    <label htmlFor="mn-categoria">Categoría <span className="mn-req">*</span></label>
                    <select id="mn-categoria" value={form.categoria} onChange={setCampo('categoria')}>
                      <option value="">Selecciona...</option>
                      {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="mn-field">
                    <label htmlFor="mn-estado">Estado <span className="mn-req">*</span></label>
                    <select
                      id="mn-estado"
                      className={form.estado ? `est-${form.estado}` : ''}
                      value={form.estado}
                      onChange={setCampo('estado')}
                    >
                      <option value="">Selecciona...</option>
                      <option value="Disponible">Disponible</option>
                      <option value="Agotado">Agotado</option>
                    </select>
                  </div>
                </div>

                <div className="mn-field">
                  <label htmlFor="mn-desc">Descripción <span className="mn-req">*</span></label>
                  <textarea id="mn-desc" maxLength={255} placeholder="Ej: Carne 150g, queso, tocineta…"
                    value={form.descripcion} onChange={setCampo('descripcion')} />
                  <span className="mn-counter">{form.descripcion.length}/255</span>
                </div>
              </div>

              {/* Columna derecha: imagen */}
              <div className="mn-form-right">
                <div className="mn-field">
                  <label>Imagen del producto {!editId && <span className="mn-req">*</span>}</label>
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
              {guardando ? 'Guardando…' : editId ? 'Guardar cambios' : 'Guardar Producto'}
            </button>
            {editId && (
              <button type="button" className="mn-btn-cancel" onClick={limpiarFormulario}>Cancelar</button>
            )}
          </div>
        </form>
        </div>
  );

  /* ---------- Render ---------- */
  return (
    <div className="page-inner mn-page">
      <div className="page-header">
        <div>
          <h1>Gestión del Menú</h1>
          <p className="subtitulo">Productos disponibles en el menú</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => (mostrarForm ? limpiarFormulario() : setMostrarForm(true))}
        >
          {mostrarForm ? 'Cancelar' : '+ Agregar producto'}
        </button>
      </div>

      {mostrarForm && editId === null && panelFormulario}

      {editId !== null && (
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
          <input className="mn-search" type="text" placeholder="Buscar por nombre o categoría..."
            value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <AdminLoading texto="Cargando menú" subtexto="Preparando tus productos" />
      ) : grupos.length === 0 ? (
        <div className="mn-empty">
          No se encontraron productos{buscar ? <> para "<strong>{buscar}</strong>"</> : ''}.
        </div>
      ) : (
        <div className="mn-container">
          {grupos.map(([cat, lista]) => (
            <section key={cat}>
              <div className="mn-cat-header">
                <div className="mn-cat-name">{cat}</div>
                <div className="mn-cat-count">{lista.length} {lista.length === 1 ? 'producto' : 'productos'}</div>
              </div>
              <div className="mn-grid">
                {lista.map((p) => {
                  const est = p.estado ?? calcularEstado(p.cantidad);
                  return (
                    <article key={p.id} className={`mn-card${est === 'Agotado' ? ' agotado' : ''}`}>
                      <div className="mn-card-imgwrap"><CardImg img={p.img} nombre={p.nombre} /></div>
                      <div className="mn-card-body">
                        <div className="mn-card-name">{p.nombre}</div>
                        <div className="mn-card-desc">{p.descripcion || ''}</div>
                        <div className="mn-card-meta">
                          <div className="mn-card-price">${Number(p.valor).toLocaleString('es-CO')}</div>
                          <span className={`mn-card-estado ${estadoClase(est)}`}>{est}</span>
                        </div>
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
    </div>
  );
}