import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

dotenv.config({ path: path.join(projectRoot, '.env') });

export function getDataPaths() {
  const dataPath = path.resolve(projectRoot, process.env.DOWNLOAD_PATH || './data');
  const filename = process.env.EXCEL_FILENAME || 'medicines.xlsx';
  if (path.basename(filename) !== filename || /[\\/]/.test(filename) || !/\.xlsx$/i.test(filename)) {
    throw new Error('EXCEL_FILENAME must be an XLSX filename without directory segments');
  }
  return { dataPath, filename, filePath: path.join(dataPath, filename) };
}

export function isMainModule(moduleUrl) {
  return Boolean(process.argv[1]) && moduleUrl === pathToFileURL(path.resolve(process.argv[1])).href;
}
