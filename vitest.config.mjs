import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Keep puppeteer-heavy tests stable by default; override via env when needed.
    maxWorkers: Number(process.env.VITEST_MAX_WORKERS || 10),
    maxConcurrency: Number(process.env.VITEST_MAX_CONCURRENCY || 4),
    testTimeout: 60000,
    environment: 'node',
    include: ['test/**/*.test.mjs'],
    onConsoleLog(log) {
      if (
        log.includes('Timeout for loading font') ||
        log.includes('Timeout triggered for loader') ||
        log.includes('image with id')
      ) {
        return false;
      }
    },
  },
});
