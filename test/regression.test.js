import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import ExcelParser from '../src/excelParser.js';
import MedicineDownloader, { findExcelLink } from '../src/downloader.js';
import DownloadScheduler from '../src/scheduler.js';
import { createApp } from '../src/server.js';
import { getDataPaths, projectRoot } from '../src/config.js';

const fixture = JSON.parse(await fs.readFile(new URL('./fixtures/workbook.json', import.meta.url), 'utf8'));

async function workspace(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'medicine-api-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

async function writeWorkbook(filePath, sheets = fixture.sheets) {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  }
  await fs.writeFile(filePath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

async function serve(t, options) {
  const api = createApp(options);
  const server = api.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  return { ...api, url: `http://127.0.0.1:${server.address().port}` };
}

async function request(url, endpoint, options) {
  const response = await fetch(url + endpoint, options);
  return { status: response.status, body: await response.json() };
}

test('parser assigns workbook-wide IDs, replaces repeated parses, preserves zero and Turkish search', async t => {
  const directory = await workspace(t);
  const filePath = path.join(directory, 'fixture.xlsx');
  await writeWorkbook(filePath);
  const parser = new ExcelParser(filePath);
  assert.deepEqual((await parser.parse()).map(row => row.id), [1, 2, 3, 4]);
  assert.equal((await parser.parse()).length, 4);
  assert.equal(parser.getSheetData('__proto__')[0]['__proto__'], 'Synthetic cell');
  assert.equal(parser.getSheetData('toString'), null);
  assert.equal(parser.search('ışık').length, 1);
  assert.equal(parser.filterByField('Amount', '0').length, 1);
  assert.equal(parser.filterByField('Barkod', '000001').length, 1);
  assert.deepEqual(parser.filterByField('toString', 'object'), []);
  assert.ok(parser.getColumns().includes('Extra'));
});

test('API static routes, pagination, IDs and malformed query parameters', async t => {
  const directory = await workspace(t);
  await writeWorkbook(path.join(directory, 'fixture.xlsx'));
  const api = await serve(t, { dataPath: directory, filename: 'fixture.xlsx' });
  assert.equal((await request(api.url, '/api/medicines')).status, 503);
  assert.equal((await request(api.url, '/api/sheets')).status, 503);
  assert.equal(await api.loadData(), true);
  const filtered = await request(api.url, '/api/medicines/filter?field=Amount&value=0');
  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.total, 1);
  for (const endpoint of ['/api/medicines', '/api/medicines/search?q=SYNTHETIC', '/api/medicines/filter?field=Barkod&value=000', '/api/sheets/active']) {
    for (const limit of ['0', '-1']) {
      const result = await request(api.url, endpoint + (endpoint.includes('?') ? '&' : '?') + `limit=${limit}&page=2`);
      assert.equal(result.status, 200);
      assert.equal(result.body.page, 1);
      assert.equal(result.body.limit, result.body.total);
      assert.equal(result.body.data.length, result.body.total);
    }
  }
  const paged = await request(api.url, '/api/medicines?page=2&limit=1');
  assert.deepEqual(paged.body.data.map(row => row.id), [2]);
  assert.equal((await request(api.url, '/api/medicines/3')).body._sheet, 'PASİF ÜRÜNLER LİSTESİ');
  assert.equal((await request(api.url, '/api/medicines/all')).body.total, 4);
  for (const endpoint of [
    '/api/medicines?page=0', '/api/medicines?page=1oops', '/api/medicines?page=1.5',
    '/api/medicines?limit=-2', '/api/medicines?limit=', '/api/medicines?limit=1&limit=2',
    '/api/medicines?page[toString]=x', '/api/medicines?limit[valueOf]=x',
    '/api/medicines?limit=9007199254740992', '/api/medicines/search?q[]=x',
    '/api/medicines/search?q[x]=x', '/api/medicines/search?q=%20',
    '/api/medicines/filter?field=Barkod&value[]=x', '/api/columns?sheet[]=x',
    '/api/medicines/1oops', '/api/medicines/-1', '/api/medicines/9007199254740992'
  ]) {
    assert.equal((await request(api.url, endpoint)).status, 400, endpoint);
  }
  for (const endpoint of ['/api/medicines/search?q=x&sheet=missing', '/api/columns?sheet=missing', '/api/sheets/modified', '/api/sheets/toString']) {
    assert.equal((await request(api.url, endpoint)).status, 404, endpoint);
  }
  const sheets = await request(api.url, '/api/sheets');
  assert.equal(sheets.body.sheets['__proto__'].records, 1);
  assert.equal((await request(api.url, '/api/sheets/-proto-')).body.total, 1);
  assert.equal((await request(api.url, '/api/stats')).body.sheets['__proto__'].records, 1);
  assert.equal((await request(api.url, '/api/reload', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{'
  })).status, 400);
  assert.equal((await request(api.url, '/api/reload', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(110000)
  })).status, 413);
});

