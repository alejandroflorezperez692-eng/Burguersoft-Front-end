import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';
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

interface MateriaPrima {
  id: number;
  nombre: string;
  cantidad: number | string;
  unidad_medida: string | null;
}

interface Ingrediente {
  id: number | null; // null = aún no guardado (producto nuevo)
  materia_id: number;
  nombre: string;
  cantidad: number;
}

const CATEGORIAS = [
  'Hamburguesa', 'Perros Caliente', 'Salchipapa', 'Fritos',
  'Arepas', 'Picada', 'Bebidas Frias', 'Bebidas Calientes', 'Pizza',
];

const emptyForm = { nombre: '', valor: '', cantidad: '', categoria: '', descripcion: '' };

const calcularEstado = (cantidad: number | string | null | undefined): Estado => {
  const n = parseInt(String(cantidad ?? ''), 10) || 0;
  if (n === 0) return 'Agotado';
  if (n <= 5) return 'Por agotarse';
  return 'Disponible';
};

const estadoClase = (e: Estado) => `mn-estado-${e.replace(/ /g, '_')}`;

// Muestra el primer error de validación de Laravel si lo hay.
const mensajeError = (err: unknown, porDefecto: string): string => {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  const primero = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  return primero || data?.message || porDefecto;
};

function CardImg({ img, nombre }: { img: string | null; nombre: string }) {
  const [error, setError] = useState(false);
  if (!img || error) {
    return <div className="mn-card-noimg">{(nombre || '?').charAt(0).toUpperCase()}</div>;
  }
  return <img className="mn-card-img" src={img} alt={nombre} onError={() => setError(true)} />;
}

