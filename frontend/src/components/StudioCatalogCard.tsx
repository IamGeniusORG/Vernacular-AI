/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { Product, getLocalizedProductTitle, getLocalizedProductDesc } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { getProductFallbackImage } from "@/lib/placeholders";
import { Share2, Trash2, Loader2, Minus } from "lucide-react";

export interface StudioCatalogCardProps {
  item: Product;
  priceDraft: string;
  onPriceDraftChange: (val: string) => void;
  onUpdatePrice: (productId: string) => void;
  isUpdatingPrice: boolean;
  onToggleStock: (product: Product) => void;
  isUpdatingStock: boolean;
  onAdjustStock: (productId: string, newStock: number) => void;
  onShare: (product: Product) => void;
  onDelete: (productId: string) => void;
}

/**
 * StudioCatalogCard
 * Dynamically binds to the global language state (en, bn, hi) to display
 * localized titles and descriptions with resilient fallbacks and key normalization.
 */
export default function StudioCatalogCard({
  item,
  priceDraft,
  onPriceDraftChange,
  onUpdatePrice,
  isUpdatingPrice,
  onToggleStock,
  isUpdatingStock,
  onAdjustStock,
  onShare,
  onDelete,
}: StudioCatalogCardProps) {
  // 1. Subscribe to the global language state
  const { activeLanguage, t } = useLanguage();

  // 2. Language Key Normalization & Mapping
  // Ensure that frontend state ('en', 'bn', 'hi') maps accurately to DB keys
  const langKey = activeLanguage === "hi" ? "hi" : activeLanguage === "bn" ? "bn" : "en";

  // 3. Dynamic Title & Description with Safe Fallbacks
  const displayTitle =
    item.translations?.title?.[langKey] ||
    item.translations?.title?.["en"] ||
    getLocalizedProductTitle(item, activeLanguage);

  const displayDesc =
    item.translations?.description?.[langKey] ||
    item.translations?.description?.["en"] ||
    getLocalizedProductDesc(item, activeLanguage);

  const isSoldOut =
    item.in_stock === false ||
    (typeof item.stock_quantity === "number" && item.stock_quantity <= 0);

  const currentStock =
    typeof item.stock_quantity === "number"
      ? item.stock_quantity
      : item.in_stock === false
      ? 0
      : 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-sm hover:shadow-md transition flex flex-col gap-3">
      {/* Top row: Image + Info + Delete */}
      <div className="flex gap-3 items-start">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-100 bg-slate-100">
          <img
            src={item.image_url || getProductFallbackImage(displayTitle)}
            alt={displayTitle}
            className="w-full h-full object-cover object-top"
          />
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
              {t("sold_out", "Sold Out")}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-slate-900 text-sm leading-snug truncate"
            title={displayTitle}
          >
            {displayTitle}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-snug">
            {displayDesc || item.ai_desc_local || item.ai_desc_en}
          </p>

          {/* Multilingual Translation Status Badges */}
          {item.translations?.title && (
            <div className="flex items-center gap-1 mt-1.5">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                  activeLanguage === "en"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                EN
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                  activeLanguage === "bn"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                বাংলা
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                  activeLanguage === "hi"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                हिन्दी
              </span>
            </div>
          )}

          {item.suggested_price_range && (
            <span className="inline-block mt-1 text-[10px] text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md font-medium truncate max-w-full">
              {item.suggested_price_range}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onShare(item)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
            title="Share Creation"
          >
            <Share2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
            title={t("delete_product", "Delete Creation")}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Bottom row: Inline Price Editor & Stock Management */}
      <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">₹</span>
            <input
              type="number"
              inputMode="numeric"
              value={priceDraft}
              onChange={(e) => onPriceDraftChange(e.target.value)}
              placeholder="Price"
              className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <button
              type="button"
              onClick={() => onUpdatePrice(item.id)}
              disabled={isUpdatingPrice}
              className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {isUpdatingPrice ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                "Save"
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => onToggleStock(item)}
            disabled={isUpdatingStock}
            className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer ${
              isSoldOut
                ? "bg-stone-100 text-stone-600 border border-stone-300 hover:bg-stone-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            {isUpdatingStock ? (
              <Loader2 size={12} className="animate-spin" />
            ) : isSoldOut ? (
              <>● {t("sold_out", "Sold Out")}</>
            ) : (
              <>✓ {t("in_stock", "In Stock")}</>
            )}
          </button>
        </div>

        {/* Interactive Inventory Stock Counter */}
        <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-600">Quantity Available:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onAdjustStock(item.id, Math.max(0, currentStock - 1))}
              disabled={isUpdatingStock}
              className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold text-xs disabled:opacity-40 cursor-pointer"
              title="Decrease stock"
            >
              <Minus size={12} />
            </button>
            <span className="w-8 text-center text-xs font-black text-slate-900">
              {currentStock}
            </span>
            <button
              type="button"
              onClick={() => onAdjustStock(item.id, currentStock + 1)}
              disabled={isUpdatingStock}
              className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold text-xs disabled:opacity-40 cursor-pointer"
              title="Increase stock"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
