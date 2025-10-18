import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import ExcelParser from './excelParser.js';
import MedicineDownloader from './downloader.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

let medicineData = null;
let parser = null;
let lastLoadTime = null;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

async function loadData() {
  try {
    const dataPath = process.env.DOWNLOAD_PATH || './data';
    const filename = process.env.EXCEL_FILENAME || 'medicines.xlsx';
    const filePath = path.join(dataPath, filename);

    console.log('Loading medicine data...');

    parser = new ExcelParser(filePath);
    medicineData = await parser.parse();

    lastLoadTime = new Date();
    console.log(`Data loaded successfully: ${medicineData.length} records`);

    const jsonPath = path.join(dataPath, 'medicines.json');
    await parser.saveAsJson(jsonPath);

    return true;
  } catch (error) {
    console.error('Failed to load data:', error.message);
    return false;
  }
}

function paginate(data, page = 1, limit = 50) {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total: data.length,
    totalPages: Math.ceil(data.length / limit),
    data: data.slice(startIndex, endIndex)
  };
}

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    dataLoaded: medicineData !== null,
    recordCount: medicineData ? medicineData.length : 0,
    lastLoadTime: lastLoadTime
  });
});

app.get('/', (req, res) => {
  const sheets = parser ? parser.getSheetNames() : [];

  res.json({
    name: 'Turkish Medicine API',
    version: '2.0.0',
    description: 'API for Turkish Medicine Database (TITCK) - All Sheets Supported',
    endpoints: {
      '/': 'API information',
      '/health': 'Health check',
      '/api/medicines': 'Get all medicines from all sheets (paginated)',
      '/api/medicines/search': 'Search medicines (query: q, optional: sheet)',
      '/api/medicines/filter': 'Filter by field (params: field, value, optional: sheet)',
      '/api/sheets': 'List all available sheets',
      '/api/sheets/active': 'Get active products',
      '/api/sheets/passive': 'Get passive products',
      '/api/sheets/to-be-deactivated': 'Get products to be deactivated',
      '/api/sheets/newly-added': 'Get newly added products',
      '/api/sheets/modified': 'Get modified products',
      '/api/columns': 'Get available columns (optional query: sheet)',
      '/api/stats': 'Get statistics for all sheets',
      '/api/metadata': 'Get data metadata',
      '/api/reload': 'Reload data from Excel file',
      '/api/download': 'Download latest file from source'
    },
    sheets: sheets,
    sheetAliases: {
      'active': 'AKTİF ÜRÜNLER LİSTESİ',
      'passive': 'PASİF ÜRÜNLER LİSTESİ',
      'to-be-deactivated': 'PASİFE ALINACAK ÜRÜNLER',
      'newly-added': 'LİSTEYE YENİ EKLENEN ÜRÜNLER',
      'modified': 'DEĞİŞİKLİK YAPILAN ÜRÜNLER'
    }
  });
});

