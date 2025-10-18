import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MedicineDownloader {
  constructor() {
    this.baseUrl = process.env.DOWNLOAD_URL || 'https://www.titck.gov.tr/dinamikmodul/43';
    this.downloadPath = process.env.DOWNLOAD_PATH || './data';
    this.filename = process.env.EXCEL_FILENAME || 'medicines.xlsx';
  }

  async ensureDataDirectory() {
    try {
      await fs.access(this.downloadPath);
    } catch {
      await fs.mkdir(this.downloadPath, { recursive: true });
      console.log(`Created data directory: ${this.downloadPath}`);
    }
  }

  async getLatestExcelUrl() {
    try {
      console.log(`Fetching page: ${this.baseUrl}`);
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      const xlsxLink = $('a[href*=".xlsx"], a[href*=".XLSX"]').first();

      if (!xlsxLink.length) {
        throw new Error('No XLSX file found on the page');
      }

      let fileUrl = xlsxLink.attr('href');
      if (!fileUrl.startsWith('http')) {
        const baseUrlObj = new URL(this.baseUrl);
        if (fileUrl.startsWith('/')) {
          fileUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${fileUrl}`;
        } else {
          fileUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}/${fileUrl}`;
        }
      }

      const dateText = xlsxLink.closest('tr').find('td').first().text().trim();

      console.log(`Found latest file: ${dateText || 'Latest'}`);
      console.log(`Download URL: ${fileUrl}`);

      return { url: fileUrl, date: dateText };
    } catch (error) {
      throw new Error(`Failed to get Excel URL: ${error.message}`);
    }
  }

  async downloadFile(url, destinationPath) {
    try {
      console.log('Downloading file...');
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxRedirects: 5,
        timeout: 60000
      });

      await fs.writeFile(destinationPath, response.data);
      console.log(`File downloaded successfully: ${destinationPath}`);

      const stats = await fs.stat(destinationPath);
      console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      return true;
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  async download() {
    try {
      console.log('Starting download process...');

      await this.ensureDataDirectory();

      const { url, date } = await this.getLatestExcelUrl();

      const filePath = path.join(this.downloadPath, this.filename);

      await this.downloadFile(url, filePath);

      const metadata = {
        downloadDate: new Date().toISOString(),
        sourceDate: date,
        sourceUrl: url,
        filePath: filePath
      };

      const metadataPath = path.join(this.downloadPath, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      console.log('Download completed successfully!');
      console.log(`Metadata saved to: ${metadataPath}`);

      return metadata;
    } catch (error) {
      console.error('Download failed:', error.message);
      throw error;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const downloader = new MedicineDownloader();
  downloader.download()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default MedicineDownloader;
