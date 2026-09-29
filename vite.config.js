import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

// base './' so the same build works on GitHub Pages (/JesusCalc/) and inside the Capacitor apps.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  worker: { format: 'es' },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
});
