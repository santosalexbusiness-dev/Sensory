// Tailwind CSS v4 runs through PostCSS here (rather than the @tailwindcss/vite
// plugin) for compatibility with Astro 6's Rolldown-powered Vite.
import tailwindcss from '@tailwindcss/postcss';

export default {
  plugins: [tailwindcss()],
};
