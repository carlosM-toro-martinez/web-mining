import { FormEvent, useMemo, useState } from "react";
import {
  useCentrosCostoQuery,
  useCreateCuentaMutation,
  useFuncionesGastoQuery,
  useSectoresQuery
} from "@/features/contabilidad/hooks/useContabilidad";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

interface CreateCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (cuentaId: number) => void;
}

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

export function CreateCuentaModal({ isOpen, onClose, onCreated }: CreateCuentaModalProps) {
  const { showError, showSuccess } = useToast();
  const centrosCostoQuery = useCentrosCostoQuery();
  const funcionesGastoQuery = useFuncionesGastoQuery();
  const sectoresQuery = useSectoresQuery();
  const createCuentaMutation = useCreateCuentaMutation();
  const [centroCostoCreateId, setCentroCostoCreateId] = useState("");
  const [funcionGastoCreateId, setFuncionGastoCreateId] = useState("");
  const [sectorCreateId, setSectorCreateId] = useState("");

  const centrosCosto = centrosCostoQuery.data?.data ?? [];
  const funcionesGasto = funcionesGastoQuery.data?.data ?? [];
  const sectores = sectoresQuery.data?.data ?? [];

  const centroCostoOptions = useMemo(
    () =>
      centrosCosto.map((item) => ({
        id: String(item.id),
        label: `${item.codigo} - ${item.nombre}`,
        searchText: `${item.codigo} ${item.nombre}`
      })),
    [centrosCosto]
  );

  const funcionGastoOptions = useMemo(
    () =>
      funcionesGasto.map((item) => ({
        id: String(item.id),
        label: `${item.codigo} - ${item.nombre}`,
        searchText: `${item.codigo} ${item.nombre}`
      })),
    [funcionesGasto]
  );

  const sectorOptions = useMemo(
    () =>
      sectores.map((item) => ({
        id: String(item.id),
        label: `${item.codigo} - ${item.nombre}`,
        searchText: `${item.codigo} ${item.nombre}`
      })),
    [sectores]
  );

  function closeAndReset() {
    setCentroCostoCreateId("");
    setFuncionGastoCreateId("");
    setSectorCreateId("");
    onClose();
  }

  function buildCuentaCodigoCompleto(centroId: number, funcionId: number, sectorId: number) {
    const centro = centrosCosto.find((item) => item.id === centroId);
    const funcion = funcionesGasto.find((item) => item.id === funcionId);
    const sector = sectores.find((item) => item.id === sectorId);
    return `${centro?.codigo ?? centroId}-${funcion?.codigo ?? funcionId}-${sector?.codigo ?? sectorId}`;
  }

  function handleCreateCuentaQuick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const centroCostoId = Number(centroCostoCreateId);
    const funcionGastoId = Number(funcionGastoCreateId);
    const sectorId = Number(sectorCreateId);

    if (!centroCostoId || !funcionGastoId || !sectorId) {
      showError("Selecciona centro de costo, función de gasto y área/sector.");
      return;
    }

    const codigoCompleto = buildCuentaCodigoCompleto(centroCostoId, funcionGastoId, sectorId);
    createCuentaMutation.mutate(
      { codigoCompleto, centroCostoId, funcionGastoId, sectorId },
      {
        onSuccess: (response) => {
          onCreated?.(response.data.id);
          showSuccess("Cuenta contable creada y seleccionada.");
          closeAndReset();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo crear la cuenta contable."))
      }
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-xl rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h3 className="text-lg font-bold">Crear cuenta contable rápida</h3>
        <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
          Selecciona centro de costo, función de gasto y área/sector.
        </p>
        <form className="mt-3 space-y-3" onSubmit={handleCreateCuentaQuick}>
          <AutocompleteSelect
            value={centroCostoCreateId}
            onChange={setCentroCostoCreateId}
            options={centroCostoOptions}
            placeholder="Centro de costo (código o nombre)"
            className={inputClassName}
            maxVisibleOptions={30}
          />
          <AutocompleteSelect
            value={funcionGastoCreateId}
            onChange={setFuncionGastoCreateId}
            options={funcionGastoOptions}
            placeholder="Función de gasto (código o nombre)"
            className={inputClassName}
            maxVisibleOptions={30}
          />
          <AutocompleteSelect
            value={sectorCreateId}
            onChange={setSectorCreateId}
            options={sectorOptions}
            placeholder="Área / Sector (código o nombre)"
            className={inputClassName}
            maxVisibleOptions={30}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeAndReset}
              className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createCuentaMutation.isPending}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
            >
              {createCuentaMutation.isPending ? "Creando..." : "Crear y seleccionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
