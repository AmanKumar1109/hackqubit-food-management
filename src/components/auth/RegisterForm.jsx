import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../common/BrandLogo';
import InputField from '../common/InputField';
import SocialButton from '../common/SocialButton';
import { isValidEmail } from '../../utils/validation';

export const RegisterForm = () => {
  const navigate = useNavigate();
  const { register, socialLogin, error } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const formRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.gsap-form-item',
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out', delay: 0.1 }
      );
    }, formRef);

    return () => ctx.revert();
  }, []);

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Full name is required';
    if (!email.trim()) errors.email = 'Email address is required';
    else if (!isValidEmail(email)) errors.email = 'Please enter a valid email address';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!agreeTerms) errors.terms = 'Please accept the terms and conditions';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register({ name, email, password });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialClick = async (provider) => {
    setIsSubmitting(true);
    try {
      await socialLogin(provider);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={formRef}
      className="w-full max-w-[420px] mx-auto flex flex-col justify-center py-6 px-4 sm:px-6"
    >
      {/* Top Logo */}
      <div className="gsap-form-item flex justify-start mb-6">
        <BrandLogo size="default" showText={true} theme="dark" />
      </div>

      {/* Main Title */}
      <div className="gsap-form-item mb-7">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
          Create account
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Join thousands of developers & creators today
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="gsap-form-item mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {/* Full Name */}
        <div className="gsap-form-item">
          <InputField
            id="name"
            label="Full Name"
            type="text"
            icon={User}
            placeholder="John Doe"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
            }}
            error={fieldErrors.name}
            disabled={isSubmitting}
          />
        </div>

        {/* Email */}
        <div className="gsap-form-item">
          <InputField
            id="email"
            label="Email Address"
            type="email"
            icon={Mail}
            placeholder="johndoe@gmail.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
            }}
            error={fieldErrors.email}
            disabled={isSubmitting}
          />
        </div>

        {/* Password */}
        <div className="gsap-form-item">
          <InputField
            id="password"
            label="Password"
            type="password"
            icon={Lock}
            placeholder="Create strong password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
            }}
            error={fieldErrors.password}
            disabled={isSubmitting}
          />
        </div>

        {/* Terms */}
        <div className="gsap-form-item flex flex-col gap-1 pt-0.5">
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer accent-neutral-900"
            />
            <span className="text-xs text-neutral-600">
              I agree to the <span className="text-neutral-900 font-medium underline">Terms of Service</span> and <span className="text-neutral-900 font-medium underline">Privacy Policy</span>
            </span>
          </label>
          {fieldErrors.terms && (
            <span className="text-[11px] text-red-500 font-medium">{fieldErrors.terms}</span>
          )}
        </div>

        {/* Submit */}
        <div className="gsap-form-item pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#151619] hover:bg-black text-white text-sm font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-neutral-300" />
                <span>Creating account...</span>
              </>
            ) : (
              <span>Create account</span>
            )}
          </button>
        </div>

        {/* Links */}
        <div className="gsap-form-item pt-1 text-xs sm:text-[13px] text-neutral-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-neutral-900 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </div>

        {/* Social */}
        <div className="gsap-form-item flex items-center justify-start gap-4 pt-3">
          <SocialButton provider="google" onClick={handleSocialClick} disabled={isSubmitting} />
          <SocialButton provider="github" onClick={handleSocialClick} disabled={isSubmitting} />
          <SocialButton provider="facebook" onClick={handleSocialClick} disabled={isSubmitting} />
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;
