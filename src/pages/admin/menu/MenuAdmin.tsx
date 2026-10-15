import ToastMessage from '../../../components/Toast';
import { CATEGORIAS } from './types';
import { useProductos } from './useProductos';
import ProductoTabla from './components/ProductoTabla';
import ProductoModal from './components/ProductoModal';

export default function MenuAdmin() {
  const {
    items, q, setQ, catFiltro, setCatFiltro,
    modal, setModal, form, setForm, editId,
    loading, grouped, toast,
    openNew, openEdit, guardar, del,
  } = useProductos();

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión del Menú</h1>
          <p className="subtitulo">{items.length} productos en el catálogo</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nuevo producto</button>
      </div>

      <div className="search-bar">
        <input placeholder="Buscar producto..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="filter-chips" style={{ flexBasis: '100%', marginBottom: 0 }}>
          <button className={`chip-filtro${catFiltro === 'Todas' ? ' active' : ''}`} onClick={() => setCatFiltro('Todas')}>Todas</button>
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              className={`chip-filtro${catFiltro === c ? ' active' : ''}`}
              onClick={() => setCatFiltro(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        <ProductoTabla grouped={grouped} onEdit={openEdit} onDelete={del} />
      )}

      {modal && (
        <ProductoModal
          editId={editId}
          form={form}
          setForm={setForm}
          onClose={() => setModal(false)}
          onSave={guardar}
        />
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}
