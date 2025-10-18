# Quick Start Guide

## Setup in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Download Latest Data
```bash
npm run download
```

This will:
- Fetch the latest Excel file from TITCK website
- Save it to `./data/medicines.xlsx`
- Create metadata file with download info

### 3. Start the API Server
```bash
npm start
```

Server will be running at: `http://localhost:3000`

## Test the API

Open your browser or use curl:

```bash
# Get API info
curl http://localhost:3000/

# Health check
curl http://localhost:3000/health

# Get first 10 medicines
curl "http://localhost:3000/api/medicines?limit=10"

# Search for a medicine
curl "http://localhost:3000/api/medicines/search?q=aspirin"

# Get medicine by ID
curl http://localhost:3000/api/medicines/100

# Get available columns
curl http://localhost:3000/api/columns

# Get statistics
curl http://localhost:3000/api/stats
```

## Enable Automatic Weekly Updates

To automatically download the latest data every week:

```bash
npm run scheduler
```

By default, this runs every Monday at 9:00 AM. To change the schedule, edit `.env`:

```env
SCHEDULE_CRON=0 9 * * 1
```

## Development Mode

Run with auto-reload on file changes:

```bash
npm run dev
```

## Project Structure

```
turkish-medicine-api/
├── src/
│   ├── server.js          # Main API server
│   ├── downloader.js      # TITCK website scraper
│   ├── excelParser.js     # Excel to JSON converter
│   └── scheduler.js       # Cron scheduler
├── data/
│   ├── medicines.xlsx     # Downloaded Excel file
│   ├── medicines.json     # Parsed JSON cache
│   └── metadata.json      # Download metadata
└── .env                   # Configuration
```

## Key Features

- **17,700+ medicine records** from TITCK database across 5 sheets
  - Active Products: 7,887 records
  - Passive Products: 9,759 records
  - Products to be Deactivated: 61 records
  - Newly Added Products: 3 records
  - Modified Products: 3 records
- **Multi-sheet support** - Access each sheet separately or search across all
- **Full-text search** across all fields and sheets
- **Sheet-specific endpoints** for targeted queries
- **Pagination** support for large datasets
- **Filter by field** with optional sheet selection
- **Turkish and English column names** for flexibility
- **Automatic weekly updates** via cron scheduler
- **RESTful API** with JSON responses
- **CORS enabled** for frontend integration

## Need Help?

See the full [README.md](./README.md) for detailed documentation.
