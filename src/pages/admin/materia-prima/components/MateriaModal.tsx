import type { Marca, MateriaForm } from '../types';

interface Props {
  editId: number | null;
  form: MateriaForm;
  setForm: (f: MateriaForm) => void;
  marcas: Marca[];
  onClose: () => void;
  onSave: () => void;
}

export default function MateriaModal({ editId, form, setForm, marcas, onClose, onSave }: Props) {
  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{editId ? 'Editar Materia Prima' : 'Nueva Materia Prima'}</h2>
        <div className="form-group">
          <label>Nombre</label>
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Harina" />
        </div>
        <div className="form-group">
          <label>Tipo</label>
          <input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="Ej. Básico / Carnes / Bebidas" />
        </div>
        <div className="form-group">
          <label>Valor unitario</label>
          <input type="number" min={0} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Stock</label>
          <input type="number" min={0} value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Unidad de medida</label>
          <input value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} placeholder="Ej. kg, L, Unidades" />
        </div>
        <div className="form-group">
          <label>Marca</label>
          <select value={form.marca_id} onChange={(e) => setForm({ ...form, marca_id: Number(e.target.value) })}>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Estado</label>
          <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={onSave}>{editId ? 'Actualizar' : 'Crear'}</button>
        </div>
      </div>
    </div>
  );
}
