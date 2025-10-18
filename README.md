# Turkish Medicine API

A RESTful API service for Turkish Medicine Database (TITCK) with automated weekly updates. This service automatically downloads the latest medicine data from TITCK and provides a clean, searchable API with access to ALL data sheets.

## Features

- **Multi-sheet support** - Access all 5 data sheets separately or combined
- **17,700+ medicine records** from all sheets:
  - Active Products (7,887 records)
  - Passive Products (9,759 records)
  - Products to be Deactivated (61 records)
  - Newly Added Products (3 records)
  - Modified Products (3 records)
- Automated weekly downloads from TITCK website
- RESTful API with comprehensive endpoints
- Full-text search across all sheets or within specific sheets
- Filter by any field with optional sheet selection
- Pagination support
- Excel to JSON conversion with proper column detection
- Both Turkish and normalized English column names
- Clean error handling
- Configurable scheduling

## Quick Start

### Installation

```bash
npm install
```

### Initial Setup

1. Download the latest medicine data:
```bash
npm run download
```

2. Start the API server:
```bash
npm start
```

The API will be available at `http://localhost:3000`

### Development Mode

Run with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Information & Health

- `GET /` - API information and endpoint list
- `GET /health` - Health check and status

### Medicine Data (All Sheets)

- `GET /api/medicines` - Get all medicines from all sheets (paginated)
  - Query params: `page` (default: 1), `limit` (default: 50)

- `GET /api/medicines/:id` - Get medicine by ID

- `GET /api/medicines/search?q=query` - Search medicines across all sheets or specific sheet
  - Query params: `q` (required), `sheet` (optional), `page`, `limit`
  - Example: `/api/medicines/search?q=parol&sheet=AKTİF ÜRÜNLER LİSTESİ`

- `GET /api/medicines/filter?field=fieldName&value=value` - Filter by specific field
  - Query params: `field` (required), `value` (required), `sheet` (optional), `page`, `limit`

### Sheet-Specific Data (Clean English Endpoints)

- `GET /api/sheets` - List all available sheets with record counts
- `GET /api/sheets/active` - Active products (7,887 records)
- `GET /api/sheets/passive` - Passive products (9,759 records)
- `GET /api/sheets/to-be-deactivated` - Products to be deactivated (61 records)
- `GET /api/sheets/newly-added` - Newly added products (3 records)
- `GET /api/sheets/modified` - Modified products (3 records)

All sheet endpoints support pagination with `page` and `limit` query params.

### Metadata & Information

- `GET /api/columns` - Get available column names
  - Query params: `sheet` (optional) - Get columns for specific sheet
- `GET /api/stats` - Get database statistics for all sheets
- `GET /api/metadata` - Get download metadata

### Management

- `POST /api/reload` - Reload data from Excel file
- `POST /api/download` - Download latest file and reload data

## Usage Examples

### Search for a medicine across all sheets
```bash
curl "http://localhost:3000/api/medicines/search?q=parol"
```

### Search within a specific sheet
```bash
curl "http://localhost:3000/api/medicines/search?q=parol&sheet=AKTİF%20ÜRÜNLER%20LİSTESİ"
```

### Get active products only
```bash
curl "http://localhost:3000/api/sheets/active?limit=10"
```

### Get passive products only
```bash
curl "http://localhost:3000/api/sheets/passive?limit=10"
```

### Get newly added products
```bash
curl "http://localhost:3000/api/sheets/newly-added"
```

### Get products to be deactivated
```bash
curl "http://localhost:3000/api/sheets/to-be-deactivated"
```

### List all available sheets
```bash
curl "http://localhost:3000/api/sheets"
```

### Get statistics for all sheets
```bash
curl "http://localhost:3000/api/stats"
```

### Filter by field (e.g., by barcode)
```bash
curl "http://localhost:3000/api/medicines/filter?field=Barkod&value=8699717"
```

### Get columns for a specific sheet
```bash
curl "http://localhost:3000/api/columns?sheet=AKTİF%20ÜRÜNLER%20LİSTESİ"
```

### Get paginated results
```bash
curl "http://localhost:3000/api/medicines?page=2&limit=100"
```

### Download latest data
```bash
curl -X POST "http://localhost:3000/api/download"
```

## Automation

### Weekly Scheduler

Start the automated weekly downloader:
```bash
npm run scheduler
```

By default, it runs every Monday at 9:00 AM. Customize the schedule in `.env`:

```env
SCHEDULE_CRON=0 9 * * 1
```

Cron format: `minute hour day month dayOfWeek`

Examples:
- Every Monday at 9 AM: `0 9 * * 1`
- Every day at midnight: `0 0 * * *`
- Every Sunday at 3 PM: `0 15 * * 0`

### Manual Download

Download the latest file manually:
```bash
npm run download
```

## Configuration

Edit `.env` file:

```env
# Server port
PORT=3000

# Download settings
DOWNLOAD_URL=https://www.titck.gov.tr/dinamikmodul/43
DOWNLOAD_PATH=./data
EXCEL_FILENAME=medicines.xlsx

# Scheduler (cron format)
SCHEDULE_CRON=0 9 * * 1
```

## Project Structure

```
turkish-medicine-api/
├── src/
│   ├── server.js          # API server
│   ├── downloader.js      # File downloader
│   ├── excelParser.js     # Excel parser
│   └── scheduler.js       # Automated scheduler
├── data/
│   ├── medicines.xlsx     # Downloaded Excel file
│   ├── medicines.json     # Parsed JSON data
│   └── metadata.json      # Download metadata
├── .env                   # Configuration
├── package.json
└── README.md
```

## Response Format

All paginated endpoints return:

```json
{
  "page": 1,
  "limit": 50,
  "total": 5000,
  "totalPages": 100,
  "data": [...]
}
```

Error responses:

```json
{
  "error": "Error message"
}
```

## Requirements

- Node.js 18+
- npm or yarn

## License

MIT

## Data Source

Data is sourced from TITCK (Türkiye İlaç ve Tıbbi Cihaz Kurumu):
https://www.titck.gov.tr/dinamikmodul/43
