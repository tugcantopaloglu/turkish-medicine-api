# Turkish Medicine API

An Express API that reads a local XLSX workbook and exposes its product sheets as JSON. A separate downloader locates an XLSX link on the configured TITCK page, and a separate scheduler can run that downloader periodically.

No TITCK dataset is committed. Sheet names, product counts and columns depend on the workbook you supply. The saved fixtures under `test/fixtures` contain synthetic regression data only.

## Run locally

Use Node.js 22.14 or later and npm. Install the locked dependencies and copy the configuration template:

```powershell
npm ci
Copy-Item .env.example .env
```

Place an authorized XLSX export at `data/medicines.xlsx`, or run the downloader when source access is available:

```powershell
npm run download
npm start
```

The API listens on `http://localhost:3000` by default. Starting the API does not download data or start the scheduler. Without a valid workbook, `/health` reports `dataLoaded: false` and data endpoints return `503`.

```powershell
npm test
npm run dev
```

Tests use temporary workbooks built from saved synthetic fixtures and local HTTP servers. They do not fetch TITCK records. There is no separate compilation or bundle step.

## API

| Endpoint | Behavior |
| --- | --- |
| `GET /` | API information and available sheet names |
| `GET /health` | Process health, loaded record count and last successful load time |
| `GET /api/medicines` | All loaded product rows, paginated |
| `GET /api/medicines/all` | All loaded rows in one response |
| `GET /api/medicines/:id` | One row by its workbook-wide numeric ID |
| `GET /api/medicines/search?q=...` | Case-insensitive substring search across fields |
| `GET /api/medicines/filter?field=...&value=...` | Substring filter using an exact original column name |
| `GET /api/sheets` | Loaded sheet names, counts and their generated endpoints |
| `GET /api/sheets/:slug` | Rows from one sheet |
| `GET /api/columns` | Union of columns in the selected data |
| `GET /api/stats` | Loaded sheet and record counts |
| `GET /api/metadata` | Saved downloader metadata, or `404` if absent |
| `POST /api/reload` | Load the configured workbook again |
| `POST /api/download` | Download, validate and reload the configured workbook |

Search, filter and columns accept an optional `sheet` parameter containing the exact sheet name. Unknown sheets return `404`. The `q`, `field`, `value` and `sheet` values must be single, nonempty strings; repeated values or bracket-style objects return `400`.

Paginated endpoints accept `page` (positive integer, default `1`) and `limit` (positive integer, default `50`). `limit=0` and `limit=-1` return every matching row with `page: 1`. Invalid or unsafe integers return `400`.

The aliases `active`, `passive`, `to-be-deactivated`, `newly-added` and `modified` resolve to the existing Turkish sheet names shown by `GET /`. An alias returns `404` if that sheet is absent. Other sheet slugs are listed by `/api/sheets`.

Rows retain the workbook's Turkish column names, plus `_sheet` and `id`. IDs are unique across one loaded workbook, but can change after an update. They are row references, not persistent product identifiers. Search and filter use Turkish case folding; barcode cells stored as text retain leading zeros.

Management endpoints have no authentication, and CORS allows all origins. Limit access to management routes through the deployment's trusted network or reverse proxy. A failed reload leaves the last successfully loaded snapshot available. Successful loads also write `medicines.json`, so the data directory must be writable.

## Configuration and updates

The project-root `.env` file is loaded regardless of the process working directory. Existing environment variables take precedence.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | Express listen target; IIS can supply a named pipe |
| `DOWNLOAD_URL` | `https://www.titck.gov.tr/dinamikmodul/43` | HTML page searched for an XLSX link |
| `DOWNLOAD_PATH` | `./data` | Data directory, relative to the project root or an absolute path |
| `EXCEL_FILENAME` | `medicines.xlsx` | Local XLSX filename without directory segments |
| `SCHEDULE_CRON` | `0 9 * * 1` | Downloader schedule in the host's local timezone |

```powershell
npm run scheduler
npm run scheduler -- --now
```

The default schedule is Monday at 09:00 in the host's timezone. Keep the scheduler process running for recurring updates. Invalid cron expressions fail at startup; an immediate download failure exits unsuccessfully. Scheduled or command-line downloads update files only. Reload or restart the API to serve the new snapshot.

The downloader selects the first HTTP(S) link whose URL path ends in `.xlsx`, case-insensitively. It resolves relative links against the configured page URL. It does not sort links by date or prove that the first link is the newest release. Source-page changes may require an update to discovery.

A candidate is parsed before the saved workbook, JSON and metadata are replaced. These three file replacements are separate operations, so disk or permission failures during publication can leave them out of sync. Use one downloader at a time. Files without an XLSX ZIP signature or any recognized product sheet are rejected. Header detection currently looks for `İlaç Adı` within the first five rows of each sheet; other sheets are skipped.

## Data provenance and validation

The configured upstream is [TITCK's product-list page](https://www.titck.gov.tr/dinamikmodul/43). Downloader metadata records `downloadDate`, the first table cell's unparsed `sourceDate`, the selected `sourceUrl` and the local `filePath`. These values describe the downloaded file, not clinical validation or a guaranteed release date. A manually supplied workbook does not create download metadata. Metadata can describe a different file if an operator replaces the workbook manually.

No current record counts, source availability, real workbook compatibility or IIS deployment success are asserted by the regression suite. Verify the source URL, workbook structure and provenance before relying on a real export. The service returns source data and does not provide treatment recommendations.

Run `npm audit` to see all dependency advisories. SheetJS uses the official CDN release described in its [installation documentation](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), because the public npm package stops at an older release. See [API documentation](API_DOCUMENTATION.md) for response contracts and [quick start](QUICKSTART.md) for a short setup. The older Turkish and PDF guides contain historical examples; the English Markdown documentation describes the maintained behavior.

The locked dependencies retain two moderate audit findings through `node-cron` 3 and its `uuid` dependency. The advisory concerns UUID v3/v5/v6 buffer operations; the scheduler dependency uses UUID v4. npm's suggested repair requires a scheduler major-version migration. CI prints the audit findings and fails on high or critical advisories.

The package declares an MIT software license. Upstream medicine data and bundled third-party components retain their own terms and attribution.
