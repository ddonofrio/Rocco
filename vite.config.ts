import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/// <reference types="vitest" />

function readPackageVersion(): string {
  const pkgPath = fileURLToPath(new URL('./package.json', import.meta.url));
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
  return pkg.version ?? '0.0.0';
}

function resolveCommitCount(): string {
  const fromEnv = process.env.COMMIT_COUNT;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  try {
    const count = execSync('git rev-list --count HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    if (count.length > 0) {
      return count;
    }
  } catch {
    // Headless environments without git fall through to the default below.
  }

  return '0';
}

function resolvePlaytestStage(mode: string): string {
  if (mode === 'development') {
    return 'development';
  }

  return process.env.PLAYTEST_STAGE?.trim() || 'alpha';
}

export default defineConfig(({ mode }) => {
  const isDesktopBuild = mode === 'desktop';
  const version = readPackageVersion();
  const commitCount = resolveCommitCount();
  const playtestStage = resolvePlaytestStage(mode);

  return {
    base: isDesktopBuild ? './' : '/',
    define: {
      __ROCCO_VERSION__: JSON.stringify(version),
      __ROCCO_COMMIT_COUNT__: JSON.stringify(commitCount),
      __ROCCO_PLAYTEST_STAGE__: JSON.stringify(playtestStage),
    },
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
