import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';

interface Recurso {
  recurso: string;
  autor: string;
  fuente: string;
  fecha: string;
  licencia: string;
}

const PROYECTO = 'Equipo del proyecto';

/**
 * Recursos de terceros usados por el aplicativo, con autor, fuente, fecha de
 * publicación y licencia o autorización de uso, tal como exige el checklist.
 */
const RECURSOS: Recurso[] = [
  // Tipografías
  {
    recurso: 'Fuente Atkinson Hyperlegible',
    autor: 'Braille Institute of America',
    fuente: 'Google Fonts (fonts.google.com)',
    fecha: '2020',
    licencia: 'SIL Open Font License 1.1',
  },
  {
    recurso: 'Fuente Plus Jakarta Sans',
    autor: 'Tokotype',
    fuente: 'Google Fonts (fonts.google.com)',
    fecha: '2020',
    licencia: 'SIL Open Font License 1.1',
  },
  {
    recurso: 'Fuente Fraunces',
    autor: 'Undercase Type',
    fuente: 'Google Fonts (fonts.google.com)',
    fecha: '2020',
    licencia: 'SIL Open Font License 1.1',
  },
  {
    recurso: 'Fuente Lato',
    autor: 'Łukasz Dziedzic',
    fuente: 'Google Fonts (fonts.google.com)',
    fecha: '2010',
    licencia: 'SIL Open Font License 1.1',
  },

  // Librerías y frameworks
  {
    recurso: 'React y React DOM',
    autor: 'Meta Platforms, Inc. y comunidad',
    fuente: 'npmjs.com/package/react',
    fecha: '2026',
    licencia: 'MIT',
  },
  {
    recurso: 'React Router',
    autor: 'Remix Software Inc.',
    fuente: 'npmjs.com/package/react-router-dom',
    fecha: '2026',
    licencia: 'MIT',
  },
  {
    recurso: 'Axios',
    autor: 'Matt Zabriskie y colaboradores',
    fuente: 'npmjs.com/package/axios',
    fecha: '2026',
    licencia: 'MIT',
  },
  {
    recurso: 'ExcelJS',
    autor: 'ExcelJS contributors',
    fuente: 'npmjs.com/package/exceljs',
    fecha: '2026',
    licencia: 'MIT',
  },
  {
    recurso: 'jsPDF',
    autor: 'James Hall y colaboradores',
    fuente: 'npmjs.com/package/jspdf',
    fecha: '2026',
    licencia: 'MIT',
  },
  {
    recurso: 'Bootstrap y React Bootstrap',
    autor: 'The Bootstrap Authors',
    fuente: 'npmjs.com/package/bootstrap',
    fecha: '2026',
    licencia: 'MIT',
  },
  {
    recurso: 'Firebase JS SDK',
    autor: 'Google LLC',
    fuente: 'npmjs.com/package/firebase',
    fecha: '2026',
    licencia: 'Apache License 2.0',
  },
  {
    recurso: 'Laravel Echo y Pusher JS',
    autor: 'Laravel LLC / Pusher Ltd.',
    fuente: 'npmjs.com/package/laravel-echo',
    fecha: '2026',
    licencia: 'MIT',
  },
  {
    recurso: 'Lucide (iconos)',
    autor: 'Lucide Contributors',
    fuente: 'npmjs.com/package/lucide-react',
    fecha: '2026',
    licencia: 'ISC',
  },
  {
    recurso: 'lottie-react y @lottiefiles/dotlottie-react',
    autor: 'LottieFiles',
    fuente: 'npmjs.com/package/lottie-react',
    fecha: '2026',
    licencia: 'MIT',
  },
  {
    recurso: 'Vite (empaquetador)',
    autor: 'Evan You y colaboradores',
    fuente: 'npmjs.com/package/vite',
    fecha: '2026',
    licencia: 'MIT',
  },
  {
    recurso: 'TypeScript',
    autor: 'Microsoft Corporation',
    fuente: 'npmjs.com/package/typescript',
    fecha: '2026',
    licencia: 'Apache License 2.0',
  },

  // Recursos gráficos del proyecto
  {
    recurso: 'Logo Burguersoft / El Oriente',
    autor: PROYECTO,
    fuente: 'Creación propia',
    fecha: '2026',
    licencia: 'Uso propio del proyecto',
  },
  {
    recurso: 'Fotografías del carrusel (carrusel-1 a 7)',
    autor: PROYECTO,
    fuente: 'Sesión fotográfica del proyecto',
    fecha: '2026',
    licencia: 'Uso propio del proyecto',
  },
  {
    recurso: 'Imágenes de la sección Nosotros',
    autor: PROYECTO,
    fuente: 'Sesión fotográfica del proyecto',
    fecha: '2026',
    licencia: 'Uso propio del proyecto',
  },
  {
    recurso: 'Iconos de navegación y paneles (PNG/SVG)',
    autor: PROYECTO,
    fuente: 'Creación propia para el aplicativo',
    fecha: '2026',
    licencia: 'Uso propio del proyecto',
  },
  {
    recurso: 'Animación de hamburguesa (hamburguesa.json)',
    autor: PROYECTO,
    fuente: 'Archivo propio incluido en el repositorio',
    fecha: '2026',
    licencia: 'Uso propio del proyecto',
  },

  // Marcas de terceros
  {
    recurso: 'Logos de medios de pago (Nequi, Daviplata, Bancolombia, QR Bre-B)',
    autor: 'Sus respectivos titulares',
    fuente: 'Sitios oficiales de cada marca',
    fecha: '2026',
    licencia: 'Marcas registradas; uso únicamente para identificar el medio de pago',
  },
  {
    recurso: 'Logos de redes sociales (Facebook, Instagram, WhatsApp, Gmail)',
    autor: 'Sus respectivos titulares',
    fuente: 'Sitios oficiales de cada marca',
    fecha: '2026',
    licencia: 'Marcas registradas; uso únicamente para enlazar los canales oficiales',
  },
];

const CELDA = { padding: '8px 10px', borderBottom: '1px solid #ddd' } as const;

export default function Creditos() {
  return (
    <div className="public-body">
      <PublicHeader />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
        <h1>Créditos y licencias</h1>
        <p>
          Recursos de terceros utilizados en el aplicativo de El Oriente (Burguersoft), con su
          autor, fuente, fecha de publicación y licencia o autorización de uso.
        </p>
        <p style={{ fontSize: 13, color: '#6b5a4a', marginTop: -6 }}>
          Última actualización: noviembre de 2026.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table data-sin-acciones style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Recurso', 'Autor', 'Fuente', 'Fecha de publicación', 'Licencia o autorización'].map((t) => (
                  <th
                    key={t}
                    scope="col"
                    style={{ background: '#1a0a00', color: '#fff', textAlign: 'left', padding: '8px 10px' }}
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECURSOS.map((r) => (
                <tr key={r.recurso}>
                  <td style={CELDA}>{r.recurso}</td>
                  <td style={CELDA}>{r.autor}</td>
                  <td style={CELDA}>{r.fuente}</td>
                  <td style={CELDA}>{r.fecha}</td>
                  <td style={CELDA}>{r.licencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
}
