import { Package, ShoppingCart, UtensilsCrossed, Headset } from "lucide-react";
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

export const ayudaPorRol: Partial<Record<RolNormalizado, AyudaRol>> = {
  cajero,
};