import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type DurationKey = '20m' | '1h' | '2h' | '4h';
type MaybeAuto = DurationKey | 'auto';

const LS_KEYS = {
  defaultDurationKey: 'settings.defaultDurationKey',
  showResults: 'settings.showResults',
};

const DEFAULTS = {
  defaultDurationKey: '1h' as DurationKey,
  showResults: true,
};

type SettingsContextType = {
  defaultDurationKey: DurationKey;
  setDefaultDurationKey: (k: DurationKey) => void;
  showResults: boolean;
  setShowResults: (v: boolean) => void;
  durationLabel: (k: MaybeAuto) => string;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [defaultDurationKey, setDefaultDurationKey] = useState<DurationKey>(() => {
    const raw = localStorage.getItem(LS_KEYS.defaultDurationKey);
    return (raw as DurationKey) || DEFAULTS.defaultDurationKey;
  });

  const [showResults, setShowResults] = useState<boolean>(() => {
    const raw = localStorage.getItem(LS_KEYS.showResults);
    return raw === null ? DEFAULTS.showResults : raw === 'true';
  });

  useEffect(() => {
    localStorage.setItem(LS_KEYS.defaultDurationKey, defaultDurationKey);
  }, [defaultDurationKey]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.showResults, String(showResults));
  }, [showResults]);

  const durationLabel = (k: MaybeAuto) => {
    if (k === 'auto') return `Automática (predeterminada: ${defaultDurationKey})`;
    const map: Record<DurationKey, string> = {
      '20m': '20 min',
      '1h': '1 hora',
      '2h': '2 horas',
      '4h': '4 horas',
    };
    return map[k] || String(k);
  };

  const value = useMemo(
    () => ({ defaultDurationKey, setDefaultDurationKey, showResults, setShowResults, durationLabel }),
    [defaultDurationKey, durationLabel, showResults]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
