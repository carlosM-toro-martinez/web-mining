import { FormEvent, useMemo, useState } from "react";
import { Calculator, Landmark, Plus, ReceiptText } from "lucide-react";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { ApiError } from "@/shared/api/core/apiError";
import {
  useCentrosCostoQuery,
  useCuentasQuery,
  useCreateCentroCostoMutation,
  useCreateCuentaMutation,
  useCreateFuncionGastoMutation,
  useCreateSalidaMovimientoMutation,
  useFuncionesGastoQuery
} from "@/features/contabilidad/hooks/useContabilidad";
import { useProductosQuery } from "@/features/productos/hooks/useProductos";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

export function AccountingPage() {
  const { showError, showSuccess } = useToast();

  const centrosQuery = useCentrosCostoQuery();
  const funcionesQuery = useFuncionesGastoQuery();
  const cuentasQuery = useCuentasQuery();
  const productosQuery = useProductosQuery({ page: 1, limit: 100, search: "" });

  const createCentroMutation = useCreateCentroCostoMutation();
  const createFuncionMutation = useCreateFuncionGastoMutation();
  const createCuentaMutation = useCreateCuentaMutation();
  const createSalidaMutation = useCreateSalidaMovimientoMutation();

  const centros = centrosQuery.data?.data ?? [];
  const funciones = funcionesQuery.data?.data ?? [];
  const cuentas = cuentasQuery.data?.data ?? [];
  const productos = productosQuery.data?.data ?? [];

  const [centroCodigo, setCentroCodigo] = useState("");
  const [centroNombre, setCentroNombre] = useState("");

  const [funcionCodigo, setFuncionCodigo] = useState("");
  const [funcionNombre, setFuncionNombre] = useState("");

  const [cuentaCentroId, setCuentaCentroId] = useState("");
  const [cuentaFuncionId, setCuentaFuncionId] = useState("");
  const [cuentaCodigoCompleto, setCuentaCodigoCompleto] = useState("");

  const [productoId, setProductoId] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [referencia, setReferencia] = useState("VALE");
  const [referenciaId, setReferenciaId] = useState("");

  const centroMap = useMemo(
    () => new Map(centros.map((centro) => [centro.id, centro])),
    [centros]
  );
  const funcionMap = useMemo(
    () => new Map(funciones.map((funcion) => [funcion.id, funcion])),
    [funciones]
  );

  const isLoadingBase = centrosQuery.isLoading || funcionesQuery.isLoading || cuentasQuery.isLoading;

  function updateCuentaCodigoCompleto(nextCentroId: string, nextFuncionId: string) {
    const centro = centroMap.get(Number(nextCentroId));
    const funcion = funcionMap.get(Number(nextFuncionId));
    if (centro?.codigo && funcion?.codigo) {
      setCuentaCodigoCompleto(`${centro.codigo}-${funcion.codigo}`.toUpperCase());
      return;
    }
    setCuentaCodigoCompleto("");
  }

  function handleCentroChange(value: string) {
    setCuentaCentroId(value);
    updateCuentaCodigoCompleto(value, cuentaFuncionId);
  }

  function handleFuncionChange(value: string) {
    setCuentaFuncionId(value);
    updateCuentaCodigoCompleto(cuentaCentroId, value);
  }

  function handleCreateCentro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCentroMutation.mutate(
      {
        codigo: centroCodigo,
        nombre: centroNombre
      },
      {
        onSuccess: () => {
          showSuccess("Centro de costo creado correctamente.");
          setCentroCodigo("");
          setCentroNombre("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear el centro de costo."))
      }
    );
  }

  function handleCreateFuncion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createFuncionMutation.mutate(
      {
        codigo: funcionCodigo,
        nombre: funcionNombre
      },
      {
        onSuccess: () => {
          showSuccess("Funcion de gasto creada correctamente.");
          setFuncionCodigo("");
          setFuncionNombre("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la funcion de gasto."))
      }
    );
  }

  function handleCreateCuenta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedCentroId = Number(cuentaCentroId);
    const parsedFuncionId = Number(cuentaFuncionId);

    if (!parsedCentroId || !parsedFuncionId) {
      showError("Debes seleccionar centro de costo y funcion de gasto.");
      return;
    }

    createCuentaMutation.mutate(
      {
        codigoCompleto: cuentaCodigoCompleto,
        centroCostoId: parsedCentroId,
        funcionGastoId: parsedFuncionId
      },
      {
        onSuccess: () => {
          showSuccess("Cuenta contable creada correctamente.");
          setCuentaCentroId("");
          setCuentaFuncionId("");
          setCuentaCodigoCompleto("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la cuenta contable."))
      }
    );
  }

  function handleCreateSalida(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedProductoId = Number(productoId);
    const parsedCuentaId = Number(cuentaId);
    const parsedCantidad = Number(cantidad);

    if (!parsedProductoId || !parsedCuentaId || !parsedCantidad || parsedCantidad <= 0) {
      showError("Producto, cuenta y cantidad son obligatorios.");
      return;
    }

    createSalidaMutation.mutate(
      {
        productoId: parsedProductoId,
        cuentaId: parsedCuentaId,
        cantidad: parsedCantidad,
        referencia,
        referenciaId
      },
      {
        onSuccess: () => {
          showSuccess("Salida registrada correctamente.");
          setProductoId("");
          setCuentaId("");
          setCantidad("1");
          setReferencia("VALE");
          setReferenciaId("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar la salida."))
      }
    );
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <Landmark size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Contabilidad de Inventario</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Configura centros de costo, funciones de gasto, cuentas contables y registra salidas asociadas.
            </p>
          </div>
        </div>
      </header>

      {isLoadingBase ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
          <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando datos de contabilidad...</p>
        </article>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Plus size={16} className="text-[var(--color-primary)]" />
            Centro de costo
          </h2>
          <form className="space-y-3" onSubmit={handleCreateCentro}>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Codigo
              </label>
              <input
                required
                value={centroCodigo}
                onChange={(event) => setCentroCodigo(event.target.value.toUpperCase())}
                className={`${inputClassName} font-mono uppercase tracking-wide`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Nombre
              </label>
              <input
                required
                value={centroNombre}
                onChange={(event) => setCentroNombre(event.target.value)}
                className={inputClassName}
              />
            </div>
            <button
              type="submit"
              disabled={createCentroMutation.isPending}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createCentroMutation.isPending ? "Guardando..." : "Guardar centro"}
            </button>
          </form>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Codigo
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Nombre
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Cuentas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {centros.map((centro) => (
                  <tr key={centro.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                    <td className="px-3 py-2 font-mono text-xs uppercase">{centro.codigo}</td>
                    <td className="px-3 py-2 text-sm capitalize">{centro.nombre}</td>
                    <td className="px-3 py-2 text-right text-xs">{centro._count?.cuentas ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Plus size={16} className="text-[var(--color-primary)]" />
            Funcion de gasto
          </h2>
          <form className="space-y-3" onSubmit={handleCreateFuncion}>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Codigo
              </label>
              <input
                required
                value={funcionCodigo}
                onChange={(event) => setFuncionCodigo(event.target.value.toUpperCase())}
                className={`${inputClassName} font-mono uppercase tracking-wide`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Nombre
              </label>
              <input
                required
                value={funcionNombre}
                onChange={(event) => setFuncionNombre(event.target.value)}
                className={inputClassName}
              />
            </div>
            <button
              type="submit"
              disabled={createFuncionMutation.isPending}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createFuncionMutation.isPending ? "Guardando..." : "Guardar funcion"}
            </button>
          </form>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Codigo
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Nombre
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Cuentas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {funciones.map((funcion) => (
                  <tr key={funcion.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                    <td className="px-3 py-2 font-mono text-xs uppercase">{funcion.codigo}</td>
                    <td className="px-3 py-2 text-sm capitalize">{funcion.nombre}</td>
                    <td className="px-3 py-2 text-right text-xs">{funcion._count?.cuentas ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Calculator size={16} className="text-[var(--color-primary)]" />
          Cuenta contable
        </h2>

        <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={handleCreateCuenta}>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Centro de costo
            </label>
            <select
              required
              value={cuentaCentroId}
              onChange={(event) => handleCentroChange(event.target.value)}
              className={inputClassName}
            >
              <option value="">Selecciona centro</option>
              {centros.map((centro) => (
                <option key={centro.id} value={centro.id}>
                  {centro.codigo} - {centro.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Funcion de gasto
            </label>
            <select
              required
              value={cuentaFuncionId}
              onChange={(event) => handleFuncionChange(event.target.value)}
              className={inputClassName}
            >
              <option value="">Selecciona funcion</option>
              {funciones.map((funcion) => (
                <option key={funcion.id} value={funcion.id}>
                  {funcion.codigo} - {funcion.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Codigo completo
            </label>
            <input
              required
              value={cuentaCodigoCompleto}
              onChange={(event) => setCuentaCodigoCompleto(event.target.value.toUpperCase())}
              className={`${inputClassName} font-mono uppercase tracking-wide`}
              placeholder="1804-229"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={createCuentaMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createCuentaMutation.isPending ? "Guardando..." : "Guardar cuenta"}
            </button>
          </div>
        </form>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Codigo
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Centro
                </th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Funcion
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Movimientos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {cuentas.map((cuenta) => (
                <tr key={cuenta.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-3 py-2 font-mono text-xs uppercase">{cuenta.codigoCompleto}</td>
                  <td className="px-3 py-2 text-sm capitalize">{cuenta.centroCosto.nombre}</td>
                  <td className="px-3 py-2 text-sm capitalize">{cuenta.funcionGasto.nombre}</td>
                  <td className="px-3 py-2 text-right text-xs">{cuenta._count?.movimientos ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <ReceiptText size={16} className="text-[var(--color-primary)]" />
          Registrar salida con cuenta contable
        </h2>

        <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={handleCreateSalida}>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Producto
            </label>
            <select
              required
              value={productoId}
              onChange={(event) => setProductoId(event.target.value)}
              className={inputClassName}
            >
              <option value="">Selecciona producto</option>
              {productos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.codigo} - {producto.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Cuenta contable
            </label>
            <select
              required
              value={cuentaId}
              onChange={(event) => setCuentaId(event.target.value)}
              className={inputClassName}
            >
              <option value="">Selecciona cuenta</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.codigoCompleto} - {cuenta.centroCosto.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Cantidad
            </label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={cantidad}
              onChange={(event) => setCantidad(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Referencia
            </label>
            <input
              required
              value={referencia}
              onChange={(event) => setReferencia(event.target.value.toUpperCase())}
              className={`${inputClassName} uppercase`}
              placeholder="VALE"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Referencia ID
            </label>
            <input
              required
              value={referenciaId}
              onChange={(event) => setReferenciaId(event.target.value)}
              className={inputClassName}
              placeholder="vale-123"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={createSalidaMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createSalidaMutation.isPending ? "Registrando..." : "Registrar salida"}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}
