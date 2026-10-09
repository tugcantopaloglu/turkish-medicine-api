import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import ExcelParser from './excelParser.js';
import MedicineDownloader from './downloader.js';
import { getDataPaths, isMainModule } from './config.js';

function queryInteger(value, defaultValue, pattern) {
  if (value === undefined) return defaultValue;
  return typeof value === 'string' && pattern.test(value) ? Number(value) : NaN;
}

export function createApp(options = {}) {
  const { dataPath, filename } = { ...getDataPaths(), ...options };
  const filePath = path.join(dataPath, filename);
  const app = express();

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
      console.log('Loading medicine data...');

      const nextParser = new ExcelParser(filePath);
      const nextData = await nextParser.parse();
      const jsonPath = path.join(dataPath, 'medicines.json');
      await nextParser.saveAsJson(jsonPath);

      parser = nextParser;
      medicineData = nextData;
      lastLoadTime = new Date();
      console.log(`Data loaded successfully: ${medicineData.length} records`);

      return true;
    } catch (error) {
      console.error('Failed to load data:', error.message);
      return false;
    }
  }

  function paginate(data, page = 1, limit = 50) {
    // If limit is 0 or -1, return all data without pagination
    if (limit === 0 || limit === -1) {
      return {
        page: 1,
        limit: data.length,
        total: data.length,
        totalPages: 1,
        data: data
      };
    }

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
      version: '2.1.0',
      description: 'API for Turkish Medicine Database (TITCK) - All Sheets Supported',
      endpoints: {
        '/': 'API information',
        '/health': 'Health check',
        '/api/medicines': 'Get all medicines from all sheets (paginated, use limit=0 or limit=-1 for all)',
        '/api/medicines/all': 'Get ALL medicines without pagination',
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
      paginationOptions: {
        'Default': 'limit=50 (default page size)',
        'Custom limit': 'limit=100 (any positive number)',
        'All records (option 1)': 'limit=0 (returns all records)',
        'All records (option 2)': 'limit=-1 (returns all records)',
        'All records (option 3)': '/api/medicines/all (dedicated endpoint)'
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

  app.use('/api', (req, res, next) => {
    const page = queryInteger(req.query.page, 1, /^[1-9]\d*$/);
    const limit = queryInteger(req.query.limit, 50, /^(?:-1|0|[1-9]\d*)$/);
    if (!Number.isSafeInteger(page) || page < 1) {
      return res.status(400).json({ error: 'Parameter "page" must be a positive integer' });
    }
    if (!Number.isSafeInteger(limit) || limit < -1) {
      return res.status(400).json({ error: 'Parameter "limit" must be a positive integer, 0 or -1' });
    }
    for (const key of ['q', 'field', 'value', 'sheet']) {
      if (req.query[key] !== undefined && (typeof req.query[key] !== 'string' || req.query[key].trim() === '')) {
        return res.status(400).json({ error: `Parameter "${key}" must be a nonempty string` });
      }
    }
    if (parser && req.query.sheet && !parser.getSheetNames().includes(req.query.sheet)) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    res.locals.pagination = { page, limit };
    next();
  });

  app.get('/api/medicines', (req, res) => {
    if (!medicineData) {
      return res.status(503).json({ error: 'Data not loaded yet' });
    }

    const { page, limit } = res.locals.pagination;

    res.json(paginate(medicineData, page, limit));
  });

  app.get('/api/medicines/all', (req, res) => {
    if (!medicineData) {
      return res.status(503).json({ error: 'Data not loaded yet' });
    }

    res.json({
      total: medicineData.length,
      data: medicineData
    });
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

    const { page, limit } = res.locals.pagination;

    const results = parser.search(query, sheetName);

    res.json({
      query: query,
      sheet: sheetName || 'all',
      ...paginate(results, page, limit)
    });
  });

  app.get('/api/medicines/filter', (req, res) => {
    if (!medicineData || !parser) {
      return res.status(503).json({ error: 'Data not loaded yet' });
    }

    const { field, value, sheet } = req.query;

    if (!field || !value) {
      return res.status(400).json({ error: 'Parameters "field" and "value" are required' });
    }

    const { page, limit } = res.locals.pagination;

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

  app.get('/api/medicines/:id', (req, res) => {
    if (!medicineData) {
      return res.status(503).json({ error: 'Data not loaded yet' });
    }

    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
      return res.status(400).json({ error: 'Medicine ID must be a positive integer' });
    }
    const id = Number(req.params.id);
    const medicine = medicineData.find(m => m.id === id);

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    res.json(medicine);
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
    const sheetInfo = Object.create(null);

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

    if (Object.hasOwn(aliases, slug)) {
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

    if (!sheetName || !parser.getSheetNames().includes(sheetName)) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const sheetData = parser.getSheetData(sheetName);
    const { page, limit } = res.locals.pagination;

    res.json({
      sheet: sheetName,
      slug: slug,
      ...paginate(sheetData, page, limit)
    });
  });

  app.get('/api/metadata', async (req, res) => {
    try {
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

      if (!await loadData()) {
        return res.status(500).json({ error: 'File downloaded but data reload failed' });
      }

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
    const status = err.status === 400 || err.status === 413 ? err.status : 500;
    res.status(status).json({ error: status === 500 ? 'Internal server error' : 'Invalid request body' });
  });

  return { app, loadData };
}

export async function start() {
  console.log('Starting Turkish Medicine API...');
  const { app, loadData } = createApp();
  await loadData();
  const port = process.env.PORT || 3000;
  return app.listen(port, () => {
    console.log(`Server listening on ${port}`);
  });
}

if (isMainModule(import.meta.url)) {
  start().catch(error => {
    console.error('Failed to start server:', error.message);
    process.exitCode = 1;
  });
}
