"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Image as ImageIcon, Send, Loader2, AlertTriangle, CheckCircle, ShieldCheck, ThumbsUp, ThumbsDown, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- i18n Dictionaries ---
const dict = {
  zh: {
    title: "JETSafe 分析引擎",
    subtitle: "把觉得可疑的信息发给我，我帮你把关！",
    placeholder: "在这里输入、粘贴信息，或者使用下方的快捷按钮...",
    clear: "清空",
    image: "传截图",
    voice: "语音输入 (开发中)",
    analyze: "立即分析",
    analyzing: "AI 深度分析中...",
    resultTitle: "分析结果",
    resultDanger: "发现风险",
    resultSafe: "安全",
    warningFooter: "⚠️ 千万不要转账！千万不要点链接！",
    feedbackAccurate: "准确",
    feedbackInaccurate: "误判了，我要纠错",
    correctionTitle: "管理员纠错 (Data Flywheel)",
    correctionType: "正确的判断应该是：",
    isDangerOption: "这是诈骗 / 危险信息 (DANGER)",
    isSafeOption: "这是安全的 (SAFE)",
    correctionPlaceholder: "请简短告诉 AI 为什么（选填）...",
    passwordPlaceholder: "请输入管理员密码",
    submitCorrection: "提交纠错",
    cancel: "取消",
    feedbackSuccess: "感谢！已写入记忆数据库，AI 将在下次分析中学习此经验。"
  },
  en: {
    title: "JETSafe Engine",
    subtitle: "Send me suspicious messages, I'll check them for you!",
    placeholder: "Type, paste your message here, or use the quick buttons below...",
    clear: "Clear",
    image: "Image",
    voice: "Voice (WIP)",
    analyze: "Analyze",
    analyzing: "AI Analyzing...",
    resultTitle: "Analysis Result",
    resultDanger: "Danger Detected",
    resultSafe: "Safe",
    warningFooter: "⚠️ Do NOT transfer money! Do NOT click links!",
    feedbackAccurate: "Accurate",
    feedbackInaccurate: "Incorrect, I want to fix this",
    correctionTitle: "Admin Correction (Data Flywheel)",
    correctionType: "The correct judgment is:",
    isDangerOption: "This is a Scam / Danger (DANGER)",
    isSafeOption: "This is Safe (SAFE)",
    correctionPlaceholder: "Briefly tell AI why (optional)...",
    passwordPlaceholder: "Admin Password",
    submitCorrection: "Submit Correction",
    cancel: "Cancel",
    feedbackSuccess: "Thanks! Written to memory DB. AI will learn from this in the next analysis."
  }
};

