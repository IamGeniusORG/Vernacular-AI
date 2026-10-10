/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, CheckCircle, Share2, Loader2, Sparkles,
  ImagePlus, AudioLines, UploadCloud, AlertCircle, X, Plus, LogOut, User, Copy, Download
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import { useLanguage } from "@/context/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import { QRCodeCanvas } from "qrcode.react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// ─── Types ──────────────────────────────────────────────────────────────────

interface GeneratedProduct {
  product_id: string;
  image_url: string;
  ai_title_en: string;
  ai_title_local: string;
  ai_desc_en: string;
  ai_desc_local: string;
  price_inr: number | null;
  suggested_price_range: string | null;
  tags: string[];
  whatsapp_link: string;
}

import { useArtisan } from "@/context/ArtisanContext";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const { t } = useLanguage();
  const { artisanId, profileName, profilePhone, userRole, saveProfile, logout, isLoading: authLoading } = useArtisan();
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && artisanId && userRole === "customer") {
      router.push("/");
    }
  }, [authLoading, artisanId, userRole, router]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Local state for the input field in the modal
  const [localName, setLocalName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync modal input when opened
  useEffect(() => {
    if (isProfileOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalName(profileName);
    }
  }, [isProfileOpen, profileName]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    const success = await saveProfile(localName);
    setIsSavingProfile(false);
    if (success) {
      showToast("Profile updated");
    }
  };

  const handleSignOut = async () => {
    await logout();
  };
  // Images — multiple
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Audio
  const [audioMode, setAudioMode] = useState<"record" | "upload">("record");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generation
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedProduct[] | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Image Handlers ─────────────────────────────────────────────────────────

  const handleImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const newImages = [...images, ...selected].slice(0, 8); // max 8 images
    setImages(newImages);
    setImagePreviews(newImages.map((f) => URL.createObjectURL(f)));
    setErrorMsg(null);
    // Reset input so same file can be added again if needed
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    setImages(next);
    setImagePreviews(next.map((f) => URL.createObjectURL(f)));
  };

  // ── Audio Handlers ─────────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        setAudioBlob(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };
      recorder.start();
      setIsRecording(true);
      setAudioBlob(null);
      setRecordingTime(0);
      setErrorMsg(null);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      alert("Microphone access denied. Please allow microphone permissions in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { setAudioBlob(e.target.files[0]); setErrorMsg(null); }
  };

  // ── Generate ───────────────────────────────────────────────────────────────

  const generate = async () => {
    if (!images.length || !audioBlob) return;
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingMsg(`Uploading ${images.length} image${images.length > 1 ? "s" : ""} & running AI...`);

    const formData = new FormData();
    if (!artisanId) {
      router.push("/login");
      return;
    }
    formData.append("artisan_id", artisanId);
    images.forEach((img) => formData.append("images", img));
    formData.append("audio", audioBlob, (audioBlob as File).name || "recording.webm");

    try {
      const res = await fetch("/api/v1/products/generate", { method: "POST", body: formData });
      const data = await res.json();
      if (data.status === "success") {
        setResults(data.products);
      } else {
        setErrorMsg(data.detail || "Generation failed on the server.");
      }
    } catch (err) {
      console.error("API error:", err);
      setErrorMsg("Failed to connect to the backend. Is it running?");
    } finally {
      setIsLoading(false);
      setLoadingMsg("");
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────

  const handleShare = async (product: GeneratedProduct, imageFile?: File) => {
    setSharingId(product.product_id);
    const storeUrl = `${window.location.origin}/shop/${artisanId}`;
    const text = [
      `🛍️ *${product.ai_title_local}*`,
      `*Price:* ₹${product.price_inr ?? "N/A"}`,
      "",
      "View my full collection here:",
      storeUrl
    ].join("\n");

    // Try native Web Share API (mobile)
    if (navigator.canShare && imageFile) {
      try {
        if (navigator.canShare({ files: [imageFile], text })) {
          await navigator.share({ files: [imageFile], text, title: product.ai_title_en });
          setSharingId(null);
          showToast("Shared successfully!");
          return;
        }
      } catch {
        // User cancelled or not supported — fall through to WhatsApp
      }
    }

    // Fallback: WhatsApp deep link
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setSharingId(null);
    showToast("Opening WhatsApp...");
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const reset = () => {
    setImages([]); setImagePreviews([]); setAudioBlob(null);
    setResults(null); setErrorMsg(null); setRecordingTime(0);
  };

  const canGenerate = images.length > 0 && !!audioBlob && !isLoading;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // Wait for auth to load or if the user is a customer (they will be redirected by the useEffect)
  if (authLoading || (artisanId && userRole === "customer")) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-6 font-sans">
      <main className="w-full min-h-screen md:min-h-0 md:h-[880px] md:max-w-[410px] bg-white md:rounded-[2.5rem] md:shadow-2xl flex flex-col relative overflow-hidden border-0 md:border-[8px] md:border-slate-800">

        {/* ── Header ── */}
        <header className="px-5 pt-8 pb-4 flex items-center justify-between border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex-1 min-w-0 mr-3">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight truncate">
              {t('header_title')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {artisanId ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsProfileOpen(true)}
                  className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-neutral-800 font-bold font-serif hover:bg-stone-300 transition"
                  title={t('profile_settings')}
                >
                  {profileName ? profileName.charAt(0).toUpperCase() : <User size={16} />}
                </button>
              </div>
            ) : (
              <button onClick={() => router.push('/login')} className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition">
                {t('sign_in')}
              </button>
            )}
          </div>
        </header>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-36">
          {!results ? (

            /* ════════════════════ UPLOAD VIEW ════════════════════ */
            <div className="space-y-7">

              {/* Step 1 — Multi Image */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <h2 className="text-base font-bold text-slate-800">{t('product_photos')}</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{images.length}/8</span>
                </div>

                {/* Thumbnail gallery + add button */}
                {imagePreviews.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                        <img src={src} alt={`img-${i}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {images.length < 8 && (
                      <label htmlFor="camera-input" className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer transition">
                        <Plus size={22} />
                        <span className="text-[10px] mt-1 font-medium">Add</span>
                      </label>
                    )}
                  </div>
                ) : (
                  <label
                    htmlFor="camera-input"
                    className="block w-full p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
                  >
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-emerald-600">
                        <ImagePlus size={30} strokeWidth={1.5} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm">{t('upload_photos')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t('up_to_8')}</p>
                      </div>
                    </div>
                  </label>
                )}
                <input
                  id="camera-input"
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  multiple
                  onChange={handleImagesSelected}
                  className="hidden"
                />
              </section>

              {/* Step 2 — Voice */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">2</div>
                  <h2 className="text-base font-bold text-slate-800">{t('voice_desc')}</h2>
                </div>

                {/* Tab toggle */}
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mb-3">
                  {(["record", "upload"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAudioMode(mode)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors capitalize ${audioMode === mode ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {mode === "record" ? t('record_live') : t('upload_file')}
                    </button>
                  ))}
                </div>

                <div className={`rounded-2xl p-5 border-2 transition-all ${isRecording ? "border-red-400 bg-red-50" : audioBlob ? "border-emerald-400 bg-emerald-50" : "border-slate-100 bg-white shadow-sm"}`}>
                  {audioMode === "record" ? (
                    <div className="flex flex-col items-center gap-3">
                      <button
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onMouseLeave={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        className={`w-18 h-18 w-20 h-20 rounded-full flex items-center justify-center text-white transition-all select-none shadow-xl ${isRecording ? "bg-red-500 scale-95 shadow-red-400/50" : audioBlob ? "bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-700"}`}
                      >
                        {isRecording ? <AudioLines size={34} className="animate-pulse" /> : <Mic size={34} />}
                      </button>
                      <p className={`text-sm font-semibold ${isRecording ? "text-red-600 animate-pulse" : audioBlob ? "text-emerald-700" : "text-slate-500"}`}>
                        {isRecording ? `Recording… ${recordingTime}s` : audioBlob ? `✓ ${t('audio_selected')}` : t('mic_prompt')}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <input type="file" accept="audio/mp3,audio/wav,audio/m4a,audio/webm,audio/ogg" onChange={handleAudioUpload} className="hidden" id="audio-upload" />
                      <label htmlFor="audio-upload" className="block cursor-pointer">
                        {audioBlob ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><CheckCircle size={26} /></div>
                            <p className="text-emerald-700 font-bold text-sm">{t('audio_selected')}</p>
                            <p className="text-xs text-slate-400 truncate max-w-xs">{(audioBlob as File).name}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-indigo-600"><UploadCloud size={26} /></div>
                            <p className="font-bold text-slate-700 text-sm">{t('browse_audio')}</p>
                            <p className="text-xs text-slate-400">MP3 · WAV · M4A · WebM</p>
                          </div>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              </section>
            </div>

          ) : (

            /* ════════════════════ RESULTS VIEW ════════════════════ */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {results.length} Listing{results.length > 1 ? "s" : ""} Generated
                </h2>
                <button onClick={reset} className="text-xs text-slate-500 hover:text-red-500 font-semibold transition">{t('reset')}</button>
              </div>

              {results.map((product, i) => (
                <div key={product.product_id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Product image */}
                  <div className="relative aspect-video bg-slate-100">
                    <img
                      src={product.image_url || imagePreviews[i]}
                      alt={product.ai_title_en}
                      className="w-full h-full object-cover"
                    />
                    {product.price_inr && (
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full font-bold text-sm">
                        ₹{product.price_inr}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{product.ai_title_local}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{product.ai_title_en}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {product.tags.map((tag, j) => (
                        <span key={j} className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {product.ai_desc_local}
                    </p>

                    {product.suggested_price_range && (
                      <div className="bg-amber-50 border border-amber-100 text-amber-800 p-3 rounded-xl flex items-start gap-2 text-xs">
                        <Sparkles size={14} className="mt-0.5 shrink-0 text-amber-600" />
                        <div>
                          <strong className="block font-bold text-amber-900 mb-0.5">AI Suggestion</strong>
                          Similar handloom items sell for {product.suggested_price_range}.
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Final Selling Price (₹)</label>
                      <input 
                        type="number" 
                        defaultValue={product.price_inr || ""}
                        onBlur={async (e) => {
                          const val = parseInt(e.target.value);
                          if (isNaN(val)) return;
                          
                          // update local state
                          const newResults = [...results];
                          newResults[i].price_inr = val;
                          setResults(newResults);
                          
                          // update DB
                          try {
                            await fetch(`/api/v1/products/${product.product_id}/price`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ price_inr: val })
                            });
                          } catch (err) {
                            console.error("Failed to update price", err);
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. 2500"
                      />
                    </div>

                    {/* Share button */}
                    <button
                      onClick={() => handleShare(product, images[i])}
                      disabled={sharingId === product.product_id}
                      className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/30 hover:bg-[#20bd5a] hover:scale-[1.02] transition-all disabled:opacity-60"
                    >
                      {sharingId === product.product_id ? (
                        <><Loader2 className="animate-spin" size={18} /> Opening...</>
                      ) : (
                        <><Share2 size={18} /> {t('share_whatsapp')}</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Floating CTA (upload view only) ── */}
        {!results && (
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-10 bg-gradient-to-t from-white via-white to-transparent flex flex-col gap-3 z-10">
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2.5">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            )}
            <button
              onClick={generate}
              disabled={!canGenerate}
              className={`w-full py-4 rounded-2xl font-extrabold text-base transition-all flex justify-center items-center gap-2 shadow-xl ${canGenerate ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] shadow-indigo-600/30" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
            >
              {isLoading ? (
                <><Loader2 className="animate-spin" size={22} /> {loadingMsg || "Generating..."}</>
              ) : !artisanId ? (
                <>{t('sign_in_to_generate')} <User size={18} /></>
              ) : (
                <>{t('generate_btn')} <Sparkles size={18} /></>
              )}
            </button>
          </div>
        )}

        {/* ── Toast ── */}
        {toastMsg && (
          <div className="absolute bottom-24 left-5 right-5 bg-slate-900 text-white px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xl z-30 animate-in slide-in-from-bottom-4 duration-300">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" /> {toastMsg}
          </div>
        )}
        {/* ── Profile Modal ── */}
        {isProfileOpen && artisanId && (
          <div className="absolute inset-0 z-50 bg-[#F9F8F6] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Modal Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-stone-200 bg-white/90 backdrop-blur-md">
              <h2 className={`text-xl font-semibold text-neutral-900 ${playfair.className}`}>{t('profile_settings')}</h2>
              <button onClick={() => setIsProfileOpen(false)} className="p-2 text-neutral-500 hover:bg-stone-100 rounded-full transition">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-8">
              <div className="flex flex-col items-center mb-10">
                <div className="w-24 h-24 rounded-full bg-neutral-900 text-[#F9F8F6] flex items-center justify-center text-3xl font-serif mb-4 shadow-lg border-4 border-stone-100">
                  {localName ? localName.charAt(0).toUpperCase() : "A"}
                </div>
                <h3 className={`text-2xl text-neutral-900 font-bold ${playfair.className}`}>
                  {localName || "Artisan"}
                </h3>
                <p className="text-neutral-500 text-sm mt-1">Verified Member</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">{t('display_name')}</label>
                  <input 
                    type="text" 
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-stone-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-800 transition shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">{t('phone_label')}</label>
                  <input 
                    type="text" 
                    value={profilePhone}
                    disabled
                    className="w-full px-4 py-3.5 bg-stone-100 border border-stone-200 rounded-xl text-neutral-500 cursor-not-allowed shadow-inner"
                  />
                  <p className="text-xs text-neutral-400 mt-2 ml-1">Phone number cannot be changed currently.</p>
                </div>

                {userRole === "artisan" && (
                  <>
                    <div className="pt-4 pb-2 border-t border-stone-200">
                      <h4 className={`text-lg font-bold text-neutral-900 mb-4 ${playfair.className}`}>{t('my_store_link')}</h4>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/shop/${artisanId}`}
                          readOnly
                          className="flex-1 px-4 py-3.5 bg-stone-50 border border-stone-200 rounded-xl text-neutral-600 text-sm overflow-hidden"
                        />
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/shop/${artisanId}`);
                            showToast("Link copied to clipboard!");
                          }}
                          className="px-4 py-3.5 bg-neutral-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition active:scale-95 shrink-0"
                        >
                          <Copy size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 pb-2 border-t border-stone-200">
                      <h4 className={`text-lg font-bold text-neutral-900 mb-4 ${playfair.className}`}>Shop QR Code</h4>
                      <div className="flex flex-col items-center p-6 bg-white border border-stone-200 rounded-2xl shadow-sm">
                        <QRCodeCanvas 
                          id="shop-qr-code" 
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/shop/${artisanId}`} 
                          size={180} 
                          bgColor={"#ffffff"}
                          fgColor={"#171717"}
                          level={"H"}
                        />
                        <button 
                          onClick={() => {
                            const canvas = document.getElementById("shop-qr-code") as HTMLCanvasElement;
                            if (!canvas) return;
                            const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                            const downloadLink = document.createElement("a");
                            downloadLink.href = pngUrl;
                            downloadLink.download = "shop-qr-code.png";
                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                            document.body.removeChild(downloadLink);
                          }}
                          className="mt-6 w-full py-3 bg-stone-100 text-neutral-900 border border-stone-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-stone-200 transition"
                        >
                          <Download size={18} /> Download QR for Shop
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-6 bg-white border-t border-stone-200 flex flex-col gap-3 pb-8">
              <button 
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full py-4 bg-emerald-600 text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-md active:scale-[0.98]"
              >
                {isSavingProfile ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                {t('save_changes')}
              </button>
              <button 
                onClick={() => {
                  setIsProfileOpen(false);
                  handleSignOut();
                }}
                className="w-full py-4 bg-stone-100 text-red-600 rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-700 transition active:scale-[0.98]"
              >
                <LogOut size={20} />
                {t('sign_out')}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
