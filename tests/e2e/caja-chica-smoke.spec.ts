import { expect, test, type Page } from "@playwright/test";

// E2E smoke test for the "Caja Chica / Rendición de Cuentas de Campamento"
// module. Runs against the REAL backend (no route mocking), reusing the
// dedicated ADMIN test user created for the Logística module smoke test
// (see logistica-smoke.spec.ts). All records created here are prefixed with
// ZTEST- so they can be identified and cleaned up manually afterwards.

const ADMIN_EMAIL = "zz-test-logistica@marte.local";
const ADMIN_PASSWORD = "ZTest#Logistica2026";

const CAJA_NOMBRE = "Caja Bolivianos Lipeña";
const PROVEEDOR = "ZTEST Proveedor E2E";

// Sufijo único por corrida para que re-ejecutar el spec contra la misma base
// de datos de desarrollo no produzca glosas duplicadas (eso rompería los
// selectores por texto de la tabla de "Gastos registrados").
const RUN_ID = Date.now().toString().slice(-6);
const GLOSA_FACTURA = `ZTEST-FACTURA-1000-${RUN_ID}`;
const GLOSA_SERVICIO = `ZTEST-SERVICIO-1000-${RUN_ID}`;
const GLOSA_COMPRA = `ZTEST-COMPRA-1000-${RUN_ID}`;
const GLOSA_RECIBO = `ZTEST-RECIBO-1000-${RUN_ID}`;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("usuario@empresa.com").fill(ADMIN_EMAIL);
  await page.getByPlaceholder("••••••••").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/(?!login)/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

