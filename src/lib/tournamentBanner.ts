export const MAX_TOURNAMENT_REQUEST_BYTES = 1_500_000;
export const MAX_BANNER_DATA_URL_LENGTH = 700_000;

export async function prepareTournamentBanner(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Selecciona una imagen JPG, PNG o WEBP.');
  if (file.size > 5 * 1024 * 1024) throw new Error('La imagen original debe pesar como máximo 5 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo leer la imagen. Selecciona otro archivo.'));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('La imagen no tiene dimensiones válidas.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen en este navegador.');
    let scale = Math.min(1, 1600 / image.naturalWidth, 900 / image.naturalHeight);
    for (let attempt = 0; attempt < 5; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = '#07090e';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.7, 0.55]) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.startsWith('data:image/jpeg;base64,') && dataUrl.length <= MAX_BANNER_DATA_URL_LENGTH) {
          return { dataUrl, width: canvas.width, height: canvas.height };
        }
      }
      scale *= 0.75;
    }
    throw new Error('No se pudo reducir suficientemente el banner. Selecciona una imagen más pequeña.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
