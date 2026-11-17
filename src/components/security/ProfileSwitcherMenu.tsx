import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Lock, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { useMizanStore } from '../../store/useMizanStore';

interface ProfileSwitcherMenuProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileSwitcherMenu: React.FC<ProfileSwitcherMenuProps> = ({ open, onClose }) => {
  const profiles = useMizanStore((s) => s.profiles);
  const activeProfileId = useMizanStore((s) => s.activeProfileId);
  const switchProfileRequest = useMizanStore((s) => s.switchProfileRequest);
  const createProfile = useMizanStore((s) => s.createProfile);
  const deleteProfile = useMizanStore((s) => s.deleteProfile);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [pin, setPin] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSelectProfile = (id: string) => {
    onClose();
    switchProfileRequest(id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Profile name is required.');
      return;
    }
    if (pin && !/^\d{4}$/.test(pin)) {
      setFormError('PIN must be exactly 4 digits or left blank.');
      return;
    }
    await createProfile({ name: name.trim(), currency, pin: pin || undefined });
    setName('');
    setPin('');
    setCreating(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-switcher-title"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative z-10 w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl"
          >
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between">
              <div>
                <h2 id="profile-switcher-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Switch Profile
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Each ledger is strictly isolated on this device
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile switcher"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {profiles.map((profile) => {
                const isActive = profile.id === activeProfileId;
                const isConfirming = confirmDeleteId === profile.id;

                return (
                  <div
                    key={profile.id}
                    className={`w-full min-h-[56px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors ${
                      isActive
                        ? 'border-teal-600/50 bg-teal-50/70 dark:bg-teal-950/30 dark:border-teal-500/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectProfile(profile.id)}
                      className="flex-1 flex items-center gap-3 min-w-0 text-left py-0.5"
                    >
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-semibold shrink-0"
                        style={{ backgroundColor: profile.accentColor }}
                      >
                        {profile.initials}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {profile.name}
                          </span>
                          {profile.pinHash && (
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-label="PIN protected" />
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {profile.currency} · {profile.pinHash ? 'PIN Locked' : 'Unlocked'}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isActive && !isConfirming && (
                        <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mr-1" />
                      )}

                      {profiles.length > 1 && !isConfirming && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(profile.id)}
                          aria-label={`Delete profile ${profile.name}`}
                          title={`Delete ${profile.name}`}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {isConfirming && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              deleteProfile(profile.id);
                              setConfirmDeleteId(null);
                            }}
                            className="min-h-[34px] px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="min-h-[34px] px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!creating ? (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="mt-4 w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Isolated Profile</span>
              </button>
            ) : (
              <form onSubmit={(e) => void handleCreate(e)} className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>New Local Profile</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label htmlFor="new-profile-name" className="sr-only">Profile name</label>
                    <input
                      id="new-profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Profile name (e.g. Travel)"
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-profile-currency" className="sr-only">Currency</label>
                    <select
                      id="new-profile-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="PKR">PKR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="new-profile-pin" className="sr-only">Optional 4-digit PIN</label>
                  <input
                    id="new-profile-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Optional 4-digit PIN"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {formError && <p className="text-xs text-rose-500">{formError}</p>}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setFormError(null);
                    }}
                    className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 min-h-[44px] rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
                  >
                    Create Profile
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
