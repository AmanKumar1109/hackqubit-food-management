import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Loader2,
  ShieldCheck,
  GraduationCap,
  Phone,
  Info,
  Sparkles
} from 'lucide-react';
import gsap from 'gsap';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../common/BrandLogo';
import InputField from '../common/InputField';
import { isValidEmail } from '../../utils/validation';

export const LoginForm = () => {
  const navigate = useNavigate();
  const { login, error } = useAuth();

  const [loginType, setLoginType] = useState('management'); // 'management' | 'participant'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const formContainerRef = useRef(null);
  const submitBtnRef = useRef(null);

  // GSAP entrance animation for all form items
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.gsap-form-item',
        {
          opacity: 0,
          y: 16,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.06,
          ease: 'power2.out',
        }
      );
    }, formContainerRef);

    return () => ctx.revert();
  }, [loginType]);

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = loginType === 'management' ? 'Admin email is required' : 'Student email is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = loginType === 'management' ? 'Admin password is required' : "Leader's phone number is required";
    } else if (loginType === 'participant' && password.replace(/\D/g, '').length < 6) {
      errors.password = "Please enter a valid 10-digit mobile number";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      if (formContainerRef.current) {
        gsap.to(formContainerRef.current, {
          x: [-6, 6, -4, 4, 0],
          duration: 0.4,
          ease: 'power2.inOut',
        });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedIn = await login({ email, password, loginType, rememberMe });
      if (loggedIn.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/participant-dashboard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={formContainerRef}
      className="w-full max-w-[440px] mx-auto flex flex-col justify-center py-4 px-4 sm:px-6"
    >
      {/* Top Logo & HackQubit 2.0 Collaboration Badge */}
      <div className="gsap-form-item flex flex-col items-start gap-2 mb-5 sm:mb-6">
        <BrandLogo size="default" showText={true} theme="dark" />
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/95 text-amber-900 border border-amber-200/90 shadow-2xs whitespace-nowrap">
          <Sparkles size={12} className="text-amber-600 shrink-0" />
          <span className="font-cinzel text-[10px] sm:text-[11px] font-bold tracking-wider uppercase whitespace-nowrap">
            in collaboration with HackQubit 2.0
          </span>
        </div>
      </div>

      {/* Main Title - Sign in */}
      <div className="gsap-form-item mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
          Sign in to Meal Operations
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Access your hackathon food pass, 5-meal tokens &amp; team dining status
        </p>
      </div>

      {/* Dual Login Segmented Tabs: Management vs Participant */}
      <div className="gsap-form-item mb-4 grid grid-cols-2 p-1 rounded-2xl bg-neutral-100 border border-neutral-200/80">
        <button
          type="button"
          onClick={() => {
            setLoginType('management');
            setEmail('');
            setPassword('');
            setFieldErrors({});
            if (setError) setError(null);
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            loginType === 'management'
              ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/60'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <ShieldCheck size={14} className={loginType === 'management' ? 'text-neutral-900' : 'text-neutral-500'} />
          <span>Management</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setLoginType('participant');
            setEmail('');
            setPassword('');
            setFieldErrors({});
            if (setError) setError(null);
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            loginType === 'participant'
              ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/60'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <GraduationCap size={14} className={loginType === 'participant' ? 'text-neutral-900' : 'text-neutral-500'} />
          <span>Participant</span>
        </button>
      </div>

      {/* Participant Guidance Hint */}
      {loginType === 'participant' && (
        <div className="gsap-form-item mb-4 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-800 flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5 text-blue-600" />
          <span>
            Enter your <strong>registered email address</strong> and your <strong>team leader's phone number</strong> as the password to access your meal pass.
          </span>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="gsap-form-item mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {/* Email Address Field */}
        <div className="gsap-form-item">
          <InputField
            id="email"
            label={loginType === 'management' ? 'Management Admin Email' : 'Student Registered Email'}
            type="email"
            icon={Mail}
            placeholder={loginType === 'management' ? 'admin@admin.com' : 'aarav.sharma@college.edu'}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
            }}
            error={fieldErrors.email}
            autoComplete="email"
            disabled={isSubmitting}
          />
        </div>

        {/* Password / Leader Phone Field */}
        <div className="gsap-form-item">
          <InputField
            id="password"
            label={loginType === 'management' ? 'Admin Password' : "Leader's Phone Number (Password)"}
            type={loginType === 'management' ? 'password' : 'text'}
            icon={loginType === 'management' ? Lock : Phone}
            placeholder={loginType === 'management' ? '••••••••••••' : 'e.g. 9876543210'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
            }}
            error={fieldErrors.password}
            autoComplete={loginType === 'management' ? 'current-password' : 'tel'}
            disabled={isSubmitting}
          />
        </div>

        {/* Remember Me Checkbox */}
        <div className="gsap-form-item flex items-center pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 focus:ring-offset-0 cursor-pointer accent-neutral-900"
            />
            <span className="text-xs sm:text-[13px] font-medium text-neutral-800">
              Remember me
            </span>
          </label>
        </div>

        {/* Sign In Primary Button */}
        <div className="gsap-form-item pt-1">
          <button
            ref={submitBtnRef}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#151619] hover:bg-black text-white text-sm font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-neutral-300" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>
                {loginType === 'management' ? 'Sign In as Management' : 'Sign In as Participant'}
              </span>
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="gsap-form-item flex flex-col gap-1 pt-1 text-xs sm:text-[13px]">
          <Link
            to="/forgot-password"
            className="text-neutral-500 hover:text-neutral-900 transition-colors w-fit"
          >
            Forgot Password?
          </Link>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
