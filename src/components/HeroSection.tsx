"use client";

import { useLanguage } from "@/context/LanguageContext";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

export default function HeroSection() {
  const { lang } = useLanguage();

  const dict = {
    zh: {
      headline: "守护您的数字防线",
      subheadline: "免费、本地驱动的 AI 防诈骗助手。只需一键粘贴或长按说话，立刻为您识别全球范围内的各种诈骗套路。",
      cta: "立即开始检测",
      badge: "100% 免费 · 绝对隐私保护"
    },
    en: {
      headline: "Your Digital Defense Line",
      subheadline: "A free, local AI-driven scam detector. Simply paste or use voice to instantly identify scams worldwide.",
      cta: "Start Detecting Now",
      badge: "100% Free · Absolute Privacy"
    }
  };

  const t = dict[lang];

  const scrollToDetector = () => {
    document.getElementById("detector-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="pt-32 pb-20 sm:pt-40 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-semibold text-sm mb-8"
      >
        <span className="flex w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
        {t.badge}
      </motion.div>

      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-5xl sm:text-7xl font-black text-gray-900 tracking-tight leading-tight mb-6"
      >
        {lang === "zh" ? (
          <>守护您的<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">数字防线</span></>
        ) : (
          <>Your Digital <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Defense Line</span></>
        )}
      </motion.h1>

      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-xl sm:text-2xl text-gray-600 max-w-3xl mb-10 leading-relaxed"
      >
        {t.subheadline}
      </motion.p>

      <motion.button 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        onClick={scrollToDetector}
        className="group relative inline-flex items-center justify-center px-8 py-4 text-lg sm:text-xl font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-xl hover:shadow-2xl transition-all active:scale-95"
      >
        {t.cta}
        <ArrowDown className="ml-2 w-5 h-5 group-hover:translate-y-1 transition-transform" />
      </motion.button>
    </section>
  );
}
