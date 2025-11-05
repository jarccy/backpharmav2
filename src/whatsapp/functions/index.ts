import * as fs from 'fs';
import * as path from 'path';

export const SaveImage = async (file: string, dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const fileName = `${uniqueSuffix}.jpg`;
  const filePath = path.join(dirPath, fileName);
  fs.writeFileSync(filePath, file, 'base64');

  return `${process.env.BASE_URL}/${filePath}`;
};
