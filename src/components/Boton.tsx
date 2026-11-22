import type { ButtonHTMLAttributes, ReactNode } from 'react';
import {
  ArrowLeft, Check, Download, Eye, Pencil, Plus, Printer, RefreshCw,
  Save, Search, ShoppingCart, Trash2, Upload, X, Eraser, LogOut, FileText,
  FileSpreadsheet, CalendarDays, History, User, ShoppingBag, UtensilsCrossed,
  ScanLine, Mic, CheckCheck, RotateCcw, ChevronLeft, ChevronRight, type LucideIcon,
} from 'lucide-react';

export type VarianteBoton =
  | 'guardar' | 'aceptar' | 'cancelar' | 'volver' | 'editar' | 'eliminar'
  | 'agregar' | 'ver' | 'descargar' | 'imprimir' | 'buscar'
  | 'actualizar' | 'subir' | 'carrito'
  | 'limpiar' | 'salir' | 'pdf' | 'excel' | 'hoy' | 'historial' | 'perfil'
  | 'compras' | 'menu' | 'escanear' | 'dictar' | 'marcarLeidas' | 'restaurar'
  | 'anterior' | 'siguiente';

const VARIANTES: Record<VarianteBoton, { icono: LucideIcon; texto: string; clase: string }> = {
  guardar:    { icono: Save,         texto: 'Guardar',     clase: 'btn-save' },
  aceptar:    { icono: Check,        texto: 'Aceptar',     clase: 'btn-save' },
  cancelar:   { icono: X,            texto: 'Cancelar',    clase: 'btn-cancel' },
  volver:     { icono: ArrowLeft,    texto: 'Volver',      clase: 'btn-cancel' },
  editar:     { icono: Pencil,       texto: 'Editar',      clase: 'mn-btn-edit' },
  eliminar:   { icono: Trash2,       texto: 'Eliminar',    clase: 'btn-cancel' },
  agregar:    { icono: Plus,         texto: 'Agregar',     clase: 'btn-primary' },
  ver:        { icono: Eye,          texto: 'Ver detalle', clase: 'mn-btn-edit' },
  descargar:  { icono: Download,     texto: 'Descargar',   clase: 'btn-primary' },
  imprimir:   { icono: Printer,      texto: 'Imprimir',    clase: 'btn-primary' },
  buscar:     { icono: Search,       texto: 'Buscar',      clase: 'btn-primary' },
  actualizar: { icono: RefreshCw,    texto: 'Actualizar',  clase: 'btn-primary' },
  subir:      { icono: Upload,       texto: 'Subir',       clase: 'btn-primary' },
  carrito:    { icono: ShoppingCart, texto: 'Agregar al carrito', clase: 'btn-primary' },
  limpiar:    { icono: Eraser,          texto: 'Limpiar',            clase: 'btn-cancel' },
  salir:      { icono: LogOut,          texto: 'Cerrar sesión',      clase: 'btn-cancel' },
  pdf:        { icono: FileText,        texto: 'PDF',                clase: 'btn-primary' },
  excel:      { icono: FileSpreadsheet, texto: 'Excel',              clase: 'btn-primary' },
  hoy:        { icono: CalendarDays,    texto: 'Hoy',                clase: 'btn-cancel' },
  historial:  { icono: History,         texto: 'Historial',          clase: 'btn-primary' },
  perfil:     { icono: User,            texto: 'Perfil',             clase: 'btn-primary' },
  compras:    { icono: ShoppingBag,     texto: 'Mis compras',        clase: 'btn-primary' },
  menu:       { icono: UtensilsCrossed, texto: 'Ir al menú',         clase: 'btn-primary' },
  escanear:   { icono: ScanLine,        texto: 'Escanear',           clase: 'btn-primary' },
  dictar:     { icono: Mic,             texto: 'Dictar',             clase: 'btn-primary' },
  marcarLeidas: { icono: CheckCheck,    texto: 'Marcar como leídas', clase: 'btn-primary' },
  restaurar:  { icono: RotateCcw,       texto: 'Restaurar',          clase: 'btn-primary' },
  anterior:   { icono: ChevronLeft,     texto: 'Anterior',           clase: 'btn-cancel' },
  siguiente:  { icono: ChevronRight,    texto: 'Siguiente',          clase: 'btn-cancel' },
};

interface BotonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variante?: VarianteBoton;
  icono?: LucideIcon;
  children?: ReactNode;
  soloIcono?: boolean;
  tamano?: number;
}

export default function Boton({
  variante, icono, children, soloIcono = false, tamano = 16,
  className, ...resto
}: BotonProps) {
  const v = variante ? VARIANTES[variante] : undefined;
  const Icono = icono ?? v?.icono;
  const texto = children ?? v?.texto;
  const etiqueta = typeof texto === 'string' ? texto : resto['aria-label'];
  const clase = `${className ?? v?.clase ?? 'btn-primary'} btn-con-icono`;

  return (
    <button
      data-tooltip={soloIcono ? etiqueta : undefined}
      {...resto}
      className={clase}
      aria-label={soloIcono ? etiqueta : resto['aria-label']}
    >
      {Icono && <Icono size={tamano} aria-hidden="true" />}
      {!soloIcono && texto}
    </button>
  );
}
