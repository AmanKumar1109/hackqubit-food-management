import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  CheckCircle2,
  Clock,
  Utensils,
  Users,
  Copy,
  Check,
  Building,
  Sparkles,
  ShieldCheck,
  Lock,
  RefreshCw,
  AlertCircle,
  Phone,
  GraduationCap,
  Wifi,
  Mail,
  CreditCard,
  ExternalLink,
  Key
} from 'lucide-react';
import gsap from 'gsap';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../../components/common/BrandLogo';
import {
  MEAL_SLOTS,
  parseTeamDocToMembers,
  getMealClaimed
} from '../../utils/participantParser';
import DynamicQrCode from '../../components/common/DynamicQrCode';

const PARTICIPANTS_COLLECTION = 'hackathon_participants';

export const ParticipantDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pageRef = useRef(null);

  const [copied, setCopied] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState(null);
  const [teamMembers, setTeamMembers] = useState(user?.teammates || null);
  const [rawTeamDoc, setRawTeamDoc] = useState(null);
  const [fetchingTeam, setFetchingTeam] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const copyText = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text).trim());
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  /* ── GSAP entrance ─────────────────────────────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.participant-anim',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: 'power2.out' }
      );
      gsap.to('.hero-light-streak', {
        opacity: 0.7,
        scaleY: 1.05,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  /* ── Real-Time Firestore Sync ───────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setFetchingTeam(true);

    const setupListener = async () => {
      try {
        const participantsRef = collection(db, PARTICIPANTS_COLLECTION);
        const searchConditions = [
          user?.specialId && query(participantsRef, where('Special ID', '==', user.specialId)),
          user?.specialId && query(participantsRef, where('specialId', '==', user.specialId)),
          user?.teamName && query(participantsRef, where('Team Name', '==', user.teamName)),
          user?.teamName && query(participantsRef, where('teamName', '==', user.teamName)),
          user?.email && query(participantsRef, where('Leader Email', '==', user.email)),
          user?.email && query(participantsRef, where('Email', '==', user.email)),
          user?.email && query(participantsRef, where('email', '==', user.email))
        ].filter(Boolean);

        let targetDocData = null;
        let targetDocId = null;

        for (const q of searchConditions) {
          const snap = await getDocs(q);
          if (!snap.empty) {
            targetDocId = snap.docs[0].id;
            targetDocData = snap.docs[0].data();
            break;
          }
        }

        if (!targetDocData) {
          const allDocs = await getDocs(participantsRef);
          const uTeam = (user?.teamName || '').toLowerCase();
          const uEmail = (user?.email || '').toLowerCase();
          const uSpecial = (user?.specialId || '').toLowerCase();

          for (const d of allDocs.docs) {
            const data = d.data();
            const dTeam = String(data['Team Name'] || data.teamName || '').toLowerCase();
            const dEmail = String(data['Leader Email'] || data.Email || data.email || '').toLowerCase();
            const dSpecial = String(data['Special ID'] || data.specialId || d.id).toLowerCase();

            if (
              (uTeam && dTeam === uTeam) ||
              (uEmail && dEmail === uEmail) ||
              (uSpecial && dSpecial === uSpecial)
            ) {
              targetDocId = d.id;
              targetDocData = data;
              break;
            }
          }
        }

        if (targetDocId && isMounted) {
          const parsed = parseTeamDocToMembers(targetDocData, targetDocId);
          setRawTeamDoc(targetDocData);
          setTeamMembers(parsed);
          setLastRefreshed(new Date());
          setFetchingTeam(false);

          const unsubscribe = onSnapshot(
            doc(db, PARTICIPANTS_COLLECTION, targetDocId),
            (docSnap) => {
              if (docSnap.exists() && isMounted) {
                const data = docSnap.data();
                setRawTeamDoc(data);
                const updatedMembers = parseTeamDocToMembers(data, docSnap.id);
                setTeamMembers(updatedMembers);
                setLastRefreshed(new Date());
              }
            }
          );

          return unsubscribe;
        } else {
          if (isMounted) {
            setTeamMembers(user?.teammates || [user]);
            setFetchingTeam(false);
          }
        }
      } catch (err) {
        console.error('Participant live fetch error:', err);
        if (isMounted) {
          setTeamError('Live sync unavailable. Showing cached data.');
          setTeamMembers(user?.teammates || [user]);
          setFetchingTeam(false);
        }
      }
    };

    let unsubFn = null;
    setupListener().then((unsub) => {
      if (typeof unsub === 'function') unsubFn = unsub;
    });

    return () => {
      isMounted = false;
      if (unsubFn) unsubFn();
    };
  }, [user]);

  // Animate team cards
  useEffect(() => {
    if (!teamMembers) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.team-card',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
      );
    }, pageRef);
    return () => ctx.revert();
  }, [teamMembers]);

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  const copySpecialId = () => {
    const idToCopy = rawTeamDoc?.['Special ID'] || rawTeamDoc?.specialId || user?.specialId;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const myMemberData =
    teamMembers?.find((m) => {
      const mEmail = (m.email || m.Email || '').toLowerCase();
      const uEmail = (user?.email || '').toLowerCase();
      const mPhone = String(m.phone || m.Phone || '').replace(/\D/g, '');
      const uPhone = String(user?.phone || user?.leaderPhone || '').replace(/\D/g, '');
      return (mEmail && uEmail && mEmail === uEmail) || (mPhone && uPhone && mPhone === uPhone);
    }) ||
    teamMembers?.[0] ||
    user;

  const displayTeamName =
    rawTeamDoc?.['Team Name'] ||
    rawTeamDoc?.teamName ||
    user?.teamName ||
    myMemberData?.teamName ||
    'TEAM';

  const displayCollege =
    rawTeamDoc?.['Leader College'] ||
    rawTeamDoc?.['College Name'] ||
    rawTeamDoc?.collegeName ||
    user?.college ||
    myMemberData?.college ||
    'Engineering College';

  const displayCourse =
    rawTeamDoc?.['Leader Course & Year'] ||
    myMemberData?.course ||
    '';

  const displaySpecialId =
    rawTeamDoc?.['Special ID'] ||
    rawTeamDoc?.specialId ||
    user?.specialId ||
    'HQ3FG5CWHJ7RAZYS';

  const displayFoodPref =
    rawTeamDoc?.['Food Preference'] ||
    rawTeamDoc?.foodPreference ||
    myMemberData?.foodPreference ||
    'Veg';

  const displayWifiId =
    rawTeamDoc?.['WiFi ID'] ||
    rawTeamDoc?.wifiId ||
    rawTeamDoc?.wifi?.id ||
    '';

  const displayWifiPass =
    rawTeamDoc?.['WiFi Password'] ||
    rawTeamDoc?.wifiPassword ||
    rawTeamDoc?.wifi?.password ||
    '';

  const displayLeaderName =
    rawTeamDoc?.['Leader Name'] ||
    rawTeamDoc?.leader?.name ||
    rawTeamDoc?.['Full Name'] ||
    user?.leader?.name ||
    teamMembers?.[0]?.name ||
    'Team Leader';

  const displayLeaderEmail =
    rawTeamDoc?.['Leader Email'] ||
    rawTeamDoc?.leader?.email ||
    rawTeamDoc?.Email ||
    user?.email ||
    '—';

  const displayLeaderPhone =
    rawTeamDoc?.['Leader Contact'] ||
    rawTeamDoc?.['Leader Phone'] ||
    rawTeamDoc?.leader?.contact ||
    rawTeamDoc?.Phone ||
    user?.leaderPhone ||
    '—';

  const displayTxnId =
    rawTeamDoc?.['Transaction ID'] ||
    rawTeamDoc?.registration?.transactionId ||
    '—';

  const displayPaymentLink =
    rawTeamDoc?.['Payment Screenshot Link'] ||
    rawTeamDoc?.registration?.paymentScreenshotLink;

  const displayTimestamp =
    rawTeamDoc?.TimeStamp ||
    rawTeamDoc?.registration?.timestamp;

  const displayTeamSize =
    rawTeamDoc?.['Team Size'] ||
    rawTeamDoc?.teamSize ||
    teamMembers?.length ||
    4;

  /* Team-level stats */
  const teamStats = teamMembers
    ? (() => {
        let total = 0,
          consumed = 0;
        teamMembers.forEach((m) =>
          MEAL_SLOTS.forEach((s) => {
            total++;
            if (getMealClaimed(m, s.key).claimed) consumed++;
          })
        );
        return { total, consumed, remaining: total - consumed, members: teamMembers.length };
      })()
    : null;

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-[#F4F5F8] text-neutral-900 flex flex-col font-sans selection:bg-neutral-900 selection:text-white"
    >
      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header className="participant-anim border-b border-neutral-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center shrink-0">
            <BrandLogo
              size="default"
              showText={true}
              theme="dark"
              subtitle="in collaboration with HackQubit 2.0"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3">
              <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-neutral-200">
                {myMemberData?.name?.charAt(0) || user?.name?.charAt(0) || 'P'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-neutral-900 leading-tight">
                  {myMemberData?.name || user?.name || 'Participant'}
                </span>
                <span className="text-[10px] text-neutral-500 font-medium">
                  {displayTeamName}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#151619] hover:bg-black text-white text-xs font-semibold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Dark Hero Food Pass Card ─────────────────────────── */}
        <div className="participant-anim relative rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden bg-[#0A0B0E] border border-neutral-800 p-6 sm:p-9 shadow-xl text-white select-none">
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-neutral-800/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="hero-light-streak absolute top-[-10%] right-[18%] w-[2.5px] h-[140%] origin-top opacity-50"
              style={{
                transform: 'rotate(-38deg)',
                background:
                  'linear-gradient(to bottom, transparent, rgba(255,255,255,0.7) 30%, rgba(200,210,230,0.4) 60%, transparent)',
                boxShadow: '0 0 15px rgba(255,255,255,0.4)'
              }}
            />
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-neutral-200">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>5-Meal Hackathon Dining Token</span>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    String(displayFoodPref).toLowerCase().includes('non')
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {displayFoodPref} Preference
                </span>
                {rawTeamDoc?.['Team Size'] && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Team Size: {rawTeamDoc['Team Size']}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
                  {myMemberData?.name || user?.name}
                </h1>
                <div className="text-neutral-400 text-xs sm:text-sm mt-2 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-neutral-300">
                    <Building size={14} className="text-neutral-400" />
                    <strong>{displayCollege}</strong>
                  </span>
                  {displayCourse && (
                    <>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 text-neutral-400">
                        <GraduationCap size={14} />
                        {displayCourse}
                      </span>
                    </>
                  )}
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 text-neutral-300">
                    <Users size={14} className="text-neutral-400" />
                    Team <strong>{displayTeamName}</strong>
                  </span>
                </div>

                {displayWifiId && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white mt-2 font-mono">
                    <Wifi size={13} className="text-emerald-400 shrink-0" />
                    <span>WiFi: <strong>{displayWifiId}</strong></span>
                    {displayWifiPass && (
                      <>
                        <span className="text-neutral-500">|</span>
                        <span>Pass: <strong className="text-amber-300">{displayWifiPass}</strong></span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Special ID */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#232429] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Your 16-Digit Special Token ID
                  </span>
                  <span className="text-sm sm:text-base font-mono font-bold text-white tracking-widest block">
                    {displaySpecialId}
                  </span>
                </div>
                <button
                  onClick={copySpecialId}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Dynamic Real QR Code Card */}
            <div className="lg:col-span-4 flex justify-center lg:justify-end">
              <div className="w-60 bg-white text-neutral-900 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center space-y-3 border-4 border-[#232429]">
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Sparkles size={13} className="text-amber-500" />
                  <span className="text-[11px] font-bold tracking-wider uppercase">
                    Scan at Food Desk
                  </span>
                </div>

                <div className="p-2 bg-white rounded-2xl border-2 border-neutral-100 shadow-sm flex items-center justify-center">
                  <DynamicQrCode
                    value={displaySpecialId}
                    size={136}
                    className="w-34 h-34"
                  />
                </div>

                <div className="w-full space-y-0.5">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">
                    Token ID
                  </span>
                  <div className="text-[11px] font-mono text-neutral-900 font-bold tracking-wider truncate px-2 py-1 bg-neutral-100 rounded-lg">
                    {displaySpecialId}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── View-Only Banner ─────────────────────────────────── */}
        <div className="participant-anim p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
          <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Tamper-Proof Participant Portal (View-Only Mode)</p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Meal tokens are verified by <strong>Hackathon Management Staff</strong> at dining counters. Statuses update in real time.
            </p>
          </div>
        </div>

        {/* ── Team Registration & Network Credentials Dossier ── */}
        <div className="participant-anim space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-2">
                <Users size={20} className="text-neutral-900" />
                <span>Team Registration &amp; Credentials</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Official Google Form submission details, leader info, and venue WiFi access
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white border border-neutral-200 text-neutral-700 shadow-xs">
              Team Size: <strong>{displayTeamSize} Members</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: WiFi Access */}
            <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Wifi size={15} className="text-emerald-600" />
                  <span>Venue WiFi Access</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-500">SSID / WiFi ID:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-neutral-900">
                    <span>{displayWifiId || 'HQ_VENUE_WIFI'}</span>
                    <button
                      onClick={() => copyText(displayWifiId || 'HQ_VENUE_WIFI', 'wifiId')}
                      className="p-1 hover:text-emerald-600 text-neutral-400 transition-colors cursor-pointer"
                      title="Copy WiFi SSID"
                    >
                      {copiedLabel === 'wifiId' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-500">Password:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-neutral-900">
                    <span>{displayWifiPass || 'hackqubit@2026'}</span>
                    <button
                      onClick={() => copyText(displayWifiPass || 'hackqubit@2026', 'wifiPass')}
                      className="p-1 hover:text-emerald-600 text-neutral-400 transition-colors cursor-pointer"
                      title="Copy WiFi Password"
                    >
                      {copiedLabel === 'wifiPass' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Team Leader Profile */}
            <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <GraduationCap size={15} className="text-amber-600" />
                  <span>Team Leader Details</span>
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Leader
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-neutral-900 text-sm">{displayLeaderName}</p>
                <div className="flex items-center gap-1.5 text-neutral-600">
                  <Phone size={12} className="text-neutral-400 shrink-0" />
                  <span className="font-mono">{displayLeaderPhone}</span>
                </div>
                {displayLeaderEmail && displayLeaderEmail !== '—' && (
                  <div className="flex items-center gap-1.5 text-neutral-600 truncate">
                    <Mail size={12} className="text-neutral-400 shrink-0" />
                    <span className="truncate">{displayLeaderEmail}</span>
                  </div>
                )}
                <p className="text-[11px] text-neutral-500 pt-0.5 truncate">
                  {displayCollege} {displayCourse ? `• ${displayCourse}` : ''}
                </p>
              </div>
            </div>

            {/* Card 3: Payment & Verification */}
            <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <CreditCard size={15} className="text-blue-600" />
                  <span>Payment &amp; Registration</span>
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Verified
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {displayTimestamp && (
                  <div className="flex items-center justify-between text-neutral-600">
                    <span className="text-neutral-400 text-[11px]">Submitted:</span>
                    <span className="font-medium text-[11px] truncate max-w-[160px]">{displayTimestamp}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-500 text-[11px]">UTR / Txn ID:</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-neutral-900 text-[11px]">
                    <span className="truncate max-w-[110px]">{displayTxnId}</span>
                    {displayTxnId !== '—' && (
                      <button
                        onClick={() => copyText(displayTxnId, 'txnId')}
                        className="p-0.5 hover:text-blue-600 text-neutral-400 transition-colors cursor-pointer"
                        title="Copy Transaction ID"
                      >
                        {copiedLabel === 'txnId' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                </div>

                {displayPaymentLink && (
                  <a
                    href={displayPaymentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-semibold transition-colors"
                  >
                    <span>View Payment Proof</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Personal 5-Meal Token Schedule ─────────────────────── */}
        <div className="participant-anim space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-2">
              <Utensils size={20} className="text-neutral-900" />
              <span>5-Meal Token Schedule ({myMemberData?.name})</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Day 1 Breakfast &bull; Lunch &bull; Evening Snacks &bull; Dinner &bull; Day 2 Breakfast
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {MEAL_SLOTS.map((meal) => {
              const IconComponent = meal.icon;
              const { claimed: isClaimed, claimedAt } = getMealClaimed(myMemberData, meal.key);

              return (
                <div
                  key={meal.key}
                  className={`p-4 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-3.5 ${
                    isClaimed
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                      : 'bg-white border-neutral-200/80 shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                          isClaimed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-900'
                        }`}
                      >
                        <IconComponent size={18} />
                      </span>
                      {isClaimed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={11} />
                          <span>Claimed</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                          Not Claimed
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                        {meal.name}
                      </h3>
                      <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                        <Clock size={11} />
                        <span>{meal.time}</span>
                      </p>
                    </div>
                    <p className="text-[10px] text-neutral-600 bg-neutral-50 p-2 rounded-xl border border-neutral-100 leading-relaxed">
                      {meal.menu}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {isClaimed ? (
                        <span className="font-semibold text-emerald-700 flex items-center gap-1">
                          <Check size={12} /> Served {claimedAt ? `(${claimedAt})` : ''}
                        </span>
                      ) : (
                        <span className="text-neutral-500 flex items-center gap-1">
                          <Lock size={11} /> Awaiting Scan
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Team Meal Status (All Members from Firestore) ─────── */}
        <div className="participant-anim space-y-5">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-semibold mb-1">
                <Users size={14} className="text-neutral-900" />
                <span>Team: {displayTeamName}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
                Team Members 5-Meal Status
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Live read-only status for all team members
                {lastRefreshed && (
                  <span className="ml-1 text-neutral-400">
                    &bull; updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {teamStats && (
                <>
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs text-center shadow-xs">
                    <p className="text-base font-bold text-neutral-900">{teamStats.members}</p>
                    <p className="text-neutral-400 text-[10px]">Members</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-center shadow-xs">
                    <p className="text-base font-bold text-emerald-700">{teamStats.consumed}</p>
                    <p className="text-emerald-500 text-[10px]">Consumed</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs text-center shadow-xs">
                    <p className="text-base font-bold text-neutral-500">{teamStats.remaining}</p>
                    <p className="text-neutral-400 text-[10px]">Remaining</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error notice if any */}
          {teamError && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
              <AlertCircle size={14} className="text-amber-500 shrink-0" />
              <span>{teamError}</span>
            </div>
          )}

          {/* Member cards grid */}
          {teamMembers && teamMembers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {teamMembers.map((member, idx) => {
                const memberName = member['Full Name'] || member.name || `Member ${idx + 1}`;
                const initials = memberName.charAt(0).toUpperCase();
                const mEmail = (member.Email || member.email || '').toLowerCase();
                const uEmail = (user?.email || '').toLowerCase();
                const isSelf = mEmail && uEmail && mEmail === uEmail;
                const totalConsumed = MEAL_SLOTS.filter(
                  (s) => getMealClaimed(member, s.key).claimed
                ).length;

                return (
                  <div
                    key={`${member._docId || idx}_${member._memberIndex ?? idx}`}
                    className={`team-card rounded-3xl border transition-all select-none overflow-hidden ${
                      isSelf
                        ? 'bg-neutral-50 border-neutral-300 ring-2 ring-neutral-300 shadow-sm'
                        : 'bg-white border-neutral-200/80 shadow-xs'
                    }`}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between p-5 sm:p-6 pb-4 border-b border-neutral-100">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#0A0B0E] text-white flex items-center justify-center font-bold text-base shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-neutral-900">{memberName}</h3>
                            {isSelf && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-900 text-white">
                                You
                              </span>
                            )}
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
                          {member.email && (
                            <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">
                              {member.email}
                            </p>
                          )}
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

                    {/* 5-Meal status grid (Read-Only) */}
                    <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {MEAL_SLOTS.map((slot) => {
                        const { claimed, claimedAt } = getMealClaimed(member, slot.key);
                        const IconComp = slot.icon;

                        return (
                          <div
                            key={slot.key}
                            className={`p-2.5 rounded-2xl border flex items-start gap-2 ${
                              claimed
                                ? 'bg-emerald-50/70 border-emerald-200'
                                : 'bg-neutral-50 border-neutral-200'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center ${
                                claimed ? 'bg-emerald-100' : 'bg-white border border-neutral-200'
                              }`}
                            >
                              <IconComp
                                size={12}
                                className={claimed ? 'text-emerald-600' : 'text-neutral-400'}
                              />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-neutral-900 truncate">
                                {slot.name}
                              </p>
                              {claimed ? (
                                <p className="text-[9px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-0.5 truncate">
                                  <CheckCircle2 size={9} className="shrink-0" />
                                  <span>{claimedAt || 'Claimed'}</span>
                                </p>
                              ) : (
                                <p className="text-[9px] text-neutral-400 mt-0.5 flex items-center gap-0.5">
                                  <Lock size={9} className="shrink-0" />
                                  <span>Not yet</span>
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="participant-anim border-t border-neutral-200/80 bg-white py-6 mt-12 text-center text-xs text-neutral-500 space-y-1.5">
        <p className="font-cinzel text-xs sm:text-sm font-bold tracking-widest uppercase text-neutral-800">
          in collaboration with HackQubit 2.0
        </p>
        <p>&copy; 2026 Arcana Hackathon Deck &bull; Student Pass &amp; Dining Portal.</p>
      </footer>
    </div>
  );
};

export default ParticipantDashboardPage;
