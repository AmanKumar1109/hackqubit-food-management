import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const InputField = ({
  id,
  label,
  type = 'text',
  icon: Icon,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  autoComplete,
  className = '',
  disabled = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs sm:text-[13px] font-semibold text-neutral-800 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-neutral-400">
            <Icon size={18} strokeWidth={1.8} />
          </div>
        )}

        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`w-full bg-white text-neutral-900 text-sm placeholder:text-neutral-400 rounded-xl py-2.5 sm:py-3 transition-all duration-200 outline-none
            ${Icon ? 'pl-10' : 'pl-4'}
            ${isPassword ? 'pr-11' : 'pr-4'}
            ${
              error
                ? 'border border-red-500 focus:ring-2 focus:ring-red-200'
                : 'border border-neutral-200/90 hover:border-neutral-300 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5'
            }
            ${disabled ? 'opacity-60 cursor-not-allowed bg-neutral-50' : 'shadow-xs'}
          `}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            className="absolute right-3.5 text-neutral-400 hover:text-neutral-700 transition-colors p-1 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {error && (
        <span className="text-[11px] text-red-500 font-medium mt-0.5 ml-1 animate-fadeIn">
          {error}
        </span>
      )}
    </div>
  );
};

export default InputField;
