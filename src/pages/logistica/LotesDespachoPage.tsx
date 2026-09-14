import { FormEvent, useMemo, useState } from "react";
import { Ban, CheckCircle2, FileText, PackageSearch, Scale, Search, Send } from "lucide-react";
import {
  useAnularLoteMutation,
  useAvanzarEstadoLoteMutation,
  useCreateLoteDespachoMutation,
  useLoteDespachoDetailQuery,
  useLotesDespachoQuery,
  useRegistrarPesajeMutation,
  useRegularizarF101Mutation
} from "@/features/loteDespacho/hooks/useLoteDespacho";
import type { EstadoFormulario101, EstadoLoteDespacho } from "@/features/loteDespacho/model/loteDespacho.schema";
import {
  useIngeniosQuery,
  useMunicipiosOrigenQuery,
  useTiposMineralQuery
} from "@/features/parametrosLogistica/hooks/useParametrosLogistica";
import { useRemitentesQuery } from "@/features/remitente/hooks/useRemitentes";
import { useChoferesQuery, useVehiculosQuery } from "@/features/flota/hooks/useFlota";
import { ApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

const ESTADO_LOTE_LABEL: Record<EstadoLoteDespacho, string> = {
  REGISTRADO: "Registrado",
  EN_TRANSITO: "En tránsito",
  EN_BALANZA: "En balanza",
  PESADO: "Pesado",
  ACOPIADO: "Acopiado",
  LIQUIDADO: "Liquidado",
  ANULADO: "Anulado"
};

const ESTADO_LOTE_CLASS: Record<EstadoLoteDespacho, string> = {
  REGISTRADO: "bg-[var(--color-on-surface-variant)]/15 text-[var(--color-on-surface-variant)]",
  EN_TRANSITO: "bg-[var(--color-primary)]/18 text-[var(--color-primary)]",
  EN_BALANZA: "bg-[var(--color-tertiary)]/18 text-[var(--color-tertiary)]",
  PESADO: "bg-[var(--color-tertiary)]/18 text-[var(--color-tertiary)]",
  ACOPIADO: "bg-[var(--color-success)]/18 text-[var(--color-success)]",
  LIQUIDADO: "bg-[var(--color-success)]/25 text-[var(--color-success)]",
  ANULADO: "bg-[var(--color-error)]/18 text-[var(--color-error)]"
};

const ESTADO_F101_LABEL: Record<EstadoFormulario101, string> = {
  PENDIENTE: "F101 pendiente",
  REGULARIZADO: "F101 regularizado"
};

const ESTADO_F101_CLASS: Record<EstadoFormulario101, string> = {
  PENDIENTE: "bg-[var(--color-warning)]/20 text-[var(--color-warning)]",
  REGULARIZADO: "bg-[var(--color-success)]/18 text-[var(--color-success)]"
};

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO");
}

