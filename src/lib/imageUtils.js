/**
 * Comprime uma imagem usando HTML5 Canvas antes do upload,
 * reduzindo arquivos pesados de câmeras (5MB - 15MB) para menos de 400KB com alta qualidade.
 *
 * @param {File} file Arquivo de imagem original
 * @param {number} maxWidth Largura máxima (default: 1600px)
 * @param {number} quality Qualidade JPEG (0.1 a 1.0, default: 0.82)
 * @returns {Promise<File>} Imagem comprimida como File pronto para upload
 */
export async function compressImage(file, maxWidth = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Se já for muito pequena (< 300 KB), não precisa reprocessar
  if (file.size < 300 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // Fallback para arquivo original
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
}
