"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "How does Vernacular AI empower rural weavers without requiring English literacy?",
    answer:
      "Artisans simply press and hold the voice recorder on their phone and describe their creation in Bengali or Hindi. Google Gemini 2.5 Flash transcribes their speech, generates an international-grade English title and description, and estimates fair market pricing in both INR and USD.",
  },
  {
    question: "Is there really zero platform commission on sales?",
    answer:
      "Yes! Traditional e-commerce and middlemen take 25% to 45% of an artisan's earnings. Vernacular AI connects buyers directly to the weaver's personal UPI ID or PayPal account. 100% of the purchase price goes directly to the artisan with zero commission taken by our platform.",
  },
  {
    question: "How does international shipping and PayPal checkout work?",
    answer:
      "When an international buyer switches their currency to USD or selects International Shipping, all products render export USD prices and activate PayPal Sandbox checkout. Sarees are securely packaged with authentic provenance certificates and dispatched directly from Bengal weaving clusters.",
  },
  {
    question: "How can I pay using UPI if I am located in India?",
    answer:
      "Domestic Indian shoppers can click 'Instant UPI Pay' on any product. A dynamic UPI QR code is generated instantly with the exact saree price and the artisan's verified UPI VPA. You can scan and pay with any UPI app (GPay, PhonePe, Paytm, BHIM) with instant confirmation.",
  },
  {
    question: "How are the handlooms verified for authentic quality?",
    answer:
      "Every weaver profile is verified with their traditional craft cluster (such as Nadia Dhakai Jamdani, Murshidabad Baluchari, or Hooghly Khadi). Each saree comes with an embedded audio voice story recorded by the weaver, ensuring traceable cultural provenance.",
  },
  {
    question: "How can a rural weaver join the platform?",
    answer:
      "Any weaver or artisan cooperative can tap 'Become an Artisan' or visit the /studio portal. Sign in with Google or mobile number, upload your workshop photo, and start cataloging your heritage handlooms right from your loom.",
  },
];

export default function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-white border-t border-stone-200/90">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-bold tracking-wider uppercase mb-2">
            <HelpCircle size={13} />
            <span>Got Questions?</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 mb-4 ${playfair.className}`}>
            Frequently Asked Questions
          </h2>
          <p className="text-neutral-500 text-sm sm:text-base">
            Everything you need to know about our direct-from-weaver marketplace and vernacular AI tooling.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.question}
                className="border border-stone-200 rounded-2xl overflow-hidden transition-all duration-200 bg-[#FAF8F5]/50"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-neutral-900 hover:text-[#C85A32] transition"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg">{faq.question}</span>
                  <div
                    className={`w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-[#C85A32] text-white border-transparent" : "text-neutral-500"
                    }`}
                  >
                    <ChevronDown size={16} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-neutral-600 text-sm leading-relaxed border-t border-stone-100 bg-white">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
