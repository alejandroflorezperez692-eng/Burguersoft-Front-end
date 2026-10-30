import { useState } from 'react';
import { useEscape } from '../hooks/useEscape';

interface MotivoModalProps {
  titulo: string;
  descripcion?: string;
  textoBoton?: string;
  /** Texto del botón de confirmar (ej. "Cancelar pedido"). */
  confirmarTexto?: string;
  placeholder?: string;
  /** Es un motivo usado para cancelar: se marca el botón en rojo. */
  peligro?: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

/** Modal para pedir el motivo de una acción (ej. cancelar un pedido).
 *  OK no se activa hasta que el motivo tenga algo de contenido. */
export default function MotivoModal({
  titulo,
  descripcion,
  textoBoton = 'Confirmar',
  confirmarTexto,
  placeholder = 'Escribe el motivo...',
  peligro = false,
  onClose,
  onConfirm,
}: MotivoModalProps) {
  const [motivo, setMotivo] = useState('');
  const [tocado, setTocado] = useState(false);

  useEscape([[true, onClose]]);

  const valido = motivo.trim().length >= 5;

  const enviar = () => {
    if (!valido) {
      setTocado(true);
      return;
    }
    onConfirm(motivo.trim());
  };

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 420, width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text-900)' }}>
          {titulo}
        </h3>
        {descripcion && (
          <p style={{ fontSize: 13.5, color: 'var(--text-600)', margin: '10px 0 16px', lineHeight: 1.5 }}>
            {descripcion}
          </p>
        )}

        <textarea
          placeholder={placeholder}
          aria-label="Motivo"
          rows={4}
          autoFocus
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          onBlur={() => setTocado(true)}
          style={{
            width: '100%',
            resize: 'vertical',
            border: `1.5px solid ${tocado && !valido ? 'var(--danger)' : 'var(--border)'}`,
            borderRadius: 'var(--r-sm, 8px)',
            padding: 12,
            fontSize: 13.5,
            fontFamily: 'var(--font-sans)',
            color: 'var(--text-900)',
            outline: 'none',
          }}
        />
        {tocado && !valido && (
          <p style={{ fontSize: 12, color: 'var(--danger)', margin: '6px 0 0' }}>
            Escribe el motivo (mínimo 5 caracteres).
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
          >
            Volver
          </button>
          <button
            type="button"
            className="btn-primary"
            style={peligro ? { background: 'var(--danger, #C8382A)' } : undefined}
            onClick={enviar}
          >
            {confirmarTexto || textoBoton}
          </button>
        </div>
      </div>
    </div>
  );
}
