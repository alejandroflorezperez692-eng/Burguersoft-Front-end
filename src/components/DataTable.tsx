import { Fragment, useMemo, useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type FilterFn,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react';
import BarraExportar from './BarraExportar';
import Paginacion from './Paginacion';
import '../styles/data-table.css';

export type ValorCelda = string | number | boolean | Date | null | undefined;

export interface DataTableColumn<T> {
  /** Identificador único de la columna (no se muestra). */
  id: string;
  /** Título visible y encabezado en la exportación. */
  header: string;
  /** Valor usado para ordenar, buscar y exportar. */
  accessor: (fila: T) => ValorCelda;
  /** Render personalizado de la celda. Si se omite se muestra el accessor. */
  cell?: (fila: T) => ReactNode;
  /** Permite ordenar por esta columna (por defecto true). */
  sortable?: boolean;
  /** Participa en la búsqueda global (por defecto true). */
  searchable?: boolean;
  /** Se incluye en Excel/PDF/Imprimir (por defecto true). */
  exportable?: boolean;
  /** Valor alternativo para la exportación (por defecto usa accessor). */
  exportValue?: (fila: T) => ValorCelda;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
}

interface Props<T> {
  columnas: DataTableColumn<T>[];
  datos: T[];
  /** Identificador estable de cada fila (por defecto `fila.id`). */
  obtenerId?: (fila: T, indice: number) => string | number;
  /** Título del reporte exportado. */
  tituloExportar?: string;
  /** Nombre del archivo exportado (sin extensión). */
  archivoExportar?: string;
  /** Muestra los botones Copiar / Excel / PDF / Imprimir (por defecto true). */
  exportable?: boolean;
  /** Muestra la caja de búsqueda global (por defecto true). */
  busqueda?: boolean;
  placeholderBusqueda?: string;
  /** Controles de filtro propios (selects, fechas, etc.). */
  filtros?: ReactNode;
  /** Botones u otros elementos a la derecha de la barra superior. */
  acciones?: ReactNode;
  porPaginaInicial?: number;
  opcionesPorPagina?: number[];
  /** Orden inicial, ej. [{ id: 'nombre', desc: false }]. */
  ordenInicial?: SortingState;
  cargando?: boolean;
  mensajeVacio?: string;
  /** Etiqueta del contador en singular, ej. "usuario". */
  etiqueta?: string;
  /** Plural de la etiqueta; si se omite se calcula automáticamente. */
  etiquetaPlural?: string;
  classNameFila?: (fila: T) => string | undefined;
  /** Fila extra (por ejemplo un encabezado de grupo) antes de cada registro. */
  filaExtra?: (fila: T, indice: number, filasPagina: T[]) => ReactNode;
  onRowClick?: (fila: T) => void;
  minWidth?: number;
  className?: string;
  /** Clases adicionales para el <table> (ej. "ventas-table"). */
  classNameTabla?: string;
}

const formatear = (valor: ValorCelda): string => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (valor instanceof Date) return valor.toLocaleDateString('es-CO');
  return String(valor);
};

const normalizar = (valor: ValorCelda): string =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Convierte el valor al formato aceptado por BarraExportar. */
const aCeldaExportable = (valor: ValorCelda): string | number | null | undefined => {
  if (valor instanceof Date) return valor.toLocaleDateString('es-CO');
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return valor;
};

const comparable = (valor: ValorCelda): string | number => {
  if (valor instanceof Date) return valor.getTime();
  if (typeof valor === 'number') return valor;
  return normalizar(valor);
};

const colador = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

const pluralizar = (palabra: string): string => {
  if (/s$/i.test(palabra)) return palabra;
  return /[aeiouáéíóú]$/i.test(palabra) ? `${palabra}s` : `${palabra}es`;
};

const comparar = (a: ValorCelda, b: ValorCelda): number => {
  const vacioA = a === null || a === undefined || a === '';
  const vacioB = b === null || b === undefined || b === '';
  if (vacioA && vacioB) return 0;
  if (vacioA) return 1;
  if (vacioB) return -1;
  const va = comparable(a);
  const vb = comparable(b);
  if (typeof va === 'number' && typeof vb === 'number') return va - vb;
  return colador.compare(String(va), String(vb));
};