export default function MenuAdmin() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [materias, setMaterias] = useState<MateriaPrima[]>([]);
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
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [ingMateria, setIngMateria] = useState('');
  const [ingCantidad, setIngCantidad] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast, showToast } = useToast();

  const estado = calcularEstado(form.cantidad);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarMaterias = useCallback(async () => {
    try {
      const r = await apiClient.get<MateriaPrima[]>('/materias-primas');
      setMaterias(Array.isArray(r.data) ? r.data : []);
    } catch {
      showToast('Error al cargar materias primas', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargarProductos();
    cargarMaterias();
  }, [cargarProductos, cargarMaterias]);

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

  const soloEnteros = (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, cantidad: e.target.value.replace(/\D/g, '') }));

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
    setIngredientes([]);
    setIngMateria('');
    setIngCantidad('');
    if (fileRef.current) fileRef.current.value = '';
    setMostrarForm(false); 
  };

  const cargarReceta = async (productoId: number) => {
    try {
      const r = await apiClient.get<{ id: number; materia_id: number; cantidad_usada: number | string; nombre_materia: string }[]>(
        `/productos/${productoId}/receta`,
      );
      setIngredientes(
        r.data.map((d) => ({
          id: d.id,
          materia_id: d.materia_id,
          nombre: d.nombre_materia,
          cantidad: Number(d.cantidad_usada),
        })),
      );
    } catch {
      showToast('Error al cargar ingredientes', true);
    }
  };

  const prepararEdicion = (p: Producto) => {
    setEditId(p.id);
    setForm({
      nombre: p.nombre,
      valor: String(Number(p.valor)),
      cantidad: String(p.cantidad ?? '0'),
      categoria: p.categoria,
      descripcion: p.descripcion ?? '',
    });
    setArchivo(null);
    setPreview(p.img || null);
    setImgActual(!!p.img);
    if (fileRef.current) fileRef.current.value = '';
    setIngredientes([]);
    cargarReceta(p.id);
    setMostrarForm(true);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  /* ---------- Ingredientes ---------- */
  const agregarIngrediente = async () => {
    const materia = materias.find((m) => m.id === Number(ingMateria));
    const cantidad = parseFloat(ingCantidad);
    if (!materia) { showToast('Selecciona una materia prima', true); return; }
    if (!cantidad || cantidad <= 0) { showToast('Ingresa una cantidad válida', true); return; }

    if (editId) {
      try {
        await apiClient.post(`/productos/${editId}/receta`, { materia_id: materia.id, cantidad_usada: cantidad });
        showToast('Ingrediente agregado');
        await cargarReceta(editId);
      } catch (err) {
        showToast(mensajeError(err, 'No se pudo agregar el ingrediente'), true);
        return;
      }
    } else {
      setIngredientes((l) => [...l, { id: null, materia_id: materia.id, nombre: materia.nombre, cantidad }]);
      showToast('Ingrediente agregado');
    }
    setIngMateria('');
    setIngCantidad('');
  };

  const quitarIngrediente = async (ing: Ingrediente, idx: number) => {
    if (ing.id === null) {
      setIngredientes((l) => l.filter((_, i) => i !== idx));
      return;
    }
    try {
      await apiClient.delete(`/recetas/${ing.id}`);
      showToast('Ingrediente eliminado');
      if (editId) await cargarReceta(editId);
    } catch {
      showToast('No se pudo eliminar', true);
    }
  };

  /* ---------- Guardar ---------- */
  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (form.valor === '' || Number(form.valor) < 0) { showToast('Ingresa un precio válido', true); return; }
    if (!form.categoria) { showToast('Selecciona una categoría', true); return; }
    if (!editId && !archivo) { showToast('La imagen es obligatoria para un producto nuevo', true); return; }

    const fd = new FormData();
    fd.append('nombre', form.nombre.trim());
    fd.append('valor', form.valor);
    fd.append('descripcion', form.descripcion.trim());
    fd.append('categoria', form.categoria);
    fd.append('cantidad', form.cantidad || '0');
    if (archivo) fd.append('imagen', archivo);

    setGuardando(true);
    try {
      let productoId = editId;
      if (editId) {
        fd.append('_method', 'PUT'); // PHP no lee multipart en PUT real
        await apiClient.post(`/productos/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        const r = await apiClient.post<{ id: number }>('/productos', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        productoId = r.data.id;
        // Los ingredientes elegidos antes de guardar se envían ahora que existe el id
        for (const ing of ingredientes) {
          await apiClient.post(`/productos/${productoId}/receta`, {
            materia_id: ing.materia_id,
            cantidad_usada: ing.cantidad,
          });
        }
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
          {mostrarForm ? '✕ Cerrar' : '+ Agregar producto'}
        </button>
      </div>

      {mostrarForm && (
        <div className="mn-form-panel" ref={panelRef}>
          <div className="mn-form-header">
            <h3>{editId ? 'Editar producto' : 'Nuevo producto'}</h3>
          </div>

          <form onSubmit={guardar} noValidate>
          <div className="mn-form-body">
            <div className="mn-row-main">
              <div className="mn-field">
                <label htmlFor="mn-nombre">Nombre *</label>
                <input id="mn-nombre" type="text" maxLength={40} placeholder="Ej: Hamburguesa Especial"
                  value={form.nombre} onChange={setCampo('nombre')} />
              </div>
              <div className="mn-field">
                <label htmlFor="mn-precio">Precio *</label>
                <input id="mn-precio" type="number" min={0} placeholder="12000"
                  value={form.valor} onChange={setCampo('valor')} />
              </div>
              <div className="mn-field">
                <label htmlFor="mn-cantidad">Cantidad</label>
                <input id="mn-cantidad" type="text" inputMode="numeric" placeholder="Ej: 10"
                  value={form.cantidad} onChange={soloEnteros} />
              </div>
              <div className="mn-field">
                <label htmlFor="mn-categoria">Categoría *</label>
                <select id="mn-categoria" value={form.categoria} onChange={setCampo('categoria')}>
                  <option value="">Selecciona...</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="mn-field">
                <label>Estado</label>
                <span className={`mn-estado-chip ${estadoClase(estado)}`}>{estado}</span>
              </div>
            </div>

            <div className="mn-row-secondary">
              <div className="mn-field">
                <label htmlFor="mn-desc">Descripción</label>
                <textarea id="mn-desc" maxLength={255} placeholder="Ej: Carne 150g, queso, tocineta…"
                  value={form.descripcion} onChange={setCampo('descripcion')} />
              </div>

              <div className="mn-field">
                <label>Imagen del producto</label>
                <div className={`mn-upload${preview ? ' has-img' : ''}`} onClick={() => fileRef.current?.click()}>
                  {preview ? <img className="mn-thumb" src={preview} alt="Vista previa" /> : <div className="mn-thumb-empty" />}
                  <div className="mn-upload-info">
                    <div className="mn-upload-name">
                      {archivo ? archivo.name : imgActual ? 'Imagen actual cargada' : 'Ningún archivo seleccionado'}
                    </div>
                    <div className="mn-upload-hint">Al editar, se conserva la imagen actual si no cambias.</div>
                    <button type="button" className="mn-btn-pick"
                      onClick={(ev) => { ev.stopPropagation(); fileRef.current?.click(); }}>
                      Seleccionar
                    </button>
                  </div>
                </div>
                <input ref={fileRef} className="mn-file-input" type="file" accept="image/*" onChange={elegirArchivo} />
              </div>

              <div className="mn-field">
                <label>Ingredientes</label>
                <div className="mn-ing">
                  <div className="mn-ing-row">
                    <select value={ingMateria} onChange={(e) => setIngMateria(e.target.value)}>
                      <option value="">Seleccionar materia prima…</option>
                      {materias.map((m) => (
                        <option key={m.id} value={m.id}>{m.nombre} ({m.cantidad} {m.unidad_medida || ''})</option>
                      ))}
                    </select>
                    <input type="number" min={0.01} step={0.01} placeholder="Cant."
                      value={ingCantidad} onChange={(e) => setIngCantidad(e.target.value)} />
                    <button type="button" className="mn-btn-add" onClick={agregarIngrediente}>+</button>
                  </div>
                  <ul className="mn-ing-list">
                    {ingredientes.length === 0 ? (
                      <li className="mn-ing-empty">Sin ingredientes asignados.</li>
                    ) : (
                      ingredientes.map((ing, idx) => (
                        <li key={`${ing.id ?? 'n'}-${idx}`}>
                          <span>{ing.nombre} — <strong>{ing.cantidad}</strong></span>
                          <button type="button" className="mn-btn-del-ing" aria-label={`Quitar ${ing.nombre}`}
                            onClick={() => quitarIngrediente(ing, idx)}>✕</button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mn-form-footer">
            <button type="submit" className="mn-btn-submit" disabled={guardando}>
              {guardando ? 'Guardando…' : editId ? 'Guardar cambios' : 'Guardar Producto'}
            </button>
            {editId && (
              <button type="button" className="mn-btn-cancel" onClick={limpiarFormulario}>Cancelar edición</button>
            )}
          </div>
        </form>
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
                          <span className={`mn-card-estado ${estadoClase(est)}`}>{est}: {p.cantidad ?? 0}</span>
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

      <ToastMessage toast={toast} />
    </div>
  );
}