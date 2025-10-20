import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import ExcelParser from './excelParser.js';

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

  async downloadFile(url, destinationPath, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Downloading file... (Attempt ${attempt}/${retries})`);
        const response = await axios({
          method: 'GET',
          url: url,
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          },
          maxRedirects: 5,
          timeout: 120000, // 2 minutes
          maxContentLength: 100 * 1024 * 1024, // 100MB max
          maxBodyLength: 100 * 1024 * 1024
        });

        await fs.writeFile(destinationPath, response.data);
        console.log(`File downloaded successfully: ${destinationPath}`);

        const stats = await fs.stat(destinationPath);
        console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

        return true;
      } catch (error) {
        console.error(`Download attempt ${attempt} failed: ${error.message}`);
        if (attempt === retries) {
          throw new Error(`Failed to download file after ${retries} attempts: ${error.message}`);
        }
        // Wait before retry (exponential backoff)
        const waitTime = attempt * 2000;
        console.log(`Waiting ${waitTime / 1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
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

      // Parse Excel and create JSON
      console.log('\nParsing Excel file...');
      const parser = new ExcelParser(filePath);
      await parser.parse();

      const jsonPath = path.join(this.downloadPath, 'medicines.json');
      await parser.saveAsJson(jsonPath);

      console.log('Excel parsed and JSON created successfully!');

      return metadata;
    } catch (error) {
      console.error('Download failed:', error.message);
      throw error;
    }
  }
}

// Check if this script is being run directly
if (import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const downloader = new MedicineDownloader();
  downloader.download()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export default MedicineDownloader;
