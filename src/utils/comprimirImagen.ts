export async function comprimirImagen(file: File, maxLado = 1280, calidad = 0.8): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * escala);
    const h = Math.round(bmp.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);

    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', calidad));
    if (!blob || blob.size >= file.size) return file; // si no mejora, deja la original

    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}