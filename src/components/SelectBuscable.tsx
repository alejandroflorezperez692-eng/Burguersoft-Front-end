import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import '../styles/select-claro.css';

type Opcion = { value: string | number; label: string; disabled?: boolean };

interface SelectBuscableProps {
  value: string | number | '';
  onChange: (valor: string | number) => void;
  opciones: Opcion[];
  placeholder?: string;
  label?: string;
  requerido?: boolean;
  clase?: string;
  sinFiltrar?: boolean;
}

export default function SelectBuscable({
  value,
  onChange,
  opciones,
  placeholder = 'Seleccione...',
  label,
  requerido = false,
  clase = '',
  sinFiltrar = false,
}: SelectBuscableProps) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [activo, setActivo] = useState(-1);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const opcionesFiltradas = useMemo(() => {
    if (sinFiltrar) return opciones;
    const texto = filtro.toLowerCase().trim();
    if (!texto) return opciones;
    return opciones.filter((opcion) => opcion.label.toLowerCase().includes(texto));
  }, [opciones, filtro, sinFiltrar]);

  const valorSeleccionado = opciones.find((opcion) => String(opcion.value) === String(value));
  const textoMostrar = valorSeleccionado?.label ?? placeholder;

  const cerrar = useCallback(() => {
    setAbierto(false);
    setActivo(-1);
    setFiltro('');
  }, []);

  const seleccionar = useCallback((opcion: Opcion) => {
    if (opcion.disabled) return;
    onChange(opcion.value);
    cerrar();
  }, [onChange, cerrar]);

  const navegar = useCallback((direccion: 'arriba' | 'abajo') => {
    const total = opcionesFiltradas.length;
    if (total === 0) return;
    let nuevo = activo;
    if (direccion === 'abajo') {
      nuevo = nuevo >= total - 1 ? 0 : nuevo + 1;
    } else {
      nuevo = nuevo <= 0 ? total - 1 : nuevo - 1;
    }
    setActivo(nuevo);
  }, [activo, opcionesFiltradas.length]);

  const manejarTeclado = useCallback((evento: ReactKeyboardEvent) => {
    if (evento.key === 'Escape') {
      cerrar();
      return;
    }
    if (!abierto) {
      if (evento.key === 'Enter' || evento.key === ' ' || evento.key === 'ArrowDown') {
        evento.preventDefault();
        setAbierto(true);
      }
      return;
    }
    if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      navegar('arriba');
      return;
    }
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      navegar('abajo');
      return;
    }
    if (evento.key === 'Enter') {
      evento.preventDefault();
      if (activo >= 0 && activo < opcionesFiltradas.length) {
        seleccionar(opcionesFiltradas[activo]);
      }
    }
  }, [abierto, activo, opcionesFiltradas, cerrar, navegar, seleccionar]);

  useEffect(() => {
    const clicFuera = (evento: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        cerrar();
      }
    };
    document.addEventListener('mousedown', clicFuera);
    return () => document.removeEventListener('mousedown', clicFuera);
  }, [cerrar]);

  useEffect(() => {
    if (abierto && inputRef.current) inputRef.current.focus();
  }, [abierto]);

  const etiquetaBoton = label ?? placeholder;

  return (
    <div
      ref={contenedorRef}
      className={`select-buscable-wrap ${clase} ${abierto ? 'abierto' : ''} ${requerido ? 'requerido' : ''}`}
      style={{ position: 'relative', display: 'inline-block', width: '100%' }}
    >
      {label && (
        <label className="select-buscable-label">
          {label}
          {requerido && <span style={{ color: 'var(--danger)' }}> *</span>}
        </label>
      )}
      <button
        type="button"
        className={`select-buscable-trigger ${abierto ? 'activo' : ''}`}
        onClick={() => { setAbierto((valor) => !valor); }}
        onKeyDown={manejarTeclado}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={etiquetaBoton}
        data-tooltip={etiquetaBoton}
        title={etiquetaBoton}
      >
        <span className="select-buscable-valor">{textoMostrar}</span>
        <ChevronDown size={16} className="select-buscable-flecha" aria-hidden="true" />
      </button>

      {abierto && (
        <div className="select-buscable-panel" role="listbox" aria-label={etiquetaBoton}>
          <div className="select-buscable-buscar">
            <Search size={16} aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={filtro}
              onChange={(evento) => { setFiltro(evento.target.value); setActivo(-1); }}
              onKeyDown={manejarTeclado}
              autoComplete="off"
              spellCheck="false"
              placeholder="Buscar..."
              aria-label={`Buscar en ${etiquetaBoton}`}
             maxLength={100}/>
            {filtro && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                data-tooltip="Limpiar búsqueda"
                title="Limpiar búsqueda"
                onClick={() => { setFiltro(''); setActivo(-1); }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="select-buscable-opciones">
            {opcionesFiltradas.length === 0 ? (
              <div className="select-buscable-vacio">No se encontraron opciones</div>
            ) : (
              opcionesFiltradas.map((opcion, indice) => (
                <button
                  key={`${opcion.value}-${indice}`}
                  type="button"
                  role="option"
                  aria-selected={String(opcion.value) === String(value)}
                  disabled={opcion.disabled}
                  onClick={() => seleccionar(opcion)}
                  onMouseEnter={() => setActivo(indice)}
                  className={`select-buscable-opcion${indice === activo ? ' activa' : ''}`}
                >
                  <span>{opcion.label}</span>
                  {String(opcion.value) === String(value) && <span aria-hidden="true">✓</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
