import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Loader2,
  RefreshCw,
  AlertCircle,
  Utensils,
  Building,
  X,
  Shield,
  Info,
  ScanLine,
  Phone,
  Sparkles,
  Wifi,
  Key
} from 'lucide-react';
import gsap from 'gsap';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  MEAL_SLOTS,
  parseTeamDocToMembers,
  getMealClaimed,
  getMemberMealFieldKey,
  createDefaultMealsArray
} from '../../utils/participantParser';
import QrScannerModal from './QrScannerModal';

const PARTICIPANTS_COLLECTION = 'hackathon_participants';

const COLOR_MAP = {
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: 'text-amber-500'
  },
  sky: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    icon: 'text-sky-500'
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    icon: 'text-rose-500'
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    icon: 'text-indigo-500'
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: 'text-emerald-500'
  }
};

const toggleMealOnMember = (member, mealKey, nowTime) => {
  const current = getMealClaimed(member, mealKey);
  const newClaimed = !current.claimed;
  const slot = MEAL_SLOTS.find((s) => s.key === mealKey);
  const slotName = slot?.name ?? '';

  let baseMeal = Array.isArray(member.meal) && member.meal.length > 0
    ? [...member.meal]
    : createDefaultMealsArray();

  const existsIndex = baseMeal.findIndex((m) => {
    if (!m) return false;
    const mName = String(m.name || '').toLowerCase();
    const mTitle = String(m.title || '').toLowerCase();
    const target = mealKey.toLowerCase();

    if (target === 'next_breakfast') {
      return (
        mName === 'next_breakfast' ||
        mName === 'day2_breakfast' ||
        mName === 'nextbreakfast' ||
        mTitle.includes('day 2') ||
        mTitle.includes('next day')
      );
    }
    if (target === 'breakfast') {
      return (
        (mName === 'breakfast' || mTitle.includes('breakfast')) &&
        !mName.includes('next') &&
        !mName.includes('day2') &&
        !mTitle.includes('day 2')
      );
    }
    if (target === 'snacks') {
      return mName === 'snacks' || mName.includes('snack') || mTitle.includes('snack');
    }
    return mName === target || mTitle.includes(target) || mTitle === slotName.toLowerCase();
  });

  if (existsIndex >= 0) {
    baseMeal[existsIndex] = {
      ...baseMeal[existsIndex],
      claimed: newClaimed,
      claimedAt: newClaimed ? nowTime : null
    };
  } else {
    baseMeal.push({
      name: mealKey,
      title: slot?.name || mealKey,
      timing: slot?.time || '',
      claimed: newClaimed,
      claimedAt: newClaimed ? nowTime : null
    });
  }

  const fm = { ...(member.foodManagement || {}) };
  fm[mealKey] = { claimed: newClaimed, claimedAt: newClaimed ? nowTime : null };

  return { ...member, meal: baseMeal, meals: baseMeal, foodManagement: fm };
};

