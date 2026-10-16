// Tipos y constantes del módulo Menú (productos del catálogo).
// La API Laravel devuelve: id, nombre, valor, descripcion, img, cantidad, categoria, estado
export interface ProductoApi {
  id?: number;
  id_producto?: number;
  nombre?: string;
  nombre_producto?: string;
  valor?: number | string;
  valor_producto?: number | string;
  descripcion?: string;
  descri_producto?: string;
  img?: string;
  img_producto?: string;
  cantidad?: string | number;
  categoria?: string;
  id_categoria?: number;
  estado?: string;
}

export interface Producto {
  id: number;
  nombre: string;
  valor: number;
  descripcion: string;
  img: string;
  cantidad: string;
  categoria: string;
  estado: string;
}

export const CATEGORIAS = [
  'Hamburguesa', 'Perros Caliente', 'Salchipapa', 'Fritos',
  'Arepas', 'Picada', 'Bebidas Frias', 'Bebidas Calientes', 'Pizza',
];

export interface ProductoForm {
  nombre: string;
  valor: string;
  descripcion: string;
  img: string;
  cantidad: string;
  categoria: string;
  estado: string;
}

export const emptyForm: ProductoForm = {
  nombre: '',
  valor: '',
  descripcion: '',
  img: '',
  cantidad: '',
  categoria: 'Hamburguesa',
  estado: 'Disponible',
};

export function normalize(p: ProductoApi): Producto {
  return {
    id: Number(p.id ?? p.id_producto ?? 0),
    nombre: p.nombre ?? p.nombre_producto ?? '',
    valor: Number(p.valor ?? p.valor_producto ?? 0),
    descripcion: p.descripcion ?? p.descri_producto ?? '',
    img: p.img ?? p.img_producto ?? '',
    cantidad: String(p.cantidad ?? '0'),
    categoria: p.categoria ?? (p.id_categoria ? CATEGORIAS[p.id_categoria - 1] ?? '' : ''),
    estado: p.estado ?? 'Disponible',
  };
}
