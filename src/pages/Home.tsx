import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import HeroCarousel from '../components/HeroCarousel';
import Footer from '../components/Footer';
import Accesibilidad from '../components/Accesibilidad';
import apiClient from '../api/client';
import promocionFallback from '../assets/img/promocion.png';
import '../styles/public.css';

type Promocion = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  imagen?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
};

function formatCOP(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}

export default function Home() {
  const [promos, setPromos] = useState<Promocion[] | null>(null);

  useEffect(() => {
    let cancelado = false;
    apiClient
      .get<Promocion[]>('/promociones')
      .then(({ data }) => {
        if (!cancelado) setPromos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelado) setPromos([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const hoy = new Date().toISOString().slice(0, 10);
  const activas = (promos ?? []).filter((p) => {
    if (p.fecha_fin && p.fecha_fin < hoy) return false;
    if (p.fecha_inicio && p.fecha_inicio > hoy) return false;
    return true;
  });

  return (
    <div className="public-body">
      <PublicHeader />

      <HeroCarousel />

      <section className="promociones">
        <h2>Combos Diarios</h2>
        <p>Disfruta de nuestros combos exclusivos por tiempo limitado.</p>
        <div className="grid-promociones">
          {promos === null ? null : activas.length === 0 ? (
            <p className="promo-vacio">No hay promociones activas en este momento.</p>
          ) : (
            activas.map((promo) => (
              <div className="promo-card-pub" key={promo.id}>
                <div className="promo-img-pub">
                  <img
                    src={promo.imagen || promocionFallback}
                    alt={promo.nombre}
                    onError={(e) => {
                      e.currentTarget.src = promocionFallback;
                    }}
                  />
                  <span className="promo-badge-pub">PROMO</span>
                </div>
                <div className="promo-info-pub">
                  <h3>{promo.nombre}</h3>
                  {promo.descripcion && <p>{promo.descripcion}</p>}
                  {(promo.fecha_inicio || promo.fecha_fin) && (
                    <div className="promo-fechas">
                      {promo.fecha_inicio && <>Desde {promo.fecha_inicio}</>}
                      {promo.fecha_fin && <> hasta {promo.fecha_fin}</>}
                    </div>
                  )}
                  <div className="promo-footer-pub">
                    <div className="promo-precio-pub">
                      {formatCOP(Number(promo.precio))}
                    </div>
                    <Link to="/login" title="Inicia sesión para pedir">
                      <button type="button" className="btn-circular-add btn-login">
                        +
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Footer />
      <Accesibilidad />
    </div>
  );
}
