import { METODOS, type Linea, type Marca, type MateriaPrima } from '../types';

interface Props {
  metodoPago: string;
  setMetodoPago: (v: string) => void;
  lineas: Linea[];
  materias: MateriaPrima[];
  marcas: Marca[];
  total: number;
  onAddLinea: () => void;
  onRemoveLinea: (i: number) => void;
  onUpdateLinea: (i: number, field: keyof Linea, value: string | number | null) => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function CompraForm({
  metodoPago, setMetodoPago, lineas, materias, marcas, total,
  onAddLinea, onRemoveLinea, onUpdateLinea, onCancel, onSave,
}: Props) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-900)' }}>Registrar Compra</h3>
      <div className="form-group">
        <label>Método de pago</label>
        <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
          {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {lineas.map((l, i) => (
        <div key={i} className="grid-lineas">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{i === 0 ? 'Insumo' : ''}</label>
            <select value={l.materia_prima_id ?? '__nuevo__'} onChange={(e) => onUpdateLinea(i, 'materia_prima_id', e.target.value === '__nuevo__' ? null : Number(e.target.value))}>
              <option value="__nuevo__">+ Nuevo insumo</option>
              {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          {l.materia_prima_id === null && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Nombre</label>
                <input value={l.nombre_nuevo} onChange={(e) => onUpdateLinea(i, 'nombre_nuevo', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Unidad</label>
                <input value={l.unidad_medida} onChange={(e) => onUpdateLinea(i, 'unidad_medida', e.target.value)} />
              </div>
            </>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Cantidad</label>
            <input type="number" value={l.cantidad} onChange={(e) => onUpdateLinea(i, 'cantidad', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Precio Unit.</label>
            <input type="number" value={l.precio_unitario} onChange={(e) => onUpdateLinea(i, 'precio_unitario', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Proveedor</label>
            <select value={l.marca_id} onChange={(e) => onUpdateLinea(i, 'marca_id', Number(e.target.value))}>
              {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          {lineas.length > 1 && (
            <button className="btn-icon btn-icon-del" onClick={() => onRemoveLinea(i)} style={{ marginBottom: 0 }}>✕</button>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <button className="btn-primary" onClick={onAddLinea} style={{ background: 'var(--surface-3)', color: 'var(--text-900)', boxShadow: 'none' }}>+ Agregar insumo</button>
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 18, color: 'var(--text-900)' }}>Total: ${total.toLocaleString()}</span>
      </div>
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <button className="btn-cancel" onClick={onCancel}>Cancelar</button>
        <button className="btn-save" onClick={onSave}>Registrar Compra</button>
      </div>
    </div>
  );
}
