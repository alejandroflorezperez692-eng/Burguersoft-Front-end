const quitarTildes = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const CATEGORIAS_SIN_EXTRAS = [
  'Bebidas Frias',
  'Bebidas Calientes',
  'Arepas',
  'Fritos',
  'Pizza',
];

const normalizadas = CATEGORIAS_SIN_EXTRAS.map(quitarTildes);

export const categoriaSinExtras = (categoria?: string | null) =>
  normalizadas.includes(quitarTildes(categoria ?? ''));