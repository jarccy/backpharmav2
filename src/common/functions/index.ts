import * as fs from 'fs';
import { join } from 'path';

export const convertFileToBase64 = (fileUrl: string): string => {
  try {
    const filePath = join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      `/public${fileUrl}`,
    );

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    return base64Data;
  } catch (error) {
    console.error('Error al convertir el archivo:', error);
    return null;
  }
};
