import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import ArcanaHeroSide from '../auth/ArcanaHeroSide';

export const AuthLayout = ({ children }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.99 },
        { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <main className="min-h-screen w-full bg-[#F4F5F8] flex items-center justify-center p-3 sm:p-6 lg:p-10">
      <div
        ref={containerRef}
        className="w-full max-w-[1140px] min-h-[640px] lg:min-h-[720px] bg-white rounded-[2rem] lg:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-neutral-200/60 p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch"
      >
        {/* Left Side: Form Area (Children) */}
        <section className="lg:col-span-6 flex items-center justify-center w-full py-4 sm:py-6 lg:py-8">
          {children}
        </section>

        {/* Right Side: Arcana Dark Hero Panel (Hidden or stacked gracefully on small screens, prominent on lg) */}
        <section className="lg:col-span-6 w-full flex items-stretch">
          <ArcanaHeroSide />
        </section>
      </div>
    </main>
  );
};

export default AuthLayout;
