import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import BrandLogo from '../common/BrandLogo';
import InputField from '../common/InputField';
import { isValidEmail } from '../../utils/validation';

export const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.gsap-form-item',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [isSubmitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your email');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    // Simulate reset link dispatch
    await new Promise((res) => setTimeout(res, 800));
    setLoading(false);
    setIsSubmitted(true);
  };

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[420px] mx-auto flex flex-col justify-center py-6 px-4 sm:px-6"
    >
      {/* Top Logo & Collaboration Badge */}
      <div className="gsap-form-item flex flex-col items-start gap-2 mb-6">
        <BrandLogo size="default" showText={true} theme="dark" />
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/95 text-amber-900 border border-amber-200/90 shadow-2xs whitespace-nowrap">
          <Sparkles size={12} className="text-amber-600 shrink-0" />
          <span className="font-cinzel text-[10px] sm:text-[11px] font-bold tracking-wider uppercase whitespace-nowrap">
            in collaboration with HackQubit 2.0
          </span>
        </div>
      </div>

      {!isSubmitted ? (
        <>
          <div className="gsap-form-item mb-7">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
              Reset password
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2 leading-relaxed">
              Enter the email associated with your account and we’ll send a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <div className="gsap-form-item">
              <InputField
                id="reset-email"
                label="Email Address"
                type="email"
                icon={Mail}
                placeholder="johndoe@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                error={error}
                disabled={loading}
              />
            </div>

            <div className="gsap-form-item pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#151619] hover:bg-black text-white text-sm font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-neutral-300" />
                    <span>Sending Instructions...</span>
                  </>
                ) : (
                  <span>Send Reset Instructions</span>
                )}
              </button>
            </div>

            <div className="gsap-form-item pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-700 hover:text-black transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Back to sign in</span>
              </Link>
            </div>
          </form>
        </>
      ) : (
        <div className="gsap-form-item flex flex-col items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">Check your inbox</h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            We have sent password recovery instructions to <strong className="text-neutral-900">{email}</strong>.
          </p>
          <Link
            to="/login"
            className="w-full mt-4 text-center bg-[#151619] hover:bg-black text-white text-sm font-semibold py-3.5 px-4 rounded-xl transition-all duration-200"
          >
            Return to sign in
          </Link>
        </div>
      )}
    </div>
  );
};

export default ForgotPasswordForm;
