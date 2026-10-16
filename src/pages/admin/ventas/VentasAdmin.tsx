import { useVentas } from './useVentas';
import VentaStats from './components/VentaStats';
import VentaForm from './components/VentaForm';
import VentaTabla from './components/VentaTabla';

export default function VentasAdmin() {
  const {
    items, productos, q, setQ, showForm, setShowForm,
    metodoPago, setMetodoPago, tipoEntrega, setTipoEntrega,
    productoId, setProductoId, cantidad, setCantidad,
    loading, filtered, ventasHoy, ingresosHoy, ingresosTotal,
    ivaHoy, ivaTotal, selectedProd,
    save, updateEstado, cancelar,
  } = useVentas();

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión de Ventas</h1>
          <p className="subtitulo">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva venta'}
        </button>
      </div>

      <VentaStats
        ventasHoy={ventasHoy.length}
        ingresosHoy={ingresosHoy}
        ivaHoy={ivaHoy}
        totalVentas={items.length}
        ingresosTotal={ingresosTotal}
        ivaTotal={ivaTotal}
      />

      {showForm && (
        <VentaForm
          productos={productos}
          productoId={productoId}
          setProductoId={setProductoId}
          cantidad={cantidad}
          setCantidad={setCantidad}
          metodoPago={metodoPago}
          setMetodoPago={setMetodoPago}
          tipoEntrega={tipoEntrega}
          setTipoEntrega={setTipoEntrega}
          selectedProd={selectedProd}
          onCancel={() => setShowForm(false)}
          onSave={save}
        />
      )}

      <div className="search-bar">
        <input placeholder="Buscar venta..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        <VentaTabla ventas={filtered} onEstado={updateEstado} onCancelar={cancelar} />
      )}
    </div>
  );
}
