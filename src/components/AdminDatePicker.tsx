import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

interface AdminDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  style?: CSSProperties;
  label: string;
}

const fechaISO = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

export default function AdminDatePicker({ value, onChange, min, max, style, label }: AdminDatePickerProps) {
  const [modoOscuro, setModoOscuro] = useState(() => document.body.classList.contains('dark-mode'));
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const fechaInicial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [mesVisible, setMesVisible] = useState(() => new Date(fechaInicial.getFullYear(), fechaInicial.getMonth(), 1));

  useEffect(() => {
    const observer = new MutationObserver(() => setModoOscuro(document.body.classList.contains('dark-mode')));
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const cerrarFuera = (event: MouseEvent) => {
      if (!contenedorRef.current?.contains(event.target as Node)) setAbierto(false);
    };
    const cerrarEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarFuera);
    document.addEventListener('keydown', cerrarEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarFuera);
      document.removeEventListener('keydown', cerrarEscape);
    };
  }, [abierto]);

  if (!modoOscuro) {
    return (
      <input
        type="date"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        style={style}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  const anio = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const primerDia = (new Date(anio, mes, 1).getDay() + 6) % 7;
  const tituloMes = mesVisible.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const indiceMes = anio * 12 + mes;
  const mesMinimo = min ? Number(min.slice(0, 4)) * 12 + Number(min.slice(5, 7)) - 1 : -Infinity;
  const mesMaximo = max ? Number(max.slice(0, 4)) * 12 + Number(max.slice(5, 7)) - 1 : Infinity;
  const textoFecha = value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-CO') : 'dd/mm/aaaa';

  return (
    <div className="compras-date-picker" ref={contenedorRef}>
      <button
        type="button"
        className="compras-date-trigger"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        style={style}
        onClick={() => {
          if (!abierto) {
            const fecha = value ? new Date(`${value}T00:00:00`) : new Date();
            setMesVisible(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
          }
          setAbierto((actual) => !actual);
        }}
      >
        <span>{textoFecha}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      </button>
      {abierto && (
        <div className="compras-calendar" role="dialog" aria-label="Elegir fecha">
          <div className="compras-calendar-header">
            <button type="button" aria-label="Mes anterior" disabled={indiceMes <= mesMinimo} onClick={() => setMesVisible(new Date(anio, mes - 1, 1))}>‹</button>
            <strong>{tituloMes}</strong>
            <button type="button" aria-label="Mes siguiente" disabled={indiceMes >= mesMaximo} onClick={() => setMesVisible(new Date(anio, mes + 1, 1))}>›</button>
          </div>
          <div className="compras-calendar-grid compras-calendar-weekdays" aria-hidden="true">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia) => <span key={dia}>{dia}</span>)}
          </div>
          <div className="compras-calendar-grid">
            {Array.from({ length: primerDia }, (_, index) => <span key={`vacio-${index}`} />)}
            {Array.from({ length: diasEnMes }, (_, index) => {
              const dia = index + 1;
              const fecha = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              const deshabilitada = (!!min && fecha < min) || (!!max && fecha > max);
              return (
                <button
                  type="button"
                  key={fecha}
                  className={value === fecha ? 'selected' : ''}
                  disabled={deshabilitada}
                  aria-pressed={value === fecha}
                  onClick={() => { onChange(fecha); setAbierto(false); }}
                >
                  {dia}
                </button>
              );
            })}
          </div>
          <div className="compras-calendar-footer">
            <button type="button" onClick={() => { onChange(''); setAbierto(false); }}>Borrar</button>
            <button type="button" onClick={() => {
              const hoy = fechaISO(new Date());
              if ((!min || hoy >= min) && (!max || hoy <= max)) onChange(hoy);
              setAbierto(false);
            }}>Hoy</button>
          </div>
        </div>
      )}
    </div>
  );
}
