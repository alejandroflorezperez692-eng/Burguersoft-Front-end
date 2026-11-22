import { useState } from 'react';
import { validarCamposVisibles } from '../utils/validarCampos';
import { useEscape } from '../hooks/useEscape';
import Boton from './Boton';

interface MotivoModalProps {
  titulo: string;
  descripcion?: string;
  textoBoton?: string;
  
  confirmarTexto?: string;
  placeholder?: string;

  peligro?: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}


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
    if (!validarCamposVisibles()) return;
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
        <h3 className="motivo-modal-titulo" style={{ fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text-900)' }}>
          {titulo}
        </h3>
        {descripcion && (
          <p style={{ fontSize: 13.5, color: 'var(--text-600)', margin: '10px 0 16px', lineHeight: 1.5 }}>
            {descripcion}
          </p>
        )}

        <textarea
          className="motivo-modal-input"
          placeholder={placeholder}
          aria-label="Motivo"
          rows={4}
          autoFocus
          value={motivo}
          minLength={5}
          maxLength={255}
          required
          onChange={(e) => setMotivo(e.target.value.slice(0, 255))}
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
          <Boton variante="volver"
            type="button"
            className="btn-cancel"
            onClick={onClose}
          >Volver</Boton>
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