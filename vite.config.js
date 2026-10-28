import { defineConfig } from 'vite';

export default defineConfig({
 // Support older iPhone 6 installations as well as iOS 12 WebKit.
 build: { target: 'safari11', cssTarget: 'safari11' },
});
