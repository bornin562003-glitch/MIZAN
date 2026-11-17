import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Delete, Lock, X } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';

const KEYPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const PinOverlay: React.FC = () => {
  const pendingProfileId = useMizanStore((s) => s.pendingProfileId);
  const profiles = useMizanStore((s) => s.profiles);
  const verifyPinAndUnlock = useMizanStore((s) => s.verifyPinAndUnlock);
  const cancelPinChallenge = useMizanStore((s) => s.cancelPinChallenge);

  const [digits, setDigits] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  const targetProfile = profiles.find((p) => p.id === pendingProfileId) ?? null;

  useEffect(() => {
    setDigits('');
    setErrorMsg(null);
    setIsVerifying(false);
  }, [pendingProfileId]);

  const submitPin = useCallback(
    async (pinValue: string) => {
      if (isVerifying) return;
      setIsVerifying(true);
      const ok = await verifyPinAndUnlock(pinValue);
      if (!ok) {
        setErrorMsg('Incorrect PIN. Please try again.');
        setShakeCount((c) => c + 1);
        setDigits('');
        setIsVerifying(false);
      }
    },
    [isVerifying, verifyPinAndUnlock],
  );

  const handleDigit = useCallback(
    (d: string) => {
      if (isVerifying || digits.length >= 4) return;
      setErrorMsg(null);
      const next = digits + d;
      setDigits(next);
      if (next.length === 4) {
        void submitPin(next);
      }
    },
    [digits, isVerifying, submitPin],
  );

  const handleBackspace = useCallback(() => {
    if (isVerifying) return;
    setErrorMsg(null);
    setDigits((prev) => prev.slice(0, -1));
  }, [isVerifying]);

  useEffect(() => {
    if (!pendingProfileId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        cancelPinChallenge();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingProfileId, handleDigit, handleBackspace, cancelPinChallenge]);

  return (
    <AnimatePresence>
      {pendingProfileId && targetProfile && (
        <motion.div
          key="pin-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pin-dialog-title"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-xl px-6 py-8 text-slate-100"
        >
          <div className="w-full max-w-xs flex flex-col items-center">
            <div className="w-full flex justify-end mb-2">
              <button
                type="button"
                onClick={cancelPinChallenge}
                aria-label="Cancel profile unlock"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-300 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-display font-semibold text-lg shadow-lg mb-4"
              style={{ backgroundColor: targetProfile.accentColor }}
            >
              {targetProfile.initials}
            </div>

            <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-teal-400" />
              <span>Protected Profile</span>
            </div>

            <h2 id="pin-dialog-title" className="mt-1 text-xl font-semibold text-white text-center">
              Unlock {targetProfile.name}
            </h2>
            <p className="mt-1 text-xs text-slate-400 text-center">
              Enter 4-digit PIN to decrypt local ledger
              {targetProfile.id === 'family' ? ' · Default PIN: 1234' : ''}
            </p>

            {/* PIN Indicator Dots */}
            <motion.div
              key={shakeCount}
              animate={shakeCount > 0 ? { x: [0, -10, 10, -8, 8, 0] } : {}}
              transition={{ duration: 0.35 }}
              className="mt-7 flex items-center gap-4"
              aria-label={`Entered ${digits.length} of 4 digits`}
            >
              {[0, 1, 2, 3].map((idx) => {
                const filled = idx < digits.length;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                      filled
                        ? 'bg-teal-400 border-teal-400 scale-110'
                        : errorMsg
                          ? 'border-rose-400/80 bg-transparent'
                          : 'border-slate-500 bg-transparent'
                    }`}
                  />
                );
              })}
            </motion.div>

            <div className="h-6 mt-3 flex items-center justify-center">
              {errorMsg && (
                <p role="alert" className="text-xs font-medium text-rose-400">
                  {errorMsg}
                </p>
              )}
            </div>

            {/* 4-Digit Numeric Keypad */}
            <div className="mt-4 grid grid-cols-3 gap-4 w-full max-w-[264px]">
              {KEYPAD_DIGITS.map((d) => (
                <motion.button
                  key={d}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleDigit(d)}
                  aria-label={`Digit ${d}`}
                  className="h-16 w-full rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10 text-xl font-mono-num font-medium text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  {d}
                </motion.button>
              ))}

              <div className="h-16" aria-hidden="true" />

              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => handleDigit('0')}
                aria-label="Digit 0"
                className="h-16 w-full rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10 text-xl font-mono-num font-medium text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                0
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={handleBackspace}
                aria-label="Backspace"
                className="h-16 w-full rounded-2xl bg-transparent hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                <Delete className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
