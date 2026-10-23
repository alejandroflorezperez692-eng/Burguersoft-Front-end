import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LifeBuoy,
  Search,
  Package,
  ShoppingCart,
  Users,
  Headset,
  ArrowRight,
  ArrowLeft,
  FileText,
  ChevronDown,
  CircleHelp,
  Mail,
} from "lucide-react";
import "../../styles/ayuda-admin.css";

type Articulo = {
  titulo: string;
  contenido: string;
};

type Categoria = {
  id: string;
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  articulos: Articulo[];
};

type Pregunta = {
  pregunta: string;
  respuesta: string;
};

const CORREO_SOPORTE = "burguersoft@gmail.com";

const categorias: Categoria[] = [
  {
    id: "inventario",
    titulo: "Inventario",
    descripcion: "Productos y existencias",
    icono: Package,
    articulos: [
      {
        titulo: "Registrar un producto",
        contenido:
          "Ve al módulo Menú, pulsa en agregar producto, completa nombre, precio y categoría, y guarda los cambios.",
      },
      {
        titulo: "Editar o desactivar un producto",
        contenido:
          "Desde la lista de productos usa el botón de editar para cambiar sus datos, o desactívalo para que no aparezca en el menú.",
      },
      {
        titulo: "Controlar la materia prima",
        contenido:
          "En Materia prima puedes registrar insumos, revisar existencias y ver cuáles están por agotarse.",
      },
    ],
  },
  {
    id: "ventas",
    titulo: "Ventas y compras",
    descripcion: "Registro de operaciones",
    icono: ShoppingCart,
    articulos: [
      {
        titulo: "Registrar una venta",
        contenido:
          "Entra a Ventas, selecciona los productos del pedido, confirma el método de pago y guarda la operación.",
      },
      {
        titulo: "Registrar una compra a proveedor",
        contenido:
          "En Compras agrega el proveedor, los insumos comprados y las cantidades; las existencias se actualizan solas.",
      },
      {
        titulo: "Consultar el detalle de una operación",
        contenido:
          "Haz clic sobre cualquier venta o compra de la lista para ver sus productos, totales y fecha.",
      },
    ],
  },
  {
    id: "usuarios",
    titulo: "Usuarios",
    descripcion: "Cuentas y permisos",
    icono: Users,
    articulos: [
      {
        titulo: "Crear una cuenta de usuario",
        contenido:
          "En el módulo Usuarios pulsa en nuevo usuario, ingresa sus datos y asígnale un rol.",
      },
      {
        titulo: "Cambiar el rol de un usuario",
        contenido:
          "Edita el usuario y selecciona el rol que corresponda: administrador o cliente.",
      },
      {
        titulo: "Desactivar una cuenta",
        contenido:
          "Desde la lista de usuarios puedes desactivar una cuenta sin borrar su historial.",
      },
    ],
  },
  {
    id: "soporte",
    titulo: "Soporte técnico",
    descripcion: "Reportar inconvenientes",
    icono: Headset,
    articulos: [
      {
        titulo: "Reportar un problema",
        contenido:
          "Describe qué estabas haciendo, qué esperabas que pasara y qué ocurrió. Adjunta una captura si es posible.",
      },
      {
        titulo: "Copias de seguridad",
        contenido:
          "En Copias de seguridad puedes generar y descargar un respaldo de la información del sistema.",
      },
      {
        titulo: "Problemas para iniciar sesión",
        contenido:
          "Usa la opción de recuperar contraseña en la pantalla de login y sigue los pasos que llegan a tu correo.",
      },
    ],
  },
];

