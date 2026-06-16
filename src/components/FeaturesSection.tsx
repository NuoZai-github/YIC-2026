"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Shield, Brain, Mic2 } from "lucide-react";
import { motion } from "framer-motion";

export default function FeaturesSection() {
  const { lang } = useLanguage();

  const features = [
    {
      icon: <Shield className="w-8 h-8 text-white" />,
      color: "bg-green-500",
      zh: { title: "绝对隐私保护", desc: "所有数据均在您的设备或加密节点上处理，绝不泄露任何个人聊天记录和银行信息。" },
      en: { title: "Absolute Privacy", desc: "All data is processed securely. We never leak any personal chat logs or banking info." }
    },
    {
      icon: <Brain className="w-8 h-8 text-white" />,
      color: "bg-blue-600",
      zh: { title: "本地 AI 大脑", desc: "采用最新开源的大型语言模型，结合超过 10 万条真实诈骗语料训练，精准识别各种套路。" },
      en: { title: "Local AI Brain", desc: "Powered by the latest open-source LLMs, trained on over 100k real scam scenarios for precise detection." }
    },
    {
      icon: <Mic2 className="w-8 h-8 text-white" />,
      color: "bg-purple-500",
      zh: { title: "极简交互设计", desc: "大字号、语音输入、直接传截图。无需繁琐操作，结果直接语音播报，适合全球所有年龄层。" },
      en: { title: "Universal Design", desc: "Voice input and image uploads. No typing needed, with spoken results, making it accessible for everyone." }
    }
  ];

  return (
    <section className="py-20 bg-gray-50/50 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {lang === "zh" ? "为什么选择反诈护航员？" : "Why Choose Scam Guard?"}
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            {lang === "zh" ? "我们不仅是在做一个工具，而是在打造一面坚固的盾牌。" : "We're not just building a tool, we're forging a strong shield."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-md`}>
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {lang === "zh" ? feature.zh.title : feature.en.title}
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                {lang === "zh" ? feature.zh.desc : feature.en.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
