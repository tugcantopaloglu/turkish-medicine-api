# Turkish Medicine API - Complete Documentation

Version: 2.0.0

Base URL: `http://localhost:3000`

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [General Information](#general-information)
  - [Medicine Data](#medicine-data)
  - [Sheet-Specific Data](#sheet-specific-data)
  - [Search & Filter](#search--filter)
  - [Metadata & Statistics](#metadata--statistics)
  - [Management](#management)
- [Data Schema](#data-schema)
- [Examples](#examples)

---

## Overview

The Turkish Medicine API provides programmatic access to the TITCK (Türkiye İlaç ve Tıbbi Cihaz Kurumu) medicine database. The API serves data from 5 different Excel sheets containing information about active, passive, and modified pharmaceutical products in Turkey.

**Total Records**: 17,713 medicine records

**Data Sheets**:
- Active Products: 7,887 records
- Passive Products: 9,759 records
- Products to be Deactivated: 61 records
- Newly Added Products: 3 records
- Modified Products: 3 records

**Update Frequency**: Weekly (every Monday at 9:00 AM by default)

---

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

---

## Response Format

All responses are in JSON format with UTF-8 encoding.

### Success Response

```json
{
  "page": 1,
  "limit": 50,
  "total": 7887,
  "totalPages": 158,
  "data": [...]
}
```

### Error Response

```json
{
  "error": "Error message describing what went wrong"
}
```

**HTTP Status Codes**:
- `200 OK` - Request successful
- `400 Bad Request` - Invalid parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Data not loaded yet

---

## Error Handling

The API uses standard HTTP status codes to indicate success or failure.

**Common Errors**:

| Status Code | Error Message | Description |
|-------------|---------------|-------------|
| 400 | Query parameter "q" is required | Search query missing |
| 400 | Parameters "field" and "value" are required | Filter parameters missing |
| 404 | Sheet not found | Invalid sheet name/slug |
| 404 | Medicine not found | Medicine ID doesn't exist |
| 503 | Data not loaded yet | Server starting or data loading failed |

---

## Endpoints

### General Information

#### Get API Information

```
GET /
```

Returns API information, available endpoints, and sheet aliases.

**Response**:
```json
{
  "name": "Turkish Medicine API",
  "version": "2.0.0",
  "description": "API for Turkish Medicine Database (TITCK) - All Sheets Supported",
  "endpoints": {
    "/": "API information",
    "/health": "Health check",
    ...
  },
  "sheets": [
    "AKTİF ÜRÜNLER LİSTESİ",
    "PASİF ÜRÜNLER LİSTESİ",
    ...
  ],
  "sheetAliases": {
    "active": "AKTİF ÜRÜNLER LİSTESİ",
    "passive": "PASİF ÜRÜNLER LİSTESİ",
    ...
  }
}
```

#### Health Check

```
GET /health
```

Returns server health status and data loading information.

**Response**:
```json
{
  "status": "healthy",
  "dataLoaded": true,
  "recordCount": 17713,
  "lastLoadTime": "2025-10-18T06:30:30.569Z"
}
```

---

### Medicine Data

#### Get All Medicines

```
GET /api/medicines
```

Returns all medicines from all sheets with pagination.

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 50 | Records per page |

**Example Request**:
```bash
GET /api/medicines?page=2&limit=100
```

**Response**:
```json
{
  "page": 2,
  "limit": 100,
  "total": 17713,
  "totalPages": 178,
  "data": [
    {
      "_sheet": "AKTİF ÜRÜNLER LİSTESİ",
      "İlaç Adı": "PAROL 500 MG TABLET",
      "la_ad": "PAROL 500 MG TABLET",
      "Barkod": 8699717690028,
      "ATC Kodu": "N02BE01",
      "atc_kodu": "N02BE01",
      "ATC Adı": "paracetamol",
      "atc_ad": "paracetamol",
      "Firma Adı": "ATABAY KİMYA SANAYİ VE TİC. A.Ş.",
      "firma_ad": "ATABAY KİMYA SANAYİ VE TİC. A.Ş.",
      "Reçete Türü": "Normal",
      "reete_tr": "Normal",
      "Durumu": "Aktif",
      "id": 101
    }
  ]
}
```

#### Get Medicine by ID

```
GET /api/medicines/:id
```

Returns a single medicine record by its ID.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Medicine ID |

**Example Request**:
```bash
GET /api/medicines/100
```

**Response**:
```json
{
  "_sheet": "AKTİF ÜRÜNLER LİSTESİ",
  "İlaç Adı": "CYLORIN 25 MG YUMUSAK KAPSUL (50 KAPSUL)",
  "la_ad": "CYLORIN 25 MG YUMUSAK KAPSUL (50 KAPSUL)",
  "Barkod": 8680199196634,
  "ATC Kodu": "L04AD01",
  "atc_kodu": "L04AD01",
  "ATC Adı": "ciclosporin",
  "atc_ad": "ciclosporin",
  "id": 100
}
```

**Error Response** (404):
```json
{
  "error": "Medicine not found"
}
```

---

### Sheet-Specific Data

All sheet endpoints support pagination via `page` and `limit` query parameters.

#### List All Sheets

```
GET /api/sheets
```

Returns information about all available sheets.

**Response**:
```json
{
  "totalSheets": 5,
  "sheets": {
    "AKTİF ÜRÜNLER LİSTESİ": {
      "slug": "active",
      "records": 7887,
      "endpoint": "/api/sheets/active"
    },
    "PASİF ÜRÜNLER LİSTESİ": {
      "slug": "passive",
      "records": 9759,
      "endpoint": "/api/sheets/passive"
    },
    ...
  }
}
```

#### Get Active Products

```
GET /api/sheets/active
```

Returns all active (currently marketed) pharmaceutical products.

**Query Parameters**: `page`, `limit`

**Response**: Same format as "Get All Medicines"

#### Get Passive Products

```
GET /api/sheets/passive
```

Returns all passive (discontinued) pharmaceutical products.

**Query Parameters**: `page`, `limit`

#### Get Products to be Deactivated

```
GET /api/sheets/to-be-deactivated
```

Returns products scheduled to be deactivated.

**Query Parameters**: `page`, `limit`

#### Get Newly Added Products

```
GET /api/sheets/newly-added
```

Returns recently added pharmaceutical products.

**Query Parameters**: `page`, `limit`

#### Get Modified Products

```
GET /api/sheets/modified
```

Returns products that have been recently modified.

**Query Parameters**: `page`, `limit`

---

### Search & Filter

#### Search Medicines

```
GET /api/medicines/search
```

Search for medicines across all sheets or within a specific sheet.

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query (case-insensitive) |
| sheet | string | No | Sheet name to search within |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Records per page (default: 50) |

**Example Requests**:
```bash
# Search across all sheets
GET /api/medicines/search?q=parol

# Search within active products only
GET /api/medicines/search?q=parol&sheet=AKTİF%20ÜRÜNLER%20LİSTESİ

# Search with pagination
GET /api/medicines/search?q=aspirin&page=1&limit=10
```

**Response**:
```json
{
  "query": "parol",
  "sheet": "all",
  "page": 1,
  "limit": 50,
  "total": 12,
  "totalPages": 1,
  "data": [...]
}
```

#### Filter by Field

```
GET /api/medicines/filter
```

Filter medicines by a specific field value.

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| field | string | Yes | Field name (Turkish or English) |
| value | string | Yes | Value to filter by (partial match) |
| sheet | string | No | Sheet name to filter within |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Records per page (default: 50) |

**Example Requests**:
```bash
# Filter by barcode
GET /api/medicines/filter?field=Barkod&value=8699717

# Filter by company name
GET /api/medicines/filter?field=Firma%20Adı&value=BAYER

# Filter in specific sheet
GET /api/medicines/filter?field=Durumu&value=Aktif&sheet=AKTİF%20ÜRÜNLER%20LİSTESİ
```

**Response**:
```json
{
  "field": "Barkod",
  "value": "8699717",
  "sheet": "all",
  "page": 1,
  "limit": 50,
  "total": 8,
  "totalPages": 1,
  "data": [...]
}
```

---

### Metadata & Statistics

#### Get Available Columns

```
GET /api/columns
```

Returns all available column names.

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sheet | string | No | Get columns for specific sheet |

**Example Requests**:
```bash
# Get all columns
GET /api/columns

# Get columns for active products
GET /api/columns?sheet=AKTİF%20ÜRÜNLER%20LİSTESİ
```

**Response**:
```json
{
  "sheet": "all",
  "columns": [
    "_sheet",
    "İlaç Adı",
    "la_ad",
    "Barkod",
    "ATC Kodu",
    "atc_kodu",
    "ATC Adı",
    "atc_ad",
    "Firma Adı",
    "firma_ad",
    "Reçete Türü",
    "reete_tr",
    "Durumu",
    "Açıklama",
    "aklama",
    "id"
  ]
}
```

#### Get Statistics

```
GET /api/stats
```

Returns statistics for all sheets.

**Response**:
```json
{
  "totalRecords": 17713,
  "sheetCount": 5,
  "sheets": {
    "AKTİF ÜRÜNLER LİSTESİ": {
      "records": 7887,
      "columns": ["İlaç Adı", "Barkod", "ATC Kodu", ...]
    },
    "PASİF ÜRÜNLER LİSTESİ": {
      "records": 9759,
      "columns": ["İlaç Adı", "Barkod", "ATC Kodu", ...]
    },
    ...
  }
}
```

#### Get Download Metadata

```
GET /api/metadata
```

Returns information about the last data download.

**Response**:
```json
{
  "downloadDate": "2025-10-18T06:24:41.856Z",
  "sourceDate": "E-Reçete İlaç Listesi",
  "sourceUrl": "https://titck.gov.tr/storage/Archive/2025/...",
  "filePath": "data/medicines.xlsx"
}
```

---

### Management

#### Reload Data

```
POST /api/reload
```

Reloads data from the existing Excel file without downloading.

**Response**:
```json
{
  "message": "Data reloaded successfully",
  "recordCount": 17713,
  "loadTime": "2025-10-18T06:30:30.569Z"
}
```

#### Download Latest Data

```
POST /api/download
```

Downloads the latest Excel file from TITCK and reloads data.

**Response**:
```json
{
  "message": "File downloaded and data loaded successfully",
  "metadata": {
    "downloadDate": "2025-10-18T06:24:41.856Z",
    "sourceDate": "E-Reçete İlaç Listesi",
    "sourceUrl": "https://titck.gov.tr/storage/Archive/2025/...",
    "filePath": "data/medicines.xlsx"
  },
  "recordCount": 17713
}
```

---

## Data Schema

### Medicine Record Structure

Each medicine record contains both Turkish and English column names for flexibility.

**Active Products Fields**:

| Turkish Column | English Column | Type | Description |
|----------------|----------------|------|-------------|
| _sheet | _sheet | string | Source sheet name |
| İlaç Adı | la_ad | string | Medicine name |
| Barkod | - | number | Barcode number |
| ATC Kodu | atc_kodu | string | ATC code |
| ATC Adı | atc_ad | string | ATC description |
| Firma Adı | firma_ad | string | Company name |
| Reçete Türü | reete_tr | string | Prescription type |
| Durumu | - | string | Status (Aktif/Pasif) |
| Açıklama | aklama | string | Notes/Description |
| Temel İlaç Listesi Durumu | temel_la_listesi_durumu | number | Essential medicines list status |
| Çocuk Temel İlaç Listesi Durumu | ocuk_temel_la_listesi_durumu | number | Children's essential medicines status |
| Yenidoğan Temel İlaç Listesi Durumu | yenidoan_temel_la_listesi_durumu | number | Newborn essential medicines status |
| Aktif Ürünler Listesine Alındığı Tarih | aktif_rnler_listesine_alnd_tarih | number | Date added to active list |
| id | id | number | Unique identifier |

**Passive Products Fields**:

Similar to active products but with:
- `Pasif Ürünler Listesine Alındığı Tarih` (pasif_rnler_listesine_alnd_tarih) - Date added to passive list
- No essential medicines list fields

---

## Examples

### Example 1: Search for Pain Medications

```bash
curl "http://localhost:3000/api/medicines/search?q=parol&limit=5"
```

**Response**:
```json
{
  "query": "parol",
  "sheet": "all",
  "page": 1,
  "limit": 5,
  "total": 12,
  "totalPages": 3,
  "data": [
    {
      "_sheet": "AKTİF ÜRÜNLER LİSTESİ",
      "İlaç Adı": "PAROL 500 MG TABLET",
      "Barkod": 8699717690028,
      "ATC Kodu": "N02BE01",
      "ATC Adı": "paracetamol",
      "Firma Adı": "ATABAY KİMYA SANAYİ VE TİC. A.Ş.",
      "id": 5500
    }
  ]
}
```

### Example 2: Get Only Active Products from BAYER

```bash
curl "http://localhost:3000/api/medicines/filter?field=Firma%20Adı&value=BAYER&sheet=AKTİF%20ÜRÜNLER%20LİSTESİ&limit=3"
```

### Example 3: Get Newly Added Medicines

```bash
curl "http://localhost:3000/api/sheets/newly-added"
```

**Response**:
```json
{
  "sheet": "LİSTEYE YENİ EKLENEN ÜRÜNLER",
  "slug": "newly-added",
  "page": 1,
  "limit": 50,
  "total": 3,
  "totalPages": 1,
  "data": [
    {
      "_sheet": "LİSTEYE YENİ EKLENEN ÜRÜNLER",
      "İlaç Adı": "LYPTIMZIA 284MG/ 1,5 ML ENJEKSIYONLUK COZELTI",
      "Barkod": 8699074950520,
      "ATC Kodu": "C10AX16",
      "ATC Adı": "inclisiran",
      "Açıklama": "Ekleme yeni ürün/Aktif ürünler listesine eklendi.",
      "id": 1
    }
  ]
}
```

### Example 4: Get Statistics

```bash
curl "http://localhost:3000/api/stats"
```

### Example 5: Search Within Passive Products Only

```bash
curl "http://localhost:3000/api/medicines/search?q=aspirin&sheet=PASİF%20ÜRÜNLER%20LİSTESİ"
```

### Example 6: Filter by Barcode Prefix

```bash
curl "http://localhost:3000/api/medicines/filter?field=Barkod&value=86997"
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. Consider implementing rate limiting in production environments.

---

## CORS

CORS is enabled for all origins (`*`). Configure this appropriately for production use.

---

## Support & Issues

For issues and feature requests, please refer to the project repository.

---

## Data Source

All data is sourced from TITCK (Türkiye İlaç ve Tıbbi Cihaz Kurumu):
https://www.titck.gov.tr/dinamikmodul/43

**Data Update Schedule**: Weekly, every Monday at 9:00 AM (configurable)

---

## Version History

**v2.0.0** (Current)
- Added multi-sheet support
- Clean English endpoint aliases
- Dual column names (Turkish + English)
- Enhanced search and filter with sheet selection
- Sheet-specific endpoints

**v1.0.0**
- Initial release
- Basic API functionality
- Single sheet support
