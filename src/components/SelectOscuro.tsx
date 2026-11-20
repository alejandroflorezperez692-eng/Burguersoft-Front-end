import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import '../styles/select-oscuro.css';
import '../styles/select-claro.css';



type Opcion = { value: string; label: string; disabled: boolean };

type SelectOscuroProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Muestra un campo de búsqueda dentro de la lista desplegable. */
  searchable?: boolean;
  searchPlaceholder?: string;
};

type Panel = {
  left: number;
  minWidth: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
  fontSize: string;
  fontFamily: string;
};


const CONSULTA_PUNTERO = '(any-pointer: fine)';


function textoDe(nodo: ReactNode): string {
  if (nodo == null || typeof nodo === 'boolean') return '';
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(textoDe).join('');
  if (isValidElement(nodo)) return textoDe((nodo.props as { children?: ReactNode }).children);
  return '';
}

function extraerOpciones(hijos: ReactNode, salida: Opcion[] = []): Opcion[] {
  Children.forEach(hijos, (hijo) => {
    if (!isValidElement(hijo)) return;
    const props = hijo.props as {
      value?: string | number | readonly string[];
      disabled?: boolean;
      hidden?: boolean;
      children?: ReactNode;
    };
    if (hijo.type === 'option') {
      if (props.hidden) return;
      const label = textoDe(props.children);
      salida.push({
        value: props.value !== undefined ? String(props.value) : label,
        label,
        disabled: !!props.disabled,
      });
    } else if (hijo.type === 'optgroup' || hijo.type === Fragment) {
      extraerOpciones(props.children, salida);
    }
  });
  return salida;
}

