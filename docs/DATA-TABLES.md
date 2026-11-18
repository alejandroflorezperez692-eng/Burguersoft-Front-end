# Data Tables (tablas de datos reutilizables)

Guía para construir las tablas de los módulos del panel administrativo con
búsqueda, ordenamiento, filtros, paginación y exportación usando una sola
librería y un solo componente.

---

## 1. Librería elegida: TanStack Table

Se instaló **`@tanstack/react-table` v8** (`npm install @tanstack/react-table@^8.21.3`).

| Librería | Ventajas | Por qué no / cuándo sí |
| --- | --- | --- |
| **TanStack Table** (elegida) | Headless: no impone estilos, se integra con el CSS actual (`data-table`), muy liviana, TypeScript excelente, React 19. | Hay que maquetar la tabla (ya está resuelto en `DataTable.tsx`). |
| AG Grid | Muy completa (filtros por columna, agrupación, edición, virtualización). | ~1 MB, licencia community limitada y su propio tema choca con el diseño actual. Útil si se necesitan miles de filas o Excel avanzado. |
| MUI DataGrid | Rápida de usar, buena UI. | Obliga a usar MUI (otro sistema de diseño) y su versión gratuita limita filas/columnas. |
| react-data-table-component | Componente "listo", poca configuración. | Menos control del render de celdas y compatibilidad irregular con React 19. |
| DataTables.net | Madura, muchas extensiones (exportar, botones). | Está pensada para jQuery/DOM; en React se integra peor y duplica lo que ya hacen `BarraExportar` y `Paginacion`. |

> **Conclusión:** TanStack Table + nuestro CSS + `BarraExportar` + `Paginacion`
> da todas las funciones pedidas sin reescribir el diseño ni sumar un tema nuevo.

---

## 2. Qué hace `DataTable`

Archivo: `src/components/DataTable.tsx`  
Estilos: `src/styles/data-table.css`

Funciones incluidas:

- 🔍 **Búsqueda global** (ignora tildes y mayúsculas).
- ↕️ **Ordenamiento** por clic en el encabezado (asc → desc → sin orden).
- 🎛️ **Filtros propios** por módulo (selects, fechas, etc.).
- 📄 **Paginación** reutilizando `Paginacion` (con selector de filas por página).
- 📤 **Exportación** a Copiar / Excel / PDF / Imprimir reutilizando `BarraExportar`
  (exporta **todas las filas filtradas**, no solo la página).
- ♿ Accesibilidad: `aria-sort`, botones reales en encabezados, `scope="col"`.
- 🌙 Soporte de modo claro/oscuro con las variables del proyecto.

---

## 3. API del componente

```tsx
export interface DataTableColumn<T> {
  id: string;                       // identificador único
  header: string;                   // título visible y de exportación
  accessor: (fila: T) => ValorCelda; // valor para ordenar/buscar/exportar
  cell?: (fila: T) => ReactNode;    // render personalizado (badges, botones...)
  sortable?: boolean;               // default: true
  searchable?: boolean;             // default: true
  exportable?: boolean;             // default: true
  exportValue?: (fila: T) => ValorCelda; // valor alternativo al exportar
  align?: 'left' | 'center' | 'right';
  width?: number | string;
}

interface Props<T> {
  columnas: DataTableColumn<T>[];
  datos: T[];
  obtenerId?: (fila: T, indice: number) => string | number;
  tituloExportar?: string;
  archivoExportar?: string;
  exportable?: boolean;             // default: true
  busqueda?: boolean;               // default: true
  placeholderBusqueda?: string;
  filtros?: ReactNode;              // controles de filtro del módulo
  acciones?: ReactNode;             // botones extra (Nuevo, recargar...)
  porPaginaInicial?: number;        // default: 15
  opcionesPorPagina?: number[];     // default: [10, 15, 25, 50, 100]
  ordenInicial?: { id: string; desc: boolean }[];
  cargando?: boolean;
  mensajeVacio?: string;
  etiqueta?: string;                // singular, ej. "insumo"
  etiquetaPlural?: string;          // opcional, se calcula solo
  classNameFila?: (fila: T) => string | undefined;
  filaExtra?: (fila: T, indice: number, filasPagina: T[]) => ReactNode; // fila extra antes de cada registro (encabezado de grupo)
  onRowClick?: (fila: T) => void;
  minWidth?: number;
  className?: string;               // clases para el contenedor .dt-wrap
  classNameTabla?: string;          // clases extra para el <table> (ej. "ventas-table")
}
```

