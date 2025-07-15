import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ command }) => {
    if (command === 'serve') {
        return {
            root: 'example',
            plugins: [react()],
        };
    }
    return {
        plugins: [react()],
        build: {
            lib: {
                entry: path.resolve(__dirname, 'src/index.tsx'),
                name: 'ReactBBoxAnnotator',
                fileName: (format) => `index.${format}.js`,
            },
            rollupOptions: {
                external: ['react', 'react-dom', 'react-jss', 'uuidv4'],
                output: {
                    globals: {
                        react: 'React',
                        'react-dom': 'ReactDOM',
                    },
                },
            },
        },
    };
});