export const TeamMealManager = () => {
  const [teamSearch, setTeamSearch] = useState('');
  const [teamData, setTeamData] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState({});
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dataMode, setDataMode] = useState('');
  const [showQrScanner, setShowQrScanner] = useState(false);

  const containerRef = useRef(null);

  /* Pre-fetch distinct team names for autocomplete */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, PARTICIPANTS_COLLECTION));
        const names = new Set();
        snap.forEach((d) => {
          const tn = d.data()['Team Name'] || d.data().teamName;
          if (tn) names.add(tn);
        });
        setAllTeams([...names].sort());
      } catch {
        /* optional autocomplete */
      }
    })();
  }, []);

  /* GSAP card entrance animation */
  useEffect(() => {
    if (!teamData) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.tmm-card',
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, ease: 'power2.out' }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [teamData]);

  /* ── Universal Search (by Special ID, Team Name, Leader Email or Phone) ── */
  const searchTeam = async (nameOverride) => {
    let rawSearch = (nameOverride ?? teamSearch).trim();
    if (!rawSearch) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setTeamData(null);
    setDataMode('');
    setShowSuggestions(false);

    try {
      let rawDocs = [];
      const participantsRef = collection(db, PARTICIPANTS_COLLECTION);

      // 0. Fast direct lookup by Document ID (which is the 16-digit Special ID)
      try {
        const directDocSnap = await getDoc(doc(participantsRef, rawSearch));
        if (directDocSnap.exists()) {
          rawDocs.push({ _docId: directDocSnap.id, ...directDocSnap.data() });
        } else if (rawSearch.includes('_')) {
          // If member suffix like HQ..._M2, fetch parent team document
          const baseDocId = rawSearch.split('_')[0];
          const baseSnap = await getDoc(doc(participantsRef, baseDocId));
          if (baseSnap.exists()) {
            rawDocs.push({ _docId: baseSnap.id, ...baseSnap.data() });
          }
        }
      } catch (err) {
        console.warn('Direct doc lookup miss:', err);
      }

      // 1. Try targeted queries across all identifier fields if not yet found
      if (rawDocs.length === 0) {
        const queryFields = [
          'Special ID',
          'specialId',
          'Team Name',
          'teamName',
          'Leader Email',
          'Leader Contact',
          'Leader Phone',
          'Email',
          'email',
          'Phone',
          'phone'
        ];

        for (const field of queryFields) {
          const q = query(participantsRef, where(field, '==', rawSearch));
          const snap = await getDocs(q);
          if (!snap.empty) {
            snap.forEach((d) => rawDocs.push({ _docId: d.id, ...d.data() }));
            break;
          }
        }
      }

      // 2. If still not found by exact query, scan all docs (handles case-insensitive & partials)
      if (rawDocs.length === 0) {
        const allSnap = await getDocs(participantsRef);
        const searchLower = rawSearch.toLowerCase();
        const searchDigits = rawSearch.replace(/\D/g, '');

        allSnap.forEach((d) => {
          const data = d.data();
          const docId = d.id.toLowerCase();
          const tName = String(data['Team Name'] || data.teamName || '').toLowerCase();
          const specialId = String(data['Special ID'] || data.specialId || '').toLowerCase();
          const leaderEmail = String(data['Leader Email'] || data.Email || data.email || '').toLowerCase();
          const leaderName = String(data['Leader Name'] || data.name || '').toLowerCase();
          const leaderPhone = String(data['Leader Contact'] || data['Leader Phone'] || data.Phone || data.phone || '').replace(/\D/g, '');

          if (
            docId === searchLower ||
            specialId === searchLower ||
            tName === searchLower ||
            leaderEmail === searchLower ||
            leaderName === searchLower ||
            (searchDigits && leaderPhone && leaderPhone.includes(searchDigits)) ||
            tName.includes(searchLower)
          ) {
            rawDocs.push({ _docId: d.id, ...data });
          }
        });
      }

      if (rawDocs.length === 0) {
        setError(
          `No record found for "${rawSearch}". Check spelling or scan another Food Pass QR code.`
        );
        setLoading(false);
        return;
      }

      // Parse all members from the document(s)
      let allMembers = [];
      rawDocs.forEach((d) => {
        const members = parseTeamDocToMembers(d, d._docId);
        allMembers.push(...members);
      });

      if (rawDocs.length === 1 && allMembers.length > 1) {
        setDataMode('embedded');
      } else {
        setDataMode('multi-doc');
      }

      const primaryDoc = rawDocs[0] || {};
      const displayTeamName = primaryDoc['Team Name'] || primaryDoc.teamName || rawSearch;
      const specialId = primaryDoc['Special ID'] || primaryDoc.specialId || primaryDoc._docId;
      const wifiId = primaryDoc['WiFi ID'] || primaryDoc.wifiId || primaryDoc.wifi?.id;
      const wifiPassword = primaryDoc['WiFi Password'] || primaryDoc.wifiPassword || primaryDoc.wifi?.password;
      const leaderName = primaryDoc['Leader Name'] || primaryDoc.leader?.name || primaryDoc['Full Name'];
      const college = primaryDoc['Leader College'] || primaryDoc['College Name'] || primaryDoc.leader?.college;

      setTeamData({
        teamName: displayTeamName,
        members: allMembers,
        rawDocCount: rawDocs.length,
        specialId,
        wifiId,
        wifiPassword,
        leaderName,
        college
      });
      setTeamSearch(displayTeamName);
      setSuccessMsg(`✓ Loaded Team "${displayTeamName}" (${allMembers.length} members)`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError('Firestore query failed. Check Firebase configuration and network connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Scan Handler: Auto cleans URL/JSON and triggers lookup ── */
  const handleQrScanSuccess = (scannedText) => {
    setShowQrScanner(false);
    let cleanCode = String(scannedText || '').trim();
    if (!cleanCode) return;

    // 1. If scanned text is JSON
    try {
      const parsed = JSON.parse(cleanCode);
      if (parsed.specialId || parsed.id || parsed['Special ID']) {
        cleanCode = parsed.specialId || parsed.id || parsed['Special ID'];
      }
    } catch {}

    // 2. If scanned text is a URL, extract final pathname token
    if (cleanCode.includes('/')) {
      cleanCode = cleanCode.split('/').filter(Boolean).pop();
    }

    setTeamSearch(cleanCode);
    searchTeam(cleanCode);
  };

  /* ── Toggle meal for one member ───────────────────────────── */
  const toggleMeal = async (member, mealKey) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const docId = member._docId;
    const memberIdx = member._memberIndex || member.memberNum || 1;
    const uKey = `${docId}_${memberIdx}_${mealKey}`;

    setUpdating((p) => ({ ...p, [uKey]: true }));
    setError('');

    // Optimistic local update
    const updatedMember = toggleMealOnMember(member, mealKey, nowTime);
    setTeamData((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m._docId === member._docId && (m._memberIndex ?? 1) === memberIdx
          ? { ...updatedMember }
          : m
      )
    }));

    // Firestore sync
    try {
      const claimed = getMealClaimed(updatedMember, mealKey).claimed;
      const mealName = MEAL_SLOTS.find((s) => s.key === mealKey)?.name;
      const docRef = doc(db, PARTICIPANTS_COLLECTION, docId);

      const memberMealKey = getMemberMealFieldKey(memberIdx);
      const updatePayload = {
        [memberMealKey]: updatedMember.meal
      };

      if (memberIdx === 1) {
        // Leader: meal array + foodManagement
        updatePayload.meal = updatedMember.meal;
        updatePayload[`foodManagement.${mealKey}.claimed`] = claimed;
        updatePayload[`foodManagement.${mealKey}.claimedAt`] = claimed ? nowTime : null;
        updatePayload[`foodManagement.leader.${mealKey}.claimed`] = claimed;
        updatePayload[`foodManagement.leader.${mealKey}.claimedAt`] = claimed ? nowTime : null;
        updatePayload[`foodManagement.member1.${mealKey}.claimed`] = claimed;
        updatePayload[`foodManagement.member1.${mealKey}.claimedAt`] = claimed ? nowTime : null;
      } else {
        // Member 2, 3, 4...
        updatePayload[`foodManagement.member${memberIdx}.${mealKey}.claimed`] = claimed;
        updatePayload[`foodManagement.member${memberIdx}.${mealKey}.claimedAt`] = claimed ? nowTime : null;
      }

      await updateDoc(docRef, updatePayload);

      setSuccessMsg(`${member['Full Name'] || member.name}: ${mealName} → ${claimed ? '✓ Consumed' : '✗ Not consumed'}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Firestore update failed — changes are shown locally only.');
      console.error(err);
    } finally {
      setUpdating((p) => ({ ...p, [uKey]: false }));
    }
  };

  /* ── Autocomplete suggestions ─────────────────────────────── */
  const suggestions = allTeams
    .filter((t) => t.toLowerCase().includes(teamSearch.toLowerCase()) && t !== teamSearch)
    .slice(0, 6);

  /* ── Team-level stats ─────────────────────────────────────── */
  const teamStats = teamData?.members
    ? (() => {
        let total = 0,
          consumed = 0;
        teamData.members.forEach((m) =>
          MEAL_SLOTS.forEach((s) => {
            total++;
            if (getMealClaimed(m, s.key).claimed) consumed++;
          })
        );
        return { total, consumed, remaining: total - consumed };
      })()
    : null;

  return (
    <div ref={containerRef} className="space-y-6">
      {/* ── Search & QR Scan Card ─────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-semibold mb-2">
              <Users size={14} />
              <span>5-Meal Team Food Management</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
              Search Team &amp; Manage 5 Meals
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Scan student's QR Code or type team name &bull; Day 1 Breakfast, Lunch, Evening Snacks, Dinner, Day 2 Breakfast
            </p>
          </div>
          {allTeams.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
              <Shield size={13} className="text-neutral-400" />
              <span>
                <strong>{allTeams.length}</strong> teams in Firestore
              </span>
            </div>
          )}
        </div>

        <div className="pt-6 relative">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input with autocomplete */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => {
                  setTeamSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={(e) => e.key === 'Enter' && searchTeam()}
                placeholder="Team name or 16-digit Token ID (e.g. TEAM DIAMOND, HQ3FG5CWHJ7RAZYS)…"
                className="w-full bg-[#F4F5F8] border border-neutral-200/80 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900 transition-all"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-30 top-full mt-1.5 w-full bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden">
                  {suggestions.map((t) => (
                    <button
                      key={t}
                      onMouseDown={() => {
                        setTeamSearch(t);
                        searchTeam(t);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      <Users size={14} className="text-neutral-400 shrink-0" />
                      <span className="font-medium text-neutral-900">{t}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons: Scan QR & Search */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowQrScanner(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-neutral-950 text-sm font-bold transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                title="Scan Participant Food Pass QR"
              >
                <ScanLine size={17} className="text-neutral-950" />
                <span>Scan QR</span>
              </button>

              <button
                onClick={() => searchTeam()}
                disabled={loading || !teamSearch.trim()}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#151619] hover:bg-black text-white text-sm font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                <span>{loading ? 'Searching…' : 'Search'}</span>
              </button>

              {teamData && (
                <button
                  onClick={() => {
                    setTeamData(null);
                    setTeamSearch('');
                    setError('');
                    setDataMode('');
                  }}
                  className="p-3 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-500 hover:text-red-600 transition-all cursor-pointer"
                  title="Clear"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Team Results ─────────────────────────────────────── */}
      {teamData && (
        <div className="space-y-5">
          {/* Team summary banner */}
          <div className="tmm-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 bg-[#0A0B0E] rounded-2xl border border-neutral-800 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Team
                  </p>
                  {teamData.specialId && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                      <Key size={10} />
                      {teamData.specialId}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white">{teamData.teamName}</h3>
                {teamData.wifiId && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-0.5">
                    <Wifi size={11} />
                    <span>WiFi: <strong>{teamData.wifiId}</strong></span>
                    {teamData.wifiPassword && (
                      <span className="text-neutral-400">({teamData.wifiPassword})</span>
                    )}
                  </div>
                )}
              </div>
              {dataMode === 'embedded' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/25">
                  <Info size={10} />
                  Team-doc expanded
                </span>
              )}
            </div>

            {teamStats && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-lg font-bold text-white">{teamData.members.length}</p>
                  <p className="text-[10px] text-neutral-400">Members</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-center">
                  <p className="text-lg font-bold text-emerald-400">{teamStats.consumed}</p>
                  <p className="text-[10px] text-emerald-300/70">Consumed</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-lg font-bold text-neutral-300">{teamStats.remaining}</p>
                  <p className="text-[10px] text-neutral-400">Remaining</p>
                </div>
                <button
                  onClick={() => searchTeam(teamData.teamName)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            )}
          </div>

          {/* Member cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {teamData.members.map((member, idx) => {
              const cardKey = `${member._docId}_${member._memberIndex ?? idx}`;
              const memberName = member['Full Name'] || member.name || `Member ${idx + 1}`;
              const initials = memberName.charAt(0).toUpperCase();
              const totalConsumed = MEAL_SLOTS.filter(
                (s) => getMealClaimed(member, s.key).claimed
              ).length;

              return (
                <div
                  key={cardKey}
                  className="tmm-card bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  {/* Header */}
                  <div>
                    <div className="flex items-start justify-between p-5 sm:p-6 pb-4 border-b border-neutral-100">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#0A0B0E] text-white flex items-center justify-center font-bold text-base shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-neutral-900">{memberName}</h4>
                            {member.isLeader && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Leader
                              </span>
                            )}
                          </div>
                          {member.phone && (
                            <p className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1">
                              <Phone size={11} className="text-neutral-400" />
                              <span>{member.phone}</span>
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                String(
                                  member['Food Preference'] || member.foodPreference || ''
                                )
                                  .toLowerCase()
                                  .includes('non')
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {member['Food Preference'] || member.foodPreference || 'Veg'}
                            </span>
                            {(member['College Name'] || member.collegeName) && (
                              <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                                <Building size={10} />
                                {member['College Name'] || member.collegeName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-neutral-900">
                          {totalConsumed}
                          <span className="text-base font-medium text-neutral-400">/5</span>
                        </p>
                        <p className="text-[10px] text-neutral-500">Meals</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="px-5 sm:px-6 py-3 border-b border-neutral-100">
                      <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-neutral-900 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${(totalConsumed / 5) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                        <span>{totalConsumed} consumed</span>
                        <span>{5 - totalConsumed} remaining</span>
                      </div>
                    </div>

                    {/* 5-Meal toggle grid */}
                    <div className="p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {MEAL_SLOTS.map((slot) => {
                        const { claimed, claimedAt } = getMealClaimed(member, slot.key);
                        const IconComp = slot.icon;
                        const colors = COLOR_MAP[slot.color] || COLOR_MAP.amber;
                        const uKey = `${member._docId}_${member._memberIndex ?? ''}_${slot.key}`;
                        const isUpdating = !!updating[uKey];

                        return (
                          <button
                            key={slot.key}
                            onClick={() => toggleMeal(member, slot.key)}
                            disabled={isUpdating}
                            className={`group p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-wait hover:-translate-y-0.5 active:translate-y-0 ${
                              claimed
                                ? `${colors.bg} ${colors.border}`
                                : 'bg-neutral-50 border-neutral-200 hover:border-neutral-400'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span
                                className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                                  claimed
                                    ? `${colors.bg} border ${colors.border}`
                                    : 'bg-white border border-neutral-200'
                                }`}
                              >
                                {isUpdating ? (
                                  <Loader2 size={13} className="animate-spin text-neutral-500" />
                                ) : (
                                  <IconComp
                                    size={13}
                                    className={claimed ? colors.icon : 'text-neutral-500'}
                                  />
                                )}
                              </span>
                              {claimed ? (
                                <CheckCircle2 size={16} className="text-emerald-500" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-300 group-hover:border-neutral-500 transition-colors" />
                              )}
                            </div>

                            <p className="text-xs font-bold text-neutral-900 leading-tight">
                              {slot.name}
                            </p>
                            <p className="text-[9px] text-neutral-400 mt-0.5">{slot.time}</p>
                            {claimed && claimedAt ? (
                              <p className={`text-[9px] mt-1 font-semibold ${colors.text} truncate`}>
                                ✓ {claimedAt}
                              </p>
                            ) : (
                              <p className="text-[9px] mt-1 text-neutral-400 group-hover:text-neutral-600 transition-colors">
                                Tap to mark
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Special ID footer */}
                  {(member.specialId || member['Special ID']) && (
                    <div className="px-5 sm:px-6 pb-4">
                      <div className="px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-[10px]">
                        <span className="text-neutral-400 font-medium">Special ID</span>
                        <span className="font-mono font-bold text-neutral-800 tracking-wider truncate max-w-[180px]">
                          {member.specialId || member['Special ID']}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!teamData && !loading && !error && (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto">
            <Utensils size={28} className="text-neutral-400" />
          </div>
          <p className="text-sm font-semibold text-neutral-700">No team selected</p>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            Scan a participant QR code or search by team name to manage all 5 meals
          </p>
        </div>
      )}

      {/* QR Scanner Modal for Food Counter Desk */}
      <QrScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        onScanSuccess={handleQrScanSuccess}
      />
    </div>
  );
};

export default TeamMealManager;