const preguntas: Pregunta[] = [
  {
    pregunta: "¿Cómo registrar un producto?",
    respuesta:
      "Entra al módulo Menú, pulsa en agregar producto, completa los datos y guarda.",
  },
  {
    pregunta: "¿Cómo registrar una compra?",
    respuesta:
      "En el módulo Compras elige el proveedor, agrega los insumos con sus cantidades y guarda la compra.",
  },
  {
    pregunta: "¿Cómo modificar el inventario?",
    respuesta:
      "Abre Materia prima, selecciona el insumo y edita sus existencias o registra una nueva compra.",
  },
  {
    pregunta: "¿Cómo gestionar los usuarios?",
    respuesta:
      "Desde el módulo Usuarios puedes crear cuentas, cambiar roles y desactivar usuarios.",
  },
  {
    pregunta: "¿Cómo consultar las ventas?",
    respuesta:
      "En el módulo Ventas verás el listado de operaciones; haz clic en una para ver su detalle.",
  },
  {
    pregunta: "¿Qué hacer si no puedo iniciar sesión?",
    respuesta:
      "Usa la opción de recuperar contraseña en el login y sigue los pasos que llegan a tu correo.",
  },
  {
    pregunta: "¿Cómo cambiar una contraseña?",
    respuesta:
      "Cierra sesión, entra a recuperar contraseña e ingresa el código que recibirás por correo.",
  },
  {
    pregunta: "¿Cómo generar un reporte?",
    respuesta:
      "Consulta el módulo de Ventas o Compras y usa los filtros de fecha para ver el resumen del periodo.",
  },
  {
    pregunta: "¿Cómo crear una promoción?",
    respuesta:
      "En el módulo Promociones pulsa en nueva promoción, define el producto, el descuento y las fechas.",
  },
  {
    pregunta: "¿Cómo hacer una copia de seguridad?",
    respuesta:
      "Entra a Copias de seguridad y pulsa en generar respaldo; luego podrás descargarlo.",
  },
  {
    pregunta: "¿Cómo desactivar un producto?",
    respuesta:
      "En el módulo Menú edita el producto y desactívalo para que deje de mostrarse a los clientes.",
  },
  {
    pregunta: "¿Cómo cambiar el rol de un usuario?",
    respuesta:
      "En Usuarios edita la cuenta y elige el nuevo rol en el selector correspondiente.",
  },
];

