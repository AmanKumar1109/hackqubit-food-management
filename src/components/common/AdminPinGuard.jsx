import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';

export const REQUIRED_ADMIN_PIN = '923473';

export const AdminPinGuard = ({
  children,
  title = 'Security PIN Required',
  description = 'Please enter the 6-digit authorized security PIN to access this operations section.',
  badgeText = 'Restricted Operations Console',
  onExit = null
}) => {
  const [isUnlocked, setIsUnlocked] = useState(
    () => sessionStorage.getItem('hackqubit_admin_pin_verified') === 'true'
  );
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const pinInputRefs = useRef([]);

  useEffect(() => {
    if (!isUnlocked && pinInputRefs.current[0]) {
      pinInputRefs.current[0].focus();
    }
  }, [isUnlocked]);

  // Handle PIN digit changes
  const handlePinChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newPin = [...pinDigits];
    newPin[index] = cleanVal ? cleanVal.slice(-1) : '';
    setPinDigits(newPin);
    setPinError('');

    if (cleanVal && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }

    const combined = newPin.join('');
    if (combined.length === 6) {
      verifyPin(combined);
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

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

    const firstEmptyIndex = pinDigits.findIndex((d) => d === '');
    if (firstEmptyIndex !== -1) {
      handlePinChange(firstEmptyIndex, String(val));
    }
  };

  const verifyPin = (candidatePin) => {
    if (candidatePin === REQUIRED_ADMIN_PIN) {
      sessionStorage.setItem('hackqubit_admin_pin_verified', 'true');
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('Invalid Security PIN. Access denied. (6-digit code required)');
      setPinDigits(['', '', '', '', '', '']);
      pinInputRefs.current[0]?.focus();
    }
  };

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
              <span>{badgeText}</span>
            </div>
            <h3 className="text-xl font-bold text-neutral-900">
              {title}
            </h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              {description}
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
              <span>Unlock Console</span>
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

  return <>{children}</>;
};

export default AdminPinGuard;
