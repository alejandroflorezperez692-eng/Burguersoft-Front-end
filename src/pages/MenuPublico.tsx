import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import HeroCarousel from '../components/HeroCarousel';
import Footer from '../components/Footer';
import apiClient from '../api/client';
import cenaFallback from '../assets/img/cena.png';
import { useAuth } from '../hooks/useAuth';
import AdminLoading from '../components/AdminLoading';
import PersonalizarModal from '../components/PersonalizarModal';
import '../styles/public.css';
import { useCart } from '../hooks/useCart';
import { categoriaSinExtras } from '../utils/categorias';

type Producto = {
  id: number;
  nombre: string;
  valor: number;
  descripcion?: string | null;
  img?: string | null;
  categoria?: string | number | null;
  estado?: string | null;
  adiciones?: { id: number; nombre: string; precio: number | string; tipo?: string }[];
};

const CATEGORIAS = [
  'Hamburguesa', 'Perros Calientes', 'Salchipapa', 'Fritos',
  'Arepas', 'Picada', 'Bebidas Frías', 'Bebidas Calientes', 'Pizza', 'Combos',
];

const ALIAS_CATEGORIA: Record<string, string> = {
  'Perros Caliente': 'Perros Calientes',
  'Bebidas Frias': 'Bebidas Frías',
};

const catNombre = (c: unknown): string => {
  const nombre = typeof c === 'number'
    ? CATEGORIAS[c - 1] ?? ''
    : (c as string | null | undefined) ?? '';
  return ALIAS_CATEGORIA[nombre] ?? nombre;
};

function formatCOP(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}

export default function MenuPublico() {
  const [items, setItems] = useState<Producto[] | null>(null);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSel, setCategoriaSel] = useState('Todas');
  const [ocultarAgotados, setOcultarAgotados] = useState(false);
  const { isAuthenticated } = useAuth();

  const { agregar } = useCart();

  const handleAgregar = (p: Producto) => {
    const sinOpciones =
      categoriaSinExtras(catNombre(p.categoria)) ||
      ((p.adiciones?.length ?? 0) === 0 && !(p.descripcion ?? '').includes('+'));

    if (sinOpciones) {
      agregar({
        id: p.id,
        nombre: p.nombre ?? 'Producto',
        precio: Number(p.valor || 0),
        imagen: p.img,
        cantidad: 1,
      });
    } else {
      setEditando(p);
    }
  };

  useEffect(() => {
    let cancelado = false;
    apiClient
      .get<Producto[] | { data?: Producto[] }>('/productos')
      .then(({ data }) => {
        const lista: Producto[] = Array.isArray(data) ? data : data?.data ?? [];
        if (!cancelado) setItems(lista);
      })
      .catch(() => {
        if (!cancelado) setItems([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const disponibles = items ?? [];

  const filtrados = disponibles.filter((p) => {
    if (ocultarAgotados && p.estado === 'Agotado') return false;
    const q = busqueda.trim().toLowerCase();
    if (q && !`${p.nombre} ${p.descripcion ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const grouped = CATEGORIAS.reduce<Record<string, Producto[]>>((acc, cat) => {
    const prods = filtrados.filter((p) => catNombre(p.categoria) === cat);
    if (prods.length > 0) acc[cat] = prods;
    return acc;
  }, {});

  const sinCategoria = filtrados.filter((p) => !CATEGORIAS.includes(catNombre(p.categoria)));
  if (sinCategoria.length > 0) grouped['Otras'] = sinCategoria;

  // Categorías que existen en el menú (para los botones)
  const categoriasConProductos = CATEGORIAS.filter((cat) =>
    disponibles.some((p) => catNombre(p.categoria) === cat),
  );

  const gruposVisibles = Object.entries(grouped).filter(
    ([cat]) => categoriaSel === 'Todas' || cat === categoriaSel,
  );

  return (
    <div className="public-body">
      <PublicHeader />

      <HeroCarousel />

      <section className="promociones">
        <h2>Nuestro Menú</h2>
        <p>Descubre todos nuestros productos, preparados al momento para ti.</p>

        {items !== null && disponibles.length > 0 && (
          <div className="menu-filtros">
            <div className="menu-filtros-fila">
              <input
                className="menu-buscar"
                type="search"
                placeholder="Buscar producto por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                aria-label="Buscar producto"
              />
              <label className="menu-check">
                <input
                  type="checkbox"
                  checked={ocultarAgotados}
                  onChange={(e) => setOcultarAgotados(e.target.checked)}
                />
                Ocultar agotados
              </label>
            </div>

            <div className="menu-pills" role="tablist" aria-label="Categorías">
              {['Todas', ...categoriasConProductos].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={categoriaSel === cat}
                  className={`menu-pill${categoriaSel === cat ? ' activo' : ''}`}
                  onClick={() => setCategoriaSel(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {items === null ? (
          <AdminLoading texto="Cargando menú" subtexto="Preparando nuestros productos" compact />
        ) : disponibles.length === 0 ? (
          <p className="promo-vacio">No hay productos disponibles en este momento.</p>
        ) : gruposVisibles.length === 0 ? (
          <p className="promo-vacio">No encontramos productos con esos filtros.</p>
        ) : (
          gruposVisibles.map(([cat, prods]) => (
            <div key={cat} style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 28 }}>{cat}</h2>
              <div className="grid-promociones">
                {prods.map((p) => {
                  const agotado = p.estado === 'Agotado';
                  return (
                    <div className={`promo-card-pub${agotado ? ' agotado' : ''}`} key={p.id}>
                      <div className="promo-img-pub">
                        <img
                          src={p.img || cenaFallback}
                          alt={p.nombre ?? 'Producto'}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.src = cenaFallback;
                          }}
                        />
                        {agotado && (
                          <div className="promo-agotado-overlay">
                            <span>AGOTADO</span>
                          </div>
                        )}
                      </div>
                      <div className="promo-info-pub">
                        <h3>{p.nombre ?? 'Sin nombre'}</h3>
                        {p.descripcion && <p>{p.descripcion}</p>}
                        <div className="promo-footer-pub">
                          <div className="promo-precio-pub">
                            {formatCOP(Number(p.valor || 0))}
                          </div>
                          {agotado ? (
                            <button type="button" className="btn-circular-add" disabled title="Producto agotado" data-tooltip="Producto agotado">
                              +
                            </button>
                          ) : isAuthenticated ? (
                            <button
                              type="button"
                              className="btn-circular-add"
                              title="Agregar al carrito"
                              data-tooltip="Agregar al carrito"
                              onClick={() => handleAgregar(p)}
                            >
                              +
                            </button>
                          ) : (
                            <Link to="/login" className="link-sesion" data-tooltip="Inicia sesión para pedir">
                              <button type="button" className="btn-circular-add btn-login">
                                +
                              </button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>

      {editando && (
        <PersonalizarModal
          item={{
            id: editando.id,
            nombre: editando.nombre ?? 'Producto',
            precio: Number(editando.valor || 0),
            imagen: editando.img,
            descripcion: editando.descripcion,
            adiciones: editando.adiciones,
            categoria: catNombre(editando.categoria),
          }}
          onClose={() => setEditando(null)}
        />
      )}

      <Footer />
    </div>
  );
}