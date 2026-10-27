import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  build: { target: 'safari15' },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: ['./index.html', './src/**/*.tsx'],
          corePlugins: { preflight: false },
          theme: {
            extend: {
              colors: {
                canvas: 'var(--color-canvas)', surface: 'var(--color-surface)',
                accent: 'var(--color-accent)', danger: 'var(--color-danger)',
                ink: 'var(--color-text)', muted: 'var(--color-muted)',
              },
              spacing: { xs: 'var(--space-xs)', sm: 'var(--space-sm)', md: 'var(--space-md)', lg: 'var(--space-lg)', xl: 'var(--space-xl)', '2xl': 'var(--space-2xl)', '3xl': 'var(--space-3xl)' },
              borderRadius: { field: 'var(--radius-field)', card: 'var(--radius-card)' },
            },
          },
        }),
        autoprefixer(),
      ],
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'], exclude: ['e2e/**', 'node_modules/**', 'dist/**'] },
});
