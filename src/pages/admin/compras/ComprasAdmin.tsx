import { useCompras } from './useCompras';
import CompraStats from './components/CompraStats';
import CompraForm from './components/CompraForm';
import CompraTabla from './components/CompraTabla';
import CompraDetalleModal from './components/CompraDetalleModal';

export default function ComprasAdmin() {
  const {
    items, materias, marcas, q, setQ, showForm, setShowForm,
    metodoPago, setMetodoPago, lineas, modalDetalle, setModalDetalle,
    loading, filtered, comprasMes, totalMes, totalHisto, total,
    materiaNombre, marcaNombre,
    addLinea, removeLinea, updateLinea, save, del,
  } = useCompras();

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión de Compras</h1>
          <p className="subtitulo">{items.length} compras registradas</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva compra'}
        </button>
      </div>

      <CompraStats comprasMes={comprasMes.length} totalMes={totalMes} totalHisto={totalHisto} />

      {showForm && (
        <CompraForm
          metodoPago={metodoPago}
          setMetodoPago={setMetodoPago}
          lineas={lineas}
          materias={materias}
          marcas={marcas}
          total={total}
          onAddLinea={addLinea}
          onRemoveLinea={removeLinea}
          onUpdateLinea={updateLinea}
          onCancel={() => setShowForm(false)}
          onSave={save}
        />
      )}

      <div className="search-bar">
        <input placeholder="Buscar compra..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        <CompraTabla compras={filtered} onVerDetalle={setModalDetalle} onDelete={del} />
      )}

      {modalDetalle && (
        <CompraDetalleModal
          compra={modalDetalle}
          materiaNombre={materiaNombre}
          marcaNombre={marcaNombre}
          onClose={() => setModalDetalle(null)}
        />
      )}
    </div>
  );
}
