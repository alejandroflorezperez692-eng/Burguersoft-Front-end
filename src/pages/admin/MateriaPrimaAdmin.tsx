import { useEffect, useState } from 'react';
import type React from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../components/Toast';
import AdminLoading from '../../components/AdminLoading';
import DataTable, { type DataTableColumn } from '../../components/DataTable';
import '../../styles/nu-admin.css';
import { useEscape } from '../../hooks/useEscape';
import { mensajeError } from '../../utils/errores';
import SelectOscuro from '../../components/SelectOscuro';
import { useAuth } from '../../hooks/useAuth';
import { normalizarRol } from '../../utils/roles';

interface MateriaPrima {
  id: number;
  nombre: string;
  tipo?: string | null;
  valor: number;
  cantidad: number;
  unidad_medida?: string | null;
  marca_id: number;
  estado?: string | null;
}

interface Marca {
  id: number;
  nombre: string;
}

const UNIDADES = ['Kg', 'Gramos', 'Libras', 'Litros', 'Mililitros', 'Unidades', 'Paquetes', 'Cajas', 'Bolsas', 'Botellas', 'Latas'];

const num = (v: unknown): number => Number(v ?? 0) || 0;

type EstadoStock = 'disponible' | 'bajo' | 'agotado';

const estadoKey = (stock: unknown): EstadoStock => {
  const s = num(stock);
  return s > 10 ? 'disponible' : s > 0 ? 'bajo' : 'agotado';
};

const textoEstado = (stock: unknown) => {
  const k = estadoKey(stock);
  return k === 'disponible' ? 'Disponible' : k === 'bajo' ? 'Bajo' : 'Agotado';
};

const claseBadge = (stock: unknown) => {
  const k = estadoKey(stock);
  return k === 'agotado' ? 'badge-danger' : k === 'bajo' ? 'badge-warning' : 'badge-success';
};

const soloNumero = (v: string): string => {
  const limpio = v.replace(',', '.').replace(/[^0-9.]/g, '');
  const [ent, ...dec] = limpio.split('.');
  return dec.length ? `${ent}.${dec.join('')}` : ent;
};


const formatMiles = (v: string): string => {
  const limpio = v.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const [ent, ...dec] = limpio.split('.');
  const entFmt = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec.length ? `${entFmt},${dec.join('')}` : entFmt;
};


const milesANumero = (v: string): number =>
  Number(v.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;

const adornoBase: React.CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  color: 'var(--text-400)', fontWeight: 600, fontSize: 14, pointerEvents: 'none',
};

const emptyForm = {
  nombre: '', tipo: '', valor: '', cantidad: '', unidad_medida: '', marca_id: 1,
};

