import Link from "next/link";
import { ArrowRight, ShoppingBag, Sparkles } from "lucide-react";

export default function RootPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-md">
          <Sparkles size={28} />
        </div>

        <div className="space-y-1.5">
          <span className="inline-block text-[11px] font-extrabold tracking-wider uppercase bg-amber-100 text-amber-900 px-3 py-1 rounded-full">
            Global Heritage Marketplace
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Vernacular AI
          </h1>
          <p className="text-sm font-medium text-slate-600 leading-relaxed">
            Empowering rural handloom weavers with multimodal AI, localized digital boutiques, and direct global commerce.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/shop"
            className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-2xl transition shadow-md hover:shadow-lg active:scale-95 text-sm"
          >
            <ShoppingBag size={16} />
            <span>Enter Marketplace</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className="mt-8 text-xs font-medium text-slate-400">
        Vernacular AI &bull; 0% Platform Commission &bull; 100% Direct to Weaver
      </div>
    </div>
  );
}