---

## 4. Ejemplo completo

Basado en `src/pages/admin/InventarioAdmin.tsx` (módulo ya migrado):

```tsx
import { useMemo } from 'react';
import DataTable, { type DataTableColumn } from '../../components/DataTable';

type Insumo = { id: number; nombre: string; cantidad: number; tipo?: string | null };

export default function InsumosPage() {
  const [filtro, setFiltro] = useState('todos');

  const columnas = useMemo<DataTableColumn<Insumo>[]>(
    () => [
      {
        id: 'nombre',
        header: 'Nombre',
        accessor: (m) => m.nombre,
        cell: (m) => <strong>{m.nombre}</strong>,
      },
      {
        id: 'tipo',
        header: 'Tipo',
        accessor: (m) => m.tipo ?? '',
        cell: (m) => m.tipo || '—',
      },
      {
        id: 'cantidad',
        header: 'Cantidad',
        accessor: (m) => m.cantidad,
        align: 'right',
      },
      {
        id: 'acciones',
        header: 'Acciones',
        accessor: () => '',
        sortable: false,
        searchable: false,
        exportable: false,          // no aparece en Excel/PDF
        align: 'center',
        cell: (m) => <button onClick={() => abrirDetalle(m)}>Ver detalle</button>,
      },
    ],
    [],
  );

  // Los filtros propios se aplican ANTES de pasar los datos.
  const filtrados = useMemo(
    () => insumos.filter((m) => filtro === 'todos' || m.tipo === filtro),
    [insumos, filtro],
  );

  return (
    <DataTable
      columnas={columnas}
      datos={filtrados}
      obtenerId={(m) => m.id}
      tituloExportar="Inventario de materia prima"
      archivoExportar="inventario"
      etiqueta="insumo"
      placeholderBusqueda="Buscar por nombre o tipo..."
      mensajeVacio="No se encontraron insumos"
      minWidth={760}
      filtros={
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="bebida">Bebida</option>
        </select>
      }
    />
  );
}
```

---

## 5. Cómo migrar los demás módulos

### Estado de la migración

| Módulo | Estado | Notas |
| --- | --- | --- |
| `InventarioAdmin` | ✅ Migrado | Referencia de implementación. |
| `UsuariosAdmin` | ✅ Migrado | Búsqueda y filtros dentro del `DataTable`. |
| `ProveedoresAdmin` | ✅ Migrado | Solo la vista de lista; la vista de tarjetas se mantiene. |
| `MateriaPrimaAdmin` | ✅ Migrado | El select "Ordenar por" se reemplazó por el ordenamiento de columnas. |
| `MenuAdmin` | ✅ Migrado | Solo la vista de lista; la vista de tarjetas se mantiene. |
| `PromocionesAdmin` | ✅ Migrado | Solo la vista de lista; la vista de tarjetas se mantiene. |
| `ComprasAdmin` | ✅ Migrado | Encabezados por día con `filaExtra` y estilos `compras-table`. |
| `VentasAdmin` | ✅ Migrado | Encabezados por día con `filaExtra`, cierre del día y estilos `ventas-table`. |
| `CierreInventarioAdmin` | ✅ Migrado | Solo el historial; la tabla editable de conteo y el modal de detalle no cambian. |
| `BackupsAdmin` | ✅ Migrado | La búsqueda externa del encabezado se conserva. |
| `ReportesAdmin` | — | No contiene tablas de listado. |
| `HistorialModal` | — | Es una línea de tiempo (`div`), no una tabla; se deja intacta. |
| `MateriaPrimaHistorialModal` | — | Usa encabezados agrupados (`colSpan`/`rowSpan`) que `DataTable` aún no soporta. |

Pasos:

1. **Importar** `DataTable` y `type DataTableColumn`.
2. **Definir `columnas`** con `useMemo` (o fuera del componente si no dependen de estado).
   - Usar `cell` solo cuando se necesite un badge, botón, avatar, etc.
   - Marcar `exportable: false` en columnas de acciones.
   - Marcar `searchable: false` en IDs o valores que no aportan a la búsqueda.
   - Usar `exportValue` si lo que se muestra difiere de lo que se quiere exportar.
3. **Conservar los filtros del módulo** y pasarlos como `datos` ya filtrados + `filtros={...}`.
4. **Borrar** el estado `q`, `pagina`, el `useEffect` que reinicia página, el
   `<input className="mn-search">`, `paginar(...)` y `<Paginacion>` manual.
5. **Mantener** `AdminLoading` mientras carga (o usar `cargando`).
6. **Pasar** `tituloExportar`, `archivoExportar`, `etiqueta`, `minWidth`,
   `placeholderBusqueda` y `classNameFila` si aplica.
7. **Probar**: búsqueda, orden por cada columna, filtros, cambio de página,
   exportar Excel/PDF y modo oscuro.

### Antes / después (resumen)

```tsx
// ANTES
const [q, setQ] = useState('');
const [pagina, setPagina] = useState(1);
const filtered = items.filter(...).sort(...);
const { visibles, paginaActual } = paginar(filtered, pagina);
<input className="mn-search" ... />
<table className="data-table">...</table>
<BarraExportar ... />
<Paginacion ... />

// DESPUÉS
<DataTable columnas={columnas} datos={filtrados} filtros={...} etiqueta="usuario" />
```

### Agrupar filas por día (Ventas y Compras)

Para tablas que muestran un encabezado de grupo antes de cada día se usa
`filaExtra`. Recibe la fila actual, su índice y las filas de la página:

```tsx
const filaDia = (venta: Venta, indice: number, filasPagina: Venta[]) => {
  const clave = fechaLocal(venta.fecha);
  const anterior = indice > 0 ? fechaLocal(filasPagina[indice - 1].fecha) : null;
  if (indice > 0 && clave === anterior) return null; // mismo día: sin encabezado

  return (
    <tr className="vt-dia">
      <td colSpan={9}>...</td>
    </tr>
  );
};

<DataTable
  datos={ordenadasPorFecha}
  filaExtra={filaDia}
  classNameTabla="ventas-table"
  className="ventas-table-wrap"
/>
```

Recomendaciones al agrupar:

- Pasa los datos **ya ordenados por el criterio del grupo** (fecha descendente)
  y marca las columnas con `sortable: false`; si el usuario reordena, los
  encabezados de día dejarían de ser consecutivos.
- La paginación cuenta **filas**, no grupos; un día puede continuar en la
  página siguiente y su encabezado se repite al inicio de esa página.
- Usa `classNameTabla` para conservar estilos específicos del módulo
  (`ventas-table`, `compras-table`) y `className` para el contenedor externo.

---

## 6. Reglas del equipo

- **Una sola forma de hacer tablas:** si el módulo es administrativo y lista
  datos, usa `DataTable`.
- **La exportación siempre sale del `DataTable`**, no agregues un
  `BarraExportar` suelto en la misma pantalla.
- **No ordenes los datos manualmente con `.sort()`** antes de pasarlos: para eso
  está el ordenamiento por columna. La excepción son las tablas agrupadas con
  `filaExtra` (Ventas/Compras), que deben llegar ordenadas por día y con las
  columnas sin ordenamiento.
- **Columnas memoizadas:** usa `useMemo` solo si las columnas son totalmente
  estáticas. Si `cell` usa estado, filtros o acciones del componente, declara
  `const columnas: DataTableColumn<T>[] = [...]` directamente para evitar
  closures con datos viejos.
- **Filtros de servidor:** si un endpoint pagina/filtra en el backend, pide los
  datos ya filtrados y pasa solo la página actual; en ese caso hay que adaptar
  `DataTable` para `manualPagination` (contacta al responsable antes de hacerlo).
- **Exportación masiva:** `BarraExportar` exporta lo que recibe. `DataTable` le
  pasa todas las filas filtradas, así que no exporta solo la página visible.

---

## 7. Verificación

```bash
npx tsc -b      # tipos
npm run lint    # estilo
npm run build   # producción
```