export default function MateriaPrimaAdmin() {
  const { user } = useAuth();
  const soloLectura = normalizarRol(user?.role) === 'cocinero';
  const [items, setItems] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [cantidadOriginal, setCantidadOriginal] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [cambiandoId, setCambiandoId] = useState<number | null>(null);
  const [desactivar, setDesactivar] = useState<MateriaPrima | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoStock>('todos');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');

  const { showToast } = useToast();

  const toArray = <T,>(v: unknown): T[] =>
    Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

  const load = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setErrorCarga(null);

    const [r1, r2] = await Promise.allSettled([
      apiClient.get('/materias-primas'),
      apiClient.get('/marcas'),
    ]);

    if (r1.status === 'fulfilled') {
      setItems(toArray<MateriaPrima>(r1.value.data));
    } else {
      console.error('Error al cargar materias primas:', r1.reason);
      const msg = mensajeError(r1.reason, 'No se pudieron cargar los insumos');
      setErrorCarga(msg);
      showToast(msg, true);
    }

    if (r2.status === 'fulfilled') {
      setMarcas(toArray<Marca>(r2.value.data));
    } else {
      console.error('Error al cargar marcas:', r2.reason);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const marcaNombre = (id: unknown): string =>
    (marcas ?? []).find((x) => x?.id === id)?.nombre ?? '';


  const tipos = Array.from(new Set((items ?? []).map((m) => (m?.tipo ?? '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'es'));
  const unidades = Array.from(new Set((items ?? []).map((m) => (m?.unidad_medida ?? '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'es'));

  const filtered = (items ?? []).filter((m) =>
    (filtroEstado === 'todos' || estadoKey(m?.cantidad) === filtroEstado) &&
    (!filtroTipo || (m?.tipo ?? '').trim() === filtroTipo) &&
    (!filtroMarca || m?.marca_id === Number(filtroMarca)) &&
    (!filtroUnidad || (m?.unidad_medida ?? '').trim() === filtroUnidad),
  );

  const hayFiltros =
    filtroEstado !== 'todos' || !!filtroTipo || !!filtroMarca || !!filtroUnidad;

  const limpiarFiltros = () => {
    setFiltroEstado('todos');
    setFiltroTipo('');
    setFiltroMarca('');
    setFiltroUnidad('');
  };

  const openEdit = (m: MateriaPrima) => {
    setForm({
      nombre: m?.nombre ?? '',
      tipo: m?.tipo ?? '',
      valor: m?.valor != null ? formatMiles(String(Number(m.valor)).replace('.', ',')) : '',
      cantidad: m?.cantidad != null ? String(Number(m.cantidad)) : '',
      unidad_medida: m?.unidad_medida ?? '',
      marca_id: m?.marca_id ?? marcas[0]?.id ?? 1,
    });
    setEditId(m?.id ?? null);
    setCantidadOriginal(num(m?.cantidad));
    setMotivo('');
    setIntentado(false);
    setModal(true);
  };

  const cantidadNum = Number(form.cantidad);
  const precioNum = milesANumero(form.valor);

  const errores = {
    nombre: !form.nombre.trim(),
    marca: !form.marca_id,
    cantidad: form.cantidad.trim() === '' || Number.isNaN(cantidadNum),
    precio: !(precioNum > 0),
  };

  type CampoError = keyof typeof errores;

  const listaErrores = (): { campo: CampoError; msg: string; toast: string }[] => {
    const out: { campo: CampoError; msg: string; toast: string }[] = [];
    if (errores.nombre) {
      out.push({ campo: 'nombre', msg: 'Falta el nombre del insumo', toast: 'Falta escribir el nombre del insumo' });
    }
    if (errores.cantidad) {
      const vacio = form.cantidad.trim() === '';
      out.push({
        campo: 'cantidad',
        msg: vacio ? 'Falta la cantidad' : 'La cantidad no es un número válido',
        toast: vacio ? 'Falta escribir la cantidad real del insumo' : 'La cantidad no es un número válido',
      });
    }
    if (errores.precio) {
      const vacio = form.valor.trim() === '';
      out.push({
        campo: 'precio',
        msg: vacio ? 'Falta el precio' : 'Debe ser mayor a $0',
        toast: vacio ? 'Falta escribir el precio del insumo' : 'El precio debe ser mayor a $0',
      });
    }
    if (errores.marca) {
      out.push({ campo: 'marca', msg: 'Falta elegir el proveedor', toast: 'Falta elegir el proveedor' });
    }
    return out;
  };

  const errs = listaErrores();

  const msgCampo = (campo: CampoError) => {
    const e = errs.find((x) => x.campo === campo);
    return intentado && e
      ? <small style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600, marginTop: 4, display: 'block' }}>{e.msg}</small>
      : null;
  };

  const bordeError = (malo: boolean): React.CSSProperties | undefined =>
    intentado && malo ? { borderColor: 'var(--danger)' } : undefined;

  const guardar = async () => {
    if (!editId) return;
    setIntentado(true);
    if (errs.length > 0) {
      const resto = errs.length - 1;
      showToast(
        resto === 0 ? errs[0].toast : `${errs[0].toast} (y ${resto} ${resto === 1 ? 'dato más' : 'datos más'})`,
        true,
      );
      return;
    }

    const cambioCantidad = cantidadNum !== cantidadOriginal;
    const body = {
      nombre: form.nombre.trim(),
      tipo: form.tipo.trim() || null,
      unidad_medida: form.unidad_medida.trim() || null,
      valor: precioNum,
      cantidad: cantidadNum,
      marca_id: Number(form.marca_id),
      ...(cambioCantidad ? { motivo: motivo.trim() || 'Ajuste manual de inventario' } : {}),
    };
    try {
      await apiClient.put(`/materias-primas/${editId}`, body);
      showToast('Materia prima actualizada');
      setModal(false);
      load(true);
    } catch (e) {
      console.error('Error al actualizar materia prima:', e);
      showToast(mensajeError(e, 'No se pudo actualizar'), true);
    }
  };

  const esInactivo = (m: MateriaPrima) => m?.estado === 'Inactivo';

  const alternarEstado = async (m: MateriaPrima) => {
    if (m?.id == null || cambiandoId !== null) return;
    setDesactivar(null);
    const nuevo = esInactivo(m) ? 'Activo' : 'Inactivo';
    setCambiandoId(m.id);
    try {
      await apiClient.put(`/materias-primas/${m.id}`, { estado: nuevo });
      setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, estado: nuevo } : x)));
      showToast(nuevo === 'Activo' ? 'Materia prima activada' : 'Materia prima desactivada');
    } catch (err) {
      console.error('Error al cambiar el estado de la materia prima:', err);
      showToast(mensajeError(err, 'No se pudo cambiar el estado'), true);
    } finally {
      setCambiandoId(null);
    }
  };

  useEscape([
    [!!desactivar, () => setDesactivar(null)],
    [modal, () => setModal(false)],
  ]);

  const columnas: DataTableColumn<MateriaPrima>[] = [
    {
      id: 'nombre',
      header: 'Nombre del insumo',
      accessor: (m) => m?.nombre ?? '',
      cell: (m) => <span style={{ fontWeight: 600 }}>{m?.nombre ?? 'Sin nombre'}</span>,
      width: '16%',
    },
    {
      id: 'tipo',
      header: 'Tipo',
      accessor: (m) => m?.tipo ?? '',
      cell: (m) => m?.tipo || '—',
      width: '10%',
    },
    {
      id: 'cantidad',
      header: 'Cantidad',
      accessor: (m) => num(m?.cantidad),
      cell: (m) => (
        <span style={{ fontWeight: 600 }}>
          {num(m?.cantidad).toLocaleString('es-CO')}
          {m?.unidad_medida ? (
            <span style={{ marginLeft: 8, fontWeight: 500, color: 'var(--text-400)' }}>{m.unidad_medida}</span>
          ) : null}
        </span>
      ),
      width: '12%',
    },
    {
      id: 'precioTotal',
      header: 'Precio total',
      accessor: (m) => num(m?.valor) * num(m?.cantidad),
      exportValue: (m) => `$${(num(m?.valor) * num(m?.cantidad)).toLocaleString('es-CO')}`,
      align: 'right',
      cell: (m) => (
        <span style={{ fontWeight: 700 }}>
          ${(num(m?.valor) * num(m?.cantidad)).toLocaleString('es-CO')}
        </span>
      ),
      width: '12%',
    },
    {
      id: 'disponibilidad',
      header: 'Disponibilidad',
      accessor: (m) => textoEstado(m?.cantidad),
      cell: (m) => <span className={`badge ${claseBadge(m?.cantidad)}`}>{textoEstado(m?.cantidad)}</span>,
      width: '10%',
    },
    {
      id: 'estado',
      header: 'Estado',
      accessor: (m) => (esInactivo(m) ? 'Inactivo' : 'Activo'),
      cell: (m) => (
        <span className={`badge ${esInactivo(m) ? 'badge-danger' : 'badge-success'}`}>
          {esInactivo(m) ? 'Inactivo' : 'Activo'}
        </span>
      ),
      width: '10%',
    },
    {
      id: 'proveedor',
      header: 'Proveedor',
      accessor: (m) => marcaNombre(m?.marca_id),
      cell: (m) => marcaNombre(m?.marca_id) || '—',
      width: '10%',
    },
    ...(!soloLectura
      ? [{
          id: 'acciones',
          header: 'Acciones',
          accessor: () => '',
          sortable: false,
          searchable: false,
          exportable: false,
          align: 'center' as const,
          width: '20%',
          cell: (m: MateriaPrima) => (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="mn-btn-edit" style={{ flex: 'none', padding: '7px 18px' }} onClick={() => openEdit(m)} data-tooltip="Editar">Editar</button>
              <button
                type="button"
                className={esInactivo(m) ? 'mn-btn-edit' : 'mn-btn-del'}
                style={{ flex: 'none', padding: '7px 18px' }}
                disabled={cambiandoId === m?.id}
                onClick={() => (esInactivo(m) ? alternarEstado(m) : setDesactivar(m))}
                data-tooltip={esInactivo(m) ? 'Activar' : 'Desactivar'}
              >
                {esInactivo(m) ? 'Activar' : 'Desactivar'}
              </button>
            </div>
          ),
        }]
      : []),
  ];

  return (
    <div className="page-inner materia-page">
      <div className="page-header">
        <div>
          <h1>Materia Prima</h1>
          <p className="subtitulo">Existencias actuales de tus insumos</p>
        </div>
      </div>

      {errorCarga && (
        <div
          role="alert"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            marginBottom: 20, padding: '12px 16px', borderRadius: 12,
            border: '1px solid var(--danger)', color: 'var(--danger)', fontWeight: 600,
          }}
        >
          <span>{errorCarga}</span>
          <button type="button" className="btn-primary" style={{ padding: '7px 18px' }} onClick={() => load()}>
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <AdminLoading area texto="Cargando materia prima" subtexto="Revisando tu inventario" />
      ) : (
        <DataTable
          columnas={columnas}
          datos={filtered}
          obtenerId={(m) => m.id}
          tituloExportar="Listado de Materia Prima"
          archivoExportar="materia-prima"
          etiqueta="insumo"
          placeholderBusqueda="Buscar por nombre, tipo o proveedor..."
          mensajeVacio={errorCarga ? 'No se pudo cargar el inventario' : 'No se encontraron insumos'}
          minWidth={1040}
          ordenInicial={[{ id: 'nombre', desc: false }]}
          classNameFila={(m) => (esInactivo(m) ? 'fila-inactiva' : undefined)}
          filtros={
            <>
              <div className="mn-field" style={{ minWidth: 150 }}>
                <label htmlFor="mp-filtro-estado">Estado</label>
                <SelectOscuro id="mp-filtro-estado" className={filtroEstado !== 'todos' ? 'activo' : ''} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as 'todos' | EstadoStock)}>
                  <option value="todos">Todos</option>
                  <option value="disponible">Disponible</option>
                  <option value="bajo">Bajo</option>
                  <option value="agotado">Agotado</option>
                </SelectOscuro>
              </div>

              <div className="mn-field" style={{ minWidth: 150 }}>
                <label htmlFor="mp-filtro-tipo">Tipo</label>
                <SelectOscuro id="mp-filtro-tipo" className={filtroTipo ? 'activo' : ''} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                  <option value="">Todos</option>
                  {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </SelectOscuro>
              </div>

              <div className="mn-field" style={{ minWidth: 160 }}>
                <label htmlFor="mp-filtro-marca">Marca</label>
                <SelectOscuro id="mp-filtro-marca" className={filtroMarca ? 'activo' : ''} value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)}>
                  <option value="">Todas</option>
                  {(marcas ?? []).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </SelectOscuro>
              </div>

              <div className="mn-field" style={{ minWidth: 150 }}>
                <label htmlFor="mp-filtro-unidad">Unidad</label>
                <SelectOscuro id="mp-filtro-unidad" className={filtroUnidad ? 'activo' : ''} value={filtroUnidad} onChange={(e) => setFiltroUnidad(e.target.value)}>
                  <option value="">Todas</option>
                  {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
                </SelectOscuro>
              </div>

              {hayFiltros && (
                <button type="button" className="mn-btn-cancel" onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              )}
            </>
          }
        />
      )}

      {modal && (
      <div className="modal-overlay open" onClick={() => setModal(false)}>
        <div className="modal-box" style={{ maxWidth: 560, padding: '28px 32px' }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="modal-x" onClick={() => setModal(false)} aria-label="Cerrar">×</button>
          <h2 style={{ marginBottom: 18, paddingBottom: 12 }}>Editar materia prima</h2>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Nombre del insumo <span className="mn-req">*</span></label>
              <input
                style={bordeError(errores.nombre)}
                value={form.nombre}
                placeholder="Ej. Pan de hamburguesa"
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              {msgCampo('nombre')}
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Tipo <span style={{ opacity: 0.6, fontWeight: 500 }}>(opcional)</span></label>
              <input
                placeholder="Ej. Carne, Bebida, Panadería..."
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cantidad real <span className="mn-req">*</span></label>
                <input
                  type="text"
                  inputMode="decimal"
                  style={bordeError(errores.cantidad)}
                  value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: soloNumero(e.target.value) })}
                />
                {msgCampo('cantidad')}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Unidad <span style={{ opacity: 0.6, fontWeight: 500 }}>(opcional)</span></label>
                <SelectOscuro value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {(form.unidad_medida && !UNIDADES.includes(form.unidad_medida) ? [form.unidad_medida, ...UNIDADES] : UNIDADES).map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </SelectOscuro>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Precio <span className="mn-req">*</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={{ ...adornoBase, left: 14 }}>$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    style={{ paddingLeft: 30, ...bordeError(errores.precio) }}
                    placeholder="Ej. 2.500"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: formatMiles(e.target.value) })}
                  />
                </div>
                {msgCampo('precio')}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Proveedor <span className="mn-req">*</span></label>
                <SelectOscuro
                  style={bordeError(errores.marca)}
                  value={form.marca_id}
                  onChange={(e) => setForm({ ...form, marca_id: Number(e.target.value) })}
                >
                  {(marcas ?? []).map((m) => (
                    <option key={m?.id} value={m?.id}>{m?.nombre ?? 'Sin nombre'}</option>
                  ))}
                </SelectOscuro>
                {msgCampo('marca')}
              </div>
            </div>

            {Number(form.cantidad) !== cantidadOriginal && (
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>
                  Motivo del ajuste <span style={{ opacity: 0.6, fontWeight: 500 }}>(opcional)</span>
                  {' '}· antes: {cantidadOriginal.toLocaleString('es-CO')}, ahora: {(Number(form.cantidad) || 0).toLocaleString('es-CO')}
                </label>
                <input
                  placeholder="Ej: conteo físico, producto dañado..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={guardar}>Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {desactivar && (
        <div className="mn-modal-overlay" onClick={() => setDesactivar(null)}>
          <div className="mn-modal-box" onClick={(e) => e.stopPropagation()}>
            <p>
              ¿Desactivar la materia prima "{desactivar.nombre}"? Ya no se podrá elegir en nuevas compras, pero podrás activarla de nuevo cuando quieras.
            </p>
            <div className="mn-modal-actions">
              <button type="button" className="mn-btn-cancel" onClick={() => setDesactivar(null)}>Cancelar</button>
              <button type="button" className="mn-btn-confirm" onClick={() => alternarEstado(desactivar)}>Sí, desactivar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}