app.get('/api/medicines', (req, res) => {
  if (!medicineData) {
    return res.status(503).json({ error: 'Data not loaded yet' });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  res.json(paginate(medicineData, page, limit));
});

app.get('/api/medicines/search', (req, res) => {
  if (!medicineData || !parser) {
    return res.status(503).json({ error: 'Data not loaded yet' });
  }

  const query = req.query.q;
  const sheetName = req.query.sheet;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  const results = parser.search(query, sheetName);

  res.json({
    query: query,
    sheet: sheetName || 'all',
    ...paginate(results, page, limit)
  });
});

app.get('/api/medicines/:id', (req, res) => {
  if (!medicineData) {
    return res.status(503).json({ error: 'Data not loaded yet' });
  }

  const id = parseInt(req.params.id);
  const medicine = medicineData.find(m => m.id === id);

  if (!medicine) {
    return res.status(404).json({ error: 'Medicine not found' });
  }

  res.json(medicine);
});

app.get('/api/medicines/filter', (req, res) => {
  if (!medicineData || !parser) {
    return res.status(503).json({ error: 'Data not loaded yet' });
  }

  const { field, value, sheet } = req.query;

  if (!field || !value) {
    return res.status(400).json({ error: 'Parameters "field" and "value" are required' });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const results = parser.filterByField(field, value, sheet);

    res.json({
      field: field,
      value: value,
      sheet: sheet || 'all',
      ...paginate(results, page, limit)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/columns', (req, res) => {
  if (!parser) {
    return res.status(503).json({ error: 'Data not loaded yet' });
  }

  const sheetName = req.query.sheet;

  res.json({
    sheet: sheetName || 'all',
    columns: parser.getColumns(sheetName)
  });
});

app.get('/api/stats', (req, res) => {
  if (!parser) {
    return res.status(503).json({ error: 'Data not loaded yet' });
  }

  res.json(parser.getStats());
});

app.get('/api/sheets', (req, res) => {
  if (!parser) {
    return res.status(503).json({ error: 'Data not loaded yet' });
  }

  const sheets = parser.getSheetNames();
  const sheetInfo = {};

  sheets.forEach(sheetName => {
    const data = parser.getSheetData(sheetName);
    sheetInfo[sheetName] = {
      slug: sheetName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      records: data ? data.length : 0,
      endpoint: `/api/sheets/${sheetName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    };
  });

  res.json({
    totalSheets: sheets.length,
    sheets: sheetInfo
  });
});

function getSheetNameFromSlug(slug) {
  const aliases = {
    'active': 'AKTİF ÜRÜNLER LİSTESİ',
    'passive': 'PASİF ÜRÜNLER LİSTESİ',
    'to-be-deactivated': 'PASİFE ALINACAK ÜRÜNLER',
    'newly-added': 'LİSTEYE YENİ EKLENEN ÜRÜNLER',
    'modified': 'DEĞİŞİKLİK YAPILAN ÜRÜNLER'
  };

  if (aliases[slug]) {
    return aliases[slug];
  }

  const sheets = parser.getAllSheets();
  return Object.keys(sheets).find(name =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug
  );
}

app.get('/api/sheets/:slug', (req, res) => {
  if (!parser) {
    return res.status(503).json({ error: 'Data not loaded yet' });
  }

  const slug = req.params.slug;
  const sheetName = getSheetNameFromSlug(slug);

  if (!sheetName) {
    return res.status(404).json({ error: 'Sheet not found' });
  }

  const sheetData = parser.getSheetData(sheetName);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  res.json({
    sheet: sheetName,
    slug: slug,
    ...paginate(sheetData, page, limit)
  });
});

app.get('/api/metadata', async (req, res) => {
  try {
    const dataPath = process.env.DOWNLOAD_PATH || './data';
    const metadataPath = path.join(dataPath, 'metadata.json');

    const metadata = await fs.readFile(metadataPath, 'utf-8');
    res.json(JSON.parse(metadata));
  } catch (error) {
    res.status(404).json({ error: 'Metadata not found' });
  }
});

app.post('/api/reload', async (req, res) => {
  console.log('Reloading data...');

  const success = await loadData();

  if (success) {
    res.json({
      message: 'Data reloaded successfully',
      recordCount: medicineData.length,
      loadTime: lastLoadTime
    });
  } else {
    res.status(500).json({ error: 'Failed to reload data' });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    console.log('Downloading latest file...');

    const downloader = new MedicineDownloader();
    const metadata = await downloader.download();

    await loadData();

    res.json({
      message: 'File downloaded and data loaded successfully',
      metadata: metadata,
      recordCount: medicineData.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  console.log('Starting Turkish Medicine API...');

  const dataPath = process.env.DOWNLOAD_PATH || './data';
  const filename = process.env.EXCEL_FILENAME || 'medicines.xlsx';
  const filePath = path.join(dataPath, filename);

  try {
    await fs.access(filePath);
    console.log('Data file found, loading...');
    await loadData();
  } catch {
    console.log('No data file found. Use /api/download to fetch the latest data.');
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API documentation: http://localhost:${PORT}/`);
  });
}

start();
