"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = "zh" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("zh");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Check if user has manually selected a language before
    const savedLang = localStorage.getItem("smartshield_lang");
    if (savedLang === "zh" || savedLang === "en") {
      setLang(savedLang);
    } else {
      // 2. If no saved preference, auto-detect browser language
      const browserLang = navigator.language || (navigator as any).userLanguage;
      if (browserLang && browserLang.toLowerCase().includes("zh")) {
        setLang("zh");
      } else {
        setLang("en"); // Default to English for all non-Chinese users
      }
    }
    setMounted(true);
  }, []);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("smartshield_lang", newLang); // Remember their choice
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang }}>
      {/* Elegantly fade in to avoid text flickering during language detection */}
      <div className={`transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