export default function SelectOscuro(props: SelectOscuroProps) {
  const { children, className, onMouseDown, onKeyDown, searchable, searchPlaceholder, ...resto } = props;

  const [punteroFino] = useState(() => window.matchMedia(CONSULTA_PUNTERO).matches);
  const personalizado = punteroFino;

  const selectRef = useRef<HTMLSelectElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const buscarRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [activo, setActivo] = useState(-1);
  const [busqueda, setBusqueda] = useState('');
  const desplazarRef = useRef(false);

  const cerrar = useCallback(() => {
    setPanel(null);
    setBusqueda('');
  }, []);

  const abrir = () => {
    const el = selectRef.current;
    if (!el || el.disabled) return;
    const opciones = extraerOpciones(children);
    if (opciones.length === 0) return;

    const r = el.getBoundingClientRect();
    const estilo = getComputedStyle(el);
    const abajo = window.innerHeight - r.bottom - 10;
    const arriba = r.top - 10;
    const abrirArriba = abajo < 160 && arriba > abajo;

    setPanel({
      left: r.left,
      minWidth: r.width,
      top: abrirArriba ? undefined : r.bottom + 3,
      bottom: abrirArriba ? window.innerHeight - r.top + 3 : undefined,
      maxHeight: Math.max(140, Math.min(280, abrirArriba ? arriba : abajo)),
      fontSize: estilo.fontSize,
      fontFamily: estilo.fontFamily,
    });
    setBusqueda('');

    const actual = opciones.findIndex((o) => o.value === el.value);
    desplazarRef.current = true;
    setActivo(actual >= 0 ? actual : opciones.findIndex((o) => !o.disabled));
  };

  const elegir = (opcion: Opcion) => {
    const el = selectRef.current;
    if (!el || opcion.disabled) return;
    cerrar();
    if (el.value !== opcion.value) {
    
      el.value = opcion.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    el.focus();
  };

 
  useEffect(() => {
    if (!panel) return;
    const clicFuera = (e: MouseEvent) => {
      const destino = e.target as Node;
      if (listaRef.current?.contains(destino) || selectRef.current?.contains(destino)) return;
      cerrar();
    };
    const scrollFuera = (e: Event) => {
      if (listaRef.current && e.target instanceof Node && listaRef.current.contains(e.target)) return;
      cerrar();
    };
    document.addEventListener('mousedown', clicFuera);
    window.addEventListener('scroll', scrollFuera, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', clicFuera);
      window.removeEventListener('scroll', scrollFuera, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [panel, cerrar]);


  useEffect(() => {
    if (!personalizado) setPanel(null);
  }, [personalizado]);

 
  useEffect(() => {
    if (!panel || !desplazarRef.current) return;
    desplazarRef.current = false;
    listaRef.current
      ?.querySelector<HTMLElement>('[data-so-activa="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [panel, activo]);

  useEffect(() => {
    if (panel && searchable) {
      buscarRef.current?.focus();
    }
  }, [panel, searchable]);

  if (!personalizado) {
    return <select {...props}>{children}</select>;
  }

  const alPresionar = (e: ReactMouseEvent<HTMLSelectElement>) => {
    onMouseDown?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.currentTarget.disabled) return;
  
    e.preventDefault();
    e.currentTarget.focus();
    if (panel) cerrar();
    else abrir();
  };

  const alTeclear = (e: ReactKeyboardEvent<HTMLSelectElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    if (!panel) {
      if (e.key === 'Enter' || e.key === ' ' || (e.altKey && e.key === 'ArrowDown')) {
        e.preventDefault();
        abrir();
      }
      return;
    }

    const opciones = extraerOpciones(children);
    const mover = (paso: 1 | -1) => {
      let i = activo;
      for (let n = 0; n < opciones.length; n += 1) {
        i = (i + paso + opciones.length) % opciones.length;
        if (!opciones[i].disabled) {
          desplazarRef.current = true;
          setActivo(i);
          return;
        }
      }
    };

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        mover(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        mover(-1);
        break;
      case 'Home':
        e.preventDefault();
        desplazarRef.current = true;
        setActivo(opciones.findIndex((o) => !o.disabled));
        break;
      case 'End':
        e.preventDefault();
        desplazarRef.current = true;
        setActivo(opciones.map((o) => o.disabled).lastIndexOf(false));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (opciones[activo]) elegir(opciones[activo]);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        cerrar();
        break;
      case 'Tab':
        cerrar();
        break;
      default:
        break;
    }
  };

  const opciones = panel ? extraerOpciones(children) : [];
  const normalizarTexto = (texto: string) =>
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const filtro = normalizarTexto(busqueda.trim());
  const visibles = filtro
    ? opciones.filter((opcion) => normalizarTexto(opcion.label).includes(filtro))
    : opciones;
  const valorActual = selectRef.current?.value;

  const moverVisible = (paso: 1 | -1) => {
    if (visibles.length === 0) return;
    let i = activo;
    for (let n = 0; n < visibles.length; n += 1) {
      i = (i + paso + visibles.length) % visibles.length;
      if (!visibles[i]?.disabled) {
        desplazarRef.current = true;
        setActivo(i);
        return;
      }
    }
  };

  const alBuscarTecla = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cerrar();
      selectRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moverVisible(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moverVisible(-1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const opcion = visibles[activo];
      if (opcion) elegir(opcion);
      return;
    }
    if (e.key === 'Tab') cerrar();
  };

  return (
    <>
      <select
        {...resto}
        ref={selectRef}
        className={className ? `${className} so-select` : 'so-select'}
        onMouseDown={alPresionar}
        onKeyDown={alTeclear}
        aria-haspopup="listbox"
        aria-expanded={panel !== null}
      >
        {children}
      </select>
      {panel &&
        createPortal(
          <div
            ref={listaRef}
            className="so-lista"
            role="listbox"
            style={{
              left: panel.left,
              top: panel.top,
              bottom: panel.bottom,
              minWidth: panel.minWidth,
              maxWidth: `min(340px, calc(100vw - ${Math.round(panel.left)}px - 12px))`,
              maxHeight: panel.maxHeight,
              fontSize: panel.fontSize,
              fontFamily: panel.fontFamily,
            }}
             
            onMouseDown={(e) => {
              if (e.target instanceof HTMLElement && e.target.tagName === 'INPUT') return;
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {searchable && (
              <div className="so-buscar-caja">
                <input
                  ref={buscarRef}
                  type="search"
                  className="so-buscar"
                  value={busqueda}
                  placeholder={searchPlaceholder ?? 'Buscar…'}
                  aria-label={searchPlaceholder ?? 'Buscar en la lista'}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setBusqueda(valor);
                    const f = normalizarTexto(valor.trim());
                    const lista = f
                      ? opciones.filter((opcion) => normalizarTexto(opcion.label).includes(f))
                      : opciones;
                    setActivo(lista.findIndex((opcion) => !opcion.disabled));
                    desplazarRef.current = true;
                  }}
                  onKeyDown={alBuscarTecla}
                />
              </div>
            )}
            {visibles.length === 0 && <div className="so-vacio">Sin resultados</div>}
            {visibles.map((opcion, i) => (
              <div
                key={`${opcion.value}-${i}`}
                className={`so-opcion${i === activo ? ' so-activa' : ''}`}
                role="option"
                aria-selected={opcion.value === valorActual}
                aria-disabled={opcion.disabled || undefined}
                data-so-activa={i === activo}
                onMouseEnter={() => !opcion.disabled && setActivo(i)}
                onClick={() => elegir(opcion)}
              >
                {opcion.label}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