export default function DataTable<T>({
  columnas,
  datos,
  obtenerId,
  tituloExportar = 'Reporte',
  archivoExportar,
  exportable = true,
  busqueda = true,
  placeholderBusqueda = 'Buscar...',
  filtros,
  acciones,
  porPaginaInicial = 15,
  opcionesPorPagina = [10, 15, 25, 50, 100],
  ordenInicial = [],
  cargando = false,
  mensajeVacio = 'No se encontraron registros',
  etiqueta,
  etiquetaPlural,
  classNameFila,
  filaExtra,
  onRowClick,
  minWidth,
  className,
  classNameTabla,
}: Props<T>) {
  const [busquedaGlobal, setBusquedaGlobal] = useState('');
  const [orden, setOrden] = useState<SortingState>(ordenInicial);
  const [paginacion, setPaginacion] = useState<PaginationState>({ pageIndex: 0, pageSize: porPaginaInicial });

  const columnasTanStack = useMemo<ColumnDef<T>[]>(
    () =>
      columnas.map((col) => ({
        id: col.id,
        accessorFn: (fila) => col.accessor(fila),
        header: col.header,
        enableSorting: col.sortable !== false,
        enableGlobalFilter: col.searchable !== false,
        sortingFn: (a, b) => comparar(a.getValue(col.id), b.getValue(col.id)),
        cell: ({ row }) => (col.cell ? col.cell(row.original) : formatear(col.accessor(row.original))),
        meta: { align: col.align, width: col.width },
      })),
    [columnas],
  );

  const filtroGlobal = useMemo<FilterFn<T>>(
    () => (row, _columnId, valor) => {
      const aguja = normalizar(valor);
      if (!aguja) return true;
      return columnas.some(
        (col) => col.searchable !== false && normalizar(col.accessor(row.original)).includes(aguja),
      );
    },
    [columnas],
  );

  const table = useReactTable<T>({
    data: datos,
    columns: columnasTanStack,
    state: { sorting: orden, globalFilter: busquedaGlobal, pagination: paginacion },
    onSortingChange: setOrden,
    onGlobalFilterChange: setBusquedaGlobal,
    onPaginationChange: setPaginacion,
    globalFilterFn: filtroGlobal,
    getRowId: (fila, indice) => String(obtenerId ? obtenerId(fila, indice) : ((fila as { id?: string | number }).id ?? indice)),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const totalFiltrado = table.getFilteredRowModel().rows.length;
  const total = datos.length;
  const singular = etiqueta ?? 'registro';
  const plural = etiquetaPlural ?? pluralizar(singular);
  const paginaActual = table.getState().pagination.pageIndex + 1;
  const porPagina = table.getState().pagination.pageSize;
  const filasPagina = table.getRowModel().rows.map((r) => r.original);

  const columnasExportar = columnas.filter((c) => c.exportable !== false);
  const filasExportar = table.getPrePaginationRowModel().rows.map((r) =>
    columnasExportar.map((c) => aCeldaExportable(c.exportValue ? c.exportValue(r.original) : c.accessor(r.original))),
  );

  return (
    <div className={`dt-wrap ${className ?? ''}`.trim()}>
      {(busqueda || filtros || acciones) && (
        <div className="dt-toolbar">
          {busqueda && (
            <div className="dt-search-wrap">
              <Search className="dt-search-icon" size={18} aria-hidden="true" />
              <input
                className="dt-search"
                type="search"
                value={busquedaGlobal}
                placeholder={placeholderBusqueda}
                aria-label="Buscar en la tabla"
                onChange={(e) => setBusquedaGlobal(e.target.value)}
              />
            </div>
          )}

          {filtros && <div className="dt-filtros">{filtros}</div>}

          <div className="dt-acciones">
            <label className="dt-page-size">
              <span>Filas</span>
              <select
                className="dt-select"
                value={porPagina}
                aria-label="Filas por página"
                onChange={(e) => table.setPageSize(Number(e.target.value))}
              >
                {opcionesPorPagina.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            {acciones}
          </div>
        </div>
      )}

      {exportable && (
        <div className="dt-export">
          <span className="dt-count">
            {totalFiltrado} {totalFiltrado === 1 ? singular : plural}
            {totalFiltrado !== total ? ` de ${total}` : ''}
          </span>
          <BarraExportar
            titulo={tituloExportar}
            archivo={archivoExportar}
            columnas={columnasExportar.map((c) => c.header)}
            filas={filasExportar}
          />
        </div>
      )}

      <div className="tabla-responsive">
        <table className={`data-table ${classNameTabla ?? ''}`.trim()} style={minWidth ? { minWidth } : undefined}>
          <thead>
            {table.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id}>
                {grupo.headers.map((header) => {
                  const col = columnas.find((c) => c.id === header.column.id);
                  const sentido = header.column.getIsSorted();
                  const puedeOrdenar = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      style={{ textAlign: col?.align, width: col?.width }}
                      aria-sort={sentido === 'asc' ? 'ascending' : sentido === 'desc' ? 'descending' : 'none'}
                    >
                      {puedeOrdenar ? (
                        <button
                          type="button"
                          className="dt-sort"
                          data-active={sentido !== false}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sentido === 'asc' ? (
                            <ChevronUp size={14} aria-hidden="true" />
                          ) : sentido === 'desc' ? (
                            <ChevronDown size={14} aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown size={14} aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={columnas.length} className="dt-empty">Cargando…</td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columnas.length} className="dt-empty">{mensajeVacio}</td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, indice) => (
                <Fragment key={row.id}>
                  {filaExtra?.(row.original, indice, filasPagina)}
                  <tr
                    className={classNameFila ? classNameFila(row.original) : undefined}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    style={onRowClick ? { cursor: 'pointer' } : undefined}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const col = columnas.find((c) => c.id === cell.column.id);
                      return (
                        <td key={cell.id} style={{ textAlign: col?.align }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!cargando && totalFiltrado > 0 && (
        <Paginacion
          total={totalFiltrado}
          pagina={paginaActual}
          porPagina={porPagina}
          onCambiar={(n) => table.setPageIndex(n - 1)}
          etiqueta={plural}
          siempre
        />
      )}
    </div>
  );
}
