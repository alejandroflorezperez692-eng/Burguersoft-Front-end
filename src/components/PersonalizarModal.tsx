import { useState } from 'react';
import { useCart } from '../hooks/useCart';
import cenaFallback from '../assets/img/cena.png';
import { categoriaSinExtras } from '../utils/categorias';

type Adicion = { id: number; nombre: string; precio: number | string; tipo?: string };

export type ItemPersonalizar = {
  id: number | string;
  nombre: string;
  precio: number;
  imagen?: string | null;
  descripcion?: string | null;
  adiciones?: Adicion[];
  categoria?: string | null;
  esCombo?: boolean;
};

const formatCOP = (v: number) => `$${v.toLocaleString('es-CO')}`;

const SIN_EXTRAS = ['Fritos', 'Arepas', 'Bebidas Frias', 'Bebidas Calientes', 'Pizza'];

export default function PersonalizarModal({
  item,
  onClose,
}: {
  item: ItemPersonalizar;
  onClose: () => void;
}) {
  const { agregar } = useCart();
  const sinExtras = categoriaSinExtras(item.categoria);
  const [abierta, setAbierta] = useState<'quitar' | 'extras' | 'nota' | null>('quitar');
  const [sin, setSin] = useState<string[]>([]);
  const [nota, setNota] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [extras, setExtras] = useState<Record<number, number>>({});
  
  const todas = item.adiciones ?? [];
  const adiciones = todas.filter((a) => a.tipo !== 'quitar');
  const quitarBD = todas.filter((a) => a.tipo === 'quitar').map((a) => a.nombre.trim());
  const deDescripcion = (item.descripcion ?? '').split('+').map((s) => s.trim()).filter(Boolean);
  const ingredientes = item.esCombo
  ? []
  : Array.from(
      new Map([...deDescripcion, ...quitarBD].map((s) => [s.toLowerCase(), s])).values(),
    );

  const extrasSel = adiciones
    .filter((a) => (extras[a.id] ?? 0) > 0)
    .map((a) => ({ id: a.id, nombre: a.nombre, precio: Number(a.precio), cantidad: extras[a.id] }));
  const extrasUnit = extrasSel.reduce((s, e) => s + e.precio * e.cantidad, 0);
  const totalExtras = extrasSel.reduce((s, e) => s + e.cantidad, 0);
  const precioUnidad = item.precio + extrasUnit;

  const cambiarExtra = (id: number, delta: number) =>
    setExtras((prev) => ({ ...prev, [id]: Math.min(10, Math.max(0, (prev[id] ?? 0) + delta)) }));

  const confirmar = () => {
    agregar({
      id: item.id,
      nombre: item.nombre,
      precio: precioUnidad,
      imagen: item.imagen,
      sin,
      extras: extrasSel,
      nota: nota.trim(),
      cantidad,
    });
    onClose();
  };

  return (
    <div className="pers-overlay" onClick={onClose}>
      <div className="pers-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pers-header">
          <h3>{item.nombre}</h3>
          <button type="button" className="pers-cerrar" onClick={onClose} aria-label="Cerrar">
            &times;
          </button>
        </div>

        <div className="pers-main">
          <div className="pers-izq">
            <img
              className="pers-img"
              src={item.imagen || cenaFallback}
              alt={item.nombre}
              onError={(e) => {
                e.currentTarget.src = cenaFallback;
              }}
            />
            <div className="pers-precio">{formatCOP(item.precio)}</div>
            <div className="pers-nombre">{item.nombre}</div>
            {item.descripcion && <p className="pers-desc">{item.descripcion}</p>}
          </div>

          <div className="pers-der">
            {!sinExtras && ingredientes.length > 0 && (
              <div className="pers-acc">
                <button
                  type="button"
                  className="pers-acc-top"
                  onClick={() => setAbierta(abierta === 'quitar' ? null : 'quitar')}
                >
                  <div>
                    <strong>Quitar ingredientes</strong>
                    <small>Puede seleccionar hasta {ingredientes.length} opciones</small>
                  </div>
                  <span className="pers-acc-der">
                    <span className="pers-tag">
                      {sin.length > 0 ? `${sin.length}/${ingredientes.length}` : 'Opcional'}
                    </span>
                    <span className={`pers-chev${abierta === 'quitar' ? ' abierta' : ''}`}>▾</span>
                  </span>
                </button>
                {abierta === 'quitar' && (
                  <div className="pers-acc-body">
                    {ingredientes.map((ing) => (
                      <label key={ing} className="pers-check">
                        <input
                          type="checkbox"
                          checked={sin.includes(ing)}
                          onChange={() =>
                            setSin((s) => (s.includes(ing) ? s.filter((x) => x !== ing) : [...s, ing]))
                          }
                        />
                        Sin {ing}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!sinExtras && adiciones.length > 0 && (
              <div className="pers-acc">
                <button
                  type="button"
                  className="pers-acc-top"
                  onClick={() => setAbierta(abierta === 'extras' ? null : 'extras')}
                >
                  <div>
                    <strong>Adiciones</strong>
                    <small>Agrega extras a tu pedido</small>
                  </div>
                  <span className="pers-acc-der">
                    <span className="pers-tag">{totalExtras > 0 ? `${totalExtras} elegidas` : 'Opcional'}</span>
                    <span className={`pers-chev${abierta === 'extras' ? ' abierta' : ''}`}>▾</span>
                  </span>
                </button>
                {abierta === 'extras' && (
                  <div className="pers-acc-body">
                    {adiciones.map((a) => (
                      <div key={a.id} className="pers-extra">
                        <div>
                          {a.nombre}
                          <small>+ {formatCOP(Number(a.precio))}</small>
                        </div>
                        <div className="pers-mini">
                          <button type="button" aria-label={`Quitar ${a.nombre}`} onClick={() => cambiarExtra(a.id, -1)}>−</button>
                          <span>{extras[a.id] ?? 0}</span>
                          <button type="button" aria-label={`Agregar ${a.nombre}`} onClick={() => cambiarExtra(a.id, 1)}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!sinExtras && (
            <div className="pers-acc">
              <button
                type="button"
                className="pers-acc-top"
                onClick={() => setAbierta(abierta === 'nota' ? null : 'nota')}
              >
                <div>
                  <strong>Comentarios</strong>
                  <small>Cuéntale a cocina lo que necesitas</small>
                </div>
                <span className="pers-acc-der">
                  <span className="pers-tag">{nota.trim() ? 'Listo' : 'Opcional'}</span>
                  <span className={`pers-chev${abierta === 'nota' ? ' abierta' : ''}`}>▾</span>
                </span>
              </button>
              {abierta === 'nota' && (
                <div className="pers-acc-body">
                  <textarea
                    className="pers-nota"
                    maxLength={60}
                    placeholder="Ej: bien cocida, sin picar..."
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                  />
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        <div className="pers-pie">
          <div className="pers-qty">
            <button type="button" aria-label="Quitar una unidad" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
            <span>{cantidad}</span>
            <button type="button" aria-label="Agregar una unidad" onClick={() => setCantidad((c) => Math.min(20, c + 1))}>+</button>
          </div>
          <button type="button" className="pers-ok" onClick={confirmar}>
            <span>Agregar</span>
            <span>{formatCOP(precioUnidad * cantidad)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}