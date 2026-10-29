import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('http://127.0.0.1:8019/__test__/reset');
});

async function chooseAndPay(page: import('@playwright/test').Page, mode = 'approved') {
  await page.route('https://js.culqi.com/checkout-js', route => route.fulfill({
    contentType: 'application/javascript', body: `window.CulqiCheckout = function() {
      this.close = () => {};
      this.open = () => { this.token = {id:'ype_test_${mode}_browserauthorization'}; this.culqi(); this.culqi(); };
    };`,
  }));
  page.on('pageerror', error => console.error('Browser error:', error.message));
  await page.goto('/c/e2e-local');
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const date = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
  await page.locator('input[type=date]').fill(date);
  await page.getByRole('button').filter({ hasText: /Disponible.*18:00/s }).click();
  await page.getByPlaceholder('Ej. Diego Choque').fill('Jugador de prueba');
  await page.locator('input[type=tel]').fill('987654321');
  await page.getByPlaceholder('tu@correo.com').fill('player@example.com');
  await page.getByRole('checkbox').check();
  await page.locator('button[type=submit]').click();
}

test('mobile checkout reserves first and ignores duplicate payment callbacks', async ({ page }) => {
  const steps: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().includes('/reservations')) steps.push(request.url());
  });
  await chooseAndPay(page);
  await expect(page.getByRole('heading', { name: '¡Reserva confirmada!' })).toBeVisible();
  expect(steps).toHaveLength(2);
  expect(steps[0]).toContain('/courts/1/reservations');
  expect(steps[1]).toMatch(/\/reservations\/[^/]+\/pay$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile-payment-approved.png', fullPage: true });
  await page.getByRole('link', { name: 'Consultar estado de mi reserva' }).click();
  await expect(page.getByText('Reserva confirmada', { exact: true })).toBeVisible();
  await expect(page.getByText('S/ 80.00', { exact: true })).toBeVisible();
});

test('uncertain payment keeps a recovery link after refresh and never asks to pay again', async ({ page }) => {
  await chooseAndPay(page, 'uncertain');
  await expect(page.getByRole('heading', { name: 'Estamos verificando tu pago' })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/r\//);
  await expect(page.getByText('Pago en verificación', { exact: true })).toBeVisible();
  await expect(page.getByText(/No vuelvas a pagar/)).toBeVisible();
  await expect(page.getByRole('button', { name: /cancelar/i })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/mobile-payment-verification.png', fullPage: true });
});

test('rejected payment is never shown as confirmed', async ({ page }) => {
  await chooseAndPay(page, 'declined');
  await expect(page.getByRole('heading', { name: 'No se realizó la reserva' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '¡Reserva confirmada!' })).toHaveCount(0);
});
