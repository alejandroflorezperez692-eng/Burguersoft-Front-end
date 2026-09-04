// Tipos y constantes del módulo Materia Prima (inventario de insumos).
export interface MateriaApi {
  id?: number;
  idmateria?: number;
  nombre?: string;
  nombre_materia?: string;
  tipo?: string;
  tipo_materia?: string;
  valor?: number | string;
  valor_materia?: number | string;
  cantidad?: number | string;
  stock_materia?: number | string;
  unidad_medida?: string;
  estado?: string;
  marca_id?: number;
  idMarca?: number;
}

export interface MateriaPrima {
  id: number;
  nombre: string;
  tipo: string;
  valor: number;
  cantidad: number;
  unidad_medida: string;
  estado: string;
  marca_id: number;
}

export interface Marca {
  id: number;
  nombre: string;
}

export type Filtro = 'todos' | 'disponible' | 'bajo' | 'agotado';

export const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'disponible', label: 'Disponible' },
  { key: 'bajo', label: 'Bajo stock' },
  { key: 'agotado', label: 'Agotado' },
];

export const estadoKey = (stock: number): Filtro =>
  stock > 10 ? 'disponible' : stock > 0 ? 'bajo' : 'agotado';

export const textoEstado = (stock: number) =>
  stock > 10 ? 'Disponible' : stock > 0 ? 'Stock bajo' : 'Agotado';

export function normalize(m: MateriaApi): MateriaPrima {
  return {
    id: Number(m.id ?? m.idmateria ?? 0),
    nombre: m.nombre ?? m.nombre_materia ?? '',
    tipo: m.tipo ?? m.tipo_materia ?? '',
    valor: Number(m.valor ?? m.valor_materia ?? 0),
    cantidad: Number(m.cantidad ?? m.stock_materia ?? 0),
    unidad_medida: m.unidad_medida ?? '',
    estado: m.estado ?? '',
    marca_id: Number(m.marca_id ?? m.idMarca ?? 0),
  };
}

export interface MateriaForm {
  nombre: string;
  tipo: string;
  valor: string;
  cantidad: string;
  unidad_medida: string;
  estado: string;
  marca_id: number;
}

export const emptyForm: MateriaForm = {
  nombre: '', tipo: '', valor: '', cantidad: '', unidad_medida: '', estado: 'Activo', marca_id: 1,
};
