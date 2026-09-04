import { CATEGORIAS, type ProductoForm } from '../types';

interface Props {
  editId: number | null;
  form: ProductoForm;
  setForm: (f: ProductoForm) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function ProductoModal({ editId, form, setForm, onClose, onSave }: Props) {
  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{editId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
        <div className="form-group">
          <label>Nombre</label>
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Hamburguesa Criolla" />
        </div>
        <div className="form-group">
          <label>Precio</label>
          <input type="number" min={0} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Imagen (URL)</label>
          <input value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder="https://..." />
          <div className="logo-preview-wrap">
            {form.img ? (
              <img src={form.img} alt="Vista previa" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span style={{ color: 'var(--text-400)', fontSize: 12 }}>Sin imagen</span>
            )}
          </div>
        </div>
        <div className="form-group">
          <label>Descripción</label>
          <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Cantidad</label>
          <input type="number" min={0} value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Categoría</label>
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Estado</label>
          <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
            <option value="Disponible">Disponible</option>
            <option value="Agotado">Agotado</option>
            <option value="Por agotarse">Por agotarse</option>
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
