import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import marcaFallback from '../../assets/img/marca-comercial.png';
import AdminLoading from '../../components/AdminLoading';
import { useToast } from '../../components/Toast';
import '../../styles/nu-admin.css';
import { useEscape } from '../../hooks/useEscape';

interface Marca {
  id: number;
  nombre: string;
  img: string;
  telefono: string;
  correo: string;
  nit: string;
}

const empty: Omit<Marca, 'id'> = {
  nombre: '',
  img: '',
  telefono: '',
  correo: '',
  nit: '',
};

export default function MarcasAdmin() {
  const [items, setItems] = useState<Marca[]>([]);
  
  // Filtro de búsqueda de texto (Develop)
  const [q, setQ] = useState('');
  
  // Filtros avanzados (Carlos)
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroInicial, setFiltroInicial] = useState('');
  const [filtroLogo, setFiltroLogo] = useState('');

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<Marca | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [vista, setVista] = useState<'tarjetas' | 'lista'>(() => {
    try {
      return localStorage.getItem('marcasAdminVista') === 'lista' ? 'lista' : 'tarjetas';
    } catch {
      return 'tarjetas';
    }
  });
  const [closing, setClosing] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Marca | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const { showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get<Marca[]>('/marcas');
      setItems(r.data);
    } catch {
      showToast('No se pudieron cargar los proveedores', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    try {
      localStorage.setItem('marcasAdminVista', vista);
    } catch {
      /* si el navegador bloquea localStorage, simplemente no se guarda */
    }
  }, [vista]);

  // --- Lógica de Filtros Combinada ---
  const inicialDe = (m: Marca) => (m.nombre ?? '').trim().charAt(0).toUpperCase();
  const iniciales = Array.from(new Set(items.map(inicialDe).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  const marcasOrdenadas = [...items].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'));

  const hayFiltros = q !== '' || filtroMarca !== '' || filtroInicial !== '' || filtroLogo !== '';

  const limpiarFiltros = () => {
    setQ('');
    setFiltroMarca('');
    setFiltroInicial('');
    setFiltroLogo('');
  };

  const filtered = items.filter((m) => {
    // 1. Filtro de texto general
    if (q) {
      const coincideTexto = [m.nombre, m.correo, m.telefono].some((v) => v?.toLowerCase().includes(q.toLowerCase()));
      if (!coincideTexto) return false;
    }
    // 2. Filtros avanzados
    if (filtroMarca && String(m.id) !== filtroMarca) return false;
    if (filtroInicial && inicialDe(m) !== filtroInicial) return false;
    if (filtroLogo === 'con' && !m.img) return false;
    if (filtroLogo === 'sin' && m.img) return false;
    
    return true;
  });

  const openNew = () => { setForm(empty); setEditId(null); setIntentado(false); setModal(true); };

  const openEdit = (m: Marca) => {
    setForm({
      nombre: m.nombre,
      img: m.img,
      telefono: m.telefono,
      correo: m.correo,
      nit: m.nit,
    });
    setEditId(m.id);
    setIntentado(false);
    setModal(true);
    closeDetail();
  };

  const soloNitNum = (v: string) => v.split('-')[0].replace(/[^0-9]/g, '');
  const limpiarNit = (v: string) => {
    const [base, dv] = v.replace(/[^\d-]/g, '').split('-');
    const b = base.slice(0, 9);
    return dv === undefined ? b : `${b}-${dv.slice(0, 1)}`;
  };

  const errores = {
    nombre: !form.nombre.trim(),
    img: !form.img.trim(),
    telefono: form.telefono.replace(/\D/g, '').length < 7 || form.telefono.replace(/\D/g, '').length > 10,
    correo: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim()),
    nit: !editId && ![8, 9].includes(soloNitNum(form.nit).length),
  };

  const bordeError = (malo: boolean): React.CSSProperties | undefined =>
    intentado && malo ? { borderColor: 'var(--danger)' } : undefined;

  const save = async () => {
    setIntentado(true);
    if (errores.nombre) { showToast('El nombre es obligatorio', true); return; }
    if (errores.img) { showToast('El logo (URL) es obligatorio', true); return; }
    if (errores.telefono) { showToast('Escribe un teléfono válido (entre 7 y 10 dígitos, celular o línea fija)', true); return; }
    if (errores.correo) { showToast('Escribe un correo válido', true); return; }
    if (errores.nit) { showToast('El NIT debe tener 8 o 9 dígitos (sin contar el dígito de verificación)', true); return; }
    try {
      if (editId) {
        const { nit, ...body } = form;
        await apiClient.put(`/marcas/${editId}`, { ...body, nombre: body.nombre.trim(), img: body.img.trim(), telefono: body.telefono.trim(), correo: body.correo.trim() });
        showToast('Proveedor actualizado correctamente');
      } else {
        await apiClient.post('/marcas', { ...form, nombre: form.nombre.trim(), img: form.img.trim(), telefono: form.telefono.trim(), correo: form.correo.trim(), nit: Number(soloNitNum(form.nit)) });
        showToast('Proveedor creado correctamente');
      }
      setModal(false);
      load();
    } catch {
      showToast('No se pudo guardar el proveedor', true);
    }
  };

  const pedirEliminar = (id: number) => {
    const m = items.find((x) => x.id === id);
    if (m) setConfirmDel(m);
  };

  const del = async () => {
    if (!confirmDel) return;
    setEliminando(true);

    try {
      await apiClient.delete(`/marcas/${confirmDel.id}`);
      showToast('Proveedor eliminado');
      setConfirmDel(null);
      closeDetail();
      load();
    } catch {
      showToast('No se pudo eliminar el proveedor', true);
      setConfirmDel(null);
    } finally {
      setEliminando(false);
    }
  };

  const verDetalle = (m: Marca) => { setClosing(false); setDetalle(m); };

  const closeDetail = () => {
    if (!detalle || closing) return;
    setClosing(true);
    window.setTimeout(() => { setDetalle(null); setClosing(false); }, 280);
  };

  useEscape([
    [!!confirmDel, () => { if (!eliminando) setConfirmDel(null); }],
    [modal, () => setModal(false)],
    [!!detalle, closeDetail],
  ]);

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión de Proveedores</h1>
          <p className="subtitulo">Administra los proveedores de insumos</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nuevo proveedor</button>
      </div>

      {/* Barra de herramientas superior (Develop) + Filtros (Carlos) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        
        {/* Fila 1: Búsqueda y Vista */}
        <div className="mn-toolbar" style={{ marginBottom: 0 }}>
          <div className="mn-search-wrap">
            <svg className="mn-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="mn-search"
              type="text"
              placeholder="Buscar por nombre, correo o teléfono..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
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

        {/* Fila 2: Filtros de Carlos */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 210 }}>
            <label>Marca</label>
            <select value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)}>
              <option value="">Todas las marcas</option>
              {marcasOrdenadas.map((m) => (
                <option key={m.id} value={String(m.id)}>{m.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Inicial</label>
            <select value={filtroInicial} onChange={(e) => setFiltroInicial(e.target.value)}>
              <option value="">Todas</option>
              {iniciales.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0, minWidth: 170 }}>
            <label>Logo</label>
            <select value={filtroLogo} onChange={(e) => setFiltroLogo(e.target.value)}>
              <option value="">Todos</option>
              <option value="con">Con logo</option>
              <option value="sin">Sin logo</option>
            </select>
          </div>

          {hayFiltros && (
            <button type="button" className="btn-cancel" onClick={limpiarFiltros} style={{ height: 42 }}>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="meta-bar">
        <span>{filtered.length} proveedor{filtered.length !== 1 ? 'es' : ''}</span>
      </div>

      {loading ? (
        <AdminLoading texto="Cargando proveedores" subtexto="Listando tus proveedores" />
      ) : vista === 'lista' ? (
        filtered.length === 0 ? (
          <div className="empty-state">No se encontraron proveedores</div>
        ) : (
          <div className="mn-table-wrap">
            <table className="mn-table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>NIT</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="mn-table-prod">
                        <div className="mn-table-img">
                          <img
                            src={m.img || marcaFallback}
                            alt={m.nombre}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => { (e.target as HTMLImageElement).src = marcaFallback; }}
                          />
                        </div>
                        <strong>{m.nombre}</strong>
                      </div>
                    </td>
                    <td>{m.nit || '—'}</td>
                    <td>{m.telefono || '—'}</td>
                    <td>{m.correo || '—'}</td>
                    <td>
                      <div className="mn-table-actions">
                        <button type="button" className="mn-btn-edit" onClick={() => openEdit(m)}>Editar</button>
                        <button type="button" className="mn-btn-del" onClick={() => pedirEliminar(m.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="marcas-grid">
          {filtered.map((m) => (
            <article className="marca-card" key={m.id} onClick={() => verDetalle(m)}>
              <div className="marca-img-wrap">
                <img
                  src={m.img || marcaFallback}
                  alt={m.nombre}
                  onError={(e) => { (e.target as HTMLImageElement).src = marcaFallback; }}
                />
              </div>
              <div className="marca-body">
                <div>
                  <div className="marca-nombre">{m.nombre}</div>
                  <div className="marca-id">NIT {m.nit || '—'} · ID {m.id}</div>
                </div>
              </div>
            </article>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">No se encontraron proveedores</div>
          )}
        </div>
      )}

      <div className={`detalle-overlay${detalle ? ' show' : ''}${closing ? ' closing' : ''}`} onClick={closeDetail}>
        {detalle && (
          <div className="detalle-box" onClick={(e) => e.stopPropagation()}>
            <button className="detalle-close" onClick={closeDetail} title="Cerrar">✕</button>
            <div className="detalle-content">
              <div className="detalle-nombre">{detalle.nombre}</div>
              <div className="detalle-info">
                {detalle.telefono && <p><strong>Teléfono:</strong> {detalle.telefono}</p>}
                {detalle.correo && <p><strong>Correo:</strong> {detalle.correo}</p>}
                {detalle.nit && <p><strong>NIT:</strong> {detalle.nit}</p>}
              </div>
              <span className="detalle-estado dot-activo">ID {detalle.id}</span>
              <div className="detalle-actions">
                <button className="btn-det-editar" onClick={() => openEdit(detalle)}>Editar</button>
                <button className="btn-det-eliminar" onClick={() => pedirEliminar(detalle.id)}>Eliminar</button>
              </div>
            </div>
            <div className="detalle-logo-bg" />
            <img
              className="detalle-logo-flotante"
              src={detalle.img || marcaFallback}
              alt={detalle.nombre}
              onError={(e) => { (e.target as HTMLImageElement).src = marcaFallback; }}
            />
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay open" onClick={() => setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 560, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: 'var(--text-900)', padding: '18px 28px', flexShrink: 0 }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--surface)' }}>{editId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
            </div>
            <div style={{ padding: '24px 32px 28px', overflowY: 'auto', flex: 1, minHeight: 0 }}>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Nombre <span className="mn-req">*</span></label>
              <input style={bordeError(errores.nombre)} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Postobón" />
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 14 }}>
              <div
                className="logo-preview-wrap"
                style={{ width: 84, height: 84, minHeight: 0, padding: 6, marginBottom: 0, flexShrink: 0 }}
              >
                {form.img ? (
                  <img
                    src={form.img}
                    alt="Vista previa"
                    style={{ maxHeight: 70 }}
                    onError={(e) => { (e.target as HTMLImageElement).src = marcaFallback; }}
                  />
                ) : (
                  <span style={{ color: 'var(--text-400)', fontSize: 11 }}>Sin logo</span>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label>Logo (URL) <span className="mn-req">*</span></label>
                <input style={bordeError(errores.img)} value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder="https://..." />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Teléfono <span className="mn-req">*</span></label>
                <input
                  style={bordeError(errores.telefono)}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Ej. 3001234567"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Correo <span className="mn-req">*</span></label>
                <input style={bordeError(errores.correo)} type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
              </div>
            </div>

            {!editId && (
              <div className="form-group" style={{ marginBottom: 14, maxWidth: 260 }}>
                <label>NIT <span className="mn-req">*</span></label>
                <input
                  style={bordeError(errores.nit)}
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="Ej. 830047819-9"
                  value={form.nit}
                  onChange={(e) => setForm({ ...form, nit: limpiarNit(e.target.value) })}
                />
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={save}>{editId ? 'Actualizar' : 'Crear'}</button>
            </div>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="mn-modal-overlay" style={{ zIndex: 400 }} onClick={() => !eliminando && setConfirmDel(null)}>
          <div className="mn-modal-box" onClick={(e) => e.stopPropagation()}>
            <p>
              ¿Eliminar el proveedor "{confirmDel.nombre}"? Esta acción no se puede deshacer.
            </p>
            <div className="mn-modal-actions">
              <button type="button" className="mn-btn-cancel" onClick={() => setConfirmDel(null)} disabled={eliminando}>Cancelar</button>
              <button type="button" className="mn-btn-confirm" onClick={del} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}