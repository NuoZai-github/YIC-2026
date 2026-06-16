"use client";

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import DetectorUI from "@/components/DetectorUI";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";

export default function Home() {
  const { lang } = useLanguage();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        <HeroSection />
        <FeaturesSection />
        <HowItWorks />
        
        {/* Detector Section */}
        <section id="detector-section" className="py-24 bg-gradient-to-b from-white to-blue-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {lang === "zh" ? "立即体验智能防诈" : "Experience Smart Scam Detection"}
              </h2>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                {lang === "zh" ? "无需注册，无需下载，直接在下方输入框测试。" : "No registration, no download. Test it right below."}
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <DetectorUI lang={lang} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
