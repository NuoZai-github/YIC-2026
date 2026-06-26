"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Shield, Brain, Users } from "lucide-react";
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
      zh: { title: "动态知识库", desc: "我们的反诈模型随着新骗局的出现不断进化，始终走在诈骗分子的前面。" },
      en: { title: "Dynamic Knowledge Base", desc: "Our anti-scam model continually evolves with new scams, always staying one step ahead." }
    },
    {
      icon: <Users className="w-8 h-8 text-white" />,
      color: "bg-purple-500",
      zh: { title: "社区纠错机制", desc: "通过用户反馈和管理员人工纠错的数据飞轮效应，让检测系统越用越准。" },
      en: { title: "Community Feedback", desc: "A data flywheel powered by user feedback and admin corrections makes our detection increasingly accurate over time." }
    }
  ];

  return (
    <section className="py-20 bg-gray-50/50 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {lang === "zh" ? "为什么选择 JETSafe？" : "Why Choose JETSafe?"}
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
