import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

export const ArcanaHeroSide = () => {
  const containerRef = useRef(null);
  const monumentRef = useRef(null);
  const streakRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Float animation for the 3D monument
      gsap.to(monumentRef.current, {
        y: -10,
        rotateZ: 0.5,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Diagonal light streaks shimmer
      gsap.to('.hero-light-streak', {
        opacity: 0.8,
        scaleY: 1.05,
        duration: 3,
        repeat: -1,
        yoyo: true,
        stagger: 0.7,
        ease: 'power1.inOut',
      });

      // Card subtle breathing hover
      gsap.fromTo(
        cardRef.current,
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, delay: 0.3, ease: 'power3.out' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Subtle interactive parallax tilt on mouse move
  const handleMouseMove = (e) => {
    if (!monumentRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    gsap.to(monumentRef.current, {
      rotateY: x * 14,
      rotateX: -y * 14,
      duration: 0.6,
      ease: 'power2.out',
    });
  };

  const handleMouseLeave = () => {
    if (!monumentRef.current) return;
    gsap.to(monumentRef.current, {
      rotateY: 0,
      rotateX: 0,
      duration: 0.8,
      ease: 'power2.out',
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full min-h-[580px] lg:min-h-[680px] bg-[#0A0B0E] rounded-[2rem] lg:rounded-[2.5rem] p-7 sm:p-9 lg:p-11 flex flex-col justify-between overflow-hidden shadow-2xl border border-white/5 select-none"
    >
      {/* Ambient background glow & radial gradient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-neutral-800/30 rounded-full blur-3xl pointer-events-none" />

      {/* Diagonal Light Streaks (Top-right to Bottom-left as shown in image) */}
      <div ref={streakRef} className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Main bright beam */}
        <div
          className="hero-light-streak absolute top-[-10%] right-[15%] w-[3px] h-[140%] origin-top opacity-50"
          style={{
            transform: 'rotate(-38deg)',
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.7) 30%, rgba(200,210,230,0.4) 60%, transparent)',
            boxShadow: '0 0 15px rgba(255,255,255,0.4)'
          }}
        />
        {/* Soft secondary beam */}
        <div
          className="hero-light-streak absolute top-[5%] right-[22%] w-[2px] h-[130%] origin-top opacity-30"
          style={{
            transform: 'rotate(-38deg)',
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.5) 40%, transparent)',
          }}
        />
        {/* Wide subtle ambient ray */}
        <div
          className="hero-light-streak absolute top-[-20%] right-[-5%] w-[80px] h-[150%] origin-top opacity-15"
          style={{
            transform: 'rotate(-38deg)',
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2) 35%, transparent 75%)',
            filter: 'blur(10px)'
          }}
        />
        {/* Bottom subtle cross line */}
        <div
          className="absolute bottom-[28%] left-[-10%] w-[120%] h-[1px] opacity-20 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(200,210,255,0.3) 50%, transparent)',
            transform: 'rotate(-25deg)'
          }}
        />
      </div>

      {/* Top Centerpiece: Large 3D Faceted Architectural "A" Monument */}
      <div className="relative z-10 flex justify-center items-center pt-2 sm:pt-4 pb-4">
        <div
          ref={monumentRef}
          style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
          className="relative w-52 sm:w-64 h-52 sm:h-64 flex items-center justify-center transition-transform"
        >
          {/* Faceted 3D Architectural Letter A */}
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Left outer illuminated facet */}
              <linearGradient id="monumentLeft" x1="40" y1="180" x2="100" y2="25" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4A4D57" />
                <stop offset="0.6" stopColor="#353740" />
                <stop offset="1" stopColor="#6C707C" />
              </linearGradient>

              {/* Right dark facet in shadow */}
              <linearGradient id="monumentRight" x1="100" y1="25" x2="160" y2="180" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1E2025" />
                <stop offset="0.7" stopColor="#111215" />
                <stop offset="1" stopColor="#08080A" />
              </linearGradient>

              {/* Inner depth/bevel shadow */}
              <linearGradient id="monumentInner" x1="70" y1="140" x2="130" y2="140" gradientUnits="userSpaceOnUse">
                <stop stopColor="#25272F" />
                <stop offset="1" stopColor="#15161A" />
              </linearGradient>

              {/* Apex metallic highlight */}
              <linearGradient id="apexGlow" x1="100" y1="20" x2="100" y2="80" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFFFFF" stopOpacity="0.4" />
                <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Left Prism Facet */}
            <polygon points="100,28 35,172 68,172 100,88" fill="url(#monumentLeft)" />

            {/* Right Prism Facet */}
            <polygon points="100,28 100,88 132,172 165,172" fill="url(#monumentRight)" />

            {/* Inner Bridge / Cross Wedge */}
            <polygon points="68,135 132,135 116,102 84,102" fill="url(#monumentInner)" opacity="0.95" />

            {/* Sharp Apex Highlight Line */}
            <line x1="100" y1="28" x2="100" y2="88" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            <line x1="100" y1="28" x2="35" y2="172" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

            {/* Subtle base shadow */}
            <ellipse cx="100" cy="182" rx="65" ry="8" fill="rgba(0,0,0,0.6)" filter="blur(6px)" />
          </svg>
        </div>
      </div>

      {/* Middle Brand Info and Description */}
      <div className="relative z-10 space-y-2.5 my-2">

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 w-fit backdrop-blur-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-cinzel text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-amber-200">
            in collaboration with HackQubit 2.0
          </span>
        </div>

        <h2 className="text-white text-2xl sm:text-3xl font-semibold tracking-tight">
          Smart Event Hackathon Deck
        </h2>

        <p className="text-neutral-300 text-xs sm:text-[13px] leading-relaxed max-w-sm">
          Seamlessly coordinate multi-day dining passes, verify participant QR tokens at food counters, eliminate meal wastage, and synchronize team allocations in real time.
        </p>

        <p className="text-neutral-400 text-xs font-normal pt-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span>Over 5,000+ meals tracked across premier hackathons</span>
        </p>
      </div>

      {/* Bottom Floating Distinctive Food Ops Schedule Card */}
      <div
        ref={cardRef}
        className="relative z-10 mt-4 bg-[#232429] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl border border-white/5 transition-all duration-300 hover:border-white/10 hover:shadow-2xl"
        style={{
          clipPath: 'polygon(0 0, 78% 0, 85% 15%, 100% 15%, 100% 100%, 0 100%)'
        }}
      >
        <div className="flex flex-col gap-2">

          <h3 className="text-white font-semibold text-sm sm:text-base leading-snug max-w-[280px]">
            Live Counter Verification &amp; QR Tokens
          </h3>

          <p className="text-neutral-300/80 text-[11px] sm:text-xs leading-relaxed max-w-[270px]">
            Day 1 Breakfast &bull; Lunch &bull; Evening Snacks &bull; Dinner &bull; Day 2 Breakfast.
          </p>

          {/* Bottom Avatar Stack & Badge */}
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
            <span className="text-[10px] text-neutral-400 font-medium">4-Member Teams Sync</span>
            <div className="flex -space-x-2 overflow-hidden">
              <img
                className="inline-block h-6 w-6 sm:h-7 sm:w-7 rounded-full ring-2 ring-[#232429] object-cover"
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                alt="Member 1"
              />
              <img
                className="inline-block h-6 w-6 sm:h-7 sm:w-7 rounded-full ring-2 ring-[#232429] object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                alt="Member 2"
              />
              <img
                className="inline-block h-6 w-6 sm:h-7 sm:w-7 rounded-full ring-2 ring-[#232429] object-cover"
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"
                alt="Member 3"
              />
              <div className="inline-flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-full ring-2 ring-[#232429] bg-[#121316] text-[10px] sm:text-xs font-medium text-neutral-300">
                +4
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArcanaHeroSide;
