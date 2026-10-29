import { defineConfig } from '@playwright/test';

if (!process.env.TEST_DATABASE_URL?.endsWith('_e2e_test')) {
  throw new Error('Set TEST_DATABASE_URL to a disposable local PostgreSQL _e2e_test database.');
}

export default defineConfig({
  testDir: './tests', workers: 1, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:3059', viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
  webServer: [
    { command: process.platform === 'win32' ? '"..\\.venv\\Scripts\\python.exe" "..\\backend\\tests\\e2e_server.py"' : '../.venv/bin/python ../backend/tests/e2e_server.py' , url: 'http://127.0.0.1:8019/api/health', reuseExistingServer: false },
    { command: 'npx next dev --port 3059', url: 'http://127.0.0.1:3059', timeout: 90000,
      env: { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8019', INTERNAL_API_URL: 'http://127.0.0.1:8019' }, reuseExistingServer: false },
  ],
});