test('failed reload and download reload keep the last valid API snapshot', async t => {
  const directory = await workspace(t);
  const filePath = path.join(directory, 'fixture.xlsx');
  await writeWorkbook(filePath);
  const api = await serve(t, { dataPath: directory, filename: 'fixture.xlsx' });
  assert.equal(await api.loadData(), true);
  const health = (await request(api.url, '/health')).body;
  await fs.writeFile(filePath, 'Not an XLSX workbook');
  assert.equal((await request(api.url, '/api/reload', { method: 'POST' })).status, 500);
  assert.deepEqual((await request(api.url, '/health')).body, health);
  await writeWorkbook(filePath, [fixture.sheets[1]]);
  await fs.rename(path.join(directory, 'medicines.json'), path.join(directory, 'previous.json'));
  await fs.mkdir(path.join(directory, 'medicines.json'));
  assert.equal((await request(api.url, '/api/reload', { method: 'POST' })).status, 500);
  assert.deepEqual((await request(api.url, '/health')).body, health);
  assert.equal((await request(api.url, '/api/medicines/search?q=SYNTHETIC')).body.total, 4);
  t.mock.method(MedicineDownloader.prototype, 'download', async () => ({ sourceUrl: 'https://example.test/synthetic.xlsx' }));
  assert.equal((await request(api.url, '/api/download', { method: 'POST' })).status, 500);
  assert.deepEqual((await request(api.url, '/health')).body, health);
});

test('unrecognized workbooks fail and header-only product sheets remain usable', async t => {
  const directory = await workspace(t);
  const filePath = path.join(directory, 'fixture.xlsx');
  await writeWorkbook(filePath, [{ name: 'Notes', rows: [['No product header']] }]);
  await assert.rejects(new ExcelParser(filePath).parse(), /No sheets with/);
  await writeWorkbook(filePath, [{ name: 'Empty products', rows: [['İlaç Adı', 'Barkod']] }]);
  const api = await serve(t, { dataPath: directory, filename: 'fixture.xlsx' });
  assert.equal(await api.loadData(), true);
  assert.equal((await request(api.url, '/api/medicines?limit=0')).body.total, 0);
});

test('download HTML resolves relative and protocol-relative links without selecting non-XLSX URLs', async () => {
  const html = await fs.readFile(new URL('./fixtures/download-page.html', import.meta.url), 'utf8');
  assert.deepEqual(findExcelLink(html, 'https://example.test/catalog/page'), {
    url: 'https://example.test/exports/synthetic.XlSx?download=1', date: 'Synthetic date text'
  });
  assert.equal(findExcelLink('<a href="//files.example.test/test.xlsx">File</a>', 'https://example.test/page').url, 'https://files.example.test/test.xlsx');
  assert.throws(() => findExcelLink('<a href="file:///test.xlsx">Invalid</a>', 'https://example.test/page'), /No XLSX/);
});

