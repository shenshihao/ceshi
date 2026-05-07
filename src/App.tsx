/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PenTool, 
  Image as ImageIcon, 
  Download, 
  Sparkles, 
  RefreshCcw, 
  Info,
  Maximize,
  CheckCircle2,
  AlertCircle,
  Menu,
  X
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Types for AI Studio API Key Selection
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type AspectRatio = '1:1' | '3:4' | '4:3' | '16:9' | '9:16';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [error, setError] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Sharpening pencils...');

  const loadingMessages = [
    'Sharpening pencils...',
    'Sketching outlines...',
    'Adding charcoal details...',
    'Stippling highlights...',
    'Reviewing the composition...',
    'Finalizing the ink work...',
    'Erasing stray marks...',
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = loadingMessages.indexOf(prev);
          return loadingMessages[(currentIndex + 1) % loadingMessages.length];
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const checkApiKey = async () => {
    if (typeof window.aistudio !== 'undefined') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setShowKeyModal(true);
        return false;
      }
    }
    return true;
  };

  const handleSelectKey = async () => {
    if (typeof window.aistudio !== 'undefined') {
      await window.aistudio.openSelectKey();
      setShowKeyModal(false);
      // Proceed logic after key selection (race condition note: assume success)
    }
  };

  const generateSketch = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setResultImage(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setShowKeyModal(true);
        setIsGenerating(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Enhance prompt for "hand-drawn sketch" style
      const enhancedPrompt = `A high-quality, professional hand-drawn ink sketch of ${prompt}. Clean minimalist pencil drawing on textured white paper, charcoal highlights, artistic line work, elegant composition, monochrome sketch style.`;

      // Try with Nanabanana 2 (Gemini 3.1 Flash Image)
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [{ text: enhancedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: "1K"
          },
        },
      });

      let imageUrl: string | null = null;
      
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            imageUrl = `data:image/png;base64,${base64Data}`;
            break;
          }
        }
      }

      if (imageUrl) {
        setResultImage(imageUrl);
      } else {
        throw new Error("No image was generated. Please try a different prompt.");
      }
    } catch (err: any) {
      console.error("Generation Error:", err);
      
      // Check if it's a "Forbidden" or "Not Found" error which usually implies key selection is needed for this model
      if (err.message?.includes("403") || err.message?.includes("404") || err.message?.includes("API key")) {
        setError("This specific model (Nanabanana 2) requires a personal API key selection. Please use the 'API Setup' button.");
        setShowKeyModal(true);
      } else {
        setError(err.message || "An unexpected error occurred during generation.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `sketch-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#2D2D2D] font-sans selection:bg-[#FFE135]/30">
      {/* Header */}
      <header className="border-b border-[#2D2D2D]/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#FDFCF8]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#FFE135] rounded-xl shadow-inner">
            <PenTool className="w-6 h-6 text-[#2D2D2D]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">手绘香蕉 (SketchBananas)</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.aistudio?.openSelectKey()}
            className="text-xs font-medium uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
          >
            API 设置
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[1fr_auto] gap-12 items-start">
          
          {/* Input Section */}
          <section className="space-y-8">
            <div className="space-y-4">
              <label htmlFor="prompt" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#2D2D2D]/60">
                <Sparkles className="w-4 h-4" />
                你想画什么？
              </label>
              <div className="relative group">
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="例如：海边岩石上的神秘灯塔，精致的钢笔素描..."
                  className="w-full h-32 p-5 bg-white border-2 border-[#2D2D2D]/5 rounded-2xl shadow-sm focus:border-[#FFE135] focus:ring-4 focus:ring-[#FFE135]/20 outline-none transition-all resize-none text-lg"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <span className="text-[10px] font-mono text-[#2D2D2D]/30 uppercase px-2 py-1 bg-gray-50 rounded select-none">
                    Nanabanana 3.1
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#2D2D2D]/60">
                <Maximize className="w-4 h-4" />
                画布比例
              </span>
              <div className="flex flex-wrap gap-3">
                {(['1:1', '3:4', '4:3', '16:9', '9:16'] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      aspectRatio === ratio 
                        ? 'bg-[#2D2D2D] text-white border-[#2D2D2D] shadow-lg' 
                        : 'bg-white border-[#2D2D2D]/5 hover:border-[#2D2D2D]/20'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateSketch}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-5 bg-[#FFE135] hover:bg-[#FADC1E] disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-lg shadow-[0_8px_0_rgb(220,195,45)] active:translate-y-1 active:shadow-[0_4px_0_rgb(220,195,45)] transition-all flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <RefreshCcw className="w-6 h-6 animate-spin" />
              ) : (
                <Sparkles className="w-6 h-6" />
              )}
              {isGenerating ? '正在绘图...' : '开始绘图'}
            </button>
          </section>

          {/* Result Section */}
          <section className="sticky top-28 lg:w-[400px]">
            <div className="bg-white p-3 border-2 border-[#2D2D2D]/5 rounded-3xl shadow-xl space-y-4 overflow-hidden relative">
              <div className={`relative bg-gray-50 rounded-2xl overflow-hidden aspect-${aspectRatio.replace(':', '/')}`}>
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center"
                    >
                      <div className="w-12 h-12 relative">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="absolute inset-0 border-4 border-[#FFE135] border-t-transparent rounded-full"
                        />
                        <PenTool className="absolute inset-0 m-auto w-5 h-5 text-[#2D2D2D]" />
                      </div>
                      <div className="space-y-2">
                        <p className="font-bold text-[#2D2D2D]">{loadingMessage}</p>
                        <p className="text-xs text-[#2D2D2D]/40 leading-relaxed">
                          Nanabanana 2 正在处理您的艺术构想。
                        </p>
                      </div>
                    </motion.div>
                  ) : resultImage ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative h-full"
                    >
                      <img 
                        src={resultImage} 
                        alt="生成的草图" 
                        className="w-full h-full object-contain bg-[#FDFCF8]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 right-4 pointer-events-none">
                        <div className="p-2 bg-white/80 backdrop-blur rounded-lg shadow-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-[#2D2D2D]/20 p-8 text-center"
                    >
                      <ImageIcon className="w-16 h-16" />
                      <p className="text-sm font-medium">您的杰作将呈现在这里</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {resultImage && !isGenerating && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <button
                    onClick={downloadImage}
                    className="flex-1 py-3 bg-[#2D2D2D] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-black transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    下载图片
                  </button>
                  <button
                    onClick={generateSketch}
                    className="p-3 border-2 border-[#2D2D2D]/10 rounded-xl hover:bg-gray-50 transition-colors"
                    title="重新生成"
                  >
                    <RefreshCcw className="w-5 h-5" />
                  </button>
                </motion.div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-start gap-3 p-4 bg-[#FFE135]/10 rounded-2xl border border-[#FFE135]/20">
              <Info className="w-5 h-5 text-[#2D2D2D]/40 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-[#2D2D2D]/60 italic">
                提示：使用“细腻”、“极简”或“粗犷线条”等词语可以获得更好的艺术效果。
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Key Selection Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[32px] p-10 shadow-2xl space-y-8"
            >
              <div className="space-y-4 text-center">
                <div className="w-20 h-20 bg-[#FFE135] rounded-3xl flex items-center justify-center mx-auto shadow-lg rotate-3">
                  <PenTool className="w-10 h-10 text-[#2D2D2D]" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight">API 身份选择</h2>
                <div className="space-y-4 text-left bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600"><span className="font-bold">有免费额度：</span> Nanabanana 2 依然提供慷慨的每日免费使用配额。</p>
                  </div>
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600"><span className="font-bold">启用步骤：</span> 为了防止滥用，Google 要求使用开启了结算功能的项目来启用此高级模型，即便您只使用其中的免费配额。</p>
                  </div>
                </div>
                <p className="text-gray-500 leading-relaxed text-sm">
                  请点击下方按钮选择您的 Google AI Studio API Key。
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleSelectKey}
                  className="w-full py-4 bg-[#2D2D2D] hover:bg-black text-white font-bold rounded-2xl shadow-xl transition-all"
                >
                  选择 API Key
                </button>
                <div className="pt-4 border-t border-gray-100">
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-[#2D2D2D]/60 hover:text-[#2D2D2D] underline underline-offset-4 block text-center"
                  >
                    为什么需要开启结算功能的项目？
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-20 border-t border-[#2D2D2D]/5 py-8 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-[#2D2D2D]/30">
        &copy; 2026 SketchBananas Studio • Powered by Gemini Nano Banana 2
      </footer>
    </div>
  );
}
