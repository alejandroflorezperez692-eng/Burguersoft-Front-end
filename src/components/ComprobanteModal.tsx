import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useEscape } from '../hooks/useEscape';
import { mensajeError } from '../utils/errores';
import { comprimirImagen } from '../utils/comprimirImagen';
import AdminLoading from './AdminLoading';

interface ComprobanteModalProps {
  ventaId: number;
  numero?: number;
  onClose: () => void;
  onSubido: () => void;
}

export default function ComprobanteModal({
  ventaId,
  numero,
  onClose,
  onSubido,
}: ComprobanteModalProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEscape([[true, onClose]]);

  useEffect(() => {
    if (!archivo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

const elegir = async (file: File | null) => {
  setError(null);
  if (!file) {
    setArchivo(null);
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    setError('El comprobante debe ser una imagen JPG, PNG o WEBP.');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    setError('El comprobante no puede superar los 8 MB.');
    return;
  }
  const comprimido = await comprimirImagen(file);
  setArchivo(comprimido);
  void enviar(comprimido);
};

  const enviar = async (archivoAEnviar: File | null = archivo) => {
    if (!archivoAEnviar) {
      setError('Debes adjuntar la imagen del comprobante de pago.');
      return;
    }
    if (enviando) return;

    setEnviando(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('comprobante', archivoAEnviar);

      await apiClient.post(`/ventas/${ventaId}/comprobante`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000,
      });

      onSubido();
      onClose();
    } catch (e: unknown) {
      setError(mensajeError(e, 'No se pudo subir el comprobante de pago'));
    } finally {
      setEnviando(false);
    }
  };

  return (
     <>
      {enviando && (
        <AdminLoading
          texto="Verificando comprobante"
          subtexto="La IA está revisando tu pago"
        />
      )}
    <div className="modal-overlay open" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 460, width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: '#3d2111' }}>
          Subir comprobante de pago{numero ? ` · Pedido #${numero}` : ''}
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.55, color: '#6b5d4c' }}>
          Adjunta una imagen clara del comprobante. La IA verificará que sea un comprobante de pago
          real; si no lo es, no se aceptará.
        </p>

        <input
          id={`comprobante-${ventaId}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const input = e.target;
            const file = input.files?.[0] ?? null;
            void elegir(file);
            input.value = '';
          }}
        />

        {preview ? (
          <div className="comprobante-modal-preview">
            <img src={preview} alt="Vista previa del comprobante" />
            <div>
              <strong>{archivo?.name}</strong>
              <span>{((archivo?.size ?? 0) / 1024 / 1024).toFixed(2)} MB</span>
              <label htmlFor={`comprobante-${ventaId}`} className="comprobante-modal-cambiar">
                Elegir otra imagen
              </label>
            </div>
          </div>
        ) : (
          <label htmlFor={`comprobante-${ventaId}`} className="comprobante-modal-adjuntar">
            <span>📎 Adjuntar imagen del comprobante</span>
            <small>JPG, PNG o WEBP · máximo 8 MB</small>
          </label>
        )}

        {error && <div className="comprobante-modal-error">{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" className="btn-cancel" onClick={onClose} disabled={enviando}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-save"
            onClick={() => void enviar(archivo)}
            disabled={enviando || !archivo}
          >
            {enviando ? 'Verificando con IA…' : error ? 'Reintentar' : 'Subir comprobante'}
          </button>
        </div>
         </div>
    </div>
    </>
  );
}