test('invalid downloaded content cannot replace existing workbook, JSON or metadata', async t => {
  const directory = await workspace(t);
  const filePath = path.join(directory, 'fixture.xlsx');
  await writeWorkbook(filePath);
  const previousWorkbook = await fs.readFile(filePath);
  await fs.writeFile(path.join(directory, 'medicines.json'), 'existing JSON');
  await fs.writeFile(path.join(directory, 'metadata.json'), 'existing metadata');
  const downloader = new MedicineDownloader();
  downloader.downloadPath = directory;
  downloader.filename = 'fixture.xlsx';
  t.mock.method(downloader, 'getLatestExcelUrl', async () => ({ url: 'https://example.test/synthetic.xlsx', date: 'Synthetic date' }));
  t.mock.method(downloader, 'downloadFile', async (_, destination) => fs.writeFile(destination, '<html>Error page</html>'));
  await assert.rejects(downloader.download(), /Expected an XLSX/);
  assert.deepEqual(await fs.readFile(filePath), previousWorkbook);
  assert.equal(await fs.readFile(path.join(directory, 'medicines.json'), 'utf8'), 'existing JSON');
  assert.equal(await fs.readFile(path.join(directory, 'metadata.json'), 'utf8'), 'existing metadata');
  assert.deepEqual((await fs.readdir(directory)).sort(), ['fixture.xlsx', 'medicines.json', 'metadata.json']);
  t.mock.method(downloader, 'downloadFile', async (_, destination) => writeWorkbook(destination));
  const metadata = await downloader.download();
  assert.equal(metadata.sourceDate, 'Synthetic date');
  assert.equal(JSON.parse(await fs.readFile(path.join(directory, 'medicines.json'), 'utf8')).length, 4);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, 'metadata.json'), 'utf8')), metadata);
});

