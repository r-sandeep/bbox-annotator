import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      'react-bbox-annotator': path.resolve(__dirname, '../src'),
    },
  },
  server: {
    open: true,
  },
});
