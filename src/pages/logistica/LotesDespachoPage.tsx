import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileSpreadsheet,
  FileText,
  PackageSearch,
  Recycle,
  Scale,
  Search,
  Send,
  Truck,
  Upload,
  X
} from "lucide-react";
import {
  exportBoletaPesajeExcel,
  exportBoletaPesajePdf,
  exportConocimientoExcel,
  exportConocimientoPdf
} from "@/features/logisticaReportes/lib/logisticaExport";
import {
  useAnularLoteMutation,
  useAvanzarEstadoLoteMutation,
  useCreateLoteDespachoMutation,
  useImportarLotesHistoricoMutation,
  useLoteDespachoDetailQuery,
  useLotesDespachoQuery,
  useRegistrarCombustibleEntregadoMutation,
  useRegistrarPesajeMutation,
  useTransbordarLoteMutation,
  useUpdateLoteDespachoMutation
} from "@/features/loteDespacho/hooks/useLoteDespacho";
import type {
  EstadoLoteDespacho,
  LoteDespacho,
  ResultadoImportacionLotes,
  TipoCombustibleViaje
} from "@/features/loteDespacho/model/loteDespacho.schema";
import {
  useAnularFormulario101Mutation,
  useFormularios101Query,
  useMarcarPeticionEnviadaMutation,
  useReutilizarFormulario101Mutation,
  useVincularFormulario101Mutation
} from "@/features/formulario101/hooks/useFormulario101";
import {
  useIngeniosQuery,
  useMunicipiosOrigenQuery,
  useTiposMineralQuery
} from "@/features/parametrosLogistica/hooks/useParametrosLogistica";
import { useTransportistasQuery } from "@/features/transportista/hooks/useTransportistas";
import { useChoferesQuery, useVehiculosQuery } from "@/features/flota/hooks/useFlota";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] invalid:border-[var(--color-error)] invalid:ring-1 invalid:ring-[var(--color-error)]/30";

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

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

// timeZone: "UTC" es a propósito: estas fechas son calendario (medianoche
// UTC guardada desde un <input type="date">), no un instante — sin esto,
// un navegador en Bolivia (UTC-4) las corre un día para atrás al mostrarlas.
function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO", { timeZone: "UTC" });
}