export default function DetectorUI({ lang }: { lang: "zh" | "en" }) {
  const t = dict[lang];

  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ status: string; is_danger?: boolean; analysis?: string; message?: string; extracted_text?: string } | null>(null);

  // Data Flywheel States
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionType, setCorrectionType] = useState<"danger" | "safe">("danger");
  const [correctionText, setCorrectionText] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setInputText("");
      setResult(null);
      setFeedbackGiven(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSpeak = (text: string) => {
    window.speechSynthesis.cancel(); // 每次点击前先停止上次的语音，防止重叠
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "zh" ? "zh-CN" : "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const handleAnalyze = async () => {
    if (!inputText.trim() && !selectedImage) return;

    setIsAnalyzing(true);
    setResult(null);
    setFeedbackGiven(false);

    try {
      const apiUrl = "/api/proxy";
      
      let res;
      if (selectedImage) {
        const formData = new FormData();
        formData.append("file", selectedImage);
        formData.append("language", lang);

        res = await fetch(`${apiUrl}/api/analyze/image`, {
          method: "POST",
          headers: {
            "Bypass-Tunnel-Reminder": "true"
          },
          body: formData,
        });
      } else {
        res = await fetch(`${apiUrl}/api/analyze/text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Bypass-Tunnel-Reminder": "true"
          },
          body: JSON.stringify({ text: inputText, language: lang }),
        });
      }

      const data = await res.json();
      setResult(data);
      
      if (data.extracted_text) {
          setInputText(data.extracted_text);
      }
      
    } catch (error) {
      console.error("Analysis failed:", error);
      setResult({ status: "error", message: lang === "zh" ? "无法连接到服务器，请确保后台正在运行。" : "Cannot connect to server. Ensure backend is running." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submitFeedback = async () => {
    if (!adminPassword.trim()) {
      alert(lang === "zh" ? "必须输入管理员密码" : "Admin password is required");
      return;
    }
    setFeedbackLoading(true);
    try {
      const apiUrl = "/api/proxy";
      const res = await fetch(`${apiUrl}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true"
        },
        body: JSON.stringify({
          original_text: inputText,
          expected_is_danger: correctionType === "danger",
          correction_text: correctionText,
          password: adminPassword
        }),
      });
      
      if (res.ok) {
        alert(t.feedbackSuccess);
        setShowCorrectionModal(false);
        setFeedbackGiven(true);
        setCorrectionText("");
        setAdminPassword("");
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (error) {
      alert("Failed to submit feedback");
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl opacity-50"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center mb-2">
              <ShieldCheck className="mr-3 w-8 h-8 text-blue-200" />
              {t.title}
            </h2>
            <p className="text-blue-100 opacity-90">{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Main Input Area */}
      <div className="p-6 sm:p-8">
        <div className="relative">
          {imagePreviewUrl ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center p-2 h-64">
              <img src={imagePreviewUrl} alt="Preview" className="max-h-full max-w-full object-contain rounded-xl" />
              <button 
                onClick={clearImage}
                className="absolute top-4 right-4 bg-gray-900/60 hover:bg-gray-900 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm transition"
              >
                {t.clear}
              </button>
            </div>
          ) : (
            <textarea
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl p-5 pl-5 pr-5 min-h-[140px] focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg resize-none"
              placeholder={t.placeholder}
              value={inputText}
              onChange={handleTextChange}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageSelect}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition active:scale-95"
          >
            <ImageIcon className="w-5 h-5 mr-2 text-gray-500" />
            {t.image}
          </button>
          <button 
            className="flex items-center px-5 py-2.5 bg-gray-100 text-gray-400 rounded-full font-medium cursor-not-allowed"
          >
            <Mic className="w-5 h-5 mr-2 text-gray-400" />
            {t.voice}
          </button>

          <div className="flex-grow"></div>

          {(inputText.trim() || selectedImage) && (
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={`flex items-center px-8 py-3 rounded-full font-bold text-white shadow-lg transition-all active:scale-95 ${
                isAnalyzing ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:shadow-xl"
              }`}
            >
              {isAnalyzing ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t.analyzing}</>
              ) : (
                <><Send className="w-5 h-5 mr-2" /> {t.analyze}</>
              )}
            </button>
          )}
        </div>

        {/* Results Area */}
        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 32 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-100 pt-8">
                {result.status === "error" ? (
                  <div className="bg-red-50 text-red-600 p-5 rounded-2xl flex items-start border border-red-100">
                    <AlertTriangle className="w-6 h-6 mr-3 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-lg mb-1">Error</h4>
                      <p>{result.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className={`p-6 sm:p-8 rounded-3xl border-2 shadow-sm ${
                    result.is_danger 
                      ? "bg-red-50 border-red-200 text-red-900" 
                      : "bg-green-50 border-green-200 text-green-900"
                  }`}>
                    <div className="flex items-center mb-4">
                      {result.is_danger ? (
                        <AlertTriangle className="w-8 h-8 text-red-500 mr-3 shrink-0" />
                      ) : (
                        <CheckCircle className="w-8 h-8 text-green-500 mr-3 shrink-0" />
                      )}
                      <h3 className="text-2xl font-black">
                        {result.is_danger ? t.resultDanger : t.resultSafe}
                      </h3>
                      <div className="flex-grow"></div>
                      <button 
                        onClick={() => handleSpeak(result.analysis || "")}
                        className={`flex items-center px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                          result.is_danger ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        <Volume2 className="w-4 h-4 mr-1.5" />
                        {lang === "zh" ? "语音播报" : "Listen"}
                      </button>
                    </div>
                    
                    <div className="prose prose-lg max-w-none">
                      <p className="whitespace-pre-wrap leading-relaxed text-lg font-medium opacity-90">
                        {result.analysis}
                      </p>
                    </div>

                    {result.is_danger && (
                      <div className="mt-6 pt-4 border-t border-red-200/50">
                        <p className="font-bold text-red-600 animate-pulse">
                          {t.warningFooter}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Data Flywheel Feedback Buttons */}
                {result.status === "success" && !feedbackGiven && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-center items-center gap-4 mt-6"
                  >
                    <button 
                      onClick={() => setFeedbackGiven(true)}
                      className="flex items-center px-5 py-2 text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 rounded-full font-medium transition"
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" /> {t.feedbackAccurate}
                    </button>
                    <button 
                      onClick={() => setShowCorrectionModal(true)}
                      className="flex items-center px-5 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-full font-medium transition"
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" /> {t.feedbackInaccurate}
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Correction Modal (Admin only) */}
      <AnimatePresence>
        {showCorrectionModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t.correctionTitle}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.correctionType}</label>
                  <select 
                    value={correctionType}
                    onChange={(e) => setCorrectionType(e.target.value as "danger" | "safe")}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="danger">{t.isDangerOption}</option>
                    <option value="safe">{t.isSafeOption}</option>
                  </select>
                </div>

                <div>
                  <textarea 
                    value={correctionText}
                    onChange={(e) => setCorrectionText(e.target.value)}
                    placeholder={t.correctionPlaceholder}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <input 
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowCorrectionModal(false)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={submitFeedback}
                    disabled={feedbackLoading}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex justify-center items-center"
                  >
                    {feedbackLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.submitCorrection}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
