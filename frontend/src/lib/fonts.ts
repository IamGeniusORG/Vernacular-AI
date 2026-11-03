/**
 * Global brand serif typography (Playfair Display)
 * Configured as a drop-in object compatible with Next.js font schema,
 * completely bypassing Turbopack's `@vercel/turbopack-next/internal/font/google/font`
 * multi-query parameter parser bug.
 */
export const playfair = {
  className: "font-playfair",
  variable: "--font-playfair",
  style: {
    fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, Cambria, 'Times New Roman', Times, serif",
  },
};