test('downloader fetches a saved HTML fixture and synthetic XLSX through local HTTP', async t => {
  const directory = await workspace(t);
  const sourceFile = path.join(directory, 'source.xlsx');
  await writeWorkbook(sourceFile);
  const workbook = await fs.readFile(sourceFile);
  const html = await fs.readFile(new URL('./fixtures/download-page.html', import.meta.url), 'utf8');
  const requests = [];
  const server = createServer((req, res) => {
    requests.push(req.url);
    if (req.url === '/catalog/page') {
      res.setHeader('Content-Type', 'text/html');
      res.end(html);
    } else if (req.url === '/exports/synthetic.XlSx?download=1') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.end(workbook);
    } else {
      res.writeHead(404).end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const downloader = new MedicineDownloader();
  downloader.baseUrl = `http://127.0.0.1:${server.address().port}/catalog/page`;
  downloader.downloadPath = directory;
  downloader.filename = 'downloaded.xlsx';
  const metadata = await downloader.download();
  assert.deepEqual(requests, ['/catalog/page', '/exports/synthetic.XlSx?download=1']);
  assert.equal(metadata.sourceDate, 'Synthetic date text');
  assert.deepEqual(await fs.readFile(path.join(directory, 'downloaded.xlsx')), workbook);
  assert.equal(JSON.parse(await fs.readFile(path.join(directory, 'medicines.json'), 'utf8')).length, 4);
});

test('paths are independent of working directory and reject filename traversal', () => {
  const previousPath = process.env.DOWNLOAD_PATH;
  const previousFilename = process.env.EXCEL_FILENAME;
  const previousDirectory = process.cwd();
  try {
    process.chdir(os.tmpdir());
    process.env.DOWNLOAD_PATH = './synthetic-data';
    process.env.EXCEL_FILENAME = 'fixture.xlsx';
    assert.equal(getDataPaths().filePath, path.join(projectRoot, 'synthetic-data', 'fixture.xlsx'));
    for (const filename of ['../fixture.xlsx', '..\\fixture.xlsx', '..', '.', 'metadata.json']) {
      process.env.EXCEL_FILENAME = filename;
      assert.throws(getDataPaths, /without directory segments/);
    }
  } finally {
    process.chdir(previousDirectory);
    if (previousPath === undefined) delete process.env.DOWNLOAD_PATH; else process.env.DOWNLOAD_PATH = previousPath;
    if (previousFilename === undefined) delete process.env.EXCEL_FILENAME; else process.env.EXCEL_FILENAME = previousFilename;
  }
});

test('scheduler validates cron and propagates immediate download failures', async t => {
  const previousSchedule = process.env.SCHEDULE_CRON;
  try {
    process.env.SCHEDULE_CRON = 'invalid';
    assert.throws(() => new DownloadScheduler(), /valid cron/);
    process.env.SCHEDULE_CRON = '*/5 * * * *';
    const scheduler = new DownloadScheduler();
    assert.match(scheduler.getNextRunTime(), /\*\/5/);
    t.mock.method(scheduler.downloader, 'download', async () => { throw new Error('Synthetic failure'); });
    await assert.rejects(scheduler.runNow(), /Synthetic failure/);
  } finally {
    if (previousSchedule === undefined) delete process.env.SCHEDULE_CRON; else process.env.SCHEDULE_CRON = previousSchedule;
  }
});

test('scheduler CLI starts from an absolute path on Windows or Linux without downloading', async t => {
  const directory = await workspace(t);
  const child = spawn(process.execPath, [fileURLToPath(new URL('../src/scheduler.js', import.meta.url))], {
    cwd: directory, env: { ...process.env, SCHEDULE_CRON: '0 0 1 1 *' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  let output = '';
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Scheduler did not start: ${output}`)), 10000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Scheduler exited before starting: ${code} ${output}`)); });
    child.stderr.on('data', data => { output += data; });
    child.stdout.on('data', data => {
      output += data;
      if (output.includes('Scheduler is running.')) { clearTimeout(timeout); resolve(); }
    });
  });
  const exited = once(child, 'exit');
  child.kill();
  await exited;
  assert.doesNotMatch(output, /Starting download process/);
});

test('scheduled Windows batch creates logs and propagates the downloader exit code', { skip: process.platform !== 'win32' }, async t => {
  const directory = await workspace(t);
  await fs.copyFile(new URL('../scheduled-download.bat', import.meta.url), path.join(directory, 'scheduled-download.bat'));
  await fs.writeFile(path.join(directory, 'node.cmd'), '@echo off\r\nexit /b 7\r\n');
  const child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/c', 'scheduled-download.bat'], {
    cwd: directory, env: { ...process.env, PATH: directory + path.delimiter + process.env.PATH }, stdio: 'ignore'
  });
  const [code] = await once(child, 'exit');
  assert.equal(code, 7);
  assert.match(await fs.readFile(path.join(directory, 'logs', 'scheduler.log'), 'utf8'), /exit code 7/);
});

test('server wrapper loads configured data and listens from a different working directory', async t => {
  const directory = await workspace(t);
  await writeWorkbook(path.join(directory, 'fixture.xlsx'));
  const child = spawn(process.execPath, [fileURLToPath(new URL('../server-wrapper.js', import.meta.url))], {
    cwd: os.tmpdir(),
    env: { ...process.env, DOWNLOAD_PATH: directory, EXCEL_FILENAME: 'fixture.xlsx', PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  let output = '';
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server wrapper did not start: ${output}`)), 10000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server wrapper exited before starting: ${code} ${output}`)); });
    child.stderr.on('data', data => { output += data; });
    child.stdout.on('data', data => {
      output += data;
      if (output.includes('Server listening on 0')) { clearTimeout(timeout); resolve(); }
    });
  });
  const exited = once(child, 'exit');
  child.kill();
  await exited;
  assert.match(output, /Data loaded successfully: 4 records/);
});