export function LotesDespachoPage() {
  const { showError, showSuccess } = useToast();

  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const lotesQuery = useLotesDespachoQuery({ estadoLote: filtroEstado || undefined, limit: 50 });
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const loteDetalleQuery = useLoteDespachoDetailQuery(selectedId);

  const municipiosQuery = useMunicipiosOrigenQuery();
  const tiposMineralQuery = useTiposMineralQuery();
  const ingeniosQuery = useIngeniosQuery();
  const remitentesQuery = useRemitentesQuery();
  const choferesQuery = useChoferesQuery();
  const vehiculosQuery = useVehiculosQuery();

  const createMutation = useCreateLoteDespachoMutation();
  const regularizarF101Mutation = useRegularizarF101Mutation();
  const avanzarEstadoMutation = useAvanzarEstadoLoteMutation();
  const registrarPesajeMutation = useRegistrarPesajeMutation();
  const anularMutation = useAnularLoteMutation();

  const lotes = lotesQuery.data?.data ?? [];
  const lote = loteDetalleQuery.data?.data ?? null;
  const municipios = municipiosQuery.data?.data ?? [];
  const tiposMineral = tiposMineralQuery.data?.data ?? [];
  const ingenios = ingeniosQuery.data?.data ?? [];
  const remitentes = remitentesQuery.data?.data ?? [];
  const choferes = choferesQuery.data?.data ?? [];
  const vehiculosDisponibles = useMemo(
    () => (vehiculosQuery.data?.data ?? []).filter((v) => v.estadoActual === "DISPONIBLE"),
    [vehiculosQuery.data]
  );

  const [municipioOrigenId, setMunicipioOrigenId] = useState("");
  const [remitenteId, setRemitenteId] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [choferId, setChoferId] = useState("");
  const [tipoMineralId, setTipoMineralId] = useState("");
  const [destinoIngenioId, setDestinoIngenioId] = useState("");
  const [nivel, setNivel] = useState("");
  const [fechaDespachoReal, setFechaDespachoReal] = useState("");
  const [fechaDocumentalFiscal, setFechaDocumentalFiscal] = useState("");
  const [codigoFormulario101, setCodigoFormulario101] = useState("");

  const [f101Codigo, setF101Codigo] = useState("");
  const [tonelajeBruto, setTonelajeBruto] = useState("");
  const [tonelajeTara, setTonelajeTara] = useState("");

  const tonelajeNetoPreview =
    tonelajeBruto && tonelajeTara ? Number(tonelajeBruto) - Number(tonelajeTara) : null;

  function resetForm() {
    setMunicipioOrigenId("");
    setRemitenteId("");
    setVehiculoId("");
    setChoferId("");
    setTipoMineralId("");
    setDestinoIngenioId("");
    setNivel("");
    setFechaDespachoReal("");
    setFechaDocumentalFiscal("");
    setCodigoFormulario101("");
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(
      {
        municipioOrigenId: Number(municipioOrigenId),
        remitenteId: Number(remitenteId),
        vehiculoId: Number(vehiculoId),
        choferId: Number(choferId),
        tipoMineralId: Number(tipoMineralId),
        destinoIngenioId: Number(destinoIngenioId),
        nivel: nivel.trim() || undefined,
        fechaDespachoReal,
        fechaDocumentalFiscal: fechaDocumentalFiscal || undefined,
        codigoFormulario101: codigoFormulario101.trim() || undefined
      },
      {
        onSuccess: (response) => {
          showSuccess(`Lote ${response.data.correlativo} registrado correctamente.`);
          resetForm();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el lote."))
      }
    );
  }

  function handleRegularizarF101(id: string) {
    if (!f101Codigo.trim()) {
      showError("Ingresa el código del Formulario 101.");
      return;
    }
    regularizarF101Mutation.mutate(
      { id, payload: { codigoFormulario101: f101Codigo.trim() } },
      {
        onSuccess: () => {
          showSuccess("Formulario 101 regularizado.");
          setF101Codigo("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo regularizar el Formulario 101."))
      }
    );
  }

  function handleAvanzarEstado(id: string, estado: "EN_TRANSITO" | "EN_BALANZA") {
    avanzarEstadoMutation.mutate(
      { id, payload: { estado } },
      {
        onSuccess: () => showSuccess("Estado del lote actualizado."),
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar el estado del lote."))
      }
    );
  }

  function handleRegistrarPesaje(id: string) {
    const bruto = Number(tonelajeBruto);
    const tara = Number(tonelajeTara);
    if (!bruto || tara < 0 || bruto <= tara) {
      showError("Verifica los valores de tonelaje: el bruto debe ser mayor al tara.");
      return;
    }
    registrarPesajeMutation.mutate(
      { id, payload: { tonelajeBruto: bruto, tonelajeTara: tara } },
      {
        onSuccess: () => {
          showSuccess("Pesaje registrado. El lote pasó a Acopiado.");
          setTonelajeBruto("");
          setTonelajeTara("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el pesaje."))
      }
    );
  }

  function handleAnular(id: string) {
    const motivo = window.prompt("Motivo de la anulación del lote:");
    if (!motivo || !motivo.trim()) return;

    anularMutation.mutate(
      { id, payload: { motivo: motivo.trim() } },
      {
        onSuccess: () => showSuccess("Lote anulado."),
        onError: (error) => showError(normalizeError(error, "No se pudo anular el lote."))
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
            <PackageSearch size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Lotes de Despacho</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Registra el despacho de mineral desde la mina, regulariza el Formulario 101, avanza el
              estado del lote y registra el pesaje en balanza.
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Send size={16} className="text-[var(--color-primary)]" />
          Nuevo lote de despacho
        </h2>
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={handleCreate}>
          <select required value={municipioOrigenId} onChange={(e) => setMunicipioOrigenId(e.target.value)} className={inputClassName}>
            <option value="">Municipio de origen...</option>
            {municipios.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
          <select required value={remitenteId} onChange={(e) => setRemitenteId(e.target.value)} className={inputClassName}>
            <option value="">Remitente...</option>
            {remitentes.map((r) => (
              <option key={r.id} value={r.id}>{r.nombreORazonSocial}</option>
            ))}
          </select>
          <select required value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)} className={inputClassName}>
            <option value="">Vehículo disponible...</option>
            {vehiculosDisponibles.map((v) => (
              <option key={v.id} value={v.id}>{v.placa} · {v.tipo}</option>
            ))}
          </select>
          <select required value={choferId} onChange={(e) => setChoferId(e.target.value)} className={inputClassName}>
            <option value="">Chofer...</option>
            {choferes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <select required value={tipoMineralId} onChange={(e) => setTipoMineralId(e.target.value)} className={inputClassName}>
            <option value="">Tipo de mineral...</option>
            {tiposMineral.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
          <select required value={destinoIngenioId} onChange={(e) => setDestinoIngenioId(e.target.value)} className={inputClassName}>
            <option value="">Ingenio destino...</option>
            {ingenios.map((i) => (
              <option key={i.id} value={i.id}>{i.nombre}</option>
            ))}
          </select>
          <input value={nivel} onChange={(e) => setNivel(e.target.value)} className={inputClassName} placeholder="Nivel (opcional)" />
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Fecha de despacho real</label>
            <input required type="date" value={fechaDespachoReal} onChange={(e) => setFechaDespachoReal(e.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Fecha documental/fiscal (opcional)</label>
            <input type="date" value={fechaDocumentalFiscal} onChange={(e) => setFechaDocumentalFiscal(e.target.value)} className={inputClassName} />
          </div>
          <input
            value={codigoFormulario101}
            onChange={(e) => setCodigoFormulario101(e.target.value)}
            className={`${inputClassName} lg:col-span-2`}
            placeholder="Código Formulario 101 (déjalo vacío si aún no está disponible)"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            {createMutation.isPending ? "Registrando..." : "Registrar lote"}
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Lotes registrados</h2>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={`${inputClassName} w-56`}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_LOTE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {["Correlativo", "Remitente", "Vehículo", "Mineral", "Estado", "F101", "Fecha despacho", "Acciones"].map((title) => (
                  <th key={title} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {lotesQuery.isLoading ? (
                <tr><td colSpan={8} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">Cargando lotes...</td></tr>
              ) : null}
              {!lotesQuery.isLoading && lotes.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">No se encontraron lotes.</td></tr>
              ) : null}
              {lotes.map((item) => (
                <tr key={item.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-3 py-2 font-mono text-xs">{item.correlativo}</td>
                  <td className="px-3 py-2 text-xs">{item.remitente?.nombreORazonSocial ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{item.vehiculo?.placa ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{item.tipoMineral?.nombre ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ESTADO_LOTE_CLASS[item.estadoLote]}`}>
                      {ESTADO_LOTE_LABEL[item.estadoLote]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ESTADO_F101_CLASS[item.estadoFormulario101]}`}>
                      {ESTADO_F101_LABEL[item.estadoFormulario101]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{formatFecha(item.fechaDespachoReal)}</td>
                  <td className="px-3 py-2 text-xs">
                    <button type="button" onClick={() => setSelectedId(item.id)} className={buttonSecondaryClassName}>
                      <Search size={13} />
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {selectedId ? (
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          {loteDetalleQuery.isLoading ? (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando detalle del lote...</p>
          ) : lote ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-mono text-xl font-bold">{lote.correlativo}</h2>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                    {lote.remitente?.nombreORazonSocial} · {lote.vehiculo?.placa} · {lote.chofer?.nombre} ·{" "}
                    {lote.tipoMineral?.nombre} → {lote.destinoIngenio?.nombre}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${ESTADO_LOTE_CLASS[lote.estadoLote]}`}>
                    {ESTADO_LOTE_LABEL[lote.estadoLote]}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${ESTADO_F101_CLASS[lote.estadoFormulario101]}`}>
                    {ESTADO_F101_LABEL[lote.estadoFormulario101]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <p><span className="text-[var(--color-on-surface-variant)]">Despacho real:</span> {formatFecha(lote.fechaDespachoReal)}</p>
                <p><span className="text-[var(--color-on-surface-variant)]">Fecha fiscal:</span> {formatFecha(lote.fechaDocumentalFiscal)}</p>
                <p><span className="text-[var(--color-on-surface-variant)]">Código F101:</span> {lote.codigoFormulario101 ?? "Pendiente"}</p>
              </div>

              {lote.anulacion ? (
                <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/8 px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                  <span className="font-bold text-[var(--color-error)]">Lote anulado.</span> Motivo: {lote.anulacion.motivo}
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {lote.estadoFormulario101 === "PENDIENTE" ? (
                    <div className="flex items-end gap-2 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 p-3">
                      <div>
                        <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Regularizar Formulario 101</label>
                        <input value={f101Codigo} onChange={(e) => setF101Codigo(e.target.value)} className={inputClassName} placeholder="Código F101" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRegularizarF101(lote.id)}
                        disabled={regularizarF101Mutation.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                      >
                        <FileText size={13} /> Regularizar
                      </button>
                    </div>
                  ) : null}

                  {lote.estadoLote === "REGISTRADO" ? (
                    <button
                      type="button"
                      onClick={() => handleAvanzarEstado(lote.id, "EN_TRANSITO")}
                      disabled={avanzarEstadoMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                    >
                      <Send size={14} /> Marcar en tránsito
                    </button>
                  ) : null}

                  {lote.estadoLote === "EN_TRANSITO" ? (
                    <button
                      type="button"
                      onClick={() => handleAvanzarEstado(lote.id, "EN_BALANZA")}
                      disabled={avanzarEstadoMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                    >
                      <Scale size={14} /> Marcar en balanza
                    </button>
                  ) : null}

                  {lote.estadoLote === "EN_BALANZA" ? (
                    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border-soft)] p-3">
                      <div>
                        <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Tonelaje bruto</label>
                        <input type="number" min="0.01" step="0.01" value={tonelajeBruto} onChange={(e) => setTonelajeBruto(e.target.value)} className={`${inputClassName} w-32`} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Tara</label>
                        <input type="number" min="0" step="0.01" value={tonelajeTara} onChange={(e) => setTonelajeTara(e.target.value)} className={`${inputClassName} w-32`} />
                      </div>
                      <div className="px-2 text-sm text-[var(--color-on-surface-variant)]">
                        Neto: <span className="font-bold text-[var(--color-on-surface)]">{tonelajeNetoPreview !== null ? tonelajeNetoPreview.toFixed(2) : "-"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRegistrarPesaje(lote.id)}
                        disabled={registrarPesajeMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                      >
                        <CheckCircle2 size={14} /> Registrar pesaje
                      </button>
                    </div>
                  ) : null}

                  {lote.pesaje ? (
                    <div className="rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/8 px-3 py-2 text-xs">
                      Bruto {lote.pesaje.tonelajeBruto} · Tara {lote.pesaje.tonelajeTara} · Neto{" "}
                      <span className="font-bold">{lote.pesaje.tonelajeNeto}</span>
                    </div>
                  ) : null}

                  {lote.estadoLote !== "LIQUIDADO" && lote.estadoLote !== "ANULADO" ? (
                    <button
                      type="button"
                      onClick={() => handleAnular(lote.id)}
                      disabled={anularMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-error)]/45 px-4 py-2 text-sm font-semibold text-[var(--color-error)] disabled:opacity-50"
                    >
                      <Ban size={14} /> Anular lote
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">No se encontró el lote seleccionado.</p>
          )}
        </article>
      ) : null}
    </section>
  );
}
