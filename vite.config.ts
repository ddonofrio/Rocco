import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/// <reference types="vitest" />

export default defineConfig(({ mode }) => {
  const isDesktopBuild = mode === 'desktop';

  return {
    base: isDesktopBuild ? './' : '/',
    build: {
      // Pixi.js and the game runtime are inherently large; Pixi already
      // code-splits its renderers on demand, so raise the warning threshold
      // above the known entry-chunk size instead of forcing brittle manual
      // chunks that would defeat Pixi's lazy loading.
      chunkSizeWarningLimit: 800,
    },
    server: {
      // Temporary: expose the dev server on the local network for playtests.
      host: '0.0.0.0',
      port: 5174,
      fs: {
        // The local workspace directory is gitignored scratch space (.local/).
        // Block the dev server from ever serving files from it.
        deny: ['.local/**'],
      },
    },
    plugins: [
      VitePWA({
        disable: isDesktopBuild,
        devOptions: {
          enabled: false,
        },
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: [
          'favicon.ico',
          'favicon-16x16.png',
          'favicon-32x32.png',
          'apple-touch-icon.png',
        ],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        },
        manifest: {
          name: 'Rocco',
          short_name: 'Rocco',
          description: 'ROCCO retro game console emulator and built-in game',
          background_color: '#11130f',
          theme_color: '#11130f',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
  };
});
