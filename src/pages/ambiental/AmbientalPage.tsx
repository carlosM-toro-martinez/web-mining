import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  Droplets,
  FileText,
  FlaskConical,
  Leaf,
  MapPin,
  Plus,
  RadioTower,
  Save,
  Trash2,
  Waves
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useAmbientalDashboardQuery,
  useAmbientalHidricoQuery,
  useAmbientalManifiestosQuery,
  useAmbientalMapaQuery,
  useAmbientalPuntosQuery,
  useAmbientalPozosQuery,
  useAmbientalResiduosQuery,
  useAmbientalRuidoQuery,
  useAmbientalSueloQuery,
  useCreateAmbientalHidricoMutation,
  useCreateAmbientalManifiestoMutation,
  useCreateAmbientalPozoMutation,
  useCreateAmbientalPuntoMutation,
  useCreateAmbientalResiduoMutation,
  useCreateAmbientalRuidoMutation,
  useCreateAmbientalSueloMutation,
  useDeleteAmbientalPuntoMutation
} from "@/features/ambiental/hooks/useAmbiental";
import type {
  CalidadAgua,
  EstadoPozo,
  PuntoAmbiental,
  PuntoAmbientalTipo,
  TipoResiduo
} from "@/features/ambiental/model/ambiental.schema";
import { normalizeApiError } from "@/shared/api/core/apiError";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

type AmbientalTab = "mapa" | "hidrico" | "residuos" | "ruido" | "suelo" | "pozos" | "manifiestos";

const centerMarte: [number, number] = [-22.0806842, -67.1400311];
const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const puntoTipos: Array<{ value: PuntoAmbientalTipo; label: string; color: string }> = [
  { value: "HIDRICO", label: "Recurso hidrico", color: "#38bdf8" },
  { value: "RESIDUOS", label: "Gest. residuos", color: "#f59e0b" },
  { value: "RUIDO", label: "Ruido y emisiones", color: "#a78bfa" },
  { value: "SUELO", label: "Suelos y biodiversidad", color: "#22c55e" },
  { value: "POZO_SEPTICO", label: "Pozos septicos", color: "#f97316" },
  { value: "GENERAL", label: "General", color: "#94a3b8" }
];

const calidadOptions: CalidadAgua[] = ["EXCELENTE", "BUENA", "REGULAR", "MALA", "CRITICA"];
const estadoPozoOptions: EstadoPozo[] = ["BUENO", "REGULAR", "MALO", "CRITICO"];
const residuoOptions: TipoResiduo[] = [
  "SOLIDO_PELIGROSO",
  "SOLIDO_NO_PELIGROSO",
  "LIQUIDO_PELIGROSO",
  "LIQUIDO_NO_PELIGROSO"
];

function canManageAmbiental(role?: string | null) {
  return (
    role === "ADMIN" ||
    role === "ADMINISTRADOR" ||
    role === "SUPERINTENDENTE" ||
    role === "MEDIOAMBIENTE"
  );
}

function canDeleteAmbiental(role?: string | null) {
  return role === "ADMIN";
}

function getErrorMessage(error: unknown, fallback: string) {
  return normalizeApiError(error).message || fallback;
}

function toIsoFromLocal(value: string) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-BO");
}

function markerIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 8px 18px rgba(0,0,0,.35)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function MapClickCapture({
  onPick
}: {
  onPick: (coords: { latitud: number; longitud: number }) => void;
}) {
  useMapEvents({
    click(event) {
      onPick({
        latitud: Number(event.latlng.lat.toFixed(6)),
        longitud: Number(event.latlng.lng.toFixed(6))
      });
    }
  });
  return null;
}

