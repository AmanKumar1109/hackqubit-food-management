import * as XLSX from 'xlsx';
import {
  CANONICAL_KEYS,
  FIELD_ALIASES,
  normalizeHeaderString,
  formatExcelTimestamp,
  formatCleanString,
  sanitizeTeamRow,
  getSampleTeamExcelData,
  HACKATHON_TEAM_SCHEMA
} from '../utils/teamSchema';

/**
 * Parses an Excel (.xlsx, .xls) or CSV (.csv) file into canonical HackQubit 2.0 team records.
 * Uses adaptive header row detection and column index mapping so that even if the sheet
 * has title banners, empty rows at the top, or messy headers, the data is never blank.
 */
export const parseExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('The uploaded workbook contains no sheets.');
        }

        // Find the most suitable sheet (prioritizing non-empty sheets with matching headers)
        let selectedSheetName = workbook.SheetNames[0];
        let selectedWorksheet = workbook.Sheets[selectedSheetName];
        let maxSheetRows = 0;

        for (const sName of workbook.SheetNames) {
          const ws = workbook.Sheets[sName];
          if (!ws || !ws['!ref']) continue;
          const matrix = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: '',
            raw: true,
            blankrows: false
          });
          if (matrix.length > maxSheetRows) {
            maxSheetRows = matrix.length;
            selectedSheetName = sName;
            selectedWorksheet = ws;
          }
        }

        if (!selectedWorksheet) {
          throw new Error('Unable to find an active worksheet in the workbook.');
        }

        // 1. Read sheet as Array of Arrays (2D matrix) preserving dates
        const rawMatrix = XLSX.utils.sheet_to_json(selectedWorksheet, {
          header: 1,
          defval: '',
          raw: true,
          blankrows: false
        });

        if (!rawMatrix || rawMatrix.length === 0) {
          throw new Error('No data found in the sheet or sheet is empty.');
        }

        // 2. Intelligent Header Detection: Scan the first 25 rows to identify the actual header row
        let headerRowIndex = 0;
        let maxMatchScore = 0;
        let bestHeaderMapping = {}; // key -> colIndex
        const allFieldKeys = Object.keys(FIELD_ALIASES);

        for (let r = 0; r < Math.min(rawMatrix.length, 25); r++) {
          const row = rawMatrix[r];
          if (!Array.isArray(row) || row.length === 0) continue;

          let score = 0;
          const tempMapping = {};

          row.forEach((cellVal, colIndex) => {
            const cleanVal = normalizeHeaderString(cellVal);
            if (!cleanVal) return;

            for (const fieldKey of allFieldKeys) {
              if (tempMapping[fieldKey] !== undefined) continue;
              const aliases = FIELD_ALIASES[fieldKey];
              const isMatch = aliases.some(
                (alias) => normalizeHeaderString(alias) === cleanVal
              );
              if (isMatch) {
                tempMapping[fieldKey] = colIndex;
                score++;
                break;
              }
            }
          });

          if (score > maxMatchScore) {
            maxMatchScore = score;
            headerRowIndex = r;
            bestHeaderMapping = tempMapping;
          }
        }

        // If no headers matched at all (e.g. headless CSV/Excel), fallback to sequential 20 columns
        if (maxMatchScore < 2) {
          headerRowIndex = -1; // Data starts from row 0
          CANONICAL_KEYS.forEach((key, idx) => {
            bestHeaderMapping[key] = idx;
          });
        }

        // 3. Extract and map data rows
        const parsedRows = [];
        for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
          const rowArray = rawMatrix[r];
          if (!Array.isArray(rowArray) || rowArray.length === 0) continue;

          // Check if row has any non-empty cell
          const hasContent = rowArray.some(
            (c) => c !== undefined && c !== null && String(c).trim() !== ''
          );
          if (!hasContent) continue;

          const rowObj = {};
          CANONICAL_KEYS.forEach((key) => {
            const colIdx = bestHeaderMapping[key];
            let cellValue = '';
            if (colIdx !== undefined && rowArray[colIdx] !== undefined && rowArray[colIdx] !== null) {
              const rawCell = rowArray[colIdx];
              if (key === 'TimeStamp') {
                cellValue = formatExcelTimestamp(rawCell);
              } else {
                cellValue = formatCleanString(rawCell);
              }
            }
            rowObj[key] = cellValue;
          });

          // Filter out completely blank ghost rows
          const hasSignificantData =
            Boolean(rowObj['Team Name']) ||
            Boolean(rowObj['Leader Name']) ||
            Boolean(rowObj['Leader Contact']) ||
            Boolean(rowObj['TimeStamp']);

          if (hasSignificantData) {
            // Sanitize into canonical team schema
            const sanitized = sanitizeTeamRow(rowObj, parsedRows.length);
            parsedRows.push(sanitized);
          }
        }

        if (parsedRows.length === 0) {
          throw new Error(
            'Could not extract any valid team rows from this sheet. Please verify the columns match the HackQubit schema.'
          );
        }

        const displayHeaders = ['Special ID', ...CANONICAL_KEYS];

        resolve({
          fileName: file.name,
          sheetName: selectedSheetName,
          headers: displayHeaders,
          totalRows: parsedRows.length,
          rows: parsedRows,
          isTeamSchemaMatched: true
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file from disk.'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Generates and downloads the official Hackathon Participants & WiFi Credentials Excel template
 * matching the exact 20 Google Form columns specified by HackQubit 2.0.
 */
export const downloadSampleExcel = () => {
  const sampleData = getSampleTeamExcelData();
  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Participants_WiFi_Credentials');
  XLSX.writeFile(wb, 'hackqubit_participants_wifi_credentials.xlsx');
};

export { HACKATHON_TEAM_SCHEMA };