test.describe("Caja Chica / Rendición de Cuentas de Campamento - flujo E2E completo", () => {
  test.describe.configure({ mode: "serial" });

  test("flujo completo desde el navegador", async ({ page }) => {
    test.setTimeout(180_000);

    // 1. Login
    await test.step("Login como ADMIN", async () => {
      await login(page);
      await expect(page.getByText(/Minera Marte|Marte/i).first()).toBeVisible({ timeout: 10000 });
    });

    // 2. Parámetros: verificar que la semilla cargó
    await test.step("Verificar parámetros / semilla de datos", async () => {
      await page.goto("/caja-chica/parametros");
      await expect(page.getByRole("heading", { name: "Parámetros de Caja Chica" })).toBeVisible();

      const cajasArticle = page.locator("article").filter({ hasText: "Cajas chicas" });
      await expect(cajasArticle.getByText(CAJA_NOMBRE)).toBeVisible({ timeout: 10000 });

      const centrosArticle = page.locator("article").filter({ hasText: "Centros de costo" });
      await expect(centrosArticle.locator(".group").first()).toBeVisible({ timeout: 10000 });

      const funcionesArticle = page.locator("article").filter({ hasText: "Funciones de gasto" });
      await expect(funcionesArticle.locator(".group").first()).toBeVisible({ timeout: 10000 });

      const retencionesArticle = page.locator("article").filter({ hasText: "Tasas de retención tributaria" });
      await expect(retencionesArticle.getByText("13%", { exact: true })).toBeVisible();
      await expect(retencionesArticle.getByText("12.5%", { exact: true })).toBeVisible();
      await expect(retencionesArticle.getByText("3%", { exact: true })).toBeVisible();
    });

    // 3. Registrar los 4 gastos de prueba, validando la vista previa tributaria
    await page.goto("/caja-chica/gastos");
    await expect(page.getByRole("heading", { name: "Registro de Gastos" })).toBeVisible();

    const gastoArticle = page.locator("article").filter({ hasText: "Nuevo gasto" });
    const gastosTableArticle = page.locator("article").filter({ hasText: "Gastos registrados" });

    const cajaSelect = gastoArticle.locator("select").filter({ hasText: "Caja..." });
    const tipoDocSelect = gastoArticle.locator("select").filter({ hasText: "Recibo directo" });
    const monedaSelect = gastoArticle.locator("select").filter({ hasText: "USD" });
    const centroSelect = gastoArticle.locator("select").filter({ hasText: "Centro de costo..." });
    const funcionSelect = gastoArticle.locator("select").filter({ hasText: "Función de gasto..." });

    async function fillCommonGastoFields() {
      await cajaSelect.selectOption({ label: CAJA_NOMBRE });
      await gastoArticle.locator('input[type="date"]').fill(todayISO());
      await gastoArticle.getByPlaceholder("Proveedor / beneficiario").fill(PROVEEDOR);
      await monedaSelect.selectOption("BOB");
      await centroSelect.selectOption({ index: 1 });
      await funcionSelect.selectOption({ index: 1 });
    }

    async function submitGastoAndVerify(glosa: string) {
      await gastoArticle.getByPlaceholder("Glosa (ej. 500 Lts Gasolina)").fill(glosa);
      await gastoArticle.getByPlaceholder("Monto").fill("1000");

      const createResponse = page.waitForResponse(
        (r) => r.url().includes("/gastos-caja") && r.request().method() === "POST"
      );
      await gastoArticle.getByRole("button", { name: "Registrar gasto" }).click();
      const resp = await createResponse;
      expect(resp.ok(), `Fallo al crear gasto ${glosa}: ${resp.status()}`).toBeTruthy();
      await expect(gastosTableArticle.getByText(glosa)).toBeVisible({ timeout: 10000 });
    }

    await test.step("Gasto FACTURA 1000 -> Crédito Fiscal IVA 130", async () => {
      await fillCommonGastoFields();
      await tipoDocSelect.selectOption({ label: "Factura" });
      await gastoArticle.getByPlaceholder("Monto").fill("1000");
      await expect(gastoArticle.getByText(/Crédito fiscal IVA:\s*130,00/)).toBeVisible();
      await expect(gastoArticle.getByText(/Retención RC-IVA/)).toHaveCount(0);
      await expect(gastoArticle.getByText(/Retención IUE Compras/)).toHaveCount(0);
      await expect(gastoArticle.getByText(/Retención IT/)).toHaveCount(0);
      await submitGastoAndVerify(GLOSA_FACTURA);
    });

    await test.step("Gasto CONTRATO_RETENCION + SERVICIO 1000 -> RC-IVA 130 + IT 30", async () => {
      await fillCommonGastoFields();
      await tipoDocSelect.selectOption({ label: "Contrato con retención" });
      const categoriaSelect = gastoArticle.locator("select").filter({ hasText: "Compra / alimentación" });
      await categoriaSelect.selectOption({ label: "Servicio (RC-IVA + IT)" });
      await gastoArticle.getByPlaceholder("Monto").fill("1000");
      await expect(gastoArticle.getByText(/Retención RC-IVA:\s*130,00/)).toBeVisible();
      await expect(gastoArticle.getByText(/Retención IT:\s*30,00/)).toBeVisible();
      await expect(gastoArticle.getByText(/Crédito fiscal IVA/)).toHaveCount(0);
      await expect(gastoArticle.getByText(/Retención IUE Compras/)).toHaveCount(0);
      await submitGastoAndVerify(GLOSA_SERVICIO);
    });

    await test.step("Gasto CONTRATO_RETENCION + COMPRA 1000 -> IUE Compras 125 + IT 30", async () => {
      await fillCommonGastoFields();
      await tipoDocSelect.selectOption({ label: "Contrato con retención" });
      const categoriaSelect = gastoArticle.locator("select").filter({ hasText: "Servicio (RC-IVA" });
      await categoriaSelect.selectOption({ label: "Compra / alimentación (IUE + IT)" });
      await gastoArticle.getByPlaceholder("Monto").fill("1000");
      await expect(gastoArticle.getByText(/Retención IUE Compras:\s*125,00/)).toBeVisible();
      await expect(gastoArticle.getByText(/Retención IT:\s*30,00/)).toBeVisible();
      await expect(gastoArticle.getByText(/Crédito fiscal IVA/)).toHaveCount(0);
      await expect(gastoArticle.getByText(/Retención RC-IVA/)).toHaveCount(0);
      await submitGastoAndVerify(GLOSA_COMPRA);
    });

    await test.step("Gasto RECIBO_DIRECTO 1000 -> no deducible, sin créditos ni retenciones", async () => {
      await fillCommonGastoFields();
      await tipoDocSelect.selectOption({ label: "Recibo directo (sin respaldo)" });
      await gastoArticle.getByPlaceholder("Monto").fill("1000");
      await expect(gastoArticle.getByText("100% a Gastos No Deducibles")).toBeVisible();
      await expect(gastoArticle.getByText(/Crédito fiscal IVA/)).toHaveCount(0);
      await expect(gastoArticle.getByText(/Retención RC-IVA/)).toHaveCount(0);
      await expect(gastoArticle.getByText(/Retención IUE Compras/)).toHaveCount(0);
      await expect(gastoArticle.getByText(/Retención IT/)).toHaveCount(0);
      await submitGastoAndVerify(GLOSA_RECIBO);
    });

    // Los 4 gastos deben figurar como REGISTRADO antes de rendir
    await test.step("Los 4 gastos quedan en estado Registrado", async () => {
      for (const glosa of [GLOSA_FACTURA, GLOSA_SERVICIO, GLOSA_COMPRA, GLOSA_RECIBO]) {
        const row = gastosTableArticle.locator("tr", { hasText: glosa });
        await expect(row.getByText("Registrado")).toBeVisible();
      }
    });

    // Screenshot 1: formulario de gasto con la vista previa tributaria visible
    // (dejamos armado el último caso -- RECIBO_DIRECTO -- en pantalla)
    await page.screenshot({ path: "test-results/caja-chica-preview-tributaria.png", fullPage: true });

    // 4. Fondos recibidos: remesa que cubra los 4 gastos
    await test.step("Registrar remesa de fondos", async () => {
      const fondosArticle = page.locator("article").filter({ hasText: "Fondos recibidos" });
      const movCajaSelect = fondosArticle.locator("select").filter({ hasText: "Caja..." });
      await movCajaSelect.selectOption({ label: CAJA_NOMBRE });
      await fondosArticle.getByPlaceholder("Monto").fill("10000");
      await fondosArticle.locator('input[type="date"]').fill(todayISO());

      const movResponse = page.waitForResponse(
        (r) => r.url().includes("/movimientos-fondo-caja") && r.request().method() === "POST"
      );
      await fondosArticle.getByRole("button", { name: "Registrar fondo" }).click();
      const resp = await movResponse;
      expect(resp.ok(), `Fallo al registrar remesa: ${resp.status()}`).toBeTruthy();
      await expect(fondosArticle.locator("p.font-semibold").filter({ hasText: CAJA_NOMBRE })).toBeVisible({
        timeout: 10000
      });
    });

    // 5. Rendición: crear, verificar totales, cerrar
    let saldoNuevoTexto = "";
    await test.step("Crear rendición y verificar totales", async () => {
      await page.goto("/caja-chica/rendiciones");
      await expect(page.getByRole("heading", { name: "Rendiciones de Caja" })).toBeVisible();

      const cajaSelectRend = page.locator("select").filter({ hasText: "Caja..." }).first();
      await cajaSelectRend.selectOption({ label: CAJA_NOMBRE });

      const dateInputs = page.locator('input[type="date"]');
      await dateInputs.nth(0).fill(daysAgoISO(7));
      await dateInputs.nth(1).fill(todayISO());

      const tipoCambioInput = page.locator('input[type="number"]').first();
      await tipoCambioInput.fill("6.96");

      const createResponse = page.waitForResponse(
        (r) => r.url().includes("/rendiciones-caja") && r.request().method() === "POST"
      );
      await page.getByRole("button", { name: "Crear rendición" }).click();
      const resp = await createResponse;
      expect(resp.ok(), `Fallo al crear rendición: ${resp.status()}`).toBeTruthy();
      const body = await resp.json();
      const rendicion = body.data;

      // Aritmética esperada: 1 FACTURA + 1 SERVICIO + 1 COMPRA + 1 RECIBO_DIRECTO,
      // 1000 c/u => totalGastos 4000; retenciones = 130(RC-IVA) + 30(IT servicio)
      // + 125(IUE) + 30(IT compra) = 315; crédito fiscal = 130 (solo la FACTURA);
      // fondos = 10000; saldoAnterior = 0 (primera rendición de esta caja);
      // saldoNuevo = 0 + 10000 - 4000 = 6000.
      expect(rendicion.detalleGastos?.length ?? 0).toBe(4);
      expect(Number(rendicion.totalFondos)).toBe(10000);
      expect(Number(rendicion.totalGastos)).toBe(4000);
      expect(Number(rendicion.totalRetenciones)).toBe(315);
      expect(Number(rendicion.totalCreditoFiscal)).toBe(130);
      expect(Number(rendicion.saldoAnterior)).toBe(0);
      expect(Number(rendicion.saldoNuevo)).toBe(6000);
      // Coherencia aritmética explícita pedida en el encargo:
      expect(Number(rendicion.saldoAnterior) + Number(rendicion.totalFondos) - Number(rendicion.totalGastos)).toBe(
        Number(rendicion.saldoNuevo)
      );

      await expect(page.getByRole("heading", { name: rendicion.numero })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Borrador").first()).toBeVisible();
      await expect(page.getByText(`Gastos incluidos (${rendicion.detalleGastos.length})`)).toBeVisible();
      await expect(page.getByText("10.000,00").first()).toBeVisible();
      await expect(page.getByText("4.000,00").first()).toBeVisible();
      await expect(page.getByText("315,00").first()).toBeVisible();
      await expect(page.getByText("6.000,00").first()).toBeVisible();
    });

    await test.step("Cerrar rendición", async () => {
      page.once("dialog", (dialog) => dialog.accept());
      const cerrarResponse = page.waitForResponse(
        (r) => r.url().includes("/rendiciones-caja") && r.request().method() === "POST" && r.url().includes("/cerrar")
      );
      await page.getByRole("button", { name: "Cerrar rendición" }).click();
      const resp = await cerrarResponse.catch(() => null);
      if (resp) {
        expect(resp.ok(), `Fallo al cerrar rendición: ${resp.status()}`).toBeTruthy();
      }
      await expect(page.getByText("Cerrado").first()).toBeVisible({ timeout: 10000 });
      // Screenshot 2: rendición cerrada con sus totales
      await page.screenshot({ path: "test-results/caja-chica-rendicion-cerrada.png", fullPage: true });
    });

    // 6. Verificar que los 4 gastos ahora están Rendido
    await test.step("Los 4 gastos pasan a estado Rendido", async () => {
      await page.goto("/caja-chica/gastos");
      const tableArticle = page.locator("article").filter({ hasText: "Gastos registrados" });
      for (const glosa of [GLOSA_FACTURA, GLOSA_SERVICIO, GLOSA_COMPRA, GLOSA_RECIBO]) {
        const row = tableArticle.locator("tr", { hasText: glosa });
        await expect(row.getByText("Rendido")).toBeVisible({ timeout: 10000 });
      }
    });

    // 7. Reportes: retenciones y no deducibles
    await test.step("Verificar reportes de retenciones y no deducibles", async () => {
      await page.goto("/caja-chica/reportes");
      await expect(page.getByRole("heading", { name: "Reportes de Caja Chica" })).toBeVisible();

      const filtersArticle = page.locator("article").first();
      const cajaSelectRep = filtersArticle.locator("select");
      await cajaSelectRep.selectOption({ label: CAJA_NOMBRE });
      const dateInputs = filtersArticle.locator('input[type="date"]');
      await dateInputs.nth(0).fill(todayISO());
      await dateInputs.nth(1).fill(todayISO());

      const retencionesResponse = page.waitForResponse(
        (r) => r.url().includes("/reportes-caja-chica/retenciones") && r.request().method() === "GET"
      );
      const noDeduciblesResponse = page.waitForResponse(
        (r) => r.url().includes("/reportes-caja-chica/no-deducibles") && r.request().method() === "GET"
      );
      await filtersArticle.getByRole("button", { name: "Consultar" }).click();

      const [respRet, respNoDed] = await Promise.all([retencionesResponse, noDeduciblesResponse]);
      expect(respRet.ok(), `Fallo reporte retenciones: ${respRet.status()}`).toBeTruthy();
      expect(respNoDed.ok(), `Fallo reporte no deducibles: ${respNoDed.status()}`).toBeTruthy();

      const retData = (await respRet.json()).data;
      expect(Number(retData.totales.rcIva)).toBe(130);
      expect(Number(retData.totales.iueCompras)).toBe(125);
      expect(Number(retData.totales.it)).toBe(60);

      const noDedData = (await respNoDed.json()).data;
      expect(noDedData.gastos.some((g: { glosa: string }) => g.glosa === GLOSA_RECIBO)).toBeTruthy();

      const retencionesArticle = page.locator("article").filter({ hasText: "Resumen de retenciones" });
      await expect(retencionesArticle.getByText("130,00").first()).toBeVisible();
      await expect(retencionesArticle.getByText("125,00").first()).toBeVisible();
      await expect(retencionesArticle.getByText("60,00").first()).toBeVisible();

      const noDeduciblesArticle = page.locator("article").filter({ hasText: "Gastos no deducibles" });
      await expect(noDeduciblesArticle.getByText(GLOSA_RECIBO)).toBeVisible();
    });

    // 8. Regresión rápida: /logistica y /inventario cargan sin errores de consola
    await test.step("Regresión: /logistica y /inventario cargan sin errores", async () => {
      for (const path of ["/logistica", "/inventario"]) {
        const errors: string[] = [];
        const listener = (msg: import("@playwright/test").ConsoleMessage) => {
          if (msg.type() === "error") errors.push(msg.text());
        };
        page.on("console", listener);
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        page.off("console", listener);
        expect(errors, `Errores de consola en ${path}: ${errors.join(" | ")}`).toEqual([]);
      }
    });
  });
});