export function AmbientalPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const canManage = canManageAmbiental(user?.role);
  const canDelete = canDeleteAmbiental(user?.role);
  const [activeTab, setActiveTab] = useState<AmbientalTab>("mapa");
  const [selectedCoords, setSelectedCoords] = useState({
    latitud: centerMarte[0],
    longitud: centerMarte[1]
  });

  const dashboardQuery = useAmbientalDashboardQuery();
  const mapaQuery = useAmbientalMapaQuery();
  const puntosQuery = useAmbientalPuntosQuery();
  const hidricoQuery = useAmbientalHidricoQuery({ page: 1, limit: 10 }, canManage);
  const residuosQuery = useAmbientalResiduosQuery({ page: 1, limit: 10 }, canManage);
  const ruidoQuery = useAmbientalRuidoQuery({ page: 1, limit: 10 }, canManage);
  const sueloQuery = useAmbientalSueloQuery({ page: 1, limit: 10 }, canManage);
  const pozosQuery = useAmbientalPozosQuery();
  const manifiestosQuery = useAmbientalManifiestosQuery();

  const createPunto = useCreateAmbientalPuntoMutation();
  const deletePunto = useDeleteAmbientalPuntoMutation();
  const createHidrico = useCreateAmbientalHidricoMutation();
  const createResiduo = useCreateAmbientalResiduoMutation();
  const createRuido = useCreateAmbientalRuidoMutation();
  const createSuelo = useCreateAmbientalSueloMutation();
  const createPozo = useCreateAmbientalPozoMutation();
  const createManifiesto = useCreateAmbientalManifiestoMutation();

  const puntos = puntosQuery.data?.data.puntos ?? [];
  const resumen = dashboardQuery.data?.data.resumen;
  const mapaPuntos = mapaQuery.data?.data.puntos ?? [];
  const mapaPozos = mapaQuery.data?.data.pozos ?? [];

  const pointOptions = useMemo(() => puntos.filter((punto) => punto.activo), [puntos]);

  function handleCreatePunto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return showError("No tienes permisos para registrar puntos ambientales.");
    const form = new FormData(event.currentTarget);
    createPunto.mutate(
      {
        nombre: String(form.get("nombre") ?? ""),
        descripcion: String(form.get("descripcion") ?? "") || undefined,
        tipo: String(form.get("tipo") ?? "GENERAL") as PuntoAmbientalTipo,
        latitud: Number(form.get("latitud")),
        longitud: Number(form.get("longitud"))
      },
      {
        onSuccess: () => {
          event.currentTarget.reset();
          showSuccess("Punto ambiental registrado.");
        },
        onError: (error) => showError(getErrorMessage(error, "No se pudo registrar el punto."))
      }
    );
  }

  function handleDeletePunto(id: number) {
    if (!canDelete) return showError("Solo ADMIN puede desactivar puntos.");
    if (!window.confirm("Desactivar este punto de monitoreo?")) return;
    deletePunto.mutate(id, {
      onSuccess: () => showSuccess("Punto desactivado."),
      onError: (error) => showError(getErrorMessage(error, "No se pudo desactivar el punto."))
    });
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton to="/" label="Volver" />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
              <Leaf size={22} />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-extrabold">Control Ambiental</h1>
              <p className="mt-2 max-w-3xl text-sm text-[var(--color-on-surface-variant)]">
                Monitoreo de puntos del rio, recursos hidricos, residuos, pozos septicos, ruido,
                emisiones, suelos, biodiversidad y manifiestos ambientales.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
            Rol: <strong className="text-[var(--color-on-surface)]">{user?.role}</strong>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Puntos activos" value={resumen?.puntosActivos ?? mapaPuntos.length} />
        <StatCard label="Puntos totales" value={resumen?.totalPuntos ?? puntos.length} />
        <StatCard
          label="Pozos criticos"
          value={resumen?.pozosCriticos ?? mapaPozos.filter((p) => p.estado === "CRITICO").length}
        />
        <StatCard label="Total pozos" value={resumen?.totalPozos ?? mapaPozos.length} />
        <StatCard label="Reg. hidricos" value={resumen?.totalRegistrosHidricos ?? 0} />
        <StatCard label="Residuos 30 dias" value={resumen?.residuosUltimos30Dias ?? 0} />
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3">
        {[
          { id: "mapa", label: "Mapa", icon: MapPin },
          { id: "hidrico", label: "Recurso hidrico", icon: Droplets },
          { id: "residuos", label: "Gest. residuos", icon: FlaskConical },
          { id: "ruido", label: "Ruido emisiones", icon: RadioTower },
          { id: "suelo", label: "Suelos biodiversidad", icon: Leaf },
          { id: "pozos", label: "Pozos septicos", icon: Waves },
          { id: "manifiestos", label: "Manifiesto", icon: FileText }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as AmbientalTab)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/14 text-[var(--color-primary)]"
                : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]"
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "mapa" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <AmbientalMap
            puntos={mapaPuntos}
            pozos={mapaPozos}
            selectedCoords={selectedCoords}
            onPick={setSelectedCoords}
          />
          <form
            onSubmit={handleCreatePunto}
            className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5"
          >
            <PanelTitle icon={Plus}>Nuevo punto de monitoreo</PanelTitle>
            <p className="mb-4 text-xs text-[var(--color-on-surface-variant)]">
              Haz clic en el mapa para capturar coordenadas y guardarlas en el punto.
            </p>
            <Field label="Nombre">
              <input
                name="nombre"
                required
                className={inputClassName}
                placeholder="Rio Marte - Captacion"
              />
            </Field>
            <Field label="Area">
              <select name="tipo" className={inputClassName} defaultValue="HIDRICO">
                {puntoTipos.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitud">
                <input
                  name="latitud"
                  type="number"
                  step="0.000001"
                  value={selectedCoords.latitud}
                  onChange={(e) =>
                    setSelectedCoords((c) => ({ ...c, latitud: Number(e.target.value) }))
                  }
                  className={inputClassName}
                />
              </Field>
              <Field label="Longitud">
                <input
                  name="longitud"
                  type="number"
                  step="0.000001"
                  value={selectedCoords.longitud}
                  onChange={(e) =>
                    setSelectedCoords((c) => ({ ...c, longitud: Number(e.target.value) }))
                  }
                  className={inputClassName}
                />
              </Field>
            </div>
            <Field label="Descripcion">
              <textarea
                name="descripcion"
                className={`${inputClassName} min-h-24`}
                placeholder="Referencia del punto, tramo o condicion observada"
              />
            </Field>
            <SaveButton disabled={!canManage || createPunto.isPending}>Guardar punto</SaveButton>
          </form>
        </div>
      ) : null}

      {activeTab === "hidrico" ? (
        <RecordsPanel
          title="Recursos hidricos"
          form={
            <HidricoForm
              puntos={pointOptions}
              disabled={!canManage || createHidrico.isPending}
              onSubmit={(payload, form) =>
                createHidrico.mutate(payload, {
                  onSuccess: () => {
                    form.reset();
                    showSuccess("Registro hidrico guardado.");
                  },
                  onError: (error) =>
                    showError(getErrorMessage(error, "No se pudo guardar el registro hidrico."))
                })
              }
            />
          }
          table={
            <SimpleTable
              headers={["Fecha", "Punto", "Calidad", "pH", "Turbidez", "Temp."]}
              rows={(hidricoQuery.data?.data.registros ?? []).map((item) => [
                formatDate(item.fecha),
                item.punto?.nombre ?? "-",
                item.calidadAgua ?? "-",
                item.ph ?? "-",
                item.turbidez ?? "-",
                item.temperatura ?? "-"
              ])}
            />
          }
        />
      ) : null}

      {activeTab === "residuos" ? (
        <RecordsPanel
          title="Gestion de residuos"
          form={
            <ResiduoForm
              puntos={pointOptions}
              disabled={!canManage || createResiduo.isPending}
              onSubmit={(payload, form) =>
                createResiduo.mutate(payload, {
                  onSuccess: () => {
                    form.reset();
                    showSuccess("Residuo registrado.");
                  },
                  onError: (error) =>
                    showError(getErrorMessage(error, "No se pudo guardar el residuo."))
                })
              }
            />
          }
          table={
            <SimpleTable
              headers={["Fecha", "Tipo", "Cantidad", "Unidad", "Disposicion", "Manifiesto"]}
              rows={(residuosQuery.data?.data.registros ?? []).map((item) => [
                formatDate(item.fecha),
                item.tipoResiduo,
                item.cantidad,
                item.unidad,
                item.disposicion,
                item.manifiestoNum ?? "-"
              ])}
            />
          }
        />
      ) : null}

      {activeTab === "ruido" ? (
        <RecordsPanel
          title="Ruido y emisiones atmosfericas"
          form={
            <RuidoForm
              puntos={pointOptions}
              disabled={!canManage || createRuido.isPending}
              onSubmit={(payload, form) =>
                createRuido.mutate(payload, {
                  onSuccess: () => {
                    form.reset();
                    showSuccess("Medicion de ruido guardada.");
                  },
                  onError: (error) =>
                    showError(getErrorMessage(error, "No se pudo guardar ruido/emisiones."))
                })
              }
            />
          }
          table={
            <SimpleTable
              headers={["Fecha", "Punto", "Ruido dB", "Limite", "PM10", "PM2.5"]}
              rows={(ruidoQuery.data?.data.registros ?? []).map((item) => [
                formatDate(item.fecha),
                item.punto?.nombre ?? "-",
                item.nivelRuido ?? "-",
                item.limitePermitido ?? "-",
                item.particulasPm10 ?? "-",
                item.particulasPm25 ?? "-"
              ])}
            />
          }
        />
      ) : null}

      {activeTab === "suelo" ? (
        <RecordsPanel
          title="Suelos y biodiversidad"
          form={
            <SueloForm
              puntos={pointOptions}
              disabled={!canManage || createSuelo.isPending}
              onSubmit={(payload, form) =>
                createSuelo.mutate(payload, {
                  onSuccess: () => {
                    form.reset();
                    showSuccess("Registro de suelo guardado.");
                  },
                  onError: (error) =>
                    showError(getErrorMessage(error, "No se pudo guardar suelo/biodiversidad."))
                })
              }
            />
          }
          table={
            <SimpleTable
              headers={["Fecha", "Punto", "pH", "Conductividad", "Materia org.", "Especies"]}
              rows={(sueloQuery.data?.data.registros ?? []).map((item) => [
                formatDate(item.fecha),
                item.punto?.nombre ?? "-",
                item.ph ?? "-",
                item.conductividad ?? "-",
                item.materiaOrganica ?? "-",
                item.especiesRegistradas ?? "-"
              ])}
            />
          }
        />
      ) : null}

      {activeTab === "pozos" ? (
        <RecordsPanel
          title="Pozos septicos"
          form={
            <PozoForm
              coords={selectedCoords}
              setCoords={setSelectedCoords}
              disabled={!canManage || createPozo.isPending}
              onSubmit={(payload, form) =>
                createPozo.mutate(payload, {
                  onSuccess: () => {
                    form.reset();
                    showSuccess("Pozo septico guardado.");
                  },
                  onError: (error) =>
                    showError(getErrorMessage(error, "No se pudo guardar el pozo."))
                })
              }
            />
          }
          table={
            <SimpleTable
              headers={[
                "Nombre",
                "Estado",
                "Capacidad",
                "Ultima limpieza",
                "Proxima limpieza",
                "Coordenadas"
              ]}
              rows={(pozosQuery.data?.data.pozos ?? []).map((item) => [
                item.nombre,
                item.estado,
                item.capacidadM3 ?? "-",
                formatDate(item.ultimaLimpieza),
                formatDate(item.proximaLimpieza),
                `${item.latitud}, ${item.longitud}`
              ])}
            />
          }
        />
      ) : null}

      {activeTab === "manifiestos" ? (
        <RecordsPanel
          title="Manifiesto ambiental"
          form={
            <ManifiestoForm
              disabled={!canManage || createManifiesto.isPending}
              onSubmit={(payload, form) =>
                createManifiesto.mutate(payload, {
                  onSuccess: () => {
                    form.reset();
                    showSuccess("Manifiesto guardado.");
                  },
                  onError: (error) =>
                    showError(getErrorMessage(error, "No se pudo guardar el manifiesto."))
                })
              }
            />
          }
          table={
            <SimpleTable
              headers={["Anio", "Titulo", "Responsable", "Aprobado", "Objetivos"]}
              rows={(manifiestosQuery.data?.data.manifiestos ?? []).map((item) => [
                item.anio,
                item.titulo,
                item.responsable ?? "-",
                formatDate(item.aprobadoAt),
                item.objetivos ?? "-"
              ])}
            />
          }
        />
      ) : null}

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <PanelTitle icon={Activity}>Puntos registrados</PanelTitle>
        <SimpleTable
          headers={["Nombre", "Area", "Coordenadas", "Estado", "Accion"]}
          rows={puntos.map((punto) => [
            punto.nombre,
            labelForTipo(punto.tipo),
            `${punto.latitud}, ${punto.longitud}`,
            punto.activo ? "Activo" : "Inactivo",
            canDelete ? (
              <button
                type="button"
                onClick={() => handleDeletePunto(punto.id)}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-error)]/45 px-2 py-1 text-xs font-semibold text-[var(--color-error)]"
              >
                <Trash2 size={13} />
                Desactivar
              </button>
            ) : (
              "-"
            )
          ])}
        />
      </article>
    </section>
  );
}

