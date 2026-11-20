import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Database, Server, ShieldCheck, Wrench, GitBranch } from 'lucide-react';
import '../../styles/manual-programador.css';

const endpoints: Array<[string, string, string]> = [
  ['POST', '/api/login', 'Inicia sesión y devuelve el token Sanctum.'],
  ['POST', '/api/registro', 'Crea una cuenta de cliente en estado Inactivo.'],
  ['GET', '/api/user', 'Devuelve el usuario autenticado.'],
  ['GET', '/api/productos', 'Catálogo de productos (filtro ?todos=1).'],
  ['GET', '/api/promociones', 'Promociones vigentes.'],
  ['GET', '/api/ventas', 'Ventas con detalle, pagos y cliente.'],
  ['GET', '/api/compras', 'Compras y detalle de insumos.'],
  ['GET', '/api/reportes', 'Resumen de ventas, compras y márgenes.'],
  ['GET', '/api/catalogos/departamentos', 'Catálogo de departamentos.'],
  ['GET', '/api/catalogos/municipios', 'Municipios, filtrable por departamento_id.'],
  ['GET', '/api/catalogos/eps', 'Catálogo de EPS.'],
  ['POST', '/api/contacto', 'Formulario público de Contáctanos.'],
];

const tablas: Array<[string, string]> = [
  ['users', 'Usuarios y roles (admin, cajero, cocinero, mesero, cliente).'],
  ['products', 'Productos del menú y adiciones.'],
  ['promotions', 'Promociones y combos.'],
  ['raw_materials / brands', 'Insumos y proveedores.'],
  ['recipes', 'Receta de cada producto (insumo y cantidad).'],
  ['purchases / purchase_details', 'Compras a proveedores.'],
  ['sales / sale_details / sale_payments', 'Ventas, detalle y pagos.'],
  ['inventory_closings', 'Cierres de inventario y diferencias.'],
  ['mesas', 'Mesas y mesero asignado.'],
  ['departamentos / municipios / eps', 'Catálogos geográficos y de salud.'],
  ['contactos', 'Mensajes recibidos desde el sitio público.'],
];

const modulos: Array<{
  icono: typeof Server;
  titulo: string;
  items: string[];
}> = [
  {
    icono: Server,
    titulo: 'Backend (Laravel 11 + Sanctum)',
    items: [
      'Controladores en app/Http/Controllers/Api. Cada módulo tiene su controlador.',
      'Rutas agrupadas por middleware: auth:sanctum, activo y role.',
      'Validaciones con $request->validate; errores 422 con mensajes en español.',
      'Servicios de apoyo en app/Services (recibos, bitácora, verificación).',
    ],
  },
  {
    icono: Database,
    titulo: 'Base de datos (MySQL)',
    items: [
      'Migraciones en database/migrations; nunca editar una ya ejecutada.',
      'Los catálogos maestros usan eliminación lógica (deleted_at).',
      'Las ventas conservan copia del nombre y precio al momento de vender.',
      'Ejecutar php artisan migrate --seed para crear catálogos base.',
    ],
  },
  {
    icono: ShieldCheck,
    titulo: 'Seguridad y roles',
    items: [
      'Token Sanctum en el header Authorization: Bearer <token>.',
      'El middleware activo bloquea usuarios Inactivos o Suspendidos.',
      'El registro abierto crea clientes Inactivos: un admin los activa.',
      'Captcha local de un solo uso en login, registro y contacto.',
    ],
  },
  {
    icono: Wrench,
    titulo: 'Frontend (React 19 + TypeScript + Vite)',
    items: [
      'Páginas en src/pages, componentes reutilizables en src/components.',
      'Rutas protegidas con ProtectedRoute y ACCESO en src/utils/roles.ts.',
      'SelectOscuro acepta la prop searchable para listas largas.',
      'La barra PDF/Excel/Copiar/Imprimir se inyecta automáticamente en cada tabla.',
    ],
  },
];

export default function ManualProgramador() {
  return (
    <div className="manual-page">
      <header className="manual-hero">
        <Link to="/inicio" className="manual-volver">
          <ArrowLeft size={16} aria-hidden="true" /> Volver al inicio
        </Link>
        <div className="manual-hero-texto">
          <span className="manual-etiqueta">Documentación técnica</span>
          <h1>Manual del programador</h1>
          <p>
            Guía interna de Burguersoft para mantener, extender y desplegar el sistema.
            Visible únicamente para el rol Administrador.
          </p>
        </div>
        <BookOpen size={52} aria-hidden="true" className="manual-hero-icono" />
      </header>

      <section className="manual-grid">
        {modulos.map(({ icono: Icono, titulo, items }) => (
          <article key={titulo} className="manual-card">
            <div className="manual-card-titulo">
              <Icono size={20} aria-hidden="true" />
              <h2>{titulo}</h2>
            </div>
            <ul>
              {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </section>

      <section className="manual-bloque">
        <h2><GitBranch size={20} aria-hidden="true" /> Flujo de trabajo recomendado</h2>
        <ol>
          <li>Crear una rama por funcionalidad: <code>feature/nombre-corto</code>.</li>
          <li>Backend: agregar migración, modelo, controlador y ruta; luego <code>php artisan test</code>.</li>
          <li>Frontend: crear la página o componente, tipar props y validar con <code>npx tsc --noEmit</code>.</li>
          <li>Probar en local con <code>npm run dev</code> y el backend en <code>php artisan serve</code>.</li>
          <li>Verificar roles: admin, cajero, cocinero, mesero y cliente.</li>
          <li>Hacer commit con mensaje claro y abrir el pull request.</li>
        </ol>
      </section>

      <section className="manual-bloque">
        <h2>Endpoints principales</h2>
        <div className="manual-tabla-wrap">
          <table>
            <thead>
              <tr><th>Método</th><th>Ruta</th><th>Descripción</th></tr>
            </thead>
            <tbody>
              {endpoints.map(([metodo, ruta, descripcion]) => (
                <tr key={ruta + metodo}>
                  <td><span className={`manual-metodo metodo-${metodo.toLowerCase()}`}>{metodo}</span></td>
                  <td><code>{ruta}</code></td>
                  <td>{descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="manual-bloque">
        <h2>Tablas clave</h2>
        <div className="manual-tabla-wrap">
          <table>
            <thead>
              <tr><th>Tabla</th><th>Uso</th></tr>
            </thead>
            <tbody>
              {tablas.map(([tabla, uso]) => (
                <tr key={tabla}>
                  <td><code>{tabla}</code></td>
                  <td>{uso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="manual-bloque">
        <h2>Comandos útiles</h2>
        <pre className="manual-codigo">{`# Backend
php artisan migrate --seed
php artisan test
php artisan route:list --path=api

# Frontend
npm install
npm run dev
npx tsc --noEmit
npx oxlint`}</pre>
      </section>

      <aside className="manual-aviso">
        <ShieldCheck size={20} aria-hidden="true" />
        <p>
          Este manual contiene detalles internos. No lo compartas con clientes ni con
          personal que no sea administrador. Si detectas un problema de seguridad,
          repórtalo de inmediato al responsable técnico.
        </p>
      </aside>
    </div>
  );
}
