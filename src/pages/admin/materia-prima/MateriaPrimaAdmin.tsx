import ToastMessage from '../../../components/Toast';
import { FILTROS } from './types';
import { useMaterias } from './useMaterias';
import MateriaStats from './components/MateriaStats';
import MateriaTabla from './components/MateriaTabla';
import MateriaModal from './components/MateriaModal';

export default function MateriaPrimaAdmin() {
  const {
    marcas, q, setQ, filtro, setFiltro,
    modal, setModal, form, setForm, editId,
    loading, filtered, total, disponibles, agotados, valorInv, toast,
    marcaNombre, openNew, openEdit, guardar, del,
  } = useMaterias();

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Materia Prima</h1>
          <p className="subtitulo">Control de inventario de insumos</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nueva materia prima</button>
      </div>

      <MateriaStats total={total} disponibles={disponibles} agotados={agotados} valorInv={valorInv} />

      <div className="search-bar">
        <input placeholder="Buscar insumo..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="filter-chips" style={{ flexBasis: '100%', marginBottom: 0 }}>
          {FILTROS.map((f) => (
            <button
              key={f.key}
              className={`chip-filtro${filtro === f.key ? ' active' : ''}`}
              onClick={() => setFiltro(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        <MateriaTabla materias={filtered} marcaNombre={marcaNombre} onEdit={openEdit} onDelete={del} />
      )}

      {modal && (
        <MateriaModal
          editId={editId}
          form={form}
          setForm={setForm}
          marcas={marcas}
          onClose={() => setModal(false)}
          onSave={guardar}
        />
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}
