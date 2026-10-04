import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  Filter,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Key,
  Copy,
  Check,
  Clock,
  ExternalLink,
  RefreshCw,
  Download,
  Utensils,
  Building,
  Save,
  X,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  subscribeToAllParticipants,
  updateParticipantInFirestore,
  deleteParticipantFromFirestore,
  DEFAULT_COLLECTION
} from '../../services/firestoreService';
import { CANONICAL_KEYS } from '../../utils/teamSchema';

// Required operations security PIN specified by administrator
const REQUIRED_SECURITY_PIN = '923473';

/**
 * Extracts a numeric team index from Team Name or WiFi ID for natural numeric ordering.
 * Matches: 'Team 1', 'Team 2', 'Team10', 'team_5', or any number in the name/wifi.
 */
const extractTeamNumber = (p) => {
  const name = String(p['Team Name'] || p.teamName || '');
  const wifi = String(p['WiFi ID'] || p.wifiId || '');

  // 1. Try finding number after word 'team' (e.g. 'Team 1', 'Team-02', 'TEAM 10')
  const nameMatch = name.match(/team\s*[-_]?\s*(\d+)/i);
  if (nameMatch && nameMatch[1]) return parseInt(nameMatch[1], 10);

  // 2. Try WiFi ID (e.g. 'Team1', 'Team 15')
  const wifiMatch = wifi.match(/team\s*[-_]?\s*(\d+)/i) || wifi.match(/\d+/);
  if (wifiMatch) return parseInt(wifiMatch[1] || wifiMatch[0], 10);

  // 3. Any standalone number in team name
  const anyNum = name.match(/\b\d+\b/) || name.match(/\d+/);
  if (anyNum) return parseInt(anyNum[0], 10);

  return null;
};

