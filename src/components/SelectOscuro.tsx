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

export default function SelectOscuro(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { children, className, onMouseDown, onKeyDown, ...resto } = props;

  const [punteroFino] = useState(() => window.matchMedia(CONSULTA_PUNTERO).matches);
  // Lista personalizada en modo claro y oscuro (con puntero fino).
  // Los colores de cada modo viven en select-claro.css / select-oscuro.css.
  const personalizado = punteroFino;

  const selectRef = useRef<HTMLSelectElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [activo, setActivo] = useState(-1);
  const desplazarRef = useRef(false);

  const cerrar = useCallback(() => setPanel(null), []);

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
      maxHeight: Math.max(120, Math.min(260, abrirArriba ? arriba : abajo)),
      fontSize: estilo.fontSize,
      fontFamily: estilo.fontFamily,
    });

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
  const valorActual = selectRef.current?.value;

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
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {opciones.map((opcion, i) => (
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
