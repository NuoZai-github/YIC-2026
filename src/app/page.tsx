"use client";

import { useState } from 'react';
import DetectorUI from '@/components/DetectorUI';

export default function Home() {
  const [lang, setLang] = useState<"zh" | "en">("zh");

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-6 sm:py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center space-x-2 bg-white p-1 rounded-full shadow-md border border-gray-100 z-50">
        <button 
          onClick={() => setLang("zh")}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${lang === "zh" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:bg-gray-100"}`}
        >
          中文
        </button>
        <button 
          onClick={() => setLang("en")}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${lang === "en" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:bg-gray-100"}`}
        >
          EN
        </button>
      </div>

      <div className="max-w-4xl mx-auto mt-10 sm:mt-0">
        <header className="flex flex-col items-center justify-center text-center mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
            {lang === "zh" ? "反诈护航员" : "Scam Guard"}
          </h1>
          <p className="mt-3 sm:mt-4 text-lg sm:text-2xl text-gray-600 font-medium">
            {lang === "zh" ? "永远保护您的财产安全" : "Protecting your assets forever"}
          </p>
        </header>

        <DetectorUI lang={lang} />
        
        <footer className="mt-12 sm:mt-16 text-center text-gray-500">
          <p className="text-base sm:text-lg">
            {lang === "zh" ? "✅ 本地运行，完全免费，绝不泄露您的任何隐私。" : "✅ Running locally, 100% free, your privacy is fully protected."}
          </p>
        </footer>
      </div>
    </main>
  );
}
