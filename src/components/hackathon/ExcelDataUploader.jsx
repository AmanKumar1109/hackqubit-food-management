import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  Search,
  Database,
  Trash2,
  Sparkles,
  Users,
  Utensils,
  Building,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  Key
} from 'lucide-react';
import gsap from 'gsap';
import { parseExcelFile, downloadSampleExcel } from '../../services/excelService';
import { generateSpecialId, formatSpecialId } from '../../utils/idGenerator';
import {
  uploadParticipantsToFirestore,
  DEFAULT_COLLECTION,
  fetchFirestoreParticipants
} from '../../services/firestoreService';

export const ExcelDataUploader = () => {
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [targetCollection, setTargetCollection] = useState(DEFAULT_COLLECTION);
  const [firestorePreview, setFirestorePreview] = useState([]);
  const [fetchingFirestore, setFetchingFirestore] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const rowsPerPage = 8;

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.gsap-uploader-item',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [fileData]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Regenerate 16-char Special IDs for all rows
  const regenerateAllSpecialIds = () => {
    if (!fileData || !fileData.rows) return;
    const updatedRows = fileData.rows.map((row) => ({
      ...row,
      'Special ID': generateSpecialId(16)
    }));
    setFileData((prev) => ({
      ...prev,
      rows: updatedRows
    }));
  };

  // Handle file reading from input or drag-drop
  const handleFile = async (file) => {
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      setError('Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await parseExcelFile(file);
      setFileData(result);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || 'Failed to parse Excel file.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  // Quick demo data loader with 16-digit alphanumeric Special IDs
  const loadDemoData = () => {
    const demoRows = [
      {
        _rowId: 1,
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
        _rowId: 2,
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
        _rowId: 3,
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
        _rowId: 4,
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
        _rowId: 5,
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
        _rowId: 6,
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

    setFileData({
      fileName: 'hackathon_participants_demo.xlsx',
      sheetName: 'Participants',
      headers: Object.keys(demoRows[0]).filter((k) => k !== '_rowId'),
      totalRows: demoRows.length,
      rows: demoRows
    });
    setError('');
    setSuccessMessage('');
  };

  // Upload parsed participants to Firestore
  const handleUploadToFirestore = async () => {
    if (!fileData || !fileData.rows || fileData.rows.length === 0) {
      setError('Please select or parse an Excel file first.');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccessMessage('');
    setUploadProgress(0);
    setUploadedCount(0);

    try {
      const result = await uploadParticipantsToFirestore(
        fileData.rows,
        targetCollection,
        (current, total) => {
          setUploadedCount(current);
          setUploadProgress(Math.round((current / total) * 100));
        }
      );

      setSuccessMessage(
        `Successfully uploaded ${result.totalUploaded} participants to Firestore collection "${result.collectionName}"!`
      );
      // Refresh live Firestore preview
      loadFirestoreData();
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          'Failed to upload to Firestore. Please check Firebase Firestore permissions & configuration.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Load existing records from Firestore
  const loadFirestoreData = async () => {
    setFetchingFirestore(true);
    try {
      const data = await fetchFirestoreParticipants(targetCollection, 30);
      setFirestorePreview(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingFirestore(false);
    }
  };

  // Filter rows based on search
  const filteredRows = fileData?.rows.filter((row) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(query)
    );
  }) || [];

  // Pagination calculation
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Summary statistics from parsed data
  const stats = fileData
    ? {
        total: fileData.totalRows,
        veg: fileData.rows.filter((r) => {
          const pref = String(
            r['Food Preference'] || r['Food'] || r['Diet'] || ''
          ).toLowerCase();
          return pref.includes('veg') && !pref.includes('non');
        }).length,
        nonVeg: fileData.rows.filter((r) => {
          const pref = String(
            r['Food Preference'] || r['Food'] || r['Diet'] || ''
          ).toLowerCase();
          return pref.includes('non');
        }).length,
        colleges: new Set(
          fileData.rows
            .map((r) => r['College Name'] || r['College'] || r['Institute'])
            .filter(Boolean)
        ).size
      }
    : null;

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Upload Zone & Actions Card */}
      <div className="gsap-uploader-item bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-semibold mb-2">
              <FileSpreadsheet size={14} className="text-neutral-900" />
              <span>Hackathon Food Data Importer</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
              Upload Excel Sheet (1st Row = Keys)
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Upload your participant spreadsheet (.xlsx, .xls, .csv). The first row will be automatically mapped as database keys.
            </p>
          </div>

          {/* Quick Action Helpers */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadSampleExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 text-neutral-800 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Download sample template"
            >
              <Download size={14} />
              <span>Sample Template</span>
            </button>

            <button
              onClick={loadDemoData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold transition-all cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Load Demo Data</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div className="pt-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleInputChange}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
              isDragOver
                ? 'border-neutral-900 bg-neutral-100/70 scale-[0.99]'
                : 'border-neutral-300 hover:border-neutral-700 bg-neutral-50/50 hover:bg-neutral-50'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center justify-center text-neutral-900">
              <UploadCloud size={28} strokeWidth={1.7} />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-neutral-900">
                Click to browse or drag and drop your Excel file here
              </p>
              <p className="text-xs text-neutral-500">
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) with headers in 1st row
              </p>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 bg-white px-4 py-2 rounded-full border border-neutral-200 mt-2">
                <Loader2 size={15} className="animate-spin text-neutral-900" />
                <span>Parsing workbook data...</span>
              </div>
            )}
          </div>
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">Upload Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
            <div className="space-y-0.5">
              <p className="font-semibold">Upload Successful!</p>
              <p>{successMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Parsed Data Preview & Firestore Upload Section */}
      {fileData && (
        <div className="gsap-uploader-item space-y-6">
          {/* Quick Metrics from Excel Sheet */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-xs font-semibold">Total Records</span>
                <Users size={16} className="text-neutral-900" />
              </div>
              <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
              <p className="text-[11px] text-neutral-500">Rows in sheet</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-xs font-semibold">Veg Food Count</span>
                <Utensils size={16} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">{stats.veg}</p>
              <p className="text-[11px] text-neutral-500">Vegetarian meals</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-xs font-semibold">Non-Veg Count</span>
                <Utensils size={16} className="text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-600">{stats.nonVeg}</p>
              <p className="text-[11px] text-neutral-500">Non-Veg meals</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-xs font-semibold">Colleges / Teams</span>
                <Building size={16} className="text-neutral-900" />
              </div>
              <p className="text-2xl font-bold text-neutral-900">{stats.colleges || 1}</p>
              <p className="text-[11px] text-neutral-500">Distinct institutions</p>
            </div>
          </div>

          {/* Table Preview Card */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs space-y-5">
            {/* Table Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-neutral-900">
                    Previewing Data: <span className="text-neutral-600 font-medium">{fileData.fileName}</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-700">
                    {fileData.totalRows} Rows
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                    <Key size={12} />
                    <span>16-Char Special IDs Active</span>
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Verify the columns & generated 16-character alphanumeric IDs below before syncing to Firestore
                </p>
              </div>

              {/* Action Buttons & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={regenerateAllSpecialIds}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                  title="Generate fresh unique 16-digit alphanumeric IDs for all participants"
                >
                  <RefreshCw size={13} />
                  <span>Regenerate IDs</span>
                </button>

                {/* Search within preview */}
                <div className="relative w-full sm:w-56">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Filter rows..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl">
              <table className="w-full text-left text-xs text-neutral-800">
                <thead className="bg-[#F4F5F8] text-neutral-700 uppercase font-semibold text-[11px] border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-neutral-400 w-12 text-center">#</th>
                    {fileData.headers.map((header, idx) => (
                      <th key={idx} className="px-4 py-3 whitespace-nowrap">
                        {header === 'Special ID' ? (
                          <span className="inline-flex items-center gap-1 text-neutral-900 font-bold">
                            <Key size={13} className="text-neutral-900" />
                            <span>Special ID (16-Digit)</span>
                          </span>
                        ) : (
                          header
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-neutral-400 font-mono">
                          {(currentPage - 1) * rowsPerPage + rIdx + 1}
                        </td>
                        {fileData.headers.map((header, hIdx) => {
                          const val = String(row[header] || '');
                          const isVeg = val.toLowerCase() === 'veg';
                          const isNonVeg = val.toLowerCase() === 'non-veg';
                          const isSpecialId = header === 'Special ID';

                          if (isSpecialId) {
                            return (
                              <td key={hIdx} className="px-4 py-2.5 whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900 text-white font-mono text-[11px] font-semibold tracking-wider shadow-xs">
                                  <span>{val}</span>
                                  <button
                                    onClick={() => copyToClipboard(val)}
                                    className="p-1 hover:text-amber-400 text-neutral-400 transition-colors cursor-pointer"
                                    title="Copy Special ID"
                                  >
                                    {copiedId === val ? (
                                      <Check size={12} className="text-emerald-400" />
                                    ) : (
                                      <Copy size={12} />
                                    )}
                                  </button>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={hIdx} className="px-4 py-3 whitespace-nowrap">
                              {isVeg ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Veg
                                </span>
                              ) : isNonVeg ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                  Non-Veg
                                </span>
                              ) : (
                                <span className="text-neutral-800">{val || '—'}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={fileData.headers.length + 1}
                        className="text-center py-8 text-neutral-400"
                      >
                        No matching rows found for "{searchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Clear */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  setFileData(null);
                  setError('');
                  setSuccessMessage('');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Clear Table Preview</span>
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-500">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredRows.length} items)
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Firestore Upload Action Card */}
            <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-[#0A0B0E] text-white border border-neutral-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database size={17} className="text-white" />
                    <h4 className="text-base font-bold text-white">
                      Sync to Firebase Firestore
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Will upload all <strong>{fileData.totalRows}</strong> records with <strong>16-digit Special IDs</strong> and a <strong>separate meals array</strong> for every team member to collection:
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="text-[10px] text-neutral-400 block mb-0.5">Collection Name</span>
                    <input
                      type="text"
                      value={targetCollection}
                      onChange={(e) => setTargetCollection(e.target.value)}
                      className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white font-mono"
                    />
                  </div>

                  <button
                    onClick={handleUploadToFirestore}
                    disabled={isUploading}
                    className="self-end inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-950 text-xs font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-neutral-900" />
                        <span>Uploading ({uploadProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} />
                        <span>Upload {fileData.totalRows} Users to Firestore</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-white h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>Processing batches...</span>
                    <span>{uploadedCount} / {fileData.totalRows} records</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Firestore Live View & Sync Check */}
      <div className="gsap-uploader-item bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Database size={18} className="text-neutral-800" />
              <span>Firestore Live Collection Preview</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Collection: <code className="text-neutral-900 font-semibold bg-neutral-100 px-1.5 py-0.5 rounded">{targetCollection}</code>
            </p>
          </div>

          <button
            onClick={loadFirestoreData}
            disabled={fetchingFirestore}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={fetchingFirestore ? 'animate-spin' : ''} />
            <span>Fetch from Firestore</span>
          </button>
        </div>

        {firestorePreview.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Showing {firestorePreview.length} recent participants from database</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {firestorePreview.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#F4F5F8] border border-neutral-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-900 truncate max-w-[150px]">
                      {item['Full Name'] || item['Name'] || item.id}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-neutral-700 border border-neutral-200">
                      {item['Food Preference'] || 'Participant'}
                    </span>
                  </div>
                  
                  {/* 16-Digit Special ID badge */}
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-neutral-200 text-[10px] font-mono text-neutral-800">
                    <span className="truncate font-semibold">{item.specialId || item.id}</span>
                    <button
                      onClick={() => copyToClipboard(item.specialId || item.id)}
                      className="p-0.5 hover:text-amber-500 text-neutral-400 transition-colors cursor-pointer"
                      title="Copy Special ID"
                    >
                      {copiedId === (item.specialId || item.id) ? (
                        <Check size={11} className="text-emerald-500" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-neutral-500 truncate">
                    {item['Email'] || item['College Name'] || item['Team Name'] || 'No additional details'}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 pt-0.5">
                    <CheckCircle2 size={12} />
                    <span>Firestore Document Synced</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-400 text-xs">
            <p>No participants fetched yet. Click "Fetch from Firestore" or upload an Excel sheet above!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelDataUploader;
