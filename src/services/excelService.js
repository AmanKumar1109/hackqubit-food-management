import * as XLSX from 'xlsx';
import { generateSpecialId } from '../utils/idGenerator';

/**
 * Parses an Excel or CSV file (.xlsx, .xls, .csv)
 * Extracts the 1st row as object keys and automatically assigns a unique 16-character alphanumeric Special ID to each user.
 */
export const parseExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('The uploaded workbook contains no sheets.');
        }

        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON using 1st row as headers/keys
        const rawJson = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false
        });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('No data found in the sheet or sheet is empty.');
        }

        // Extract header column names from the first object keys
        let headers = Object.keys(rawJson[0]).map((h) => h.trim());

        // Ensure "Special ID" is in the header list at the beginning if not present
        const hasSpecialId = headers.some((h) =>
          ['special id', 'specialid', 'uid', 'unique id'].includes(h.toLowerCase())
        );

        if (!hasSpecialId) {
          headers = ['Special ID', ...headers];
        }

        // Sanitize rows (trim strings, standardize keys, and ensure 16-digit alphanumeric ID)
        const sanitizedRows = rawJson.map((row, index) => {
          // Generate or preserve 16-char alphanumeric Special ID
          const existingId =
            row['Special ID'] ||
            row['special_id'] ||
            row['SpecialID'] ||
            row['Participant ID'];

          const validId =
            existingId && String(existingId).length >= 16
              ? String(existingId).trim().toUpperCase()
              : generateSpecialId(16);

          const cleanRow = {
            _rowId: index + 1,
            'Special ID': validId
          };

          headers.forEach((header) => {
            if (header === 'Special ID') return;
            const val = row[header] !== undefined ? row[header] : '';
            cleanRow[header] = typeof val === 'string' ? val.trim() : val;
          });

          return cleanRow;
        });

        resolve({
          fileName: file.name,
          sheetName,
          headers,
          totalRows: sanitizedRows.length,
          rows: sanitizedRows,
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
 * Generates and downloads a sample Hackathon Participants Excel sheet with 16-character alphanumeric Special IDs
 */
export const downloadSampleExcel = () => {
  const sampleData = [
    {
      "Special ID": generateSpecialId(16),
      "Full Name": "Aarav Sharma",
      "Email": "aarav.sharma@college.edu",
      "Phone": "9876543210",
      "College Name": "IIT Delhi",
      "Team Name": "CodeKnights",
      "Food Preference": "Veg",
      "Meal Token Status": "Active"
    },
    {
      "Special ID": generateSpecialId(16),
      "Full Name": "Priya Verma",
      "Email": "priya.verma@college.edu",
      "Phone": "9876543211",
      "College Name": "IIT Delhi",
      "Team Name": "CodeKnights",
      "Food Preference": "Non-Veg",
      "Meal Token Status": "Active"
    },
    {
      "Special ID": generateSpecialId(16),
      "Full Name": "Rohan Gupta",
      "Email": "rohan.g@techuniv.ac.in",
      "Phone": "9876543212",
      "College Name": "BITS Pilani",
      "Team Name": "QuantumLoop",
      "Food Preference": "Veg",
      "Meal Token Status": "Active"
    },
    {
      "Special ID": generateSpecialId(16),
      "Full Name": "Ananya Iyer",
      "Email": "ananya.i@techuniv.ac.in",
      "Phone": "9876543213",
      "College Name": "BITS Pilani",
      "Team Name": "QuantumLoop",
      "Food Preference": "Jain Veg",
      "Meal Token Status": "Active"
    },
    {
      "Special ID": generateSpecialId(16),
      "Full Name": "Vikram Malhotra",
      "Email": "vikram.m@dtu.ac.in",
      "Phone": "9876543214",
      "College Name": "DTU Delhi",
      "Team Name": "ByteForce",
      "Food Preference": "Non-Veg",
      "Meal Token Status": "Active"
    },
    {
      "Special ID": generateSpecialId(16),
      "Full Name": "Sneha Patel",
      "Email": "sneha.p@dtu.ac.in",
      "Phone": "9876543215",
      "College Name": "DTU Delhi",
      "Team Name": "ByteForce",
      "Food Preference": "Veg",
      "Meal Token Status": "Active"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Participants");
  XLSX.writeFile(wb, "hackathon_participants_template.xlsx");
};