export const AllParticipantsManager = ({ onExit }) => {
  // Security PIN state
  const [isUnlocked, setIsUnlocked] = useState(
    () => sessionStorage.getItem('hackqubit_admin_pin_verified') === 'true'
  );
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const pinInputRefs = useRef([]);

  // Data states
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [wifiFilter, setWifiFilter] = useState('all'); // 'all' | 'configured' | 'missing'
  const [utrFilter, setUtrFilter] = useState('all'); // 'all' | 'ok' | 'wrong'
  const [sortBy, setSortBy] = useState('teamNumber'); // 'teamNumber' | 'teamNumberDesc' | 'newest' | 'oldest' | 'teamName' | 'teamSize'
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Modals
  const [editingTeam, setEditingTeam] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    teamName: '',
    teamSize: 1,
    wifiId: '',
    wifiPassword: '',
    timestamp: '',
    transactionId: '',
    paymentScreenshotLink: '',
    wrongUtr: 'FALSE',
    googleFormResponse: 'TRUE',
    leaderName: '',
    leaderEmail: '',
    leaderContact: '',
    leaderCollege: '',
    leaderCourse: '',
    member2Name: '',
    member2Contact: '',
    member3Name: '',
    member3Contact: '',
    member4Name: '',
    member4Contact: ''
  });

  // Real-time Firestore subscription (only active if unlocked)
  useEffect(() => {
    if (!isUnlocked) return;

    setLoading(true);
    const unsubscribe = subscribeToAllParticipants(
      (data) => {
        setParticipants(data);
        setLoading(false);
      },
      (err) => {
        setError('Failed to connect to real-time database: ' + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isUnlocked]);

  // Focus first pin digit on mount if locked
  useEffect(() => {
    if (!isUnlocked && pinInputRefs.current[0]) {
      pinInputRefs.current[0].focus();
    }
  }, [isUnlocked]);

  // Handle PIN digit changes
  const handlePinChange = (index, value) => {
    // Only accept numeric characters
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newPin = [...pinDigits];
    newPin[index] = cleanVal ? cleanVal.slice(-1) : '';
    setPinDigits(newPin);
    setPinError('');

    // If a digit was entered, auto-focus next box
    if (cleanVal && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits entered, auto-submit
    const combined = newPin.join('');
    if (combined.length === 6) {
      verifyPin(combined);
    }
  };

  // Handle Backspace and arrow navigation in PIN boxes
  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting full PIN (e.g. "923473")
  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newPin = ['', '', '', '', '', ''];
    for (let i = 0; i < pasteData.length; i++) {
      newPin[i] = pasteData[i];
    }
    setPinDigits(newPin);
    setPinError('');

    if (pasteData.length === 6) {
      verifyPin(pasteData);
    } else {
      pinInputRefs.current[pasteData.length]?.focus();
    }
  };

  // Keypad click handler for mobile/touch
  const handleKeypadPress = (val) => {
    if (val === 'clear') {
      setPinDigits(['', '', '', '', '', '']);
      setPinError('');
      pinInputRefs.current[0]?.focus();
      return;
    }
    if (val === 'backspace') {
      const lastFilledIndex = pinDigits.findLastIndex((d) => d !== '');
      if (lastFilledIndex >= 0) {
        const newPin = [...pinDigits];
        newPin[lastFilledIndex] = '';
        setPinDigits(newPin);
        setPinError('');
        pinInputRefs.current[lastFilledIndex]?.focus();
      }
      return;
    }

    // Numeric digit
    const firstEmptyIndex = pinDigits.findIndex((d) => d === '');
    if (firstEmptyIndex !== -1) {
      handlePinChange(firstEmptyIndex, String(val));
    }
  };

  // Verify PIN against required code: 923473
  const verifyPin = (candidatePin) => {
    if (candidatePin === REQUIRED_SECURITY_PIN) {
      sessionStorage.setItem('hackqubit_admin_pin_verified', 'true');
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('Invalid Security PIN. Access denied. (6-digit code required)');
      setPinDigits(['', '', '', '', '', '']);
      pinInputRefs.current[0]?.focus();
    }
  };

  // Lock directory manually
  const handleLockConsole = () => {
    sessionStorage.removeItem('hackqubit_admin_pin_verified');
    setIsUnlocked(false);
    setPinDigits(['', '', '', '', '', '']);
    setPinError('');
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Edit Modal & Populate Form
  const openEditModal = (team) => {
    setEditingTeam(team);
    setEditForm({
      teamName: team['Team Name'] || team.teamName || '',
      teamSize: team['Team Size'] || team.teamSize || 1,
      wifiId: team['WiFi ID'] || team.wifiId || '',
      wifiPassword: team['WiFi Password'] || team.wifiPassword || '',
      timestamp: team.TimeStamp || team.timestamp || team.registration?.timestamp || '',
      transactionId: team['Transaction ID'] || team.registration?.transactionId || '',
      paymentScreenshotLink: team['Payment Screenshot Link'] || team.registration?.paymentScreenshotLink || '',
      wrongUtr: String(team['wrong UTR'] || team.wrongUtr || 'FALSE').toUpperCase(),
      googleFormResponse: String(team['google form response'] || team.googleFormResponse || 'TRUE').toUpperCase(),
      leaderName: team['Leader Name'] || team.leader?.name || '',
      leaderEmail: team['Leader Email'] || team.leader?.email || '',
      leaderContact: team['Leader Contact'] || team.leader?.contact || '',
      leaderCollege: team['Leader College'] || team.leader?.college || '',
      leaderCourse: team['Leader Course & Year'] || team.leader?.courseAndYear || '',
      member2Name: team['Member 2 Name'] || team.members?.[1]?.name || '',
      member2Contact: team['Member 2 Contact'] || team.members?.[1]?.contact || '',
      member3Name: team['Member 3 Name'] || team.members?.[2]?.name || '',
      member3Contact: team['Member 3 Contact'] || team.members?.[2]?.contact || '',
      member4Name: team['Member 4 Name'] || team.members?.[3]?.name || '',
      member4Contact: team['Member 4 Contact'] || team.members?.[3]?.contact || ''
    });
  };

  // Handle Edit Form Submission
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTeam) return;

    setIsSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const docId = editingTeam._docId || editingTeam.id || editingTeam.specialId;
      await updateParticipantInFirestore(docId, {
        ...editingTeam,
        ...editForm
      });

      setSuccessMsg(`Team "${editForm.teamName || docId}" updated successfully!`);
      setEditingTeam(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError('Failed to update participant: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick 1-click toggle for UTR status
  const handleToggleUtrStatus = async (team) => {
    const current = String(team['wrong UTR'] || team.wrongUtr || 'FALSE').toUpperCase();
    const newStatus = current === 'TRUE' ? 'FALSE' : 'TRUE';
    const docId = team._docId || team.id || team.specialId;

    try {
      await updateParticipantInFirestore(docId, {
        ...team,
        'wrong UTR': newStatus,
        wrongUtr: newStatus
      });
    } catch (err) {
      console.error(err);
      setError('Failed to update UTR status: ' + err.message);
    }
  };

  // Confirm and delete team
  const confirmDeleteTeam = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const docId = deleteTarget._docId || deleteTarget.id || deleteTarget.specialId;
      await deleteParticipantFromFirestore(docId);
      setSuccessMsg(`Team "${deleteTarget['Team Name'] || docId}" removed successfully.`);
      setDeleteTarget(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError('Failed to delete participant: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export current filtered participants to Excel (.xlsx)
  const exportToExcel = () => {
    if (participants.length === 0) return;

    const exportRows = filteredParticipants.map((p, idx) => {
      return {
        '#': idx + 1,
        'Special ID': p.specialId || p['Special ID'] || p.id,
        'TimeStamp': p.TimeStamp || p.timestamp || '',
        'Team Name': p['Team Name'] || p.teamName || '',
        'Team Size': p['Team Size'] || p.teamSize || '',
        'WiFi ID': p['WiFi ID'] || p.wifiId || '',
        'WiFi Password': p['WiFi Password'] || p.wifiPassword || '',
        'Transaction ID': p['Transaction ID'] || p.registration?.transactionId || '',
        'Payment Screenshot Link': p['Payment Screenshot Link'] || p.registration?.paymentScreenshotLink || '',
        'wrong UTR': p['wrong UTR'] || p.wrongUtr || 'FALSE',
        'google form response': p['google form response'] || p.googleFormResponse || 'TRUE',
        'Leader Name': p['Leader Name'] || p.leader?.name || '',
        'Leader Email': p['Leader Email'] || p.leader?.email || '',
        'Leader Contact': p['Leader Contact'] || p.leader?.contact || '',
        'Leader College': p['Leader College'] || p.leader?.college || '',
        'Leader Course & Year': p['Leader Course & Year'] || p.leader?.courseAndYear || '',
        'Member 2 Name': p['Member 2 Name'] || '',
        'Member 2 Contact': p['Member 2 Contact'] || '',
        'Member 3 Name': p['Member 3 Name'] || '',
        'Member 3 Contact': p['Member 3 Contact'] || '',
        'Member 4 Name': p['Member 4 Name'] || '',
        'Member 4 Contact': p['Member 4 Contact'] || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participants_Directory');
    XLSX.writeFile(wb, `hackqubit_participants_directory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Filter & Sort Logic
  const filteredParticipants = useMemo(() => {
    return participants
      .filter((p) => {
        // Universal search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const specialId = String(p.specialId || p['Special ID'] || p.id || '').toLowerCase();
          const teamName = String(p['Team Name'] || p.teamName || '').toLowerCase();
          const leaderName = String(p['Leader Name'] || p.leader?.name || '').toLowerCase();
          const leaderEmail = String(p['Leader Email'] || p.leader?.email || '').toLowerCase();
          const leaderContact = String(p['Leader Contact'] || p.leader?.contact || '').toLowerCase();
          const college = String(p['Leader College'] || p.leader?.college || '').toLowerCase();
          const wifiId = String(p['WiFi ID'] || p.wifiId || '').toLowerCase();
          const txnId = String(p['Transaction ID'] || p.registration?.transactionId || '').toLowerCase();
          const m2 = String(p['Member 2 Name'] || '').toLowerCase();
          const m3 = String(p['Member 3 Name'] || '').toLowerCase();
          const m4 = String(p['Member 4 Name'] || '').toLowerCase();

          const matches =
            specialId.includes(q) ||
            teamName.includes(q) ||
            leaderName.includes(q) ||
            leaderEmail.includes(q) ||
            leaderContact.includes(q) ||
            college.includes(q) ||
            wifiId.includes(q) ||
            txnId.includes(q) ||
            m2.includes(q) ||
            m3.includes(q) ||
            m4.includes(q);

          if (!matches) return false;
        }

        // WiFi Filter
        if (wifiFilter === 'configured') {
          const hasWifi = Boolean(p['WiFi ID'] || p.wifiId);
          if (!hasWifi) return false;
        } else if (wifiFilter === 'missing') {
          const hasWifi = Boolean(p['WiFi ID'] || p.wifiId);
          if (hasWifi) return false;
        }

        // UTR Filter
        if (utrFilter === 'ok') {
          const wrong = String(p['wrong UTR'] || p.wrongUtr || '').toUpperCase();
          if (wrong === 'TRUE') return false;
        } else if (utrFilter === 'wrong') {
          const wrong = String(p['wrong UTR'] || p.wrongUtr || '').toUpperCase();
          if (wrong !== 'TRUE') return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'teamNumber') {
          const numA = extractTeamNumber(a);
          const numB = extractTeamNumber(b);

          if (numA !== null && numB !== null) {
            if (numA !== numB) return numA - numB;
          } else if (numA !== null) {
            return -1; // Numbered teams come first
          } else if (numB !== null) {
            return 1;
          }

          // Fallback to natural alphanumeric sort on team name
          const nameA = String(a['Team Name'] || a.teamName || '');
          const nameB = String(b['Team Name'] || b.teamName || '');
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        }

        if (sortBy === 'teamNumberDesc') {
          const numA = extractTeamNumber(a);
          const numB = extractTeamNumber(b);

          if (numA !== null && numB !== null) {
            if (numA !== numB) return numB - numA;
          } else if (numA !== null) {
            return -1;
          } else if (numB !== null) {
            return 1;
          }

          const nameA = String(a['Team Name'] || a.teamName || '');
          const nameB = String(b['Team Name'] || b.teamName || '');
          return nameB.localeCompare(nameA, undefined, { numeric: true, sensitivity: 'base' });
        }

        if (sortBy === 'teamName') {
          const nameA = String(a['Team Name'] || a.teamName || '');
          const nameB = String(b['Team Name'] || b.teamName || '');
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        }
        if (sortBy === 'teamSize') {
          const sizeA = Number(a['Team Size'] || a.teamSize || 1);
          const sizeB = Number(b['Team Size'] || b.teamSize || 1);
          return sizeB - sizeA;
        }
        if (sortBy === 'oldest') {
          const tsA = String(a.TimeStamp || a.timestamp || a.createdAt || '');
          const tsB = String(b.TimeStamp || b.timestamp || b.createdAt || '');
          return tsA.localeCompare(tsB);
        }
        // Default: newest first
        const tsA = String(a.TimeStamp || a.timestamp || a.createdAt || '');
        const tsB = String(b.TimeStamp || b.timestamp || b.createdAt || '');
        return tsB.localeCompare(tsA);
      });
  }, [participants, searchQuery, wifiFilter, utrFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredParticipants.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredParticipants.slice(start, start + rowsPerPage);
  }, [filteredParticipants, currentPage]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalMembers = 0;
    let wifiCount = 0;
    let wrongUtrCount = 0;
    let formVerifiedCount = 0;

    participants.forEach((p) => {
      const size = Number(p['Team Size'] || p.teamSize || (p.members ? p.members.length : 1));
      totalMembers += size;
      if (p['WiFi ID'] || p.wifiId) wifiCount++;
      if (String(p['wrong UTR'] || p.wrongUtr || '').toUpperCase() === 'TRUE') wrongUtrCount++;
      if (String(p['google form response'] || p.googleFormResponse || '').toUpperCase() === 'TRUE') formVerifiedCount++;
    });

    return {
      totalTeams: participants.length,
      totalMembers,
      wifiCount,
      wrongUtrCount,
      formVerifiedCount
    };
  }, [participants]);

  // ═════════════════════════════════════════════════════════════════════════
  // 🔒 SECURITY PIN CHALLENGE SCREEN (Shown before directory access)
  // ═════════════════════════════════════════════════════════════════════════
  if (!isUnlocked) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-200/80 shadow-2xl p-6 sm:p-8 space-y-6 text-center">
          {/* Lock Icon & Shield */}
          <div className="relative mx-auto w-16 h-16 rounded-3xl bg-neutral-900 text-white flex items-center justify-center shadow-lg ring-4 ring-neutral-100">
            <Lock size={28} className="text-amber-400" />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center">
              <KeyRound size={12} />
            </span>
          </div>

          {/* Heading & Notice */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-bold">
              <ShieldAlert size={12} className="text-amber-600" />
              <span>Restricted Operations Console</span>
            </div>
            <h3 className="text-xl font-bold text-neutral-900">
              Security PIN Required
            </h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Please enter the 6-digit authorized security PIN to view and edit participant records.
            </p>
          </div>

          {/* 6-Digit PIN Boxes */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 sm:gap-2.5">
              {pinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (pinInputRefs.current[idx] = el)}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(idx, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e)}
                  onPaste={handlePinPaste}
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-2xl border transition-all ${
                    pinError
                      ? 'border-red-400 bg-red-50/50 text-red-900 focus:border-red-600'
                      : digit
                      ? 'border-neutral-900 bg-neutral-50 text-neutral-900 ring-2 ring-neutral-900/10'
                      : 'border-neutral-200 bg-[#F4F5F8] text-neutral-900 focus:bg-white focus:border-neutral-900'
                  } focus:outline-none`}
                />
              ))}
            </div>

            {/* Show / Hide Toggle */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="hover:text-neutral-900 inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPin ? 'Hide PIN' : 'Show PIN'}</span>
              </button>
            </div>

            {/* PIN Error Feedback */}
            {pinError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-center gap-1.5 animate-shake">
                <AlertCircle size={14} className="shrink-0" />
                <span className="font-semibold">{pinError}</span>
              </div>
            )}
          </div>

          {/* Numeric Touch Keypad for quick mobile/mouse entry */}
          <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="h-11 rounded-2xl bg-[#F4F5F8] hover:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-sm transition-all cursor-pointer shadow-2xs"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeypadPress('clear')}
              className="h-11 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-600 font-semibold text-xs transition-all cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress(0)}
              className="h-11 rounded-2xl bg-[#F4F5F8] hover:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-sm transition-all cursor-pointer shadow-2xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('backspace')}
              className="h-11 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-600 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center"
            >
              &larr; Del
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => verifyPin(pinDigits.join(''))}
              disabled={pinDigits.join('').length !== 6}
              className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Unlock size={14} className="text-amber-400" />
              <span>Unlock Participant Console</span>
            </button>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="w-full py-2.5 rounded-2xl border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <ArrowLeft size={13} />
                <span>Return to Team Meal Manager</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 🔓 UNLOCKED PARTICIPANT DIRECTORY & REAL-TIME EDITOR
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Header & Aggregate Metrics ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold">Total Teams</span>
            <Users size={16} className="text-neutral-900" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{metrics.totalTeams}</p>
          <p className="text-[11px] text-neutral-500">Live in Firestore</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold">Total Participants</span>
            <Users size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{metrics.totalMembers}</p>
          <p className="text-[11px] text-neutral-500">Members across teams</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold">WiFi Assigned</span>
            <Wifi size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{metrics.wifiCount}</p>
          <p className="text-[11px] text-neutral-500">Credentials configured</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold">Payment Status</span>
            <ShieldCheck size={16} className={metrics.wrongUtrCount > 0 ? 'text-amber-600' : 'text-emerald-600'} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold text-neutral-900">
              {metrics.totalTeams - metrics.wrongUtrCount}
            </p>
            {metrics.wrongUtrCount > 0 && (
              <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                {metrics.wrongUtrCount} flagged
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-500">Verified registrations</p>
        </div>
      </div>

      {/* ── Control Bar: Search, Filters & Export ──────────────────────── */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-neutral-900">
                All Participants &amp; Teams Directory
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
                {filteredParticipants.length} Matches
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                <Lock size={11} className="text-blue-600" />
                <span>Special ID Protected (Immutable)</span>
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Live directory with real-time updates. Edit any field (WiFi, names, phone, UTR) while the 16-character Token ID remains locked.
            </p>
          </div>

          {/* Action buttons & Lock Console */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Export current filtered list to Excel spreadsheet"
            >
              <Download size={13} />
              <span>Export to Excel</span>
            </button>

            <button
              onClick={handleLockConsole}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Lock directory and require Security PIN again"
            >
              <Lock size={13} className="text-amber-700" />
              <span>Lock Directory</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              placeholder="Search team, ID, leader, phone, college…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900"
            />
          </div>

          {/* WiFi Filter */}
          <div className="flex items-center gap-2">
            <Wifi size={14} className="text-neutral-400 shrink-0" />
            <select
              value={wifiFilter}
              onChange={(e) => {
                setWifiFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900 cursor-pointer"
            >
              <option value="all">All WiFi Status</option>
              <option value="configured">WiFi Assigned Only</option>
              <option value="missing">No WiFi Assigned</option>
            </select>
          </div>

          {/* UTR Filter */}
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-neutral-400 shrink-0" />
            <select
              value={utrFilter}
              onChange={(e) => {
                setUtrFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900 cursor-pointer"
            >
              <option value="all">All Payment Status</option>
              <option value="ok">UTR OK / Verified</option>
              <option value="wrong">Wrong UTR Flagged</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-neutral-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900 cursor-pointer font-medium"
            >
              <option value="teamNumber">Sort: Team Number (Team 1, Team 2…)</option>
              <option value="teamNumberDesc">Sort: Team Number (High to Low)</option>
              <option value="teamName">Sort: Team Name (A-Z)</option>
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="teamSize">Sort: Team Size (Largest)</option>
            </select>
          </div>
        </div>

        {/* Error / Success Feedback */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="p-1 hover:text-red-900 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="p-1 hover:text-emerald-950 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Table View ─────────────────────────────────────────────────── */}
        <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl">
          <table className="w-full text-left text-xs text-neutral-800">
            <thead className="bg-[#F4F5F8] text-neutral-700 uppercase font-semibold text-[11px] border-b border-neutral-200">
              <tr>
                <th className="px-3 py-3 text-neutral-400 w-10 text-center">#</th>
                <th className="px-4 py-3 whitespace-nowrap">Special ID (Locked)</th>
                <th className="px-4 py-3 whitespace-nowrap">Team &amp; WiFi Credentials</th>
                <th className="px-4 py-3 whitespace-nowrap">Team Leader (M1)</th>
                <th className="px-4 py-3 whitespace-nowrap">Members (2, 3, 4)</th>
                <th className="px-4 py-3 whitespace-nowrap">College &amp; Course</th>
                <th className="px-4 py-3 whitespace-nowrap">Verification &amp; Payment</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-neutral-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw size={15} className="animate-spin text-neutral-900" />
                      <span>Loading real-time participants from Firestore…</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length > 0 ? (
                paginatedRows.map((row, rIdx) => {
                  const specialId = String(row['Special ID'] || row.specialId || row.id || '');
                  const teamName = row['Team Name'] || row.teamName || '—';
                  const wifiId = row['WiFi ID'] || row.wifiId;
                  const wifiPass = row['WiFi Password'] || row.wifiPassword;
                  const teamSize = row['Team Size'] || row.teamSize || 1;
                  const timestamp = row.TimeStamp || row.timestamp || row.registration?.timestamp;

                  const leaderName = row['Leader Name'] || row.leader?.name || '—';
                  const leaderPhone = row['Leader Contact'] || row.leader?.contact || '—';
                  const leaderEmail = row['Leader Email'] || row.leader?.email || '';
                  const college = row['Leader College'] || row.leader?.college || '—';
                  const course = row['Leader Course & Year'] || row.leader?.courseAndYear || '';

                  // Members list
                  const mList = [];
                  const m2 = row['Member 2 Name'] || row.members?.[1]?.name;
                  const m3 = row['Member 3 Name'] || row.members?.[2]?.name;
                  const m4 = row['Member 4 Name'] || row.members?.[3]?.name;
                  if (m2) mList.push(`M2: ${m2}`);
                  if (m3) mList.push(`M3: ${m3}`);
                  if (m4) mList.push(`M4: ${m4}`);

                  const txnId = row['Transaction ID'] || row.registration?.transactionId;
                  const paymentLink = row['Payment Screenshot Link'] || row.registration?.paymentScreenshotLink;
                  const wrongUtr = String(row['wrong UTR'] || row.wrongUtr || '').toUpperCase() === 'TRUE';
                  const formVerified = String(row['google form response'] || row.googleFormResponse || '').toUpperCase() === 'TRUE';

                  return (
                    <tr key={specialId || rIdx} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-3 py-3 text-center text-neutral-400 font-mono text-[11px]">
                        {(currentPage - 1) * rowsPerPage + rIdx + 1}
                      </td>

                      {/* Special ID (Immutable & Protected) */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900 text-white font-mono text-[11px] font-semibold tracking-wider shadow-xs">
                          <Lock size={10} className="text-amber-400" title="Special ID is immutable" />
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

                      {/* Team & WiFi */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900">{teamName}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-neutral-100 text-neutral-600 font-semibold">
                              {teamSize} members
                            </span>
                          </div>
                          {wifiId ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <Wifi size={10} />
                              <span>{wifiId}</span>
                              {wifiPass && <span className="text-neutral-400">/ {wifiPass}</span>}
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-400 block">No WiFi configured</span>
                          )}
                          {timestamp && (
                            <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono">
                              <Clock size={10} className="text-neutral-400 shrink-0" />
                              <span className="truncate max-w-[130px]">{timestamp}</span>
                            </div>
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
                        {mList.length > 0 ? (
                          <div className="space-y-0.5">
                            {mList.map((m, mIdx) => (
                              <span key={mIdx} className="block text-[11px] text-neutral-700">
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400">Leader only</span>
                        )}
                      </td>

                      {/* College */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-0.5 max-w-[150px]">
                          <span className="font-medium text-neutral-800 block truncate">{college}</span>
                          {course && (
                            <span className="text-[10px] text-neutral-500 block truncate">{course}</span>
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
                              className="text-blue-600 hover:underline text-[11px] font-semibold inline-flex items-center gap-1 truncate max-w-[120px]"
                            >
                              <span>Proof Link</span>
                              <ExternalLink size={10} />
                            </a>
                          ) : txnId ? (
                            <span className="text-[11px] font-mono text-neutral-700 block truncate max-w-[110px]">
                              {txnId}
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-[11px] block">—</span>
                          )}

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleToggleUtrStatus(row)}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                wrongUtr
                                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title="Click to toggle UTR verification flag"
                            >
                              {wrongUtr ? 'Wrong UTR' : 'UTR OK'}
                            </button>
                            {formVerified && (
                              <span className="text-[9px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                Form OK
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action Buttons: Edit & Delete */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                            title="Edit all details except Special ID"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => setDeleteTarget(row)}
                            className="p-1.5 rounded-xl hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete team document"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-neutral-400">
                    No participants found matching your search and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-neutral-500">
          <span>
            Showing {Math.min(filteredParticipants.length, (currentPage - 1) * rowsPerPage + 1)} to{' '}
            {Math.min(filteredParticipants.length, currentPage * rowsPerPage)} of{' '}
            {filteredParticipants.length} teams
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 py-1 font-semibold text-neutral-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── EDIT PARTICIPANT MODAL (Everything editable except Special ID) ── */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900">
                    Edit Team &amp; Participant Record
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-900 text-white">
                    {editingTeam['Special ID'] || editingTeam.specialId || editingTeam.id}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Update any field below. Changes will sync immediately to Firestore.
                </p>
              </div>

              <button
                onClick={() => setEditingTeam(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* IMMUTABLE SPECIAL ID BANNER */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Lock size={15} />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-900">Special ID (Token):</span>
                    <span className="font-mono font-bold text-amber-950 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300">
                      {editingTeam['Special ID'] || editingTeam.specialId || editingTeam.id}
                    </span>
                    <span className="text-[10px] text-amber-700 uppercase font-semibold tracking-wider">
                      Immutable
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    This 16-character alphanumeric ID is cryptographically locked as the permanent Firestore Document ID and QR Pass token. All other fields below are fully editable.
                  </p>
                </div>
              </div>

              {/* 1. Team & WiFi Credentials Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-neutral-100">
                  <Wifi size={13} className="text-blue-600" />
                  <span>Team &amp; WiFi Credentials</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Team Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.teamName}
                      onChange={(e) => setEditForm({ ...editForm, teamName: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Team Size (Members)</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={editForm.teamSize}
                      onChange={(e) => setEditForm({ ...editForm, teamSize: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">WiFi SSID / ID</label>
                    <input
                      type="text"
                      placeholder="e.g. Team1"
                      value={editForm.wifiId}
                      onChange={(e) => setEditForm({ ...editForm, wifiId: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">WiFi Password</label>
                    <input
                      type="text"
                      placeholder="e.g. 9798337249"
                      value={editForm.wifiPassword}
                      onChange={(e) => setEditForm({ ...editForm, wifiPassword: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Registration & Verification Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-neutral-100">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>Registration, Verification &amp; TimeStamp</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">TimeStamp</label>
                    <input
                      type="text"
                      placeholder="e.g. 9/9/2026 20:07:36"
                      value={editForm.timestamp}
                      onChange={(e) => setEditForm({ ...editForm, timestamp: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Transaction ID (UTR)</label>
                    <input
                      type="text"
                      placeholder="e.g. 625255096559"
                      value={editForm.transactionId}
                      onChange={(e) => setEditForm({ ...editForm, transactionId: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Wrong UTR Flag</label>
                    <select
                      value={editForm.wrongUtr}
                      onChange={(e) => setEditForm({ ...editForm, wrongUtr: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900 cursor-pointer"
                    >
                      <option value="FALSE">FALSE (Valid / Verified UTR)</option>
                      <option value="TRUE">TRUE (Flagged / Wrong UTR)</option>
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="font-semibold text-neutral-700">Payment Screenshot Drive URL</label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/open?id=..."
                      value={editForm.paymentScreenshotLink}
                      onChange={(e) => setEditForm({ ...editForm, paymentScreenshotLink: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Google Form Response Status</label>
                    <select
                      value={editForm.googleFormResponse}
                      onChange={(e) => setEditForm({ ...editForm, googleFormResponse: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900 cursor-pointer"
                    >
                      <option value="TRUE">TRUE (Verified Response)</option>
                      <option value="FALSE">FALSE (Unverified / Duplicate)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Team Leader (Member 1) Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-neutral-100">
                  <Users size={13} className="text-amber-600" />
                  <span>Team Leader (Member 1) Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Leader Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.leaderName}
                      onChange={(e) => setEditForm({ ...editForm, leaderName: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Leader Contact Mobile *</label>
                    <input
                      type="text"
                      required
                      placeholder="10-digit phone number"
                      value={editForm.leaderContact}
                      onChange={(e) => setEditForm({ ...editForm, leaderContact: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Leader Email Address</label>
                    <input
                      type="email"
                      placeholder="leader@college.edu"
                      value={editForm.leaderEmail}
                      onChange={(e) => setEditForm({ ...editForm, leaderEmail: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-semibold text-neutral-700">Leader College / Institute</label>
                    <input
                      type="text"
                      placeholder="e.g. BIT Sindri"
                      value={editForm.leaderCollege}
                      onChange={(e) => setEditForm({ ...editForm, leaderCollege: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Course &amp; Academic Year</label>
                    <input
                      type="text"
                      placeholder="e.g. BTech CSE ,1st Year"
                      value={editForm.leaderCourse}
                      onChange={(e) => setEditForm({ ...editForm, leaderCourse: e.target.value })}
                      className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Team Members (2, 3, 4) Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-neutral-100">
                  <Users size={13} className="text-purple-600" />
                  <span>Team Members (2, 3 &amp; 4)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Member 2 */}
                  <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
                    <span className="font-bold text-neutral-700 text-[11px] block">Member 2</span>
                    <input
                      type="text"
                      placeholder="Member 2 Full Name"
                      value={editForm.member2Name}
                      onChange={(e) => setEditForm({ ...editForm, member2Name: e.target.value })}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-neutral-900"
                    />
                    <input
                      type="text"
                      placeholder="Member 2 Mobile Number"
                      value={editForm.member2Contact}
                      onChange={(e) => setEditForm({ ...editForm, member2Contact: e.target.value })}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-neutral-900 font-mono"
                    />
                  </div>

                  {/* Member 3 */}
                  <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
                    <span className="font-bold text-neutral-700 text-[11px] block">Member 3</span>
                    <input
                      type="text"
                      placeholder="Member 3 Full Name (optional)"
                      value={editForm.member3Name}
                      onChange={(e) => setEditForm({ ...editForm, member3Name: e.target.value })}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-neutral-900"
                    />
                    <input
                      type="text"
                      placeholder="Member 3 Mobile Number"
                      value={editForm.member3Contact}
                      onChange={(e) => setEditForm({ ...editForm, member3Contact: e.target.value })}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-neutral-900 font-mono"
                    />
                  </div>

                  {/* Member 4 */}
                  <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2 sm:col-span-2">
                    <span className="font-bold text-neutral-700 text-[11px] block">Member 4</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Member 4 Full Name (optional)"
                        value={editForm.member4Name}
                        onChange={(e) => setEditForm({ ...editForm, member4Name: e.target.value })}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-neutral-900"
                      />
                      <input
                        type="text"
                        placeholder="Member 4 Mobile Number"
                        value={editForm.member4Contact}
                        onChange={(e) => setEditForm({ ...editForm, member4Contact: e.target.value })}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-neutral-900 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold cursor-pointer transition-all shadow-md disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving changes to Firestore…</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save All Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">Delete Participant Record?</h3>
              <p className="text-xs text-neutral-500">
                Are you sure you want to permanently delete team{' '}
                <strong className="text-neutral-900">
                  {deleteTarget['Team Name'] || deleteTarget.teamName || deleteTarget.id}
                </strong>{' '}
                ({deleteTarget['Special ID'] || deleteTarget.specialId})? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteTeam}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllParticipantsManager;
