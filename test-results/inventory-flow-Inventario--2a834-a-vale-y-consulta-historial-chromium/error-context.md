# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory-flow.spec.ts >> Inventario E2E - flujo completo >> superintendente aprueba vale y consulta historial
- Location: tests\e2e\inventory-flow.spec.ts:5:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Abrir' }).first()

```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { attachInventoryMockServer, authenticateAs } from "./support/inventoryMockServer";
  3  | 
  4  | test.describe("Inventario E2E - flujo completo", () => {
  5  |   test("superintendente aprueba vale y consulta historial", async ({ page }) => {
  6  |     await attachInventoryMockServer(page);
  7  |     await authenticateAs(page, "super@marte.com");
  8  | 
  9  |     await page.goto("/inventario/entregas");
> 10 |     await page.getByRole("button", { name: "Abrir" }).first().click();
     |                                                               ^ Error: locator.click: Test timeout of 30000ms exceeded.
  11 |     await expect(page.getByText("Estado:")).toBeVisible();
  12 |     await page.getByRole("button", { name: "Aprobar vale" }).click();
  13 |     await expect(page.getByText("APROBADO")).toBeVisible();
  14 |     await expect(page.getByText("Historial del solicitante")).toBeVisible();
  15 |   });
  16 | 
  17 |   test("almacenero realiza entrega parcial y completa", async ({ page }) => {
  18 |     await attachInventoryMockServer(page);
  19 |     await authenticateAs(page, "almacen@marte.com");
  20 | 
  21 |     await page.goto("/inventario/entregas");
  22 |     await page.getByRole("button", { name: "Abrir" }).first().click();
  23 | 
  24 |     await page.getByRole("button", { name: "Aprobar vale" }).click();
  25 |     const cantidadInput = page.locator("input[type='number']").first();
  26 |     await cantidadInput.fill("4");
  27 |     await page.getByRole("button", { name: "Registrar entrega" }).click();
  28 |     await expect(page.getByText("PARCIAL")).toBeVisible();
  29 | 
  30 |     await cantidadInput.fill("6");
  31 |     await page.getByRole("button", { name: "Registrar entrega" }).click();
  32 |     await expect(page.getByText("COMPLETADO")).toBeVisible();
  33 |   });
  34 | 
  35 |   test("admin completa compras, pedidos y reportes", async ({ page }) => {
  36 |     await attachInventoryMockServer(page);
  37 |     await authenticateAs(page, "admin@marte.com");
  38 | 
  39 |     await page.goto("/inventario/compras");
  40 |     await page.getByRole("button", { name: "Ver" }).first().click();
  41 |     await page.getByRole("button", { name: "Cargar todo pendiente" }).click();
  42 |     await page.getByRole("button", { name: "Confirmar recepcion" }).click();
  43 |     await expect(page.getByText("COMPLETADO")).toBeVisible();
  44 | 
  45 |     await page.goto("/inventario/pedidos");
  46 |     await page.getByRole("button", { name: "Cerrar" }).first().click();
  47 |     await expect(page.getByText("COMPLETADO")).toBeVisible();
  48 | 
  49 |     await page.goto("/inventario/reportes/stock-actual");
  50 |     await expect(page.getByText("Guantes de Seguridad")).toBeVisible();
  51 |     await page.goto("/inventario/reportes/vales-resumen");
  52 |     await expect(page.getByText(/vale-001/i)).toBeVisible();
  53 |     await page.goto("/inventario/reportes/compras-resumen");
  54 |     await expect(page.getByText(/compra-001/i)).toBeVisible();
  55 |   });
  56 | });
  57 | 
```