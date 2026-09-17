import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import HeroCarousel from '../components/HeroCarousel';
import Footer from '../components/Footer';
import apiClient from '../api/client';
import cenaFallback from '../assets/img/cena.png';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import AdminLoading from '../components/AdminLoading';
import '../styles/public.css';

type Producto = {
  id: number;
  nombre: string;
  valor: number;
  descripcion?: string | null;
  img?: string | null;
  categoria?: string | number | null;
  estado?: string | null;
};

const CATEGORIAS = [
  'Hamburguesa', 'Perros Caliente', 'Salchipapa', 'Fritos',
  'Arepas', 'Picada', 'Bebidas Frias', 'Bebidas Calientes', 'Pizza',
];

const catNombre = (c: unknown): string => {
  if (typeof c === 'number') return CATEGORIAS[c - 1] ?? '';
  return (c as string | null | undefined) ?? '';
};

function formatCOP(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}

export default function MenuPublico() {
  const [items, setItems] = useState<Producto[] | null>(null);
  const { isAuthenticated } = useAuth();
  const { agregar } = useCart();

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

  const disponibles = (items ?? []).filter((p) => (p.estado ?? 'Disponible') !== 'Agotado');

  const grouped = CATEGORIAS.reduce<Record<string, Producto[]>>((acc, cat) => {
    const prods = disponibles.filter((p) => catNombre(p.categoria) === cat);
    if (prods.length > 0) acc[cat] = prods;
    return acc;
  }, {});

  const sinCategoria = disponibles.filter((p) => !CATEGORIAS.includes(catNombre(p.categoria)));
  if (sinCategoria.length > 0) grouped['Otras'] = sinCategoria;

  return (
    <div className="public-body">
      <PublicHeader />

      <HeroCarousel />

      <section className="promociones">
        <h2>Nuestro Menú</h2>
        <p>Descubre todos nuestros productos, preparados al momento para ti.</p>

        {items === null ? (
          <AdminLoading texto="Cargando menú" subtexto="Preparando nuestros productos" />
        ) : disponibles.length === 0 ? (
          <p className="promo-vacio">No hay productos disponibles en este momento.</p>
        ) : (
          Object.entries(grouped).map(([cat, prods]) => (
            <div key={cat} style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 28 }}>{cat}</h2>
              <div className="grid-promociones">
                {prods.map((p) => (
                  <div className="promo-card-pub" key={p.id}>
                    <div className="promo-img-pub">
                      <img
                        src={p.img || cenaFallback}
                        alt={p.nombre ?? 'Producto'}
                        onError={(e) => {
                          e.currentTarget.src = cenaFallback;
                        }}
                      />
                      <span className="promo-badge-pub">{cat.toUpperCase()}</span>
                    </div>
                    <div className="promo-info-pub">
                      <h3>{p.nombre ?? 'Sin nombre'}</h3>
                      {p.descripcion && <p>{p.descripcion}</p>}
                      <div className="promo-footer-pub">
                        <div className="promo-precio-pub">
                          {formatCOP(Number(p.valor || 0))}
                        </div>
                        {isAuthenticated ? (
                          <button
                            type="button"
                            className="btn-circular-add"
                            title="Agregar al carrito"
                            onClick={() =>
                              agregar({ id: p.id, nombre: p.nombre ?? 'Producto', precio: Number(p.valor || 0), imagen: p.img })
                            }
                          >
                            +
                          </button>
                        ) : (
                          <Link to="/login" title="Inicia sesión para pedir">
                            <button type="button" className="btn-circular-add btn-login">
                              +
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <Footer />
    </div>
  );
}
