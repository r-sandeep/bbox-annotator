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
    // Only open the browser if explicitly requested to avoid failures when
    // utilities like `xdg-open` are unavailable.
    open: process.env.OPEN_BROWSER === 'true',
  },
});
