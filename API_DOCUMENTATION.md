# Turkish Medicine API documentation

Base URL: `http://localhost:3000` by default. Available sheets and counts depend on the loaded workbook.

## Data and identifiers

Each row contains its original workbook columns, `_sheet` and a positive `id`. IDs are unique across the entire loaded workbook and follow sheet/row order. They are not stable product identifiers across updates. Sheets are recognized by an `İlaç Adı` header within their first five rows. Non-product sheets are skipped. A workbook with no recognized sheet fails to load; a recognized sheet with no rows is valid.

## Pagination and query validation

`GET /api/medicines`, `/api/medicines/search`, `/api/medicines/filter` and `/api/sheets/:slug` use:

| Parameter | Default | Accepted values |
| --- | --- | --- |
| `page` | `1` | Positive safe integer |
| `limit` | `50` | Positive safe integer, `0` or `-1` |

Normal responses have `page`, `limit`, `total`, `totalPages` and `data`. `limit=0` or `limit=-1` returns all matches, sets `page` to `1`, sets `limit` to the matching row count and sets `totalPages` to `1`. The same shape applies to an empty unpaginated result. A normal empty result has `totalPages: 0`.

Pagination values must occur once. Fractional numbers, trailing characters and integers outside JavaScript's safe range return `400`. The `q`, `field`, `value` and `sheet` values must be single, nonempty strings; arrays, objects and blank text return `400`. Search, filter and columns accept `sheet` as an exact loaded sheet name; an unknown sheet returns `404`.

## Endpoints

| Method and path | Parameters | Result |
| --- | --- | --- |
| `GET /` | None | API information, available sheets and aliases |
| `GET /health` | None | `status`, `dataLoaded`, `recordCount`, `lastLoadTime` |
| `GET /api/medicines` | `page`, `limit` | Paginated rows across all loaded sheets |
| `GET /api/medicines/all` | None | `total`, `data` without pagination |
| `GET /api/medicines/:id` | Positive safe integer ID | One row; `404` when absent, `400` for an invalid ID |
| `GET /api/medicines/search` | Required `q`; optional `sheet`, `page`, `limit` | Query, sheet and paginated substring matches across every field |
| `GET /api/medicines/filter` | Required `field`, `value`; optional `sheet`, `page`, `limit` | Field, value, sheet and paginated substring matches |
| `GET /api/sheets` | None | `totalSheets` and a sheet-name map containing `slug`, `records`, `endpoint` |
| `GET /api/sheets/:slug` | Optional `page`, `limit` | Sheet name, requested slug and paginated rows |
| `GET /api/columns` | Optional `sheet` | Sheet selection and union of column names |
| `GET /api/stats` | None | `totalRecords`, per-sheet `records` and `columns`, `sheetCount` |
| `GET /api/metadata` | None | Saved downloader metadata; `404` when unavailable |
| `POST /api/reload` | None | Reload message, record count and successful load time |
| `POST /api/download` | None | Download/reload message, metadata and record count |

Search and filter use case-insensitive Turkish substring matching. `field` must be an exact column name from `/api/columns`. A nonexistent field produces no matches. Values such as numeric zero are searchable. No translated English or duplicate normalized column names are added.

## Sheet aliases

| Alias | Workbook sheet name |
| --- | --- |
| `active` | `AKTİF ÜRÜNLER LİSTESİ` |
| `passive` | `PASİF ÜRÜNLER LİSTESİ` |
| `to-be-deactivated` | `PASİFE ALINACAK ÜRÜNLER` |
| `newly-added` | `LİSTEYE YENİ EKLENEN ÜRÜNLER` |
| `modified` | `DEĞİŞİKLİK YAPILAN ÜRÜNLER` |

An absent alias target returns `404`. Other sheets use the generated slug listed by `/api/sheets`. Generated slugs replace runs of non-ASCII alphanumeric characters with `-`; slugs can collide, so use the exact `sheet` query parameter when needed.

## Loading and errors

Data routes return `503` until a valid snapshot is loaded. `/health` reports process health even when no data is loaded; inspect `dataLoaded` separately. A failed reload returns `500` and preserves the previous data, parser and last successful load time. If a download completes but its reload fails, `/api/download` returns `500` rather than claiming success.

Errors use a JSON `error` field. Malformed JSON request bodies return `400`; oversized bodies return `413`. Other unexpected server failures return `500`.

Management routes are unauthenticated and can perform outbound downloads and file writes. Deployment access controls must restrict them to trusted callers. The default wildcard CORS setting does not provide authentication.

## Provenance and operational limits

Metadata fields are `downloadDate`, `sourceDate`, `sourceUrl` and `filePath`. The downloader selects the first matching HTTP(S) XLSX link on the configured HTML page. It does not infer release chronology. `sourceDate` is the first cell's text in the link's table row, which may be empty. The metadata describes the saved download and is not automatically recreated for manually supplied files.

The downloader validates a staged workbook before replacement. Workbook, JSON and metadata replacement are separate filesystem operations, not a multi-file transaction. API snapshots remain in memory until a successful reload or process restart. A separate scheduler does not notify the API of file updates.

See [README.md](README.md) for configuration, dependency provenance and validation limits. The saved synthetic fixtures verify parser, local API and mocked downloader boundaries; live TITCK exports, deployment infrastructure and clinical data accuracy require separate validation.
