import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileDown,
  FileSpreadsheet,
  FileText,
  IdCard,
  Plus,
  Recycle,
  Save,
  Scale,
  Search,
  Send,
  Trash2,
  Truck,
  UserCog,
  UserPlus,
  X
} from "lucide-react";
import {
  useCambiarEstadoVehiculoMutation,
  useChoferesQuery,
  useCreateChoferMutation,
  useCreateVehiculoMutation,
  useVehiculosQuery
} from "@/features/flota/hooks/useFlota";
import type { EstadoVehiculo, Vehiculo } from "@/features/flota/model/flota.schema";
import {
  useAnularLoteMutation,
  useAvanzarEstadoLoteMutation,
  useCreateLoteDespachoMutation,
  useLoteDespachoDetailQuery,
  useLotesDespachoQuery,
  useRegistrarPesajeMutation,
  useTransbordarLoteMutation
} from "@/features/loteDespacho/hooks/useLoteDespacho";
import type { EstadoLoteDespacho } from "@/features/loteDespacho/model/loteDespacho.schema";
import {
  useAnularFormulario101Mutation,
  useFormularios101Query,
  useMarcarPeticionEnviadaMutation,
  useReutilizarFormulario101Mutation,
  useVincularFormulario101Mutation
} from "@/features/formulario101/hooks/useFormulario101";
import {
  exportBoletaPesajeExcel,
  exportBoletaPesajePdf,
  exportConocimientoExcel,
  exportConocimientoPdf
} from "@/features/logisticaReportes/lib/logisticaExport";
import {
  useIngeniosQuery,
  useMunicipiosOrigenQuery,
  useTiposMineralQuery
} from "@/features/parametrosLogistica/hooks/useParametrosLogistica";
import {
  useCreateTransportistaMutation,
  useDeleteTransportistaMutation,
  useTransportistasQuery,
  useUpdateTransportistaMutation
} from "@/features/transportista/hooks/useTransportistas";
import type { Transportista, TipoEntidadTransportista } from "@/features/transportista/model/transportista.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const buttonSecondaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

const TIPO_ENTIDAD_LABEL: Record<TipoEntidadTransportista, string> = {
  EMPRESA: "Empresa",
  TRABAJADOR_PARTICULAR: "Trabajador particular"
};

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO");
}

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
  LIQUIDADO: "bg-[var(--color-success)]/18 text-[var(--color-success)]",
  ANULADO: "bg-[var(--color-error)]/18 text-[var(--color-error)]"
};

// Estados de lote que ya no representan un envío activo — un vehículo con
// un lote en cualquier otro estado (REGISTRADO/EN_TRANSITO/EN_BALANZA)
// todavía tiene "algo pendiente" que gestionar desde su tarjeta.
const ESTADOS_LOTE_TERMINALES: EstadoLoteDespacho[] = ["ACOPIADO", "LIQUIDADO", "ANULADO"];

interface ColumnaEstilo {
  estado: EstadoVehiculo;
  label: string;
  badgeClass: string;
  accentBar: string;
  cardBg: string;
  cardBorder: string;
}

// Cada estado tiene su propio color: una franja sólida a la izquierda de la
// tarjeta (accentBar, a color completo — se nota en cualquier tema) más un
// tinte de fondo/borde. El intento anterior con clip-path + borde se veía
// roto porque el borde no sigue los cortes del recorte — se descartó.
const COLUMNAS: ColumnaEstilo[] = [
  {
    estado: "DISPONIBLE",
    label: "Disponible",
    badgeClass: "bg-[var(--color-success)]/18 text-[var(--color-success)]",
    accentBar: "bg-[var(--color-success)]",
    cardBg: "bg-[var(--color-success)]/12",
    cardBorder: "border-[var(--color-success)]/40"
  },
  {
    estado: "EN_TRANSITO",
    label: "En tránsito",
    badgeClass: "bg-[var(--color-primary)]/18 text-[var(--color-primary)]",
    accentBar: "bg-[var(--color-primary)]",
    cardBg: "bg-[var(--color-primary)]/12",
    cardBorder: "border-[var(--color-primary)]/40"
  },
  {
    estado: "EN_BALANZA",
    label: "En balanza",
    badgeClass: "bg-[var(--color-tertiary)]/18 text-[var(--color-tertiary)]",
    accentBar: "bg-[var(--color-tertiary)]",
    cardBg: "bg-[var(--color-tertiary)]/12",
    cardBorder: "border-[var(--color-tertiary)]/40"
  },
  {
    estado: "CON_FALLA_MECANICA",
    label: "Con falla mecánica",
    badgeClass: "bg-[var(--color-error)]/18 text-[var(--color-error)]",
    accentBar: "bg-[var(--color-error)]",
    cardBg: "bg-[var(--color-error)]/12",
    cardBorder: "border-[var(--color-error)]/40"
  },
  {
    estado: "EN_MANTENIMIENTO",
    label: "En mantenimiento",
    badgeClass: "bg-[var(--color-on-surface-variant)]/18 text-[var(--color-on-surface-variant)]",
    accentBar: "bg-[var(--color-on-surface-variant)]",
    cardBg: "bg-[var(--color-on-surface-variant)]/12",
    cardBorder: "border-[var(--color-on-surface-variant)]/40"
  }
];

const ALTURA_MAX_COLUMNA = 5;
const ALTO_APROX_TARJETA = 88;

const COLUMNA_LABEL: Record<EstadoVehiculo, string> = {
  DISPONIBLE: "Disponible",
  EN_TRANSITO: "En tránsito",
  EN_BALANZA: "En balanza",
  CON_FALLA_MECANICA: "Con falla mecánica",
  EN_MANTENIMIENTO: "En mantenimiento"
};

// Un vehículo con un lote activo (en tránsito o en balanza) es "gestionable":
// hacer clic (no arrastrar) en su tarjeta abre el modal con todo lo que se
// puede hacer con ese lote (F101, pesaje, transbordo, anular) sin salir de
// esta pantalla.
const ESTADOS_CON_LOTE_GESTIONABLE: EstadoVehiculo[] = ["EN_TRANSITO", "EN_BALANZA"];

function VehiculoCard({
  vehiculo,
  accentBar,
  cardBg,
  cardBorder,
  onGestionar
}: { vehiculo: Vehiculo; onGestionar?: (vehiculo: Vehiculo) => void } & Pick<
  ColumnaEstilo,
  "accentBar" | "cardBg" | "cardBorder"
>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(vehiculo.id)
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1
  };

  const esGestionable = onGestionar && ESTADOS_CON_LOTE_GESTIONABLE.includes(vehiculo.estadoActual);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (esGestionable) onGestionar!(vehiculo);
      }}
      className={`flex shrink-0 cursor-grab touch-none overflow-hidden rounded-lg border ${cardBorder} ${cardBg} active:cursor-grabbing`}
    >
      <div className={`w-1.5 shrink-0 ${accentBar}`} />
      <div className="flex flex-1 items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold uppercase leading-tight">{vehiculo.placa}</p>
          <p className="text-[10px] text-[var(--color-on-surface-variant)]">{vehiculo.tipo}</p>
          {vehiculo.propietario ? (
            <p className="mt-1.5 truncate text-[11px] text-[var(--color-on-surface-variant)]">
              {vehiculo.propietario.nombreORazonSocial}
            </p>
          ) : null}
          {esGestionable ? (
            <p className="mt-1 text-[10px] font-semibold text-[var(--color-primary)]">Toca para gestionar el lote →</p>
          ) : null}
        </div>
        <Truck size={16} className="shrink-0 text-[var(--color-on-surface-variant)]/50" />
      </div>
    </div>
  );
}

