import { expect, test } from "@playwright/test";
import { attachInventoryMockServer, authenticateAs } from "./support/inventoryMockServer";

test.describe("Inventario E2E - flujo completo", () => {
  test("superintendente aprueba vale y consulta historial", async ({ page }) => {
    await attachInventoryMockServer(page);
    await authenticateAs(page, "super@marte.com");

    await page.goto("/inventario/entregas");
    await page.getByRole("button", { name: "Abrir" }).first().click();
    await expect(page.getByText("Estado:")).toBeVisible();
    await page.getByRole("button", { name: "Aprobar vale" }).click();
    await expect(page.getByText("APROBADO")).toBeVisible();
    await expect(page.getByText("Historial del solicitante")).toBeVisible();
  });

  test("almacenero realiza entrega parcial y completa", async ({ page }) => {
    await attachInventoryMockServer(page);
    await authenticateAs(page, "almacen@marte.com");

    await page.goto("/inventario/entregas");
    await page.getByRole("button", { name: "Abrir" }).first().click();

    await page.getByRole("button", { name: "Aprobar vale" }).click();
    const cantidadInput = page.locator("input[type='number']").first();
    await cantidadInput.fill("4");
    await page.getByRole("button", { name: "Registrar entrega" }).click();
    await expect(page.getByText("PARCIAL")).toBeVisible();

    await cantidadInput.fill("6");
    await page.getByRole("button", { name: "Registrar entrega" }).click();
    await expect(page.getByText("COMPLETADO")).toBeVisible();
  });

  test("admin completa compras, pedidos y reportes", async ({ page }) => {
    await attachInventoryMockServer(page);
    await authenticateAs(page, "admin@marte.com");

    await page.goto("/inventario/compras");
    await page.getByRole("button", { name: "Ver" }).first().click();
    await page.getByRole("button", { name: "Cargar todo pendiente" }).click();
    await page.getByRole("button", { name: "Confirmar recepcion" }).click();
    await expect(page.getByText("COMPLETADO")).toBeVisible();

    await page.goto("/inventario/pedidos");
    await page.getByRole("button", { name: "Cerrar" }).first().click();
    await expect(page.getByText("COMPLETADO")).toBeVisible();

    await page.goto("/inventario/reportes/stock-actual");
    await expect(page.getByText("Guantes de Seguridad")).toBeVisible();
    await page.goto("/inventario/reportes/vales-resumen");
    await expect(page.getByText(/vale-001/i)).toBeVisible();
    await page.goto("/inventario/reportes/compras-resumen");
    await expect(page.getByText(/compra-001/i)).toBeVisible();
  });
});