const PREGUNTAS_VISIBLES = 8;

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const AyudaAdmin = () => {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [preguntaAbierta, setPreguntaAbierta] = useState<string | null>(null);
  const [verTodas, setVerTodas] = useState(false);

  const consulta = normalizar(busqueda.trim());
  const estaBuscando = consulta.length > 0;

  const resultados = useMemo(() => {
    if (!consulta) return [];

    const deArticulos = categorias.flatMap((categoria) =>
      categoria.articulos
        .filter((a) =>
          normalizar(`${a.titulo} ${a.contenido}`).includes(consulta)
        )
        .map((a) => ({
          etiqueta: categoria.titulo,
          titulo: a.titulo,
          contenido: a.contenido,
        }))
    );

    const dePreguntas = preguntas
      .filter((p) =>
        normalizar(`${p.pregunta} ${p.respuesta}`).includes(consulta)
      )
      .map((p) => ({
        etiqueta: "Pregunta frecuente",
        titulo: p.pregunta,
        contenido: p.respuesta,
      }));

    return [...deArticulos, ...dePreguntas];
  }, [consulta]);

  const categoriaSeleccionada = categorias.find((c) => c.id === categoriaActiva);
  const preguntasVisibles = verTodas
    ? preguntas
    : preguntas.slice(0, PREGUNTAS_VISIBLES);

  const manejarBusqueda = (e: FormEvent) => {
    e.preventDefault();
  };

  const alternarPregunta = (pregunta: string) => {
    setPreguntaAbierta((actual) => (actual === pregunta ? null : pregunta));
  };

  return (
    <div className="page-inner">
      <div className="ayuda-pagina">
        <div className="ayuda-encabezado">
          <LifeBuoy size={40} className="ayuda-encabezado-icono" />
          <div>
            <h1>Centro de ayuda</h1>
            <p>¿En qué podemos ayudarte?</p>
          </div>
        </div>

        <form className="ayuda-buscador" onSubmit={manejarBusqueda}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar una solución..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setCategoriaActiva(null);
            }}
          />
          <button type="submit" className="ayuda-boton-buscar">
            <Search size={16} />
            Buscar
          </button>
        </form>

        {estaBuscando ? (
          <div className="ayuda-panel">
            <h2>Resultados</h2>
            {resultados.length === 0 ? (
              <p className="ayuda-vacio">
                No encontramos resultados para "{busqueda}".
              </p>
            ) : (
              resultados.map((r) => (
                <div className="ayuda-articulo" key={`${r.etiqueta}-${r.titulo}`}>
                  <span className="ayuda-etiqueta">{r.etiqueta}</span>
                  <h4>{r.titulo}</h4>
                  <p>{r.contenido}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {categoriaSeleccionada ? (
              <div className="ayuda-panel">
                <button
                  className="ayuda-volver"
                  onClick={() => setCategoriaActiva(null)}
                >
                  <ArrowLeft size={18} />
                  Volver
                </button>
                <h2>{categoriaSeleccionada.titulo}</h2>
                {categoriaSeleccionada.articulos.map((a) => (
                  <div className="ayuda-articulo" key={a.titulo}>
                    <h4>{a.titulo}</h4>
                    <p>{a.contenido}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ayuda-categorias">
                {categorias.map((categoria) => {
                  const Icono = categoria.icono;
                  return (
                    <button
                      key={categoria.id}
                      className="ayuda-categoria"
                      onClick={() => setCategoriaActiva(categoria.id)}
                    >
                      <Icono size={38} className="ayuda-categoria-icono" />
                      <div className="ayuda-categoria-texto">
                        <h3>{categoria.titulo}</h3>
                        <p>{categoria.descripcion}</p>
                      </div>
                      <span className="ayuda-flecha">
                        <ArrowRight size={16} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <section className="ayuda-faq">
              <div className="ayuda-faq-cabecera">
                <div className="ayuda-faq-titulo">
                  <span className="ayuda-faq-icono">
                    <FileText size={20} />
                  </span>
                  <div>
                    <h2>Preguntas frecuentes</h2>
                    <p>Encuentra respuestas rápidas a las dudas más comunes.</p>
                  </div>
                </div>
                <button
                  className="ayuda-boton-borde"
                  onClick={() => setVerTodas((v) => !v)}
                >
                  {verTodas ? "Ver menos preguntas" : "Ver todas las preguntas"}
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="ayuda-faq-grid">
                {preguntasVisibles.map((p) => {
                  const abierta = preguntaAbierta === p.pregunta;
                  return (
                    <div
                      key={p.pregunta}
                      className={`ayuda-pregunta ${abierta ? "abierta" : ""}`}
                    >
                      <button
                        className="ayuda-pregunta-boton"
                        aria-expanded={abierta}
                        onClick={() => alternarPregunta(p.pregunta)}
                      >
                        {p.pregunta}
                        <ChevronDown size={18} />
                      </button>
                      {abierta && <div className="ayuda-respuesta">{p.respuesta}</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <section className="ayuda-soporte">
          <div className="ayuda-soporte-info">
            <CircleHelp size={40} />
            <div>
              <h3>¿No encuentras lo que necesitas?</h3>
              <p>
                Si tu problema no está en las preguntas frecuentes, puedes
                reportarlo al equipo de soporte.
              </p>
            </div>
          </div>
          <a
        className="ayuda-boton-reportar"
         href={`https://mail.google.com/mail/?view=cm&fs=1&to=${CORREO_SOPORTE}&su=${encodeURIComponent("Reporte de problema - BurgerSoft")}`}
        target="_blank"
         rel="noopener noreferrer"
         >
            <Mail size={18} />
            Reportar un problema
            <ArrowRight size={16} />
          </a>
        </section>
      </div>
    </div>
  );
};

export default AyudaAdmin;