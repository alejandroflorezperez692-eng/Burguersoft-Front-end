import { Package, ShoppingCart, UtensilsCrossed, Headset, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RolNormalizado } from "./roles";

export type Articulo = {
  titulo: string;
  contenido: string;
};

export type Categoria = {
  id: string;
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  articulos: Articulo[];
};

export type Pregunta = {
  pregunta: string;
  respuesta: string;
};

export type AyudaRol = {
  categorias: Categoria[];
  preguntas: Pregunta[];
};

const cajero: AyudaRol = {
  categorias: [
    {
      id: "ventas",
      titulo: "Ventas y pedidos",
      descripcion: "Cobros y seguimiento",
      icono: ShoppingCart,
      articulos: [
        {
          titulo: "Registrar una venta",
          contenido:
            "Entra a Ventas, selecciona los productos del pedido, confirma el método de pago y guarda la operación.",
        },
        {
          titulo: "Seguir los pedidos en vivo",
          contenido:
            "En Pedidos puedes ver el estado de cada pedido y cambiarlo cuando avance a la cocina o se sirva.",
        },
        {
          titulo: "Consultar el detalle de una venta",
          contenido:
            "Haz clic sobre cualquier venta de la lista para ver sus productos, total, estado y fecha.",
        },
      ],
    },
    {
      id: "menu",
      titulo: "Menú y promociones",
      descripcion: "Productos disponibles",
      icono: UtensilsCrossed,
      articulos: [
        {
          titulo: "Consultar el menú",
          contenido:
            "En el módulo Menú puedes ver los productos disponibles y sus precios para atender a los clientes.",
        },
        {
          titulo: "Revisar las promociones",
          contenido:
            "En Promociones verás las ofertas activas y las fechas en que aplican.",
        },
      ],
    },
    {
      id: "inventario",
      titulo: "Compras e inventario",
      descripcion: "Insumos y existencias",
      icono: Package,
      articulos: [
        {
          titulo: "Registrar una compra",
          contenido:
            "En Compras elige el proveedor, agrega los insumos con sus cantidades y guarda la compra.",
        },
        {
          titulo: "Revisar la materia prima",
          contenido:
            "En Materia prima puedes ver las existencias y cuáles insumos están por agotarse.",
        },
        {
          titulo: "Hacer el cierre de inventario",
          contenido:
            "En Cierre de inventario registra las cantidades contadas al final del día y guarda el cierre.",
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
          titulo: "Problemas para iniciar sesión",
          contenido:
            "Usa la opción de recuperar contraseña en la pantalla de login y sigue los pasos que llegan a tu correo.",
        },
      ],
    },
  ],
  preguntas: [
    {
      pregunta: "¿Cómo registrar una venta?",
      respuesta:
        "Entra a Ventas, selecciona los productos, confirma el método de pago y guarda.",
    },
    {
      pregunta: "¿Cómo ver los pedidos en vivo?",
      respuesta:
        "Abre el módulo Pedidos para ver el estado de cada pedido y actualizarlo.",
    },
    {
      pregunta: "¿Cómo registrar una compra?",
      respuesta:
        "En Compras elige el proveedor, agrega los insumos con sus cantidades y guarda la compra.",
    },
    {
      pregunta: "¿Cómo hacer el cierre de inventario?",
      respuesta:
        "Entra a Cierre de inventario, registra las cantidades contadas y guarda el cierre.",
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
  ],
};

const cocinero: AyudaRol = {
  categorias: [
    {
      id: "pedidos",
      titulo: "Pedidos en cocina",
      descripcion: "Preparación y estados",
      icono: ClipboardList,
      articulos: [
              {
          titulo: "Cambiar el estado de un pedido",
          contenido:
            "Marca el pedido como En preparación cuando empieces y como Preparado cuando esté listo para servir.",
        },

      ],
    },
    {
      id: "inventario",
      titulo: "Inventario e insumos",
      descripcion: "Existencias y compras",
      icono: Package,
      articulos: [
        {
          titulo: "Revisar la materia prima",
          contenido:
            "En Materia prima puedes ver las existencias y cuáles insumos están por agotarse.",
        },
        {
          titulo: "Consultar el inventario",
          contenido:
            "En Inventario revisa las cantidades disponibles de cada producto.",
        },
        {
          titulo: "Registrar una compra",
          contenido:
            "En Compras elige el proveedor, agrega los insumos con sus cantidades y guarda la compra.",
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
          titulo: "Problemas para iniciar sesión",
          contenido:
            "Usa la opción de recuperar contraseña en la pantalla de login y sigue los pasos que llegan a tu correo.",
        },
      ],
    },
  ],
  preguntas: [
    {
      pregunta: "¿Cómo ver los pedidos pendientes?",
      respuesta:
        "Abre el módulo Pedidos para ver los pedidos que llegan y sus productos.",
    },
    {
      pregunta: "¿Cómo marcar un pedido como preparado?",
      respuesta:
        "En Pedidos cambia el estado a En preparación al empezar y a Preparado cuando termines.",
    },
    {
      pregunta: "¿Cómo revisar la materia prima?",
      respuesta:
        "Entra a Materia prima para ver las existencias y los insumos por agotarse.",
    },
    {
      pregunta: "¿Cómo registrar una compra?",
      respuesta:
        "En Compras elige el proveedor, agrega los insumos con sus cantidades y guarda la compra.",
    },
    {
      pregunta: "¿Cómo hacer el cierre de inventario?",
      respuesta:
        "Entra a Cierre de inventario, registra las cantidades contadas y guarda el cierre.",
    },
    {
      pregunta: "¿Qué hacer si no puedo iniciar sesión?",
      respuesta:
        "Usa la opción de recuperar contraseña en el login y sigue los pasos que llegan a tu correo.",
    },
  ],
};
const mesero: AyudaRol = {
  categorias: [
    {
      id: "pedidos",
      titulo: "Pedidos",
      descripcion: "Atención y seguimiento",
      icono: ClipboardList,
      articulos: [
        {
          titulo: "Seguir los pedidos en vivo",
          contenido:
            "En Pedidos puedes ver el estado de cada pedido y saber cuándo está listo para servir.",
        },
        {
          titulo: "Marcar un pedido como servido",
          contenido:
            "Cuando entregues el pedido en la mesa, cambia su estado a Servido desde el módulo Pedidos.",
        },
      ],
    },
    {
      id: "ventas",
      titulo: "Ventas",
      descripcion: "Registro de operaciones",
      icono: ShoppingCart,
      articulos: [
        {
          titulo: "Registrar una venta",
          contenido:
            "Entra a Ventas, selecciona los productos del pedido, confirma el método de pago y guarda la operación.",
        },
        {
          titulo: "Consultar el detalle de una venta",
          contenido:
            "Haz clic sobre cualquier venta de la lista para ver sus productos, total, estado y fecha.",
        },
      ],
    },
    {
      id: "menu",
      titulo: "Menú y promociones",
      descripcion: "Productos disponibles",
      icono: UtensilsCrossed,
      articulos: [
        {
          titulo: "Consultar el menú",
          contenido:
            "En el módulo Menú puedes ver los productos disponibles y sus precios para atender a los clientes.",
        },
        {
          titulo: "Revisar las promociones",
          contenido:
            "En Promociones verás las ofertas activas y las fechas en que aplican.",
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
          titulo: "Problemas para iniciar sesión",
          contenido:
            "Usa la opción de recuperar contraseña en la pantalla de login y sigue los pasos que llegan a tu correo.",
        },
      ],
    },
  ],
  preguntas: [
    {
      pregunta: "¿Cómo ver los pedidos en vivo?",
      respuesta: "Abre el módulo Pedidos para ver el estado de cada pedido.",
    },
    {
      pregunta: "¿Cómo marcar un pedido como servido?",
      respuesta:
        "En Pedidos cambia el estado a Servido cuando entregues el pedido en la mesa.",
    },
    {
      pregunta: "¿Cómo registrar una venta?",
      respuesta:
        "Entra a Ventas, selecciona los productos, confirma el método de pago y guarda.",
    },
    {
      pregunta: "¿Cómo consultar las ventas?",
      respuesta:
        "En el módulo Ventas verás el listado de operaciones; haz clic en una para ver su detalle.",
    },
    {
      pregunta: "¿Cómo consultar el menú?",
      respuesta:
        "Entra al módulo Menú para ver los productos disponibles y sus precios.",
    },
    {
      pregunta: "¿Qué hacer si no puedo iniciar sesión?",
      respuesta:
        "Usa la opción de recuperar contraseña en el login y sigue los pasos que llegan a tu correo.",
    },
  ],
};
export const ayudaPorRol: Partial<Record<RolNormalizado, AyudaRol>> = {
  cajero,
  cocinero,
  mesero,
};