import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: './',
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'material-web': [
            '@material/web/slider/slider.js',
            '@material/web/textfield/outlined-text-field.js',
          ],
        },
      },
    },
  },
});