function formatLitros(value: string | number | null | undefined) {
  return Number(value ?? 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// El pesaje (bruto/tara/neto) se guarda con 3 decimales en la base de datos
// (PesajeIngenio.tonelajeNeto @db.Decimal(10,3)) — a diferencia de
// formatLitros (2 decimales, para combustible en litros), esto es
// específicamente para toneladas.
function formatTonelaje(value: string | number | null | undefined) {
  return Number(value ?? 0).toLocaleString("es-BO", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function netoCalculado(bruto: string, tara: string) {
  if (bruto === "" || tara === "") return null;
  return Math.round((Number(bruto) - Number(tara)) * 1000) / 1000;
}

// Neto del pesaje: se llena solo con bruto − tara (3 decimales), pero se
// puede corregir a mano si el ticket de balanza dice otra cosa (a veces
// cambia algún decimal). `valor` null = automático.
function CampoNeto({
  bruto,
  tara,
  valor,
  onCambiar
}: {
  bruto: string;
  tara: string;
  valor: string | null;
  onCambiar: (valor: string | null) => void;
}) {
  const calculado = netoCalculado(bruto, tara);
  const mostrado = valor ?? (calculado !== null ? calculado.toFixed(3) : "");
  const corregido = valor !== null && valor !== "" && calculado !== null && Number(valor) !== calculado;
  return (
    <div>
      <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Neto (editable)</label>
      <input
        type="number"
        min="0.001"
        step="0.001"
        value={mostrado}
        onChange={(e) => onCambiar(e.target.value)}
        title="Se calcula solo (bruto − tara). Corrígelo si el ticket de balanza dice otro valor."
        className={`${inputClassName} w-32 font-bold ${corregido ? "border-[var(--color-warning)] ring-1 ring-[var(--color-warning)]" : ""}`}
      />
      {corregido && calculado !== null ? (
        <p className="mt-1 text-[11px] text-[var(--color-warning)]">
          Corregido a mano (calculado: {calculado.toFixed(3)}){" "}
          <button type="button" onClick={() => onCambiar(null)} className="font-semibold underline">
            usar calculado
          </button>
        </p>
      ) : null}
    </div>
  );
}

// Texto boilerplate del Conocimiento real ("Carga para Ingenio del sector
// Lipeña"), precargado y editable — así el usuario no tiene que escribirlo
// cada vez y el Conocimiento exportado no sale con la descripción vacía.
const DESCRIPCION_CONOCIMIENTO_DEFAULT = "Carga para Ingenio del sector Lipeña";

const LOTES_POR_PAGINA = 20;

// Año/mes/día LOCAL (Bolivia), nunca toISOString(): esa función convierte a
// UTC antes de recortar, así que entre las 20:00 y las 23:59 hora boliviana
// ya devolvía la fecha de MAÑANA.
function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Mismo patrón de overlay simple que otras pantallas de Logística (duplicado
// a propósito, no compartido, para no arriesgar pantallas ya estables).
function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-3xl rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container-highest)] hover:text-[var(--color-on-surface)]"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

// Modal para subir el "Cuadro de Envío de Carga Chami" en Excel y crear de
// una sola vez todos los lotes YA COMPLETADOS (pesados, con F101 vinculado)
// que trae — ver loteDespachoImport.parser.ts (backend) para el formato
// exacto esperado y qué se asume fijo (siempre Carga Chami / Chilcobija).
function ImportarHistoricoModal({ onClose }: { onClose: () => void }) {
  const { showError } = useToast();
  const importarMutation = useImportarLotesHistoricoMutation();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacionLotes | null>(null);

  function handleImportar() {
    if (!archivo) {
      showError("Elige primero el archivo Excel (.xls o .xlsx).");
      return;
    }
    importarMutation.mutate(archivo, {
      onSuccess: (response) => setResultado(response.data),
      onError: (error) => showError(normalizeError(error, "No se pudo importar el archivo."))
    });
  }

  return (
    <ModalShell onClose={onClose}>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <Upload size={16} className="text-[var(--color-primary)]" />
        Importar histórico desde Excel
      </h2>
      <p className="mb-4 text-sm text-[var(--color-on-surface-variant)]">
        Sube el "Cuadro de Envío de Carga Chami" (Mina Lipeña → Chilcobija) tal cual lo arma la
        empresa. Cada fila se crea ya <strong>Acopiada</strong>, con su pesaje (columna "Peso Kg",
        se interpreta directo como toneladas) y su Formulario 101 vinculado. El transportista debe
        existir ya en Logística/Flota con el nombre exacto de la columna "Propietario"; vehículo y
        chofer se crean solos si no existen todavía.
      </p>

      {!resultado ? (
        <div className="space-y-3">
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className={inputClassName}
          />
          <button
            type="button"
            onClick={handleImportar}
            disabled={importarMutation.isPending || !archivo}
            className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            {importarMutation.isPending ? "Importando..." : "Importar"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-lg border border-[var(--color-outline-variant)] p-2 text-center">
              <p className="text-lg font-extrabold">{resultado.procesadas}</p>
              <p className="text-[11px] text-[var(--color-on-surface-variant)]">Filas leídas</p>
            </div>
            <div className="rounded-lg border border-[var(--color-success)]/35 bg-[var(--color-success)]/8 p-2 text-center">
              <p className="text-lg font-extrabold text-[var(--color-success)]">{resultado.creadas}</p>
              <p className="text-[11px] text-[var(--color-on-surface-variant)]">Creadas</p>
            </div>
            <div className="rounded-lg border border-[var(--color-outline-variant)] p-2 text-center">
              <p className="text-lg font-extrabold">{resultado.omitidas}</p>
              <p className="text-[11px] text-[var(--color-on-surface-variant)]">Ya existían</p>
            </div>
            <div className="rounded-lg border border-[var(--color-error)]/35 bg-[var(--color-error)]/8 p-2 text-center">
              <p className="text-lg font-extrabold text-[var(--color-error)]">{resultado.errores}</p>
              <p className="text-[11px] text-[var(--color-on-surface-variant)]">Con error</p>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-[var(--color-outline-variant)]">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-[var(--color-surface-container-high)]">
                <tr className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th className="py-1 px-2">Fila</th>
                  <th className="py-1 px-2">Conocimiento</th>
                  <th className="py-1 px-2">Resultado</th>
                  <th className="py-1 px-2">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {resultado.resultados.map((r) => (
                  <tr key={r.fila}>
                    <td className="py-1 px-2">{r.fila}</td>
                    <td className="py-1 px-2 font-mono">{r.correlativo ?? "-"}</td>
                    <td className="py-1 px-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          r.accion === "creado"
                            ? "bg-[var(--color-success)]/18 text-[var(--color-success)]"
                            : r.accion === "omitido"
                              ? "bg-[var(--color-on-surface-variant)]/15 text-[var(--color-on-surface-variant)]"
                              : "bg-[var(--color-error)]/18 text-[var(--color-error)]"
                        }`}
                      >
                        {r.accion}
                      </span>
                    </td>
                    <td className="py-1 px-2">{r.mensaje}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setResultado(null);
                setArchivo(null);
              }}
              className={buttonSecondaryClassName}
            >
              Importar otro archivo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

type OpcionSelect = { id: string; label: string; searchText: string };

// Edita los datos de un lote ya creado (municipio, transportista, vehículo,
// chofer, mineral, ingenio, nivel, combustible, fecha, datos del
// Conocimiento y — si ya tiene pesaje registrado — bruto/tara) para
// corregir lo que se cargó mal a mano o por una importación masiva. No
// permite tocar el correlativo (es el número del documento físico).
function EditarLoteModal({
  lote,
  onClose,
  municipioOptions,
  transportistaOptions,
  vehiculoOptions,
  choferOptions,
  tipoMineralOptions,
  ingenioOptions
}: {
  lote: LoteDespacho;
  onClose: () => void;
  municipioOptions: OpcionSelect[];
  transportistaOptions: OpcionSelect[];
  vehiculoOptions: OpcionSelect[];
  choferOptions: OpcionSelect[];
  tipoMineralOptions: OpcionSelect[];
  ingenioOptions: OpcionSelect[];
}) {
  const { showError, showSuccess } = useToast();
  const updateMutation = useUpdateLoteDespachoMutation();

  const [municipioOrigenId, setMunicipioOrigenId] = useState(String(lote.municipioOrigenId));
  const [transportistaId, setTransportistaId] = useState(String(lote.transportistaId));
  const [vehiculoId, setVehiculoId] = useState(String(lote.vehiculoId));
  const [choferId, setChoferId] = useState(String(lote.choferId));
  const [tipoMineralId, setTipoMineralId] = useState(String(lote.tipoMineralId));
  const [destinoIngenioId, setDestinoIngenioId] = useState(String(lote.destinoIngenioId));
  const [nivel, setNivel] = useState(lote.nivel ?? "");
  const [incluyeCombustible, setIncluyeCombustible] = useState<TipoCombustibleViaje>(lote.incluyeCombustible);
  const [combustibleAsignadoLitros, setCombustibleAsignadoLitros] = useState(
    lote.combustibleAsignadoLitros != null ? String(lote.combustibleAsignadoLitros) : ""
  );
  const [fechaDespachoReal, setFechaDespachoReal] = useState(lote.fechaDespachoReal.slice(0, 10));
  // "27/10" -> 27. El mes sale siempre de la fecha de despacho.
  const numeroActual = /^(\d+)\//.exec(lote.correlativo)?.[1] ?? "";
  const [numeroCorrelativo, setNumeroCorrelativo] = useState(numeroActual);
  const mesCorrelativo = fechaDespachoReal.slice(5, 7);
  const [detalleCarga, setDetalleCarga] = useState(lote.conocimientoCarga?.detalleCarga ?? "Carga Chami");
  const [descripcion, setDescripcion] = useState(lote.conocimientoCarga?.descripcion ?? "");
  const [observaciones, setObservaciones] = useState(lote.conocimientoCarga?.observaciones ?? "");
  const [tonelajeBruto, setTonelajeBruto] = useState(lote.pesaje ? String(lote.pesaje.tonelajeBruto) : "");
  const [tonelajeTara, setTonelajeTara] = useState(lote.pesaje ? String(lote.pesaje.tonelajeTara) : "");

  // Si el neto guardado no es bruto − tara es porque se corrigió a mano: se
  // conserva como corrección para no perderlo al guardar otros cambios.
  const [tonelajeNetoManual, setTonelajeNetoManual] = useState<string | null>(() => {
    if (!lote.pesaje) return null;
    const guardado = Number(lote.pesaje.tonelajeNeto);
    const calculado = netoCalculado(String(lote.pesaje.tonelajeBruto), String(lote.pesaje.tonelajeTara));
    return calculado !== null && Math.abs(guardado - calculado) > 0.0005 ? guardado.toFixed(3) : null;
  });
  const tonelajeNetoFinal = tonelajeNetoManual ?? netoCalculado(tonelajeBruto, tonelajeTara)?.toFixed(3) ?? "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (incluyeCombustible === "CON_COMBUSTIBLE" && !combustibleAsignadoLitros) {
      showError("Indica cuántos litros de combustible se le asignan a este viaje.");
      return;
    }
    updateMutation.mutate(
      {
        id: lote.id,
        payload: {
          municipioOrigenId: Number(municipioOrigenId),
          transportistaId: Number(transportistaId),
          vehiculoId: Number(vehiculoId),
          choferId: Number(choferId),
          tipoMineralId: Number(tipoMineralId),
          destinoIngenioId: Number(destinoIngenioId),
          nivel: nivel.trim() || null,
          incluyeCombustible,
          combustibleAsignadoLitros:
            incluyeCombustible === "CON_COMBUSTIBLE" ? Number(combustibleAsignadoLitros) : null,
          fechaDespachoReal,
          ...(numeroCorrelativo && numeroCorrelativo !== numeroActual
            ? { numeroCorrelativo: Number(numeroCorrelativo) }
            : {}),
          detalleCarga: detalleCarga.trim() || undefined,
          descripcion: descripcion.trim() || null,
          observaciones: observaciones.trim() || null,
          ...(lote.pesaje
            ? {
                tonelajeBruto: Number(tonelajeBruto),
                tonelajeTara: Number(tonelajeTara),
                tonelajeNeto: Number(tonelajeNetoFinal)
              }
            : {})
        }
      },
      {
        onSuccess: (response) => {
          showSuccess(
            response.data.correlativo !== lote.correlativo
              ? `Lote ${lote.correlativo} actualizado, ahora es el N° ${response.data.correlativo}.`
              : `Lote ${lote.correlativo} actualizado.`
          );
          onClose();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar el lote."))
      }
    );
  }

  return (
    <ModalShell onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold">Editar lote {lote.correlativo}</h2>
      <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        <AutocompleteSelect value={municipioOrigenId} onChange={setMunicipioOrigenId} options={municipioOptions} placeholder="Municipio de origen..." className={inputClassName} />
        <AutocompleteSelect value={transportistaId} onChange={setTransportistaId} options={transportistaOptions} placeholder="Transportista..." className={inputClassName} />
        <AutocompleteSelect value={vehiculoId} onChange={setVehiculoId} options={vehiculoOptions} placeholder="Vehículo..." className={inputClassName} />
        <AutocompleteSelect value={choferId} onChange={setChoferId} options={choferOptions} placeholder="Chofer..." className={inputClassName} />
        <AutocompleteSelect value={tipoMineralId} onChange={setTipoMineralId} options={tipoMineralOptions} placeholder="Tipo de mineral..." className={inputClassName} />
        <AutocompleteSelect value={destinoIngenioId} onChange={setDestinoIngenioId} options={ingenioOptions} placeholder="Ingenio destino..." className={inputClassName} />
        <input value={nivel} onChange={(e) => setNivel(e.target.value)} className={inputClassName} placeholder="Nivel (opcional)" />
        <div>
          <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Fecha de despacho real</label>
          <input required type="date" value={fechaDespachoReal} onChange={(e) => setFechaDespachoReal(e.target.value)} className={inputClassName} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">N° de Conocimiento</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              step="1"
              value={numeroCorrelativo}
              onChange={(e) => setNumeroCorrelativo(e.target.value)}
              className={`${inputClassName} w-28 font-mono`}
            />
            <span className="font-mono text-sm">/{mesCorrelativo}</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">
            No puede repetir el de otro lote del mes ni saltarse la serie. Si cambias la fecha a otro mes y no tocas el N°, toma el siguiente libre de ese mes.
          </p>
        </div>
        <select
          value={incluyeCombustible}
          onChange={(e) => setIncluyeCombustible(e.target.value as TipoCombustibleViaje)}
          className={inputClassName}
        >
          <option value="SIN_COMBUSTIBLE">Sin combustible de la empresa</option>
          <option value="CON_COMBUSTIBLE">Con combustible de la empresa</option>
        </select>
        {incluyeCombustible === "CON_COMBUSTIBLE" ? (
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={combustibleAsignadoLitros}
            onChange={(e) => setCombustibleAsignadoLitros(e.target.value)}
            className={inputClassName}
            placeholder="Combustible asignado (litros)"
          />
        ) : null}
        <input value={detalleCarga} onChange={(e) => setDetalleCarga(e.target.value)} className={inputClassName} placeholder='Detalle de carga ("Con: ...")' />
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${inputClassName} sm:col-span-2`} placeholder="Descripción" />
        <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={`${inputClassName} sm:col-span-2`} placeholder="Observaciones (opcional)" />

        {lote.pesaje ? (
          <div className="space-y-2 rounded-lg border border-[var(--color-border-soft)] p-3 sm:col-span-2">
            <p className="flex items-center gap-1 text-xs font-semibold text-[var(--color-on-surface-variant)]">
              <Scale size={13} /> Pesaje ya registrado
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                step="0.001"
                value={tonelajeBruto}
                onChange={(e) => setTonelajeBruto(e.target.value)}
                className={`${inputClassName} w-32`}
                placeholder="Bruto"
              />
              <input
                type="number"
                step="0.001"
                value={tonelajeTara}
                onChange={(e) => setTonelajeTara(e.target.value)}
                className={`${inputClassName} w-32`}
                placeholder="Tara"
              />
              <CampoNeto bruto={tonelajeBruto} tara={tonelajeTara} valor={tonelajeNetoManual} onCambiar={setTonelajeNetoManual} />
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60 sm:col-span-2"
        >
          {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </ModalShell>
  );
}

export function LotesDespachoPage() {
  const { showError, showSuccess } = useToast();

  const hoy = useMemo(() => new Date(), []);
  const haceUnaSemana = useMemo(() => new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000), [hoy]);

  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState(isoDate(haceUnaSemana));
  const [filtroFechaFin, setFiltroFechaFin] = useState(isoDate(hoy));
  const [filtroConObservaciones, setFiltroConObservaciones] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [mostrarImportarModal, setMostrarImportarModal] = useState(false);

  // La búsqueda se manda al servidor (y se pagina sobre el resultado YA
  // filtrado) en vez de filtrar solo la página que ya está cargada en el
  // navegador — si no, un resultado que cae en otra página nunca aparecía.
  // Debounce para no disparar una consulta por cada tecla.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setBusquedaDebounced(busqueda.trim());
      setPagina(1);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [busqueda]);

  const lotesQuery = useLotesDespachoQuery({
    estadoLote: filtroEstado || undefined,
    fechaInicio: filtroFechaInicio || undefined,
    fechaFin: filtroFechaFin || undefined,
    search: busquedaDebounced || undefined,
    conObservaciones: filtroConObservaciones || undefined,
    page: pagina,
    limit: LOTES_POR_PAGINA
  });
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [mostrarEditarLote, setMostrarEditarLote] = useState(false);
  useEffect(() => setMostrarEditarLote(false), [selectedId]);
  const loteDetalleQuery = useLoteDespachoDetailQuery(selectedId);

  const municipiosQuery = useMunicipiosOrigenQuery();
  const tiposMineralQuery = useTiposMineralQuery();
  const ingeniosQuery = useIngeniosQuery();
  const transportistasQuery = useTransportistasQuery();
  const choferesQuery = useChoferesQuery();
  const vehiculosQuery = useVehiculosQuery();
  const f101DisponiblesQuery = useFormularios101Query({ estado: "DISPONIBLE" });

  const createMutation = useCreateLoteDespachoMutation();
  const avanzarEstadoMutation = useAvanzarEstadoLoteMutation();
  const registrarPesajeMutation = useRegistrarPesajeMutation();
  const registrarCombustibleEntregadoMutation = useRegistrarCombustibleEntregadoMutation();
  const anularMutation = useAnularLoteMutation();
  const transbordarMutation = useTransbordarLoteMutation();
  const vincularF101Mutation = useVincularFormulario101Mutation();
  const reutilizarF101Mutation = useReutilizarFormulario101Mutation();
  const anularF101Mutation = useAnularFormulario101Mutation();
  const peticionEnviadaMutation = useMarcarPeticionEnviadaMutation();

  const lotes = lotesQuery.data?.data ?? [];
  const metaLotes = lotesQuery.data?.meta;
  const totalPaginas = Math.max(metaLotes?.totalPages ?? 1, 1);

  function handleCambiarFiltroEstado(value: string) {
    setFiltroEstado(value);
    setPagina(1);
  }

  function handleCambiarFechaInicio(value: string) {
    setFiltroFechaInicio(value);
    setPagina(1);
  }

  function handleCambiarFechaFin(value: string) {
    setFiltroFechaFin(value);
    setPagina(1);
  }

  function handleToggleConObservaciones(value: boolean) {
    setFiltroConObservaciones(value);
    setPagina(1);
  }
  const lote = loteDetalleQuery.data?.data ?? null;
  const municipios = municipiosQuery.data?.data ?? [];
  const tiposMineral = tiposMineralQuery.data?.data ?? [];
  const ingenios = ingeniosQuery.data?.data ?? [];
  const transportistas = transportistasQuery.data?.data ?? [];
  const choferes = choferesQuery.data?.data ?? [];
  const f101Disponibles = f101DisponiblesQuery.data?.data ?? [];
  const vehiculosDisponibles = useMemo(
    () => (vehiculosQuery.data?.data ?? []).filter((v) => v.estadoActual === "DISPONIBLE"),
    [vehiculosQuery.data]
  );

  const municipioOptions = useMemo(
    () => municipios.map((m) => ({ id: String(m.id), label: m.nombre, searchText: m.codigo })),
    [municipios]
  );
  const transportistaOptions = useMemo(
    () => transportistas.map((r) => ({ id: String(r.id), label: r.nombreORazonSocial, searchText: r.nitOCi })),
    [transportistas]
  );
  const vehiculoDisponibleOptions = useMemo(
    () => vehiculosDisponibles.map((v) => ({ id: String(v.id), label: `${v.placa} · ${v.tipo}`, searchText: v.placa })),
    [vehiculosDisponibles]
  );
  // Para EDITAR un lote ya existente, a diferencia de crear uno nuevo, el
  // vehículo casi nunca está "Disponible" (ya está asignado a este mismo
  // lote) — por eso acá se listan TODOS, no solo los disponibles.
  const vehiculoOptions = useMemo(
    () => (vehiculosQuery.data?.data ?? []).map((v) => ({ id: String(v.id), label: `${v.placa} · ${v.tipo}`, searchText: v.placa })),
    [vehiculosQuery.data]
  );
  const choferOptions = useMemo(
    () => choferes.map((c) => ({ id: String(c.id), label: c.nombre, searchText: c.ci })),
    [choferes]
  );
  const tipoMineralOptions = useMemo(
    () => tiposMineral.map((t) => ({ id: String(t.id), label: t.nombre, searchText: t.codigo })),
    [tiposMineral]
  );
  const ingenioOptions = useMemo(
    () => ingenios.map((i) => ({ id: String(i.id), label: i.nombre, searchText: i.codigo })),
    [ingenios]
  );

  // --- Form: nuevo lote (+ Conocimiento) ---
  const [municipioOrigenId, setMunicipioOrigenId] = useState("");
  const [transportistaId, setTransportistaId] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [choferId, setChoferId] = useState("");
  const [tipoMineralId, setTipoMineralId] = useState("");
  const [destinoIngenioId, setDestinoIngenioId] = useState("");
  const [nivel, setNivel] = useState("");
  const [incluyeCombustible, setIncluyeCombustible] = useState<TipoCombustibleViaje>("SIN_COMBUSTIBLE");
  const [combustibleAsignadoLitros, setCombustibleAsignadoLitros] = useState("");
  const [fechaDespachoReal, setFechaDespachoReal] = useState("");
  const [fechaDocumentalFiscal, setFechaDocumentalFiscal] = useState("");
  const [detalleCarga, setDetalleCarga] = useState("Carga Chami");
  const [descripcionConocimiento, setDescripcionConocimiento] = useState(DESCRIPCION_CONOCIMIENTO_DEFAULT);
  const [observacionesConocimiento, setObservacionesConocimiento] = useState("");

  // --- Form: vincular / reutilizar Formulario 101 ---
  const [f101Codigo, setF101Codigo] = useState("");
  const [f101Fecha, setF101Fecha] = useState("");
  const [f101ReutilizarId, setF101ReutilizarId] = useState("");

  // --- Form: pesaje ---
  const [tonelajeBruto, setTonelajeBruto] = useState("");
  const [tonelajeTara, setTonelajeTara] = useState("");
  const [pesajeObservaciones, setPesajeObservaciones] = useState("");
  const [tonelajeNetoManual, setTonelajeNetoManual] = useState<string | null>(null);

  // --- Form: combustible entregado ---
  const [combustibleEntregadoLitros, setCombustibleEntregadoLitros] = useState("");

  // --- Form: transbordo ---
  const [transbordoVehiculoId, setTransbordoVehiculoId] = useState("");
  const [transbordoChoferId, setTransbordoChoferId] = useState("");
  const [transbordoMotivo, setTransbordoMotivo] = useState("");


  // El backend exige que la fecha del F101 coincida EXACTO con la del
  // Conocimiento (mismaFechaCalendario en formulario101.service.ts) — se
  // precarga para que el usuario no choque con ese error por defecto; si
  // el Municipio realmente puso otra fecha, la puede cambiar a mano.
  const loteTieneF101 = Boolean(lote?.formulario101);
  useEffect(() => {
    if (lote && !loteTieneF101 && lote.conocimientoCarga) {
      setF101Fecha(lote.conocimientoCarga.fecha.slice(0, 10));
    } else {
      setF101Fecha("");
    }
  }, [lote?.id, loteTieneF101, lote?.conocimientoCarga?.fecha]);

  function resetForm() {
    setMunicipioOrigenId("");
    setTransportistaId("");
    setVehiculoId("");
    setChoferId("");
    setTipoMineralId("");
    setDestinoIngenioId("");
    setNivel("");
    setIncluyeCombustible("SIN_COMBUSTIBLE");
    setCombustibleAsignadoLitros("");
    setFechaDespachoReal("");
    setFechaDocumentalFiscal("");
    setDetalleCarga("Carga Chami");
    setDescripcionConocimiento(DESCRIPCION_CONOCIMIENTO_DEFAULT);
    setObservacionesConocimiento("");
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!municipioOrigenId || !transportistaId || !vehiculoId || !choferId || !tipoMineralId || !destinoIngenioId) {
      showError("Elige municipio, transportista, vehículo, chofer, tipo de mineral e ingenio de las listas (no solo escribas texto).");
      return;
    }
    if (incluyeCombustible === "CON_COMBUSTIBLE" && !combustibleAsignadoLitros) {
      showError("Indica cuántos litros de combustible se le asignan a este viaje.");
      return;
    }
    createMutation.mutate(
      {
        municipioOrigenId: Number(municipioOrigenId),
        transportistaId: Number(transportistaId),
        vehiculoId: Number(vehiculoId),
        choferId: Number(choferId),
        tipoMineralId: Number(tipoMineralId),
        destinoIngenioId: Number(destinoIngenioId),
        nivel: nivel.trim() || undefined,
        incluyeCombustible,
        combustibleAsignadoLitros:
          incluyeCombustible === "CON_COMBUSTIBLE" ? Number(combustibleAsignadoLitros) : undefined,
        fechaDespachoReal,
        fechaDocumentalFiscal: fechaDocumentalFiscal || undefined,
        detalleCarga: detalleCarga.trim() || undefined,
        descripcion: descripcionConocimiento.trim() || undefined,
        observaciones: observacionesConocimiento.trim() || undefined
      },
      {
        onSuccess: (response) => {
          showSuccess(`Lote ${response.data.correlativo} registrado. Ya se puede vincular su Formulario 101.`);
          resetForm();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el lote."))
      }
    );
  }

  function handleVincularF101(loteId: string) {
    if (!f101Codigo.trim() || !f101Fecha) {
      showError("Ingresa el código y la fecha del Formulario 101.");
      return;
    }
    vincularF101Mutation.mutate(
      { loteId, payload: { codigo: f101Codigo.trim(), fecha: f101Fecha } },
      {
        onSuccess: () => {
          showSuccess("Formulario 101 vinculado.");
          setF101Codigo("");
          setF101Fecha("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo vincular el Formulario 101."))
      }
    );
  }

  function handleReutilizarF101(loteId: string) {
    if (!f101ReutilizarId) {
      showError("Elige qué Formulario 101 disponible quieres reutilizar.");
      return;
    }
    reutilizarF101Mutation.mutate(
      { id: f101ReutilizarId, payload: { loteId } },
      {
        onSuccess: () => {
          showSuccess("Formulario 101 reutilizado en este lote.");
          setF101ReutilizarId("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo reutilizar el Formulario 101."))
      }
    );
  }

  function handleAnularF101(id: string) {
    const motivo = window.prompt("Motivo de la anulación del Formulario 101 (también anula el lote/Conocimiento):");
    if (!motivo || !motivo.trim()) return;

    anularF101Mutation.mutate(
      { id, payload: { motivo: motivo.trim() } },
      {
        onSuccess: () => showSuccess("Formulario 101 anulado. Recuerda entregar la Petición de Anulación al Municipio."),
        onError: (error) => showError(normalizeError(error, "No se pudo anular el Formulario 101."))
      }
    );
  }

  function handlePeticionEnviada(id: string) {
    peticionEnviadaMutation.mutate(id, {
      onSuccess: () => showSuccess("Petición de anulación marcada como entregada."),
      onError: (error) => showError(normalizeError(error, "No se pudo actualizar la petición."))
    });
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
    const netoManual = tonelajeNetoManual !== null && tonelajeNetoManual !== "" ? Number(tonelajeNetoManual) : undefined;
    if (netoManual !== undefined && !(netoManual > 0)) {
      showError("El neto debe ser mayor a cero.");
      return;
    }
    registrarPesajeMutation.mutate(
      {
        id,
        payload: {
          tonelajeBruto: bruto,
          tonelajeTara: tara,
          tonelajeNeto: netoManual,
          observaciones: pesajeObservaciones.trim() || undefined
        }
      },
      {
        onSuccess: () => {
          showSuccess("Pesaje registrado. El lote pasó a Acopiado.");
          setTonelajeBruto("");
          setTonelajeTara("");
          setTonelajeNetoManual(null);
          setPesajeObservaciones("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el pesaje."))
      }
    );
  }

  function handleRegistrarCombustibleEntregado(id: string) {
    const litros = Number(combustibleEntregadoLitros);
    if (!combustibleEntregadoLitros || litros < 0) {
      showError("Indica cuántos litros se le entregaron realmente.");
      return;
    }
    registrarCombustibleEntregadoMutation.mutate(
      { id, payload: { combustibleEntregadoLitros: litros } },
      {
        onSuccess: () => {
          showSuccess("Combustible entregado registrado.");
          setCombustibleEntregadoLitros("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el combustible entregado."))
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

  function handleTransbordo(id: string) {
    if (!transbordoVehiculoId || !transbordoMotivo.trim()) {
      showError("Elige el vehículo que completa el traslado e indica el motivo.");
      return;
    }
    transbordarMutation.mutate(
      {
        id,
        payload: {
          vehiculoNuevoId: Number(transbordoVehiculoId),
          choferNuevoId: transbordoChoferId ? Number(transbordoChoferId) : undefined,
          motivo: transbordoMotivo.trim()
        }
      },
      {
        onSuccess: () => {
          showSuccess("Transbordo registrado: el nuevo vehículo continúa el traslado.");
          setTransbordoVehiculoId("");
          setTransbordoChoferId("");
          setTransbordoMotivo("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el transbordo."))
      }
    );
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
              <PackageSearch size={18} />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-extrabold">Lotes de Despacho</h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
                Registra el Conocimiento del despacho, vincula el Formulario 101 que responde el
                Municipio (su fecha debe coincidir con la del Conocimiento), avanza el estado del lote
                y registra el pesaje en balanza para dejarlo listo para Liquidación.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMostrarImportarModal(true)}
            className={buttonSecondaryClassName}
          >
            <Upload size={13} /> Importar histórico (Excel)
          </button>
        </div>
      </header>

      {mostrarImportarModal ? (
        <ImportarHistoricoModal onClose={() => setMostrarImportarModal(false)} />
      ) : null}

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Send size={16} className="text-[var(--color-primary)]" />
          Nuevo lote de despacho (Conocimiento)
        </h2>
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={handleCreate}>
          <AutocompleteSelect
            value={municipioOrigenId}
            onChange={setMunicipioOrigenId}
            options={municipioOptions}
            placeholder="Municipio de origen..."
            className={inputClassName}
          />
          <AutocompleteSelect
            value={transportistaId}
            onChange={setTransportistaId}
            options={transportistaOptions}
            placeholder="Transportista..."
            className={inputClassName}
          />
          <AutocompleteSelect
            value={vehiculoId}
            onChange={setVehiculoId}
            options={vehiculoDisponibleOptions}
            placeholder="Vehículo disponible..."
            className={inputClassName}
          />
          <AutocompleteSelect
            value={choferId}
            onChange={setChoferId}
            options={choferOptions}
            placeholder="Chofer..."
            className={inputClassName}
          />
          <AutocompleteSelect
            value={tipoMineralId}
            onChange={setTipoMineralId}
            options={tipoMineralOptions}
            placeholder="Tipo de mineral..."
            className={inputClassName}
          />
          <AutocompleteSelect
            value={destinoIngenioId}
            onChange={setDestinoIngenioId}
            options={ingenioOptions}
            placeholder="Ingenio destino..."
            className={inputClassName}
          />
          <input value={nivel} onChange={(e) => setNivel(e.target.value)} className={inputClassName} placeholder="Nivel (ej. 80, opcional)" />
          <select
            value={incluyeCombustible}
            onChange={(e) => setIncluyeCombustible(e.target.value as TipoCombustibleViaje)}
            className={inputClassName}
            title="¿La empresa puso el combustible de este viaje?"
          >
            <option value="SIN_COMBUSTIBLE">Sin combustible de la empresa</option>
            <option value="CON_COMBUSTIBLE">Con combustible de la empresa</option>
          </select>
          {incluyeCombustible === "CON_COMBUSTIBLE" ? (
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={combustibleAsignadoLitros}
              onChange={(e) => setCombustibleAsignadoLitros(e.target.value)}
              className={inputClassName}
              placeholder="Combustible asignado (litros)"
            />
          ) : null}
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Fecha de despacho real</label>
            <input required type="date" value={fechaDespachoReal} onChange={(e) => setFechaDespachoReal(e.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Fecha documental/fiscal (opcional)</label>
            <input type="date" value={fechaDocumentalFiscal} onChange={(e) => setFechaDocumentalFiscal(e.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
              Detalle de carga ("Con: ...")
            </label>
            <input value={detalleCarga} onChange={(e) => setDetalleCarga(e.target.value)} className={inputClassName} placeholder="Carga Chami" />
          </div>
          <input
            value={descripcionConocimiento}
            onChange={(e) => setDescripcionConocimiento(e.target.value)}
            className={`${inputClassName} lg:col-span-2`}
            placeholder='Descripción (ej. "7 TM Carga para Ingenio del sector Lipeña")'
          />
          <input
            value={observacionesConocimiento}
            onChange={(e) => setObservacionesConocimiento(e.target.value)}
            className={inputClassName}
            placeholder="Observaciones (opcional)"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60 lg:col-span-3"
          >
            {createMutation.isPending ? "Registrando..." : "Registrar lote y Conocimiento"}
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Lotes registrados</h2>
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            {(metaLotes?.total ?? lotes.length).toLocaleString("es-BO")} en total
          </span>
        </div>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Buscar</label>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
              />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className={`${inputClassName} pl-9`}
                placeholder="Busca en todos los lotes: correlativo, conocimiento, transportista, placa o F101"
              />
            </div>
          </div>
          <div className="w-full sm:w-52">
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => handleCambiarFiltroEstado(e.target.value)}
              className={inputClassName}
            >
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_LOTE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="w-[calc(50%-0.375rem)] sm:w-40">
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Desde</label>
            <input
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => handleCambiarFechaInicio(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="w-[calc(50%-0.375rem)] sm:w-40">
            <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Hasta</label>
            <input
              type="date"
              value={filtroFechaFin}
              onChange={(e) => handleCambiarFechaFin(e.target.value)}
              className={inputClassName}
            />
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-xs font-semibold text-[var(--color-on-surface-variant)]">
            <input
              type="checkbox"
              checked={filtroConObservaciones}
              onChange={(e) => handleToggleConObservaciones(e.target.checked)}
            />
            Con observaciones
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {["N° Lote / Conocimiento", "Transportista", "Vehículo", "Mineral", "Estado", "F101", "Fecha despacho", "Acciones"].map((title) => (
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
                  <td className="px-3 py-2 text-xs">{item.transportista?.nombreORazonSocial ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{item.vehiculo?.placa ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{item.tipoMineral?.nombre ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ESTADO_LOTE_CLASS[item.estadoLote]}`}>
                      {ESTADO_LOTE_LABEL[item.estadoLote]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        item.formulario101
                          ? "bg-[var(--color-success)]/18 text-[var(--color-success)]"
                          : "bg-[var(--color-warning)]/20 text-[var(--color-warning)]"
                      }`}
                    >
                      {item.formulario101 ? item.formulario101.codigo : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{formatFecha(item.fechaDespachoReal)}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setSelectedId(item.id)} className={buttonSecondaryClassName}>
                        <Search size={13} />
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => exportConocimientoPdf(item)}
                        className={buttonSecondaryClassName}
                        title="Imprimir Conocimiento (PDF)"
                      >
                        <FileDown size={13} /> Conocimiento
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            Página {metaLotes?.page ?? pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || lotesQuery.isFetching}
              className={buttonSecondaryClassName}
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || lotesQuery.isFetching}
              className={buttonSecondaryClassName}
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </article>

      {selectedId ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() => setSelectedId(undefined)}
        >
          <div
            className="relative my-8 w-full max-w-4xl rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedId(undefined)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container-highest)] hover:text-[var(--color-on-surface)]"
            >
              <X size={20} />
            </button>

          {loteDetalleQuery.isLoading ? (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando detalle del lote...</p>
          ) : lote ? (
            <div className="space-y-5 pr-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-mono text-xl font-bold">{lote.correlativo}</h2>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                    {lote.transportista?.nombreORazonSocial} · {lote.vehiculo?.placa} · {lote.chofer?.nombre} ·{" "}
                    {lote.tipoMineral?.nombre} → {lote.destinoIngenio?.nombre}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${ESTADO_LOTE_CLASS[lote.estadoLote]}`}>
                    {ESTADO_LOTE_LABEL[lote.estadoLote]}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/8 px-3 py-2">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <FileDown size={14} className="text-[var(--color-primary)]" /> Imprimir Conocimiento {lote.correlativo}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => exportConocimientoPdf(lote)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-on-primary)]">
                    <FileDown size={13} /> PDF
                  </button>
                  <button type="button" onClick={() => exportConocimientoExcel(lote)} className={buttonSecondaryClassName}>
                    <FileSpreadsheet size={13} /> Excel
                  </button>
                </div>
              </div>

              {lote.conocimientoCarga ? (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4 text-sm sm:grid-cols-2">
                  <p><span className="text-[var(--color-on-surface-variant)]">Fecha del Conocimiento:</span> {formatFecha(lote.conocimientoCarga.fecha)}</p>
                  <p><span className="text-[var(--color-on-surface-variant)]">Con:</span> {lote.conocimientoCarga.detalleCarga}</p>
                  <p>
                    <span className="text-[var(--color-on-surface-variant)]">Combustible:</span>{" "}
                    {lote.incluyeCombustible === "CON_COMBUSTIBLE" ? "Con combustible de la empresa" : "Sin combustible de la empresa"}
                  </p>
                  {lote.conocimientoCarga.descripcion ? (
                    <p className="sm:col-span-2"><span className="text-[var(--color-on-surface-variant)]">Descripción:</span> {lote.conocimientoCarga.descripcion}</p>
                  ) : null}
                  {lote.nivel ? <p><span className="text-[var(--color-on-surface-variant)]">Nivel:</span> {lote.nivel}</p> : null}
                  {lote.conocimientoCarga.observaciones ? (
                    <p className="sm:col-span-2"><span className="text-[var(--color-on-surface-variant)]">Observaciones:</span> {lote.conocimientoCarga.observaciones}</p>
                  ) : null}
                </div>
              ) : null}

              {lote.incluyeCombustible === "CON_COMBUSTIBLE" ? (
                <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4 text-sm">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
                    Combustible de la empresa
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <p><span className="text-[var(--color-on-surface-variant)]">Asignado:</span> {formatLitros(lote.combustibleAsignadoLitros)} L</p>
                    {lote.combustibleEntregadoLitros != null ? (
                      <>
                        <p><span className="text-[var(--color-on-surface-variant)]">Entregado:</span> {formatLitros(lote.combustibleEntregadoLitros)} L</p>
                        <p>
                          <span className="text-[var(--color-on-surface-variant)]">Sobrante:</span>{" "}
                          <span className="font-semibold">
                            {formatLitros(Number(lote.combustibleAsignadoLitros ?? 0) - Number(lote.combustibleEntregadoLitros))} L
                          </span>
                        </p>
                      </>
                    ) : null}
                  </div>
                  {lote.combustibleEntregadoLitros == null && lote.estadoLote !== "ANULADO" ? (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
                          Combustible entregado realmente (litros)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={combustibleEntregadoLitros}
                          onChange={(e) => setCombustibleEntregadoLitros(e.target.value)}
                          className={inputClassName}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRegistrarCombustibleEntregado(lote.id)}
                        disabled={registrarCombustibleEntregadoMutation.isPending}
                        className={buttonSecondaryClassName}
                      >
                        Registrar entregado
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {lote.anulacion ? (
                <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/8 px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                  <span className="font-bold text-[var(--color-error)]">Lote anulado.</span> Motivo: {lote.anulacion.motivo}
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {!lote.formulario101 ? (
                    <div className="w-full space-y-3 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 p-3">
                      <p className="flex items-center gap-1 text-xs font-semibold text-[var(--color-warning)]">
                        <FileText size={13} /> Vincular el Formulario 101 del Municipio (la fecha debe coincidir con la del Conocimiento)
                      </p>
                      <div className="flex flex-wrap items-end gap-2">
                        <input value={f101Codigo} onChange={(e) => setF101Codigo(e.target.value)} className={`${inputClassName} w-40`} placeholder="Código F101" />
                        <input type="date" value={f101Fecha} onChange={(e) => setF101Fecha(e.target.value)} className={`${inputClassName} w-44`} />
                        <button
                          type="button"
                          onClick={() => handleVincularF101(lote.id)}
                          disabled={vincularF101Mutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                        >
                          <FileText size={13} /> Vincular F101 nuevo
                        </button>
                      </div>
                      {f101Disponibles.length > 0 ? (
                        <div className="flex flex-wrap items-end gap-2 border-t border-[var(--color-warning)]/30 pt-3">
                          <select value={f101ReutilizarId} onChange={(e) => setF101ReutilizarId(e.target.value)} className={`${inputClassName} w-auto flex-1`}>
                            <option value="">O reutilizar uno disponible (válido 48h)...</option>
                            {f101Disponibles.map((f) => (
                              <option key={f.id} value={f.id}>{f.codigo} · {formatFecha(f.fecha)}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleReutilizarF101(lote.id)}
                            disabled={reutilizarF101Mutation.isPending}
                            className={buttonSecondaryClassName}
                          >
                            <Recycle size={13} /> Reutilizar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="w-full rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/8 p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          Formulario 101 <strong>{lote.formulario101.codigo}</strong> vinculado el {formatFecha(lote.formulario101.fecha)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAnularF101(lote.formulario101!.id)}
                          disabled={anularF101Mutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-error)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-error)]"
                        >
                          <Ban size={12} /> Anular F101 (y el lote)
                        </button>
                      </div>
                    </div>
                  )}

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
                    <>
                      <button
                        type="button"
                        onClick={() => handleAvanzarEstado(lote.id, "EN_BALANZA")}
                        disabled={avanzarEstadoMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
                      >
                        <Scale size={14} /> Marcar en balanza
                      </button>

                      <div className="w-full space-y-2 rounded-lg border border-[var(--color-border-soft)] p-3">
                        <p className="flex items-center gap-1 text-xs font-semibold text-[var(--color-on-surface-variant)]">
                          <Truck size={13} /> Transbordo (falla mecánica: otro vehículo completa el traslado)
                        </p>
                        <div className="flex flex-wrap items-end gap-2">
                          <AutocompleteSelect
                            value={transbordoVehiculoId}
                            onChange={setTransbordoVehiculoId}
                            options={vehiculoDisponibleOptions}
                            placeholder="Vehículo nuevo..."
                            className={`${inputClassName} w-40`}
                          />
                          <AutocompleteSelect
                            value={transbordoChoferId}
                            onChange={setTransbordoChoferId}
                            options={choferOptions}
                            placeholder="Chofer nuevo (opcional)"
                            className={`${inputClassName} w-40`}
                          />
                          <input value={transbordoMotivo} onChange={(e) => setTransbordoMotivo(e.target.value)} className={`${inputClassName} w-56`} placeholder="Motivo (ej. falla mecánica)" />
                          <button
                            type="button"
                            onClick={() => handleTransbordo(lote.id)}
                            disabled={transbordarMutation.isPending}
                            className={buttonSecondaryClassName}
                          >
                            <Truck size={13} /> Registrar transbordo
                          </button>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {lote.estadoLote === "EN_BALANZA" ? (
                    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border-soft)] p-3">
                      <div>
                        <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Tonelaje bruto</label>
                        <input type="number" min="0.001" step="0.001" value={tonelajeBruto} onChange={(e) => setTonelajeBruto(e.target.value)} className={`${inputClassName} w-32`} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Tara</label>
                        <input type="number" min="0" step="0.001" value={tonelajeTara} onChange={(e) => setTonelajeTara(e.target.value)} className={`${inputClassName} w-32`} />
                      </div>
                      <CampoNeto bruto={tonelajeBruto} tara={tonelajeTara} valor={tonelajeNetoManual} onCambiar={setTonelajeNetoManual} />
                      <input
                        value={pesajeObservaciones}
                        onChange={(e) => setPesajeObservaciones(e.target.value)}
                        className={`${inputClassName} w-48`}
                        placeholder="Observaciones (opcional)"
                      />
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
                    <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/8 px-3 py-2 text-xs">
                      <span>
                        Bruto {formatTonelaje(lote.pesaje.tonelajeBruto)} · Tara {formatTonelaje(lote.pesaje.tonelajeTara)} · Neto{" "}
                        <span className="font-bold">{formatTonelaje(lote.pesaje.tonelajeNeto)}</span>
                        {lote.pesaje.observaciones ? ` · ${lote.pesaje.observaciones}` : ""}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => exportBoletaPesajeExcel(lote)}
                          className={buttonSecondaryClassName}
                          title="Exportar Boleta de Pesaje a Excel"
                        >
                          <FileSpreadsheet size={13} /> Excel
                        </button>
                        <button
                          type="button"
                          onClick={() => exportBoletaPesajePdf(lote)}
                          className={buttonSecondaryClassName}
                          title="Exportar Boleta de Pesaje a PDF"
                        >
                          <FileDown size={13} /> PDF
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {lote.estadoLote !== "LIQUIDADO" && lote.estadoLote !== "ANULADO" ? (
                    <button
                      type="button"
                      onClick={() => setMostrarEditarLote(true)}
                      className={buttonSecondaryClassName}
                    >
                      Editar
                    </button>
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

              {mostrarEditarLote ? (
                <EditarLoteModal
                  lote={lote}
                  onClose={() => setMostrarEditarLote(false)}
                  municipioOptions={municipioOptions}
                  transportistaOptions={transportistaOptions}
                  vehiculoOptions={vehiculoOptions}
                  choferOptions={choferOptions}
                  tipoMineralOptions={tipoMineralOptions}
                  ingenioOptions={ingenioOptions}
                />
              ) : null}

              {lote.formulario101?.estado === "ANULADO" && lote.formulario101.anulacion && !lote.formulario101.anulacion.peticionEnviada ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/8 px-3 py-2 text-xs">
                  <span className="flex items-center gap-1 text-[var(--color-error)]">
                    <AlertTriangle size={13} /> Falta entregar al Municipio la Petición de Anulación de este Conocimiento.
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePeticionEnviada(lote.formulario101!.id)}
                    disabled={peticionEnviadaMutation.isPending}
                    className={buttonSecondaryClassName}
                  >
                    Marcar petición entregada
                  </button>
                </div>
              ) : null}

              {lote.transbordos && lote.transbordos.length > 0 ? (
                <div className="rounded-lg border border-[var(--color-border-soft)] p-3 text-xs">
                  <p className="mb-2 font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Historial de transbordos</p>
                  <div className="space-y-1">
                    {lote.transbordos.map((t) => (
                      <p key={t.id}>
                        {t.vehiculoOriginal?.placa} → {t.vehiculoNuevo?.placa}
                        {t.choferNuevo ? ` (chofer: ${t.choferNuevo.nombre})` : ""} — {t.motivo}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">No se encontró el lote seleccionado.</p>
          )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
