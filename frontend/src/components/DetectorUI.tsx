"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mic, ClipboardPaste, AlertTriangle, ShieldCheck, Loader2, Volume2, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DetectorUI() {
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ is_danger: boolean; analysis: string; extracted_text?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Initialize Speech Recognition for Voice Input
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN'; // Default to Chinese

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              currentTranscript += transcript;
            }
          }
          if (currentTranscript) {
             setText(prev => prev + (prev ? " " : "") + currentTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        speechRecognitionRef.current = recognition;
      }
    }
  }, []);

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setText(clipboardText);
      }
    } catch (err) {
      setErrorMsg("无法读取剪贴板，请手动粘贴。");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      speechRecognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setText(""); // Clear previous text when starting a new recording
      speechRecognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setResult(null);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Pointing to local FastAPI backend
      const res = await fetch("http://localhost:8000/api/analyze/image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.status === "success") {
        setResult(data);
        if (data.extracted_text) {
          setText(data.extracted_text);
        }
      } else {
        setErrorMsg(data.message || "分析失败，请重试。");
      }
    } catch (err) {
      setErrorMsg("服务器连接失败，请确保后台已运行。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeText = async () => {
    if (!text.trim()) {
      setErrorMsg("请先输入或粘贴需要检测的内容！");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("http://localhost:8000/api/analyze/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      
      if (data.status === "success") {
        setResult(data);
      } else {
        setErrorMsg(data.message || "分析失败，请重试。");
      }
    } catch (err) {
      setErrorMsg("服务器连接失败，请确保后台已运行。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const speakResult = () => {
    if (!result) return;
    const utterance = new SpeechSynthesisUtterance(result.analysis);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9; // Slightly slower for elderly
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-white rounded-3xl shadow-xl border border-gray-100 mt-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">安全小助手</h1>
        <p className="text-lg sm:text-xl text-gray-600">把觉得可疑的信息发给我，我帮你把关！</p>
      </div>

      {/* Input Area */}
      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="在这里输入、粘贴信息，或者使用下方的快捷按钮..."
            className="w-full h-40 sm:h-48 p-4 sm:p-6 text-xl sm:text-2xl border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
          />
          {text && (
            <button 
              onClick={() => setText("")} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2"
            >
              清空
            </button>
          )}
        </div>

        {/* Quick Actions (Elderly Friendly Big Buttons) */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={handlePaste}
            className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 transition-colors active:scale-95"
          >
            <ClipboardPaste className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 mb-2" />
            <span className="text-lg sm:text-xl font-medium text-gray-700">一键粘贴</span>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 transition-colors active:scale-95"
          >
            <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 mb-2" />
            <span className="text-lg sm:text-xl font-medium text-gray-700">传截图</span>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
          </button>

          <button
            onClick={toggleRecording}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 ${
              isRecording 
                ? 'bg-red-50 border-red-200 animate-pulse' 
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
          >
            {isRecording ? (
              <Square className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 mb-2 fill-current" />
            ) : (
              <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500 mb-2" />
            )}
            <span className={`text-lg sm:text-xl font-medium ${isRecording ? 'text-red-700' : 'text-gray-700'}`}>
              {isRecording ? '停止录音' : '按住说话'}
            </span>
          </button>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={analyzeText}
          disabled={isAnalyzing || (!text.trim() && !isRecording)}
          className="w-full mt-6 py-5 sm:py-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-2xl text-2xl sm:text-3xl font-bold shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin mr-3" />
              正在仔细帮您查看...
            </>
          ) : (
            "帮我看看是不是骗局"
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 text-xl rounded-xl border border-red-200 text-center">
          {errorMsg}
        </div>
      )}

      {/* Result Area */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`mt-8 p-6 sm:p-8 rounded-3xl border-2 shadow-sm ${
              result.is_danger 
                ? 'bg-red-50 border-red-200' 
                : 'bg-green-50 border-green-200'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                {result.is_danger ? (
                  <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-red-600 mr-4" />
                ) : (
                  <ShieldCheck className="w-12 h-12 sm:w-16 sm:h-16 text-green-600 mr-4" />
                )}
                <h2 className={`text-3xl sm:text-4xl font-bold ${result.is_danger ? 'text-red-700' : 'text-green-700'}`}>
                  {result.is_danger ? '警告：极大可能是诈骗！' : '放心：这是安全的'}
                </h2>
              </div>
              <button 
                onClick={speakResult}
                className="p-3 bg-white rounded-full shadow hover:bg-gray-50 text-blue-600 transition-colors"
                title="读给我听"
              >
                <Volume2 className="w-8 h-8" />
              </button>
            </div>
            
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-inner border border-gray-100">
              <p className="text-xl sm:text-2xl leading-relaxed text-gray-800 whitespace-pre-wrap">
                {result.analysis}
              </p>
            </div>
            
            {result.is_danger && (
              <div className="mt-6 pt-6 border-t border-red-200/50">
                <p className="text-xl sm:text-2xl font-bold text-red-600 text-center">
                  ⚠️ 千万不要转账！千万不要点链接！
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
