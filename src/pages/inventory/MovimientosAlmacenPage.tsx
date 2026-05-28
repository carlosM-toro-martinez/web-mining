import { FormEvent, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Boxes } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useUsersListQuery } from "@/features/auth/hooks/useUsersManagement";
import { useCuentasQuery } from "@/features/contabilidad/hooks/useContabilidad";
import {
  useCreateEntradaManualMutation,
  useCreateSalidaManualMutation
} from "@/features/movimientos/hooks/useMovimientos";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    if (error.statusCode === 404 && error.message.toLowerCase().includes("cuenta")) {
      return "La cuenta contable seleccionada no existe o ya no esta disponible.";
    }
    if (error.statusCode === 400 && error.message.toLowerCase().includes("cuenta")) {
      return error.message;
    }
    return error.message;
  }
  return fallbackMessage;
}

function formatDimensionValue(value: { codigo?: string | null; nombre?: string | null } | null | undefined) {
  if (!value) return "No definido";
  const codigo = value.codigo?.trim();
  const nombre = value.nombre?.trim();
  if (codigo && nombre) return `${codigo} - ${nombre}`;
  return codigo ?? nombre ?? "No definido";
}

export function MovimientosAlmacenPage() {
  const { user } = useAuth();
  const canOperate =
    user?.role === "ADMIN" || user?.role === "ALMACENERO" || user?.role === "SUPERINTENDENTE";
  const { showError, showSuccess } = useToast();

  const productosQuery = useProductosQuery({ page: 1, limit: 5000, search: "" });
  const cuentasQuery = useCuentasQuery();
  const usersQuery = useUsersListQuery();
  const createSalidaMutation = useCreateSalidaManualMutation();
  const createEntradaMutation = useCreateEntradaManualMutation();

  const productos = productosQuery.data?.data ?? [];
  const cuentas = cuentasQuery.data?.data ?? [];
  const usuarios = usersQuery.data?.data ?? [];

  const [salidaProductoId, setSalidaProductoId] = useState("");
  const [salidaCantidad, setSalidaCantidad] = useState("1");
  const [salidaCuentaId, setSalidaCuentaId] = useState("");
  const [salidaUsuarioEntregaId, setSalidaUsuarioEntregaId] = useState(user?.id ? String(user.id) : "");
  const [salidaUsuarioRecibidoId, setSalidaUsuarioRecibidoId] = useState("");

  const [entradaProductoId, setEntradaProductoId] = useState("");
  const [entradaCantidad, setEntradaCantidad] = useState("1");
  const [entradaPrecioUnit, setEntradaPrecioUnit] = useState("");
  const [entradaCuentaId, setEntradaCuentaId] = useState("");
  const [entradaUsuarioEntregaId, setEntradaUsuarioEntregaId] = useState(user?.id ? String(user.id) : "");
  const [entradaUsuarioRecibidoId, setEntradaUsuarioRecibidoId] = useState(user?.id ? String(user.id) : "");

  const selectedSalidaProduct = useMemo(
    () => productos.find((producto) => producto.id === Number(salidaProductoId)),
    [productos, salidaProductoId]
  );
  const selectedEntradaProduct = useMemo(
    () => productos.find((producto) => producto.id === Number(entradaProductoId)),
    [productos, entradaProductoId]
  );
  const salidaStockDisponible = Number(selectedSalidaProduct?.stock?.cantidad ?? 0);
  const selectedSalidaCuenta = useMemo(
    () => cuentas.find((cuenta) => cuenta.id === Number(salidaCuentaId)),
    [cuentas, salidaCuentaId]
  );
  const selectedEntradaCuenta = useMemo(
    () => cuentas.find((cuenta) => cuenta.id === Number(entradaCuentaId)),
    [cuentas, entradaCuentaId]
  );
  const productoOptions = useMemo(
    () =>
      productos.map((producto) => ({
        id: String(producto.id),
        label: `${producto.codigo} - ${producto.nombre} (${producto.unidad}) - stock: ${producto.stock.cantidad}`,
        searchText: `${producto.codigo} ${producto.nombre} ${producto.unidad}`
      })),
    [productos]
  );
  const usuarioOptions = useMemo(
    () =>
      usuarios.map((usuario) => ({
        id: String(usuario.id),
        label: `${usuario.nombre} (${usuario.role})`,
        searchText: `${usuario.nombre} ${usuario.role} ${usuario.email ?? ""}`
      })),
    [usuarios]
  );

  function handleSalidaProductChange(value: string) {
    setSalidaProductoId(value);
    const found = productos.find((producto) => producto.id === Number(value));
    setSalidaCuentaId(found?.cuentaId ? String(found.cuentaId) : "");
  }

  function handleEntradaProductChange(value: string) {
    setEntradaProductoId(value);
    const found = productos.find((producto) => producto.id === Number(value));
    setEntradaCuentaId(found?.cuentaId ? String(found.cuentaId) : "");
  }

  function handleCreateSalida(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      productoId: Number(salidaProductoId),
      cantidad: Number(salidaCantidad),
      cuentaId: salidaCuentaId ? Number(salidaCuentaId) : undefined,
      usuarioEntregaId: Number(salidaUsuarioEntregaId),
      usuarioRecibidoId: Number(salidaUsuarioRecibidoId)
    };

    if (!payload.productoId || !payload.cantidad || payload.cantidad <= 0 || !payload.usuarioEntregaId || !payload.usuarioRecibidoId) {
      showError("Completa todos los campos obligatorios de la salida.");
      return;
    }
    if (!payload.cuentaId) {
      showError("Selecciona una cuenta contable para registrar la salida.");
      return;
    }
    if (selectedSalidaProduct && payload.cantidad > salidaStockDisponible) {
      showError(`No puedes sacar mas de ${salidaStockDisponible} ${selectedSalidaProduct.unidad} del stock disponible.`);
      return;
    }

    createSalidaMutation.mutate(payload, {
      onSuccess: () => {
        showSuccess("Salida manual registrada correctamente.");
        setSalidaCantidad("1");
      },
      onError: (error) => showError(normalizeError(error, "No se pudo registrar la salida manual."))
    });
  }

  function handleCreateEntrada(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      productoId: Number(entradaProductoId),
      cantidad: Number(entradaCantidad),
      precioUnit: Number(entradaPrecioUnit),
      cuentaId: entradaCuentaId ? Number(entradaCuentaId) : undefined,
      usuarioEntregaId: Number(entradaUsuarioEntregaId),
      usuarioRecibidoId: Number(entradaUsuarioRecibidoId)
    };

    if (
      !payload.productoId ||
      !payload.cantidad ||
      payload.cantidad <= 0 ||
      !payload.precioUnit ||
      payload.precioUnit <= 0 ||
      !payload.usuarioEntregaId ||
      !payload.usuarioRecibidoId
    ) {
      showError("Completa todos los campos obligatorios de la entrada.");
      return;
    }
    if (!payload.cuentaId) {
      showError("Selecciona una cuenta contable para registrar la entrada.");
      return;
    }

    createEntradaMutation.mutate(payload, {
      onSuccess: () => {
        showSuccess("Entrada manual registrada correctamente.");
        setEntradaCantidad("1");
        setEntradaPrecioUnit("");
      },
      onError: (error) => showError(normalizeError(error, "No se pudo registrar la entrada manual."))
    });
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <Boxes size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Salidas y Entradas de Almacen</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Ruta operativa separada para movimientos manuales con trazabilidad completa de
              entrega y recepcion.
            </p>
          </div>
        </div>
      </header>

      {!canOperate ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            No tienes permisos para registrar movimientos manuales.
          </p>
        </article>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <ArrowUpCircle size={16} className="text-[var(--color-error)]" />
            Salida manual
          </h2>
          <form className="space-y-3" onSubmit={handleCreateSalida}>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Producto
              </label>
              <AutocompleteSelect
                value={salidaProductoId}
                onChange={handleSalidaProductChange}
                options={productoOptions}
                placeholder="Selecciona producto"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Cantidad a sacar
              </label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={salidaCantidad}
                onChange={(event) => setSalidaCantidad(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Cuenta contable
              </label>
              <select
                required
                value={salidaCuentaId}
                onChange={(event) => setSalidaCuentaId(event.target.value)}
                className={inputClassName}
              >
                <option value="">Selecciona cuenta</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.codigoCompleto} - {cuenta.centroCosto.nombre} / {cuenta.funcionGasto.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] p-3">
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Centro de costo: {formatDimensionValue(selectedSalidaCuenta?.centroCosto)}
              </p>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                Funcion de gasto: {formatDimensionValue(selectedSalidaCuenta?.funcionGasto)}
              </p>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                Area / Sector: {formatDimensionValue(selectedSalidaCuenta?.sector)}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Usuario que entrega
              </label>
              <AutocompleteSelect
                value={salidaUsuarioEntregaId}
                onChange={setSalidaUsuarioEntregaId}
                options={usuarioOptions}
                placeholder="Selecciona usuario"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Usuario que recibe
              </label>
              <AutocompleteSelect
                value={salidaUsuarioRecibidoId}
                onChange={setSalidaUsuarioRecibidoId}
                options={usuarioOptions}
                placeholder="Selecciona usuario"
                className={inputClassName}
              />
            </div>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Cuenta por defecto del producto: {selectedSalidaProduct?.cuenta?.codigoCompleto ?? "Sin cuenta asignada"}
            </p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Stock disponible: {selectedSalidaProduct ? `${selectedSalidaProduct.stock.cantidad} ${selectedSalidaProduct.unidad}` : "-"}
            </p>
            <button
              type="submit"
              disabled={createSalidaMutation.isPending || !canOperate}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createSalidaMutation.isPending ? "Registrando..." : "Registrar salida"}
            </button>
          </form>
        </article>

        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <ArrowDownCircle size={16} className="text-[var(--color-success)]" />
            Entrada manual
          </h2>
          <form className="space-y-3" onSubmit={handleCreateEntrada}>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Producto
              </label>
              <AutocompleteSelect
                value={entradaProductoId}
                onChange={handleEntradaProductChange}
                options={productoOptions}
                placeholder="Selecciona producto"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Cantidad que ingresa
              </label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={entradaCantidad}
                onChange={(event) => setEntradaCantidad(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Precio unitario (Bs.)
              </label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={entradaPrecioUnit}
                onChange={(event) => setEntradaPrecioUnit(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Cuenta contable
              </label>
              <select
                required
                value={entradaCuentaId}
                onChange={(event) => setEntradaCuentaId(event.target.value)}
                className={inputClassName}
              >
                <option value="">Selecciona cuenta</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.codigoCompleto} - {cuenta.centroCosto.nombre} / {cuenta.funcionGasto.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] p-3">
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Centro de costo: {formatDimensionValue(selectedEntradaCuenta?.centroCosto)}
              </p>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                Funcion de gasto: {formatDimensionValue(selectedEntradaCuenta?.funcionGasto)}
              </p>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                Area / Sector: {formatDimensionValue(selectedEntradaCuenta?.sector)}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Usuario que entrega
              </label>
              <AutocompleteSelect
                value={entradaUsuarioEntregaId}
                onChange={setEntradaUsuarioEntregaId}
                options={usuarioOptions}
                placeholder="Selecciona usuario"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Usuario que recibe
              </label>
              <AutocompleteSelect
                value={entradaUsuarioRecibidoId}
                onChange={setEntradaUsuarioRecibidoId}
                options={usuarioOptions}
                placeholder="Selecciona usuario"
                className={inputClassName}
              />
            </div>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Cuenta por defecto del producto: {selectedEntradaProduct?.cuenta?.codigoCompleto ?? "Sin cuenta asignada"}
            </p>
            <button
              type="submit"
              disabled={createEntradaMutation.isPending || !canOperate}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createEntradaMutation.isPending ? "Registrando..." : "Registrar entrada"}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
