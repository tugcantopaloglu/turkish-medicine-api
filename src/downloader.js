import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import ExcelParser from './excelParser.js';
import { getDataPaths, isMainModule } from './config.js';

export function findExcelLink(html, baseUrl) {
  const $ = cheerio.load(html);
  for (const anchor of $('a[href]').toArray()) {
    const link = $(anchor);
    let url;
    try {
      url = new URL(link.attr('href'), baseUrl);
    } catch {
      continue;
    }
    if (['http:', 'https:'].includes(url.protocol) && /\.xlsx$/i.test(url.pathname)) {
      return { url: url.href, date: link.closest('tr').find('td').first().text().trim() };
    }
  }
  throw new Error('No XLSX file found on the page');
}

class MedicineDownloader {
  constructor() {
    const { dataPath, filename } = getDataPaths();
    this.baseUrl = process.env.DOWNLOAD_URL || 'https://www.titck.gov.tr/dinamikmodul/43';
    this.downloadPath = dataPath;
    this.filename = filename;
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
        },
        timeout: 30000,
        maxContentLength: 8 * 1024 * 1024
      });

      const { url: fileUrl, date: dateText } = findExcelLink(response.data, this.baseUrl);

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
    const attemptId = randomUUID();
    const filePath = path.join(this.downloadPath, this.filename);
    const stagedFilePath = path.join(this.downloadPath, `.${this.filename}.${attemptId}.download`);
    const stagedJsonPath = path.join(this.downloadPath, `.medicines.${attemptId}.json`);
    const stagedMetadataPath = path.join(this.downloadPath, `.metadata.${attemptId}.json`);
    try {
      console.log('Starting download process...');

      await this.ensureDataDirectory();

      const { url, date } = await this.getLatestExcelUrl();

      await this.downloadFile(url, stagedFilePath);
      const parser = new ExcelParser(stagedFilePath);
      await parser.parse();
      await parser.saveAsJson(stagedJsonPath);

      const metadata = {
        downloadDate: new Date().toISOString(),
        sourceDate: date,
        sourceUrl: url,
        filePath: filePath
      };

      const metadataPath = path.join(this.downloadPath, 'metadata.json');
      await fs.writeFile(stagedMetadataPath, JSON.stringify(metadata, null, 2));
      await fs.rename(stagedFilePath, filePath);
      await fs.rename(stagedJsonPath, path.join(this.downloadPath, 'medicines.json'));
      await fs.rename(stagedMetadataPath, metadataPath);

      console.log('Download completed successfully!');
      console.log(`Metadata saved to: ${metadataPath}`);

      console.log('Excel parsed and JSON created successfully!');

      return metadata;
    } catch (error) {
      console.error('Download failed:', error.message);
      throw error;
    } finally {
      await Promise.all([stagedFilePath, stagedJsonPath, stagedMetadataPath].map(stagedPath =>
        fs.rm(stagedPath, { force: true })
      ));
    }
  }
}

// Check if this script is being run directly
if (isMainModule(import.meta.url)) {
  const downloader = new MedicineDownloader();
  downloader.download()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export default MedicineDownloader;
