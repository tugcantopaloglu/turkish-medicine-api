import XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';

class ExcelParser {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = null;
    this.sheets = {};
    this.allData = [];
  }

  async parse() {
    try {
      console.log(`Parsing Excel file: ${this.filePath}`);

      const fileBuffer = await fs.readFile(this.filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      console.log(`Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);

      let totalRecords = 0;

      // Parse all sheets
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];

        // Convert to array to find header row
        const rawArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        // Find the header row (look for row with "İlaç Adı" or similar)
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(5, rawArray.length); i++) {
          const row = rawArray[i];
          if (row.some(cell => cell && cell.toString().includes('İlaç Adı'))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          console.log(`Warning: Could not find header row in sheet "${sheetName}", skipping...`);
          return;
        }

        // Get the actual data starting from header row
        const headers = rawArray[headerRowIndex].map(h => h ? h.toString().trim() : '');
        const dataRows = rawArray.slice(headerRowIndex + 1);

        // Convert to objects using the headers
        const sheetData = dataRows
          .filter(row => row.some(cell => cell !== '')) // Skip empty rows
          .map(row => {
            const obj = { _sheet: sheetName };
            headers.forEach((header, index) => {
              if (header) {
                obj[header] = row[index] !== undefined ? row[index] : '';
              }
            });
            return obj;
          });

        this.sheets[sheetName] = this.normalizeData(sheetData, sheetName);
        this.allData.push(...this.sheets[sheetName]);
        totalRecords += this.sheets[sheetName].length;

        console.log(`  - ${sheetName}: ${this.sheets[sheetName].length} records`);
      });

      // Set default data to all combined data
      this.data = this.allData;

      console.log(`Parsed ${totalRecords} total records from ${Object.keys(this.sheets).length} sheets`);

      return this.data;
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  normalizeData(rawData, sheetName) {
    // Keep only original Turkish column names (more understandable)
    return rawData.map((row, index) => {
      const normalized = { _sheet: sheetName };

      // Keep only the original column names from Excel
      Object.keys(row).forEach(key => {
        if (key === '_sheet') {
          return; // Skip, already added
        }

        // Keep original Turkish column name only
        normalized[key] = row[key];
      });

      // Add a global ID for reference
      normalized.id = index + 1;

      return normalized;
    });
  }

  normalizeKey(key) {
    // Convert Turkish characters and create camelCase keys
    return key
      .toString()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w\s]/gi, '')
      .toLowerCase();
  }

  async saveAsJson(outputPath) {
    if (!this.data) {
      throw new Error('No data to save. Parse the Excel file first.');
    }

    try {
      await fs.writeFile(outputPath, JSON.stringify(this.data, null, 2));
      console.log(`Data saved as JSON: ${outputPath}`);
      return outputPath;
    } catch (error) {
      throw new Error(`Failed to save JSON: ${error.message}`);
    }
  }

  getData() {
    return this.data;
  }

  getSheetNames() {
    return Object.keys(this.sheets);
  }

  getSheetData(sheetName) {
    return this.sheets[sheetName] || null;
  }

  getAllSheets() {
    return this.sheets;
  }

  search(query, sheetName = null) {
    const dataToSearch = sheetName ? this.getSheetData(sheetName) : this.data;

    if (!dataToSearch) {
      throw new Error('No data loaded. Parse the Excel file first.');
    }

    const lowerQuery = query.toLowerCase();

    return dataToSearch.filter(item => {
      return Object.values(item).some(value => {
        return value.toString().toLowerCase().includes(lowerQuery);
      });
    });
  }

  filterByField(field, value, sheetName = null) {
    const dataToSearch = sheetName ? this.getSheetData(sheetName) : this.data;

    if (!dataToSearch) {
      throw new Error('No data loaded. Parse the Excel file first.');
    }

    const normalizedField = this.normalizeKey(field);

    return dataToSearch.filter(item => {
      const itemValue = item[normalizedField] || item[field];
      if (itemValue === undefined) return false;

      return itemValue.toString().toLowerCase().includes(value.toString().toLowerCase());
    });
  }

  getColumns(sheetName = null) {
    const dataToUse = sheetName ? this.getSheetData(sheetName) : this.data;

    if (!dataToUse || dataToUse.length === 0) {
      return [];
    }

    return Object.keys(dataToUse[0]);
  }

  getStats() {
    if (!this.data) {
      return null;
    }

    const sheetStats = {};
    Object.keys(this.sheets).forEach(sheetName => {
      sheetStats[sheetName] = {
        records: this.sheets[sheetName].length,
        columns: this.getColumns(sheetName).filter(c => !c.startsWith('_'))
      };
    });

    return {
      totalRecords: this.data.length,
      sheets: sheetStats,
      sheetCount: Object.keys(this.sheets).length
    };
  }
}

export default ExcelParser;
