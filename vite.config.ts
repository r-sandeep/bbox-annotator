import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [react(), dts()],
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'ReactBBoxAnnotator',
      fileName: (format) => `index.${format}.js`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['react', 'react-dom', 'react-jss', 'uuidv4'],
    },
  },
});
