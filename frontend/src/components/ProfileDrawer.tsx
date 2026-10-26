/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle, Loader2, LogOut, Copy, Camera, UploadCloud, ImageIcon } from "lucide-react";
import { useArtisan } from "@/context/ArtisanContext";
import { QRCodeCanvas } from "qrcode.react";
import UniversalAvatar from "@/components/UniversalAvatar";
import { uploadArtisanAsset } from "@/lib/uploadAsset";
import { revalidateArtisanProfile } from "@/app/actions/revalidate";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function getSafePhone(w?: string, p?: string) {
  const val = w || p || "";
  return val.toLowerCase().includes("unknown") ? "" : val;
}

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  if (!isOpen) return null;

  return <ProfileDrawerContent onClose={onClose} />;
}

function ProfileDrawerContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const {
    artisanId,
    profileName,
    profilePhone,
    whatsappNumber,
    upiId,
    paypalEmail,
    avatarUrl,
    bannerUrl,
    userRole,
    saveProfile,
    logout,
  } = useArtisan();

  const [localName, setLocalName] = useState(profileName || "");
  const [localWhatsapp, setLocalWhatsapp] = useState(getSafePhone(whatsappNumber, profilePhone));
  const [localUpi, setLocalUpi] = useState(upiId || "");
  const [localPaypal, setLocalPaypal] = useState(paypalEmail || "");
  const [localAvatarUrl, setLocalAvatarUrl] = useState(avatarUrl || "");
  const [localBannerUrl, setLocalBannerUrl] = useState(bannerUrl || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !artisanId) return;

    setUploadError(null);
    setIsUploadingAvatar(true);
    try {
      const res = await uploadArtisanAsset(artisanId, file, "avatar");
      if (res.success && res.url) {
        setLocalAvatarUrl(res.url);
      } else {
        setUploadError(res.error || "Failed to upload avatar");
      }
    } catch {
      setUploadError("Avatar upload failed");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !artisanId) return;

    setUploadError(null);
    setIsUploadingBanner(true);
    try {
      const res = await uploadArtisanAsset(artisanId, file, "banner");
      if (res.success && res.url) {
        setLocalBannerUrl(res.url);
      } else {
        setUploadError(res.error || "Failed to upload banner");
      }
    } catch {
      setUploadError("Cover banner upload failed");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanW = localWhatsapp.trim();
      const whatsappToSave = cleanW.toLowerCase().includes("unknown") ? "" : cleanW;
      await saveProfile(
        localName.trim(),
        whatsappToSave,
        localUpi.trim(),
        localPaypal.trim(),
        localAvatarUrl.trim(),
        localBannerUrl.trim()
      );
      if (artisanId) {
        await revalidateArtisanProfile(artisanId);
      }
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const storeUrl = typeof window !== "undefined" && artisanId ? `${window.location.origin}/shop/${artisanId}` : "";

  const handleCopy = () => {
    if (storeUrl) {
      navigator.clipboard.writeText(storeUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#F9F8F6] h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-200 flex items-center justify-between bg-white">
          <h2 className="text-lg font-bold text-neutral-900">Artisan Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarFile}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={bannerInputRef}
            onChange={handleBannerFile}
            accept="image/*"
            className="hidden"
          />

          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {uploadError}
            </div>
          )}

          {/* Avatar and Name Display */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer mb-2" onClick={() => avatarInputRef.current?.click()}>
              <UniversalAvatar
                name={localName}
                avatarUrl={localAvatarUrl}
                size="xl"
                className="w-20 h-20 border-4 border-white shadow-md ring-0"
              />
              <div className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploadingAvatar ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Camera size={18} />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 underline flex items-center gap-1 mb-1"
            >
              {isUploadingAvatar ? "Uploading avatar..." : "Change profile photo"}
            </button>
            <h3 className="text-xl font-bold text-neutral-900">{localName || "Artisan"}</h3>
            <span className="text-xs text-amber-700 font-semibold tracking-wider uppercase mt-0.5">Verified Weaver</span>
          </div>

          {/* Cover Banner Uploader Card */}
          <div className="bg-white p-3.5 border border-stone-200 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Storefront Cover Banner
              </span>
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1"
              >
                {isUploadingBanner ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                <span>{localBannerUrl ? "Replace" : "Upload"}</span>
              </button>
            </div>

            <div
              onClick={() => bannerInputRef.current?.click()}
              className="h-24 w-full rounded-xl overflow-hidden bg-stone-100 border border-dashed border-stone-300 relative cursor-pointer hover:opacity-90 transition flex items-center justify-center group"
            >
              {localBannerUrl ? (
                <img
                  src={localBannerUrl}
                  alt="Store banner preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-neutral-400 group-hover:text-neutral-600">
                  <ImageIcon size={20} />
                  <span className="text-[11px] font-medium">Click to upload 16:9 banner</span>
                </div>
              )}
              {isUploadingBanner && (
                <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center gap-2 text-xs">
                  <Loader2 size={16} className="animate-spin" /> Uploading banner...
                </div>
              )}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1.5">Displayed at the top of your public storefront (max 2MB)</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                WhatsApp Phone Number
              </label>
              <input
                type="tel"
                value={localWhatsapp}
                onChange={(e) => setLocalWhatsapp(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-800"
              />
              <p className="text-[11px] text-neutral-400 mt-1">Direct domestic buyer chat & order link</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                UPI ID (Direct Domestic Pay)
              </label>
              <input
                type="text"
                value={localUpi}
                onChange={(e) => setLocalUpi(e.target.value)}
                placeholder="yourname@okaxis"
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-800"
              />
              <p className="text-[11px] text-neutral-400 mt-1">Instant zero-commission UPI payments in INR</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                PayPal Email (For International Sales)
              </label>
              <input
                type="email"
                value={localPaypal}
                onChange={(e) => setLocalPaypal(e.target.value)}
                placeholder="artisan-seller@sandbox.paypal.com"
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-800"
              />
              <p className="text-[11px] text-neutral-400 mt-1">Receive global USD payments via PayPal Sandbox</p>
            </div>
          </div>

          {/* Storefront Link & QR Code */}
          {userRole === "artisan" && storeUrl && (
            <div className="pt-4 border-t border-stone-200 space-y-4">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Public Storefront Link
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={storeUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs text-neutral-600 truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition"
                  >
                    {copiedLink ? "Copied!" : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center p-3 bg-white border border-stone-200 rounded-2xl max-w-[190px] mx-auto">
                <QRCodeCanvas value={storeUrl} size={110} />
                <span className="text-[10px] text-neutral-400 mt-2">Scan to visit store</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white border-t border-stone-200 space-y-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
            Save Changes
          </button>
          <button
            onClick={async () => {
              onClose();
              await logout();
            }}
            className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
