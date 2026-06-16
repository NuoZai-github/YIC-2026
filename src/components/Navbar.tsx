"use client";

import { useLanguage } from "@/context/LanguageContext";
import { ShieldCheck } from "lucide-react";

export default function Navbar() {
  const { lang, setLang } = useLanguage();

  return (
    <nav className="fixed w-full z-50 top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-xl sm:text-2xl text-gray-900 tracking-tight">
              {lang === "zh" ? "智盾" : "Smart Shield"}
            </span>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-100/80 p-1 rounded-full">
            <button 
              onClick={() => setLang("zh")}
              className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${lang === "zh" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              中文
            </button>
            <button 
              onClick={() => setLang("en")}
              className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${lang === "en" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
