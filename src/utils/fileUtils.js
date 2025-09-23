export const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      try {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } catch (error) {
        reject(new Error('Error al procesar el archivo'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
  });
};