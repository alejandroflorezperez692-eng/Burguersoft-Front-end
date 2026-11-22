import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  ruta?: string;
  esActual?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  clase?: string;
  inicioLabel?: string;
  inicioRuta?: string;
}

const ETIQUETAS_RUTA: Record<string, string> = {
  '/': 'Inicio',
  '/inicio': 'Inicio',
  '/nosotros': 'Nosotros',
  '/menu-publico': 'Menú',
  '/contactanos': 'Contáctanos',
  '/ayuda': 'Ayuda',
  '/ayuda-cliente': 'Ayuda',
  '/mis-compras': 'Mis compras',
  '/checkout': 'Finalizar compra',
  '/politica-legal': 'Términos y datos personales',
  '/login': 'Iniciar sesión',
  '/registro': 'Crear cuenta',
  '/pedidos-en-vivo': 'Pedidos en vivo',
  '/configuracion': 'Mi perfil',
  '/ayuda-admin': 'Ayuda',
  '/menu': 'Menú',
  '/promociones': 'Promociones',
  '/ventas': 'Ventas',
  '/compras': 'Compras',
  '/materia-prima': 'Materia prima',
  '/inventario': 'Inventario',
  '/cierre-inventario': 'Cierre de inventario',
  '/gestion-proveedores': 'Proveedores',
  '/reportes': 'Reportes',
  '/copias-de-seguridad': 'Copias de seguridad',
  '/usuarios': 'Usuarios',
};

function etiquetaDe(ruta: string): string {
  const conocida = ETIQUETAS_RUTA[ruta];
  if (conocida) return conocida;
  const ultimo = ruta.split('/').filter(Boolean).pop() ?? 'Página';
  return ultimo
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

export default function Breadcrumbs({
  items,
  clase = '',
  inicioLabel = 'Inicio',
  inicioRuta = '/',
}: BreadcrumbsProps) {
  const { pathname } = useLocation();

  const migas: BreadcrumbItem[] = items && items.length > 0
    ? items
    : [{ label: etiquetaDe(pathname), esActual: true }];

  const mostrarInicio = Boolean(inicioLabel && inicioRuta) && pathname !== inicioRuta;
  const soloInicio = pathname === inicioRuta;

  return (
    <nav
      className={`breadcrumbs-wrap ${clase}`}
      aria-label="Ruta de navegación"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 0',
        fontSize: 13,
        color: 'var(--text-500)',
      }}
    >
      {mostrarInicio && (
        <>
          <Link to={inicioRuta} className="breadcrumbs-link">
            {inicioLabel}
          </Link>
          <ChevronRight size={14} className="breadcrumbs-sep" aria-hidden="true" />
        </>
      )}

      {migas.map((miga, indice) => {
        const esUltimo = indice === migas.length - 1;
        const esActual = Boolean(miga.esActual || esUltimo);
        const contenido = miga.label;

        return (
          <span key={`${miga.ruta ?? miga.label}-${indice}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {!esActual && miga.ruta ? (
              <Link to={miga.ruta} className="breadcrumbs-link">
                {contenido}
              </Link>
            ) : (
              <span className="breadcrumbs-actual" aria-current={soloInicio || esActual ? 'page' : undefined}>
                {contenido}
              </span>
            )}
            {!esUltimo && <ChevronRight size={14} className="breadcrumbs-sep" aria-hidden="true" />}
          </span>
        );
      })}
    </nav>
  );
}