function AmbientalMap(props: {
  puntos: Array<
    PuntoAmbiental & {
      ultimoHidrico?: {
        calidadAgua?: string | null;
        ph?: number | null;
        turbidez?: number | null;
        fecha?: string | null;
      } | null;
    }
  >;
  pozos: Array<{
    id: number;
    nombre: string;
    latitud: number;
    longitud: number;
    estado?: string | null;
    proximaLimpieza?: string | null;
  }>;
  selectedCoords: { latitud: number; longitud: number };
  onPick: (coords: { latitud: number; longitud: number }) => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
      <div className="h-[62vh] min-h-[420px] w-full">
        <MapContainer
          center={[props.selectedCoords.latitud, props.selectedCoords.longitud]}
          zoom={14}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickCapture onPick={props.onPick} />
          {props.puntos.map((punto) => (
            <Marker
              key={`punto-${punto.id}`}
              position={[punto.latitud, punto.longitud]}
              icon={markerIcon(colorForTipo(punto.tipo))}
            >
              <Popup>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{punto.nombre}</p>
                  <p className="text-xs">{labelForTipo(punto.tipo)}</p>
                  {punto.ultimoHidrico ? (
                    <p className="text-xs">
                      Agua: {punto.ultimoHidrico.calidadAgua ?? "-"} | pH{" "}
                      {punto.ultimoHidrico.ph ?? "-"}
                    </p>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
          {props.pozos.map((pozo) => (
            <Marker
              key={`pozo-${pozo.id}`}
              position={[pozo.latitud, pozo.longitud]}
              icon={markerIcon("#f97316")}
            >
              <Popup>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{pozo.nombre}</p>
                  <p className="text-xs">Estado: {pozo.estado ?? "-"}</p>
                  <p className="text-xs">Prox. limpieza: {formatDate(pozo.proximaLimpieza)}</p>
                </div>
              </Popup>
            </Marker>
          ))}
          <Marker
            position={[props.selectedCoords.latitud, props.selectedCoords.longitud]}
            icon={markerIcon("#ef4444")}
          >
            <Popup>Coordenada seleccionada</Popup>
          </Marker>
        </MapContainer>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-[var(--color-border-soft)] px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
        {puntoTipos.map((item) => (
          <span
            key={item.value}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-container-high)] px-2.5 py-1"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </article>
  );
}

function HidricoForm({
  puntos,
  disabled,
  onSubmit
}: {
  puntos: PuntoAmbiental[];
  disabled: boolean;
  onSubmit: (payload: any, form: HTMLFormElement) => void;
}) {
  return (
    <RecordForm
      disabled={disabled}
      onSubmit={(formData, form) =>
        onSubmit(
          {
            puntoId: Number(formData.get("puntoId")),
            fecha: toIsoFromLocal(String(formData.get("fecha") ?? "")),
            calidadAgua: formData.get("calidadAgua") as CalidadAgua,
            ph: formData.get("ph"),
            turbidez: formData.get("turbidez"),
            conductividad: formData.get("conductividad"),
            oxigenoDisuelto: formData.get("oxigenoDisuelto"),
            temperatura: formData.get("temperatura"),
            coliformesFecales: formData.get("coliformesFecales"),
            observaciones: String(formData.get("observaciones") ?? "") || undefined
          },
          form
        )
      }
    >
      <PointSelect puntos={puntos} />
      <input name="fecha" type="datetime-local" className={inputClassName} />
      <select name="calidadAgua" className={inputClassName}>
        {calidadOptions.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <MetricGrid
        names={[
          "ph",
          "turbidez",
          "conductividad",
          "oxigenoDisuelto",
          "temperatura",
          "coliformesFecales"
        ]}
      />
      <textarea
        name="observaciones"
        className={`${inputClassName} min-h-20`}
        placeholder="Observaciones"
      />
    </RecordForm>
  );
}

function ResiduoForm({
  puntos,
  disabled,
  onSubmit
}: {
  puntos: PuntoAmbiental[];
  disabled: boolean;
  onSubmit: (payload: any, form: HTMLFormElement) => void;
}) {
  return (
    <RecordForm
      disabled={disabled}
      onSubmit={(formData, form) =>
        onSubmit(
          {
            puntoId: formData.get("puntoId") || undefined,
            fecha: toIsoFromLocal(String(formData.get("fecha") ?? "")),
            tipoResiduo: formData.get("tipoResiduo") as TipoResiduo,
            cantidad: Number(formData.get("cantidad")),
            unidad: String(formData.get("unidad") ?? ""),
            disposicion: String(formData.get("disposicion") ?? ""),
            empresa: String(formData.get("empresa") ?? "") || undefined,
            manifiestoNum: String(formData.get("manifiestoNum") ?? "") || undefined,
            observaciones: String(formData.get("observaciones") ?? "") || undefined
          },
          form
        )
      }
    >
      <PointSelect puntos={puntos} optional />
      <input name="fecha" type="datetime-local" className={inputClassName} />
      <select name="tipoResiduo" className={inputClassName}>
        {residuoOptions.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="cantidad"
          type="number"
          step="0.01"
          required
          placeholder="Cantidad"
          className={inputClassName}
        />
        <input name="unidad" required placeholder="Unidad" className={inputClassName} />
      </div>
      <input name="disposicion" required placeholder="Disposicion" className={inputClassName} />
      <div className="grid grid-cols-2 gap-3">
        <input name="empresa" placeholder="Empresa" className={inputClassName} />
        <input name="manifiestoNum" placeholder="Nro manifiesto" className={inputClassName} />
      </div>
      <textarea
        name="observaciones"
        className={`${inputClassName} min-h-20`}
        placeholder="Observaciones"
      />
    </RecordForm>
  );
}

function RuidoForm({
  puntos,
  disabled,
  onSubmit
}: {
  puntos: PuntoAmbiental[];
  disabled: boolean;
  onSubmit: (payload: any, form: HTMLFormElement) => void;
}) {
  return (
    <RecordForm
      disabled={disabled}
      onSubmit={(formData, form) =>
        onSubmit(
          {
            puntoId: Number(formData.get("puntoId")),
            fecha: toIsoFromLocal(String(formData.get("fecha") ?? "")),
            nivelRuido: Number(formData.get("nivelRuido")),
            limitePermitido: formData.get("limitePermitido"),
            particulasPm10: formData.get("particulasPm10"),
            particulasPm25: formData.get("particulasPm25"),
            observaciones: String(formData.get("observaciones") ?? "") || undefined
          },
          form
        )
      }
    >
      <PointSelect puntos={puntos} />
      <input name="fecha" type="datetime-local" className={inputClassName} />
      <MetricGrid
        names={["nivelRuido", "limitePermitido", "particulasPm10", "particulasPm25"]}
        requiredFirst
      />
      <textarea
        name="observaciones"
        className={`${inputClassName} min-h-20`}
        placeholder="Observaciones"
      />
    </RecordForm>
  );
}

function SueloForm({
  puntos,
  disabled,
  onSubmit
}: {
  puntos: PuntoAmbiental[];
  disabled: boolean;
  onSubmit: (payload: any, form: HTMLFormElement) => void;
}) {
  return (
    <RecordForm
      disabled={disabled}
      onSubmit={(formData, form) =>
        onSubmit(
          {
            puntoId: Number(formData.get("puntoId")),
            fecha: toIsoFromLocal(String(formData.get("fecha") ?? "")),
            ph: formData.get("ph"),
            conductividad: formData.get("conductividad"),
            materiaOrganica: formData.get("materiaOrganica"),
            especiesRegistradas: String(formData.get("especiesRegistradas") ?? "") || undefined,
            observaciones: String(formData.get("observaciones") ?? "") || undefined
          },
          form
        )
      }
    >
      <PointSelect puntos={puntos} />
      <input name="fecha" type="datetime-local" className={inputClassName} />
      <MetricGrid names={["ph", "conductividad", "materiaOrganica"]} />
      <textarea
        name="especiesRegistradas"
        className={`${inputClassName} min-h-20`}
        placeholder="Especies registradas"
      />
      <textarea
        name="observaciones"
        className={`${inputClassName} min-h-20`}
        placeholder="Observaciones"
      />
    </RecordForm>
  );
}

function PozoForm({
  coords,
  setCoords,
  disabled,
  onSubmit
}: {
  coords: { latitud: number; longitud: number };
  setCoords: (coords: { latitud: number; longitud: number }) => void;
  disabled: boolean;
  onSubmit: (payload: any, form: HTMLFormElement) => void;
}) {
  return (
    <RecordForm
      disabled={disabled}
      onSubmit={(formData, form) =>
        onSubmit(
          {
            nombre: String(formData.get("nombre") ?? ""),
            descripcion: String(formData.get("descripcion") ?? "") || undefined,
            latitud: Number(formData.get("latitud")),
            longitud: Number(formData.get("longitud")),
            capacidadM3: formData.get("capacidadM3"),
            estado: formData.get("estado") as EstadoPozo,
            ultimaLimpieza: formData.get("ultimaLimpieza")
              ? toIsoFromLocal(String(formData.get("ultimaLimpieza")))
              : undefined,
            proximaLimpieza: formData.get("proximaLimpieza")
              ? toIsoFromLocal(String(formData.get("proximaLimpieza")))
              : undefined,
            observaciones: String(formData.get("observaciones") ?? "") || undefined
          },
          form
        )
      }
    >
      <input name="nombre" required placeholder="Nombre del pozo" className={inputClassName} />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="latitud"
          type="number"
          step="0.000001"
          value={coords.latitud}
          onChange={(e) => setCoords({ ...coords, latitud: Number(e.target.value) })}
          className={inputClassName}
        />
        <input
          name="longitud"
          type="number"
          step="0.000001"
          value={coords.longitud}
          onChange={(e) => setCoords({ ...coords, longitud: Number(e.target.value) })}
          className={inputClassName}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="capacidadM3"
          type="number"
          step="0.01"
          placeholder="Capacidad m3"
          className={inputClassName}
        />
        <select name="estado" className={inputClassName}>
          {estadoPozoOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input name="ultimaLimpieza" type="datetime-local" className={inputClassName} />
        <input name="proximaLimpieza" type="datetime-local" className={inputClassName} />
      </div>
      <textarea
        name="descripcion"
        className={`${inputClassName} min-h-20`}
        placeholder="Descripcion"
      />
      <textarea
        name="observaciones"
        className={`${inputClassName} min-h-20`}
        placeholder="Observaciones"
      />
    </RecordForm>
  );
}

function ManifiestoForm({
  disabled,
  onSubmit
}: {
  disabled: boolean;
  onSubmit: (payload: any, form: HTMLFormElement) => void;
}) {
  return (
    <RecordForm
      disabled={disabled}
      onSubmit={(formData, form) =>
        onSubmit(
          {
            anio: Number(formData.get("anio")),
            titulo: String(formData.get("titulo") ?? ""),
            descripcion: String(formData.get("descripcion") ?? "") || undefined,
            objetivos: String(formData.get("objetivos") ?? "") || undefined,
            compromisos: String(formData.get("compromisos") ?? "") || undefined,
            responsable: String(formData.get("responsable") ?? "") || undefined,
            aprobadoAt: formData.get("aprobadoAt")
              ? toIsoFromLocal(String(formData.get("aprobadoAt")))
              : undefined
          },
          form
        )
      }
    >
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <input
          name="anio"
          type="number"
          required
          defaultValue={new Date().getFullYear()}
          className={inputClassName}
        />
        <input name="titulo" required placeholder="Titulo" className={inputClassName} />
      </div>
      <input name="responsable" placeholder="Responsable" className={inputClassName} />
      <input name="aprobadoAt" type="datetime-local" className={inputClassName} />
      <textarea
        name="descripcion"
        className={`${inputClassName} min-h-20`}
        placeholder="Descripcion"
      />
      <textarea name="objetivos" className={`${inputClassName} min-h-24`} placeholder="Objetivos" />
      <textarea
        name="compromisos"
        className={`${inputClassName} min-h-24`}
        placeholder="Compromisos"
      />
    </RecordForm>
  );
}

function RecordForm({
  children,
  disabled,
  onSubmit
}: {
  children: ReactNode;
  disabled: boolean;
  onSubmit: (formData: FormData, form: HTMLFormElement) => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget), event.currentTarget);
      }}
      className="space-y-3"
    >
      {children}
      <SaveButton disabled={disabled}>Guardar</SaveButton>
    </form>
  );
}

function RecordsPanel({
  title,
  form,
  table
}: {
  title: string;
  form: ReactNode;
  table: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <PanelTitle icon={Save}>{title}</PanelTitle>
        {form}
      </article>
      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <PanelTitle icon={FileText}>Ultimos registros</PanelTitle>
        {table}
      </article>
    </div>
  );
}

function PointSelect({
  puntos,
  optional = false
}: {
  puntos: PuntoAmbiental[];
  optional?: boolean;
}) {
  return (
    <select name="puntoId" required={!optional} className={inputClassName} defaultValue="">
      <option value="">{optional ? "Sin punto asociado" : "Selecciona punto"}</option>
      {puntos.map((punto) => (
        <option key={punto.id} value={punto.id}>
          {punto.nombre} - {labelForTipo(punto.tipo)}
        </option>
      ))}
    </select>
  );
}

function MetricGrid({
  names,
  requiredFirst = false
}: {
  names: string[];
  requiredFirst?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {names.map((name, index) => (
        <input
          key={name}
          name={name}
          type="number"
          step="0.01"
          required={requiredFirst && index === 0}
          placeholder={name}
          className={inputClassName}
        />
      ))}
    </div>
  );
}

function SaveButton({ children, disabled }: { children: ReactNode; disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <Save size={15} />
      {children}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold">{value.toLocaleString("es-BO")}</p>
    </div>
  );
}

function PanelTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface)]">
      <Icon size={16} className="text-[var(--color-primary)]" />
      {children}
    </h2>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-soft)]">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
              >
                Sin registros.
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-[var(--color-surface-container-high)]">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 text-xs">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function labelForTipo(tipo: PuntoAmbientalTipo) {
  return puntoTipos.find((item) => item.value === tipo)?.label ?? tipo;
}

function colorForTipo(tipo: PuntoAmbientalTipo) {
  return puntoTipos.find((item) => item.value === tipo)?.color ?? "#94a3b8";
}
