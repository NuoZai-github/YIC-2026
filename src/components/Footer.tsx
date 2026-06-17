"use client";

import { useLanguage } from "@/context/LanguageContext";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  const { lang } = useLanguage();

  return (
    <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <ShieldCheck className="w-6 h-6 text-blue-500 mr-2" />
          <span className="text-xl font-bold text-white">
            {lang === "zh" ? "JETSafe" : "JETSafe"}
          </span>
        </div>
        
        <div className="text-center md:text-right text-sm">
          <p className="mb-2">
            {lang === "zh" ? "© 2026 版权所有. 专为 YIC 打造的开源项目。" : "© 2026 All rights reserved. Open-source project built for YIC."}
          </p>
          <p className="text-gray-500">
            {lang === "zh" ? "注意：本工具仅提供参考建议，请勿将重要财产决策完全依赖于此系统。" : "Disclaimer: This tool provides suggestions only. Do not rely solely on it for major financial decisions."}
          </p>
        </div>
      </div>
    </footer>
  );
}
