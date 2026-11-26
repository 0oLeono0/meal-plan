import { expect, test } from '@playwright/test';

test('pantry associates quantity and unit errors with the field that needs correction', async ({ page }) => {
  await page.goto('/pantry');
  await page.getByRole('button', { name: 'Рис', exact: true }).click();
  await page.getByRole('button', { name: /Указать количество: рис/i }).click();
  const amount = page.getByLabel('Количество', { exact: true });
  const unit = page.getByLabel('Единица', { exact: true });
  const save = page.getByRole('button', { name: 'Сохранить количество', exact: true });

  await amount.fill('0');
  await save.click();
  await expect(amount).toBeFocused();
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  await expect(amount).toHaveAccessibleDescription(/Введите количество больше 0/);

  await amount.fill('200');
  await save.click();
  await expect(unit).toBeFocused();
  await expect(unit).toHaveAttribute('aria-invalid', 'true');
  await expect(unit).toHaveAccessibleDescription('Выберите подходящую единицу');
  await expect(amount).toHaveAttribute('aria-invalid', 'false');
  await expect(amount).toHaveValue('200');

  await unit.selectOption('g');
  await save.click();
  await expect(page.getByRole('button', { name: /Изменить количество: рис/i })).toContainText('200 г');
});

test('active pantry navigation text meets the normal-text contrast threshold', async ({ page }) => {
  await page.goto('/pantry');
  const activeNav = page.getByRole('link', { name: 'Дома', exact: true });
  await expect(activeNav).toHaveAttribute('aria-current', 'page');
  const contrast = await activeNav.evaluate(element => {
    const style = getComputedStyle(element);
    const luminance = (rgb: string) => {
      const channels = rgb.match(/[\d.]+/g)?.slice(0, 3).map(channel => {
        const value = Number(channel) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      if (!channels || channels.length !== 3) throw new Error(`Unexpected CSS color ${rgb}`);
      return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
    };
    const colors = [luminance(style.color), luminance(style.backgroundColor)];
    return (Math.max(...colors) + 0.05) / (Math.min(...colors) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