function FlotaColumn({
  estado,
  label,
  badgeClass,
  accentBar,
  cardBg,
  cardBorder,
  vehiculos,
  onGestionar
}: ColumnaEstilo & { vehiculos: Vehiculo[]; onGestionar: (vehiculo: Vehiculo) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });
  const [busqueda, setBusqueda] = useState("");

  const vehiculosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return vehiculos;
    return vehiculos.filter(
      (v) =>
        v.placa.toLowerCase().includes(term) ||
        (v.propietario?.nombreORazonSocial ?? "").toLowerCase().includes(term)
    );
  }, [vehiculos, busqueda]);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[220px] flex-col gap-2 rounded-xl border p-3 transition ${
        isOver
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
          : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]"
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
          {label}
        </span>
        <span className="text-xs text-[var(--color-on-surface-variant)]">{vehiculos.length}</span>
      </div>

      <div className="relative mb-1">
        <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por placa o transportista..."
          className="w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] py-1.5 pl-7 pr-2 text-[11px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <div
        className="flex flex-col gap-2 overflow-y-auto pr-0.5"
        style={{ maxHeight: ALTURA_MAX_COLUMNA * ALTO_APROX_TARJETA }}
      >
        {vehiculosFiltrados.map((vehiculo) => (
          <VehiculoCard
            key={vehiculo.id}
            vehiculo={vehiculo}
            accentBar={accentBar}
            cardBg={cardBg}
            cardBorder={cardBorder}
            onGestionar={onGestionar}
          />
        ))}
        {vehiculosFiltrados.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--color-border-soft)] p-3 text-center text-[11px] text-[var(--color-on-surface-variant)]">
            {vehiculos.length === 0 ? "Suelta aquí un vehículo" : "Sin resultados."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ModalShell({ children, onClose, maxWidthClassName = "max-w-2xl" }: { children: ReactNode; onClose: () => void; maxWidthClassName?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className={`relative my-8 w-full ${maxWidthClassName} rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl sm:p-6`}
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

// Se arrastra un vehículo de "Disponible" a "En tránsito": en vez de solo
// cambiar la bandera del vehículo (que no crea nada real), se abre este
// modal con el mismo formulario de "Nuevo lote de despacho" que ya existe en
// /logistica/lotes — el vehículo viene fijo (es el que arrastraste). Si se
// cierra sin guardar, no se llama a ningún mutation y la tarjeta vuelve sola
// a Disponible porque el tablero se dibuja a partir de los datos del
// servidor, que no cambiaron.
function CrearLoteModal({ vehiculo, onClose }: { vehiculo: Vehiculo; onClose: () => void }) {
  const { showError, showSuccess } = useToast();
  const municipiosQuery = useMunicipiosOrigenQuery();
  const tiposMineralQuery = useTiposMineralQuery();
  const ingeniosQuery = useIngeniosQuery();
  const transportistasQuery = useTransportistasQuery();
  const choferesQuery = useChoferesQuery();
  const createMutation = useCreateLoteDespachoMutation();
  const vincularF101Mutation = useVincularFormulario101Mutation();

  const municipios = municipiosQuery.data?.data ?? [];
  const tiposMineral = tiposMineralQuery.data?.data ?? [];
  const ingenios = ingeniosQuery.data?.data ?? [];
  const transportistas = transportistasQuery.data?.data ?? [];
  const choferes = choferesQuery.data?.data ?? [];

  const [municipioOrigenId, setMunicipioOrigenId] = useState("");
  const [transportistaId, setTransportistaId] = useState(vehiculo.propietario ? String(vehiculo.propietario.id) : "");
  const [choferId, setChoferId] = useState("");
  const [tipoMineralId, setTipoMineralId] = useState("");
  const [destinoIngenioId, setDestinoIngenioId] = useState("");
  const [nivel, setNivel] = useState("");
  const [fechaDespachoReal, setFechaDespachoReal] = useState(() => new Date().toISOString().slice(0, 10));
  const [detalleCarga, setDetalleCarga] = useState("Carga Chami");
  const [descripcion, setDescripcion] = useState("Carga para Ingenio del sector Lipeña");
  const [observaciones, setObservaciones] = useState("");
  const [f101Codigo, setF101Codigo] = useState("");
  const [f101Fecha, setF101Fecha] = useState("");

  const municipioOptions = useMemo(() => municipios.map((m) => ({ id: String(m.id), label: m.nombre, searchText: m.codigo })), [municipios]);
  const transportistaOptions = useMemo(
    () => transportistas.map((r) => ({ id: String(r.id), label: r.nombreORazonSocial, searchText: r.nitOCi })),
    [transportistas]
  );
  const choferOptions = useMemo(() => choferes.map((c) => ({ id: String(c.id), label: c.nombre, searchText: c.ci })), [choferes]);
  const tipoMineralOptions = useMemo(() => tiposMineral.map((t) => ({ id: String(t.id), label: t.nombre, searchText: t.codigo })), [tiposMineral]);
  const ingenioOptions = useMemo(() => ingenios.map((i) => ({ id: String(i.id), label: i.nombre, searchText: i.codigo })), [ingenios]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!municipioOrigenId || !transportistaId || !choferId || !tipoMineralId || !destinoIngenioId || !fechaDespachoReal) {
      showError("Completa municipio, transportista, chofer, tipo de mineral, ingenio y fecha de despacho.");
      return;
    }
    createMutation.mutate(
      {
        municipioOrigenId: Number(municipioOrigenId),
        transportistaId: Number(transportistaId),
        vehiculoId: vehiculo.id,
        choferId: Number(choferId),
        tipoMineralId: Number(tipoMineralId),
        destinoIngenioId: Number(destinoIngenioId),
        nivel: nivel.trim() || undefined,
        fechaDespachoReal,
        detalleCarga: detalleCarga.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        observaciones: observaciones.trim() || undefined
      },
      {
        onSuccess: (response) => {
          const finish = () => {
            showSuccess(`Lote ${response.data.correlativo} registrado. ${vehiculo.placa} ya está en tránsito.`);
            onClose();
          };
          // El F101 es opcional en este paso: si el Municipio todavía no lo
          // entregó, se puede agregar después haciendo clic en la tarjeta
          // mientras el vehículo esté "En tránsito".
          if (f101Codigo.trim()) {
            vincularF101Mutation.mutate(
              { loteId: response.data.id, payload: { codigo: f101Codigo.trim(), fecha: f101Fecha || fechaDespachoReal } },
              {
                onSuccess: finish,
                onError: (error) => {
                  showError(
                    normalizeError(
                      error,
                      "El lote se registró, pero no se pudo vincular el Formulario 101. Puedes agregarlo después haciendo clic en la tarjeta."
                    )
                  );
                  onClose();
                }
              }
            );
            return;
          }
          finish();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el lote."))
      }
    );
  }

  return (
    <ModalShell onClose={onClose}>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <Send size={16} className="text-[var(--color-primary)]" />
        Nuevo lote de despacho (Conocimiento)
      </h2>
      <p className="mb-4 text-sm text-[var(--color-on-surface-variant)]">
        Vehículo: <span className="font-mono font-bold uppercase">{vehiculo.placa}</span> · {vehiculo.tipo}
      </p>
      <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        <AutocompleteSelect value={municipioOrigenId} onChange={setMunicipioOrigenId} options={municipioOptions} placeholder="Municipio de origen..." className={inputClassName} />
        <AutocompleteSelect value={transportistaId} onChange={setTransportistaId} options={transportistaOptions} placeholder="Transportista..." className={inputClassName} />
        <AutocompleteSelect value={choferId} onChange={setChoferId} options={choferOptions} placeholder="Chofer..." className={inputClassName} />
        <AutocompleteSelect value={tipoMineralId} onChange={setTipoMineralId} options={tipoMineralOptions} placeholder="Tipo de mineral..." className={inputClassName} />
        <AutocompleteSelect value={destinoIngenioId} onChange={setDestinoIngenioId} options={ingenioOptions} placeholder="Ingenio destino..." className={inputClassName} />
        <input value={nivel} onChange={(e) => setNivel(e.target.value)} className={inputClassName} placeholder="Nivel (ej. 80, opcional)" />
        <div>
          <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Fecha de despacho real</label>
          <input required type="date" value={fechaDespachoReal} onChange={(e) => setFechaDespachoReal(e.target.value)} className={inputClassName} />
        </div>
        <input value={detalleCarga} onChange={(e) => setDetalleCarga(e.target.value)} className={inputClassName} placeholder='Detalle de carga ("Con: ...")' />
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${inputClassName} sm:col-span-2`} placeholder="Descripción" />
        <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={`${inputClassName} sm:col-span-2`} placeholder="Observaciones (opcional)" />

        <div className="space-y-2 rounded-lg border border-[var(--color-border-soft)] p-3 sm:col-span-2">
          <p className="flex items-center gap-1 text-xs font-semibold text-[var(--color-on-surface-variant)]">
            <FileText size={13} /> Formulario 101 (opcional, si el Municipio ya te lo entregó)
          </p>
          <div className="flex flex-wrap gap-2">
            <input value={f101Codigo} onChange={(e) => setF101Codigo(e.target.value)} className={`${inputClassName} w-40`} placeholder="Código F101" />
            <input type="date" value={f101Fecha} onChange={(e) => setF101Fecha(e.target.value)} className={`${inputClassName} w-44`} placeholder="Fecha F101" />
          </div>
          <p className="text-[10px] text-[var(--color-on-surface-variant)]">
            Si todavía no lo tienes, déjalo en blanco: podrás agregarlo después haciendo clic en la tarjeta del vehículo
            mientras esté "En tránsito".
          </p>
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending || vincularF101Mutation.isPending}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60 sm:col-span-2"
        >
          {createMutation.isPending || vincularF101Mutation.isPending ? "Registrando..." : "Registrar lote y Conocimiento"}
        </button>
      </form>
    </ModalShell>
  );
}

// Se arrastra un vehículo de "En tránsito" a "En balanza": en la vida real
// ese es el momento en que el ingenio pesa la carga y entrega la boleta de
// balanza — no un simple "marcar como en balanza" sin datos. Por eso este
// modal pide directamente el peso (como la boleta real) y, al guardar, hace
// las DOS llamadas al backend en secuencia (avanzar a EN_BALANZA y luego
// registrar el pesaje), dejando el lote en ACOPIADO y el vehículo libre de
// nuevo — por eso la tarjeta termina reapareciendo en "Disponible", que es
// lo correcto.
function RegistrarBalanzaModal({ vehiculo, onClose }: { vehiculo: Vehiculo; onClose: () => void }) {
  const { showError, showSuccess } = useToast();
  // No se filtra por estadoLote: al crear el lote solo se marca el
  // VEHÍCULO como "En tránsito" (Vehiculo.estadoActual), pero el LOTE en sí
  // arranca en "REGISTRADO" y todavía no pasó por avanzarEstado. Filtrar
  // aquí por EN_TRANSITO no encontraba nada y bloqueaba el paso a balanza.
  // Se trae todo lo reciente del vehículo y se elige el que aún no llegó a
  // un estado terminal (el único que puede estar "activo" a la vez).
  const loteActivoQuery = useLotesDespachoQuery({ vehiculoId: vehiculo.id, limit: 5 });
  const avanzarEstadoMutation = useAvanzarEstadoLoteMutation();
  const registrarPesajeMutation = useRegistrarPesajeMutation();

  const lote = useMemo(
    () => (loteActivoQuery.data?.data ?? []).find((l) => !ESTADOS_LOTE_TERMINALES.includes(l.estadoLote)),
    [loteActivoQuery.data]
  );
  const [tonelajeBruto, setTonelajeBruto] = useState("");
  const [tonelajeTara, setTonelajeTara] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const tonelajeNetoPreview = tonelajeBruto && tonelajeTara ? Number(tonelajeBruto) - Number(tonelajeTara) : null;
  const enviando = avanzarEstadoMutation.isPending || registrarPesajeMutation.isPending;

  async function handleConfirmar() {
    if (!lote) return;
    const bruto = Number(tonelajeBruto);
    const tara = Number(tonelajeTara);
    if (!bruto || tara < 0 || bruto <= tara) {
      showError("Verifica los valores de tonelaje: el bruto debe ser mayor al tara.");
      return;
    }

    try {
      // El lote puede estar en cualquiera de los 3 estados previos al
      // pesaje según si ya se había avanzado antes — se encadenan solo los
      // avanzarEstado que realmente faltan.
      if (lote.estadoLote === "REGISTRADO") {
        await avanzarEstadoMutation.mutateAsync({ id: lote.id, payload: { estado: "EN_TRANSITO" } });
        await avanzarEstadoMutation.mutateAsync({ id: lote.id, payload: { estado: "EN_BALANZA" } });
      } else if (lote.estadoLote === "EN_TRANSITO") {
        await avanzarEstadoMutation.mutateAsync({ id: lote.id, payload: { estado: "EN_BALANZA" } });
      }

      await registrarPesajeMutation.mutateAsync({
        id: lote.id,
        payload: { tonelajeBruto: bruto, tonelajeTara: tara, observaciones: observaciones.trim() || undefined }
      });

      showSuccess(`Pesaje registrado. ${vehiculo.placa} quedó Acopiado y el vehículo vuelve a estar disponible.`);
      onClose();
    } catch (error) {
      showError(normalizeError(error, "No se pudo registrar el pesaje."));
    }
  }

  return (
    <ModalShell onClose={onClose} maxWidthClassName="max-w-md">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <Scale size={16} className="text-[var(--color-primary)]" />
        Boleta de pesaje
      </h2>
      <p className="mb-4 text-sm text-[var(--color-on-surface-variant)]">
        Vehículo: <span className="font-mono font-bold uppercase">{vehiculo.placa}</span>
      </p>

      {loteActivoQuery.isLoading ? (
        <p className="text-sm text-[var(--color-on-surface-variant)]">Buscando el lote activo de este vehículo...</p>
      ) : !lote ? (
        <p className="text-sm text-[var(--color-error)]">
          No se encontró un lote activo para este vehículo. Puede que ya se haya anulado o completado.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-xs">
            Lote <span className="font-mono font-bold">{lote.correlativo}</span>
            {lote.tipoMineral ? ` · ${lote.tipoMineral.nombre}` : ""}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Tonelaje bruto</label>
              <input type="number" min="0.01" step="0.01" value={tonelajeBruto} onChange={(e) => setTonelajeBruto(e.target.value)} className={inputClassName} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Tara</label>
              <input type="number" min="0" step="0.01" value={tonelajeTara} onChange={(e) => setTonelajeTara(e.target.value)} className={inputClassName} />
            </div>
          </div>
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            Neto: <span className="font-bold text-[var(--color-on-surface)]">{tonelajeNetoPreview !== null ? tonelajeNetoPreview.toFixed(2) : "-"}</span>
          </p>
          <input
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className={inputClassName}
            placeholder="Observaciones (opcional)"
          />
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={enviando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            <CheckCircle2 size={14} /> {enviando ? "Guardando..." : "Registrar pesaje"}
          </button>
        </div>
      )}
    </ModalShell>
  );
}

// Cualquier otro arrastre (a falla mecánica, a mantenimiento, o hacia
// atrás) ya no es un simple cambio de bandera: se pide motivo con un
// formulario, igual que las otras dos transiciones especiales. Si el
// vehículo tenía un lote activo (en tránsito/balanza) y se manda a falla
// mecánica, se le avisa que probablemente lo que necesita es un Transbordo
// (que reasigna el lote a otro vehículo) en vez de solo mover la tarjeta.
function CambiarEstadoModal({
  vehiculo,
  estadoDestino,
  onClose
}: {
  vehiculo: Vehiculo;
  estadoDestino: EstadoVehiculo;
  onClose: () => void;
}) {
  const { showError, showSuccess } = useToast();
  const cambiarEstadoMutation = useCambiarEstadoVehiculoMutation();
  const [motivo, setMotivo] = useState("");

  const requiereMotivo = estadoDestino === "CON_FALLA_MECANICA" || estadoDestino === "EN_MANTENIMIENTO";
  const tieneLoteActivo = ESTADOS_CON_LOTE_GESTIONABLE.includes(vehiculo.estadoActual);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requiereMotivo && !motivo.trim()) {
      showError("Indica el motivo del cambio.");
      return;
    }
    cambiarEstadoMutation.mutate(
      { id: vehiculo.id, payload: { estado: estadoDestino, motivo: motivo.trim() || undefined } },
      {
        onSuccess: () => {
          showSuccess(`${vehiculo.placa} pasó a ${COLUMNA_LABEL[estadoDestino]}.`);
          onClose();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar el estado del vehículo."))
      }
    );
  }

  return (
    <ModalShell onClose={onClose} maxWidthClassName="max-w-md">
      <h2 className="mb-1 text-lg font-bold">Cambiar estado</h2>
      <p className="mb-4 text-sm text-[var(--color-on-surface-variant)]">
        <span className="font-mono font-bold uppercase">{vehiculo.placa}</span>: {COLUMNA_LABEL[vehiculo.estadoActual]} →{" "}
        {COLUMNA_LABEL[estadoDestino]}
      </p>

      {tieneLoteActivo && estadoDestino === "CON_FALLA_MECANICA" ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 p-3 text-xs">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
          <span>
            Este vehículo tiene un lote en curso. Si otro vehículo va a completar el traslado, cierra esto y usa{" "}
            <strong>Transbordo</strong> haciendo clic en la tarjeta, para que el envío no se pierda.
          </span>
        </div>
      ) : null}

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">
            Motivo{requiereMotivo ? "" : " (opcional)"}
          </label>
          <input
            required={requiereMotivo}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={inputClassName}
            placeholder={
              estadoDestino === "CON_FALLA_MECANICA"
                ? "Ej. falla en el motor"
                : estadoDestino === "EN_MANTENIMIENTO"
                  ? "Ej. mantenimiento preventivo"
                  : "Motivo del cambio (opcional)"
            }
          />
        </div>
        <button
          type="submit"
          disabled={cambiarEstadoMutation.isPending}
          className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
        >
          {cambiarEstadoMutation.isPending ? "Guardando..." : "Confirmar"}
        </button>
      </form>
    </ModalShell>
  );
}

// Se abre al hacer CLIC (no arrastrar) en una tarjeta "En tránsito" o "En
// balanza": busca el lote activo de ese vehículo y muestra todo lo que se
// puede hacer con él (F101, avanzar estado, transbordo, pesaje, anular,
// exportar Conocimiento/Boleta) — es un espejo del modal de detalle de
// /logistica/lotes, duplicado a propósito (no compartido) para no arriesgar
// esa pantalla ya estable.
function LoteActivoModal({ vehiculo, onClose }: { vehiculo: Vehiculo; onClose: () => void }) {
  const { showError, showSuccess } = useToast();

  const lotesQuery = useLotesDespachoQuery({ vehiculoId: vehiculo.id, limit: 5 });
  const loteResumen = useMemo(
    () => (lotesQuery.data?.data ?? []).find((l) => !ESTADOS_LOTE_TERMINALES.includes(l.estadoLote)),
    [lotesQuery.data]
  );
  const loteDetalleQuery = useLoteDespachoDetailQuery(loteResumen?.id);
  const lote = loteDetalleQuery.data?.data ?? null;

  const vehiculosQuery = useVehiculosQuery();
  const choferesQuery = useChoferesQuery();
  const f101DisponiblesQuery = useFormularios101Query({ estado: "DISPONIBLE" });

  const avanzarEstadoMutation = useAvanzarEstadoLoteMutation();
  const registrarPesajeMutation = useRegistrarPesajeMutation();
  const anularMutation = useAnularLoteMutation();
  const transbordarMutation = useTransbordarLoteMutation();
  const vincularF101Mutation = useVincularFormulario101Mutation();
  const reutilizarF101Mutation = useReutilizarFormulario101Mutation();
  const anularF101Mutation = useAnularFormulario101Mutation();
  const peticionEnviadaMutation = useMarcarPeticionEnviadaMutation();

  const f101Disponibles = f101DisponiblesQuery.data?.data ?? [];
  const vehiculosDisponibles = useMemo(
    () => (vehiculosQuery.data?.data ?? []).filter((v) => v.estadoActual === "DISPONIBLE"),
    [vehiculosQuery.data]
  );
  const choferes = choferesQuery.data?.data ?? [];

  const vehiculoDisponibleOptions = useMemo(
    () => vehiculosDisponibles.map((v) => ({ id: String(v.id), label: `${v.placa} · ${v.tipo}`, searchText: v.placa })),
    [vehiculosDisponibles]
  );
  const choferOptions = useMemo(() => choferes.map((c) => ({ id: String(c.id), label: c.nombre, searchText: c.ci })), [choferes]);

  const [f101Codigo, setF101Codigo] = useState("");
  const [f101Fecha, setF101Fecha] = useState("");
  const [f101ReutilizarId, setF101ReutilizarId] = useState("");
  const [tonelajeBruto, setTonelajeBruto] = useState("");
  const [tonelajeTara, setTonelajeTara] = useState("");
  const [pesajeObservaciones, setPesajeObservaciones] = useState("");
  const [transbordoVehiculoId, setTransbordoVehiculoId] = useState("");
  const [transbordoChoferId, setTransbordoChoferId] = useState("");
  const [transbordoMotivo, setTransbordoMotivo] = useState("");

  const tonelajeNetoPreview = tonelajeBruto && tonelajeTara ? Number(tonelajeBruto) - Number(tonelajeTara) : null;

  useEffect(() => {
    if (lote && !lote.formulario101 && lote.conocimientoCarga) {
      setF101Fecha(lote.conocimientoCarga.fecha.slice(0, 10));
    }
  }, [lote?.id, lote?.formulario101, lote?.conocimientoCarga?.fecha]);

  function handleVincularF101() {
    if (!lote) return;
    if (!f101Codigo.trim() || !f101Fecha) {
      showError("Ingresa el código y la fecha del Formulario 101.");
      return;
    }
    vincularF101Mutation.mutate(
      { loteId: lote.id, payload: { codigo: f101Codigo.trim(), fecha: f101Fecha } },
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

  function handleReutilizarF101() {
    if (!lote) return;
    if (!f101ReutilizarId) {
      showError("Elige qué Formulario 101 disponible quieres reutilizar.");
      return;
    }
    reutilizarF101Mutation.mutate(
      { id: f101ReutilizarId, payload: { loteId: lote.id } },
      {
        onSuccess: () => {
          showSuccess("Formulario 101 reutilizado en este lote.");
          setF101ReutilizarId("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo reutilizar el Formulario 101."))
      }
    );
  }

  function handleAnularF101() {
    if (!lote?.formulario101) return;
    const motivo = window.prompt("Motivo de la anulación del Formulario 101 (también anula el lote/Conocimiento):");
    if (!motivo || !motivo.trim()) return;
    anularF101Mutation.mutate(
      { id: lote.formulario101.id, payload: { motivo: motivo.trim() } },
      {
        onSuccess: () => showSuccess("Formulario 101 anulado. Recuerda entregar la Petición de Anulación al Municipio."),
        onError: (error) => showError(normalizeError(error, "No se pudo anular el Formulario 101."))
      }
    );
  }

  function handlePeticionEnviada() {
    if (!lote?.formulario101) return;
    peticionEnviadaMutation.mutate(lote.formulario101.id, {
      onSuccess: () => showSuccess("Petición de anulación marcada como entregada."),
      onError: (error) => showError(normalizeError(error, "No se pudo actualizar la petición."))
    });
  }

  function handleAvanzarEstado(estado: "EN_TRANSITO" | "EN_BALANZA") {
    if (!lote) return;
    avanzarEstadoMutation.mutate(
      { id: lote.id, payload: { estado } },
      {
        onSuccess: () => showSuccess("Estado del lote actualizado."),
        onError: (error) => showError(normalizeError(error, "No se pudo actualizar el estado del lote."))
      }
    );
  }

  function handleRegistrarPesaje() {
    if (!lote) return;
    const bruto = Number(tonelajeBruto);
    const tara = Number(tonelajeTara);
    if (!bruto || tara < 0 || bruto <= tara) {
      showError("Verifica los valores de tonelaje: el bruto debe ser mayor al tara.");
      return;
    }
    registrarPesajeMutation.mutate(
      { id: lote.id, payload: { tonelajeBruto: bruto, tonelajeTara: tara, observaciones: pesajeObservaciones.trim() || undefined } },
      {
        onSuccess: () => {
          showSuccess("Pesaje registrado. El lote pasó a Acopiado y el vehículo vuelve a estar disponible.");
          setTonelajeBruto("");
          setTonelajeTara("");
          setPesajeObservaciones("");
          onClose();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el pesaje."))
      }
    );
  }

  function handleAnular() {
    if (!lote) return;
    const motivo = window.prompt("Motivo de la anulación del lote:");
    if (!motivo || !motivo.trim()) return;
    anularMutation.mutate(
      { id: lote.id, payload: { motivo: motivo.trim() } },
      {
        onSuccess: () => {
          showSuccess("Lote anulado.");
          onClose();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo anular el lote."))
      }
    );
  }

  function handleTransbordo() {
    if (!lote) return;
    if (!transbordoVehiculoId || !transbordoMotivo.trim()) {
      showError("Elige el vehículo que completa el traslado e indica el motivo.");
      return;
    }
    transbordarMutation.mutate(
      {
        id: lote.id,
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
          onClose();
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el transbordo."))
      }
    );
  }

  return (
    <ModalShell onClose={onClose} maxWidthClassName="max-w-3xl">
      {lotesQuery.isLoading || loteDetalleQuery.isLoading ? (
        <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando el lote activo de este vehículo...</p>
      ) : !lote ? (
        <p className="text-sm text-[var(--color-error)]">
          No se encontró un lote activo para este vehículo. Puede que ya se haya anulado o completado.
        </p>
      ) : (
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
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                  lote.formulario101
                    ? "bg-[var(--color-success)]/18 text-[var(--color-success)]"
                    : "bg-[var(--color-warning)]/20 text-[var(--color-warning)]"
                }`}
              >
                {lote.formulario101 ? `F101 ${lote.formulario101.codigo}` : "F101 pendiente"}
              </span>
              <button type="button" onClick={() => exportConocimientoExcel(lote)} className={buttonSecondaryClassName} title="Exportar Conocimiento a Excel">
                <FileSpreadsheet size={13} /> Excel
              </button>
              <button type="button" onClick={() => exportConocimientoPdf(lote)} className={buttonSecondaryClassName} title="Exportar Conocimiento a PDF">
                <FileDown size={13} /> PDF
              </button>
            </div>
          </div>

          {lote.conocimientoCarga ? (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4 text-sm sm:grid-cols-2">
              <p><span className="text-[var(--color-on-surface-variant)]">Fecha del Conocimiento:</span> {formatFecha(lote.conocimientoCarga.fecha)}</p>
              <p><span className="text-[var(--color-on-surface-variant)]">Con:</span> {lote.conocimientoCarga.detalleCarga}</p>
              {lote.conocimientoCarga.descripcion ? (
                <p className="sm:col-span-2"><span className="text-[var(--color-on-surface-variant)]">Descripción:</span> {lote.conocimientoCarga.descripcion}</p>
              ) : null}
              {lote.nivel ? <p><span className="text-[var(--color-on-surface-variant)]">Nivel:</span> {lote.nivel}</p> : null}
              {lote.conocimientoCarga.observaciones ? (
                <p className="sm:col-span-2"><span className="text-[var(--color-on-surface-variant)]">Observaciones:</span> {lote.conocimientoCarga.observaciones}</p>
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
                      onClick={handleVincularF101}
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
                      <button type="button" onClick={handleReutilizarF101} disabled={reutilizarF101Mutation.isPending} className={buttonSecondaryClassName}>
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
                      onClick={handleAnularF101}
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
                  onClick={() => handleAvanzarEstado("EN_TRANSITO")}
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
                    onClick={() => handleAvanzarEstado("EN_BALANZA")}
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
                      <button type="button" onClick={handleTransbordo} disabled={transbordarMutation.isPending} className={buttonSecondaryClassName}>
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
                    <input type="number" min="0.01" step="0.01" value={tonelajeBruto} onChange={(e) => setTonelajeBruto(e.target.value)} className={`${inputClassName} w-32`} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Tara</label>
                    <input type="number" min="0" step="0.01" value={tonelajeTara} onChange={(e) => setTonelajeTara(e.target.value)} className={`${inputClassName} w-32`} />
                  </div>
                  <div className="px-2 text-sm text-[var(--color-on-surface-variant)]">
                    Neto: <span className="font-bold text-[var(--color-on-surface)]">{tonelajeNetoPreview !== null ? tonelajeNetoPreview.toFixed(2) : "-"}</span>
                  </div>
                  <input value={pesajeObservaciones} onChange={(e) => setPesajeObservaciones(e.target.value)} className={`${inputClassName} w-48`} placeholder="Observaciones (opcional)" />
                  <button
                    type="button"
                    onClick={handleRegistrarPesaje}
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
                    Bruto {lote.pesaje.tonelajeBruto} · Tara {lote.pesaje.tonelajeTara} · Neto{" "}
                    <span className="font-bold">{lote.pesaje.tonelajeNeto}</span>
                    {lote.pesaje.observaciones ? ` · ${lote.pesaje.observaciones}` : ""}
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => exportBoletaPesajeExcel(lote)} className={buttonSecondaryClassName} title="Exportar Boleta de Pesaje a Excel">
                      <FileSpreadsheet size={13} /> Excel
                    </button>
                    <button type="button" onClick={() => exportBoletaPesajePdf(lote)} className={buttonSecondaryClassName} title="Exportar Boleta de Pesaje a PDF">
                      <FileDown size={13} /> PDF
                    </button>
                  </div>
                </div>
              ) : null}

              {lote.estadoLote !== "LIQUIDADO" && lote.estadoLote !== "ANULADO" ? (
                <button
                  type="button"
                  onClick={handleAnular}
                  disabled={anularMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-error)]/45 px-4 py-2 text-sm font-semibold text-[var(--color-error)] disabled:opacity-50"
                >
                  <Ban size={14} /> Anular lote
                </button>
              ) : null}
            </div>
          )}

          {lote.formulario101?.estado === "ANULADO" && lote.formulario101.anulacion && !lote.formulario101.anulacion.peticionEnviada ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/8 px-3 py-2 text-xs">
              <span className="flex items-center gap-1 text-[var(--color-error)]">
                <AlertTriangle size={13} /> Falta entregar al Municipio la Petición de Anulación de este Conocimiento.
              </span>
              <button type="button" onClick={handlePeticionEnviada} disabled={peticionEnviadaMutation.isPending} className={buttonSecondaryClassName}>
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
                    {t.choferNuevo ? ` · Chofer: ${t.choferNuevo.nombre}` : ""} · {t.motivo}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </ModalShell>
  );
}

function TransportistasSection() {
  const { showError, showSuccess } = useToast();
  const transportistasQuery = useTransportistasQuery();
  const createMutation = useCreateTransportistaMutation();
  const updateMutation = useUpdateTransportistaMutation();
  const deleteMutation = useDeleteTransportistaMutation();

  const transportistas = transportistasQuery.data?.data ?? [];

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 8;

  const [tipoEntidad, setTipoEntidad] = useState<TipoEntidadTransportista>("EMPRESA");
  const [nombreORazonSocial, setNombreORazonSocial] = useState("");
  const [nitOCi, setNitOCi] = useState("");
  const [banco, setBanco] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");

  const transportistasFiltrados = useMemo(
    () =>
      transportistas.filter(
        (item) =>
          item.nombreORazonSocial.toLowerCase().includes(search.toLowerCase()) ||
          item.nitOCi.toLowerCase().includes(search.toLowerCase())
      ),
    [transportistas, search]
  );
  const totalPaginas = Math.max(Math.ceil(transportistasFiltrados.length / POR_PAGINA), 1);
  const paginaActual = Math.min(pagina, totalPaginas);
  const transportistasPagina = transportistasFiltrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );

  function handleCambiarSearch(value: string) {
    setSearch(value);
    setPagina(1);
  }

  function resetForm() {
    setTipoEntidad("EMPRESA");
    setNombreORazonSocial("");
    setNitOCi("");
    setBanco("");
    setNumeroCuenta("");
    setEditingId(null);
  }

  function startEdit(item: Transportista) {
    setEditingId(item.id);
    setTipoEntidad(item.tipoEntidad);
    setNombreORazonSocial(item.nombreORazonSocial);
    setNitOCi(item.nitOCi);
    setBanco(item.banco ?? "");
    setNumeroCuenta(item.numeroCuenta ?? "");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      tipoEntidad,
      nombreORazonSocial: nombreORazonSocial.trim(),
      nitOCi: nitOCi.trim(),
      banco: banco.trim() || null,
      numeroCuenta: numeroCuenta.trim() || null
    };

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, payload },
        {
          onSuccess: () => {
            showSuccess("Transportista actualizado.");
            resetForm();
          },
          onError: (error) => showError(normalizeError(error, "No se pudo actualizar el transportista."))
        }
      );
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        showSuccess("Transportista creado correctamente.");
        resetForm();
      },
      onError: (error) => showError(normalizeError(error, "No se pudo crear el transportista."))
    });
  }

  function handleDelete(item: Transportista) {
    const confirmed = window.confirm(`¿Eliminar "${item.nombreORazonSocial}"?`);
    if (!confirmed) return;

    deleteMutation.mutate(item.id, {
      onSuccess: () => showSuccess("Transportista eliminado."),
      onError: (error) => showError(normalizeError(error, "No se pudo eliminar el transportista."))
    });
  }

  return (
    <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Building2 size={16} className="text-[var(--color-primary)]" />
          Transportistas
        </h2>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
        Empresas (con una o varias volquetas) o trabajadores particulares (unipersonales) que
        prestan el servicio de transporte y son dueños de los vehículos — distinto del ingenio al
        que se despacha el mineral.
      </p>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          {editingId ? <Edit3 size={14} className="text-[var(--color-primary)]" /> : <UserPlus size={14} className="text-[var(--color-primary)]" />}
          {editingId ? "Editar transportista" : "Nuevo transportista"}
        </h3>
        {editingId ? (
          <button type="button" onClick={resetForm} className={buttonSecondaryClassName}>
            <X size={14} />
            Cancelar edición
          </button>
        ) : null}
      </div>

      <form className="grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={handleSubmit}>
        <select
          value={tipoEntidad}
          onChange={(event) => setTipoEntidad(event.target.value as TipoEntidadTransportista)}
          className={inputClassName}
        >
          <option value="EMPRESA">Empresa</option>
          <option value="TRABAJADOR_PARTICULAR">Trabajador particular (unipersonal)</option>
        </select>
        <input
          required
          value={nombreORazonSocial}
          onChange={(event) => setNombreORazonSocial(event.target.value)}
          className={inputClassName}
          placeholder="Nombre o razón social"
        />
        <input
          required
          value={nitOCi}
          onChange={(event) => setNitOCi(event.target.value)}
          className={inputClassName}
          placeholder="NIT o CI"
        />
        <input
          value={banco}
          onChange={(event) => setBanco(event.target.value)}
          className={inputClassName}
          placeholder="Banco (opcional, para la liquidación)"
        />
        <input
          value={numeroCuenta}
          onChange={(event) => setNumeroCuenta(event.target.value)}
          className={inputClassName}
          placeholder="Número de cuenta (opcional)"
        />
        <div className="lg:col-span-3">
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            <Save size={14} />
            {editingId
              ? updateMutation.isPending
                ? "Guardando..."
                : "Guardar cambios"
              : createMutation.isPending
                ? "Guardando..."
                : "Crear transportista"}
          </button>
        </div>
      </form>

      <div className="relative my-4">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
        />
        <input
          value={search}
          onChange={(event) => handleCambiarSearch(event.target.value)}
          className={`${inputClassName} pl-9`}
          placeholder="Buscar por nombre o NIT/CI"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {["Tipo", "Nombre / Razón social", "NIT / CI", "Estado", "Acciones"].map((title) => (
                <th
                  key={title}
                  className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]"
                >
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-soft)]">
            {transportistasQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
                  Cargando transportistas...
                </td>
              </tr>
            ) : null}
            {!transportistasQuery.isLoading && transportistasFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
                  No se encontraron transportistas.
                </td>
              </tr>
            ) : null}
            {transportistasPagina.map((item) => (
              <tr key={item.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                <td className="px-3 py-2 text-xs">{TIPO_ENTIDAD_LABEL[item.tipoEntidad]}</td>
                <td className="px-3 py-2 text-xs font-semibold">
                  {item.nombreORazonSocial}
                  {item.banco || item.numeroCuenta ? (
                    <p className="mt-0.5 font-normal text-[10px] text-[var(--color-on-surface-variant)]">
                      {item.banco ?? "-"} {item.numeroCuenta ? `· Cta. ${item.numeroCuenta}` : ""}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs">{item.nitOCi}</td>
                <td className="px-3 py-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      item.activo
                        ? "bg-[var(--color-success)]/18 text-[var(--color-success)]"
                        : "bg-[var(--color-on-surface-variant)]/15 text-[var(--color-on-surface-variant)]"
                    }`}
                  >
                    {item.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => startEdit(item)} className={buttonSecondaryClassName}>
                      <Edit3 size={13} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-error)]/45 px-3 py-2 text-xs font-semibold text-[var(--color-error)] disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transportistasFiltrados.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            Página {paginaActual} de {totalPaginas} · {transportistasFiltrados.length} transportista
            {transportistasFiltrados.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaActual <= 1}
              className={buttonSecondaryClassName}
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual >= totalPaginas}
              className={buttonSecondaryClassName}
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function FlotaPage() {
  const { showError, showSuccess } = useToast();
  const vehiculosQuery = useVehiculosQuery();
  const transportistasQuery = useTransportistasQuery();
  const choferesQuery = useChoferesQuery();
  const createVehiculoMutation = useCreateVehiculoMutation();
  const createChoferMutation = useCreateChoferMutation();

  const vehiculos = vehiculosQuery.data?.data ?? [];
  const transportistas = transportistasQuery.data?.data ?? [];
  const choferes = choferesQuery.data?.data ?? [];

  const [loteModalVehiculo, setLoteModalVehiculo] = useState<Vehiculo | null>(null);
  const [balanzaModalVehiculo, setBalanzaModalVehiculo] = useState<Vehiculo | null>(null);
  const [estadoModal, setEstadoModal] = useState<{ vehiculo: Vehiculo; estadoDestino: EstadoVehiculo } | null>(null);
  const [gestionModalVehiculo, setGestionModalVehiculo] = useState<Vehiculo | null>(null);

  const [busquedaChofer, setBusquedaChofer] = useState("");
  const [paginaChofer, setPaginaChofer] = useState(1);
  const CHOFERES_POR_PAGINA = 6;
  const choferesFiltrados = useMemo(() => {
    const term = busquedaChofer.trim().toLowerCase();
    if (!term) return choferes;
    return choferes.filter((c) => c.nombre.toLowerCase().includes(term) || c.ci.toLowerCase().includes(term));
  }, [choferes, busquedaChofer]);
  const totalPaginasChofer = Math.max(Math.ceil(choferesFiltrados.length / CHOFERES_POR_PAGINA), 1);
  const paginaChoferActual = Math.min(paginaChofer, totalPaginasChofer);
  const choferesPagina = choferesFiltrados.slice(
    (paginaChoferActual - 1) * CHOFERES_POR_PAGINA,
    paginaChoferActual * CHOFERES_POR_PAGINA
  );

  const [placa, setPlaca] = useState("");
  const [tipo, setTipo] = useState("");
  const [capacidadTon, setCapacidadTon] = useState("");
  const [propietarioId, setPropietarioId] = useState("");

  const [choferNombre, setChoferNombre] = useState("");
  const [choferCi, setChoferCi] = useState("");
  const [choferLicencia, setChoferLicencia] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const vehiculosPorEstado = useMemo(() => {
    const grupos = new Map<EstadoVehiculo, Vehiculo[]>();
    for (const columna of COLUMNAS) grupos.set(columna.estado, []);
    for (const vehiculo of vehiculos) {
      grupos.get(vehiculo.estadoActual)?.push(vehiculo);
    }
    return grupos;
  }, [vehiculos]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const vehiculoId = Number(active.id);
    const nuevoEstado = over.id as EstadoVehiculo;
    const vehiculo = vehiculos.find((v) => v.id === vehiculoId);
    if (!vehiculo || vehiculo.estadoActual === nuevoEstado) return;

    // Estas dos transiciones representan una acción de negocio real (crear
    // el lote / registrar el pesaje), no solo un cambio de bandera — se
    // abre el modal correspondiente en vez de llamar a cambiarEstado. El
    // resto de transiciones (falla mecánica, mantenimiento, mover hacia
    // atrás, etc.) también abre un modal con formulario (motivo), nunca un
    // cambio de bandera instantáneo. Si el modal se cierra sin guardar, no
    // se llama a ningún mutation y la tarjeta vuelve sola a su columna
    // porque el tablero se dibuja a partir de los datos del servidor, que
    // no cambiaron.
    if (vehiculo.estadoActual === "DISPONIBLE" && nuevoEstado === "EN_TRANSITO") {
      setLoteModalVehiculo(vehiculo);
      return;
    }
    if (vehiculo.estadoActual === "EN_TRANSITO" && nuevoEstado === "EN_BALANZA") {
      setBalanzaModalVehiculo(vehiculo);
      return;
    }

    setEstadoModal({ vehiculo, estadoDestino: nuevoEstado });
  }

  function handleCreateVehiculo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createVehiculoMutation.mutate(
      {
        placa: placa.trim(),
        tipo: tipo.trim(),
        capacidadTon: Number(capacidadTon),
        propietarioId: propietarioId ? Number(propietarioId) : null
      },
      {
        onSuccess: () => {
          showSuccess("Vehículo registrado en Disponible.");
          setPlaca("");
          setTipo("");
          setCapacidadTon("");
          setPropietarioId("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el vehículo."))
      }
    );
  }

  function handleCreateChofer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createChoferMutation.mutate(
      { nombre: choferNombre.trim(), ci: choferCi.trim(), licencia: choferLicencia.trim() || undefined },
      {
        onSuccess: () => {
          showSuccess("Chofer registrado.");
          setChoferNombre("");
          setChoferCi("");
          setChoferLicencia("");
        },
        onError: (error) => showError(normalizeError(error, "No se pudo registrar el chofer."))
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
            <Truck size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Flota</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Todo lo relacionado a vehículos vive aquí: transportistas (dueños), vehículos con su
              tablero de estado, y choferes. Arrastra un vehículo a la columna correspondiente: de
              Disponible a En tránsito abre el formulario del Conocimiento, y de ahí a En balanza abre
              la boleta de pesaje. Cualquier otro movimiento pide un motivo. Mientras un vehículo esté
              "En tránsito" o "En balanza", haz clic en su tarjeta para gestionar su lote (Formulario
              101, transbordo, pesaje o anulación) sin salir de esta pantalla.
            </p>
          </div>
        </div>
      </header>

      {/* El tablero interactivo va primero: es lo que se usa a diario
          (arrastrar para avanzar un lote, clic para gestionarlo). Los
          formularios de alta y el listado de transportistas quedan abajo,
          para cuando hay que revisar o dar de alta algo nuevo. */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Truck size={16} className="text-[var(--color-primary)]" />
          <h2 className="text-lg font-bold">Vehículos — tablero de estado</h2>
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            {vehiculos.length.toLocaleString("es-BO")} registrados
          </span>
        </div>

        {vehiculosQuery.isLoading ? (
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 text-sm text-[var(--color-on-surface-variant)]">
            Cargando flota...
          </article>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {COLUMNAS.map((columna) => (
                <FlotaColumn
                  key={columna.estado}
                  {...columna}
                  vehiculos={vehiculosPorEstado.get(columna.estado) ?? []}
                  onGestionar={setGestionModalVehiculo}
                />
              ))}
            </div>
          </DndContext>
        )}
      </section>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
          <Plus size={14} className="text-[var(--color-primary)]" />
          Registrar vehículo
        </h3>
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-5" onSubmit={handleCreateVehiculo}>
          <input
            required
            autoComplete="off"
            value={placa}
            onChange={(event) => setPlaca(event.target.value.toUpperCase())}
            className={`${inputClassName} font-mono uppercase`}
            placeholder="Placa"
          />
          <input
            required
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
            className={inputClassName}
            placeholder="Tipo (ej. Volqueta 10m³)"
          />
          <input
            required
            type="number"
            min="0.1"
            step="0.1"
            value={capacidadTon}
            onChange={(event) => setCapacidadTon(event.target.value)}
            className={inputClassName}
            placeholder="Capacidad (ton)"
          />
          <select value={propietarioId} onChange={(event) => setPropietarioId(event.target.value)} className={inputClassName}>
            <option value="">Propietario / transportista (opcional)</option>
            {transportistas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombreORazonSocial}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createVehiculoMutation.isPending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
          >
            {createVehiculoMutation.isPending ? "Guardando..." : "Registrar"}
          </button>
        </form>
      </article>

      <TransportistasSection />

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <IdCard size={16} className="text-[var(--color-primary)]" />
          Choferes
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
          <form className="space-y-3" onSubmit={handleCreateChofer}>
            <input
              required
              value={choferNombre}
              onChange={(event) => setChoferNombre(event.target.value)}
              className={inputClassName}
              placeholder="Nombre completo"
            />
            <input
              required
              value={choferCi}
              onChange={(event) => setChoferCi(event.target.value)}
              className={inputClassName}
              placeholder="Carnet de identidad"
            />
            <input
              value={choferLicencia}
              onChange={(event) => setChoferLicencia(event.target.value)}
              className={inputClassName}
              placeholder="Licencia (opcional)"
            />
            <button
              type="submit"
              disabled={createChoferMutation.isPending}
              className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createChoferMutation.isPending ? "Guardando..." : "Registrar chofer"}
            </button>
          </form>
          <div className="text-sm">
            <div className="relative mb-3">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
              <input
                value={busquedaChofer}
                onChange={(event) => {
                  setBusquedaChofer(event.target.value);
                  setPaginaChofer(1);
                }}
                className={`${inputClassName} pl-8`}
                placeholder="Buscar chofer por nombre o CI"
              />
            </div>
            <div className="space-y-2">
              {choferesQuery.isLoading ? (
                <p className="text-xs text-[var(--color-on-surface-variant)]">Cargando choferes...</p>
              ) : null}
              {choferesPagina.map((chofer) => (
                <div
                  key={chofer.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border-soft)] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <UserCog size={14} className="text-[var(--color-on-surface-variant)]" />
                    <div>
                      <p className="font-semibold">{chofer.nombre}</p>
                      <p className="text-xs text-[var(--color-on-surface-variant)]">
                        CI {chofer.ci}
                        {chofer.licencia ? ` · Lic. ${chofer.licencia}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {!choferesQuery.isLoading && choferesFiltrados.length === 0 ? (
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  {choferes.length === 0 ? "Aún no hay choferes registrados." : "Sin resultados."}
                </p>
              ) : null}
            </div>
            {choferesFiltrados.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[var(--color-on-surface-variant)]">
                  Página {paginaChoferActual} de {totalPaginasChofer}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaginaChofer((p) => Math.max(1, p - 1))}
                    disabled={paginaChoferActual <= 1}
                    className={buttonSecondaryClassName}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaginaChofer((p) => Math.min(totalPaginasChofer, p + 1))}
                    disabled={paginaChoferActual >= totalPaginasChofer}
                    className={buttonSecondaryClassName}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </article>

      {loteModalVehiculo ? <CrearLoteModal vehiculo={loteModalVehiculo} onClose={() => setLoteModalVehiculo(null)} /> : null}
      {balanzaModalVehiculo ? <RegistrarBalanzaModal vehiculo={balanzaModalVehiculo} onClose={() => setBalanzaModalVehiculo(null)} /> : null}
      {estadoModal ? (
        <CambiarEstadoModal
          vehiculo={estadoModal.vehiculo}
          estadoDestino={estadoModal.estadoDestino}
          onClose={() => setEstadoModal(null)}
        />
      ) : null}
      {gestionModalVehiculo ? <LoteActivoModal vehiculo={gestionModalVehiculo} onClose={() => setGestionModalVehiculo(null)} /> : null}
    </section>
  );
}
