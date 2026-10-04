import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Sparkles,
  Clock,
  Check,
  FileSpreadsheet,
  UtensilsCrossed,
  Layers,
  Users,
  ScanLine,
  Coffee,
  Sun,
  Moon,
  Cookie,
  ShieldCheck,
  CalendarDays,
  Flame
} from 'lucide-react';
import gsap from 'gsap';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../../components/common/BrandLogo';
import ExcelDataUploader from '../../components/hackathon/ExcelDataUploader';
import TeamMealManager from '../../components/hackathon/TeamMealManager';
import AllParticipantsManager from '../../components/hackathon/AllParticipantsManager';
import AdminPinGuard from '../../components/common/AdminPinGuard';
import { MEAL_SLOTS } from '../../utils/participantParser';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const [activeTab, setActiveTab] = useState('team'); // default to 'team' for fast QR & search operations

  useEffect(() => {
    if (user && user.role === 'participant') {
      navigate('/participant-dashboard', { replace: true });
      return;
    }

    const ctx = gsap.context(() => {
      // Staggered entrance for all dashboard components
      gsap.fromTo(
        '.dash-anim',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out' }
      );

      // Gentle shimmer on hero light streak
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

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-[#F4F5F8] text-neutral-900 flex flex-col font-sans selection:bg-neutral-900 selection:text-white"
    >
      {/* Top Navigation Bar */}
      <header className="dash-anim border-b border-neutral-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Brand Logo & Collaboration Badge */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-nowrap shrink-0">
            <BrandLogo size="default" showText={true} theme="dark" />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/90 text-amber-900 shadow-2xs whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="font-cinzel text-[10px] sm:text-[11px] font-bold tracking-wider uppercase whitespace-nowrap">
                <span className="hidden sm:inline">in collaboration with </span>
                <span className="sm:hidden">collab with </span>
                HackQubit 2.0
              </span>
            </div>
          </div>

          {/* Right User & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* User Capsule */}
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-neutral-200">
              <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-neutral-200">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-neutral-900 leading-tight">
                  {user?.name || 'Operations Lead'}
                </span>
                <span className="text-[10px] text-neutral-500 font-medium">
                  {user?.email || 'admin@admin.com'}
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#151619] hover:bg-black text-white text-xs font-semibold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer ml-1"
              title="Sign Out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Dark Hero Banner - Food Operations Console */}
        <div className="dash-anim relative rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden bg-[#0A0B0E] border border-neutral-800 p-7 sm:p-10 shadow-xl text-white select-none">
          {/* Ambient Background Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-neutral-800/30 rounded-full blur-3xl pointer-events-none" />

          {/* Diagonal Light Streaks */}
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
            {/* Left Welcome Copy */}
            <div className="lg:col-span-8 space-y-3.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-neutral-300">
                <Sparkles size={13} className="text-amber-400" />
                <span>Live Event &bull; Hackathon Deck Operations Active</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                Hackathon Deck
              </h1>

              <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed max-w-xl">
                Coordinate multi-day dining passes, scan participant QR tokens at food counters, verify 5-meal consumption statuses, and prevent duplicate meal issuance in real time.
              </p>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <div className="flex items-center gap-2 text-xs text-neutral-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  <Check size={13} className="text-emerald-400" />
                  <span>Admin Session Active</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  <Clock size={13} className="text-amber-400" />
                  <span>5 Meal Slots Configured</span>
                </div>
              </div>
            </div>

            {/* Right Stepped Card */}
            <div className="lg:col-span-4 flex justify-end">
              <div
                className="w-full sm:w-72 bg-[#232429] text-white rounded-2xl p-5 shadow-lg border border-white/10"
                style={{
                  clipPath: 'polygon(0 0, 78% 0, 85% 15%, 100% 15%, 100% 100%, 0 100%)'
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    Hackathon Deck
                  </span>
                  <span className="text-[10px] text-neutral-400">Live Counters</span>
                </div>

                <h3 className="text-sm font-semibold text-white mt-2 leading-snug">
                  Counter QR Scanner &amp; Token Sync
                </h3>
                <p className="text-neutral-300/80 text-[11px] leading-relaxed mt-1">
                  1-Tap to mark meals as consumed when students present their digital token.
                </p>

                {/* Avatar Stack */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                  <span className="text-[10px] text-neutral-400 font-medium">All Teams Mapped</span>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    <img
                      className="inline-block h-5 w-5 rounded-full ring-2 ring-[#232429] object-cover"
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"
                      alt=""
                    />
                    <img
                      className="inline-block h-5 w-5 rounded-full ring-2 ring-[#232429] object-cover"
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"
                      alt=""
                    />
                    <div className="inline-flex items-center justify-center h-5 w-5 rounded-full ring-2 ring-[#232429] bg-[#121316] text-[9px] font-medium text-neutral-300">
                      +4
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Feature Stats Metric Cards */}
        <div className="dash-anim grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-semibold">Meal Schedule</span>
              <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                <UtensilsCrossed size={15} />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-900">5 Meals</p>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">
              Day 1 &bull; Day 2 Covered
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-semibold">QR Verification</span>
              <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ScanLine size={15} />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-900">Live Camera</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              Instant 1-Second Lookup
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-semibold">Team Allocation</span>
              <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
                <Users size={15} />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-900">4-Members</p>
            <p className="text-[11px] text-blue-700 font-semibold mt-1">
              Per Team Grouped
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-semibold">Security Mode</span>
              <span className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center">
                <ShieldCheck size={15} />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-900">Tamper-Proof</p>
            <p className="text-[11px] text-purple-700 font-semibold mt-1">
              Student Read-Only Portal
            </p>
          </div>
        </div>

        {/* Navigation Tabs for Operations Console */}
        <div className="dash-anim flex items-center justify-between gap-4 border-b border-neutral-200/80 pb-1">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'team'
                  ? 'bg-[#151619] text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/80 hover:bg-neutral-50'
              }`}
            >
              <Layers size={15} />
              <span>Team Meal Manager &amp; QR Scanner</span>
            </button>

            <button
              onClick={() => setActiveTab('participants')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'participants'
                  ? 'bg-[#151619] text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/80 hover:bg-neutral-50'
              }`}
            >
              <Users size={15} />
              <span>All Participants (Edit &amp; Directory)</span>
            </button>

            <button
              onClick={() => setActiveTab('excel')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'excel'
                  ? 'bg-[#151619] text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/80 hover:bg-neutral-50'
              }`}
            >
              <FileSpreadsheet size={15} />
              <span>Excel Participant &amp; Team Sync</span>
            </button>

            <button
              onClick={() => setActiveTab('menu')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'menu'
                  ? 'bg-[#151619] text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/80 hover:bg-neutral-50'
              }`}
            >
              <UtensilsCrossed size={15} />
              <span>5-Meal Dining Schedule &amp; Menu</span>
            </button>
          </div>

          <span className="hidden md:inline-flex text-xs text-neutral-400 font-medium">
            Database: <strong className="text-neutral-800 ml-1">hackathon_participants</strong>
          </span>
        </div>

        {/* Tab 1: Team Meal Manager & QR Scanner */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <TeamMealManager />
          </div>
        )}

        {/* Tab 2: All Participants Directory & Real-Time Editor (PIN Protected) */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            <AdminPinGuard
              title="All Participants Directory &amp; Editor"
              description="Enter the 6-digit security PIN to view and edit participant records."
              badgeText="Restricted Participants Console"
              onExit={() => setActiveTab('team')}
            >
              <AllParticipantsManager onExit={() => setActiveTab('team')} />
            </AdminPinGuard>
          </div>
        )}

        {/* Tab 3: Excel Sheet Upload & Firestore Sync (PIN Protected) */}
        {activeTab === 'excel' && (
          <div className="space-y-6">
            <AdminPinGuard
              title="Excel Participant &amp; Team Sync"
              description="Enter the 6-digit security PIN to upload spreadsheets and synchronize teams with Firestore."
              badgeText="Restricted Excel Sync Console"
              onExit={() => setActiveTab('team')}
            >
              <ExcelDataUploader onExit={() => setActiveTab('team')} />
            </AdminPinGuard>
          </div>
        )}

        {/* Tab 3: 5-Meal Dining Schedule & Guidelines */}
        {activeTab === 'menu' && (
          <div className="dash-anim space-y-6 pt-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
                Hack Qubit Event — Official Food Menu
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Full schedule, menus, and dining guidelines for food counter volunteers
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {MEAL_SLOTS.map((meal, index) => {
                const IconComponent = meal.icon;
                return (
                  <div
                    key={meal.key}
                    className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold">
                          <IconComponent size={20} />
                        </span>
                        <span className="text-xs font-bold text-neutral-400">
                          Slot #{index + 1}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-neutral-900">{meal.name}</h3>
                        <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                          <Clock size={12} className="text-neutral-400" />
                          <span>{meal.time}</span>
                        </p>
                      </div>
                      <div className="bg-[#F4F5F8] p-3 rounded-2xl border border-neutral-200/60 text-xs text-neutral-700 leading-relaxed">
                        <p className="font-semibold text-neutral-900 mb-0.5">Catering Menu:</p>
                        <p>{meal.menu}</p>
                      </div>
                      {meal.note && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/70 rounded-xl px-3 py-2 text-[11px] text-amber-800">
                          <Coffee size={12} className="mt-0.5 shrink-0 text-amber-600" />
                          <span>{meal.note}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <ShieldCheck size={13} /> Token Scan Required
                      </span>
                      <span>1 Serving / Member</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Counter Guidelines Card */}
            <div className="p-6 rounded-3xl bg-neutral-900 text-white space-y-3">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm">Food Counter Volunteer Protocol</h3>
              </div>
              <ul className="text-xs text-neutral-300 space-y-1.5 list-disc pl-5 leading-relaxed">
                <li>Ask student to show their digital Food Pass on their phone screen.</li>
                <li>Tap <strong>"Scan QR"</strong> in the Team Meal Manager to automatically open their team record.</li>
                <li>Tap the respective meal button to mark it as consumed. The button turns green instantly.</li>
                <li>If a meal is already marked consumed, double-issuance is strictly prohibited.</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="dash-anim border-t border-neutral-200/80 bg-white py-6 mt-12 text-center text-xs text-neutral-500 space-y-1.5">
        <p className="font-cinzel text-xs sm:text-sm font-bold tracking-widest uppercase text-neutral-800">
          in collaboration with HackQubit 2.0
        </p>
        <p>&copy; 2026 Arcana Hackathon Deck &bull; Event Operations Platform.</p>
      </footer>
    </div>
  );
};

export default DashboardPage;
