"use client";

import { useLanguage } from "@/context/LanguageContext";
import { MessageSquareText, SearchCode, BellRing } from "lucide-react";
import { motion } from "framer-motion";

export default function HowItWorks() {
  const { lang } = useLanguage();

  const steps = [
    {
      icon: <MessageSquareText className="w-10 h-10 text-blue-600" />,
      zh: { title: "1. 接收可疑信息", desc: "无论是收到的短信、微信截图，还是电话录音，直接丢给小助手。" },
      en: { title: "1. Receive Message", desc: "Whether it's an SMS, chat screenshot, or call recording, give it to the assistant." }
    },
    {
      icon: <SearchCode className="w-10 h-10 text-indigo-600" />,
      zh: { title: "2. AI 极速分析", desc: "系统会瞬间提取图文信息，并利用最新的反诈模型进行深度语义推理。" },
      en: { title: "2. AI Instant Analysis", desc: "The system extracts info and uses advanced anti-scam models for deep semantic reasoning." }
    },
    {
      icon: <BellRing className="w-10 h-10 text-red-500" />,
      zh: { title: "3. 温和的警示", desc: "用最通俗易懂的话，直接告诉您这是安全的问候，还是危险的骗局。" },
      en: { title: "3. Clear Warning", desc: "Using clear language to tell you if it's a safe greeting or a dangerous scam." }
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {lang === "zh" ? "只需简单的三步" : "Just Three Simple Steps"}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-blue-100 via-indigo-100 to-red-100 -translate-y-12 z-0"></div>

          {steps.map((step, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 bg-white rounded-full border-4 border-gray-50 flex items-center justify-center shadow-xl mb-6">
                {step.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {lang === "zh" ? step.zh.title : step.en.title}
              </h3>
              <p className="text-gray-500 text-lg max-w-xs">
                {lang === "zh" ? step.zh.desc : step.en.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
