"use client";

import React from "react";
import StudioCatalogCard from "./StudioCatalogCard";
import { Product } from "@/lib/api";

export interface StudioCatalogProps {
  inventory: Product[];
  priceDrafts: Record<string, string>;
  onPriceDraftChange: (productId: string, val: string) => void;
  onUpdatePrice: (productId: string) => void;
  isUpdatingPrice: Record<string, boolean>;
  onToggleStock: (product: Product) => void;
  isUpdatingStock: Record<string, boolean>;
  onAdjustStock: (productId: string, newStock: number) => void;
  onShare: (product: Product) => void;
  onDelete: (productId: string) => void;
}

/**
 * StudioCatalog Component
 * Renders the collection of catalog items in Artisan Studio, fully wired to the
 * global language state via StudioCatalogCard.
 */
export default function StudioCatalog({
  inventory,
  priceDrafts,
  onPriceDraftChange,
  onUpdatePrice,
  isUpdatingPrice,
  onToggleStock,
  isUpdatingStock,
  onAdjustStock,
  onShare,
  onDelete,
}: StudioCatalogProps) {
  return (
    <div className="space-y-3">
      {inventory.map((item) => (
        <StudioCatalogCard
          key={item.id}
          item={item}
          priceDraft={priceDrafts[item.id] ?? ""}
          onPriceDraftChange={(val) => onPriceDraftChange(item.id, val)}
          onUpdatePrice={onUpdatePrice}
          isUpdatingPrice={Boolean(isUpdatingPrice[item.id])}
          onToggleStock={onToggleStock}
          isUpdatingStock={Boolean(isUpdatingStock[item.id])}
          onAdjustStock={onAdjustStock}
          onShare={onShare}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export { StudioCatalogCard };
