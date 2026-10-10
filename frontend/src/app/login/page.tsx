"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Playfair_Display } from "next/font/google";
import { Phone, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import { useArtisan } from "@/context/ArtisanContext";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const { t } = useLanguage();
  const { refreshProfile, setUserRole } = useArtisan();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const digitsOnly = phone.replace(/\D/g, "");
    const formattedPhone = `+91${digitsOnly.slice(-10)}`;

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    setIsLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      setStep("OTP");
    }
  };

  const [selectedRole, setSelectedRole] = useState<"customer" | "artisan">("customer");

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const digitsOnly = phone.replace(/\D/g, "");
    const formattedPhone = `+91${digitsOnly.slice(-10)}`;

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: "sms",
    });

    if (error) {
      setIsLoading(false);
      setErrorMsg(error.message);
    } else if (data.user) {
      // Set role in DB and await it
      await supabase.from('artisans').update({ user_role: selectedRole }).eq('id', data.user.id);
      
      // Refresh global state so the context is aware of the new role
      setUserRole(selectedRole);
      await refreshProfile();

      setIsLoading(false);
      if (selectedRole === "artisan") {
        router.push("/studio");
      } else {
        router.push("/");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-100">
        <div className="bg-neutral-900 px-8 py-10 text-center text-white">
          <h1 className={`text-3xl mb-2 ${playfair.className}`}>{t('login_title')}</h1>
          <p className="text-neutral-400 text-sm">{t('login_subtitle')}</p>
        </div>

        <div className="p-8">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
              {errorMsg}
            </div>
          )}

          {step === "PHONE" ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              
              {/* Role Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-neutral-800">Who are you?</label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("customer")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${selectedRole === "customer" ? "border-indigo-600 bg-indigo-50" : "border-stone-200 bg-white hover:border-stone-300"}`}
                  >
                    <div className="font-bold text-neutral-900">I want to shop</div>
                    <div className="text-xs text-neutral-500 mt-1">Discover authentic handlooms directly from weavers.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("artisan")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${selectedRole === "artisan" ? "border-amber-600 bg-amber-50" : "border-stone-200 bg-white hover:border-stone-300"}`}
                  >
                    <div className="font-bold text-neutral-900">I am an artisan</div>
                    <div className="text-xs text-neutral-500 mt-1">Sell my craft and digitize my catalog with AI.</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-2">
                  {t('phone_label')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10 digits"
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-neutral-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition active:scale-[0.98] disabled:opacity-70"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> {t('send_otp')}</>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-2">
                  {t('otp_label')}
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6 digits"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-neutral-900 text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-neutral-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition active:scale-[0.98] disabled:opacity-70"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>{t('verify_otp')} <ArrowRight size={18} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
