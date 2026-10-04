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
  Key,
  Wifi,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  TableProperties,
  Filter,
  Info,
  Clock,
  Eye,
  X
} from 'lucide-react';
import gsap from 'gsap';
import { parseExcelFile, downloadSampleExcel } from '../../services/excelService';
import { generateSpecialId } from '../../utils/idGenerator';
import {
  HACKATHON_TEAM_SCHEMA,
  CANONICAL_KEYS,
  sanitizeTeamRow,
  getSampleTeamExcelData
} from '../../utils/teamSchema';
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
  const [showSchemaGuide, setShowSchemaGuide] = useState(false);
  const [inspectedTeam, setInspectedTeam] = useState(null);

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const rowsPerPage = 6;

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
    const updatedRows = fileData.rows.map((row) => {
      const freshId = generateSpecialId(16);
      return {
        ...row,
        specialId: freshId,
        'Special ID': freshId
      };
    });
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

  // Quick demo data loader strictly formatted to Google Form Hackathon Team schema
  const loadDemoData = () => {
    const sampleRows = getSampleTeamExcelData().map((row, index) =>
      sanitizeTeamRow(row, index)
    );

    const headers = ['Special ID', ...CANONICAL_KEYS];

    setFileData({
      fileName: 'hackqubit_participants_wifi_demo.xlsx',
      sheetName: 'Form Responses',
      headers: headers,
      totalRows: sampleRows.length,
      rows: sampleRows,
      isTeamSchemaMatched: true
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
        `Successfully synced ${result.totalUploaded} structured teams to Firestore collection "${result.collectionName}"!`
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
      console.warn('Could not fetch from Firestore:', err);
    } finally {
      setFetchingFirestore(false);
    }
  };

  // Search filtering
  const filteredRows =
    fileData && fileData.rows
      ? fileData.rows.filter((row) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          const team = String(row['Team Name'] || '').toLowerCase();
          const leader = String(row['Leader Name'] || '').toLowerCase();
          const email = String(row['Leader Email'] || '').toLowerCase();
          const phone = String(row['Leader Contact'] || '').toLowerCase();
          const specialId = String(row['Special ID'] || '').toLowerCase();
          const m2 = String(row['Member 2 Name'] || '').toLowerCase();
          const m3 = String(row['Member 3 Name'] || '').toLowerCase();
          const m4 = String(row['Member 4 Name'] || '').toLowerCase();

          return (
            team.includes(q) ||
            leader.includes(q) ||
            email.includes(q) ||
            phone.includes(q) ||
            specialId.includes(q) ||
            m2.includes(q) ||
            m3.includes(q) ||
            m4.includes(q)
          );
        })
      : [];

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Summary statistics from parsed data
  const stats = fileData
    ? {
        totalTeams: fileData.totalRows,
        totalParticipants: fileData.rows.reduce((acc, r) => {
          const membersCount = Array.isArray(r.members)
            ? r.members.length
            : parseInt(r['Team Size'], 10) || 1;
          return acc + membersCount;
        }, 0),
        wifiConfigured: fileData.rows.filter(
          (r) => r['WiFi ID'] || r.wifiId
        ).length,
        colleges: new Set(
          fileData.rows
            .map((r) => r['Leader College'] || r.college || r['College Name'])
            .filter(Boolean)
        ).size
      }
    : null;

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Schema Specification Notice & Definition Banner */}
      <div className="gsap-uploader-item bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/70">
              <ShieldCheck size={14} />
              <span>Structured Team Schema Verified</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900">
              Google Form / Registration Upload Schema
            </h3>
            <p className="text-xs text-neutral-500 max-w-2xl leading-relaxed">
              Every uploaded row maps to an entire Hackathon Team. The system cleans junk columns (such as <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-700">wrong UTR</code> and internal Google form links), structures team &amp; leader details, and automatically generates a <strong>16-digit Special ID</strong> with <strong>5-meal allocation passes</strong> for each member.
            </p>
          </div>

          <button
            onClick={() => setShowSchemaGuide(!showSchemaGuide)}
            className="self-start md:self-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
          >
            <TableProperties size={14} />
            <span>{showSchemaGuide ? 'Hide Schema Specs' : 'View Schema Specs'}</span>
            {showSchemaGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Schema Groups Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-neutral-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-800">1. Team &amp; Network</span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <p className="text-[11px] text-neutral-600 font-mono">
              Team Name, Team Size, WiFi ID, WiFi Password
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-neutral-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800">2. Team Leader (M1)</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <p className="text-[11px] text-neutral-600 font-mono">
              Leader Name, Email, Contact, College, Course &amp; Year
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-neutral-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-800">3. Members (2, 3, 4)</span>
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            </div>
            <p className="text-[11px] text-neutral-600 font-mono">
              Member 2 Name/Phone, Member 3 Name/Phone, Member 4 Name/Phone
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-neutral-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800">4. Payment &amp; System</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[11px] text-neutral-600 font-mono">
              TimeStamp, Transaction ID, 16-Char Special ID, 5-Meals
            </p>
          </div>
        </div>

        {/* Collapsible Detailed Field Specification Table */}
        {showSchemaGuide && (
          <div className="mt-4 pt-4 border-t border-neutral-200/80 space-y-4">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span className="font-semibold text-neutral-800">
                Detailed Field Specifications (Automatic Alias Normalization Active)
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">
                &bull; Case-insensitive header matching
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {HACKATHON_TEAM_SCHEMA.map((cat, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-neutral-200/80 bg-[#FAFAFC] p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-200/60">
                    <span className="text-xs font-bold text-neutral-900">
                      {cat.category}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-semibold uppercase">
                      {cat.fields.length} Fields
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {cat.fields.map((f, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex items-start justify-between text-xs gap-2 py-1 border-b border-neutral-100 last:border-0"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-900">{f.key}</span>
                            {f.required && (
                              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 leading-tight">
                            {f.description}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-600 bg-white border border-neutral-200 px-1.5 py-0.5 rounded shrink-0">
                          {f.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Filtered Out Junk Columns Alert */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2.5">
              <Filter size={15} className="text-amber-700 shrink-0" />
              <span>
                <strong>Junk Columns Excluded:</strong> Columns like <code className="bg-amber-100/80 px-1 rounded">wrong UTR</code>, <code className="bg-amber-100/80 px-1 rounded">google form response ...</code>, and empty spreadsheet artifacts are automatically discarded during ingest.
              </span>
            </div>
          </div>
        )}
      </div>

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
              Upload your participant spreadsheet (.xlsx, .xls, .csv). The first row will be automatically mapped to the structured schema.
            </p>
          </div>

          {/* Quick Action Helpers */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadSampleExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 text-neutral-800 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Download standard Google Form template"
            >
              <Download size={14} />
              <span>Download Schema Template</span>
            </button>

            <button
              onClick={loadDemoData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold transition-all cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Load Structured Demo Teams</span>
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
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) with headers matching your Google Form
              </p>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 bg-white px-4 py-2 rounded-full border border-neutral-200 mt-2">
                <Loader2 size={15} className="animate-spin text-neutral-900" />
                <span>Normalizing &amp; structuring workbook data...</span>
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
                <span className="text-xs font-semibold">Total Teams</span>
                <Users size={16} className="text-neutral-900" />
              </div>
              <p className="text-2xl font-bold text-neutral-900">{stats.totalTeams}</p>
              <p className="text-[11px] text-neutral-500">Rows in sheet</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-xs font-semibold">Est. Participants</span>
                <Users size={16} className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.totalParticipants}</p>
              <p className="text-[11px] text-neutral-500">Members across teams</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-xs font-semibold">WiFi Mapped</span>
                <Wifi size={16} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">{stats.wifiConfigured}</p>
              <p className="text-[11px] text-neutral-500">Teams with credentials</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-xs font-semibold">Institutions</span>
                <Building size={16} className="text-neutral-900" />
              </div>
              <p className="text-2xl font-bold text-neutral-900">{stats.colleges || 1}</p>
              <p className="text-[11px] text-neutral-500">Colleges represented</p>
            </div>
          </div>

          {/* Table Preview Card */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs space-y-5">
            {/* Table Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-neutral-900">
                    Previewing Structured Teams:{' '}
                    <span className="text-neutral-600 font-medium">
                      {fileData.fileName}
                    </span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-700">
                    {fileData.totalRows} Teams
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    <span>Schema Validated &bull; Junk Excluded</span>
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Verify the structured fields, WiFi assignments, and generated 16-character IDs before syncing to Firestore
                </p>
              </div>

              {/* Action Buttons & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={regenerateAllSpecialIds}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                  title="Generate fresh unique 16-digit alphanumeric IDs for all teams"
                >
                  <RefreshCw size={13} />
                  <span>Regenerate IDs</span>
                </button>

                {/* Search within preview */}
                <div className="relative w-full sm:w-56">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    placeholder="Search team or leader..."
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

            {/* Structured Responsive Table */}
            <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl">
              <table className="w-full text-left text-xs text-neutral-800">
                <thead className="bg-[#F4F5F8] text-neutral-700 uppercase font-semibold text-[11px] border-b border-neutral-200">
                  <tr>
                    <th className="px-3 py-3 text-neutral-400 w-10 text-center">#</th>
                    <th className="px-4 py-3 whitespace-nowrap">Special ID (Token)</th>
                    <th className="px-4 py-3 whitespace-nowrap">Team, WiFi &amp; TimeStamp</th>
                    <th className="px-4 py-3 whitespace-nowrap">Team Leader (M1)</th>
                    <th className="px-4 py-3 whitespace-nowrap">Members (2, 3, 4)</th>
                    <th className="px-4 py-3 whitespace-nowrap">College &amp; Course</th>
                    <th className="px-4 py-3 whitespace-nowrap">Verification &amp; Payment</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Meals</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row, rIdx) => {
                      const specialId = String(row['Special ID'] || row.specialId || '');
                      const teamName = row['Team Name'] || row.teamName || '—';
                      const wifiId = row['WiFi ID'] || row.wifiId;
                      const wifiPass = row['WiFi Password'] || row.wifiPassword;
                      const timestamp = row['TimeStamp'] || row.timestamp || row.registration?.timestamp || '';
                      const leaderName = row['Leader Name'] || row.leader?.name || '—';
                      const leaderPhone = row['Leader Contact'] || row.leader?.contact || '—';
                      const leaderEmail = row['Leader Email'] || row.leader?.email || '';
                      const college = row['Leader College'] || row.leader?.college || '—';
                      const course = row['Leader Course & Year'] || row.leader?.courseAndYear || '';
                      const wrongUtr = row['wrong UTR'] || row.wrongUtr || '';
                      const googleFormResponse = row['google form response'] || row.googleFormResponse || '';

                      // Members summary
                      const membersList = [];
                      if (row['Member 2 Name']) membersList.push(`M2: ${row['Member 2 Name']}`);
                      if (row['Member 3 Name']) membersList.push(`M3: ${row['Member 3 Name']}`);
                      if (row['Member 4 Name']) membersList.push(`M4: ${row['Member 4 Name']}`);

                      const paymentLink = row['Payment Screenshot Link'] || row.registration?.paymentScreenshotLink;
                      const txnId = row['Transaction ID'] || row.registration?.transactionId;

                      return (
                        <tr key={rIdx} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="px-3 py-3 text-center text-neutral-400 font-mono text-[11px]">
                            {(currentPage - 1) * rowsPerPage + rIdx + 1}
                          </td>

                          {/* 16-Char Special ID */}
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900 text-white font-mono text-[11px] font-semibold tracking-wider shadow-xs">
                              <Key size={11} className="text-amber-400" />
                              <span>{specialId}</span>
                              <button
                                onClick={() => copyToClipboard(specialId)}
                                className="p-0.5 hover:text-amber-400 text-neutral-400 transition-colors cursor-pointer"
                                title="Copy Special ID"
                              >
                                {copiedId === specialId ? (
                                  <Check size={11} className="text-emerald-400" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Team, WiFi & TimeStamp */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className="font-bold text-neutral-900 block">{teamName}</span>
                              {wifiId ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  <Wifi size={10} />
                                  <span>{wifiId}</span>
                                  {wifiPass && <span className="text-neutral-400">/ {wifiPass}</span>}
                                </span>
                              ) : (
                                <span className="text-[10px] text-neutral-400">No WiFi set</span>
                              )}
                              {timestamp ? (
                                <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono">
                                  <Clock size={10} className="text-neutral-400 shrink-0" />
                                  <span className="truncate max-w-[140px]" title={`Submitted: ${timestamp}`}>{timestamp}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-neutral-400">No timestamp</div>
                              )}
                            </div>
                          </td>

                          {/* Leader */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-neutral-900 block">{leaderName}</span>
                              <span className="text-[11px] text-neutral-500 font-mono block">
                                {leaderPhone}
                              </span>
                              {leaderEmail && (
                                <span className="text-[10px] text-neutral-400 block truncate max-w-[140px]">
                                  {leaderEmail}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Members */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {membersList.length > 0 ? (
                              <div className="space-y-0.5">
                                {membersList.map((m, mIdx) => (
                                  <span
                                    key={mIdx}
                                    className="block text-[11px] text-neutral-700"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-400">Leader Only</span>
                            )}
                          </td>

                          {/* College */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-0.5 max-w-[160px]">
                              <span className="font-medium text-neutral-800 block truncate">
                                {college}
                              </span>
                              {course && (
                                <span className="text-[10px] text-neutral-500 block truncate">
                                  {course}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Verification & Payment */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-1">
                              {paymentLink ? (
                                <a
                                  href={paymentLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 hover:underline text-[11px] font-semibold inline-block truncate max-w-[120px]"
                                >
                                  View Proof Link
                                </a>
                              ) : txnId ? (
                                <span className="text-[11px] font-mono text-neutral-700 font-medium block">
                                  {txnId}
                                </span>
                              ) : (
                                <span className="text-neutral-400 text-[11px] block">—</span>
                              )}

                              <div className="flex items-center gap-1 flex-wrap">
                                {wrongUtr && String(wrongUtr).toLowerCase() === 'true' ? (
                                  <span className="text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                    Wrong UTR
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    UTR OK
                                  </span>
                                )}
                                {googleFormResponse && String(googleFormResponse).toLowerCase() === 'true' && (
                                  <span className="text-[9px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                    Form Verified
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Meal Slots */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Utensils size={10} />
                              <span>5 Slots</span>
                            </span>
                          </td>

                          {/* Action - Inspect All 20 Columns */}
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => setInspectedTeam(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                              title="Inspect all 20 columns"
                            >
                              <Eye size={12} />
                              <span>20 Cols</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-neutral-400">
                        No matching teams found for "{searchQuery}"
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
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredRows.length} teams)
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
                      Sync Structured Teams to Firestore
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Will upload all <strong>{fileData.totalRows}</strong> teams with <strong>16-digit Special IDs</strong>, network credentials, and <strong>pre-initialized 5-meal slots</strong> for each member to collection:
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="text-[10px] text-neutral-400 block mb-0.5">
                      Collection Name
                    </span>
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
                        <span>Upload {fileData.totalRows} Teams to Firestore</span>
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
                    <span>
                      {uploadedCount} / {fileData.totalRows} teams synced
                    </span>
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
              Collection:{' '}
              <code className="text-neutral-900 font-semibold bg-neutral-100 px-1.5 py-0.5 rounded">
                {targetCollection}
              </code>
            </p>
          </div>

          <button
            onClick={loadFirestoreData}
            disabled={fetchingFirestore}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw
              size={14}
              className={fetchingFirestore ? 'animate-spin' : ''}
            />
            <span>Fetch from Firestore</span>
          </button>
        </div>

        {firestorePreview.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Showing {firestorePreview.length} recent teams from database</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {firestorePreview.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#F4F5F8] border border-neutral-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-900 truncate max-w-[150px]">
                      {item['Team Name'] || item.teamName || item['Full Name'] || item.id}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-neutral-700 border border-neutral-200">
                      {item['Leader Name'] || 'Team'}
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

                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="truncate max-w-[140px]">
                      {item['Leader College'] || item['College Name'] || 'College'}
                    </span>
                    {item['WiFi ID'] && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono">
                        WiFi: {item['WiFi ID']}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 pt-0.5">
                    <CheckCircle2 size={12} />
                    <span>Firestore Document Synced &bull; 5-Meals Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-400 text-xs">
            <p>
              No teams fetched yet. Click "Fetch from Firestore" or upload an Excel sheet above!
            </p>
          </div>
        )}
      </div>

      {/* 20-Column Data Inspection Modal */}
      {inspectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-neutral-900">
                    {inspectedTeam['Team Name'] || inspectedTeam.teamName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-900 text-white">
                    {inspectedTeam['Special ID'] || inspectedTeam.specialId}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  HackQubit 2.0 Full 20-Field Form Response Record
                </p>
              </div>
              <button
                onClick={() => setInspectedTeam(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content - Grid of all 20 fields */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CANONICAL_KEYS.map((key, kIdx) => {
                  const val = inspectedTeam[key] !== undefined && inspectedTeam[key] !== null
                    ? String(inspectedTeam[key])
                    : '';
                  const isLink = key.includes('Link') || key.includes('URL');

                  return (
                    <div
                      key={kIdx}
                      className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500">
                        <span>{key}</span>
                        <span className="text-[9px] text-neutral-400 font-mono">#{kIdx + 1}</span>
                      </div>
                      {isLink && val ? (
                        <a
                          href={val}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline font-medium break-all block"
                        >
                          {val}
                        </a>
                      ) : (
                        <p className={`text-xs font-medium break-all ${val ? 'text-neutral-900 font-mono' : 'text-neutral-400 italic'}`}>
                          {val || '(empty)'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                All 20 fields validated &bull; 5 meal slots mapped
              </span>
              <button
                onClick={() => setInspectedTeam(null)}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelDataUploader;
