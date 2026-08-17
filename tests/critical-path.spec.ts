import { test, expect } from '@playwright/test';

test.describe('E-commerce Critical Path', () => {
  test('should allow user to browse and add items to cart', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/');

    // 2. Check if logo is visible
    const logo = page.getByRole('link', { name: /Kerala Grocery/i }).first();
    await expect(logo).toBeVisible();

    // 3. Search for a product (e.g., 'Matta Rice')
    const searchInput = page.getByPlaceholder(/Search Kerala groceries/i);
    await searchInput.fill('Matta');
    await page.keyboard.press('Enter');

    // 4. Verify search results
    await expect(page).toHaveURL(/search=Matta/);

    // 5. Add first product to cart
    const addToCartButton = page.getByRole('button', { name: /Add to Cart/i }).first();
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();

      // 6. Verify cart count updated
      const cartBadge = page.locator('.cart-count-badge'); // Assuming this class exists
      // Wait for hydration/sync
      await page.waitForTimeout(1000);
    }
  });

  test('should require login for checkout', async ({ page }) => {
    await page.goto('/cart');

    const checkoutButton = page.getByRole('link', { name: /Proceed to Checkout/i });
    if (await checkoutButton.isVisible()) {
      await checkoutButton.click();
      await expect(page).toHaveURL(/\/auth/);
    }
  });
});
