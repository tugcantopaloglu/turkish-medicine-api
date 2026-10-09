# Quick Start

Use Node.js 22.14 or later. From the project directory:

```powershell
npm ci
Copy-Item .env.example .env
```

Provide an authorized XLSX export as `data/medicines.xlsx`, or run `npm run download` when TITCK access is available. Then start the API:

```powershell
npm start
```

```powershell
curl.exe http://localhost:3000/health
curl.exe "http://localhost:3000/api/medicines?limit=10"
curl.exe http://localhost:3000/api/sheets
curl.exe http://localhost:3000/api/stats
```

Counts and sheet availability come from the supplied workbook. An unloaded API returns `503` from data routes. Columns retain their original workbook names, and numeric row IDs are unique within a snapshot but can change on reload.

To run the offline regression suite:

```powershell
npm test
```

To start the separate scheduler:

```powershell
npm run scheduler
```

Its default is Monday at 09:00 in the host's local timezone. Scheduled downloads update files; run `POST /api/reload` or restart the API to serve updated data. `npm run scheduler -- --now` runs one immediate download and exits.

Relative `DOWNLOAD_PATH` values and the `.env` file resolve from the project root, including when a Windows service has a different working directory. See [README.md](README.md) for configuration, provenance, management-route access and known validation limits.
