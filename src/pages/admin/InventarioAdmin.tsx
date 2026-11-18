import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';
import DataTable, { type DataTableColumn } from '../../components/DataTable';
import { useToast } from '../../components/Toast';
import { useEscape } from '../../hooks/useEscape';
import '../../styles/nu-admin.css';
import SelectOscuro from '../../components/SelectOscuro';
import MateriaPrimaHistorialModal from '../../components/MateriaPrimaHistorialModal';

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

const toArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

export default function InventarioAdmin() {
  const [items, setItems] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoStock>('todos');
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<MateriaPrima | null>(null);
  const { showToast } = useToast();

  const load = async () => {
    setLoading(true);
    const [r1, r2] = await Promise.allSettled([
      apiClient.get('/materias-primas'),
      apiClient.get('/marcas'),
    ]);

    if (r1.status === 'fulfilled') {
      setItems(toArray<MateriaPrima>(r1.value.data));
    } else {
      showToast('No se pudo cargar el inventario', true);
    }
    if (r2.status === 'fulfilled') {
      setMarcas(toArray<Marca>(r2.value.data));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEscape([[!!detalle, () => setDetalle(null)]]);

  const marcaNombre = (id: unknown): string =>
    marcas.find((x) => x.id === id)?.nombre ?? '';

  const filtrados = useMemo(
    () =>
      items.filter((m) => filtroEstado === 'todos' || estadoKey(m.cantidad) === filtroEstado),
    [items, filtroEstado],
  );

  const columnas = useMemo<DataTableColumn<MateriaPrima>[]>(
    () => [
      {
        id: 'nombre',
        header: 'Nombre del insumo',
        accessor: (m) => m.nombre ?? '',
        cell: (m) => <span style={{ fontWeight: 600 }}>{m.nombre ?? 'Sin nombre'}</span>,
        width: '32%',
      },
      {
        id: 'tipo',
        header: 'Tipo',
        accessor: (m) => m.tipo ?? '',
        cell: (m) => m.tipo || '—',
        width: '18%',
      },
      {
        id: 'cantidad',
        header: 'Cantidad',
        accessor: (m) => num(m.cantidad),
        searchable: false,
        align: 'right',
        cell: (m) => (
          <span style={{ fontWeight: 600 }}>
            {num(m.cantidad).toLocaleString('es-CO')}
            {m.unidad_medida ? (
              <span style={{ marginLeft: 8, fontWeight: 500, color: 'var(--text-400)' }}>
                {m.unidad_medida}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        id: 'disponibilidad',
        header: 'Disponibilidad',
        accessor: (m) => textoEstado(m.cantidad),
        cell: (m) => <span className={`badge ${claseBadge(m.cantidad)}`}>{textoEstado(m.cantidad)}</span>,
      },
      {
        id: 'acciones',
        header: 'Acciones',
        accessor: () => '',
        sortable: false,
        searchable: false,
        exportable: false,
        align: 'center',
        cell: (m) => (
          <button
            type="button"
            className="mn-btn-edit"
            style={{ flex: 'none', padding: '7px 18px' }}
            onClick={() => setDetalle(m)}
            data-tooltip="Ver detalle"
          >
            Ver detalle
          </button>
        ),
      },
    ],
    [],
  );

  const esInactivo = (m: MateriaPrima) => m.estado === 'Inactivo';
  const hayFiltros = filtroEstado !== 'todos';

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Inventario</h1>
          <p className="subtitulo">Consulta las existencias de toda tu materia prima</p>
        </div>
      </div>

      {loading ? (
        <AdminLoading area texto="Cargando inventario" subtexto="Revisando tus existencias" />
      ) : (
        <DataTable
          columnas={columnas}
          datos={filtrados}
          obtenerId={(m) => m.id}
          tituloExportar="Inventario de materia prima"
          archivoExportar="inventario"
          placeholderBusqueda="Buscar por nombre, tipo o disponibilidad..."
          etiqueta="insumo"
          mensajeVacio="No se encontraron insumos"
          minWidth={760}
          ordenInicial={[{ id: 'nombre', desc: false }]}
          classNameFila={(m) => (esInactivo(m) ? 'fila-inactiva' : undefined)}
          filtros={
            <>
              <div className="mn-field" style={{ minWidth: 170 }}>
                <label htmlFor="inv-filtro-estado">Cantidad</label>
                <SelectOscuro
                  id="inv-filtro-estado"
                  className={filtroEstado !== 'todos' ? 'activo' : ''}
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value as 'todos' | EstadoStock)}
                >
                  <option value="todos">Todos</option>
                  <option value="disponible">Disponible</option>
                  <option value="bajo">Bajo</option>
                  <option value="agotado">Agotado</option>
                </SelectOscuro>
              </div>

              {hayFiltros && (
                <button
                  type="button"
                  className="mn-btn-cancel"
                  onClick={() => setFiltroEstado('todos')}
                >
                  Limpiar filtros
                </button>
              )}
            </>
          }
        />
      )}

      {detalle && (
        <MateriaPrimaHistorialModal
          insumo={detalle}
          proveedor={marcaNombre(detalle.marca_id)}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
}
