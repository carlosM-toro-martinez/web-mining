import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Database, Plus, X } from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import {
  useAssayDetailQuery,
  useAssaysByIntervalQuery,
  useCreateAssayMutation,
  useCreateDrillHoleMutation,
  useCreateIntervalMutation,
  useCreateLithologyMutation,
  useCreateProjectMutation,
  useCreateQaqcMutation,
  useCreateResourceMutation,
  useCreateZoneMutation,
  useDrillHoleDetailQuery,
  useDrillHolesByZoneQuery,
  useIntervalDetailQuery,
  useIntervalsByDrillHoleQuery,
  useLithologiesByIntervalQuery,
  useProjectDetailQuery,
  useProjectsQuery,
  useQaqcByAssayQuery,
  useResourcesByProjectQuery,
  useZoneDetailQuery,
  useZonesByProjectQuery
} from "@/features/exploraciones/hooks/useExploracionMinera";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

type ModalType =
  | "project"
  | "zone"
  | "drillhole"
  | "interval"
  | "assay"
  | "lithology"
  | "qaqc"
  | "resource";

function parseId(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function pathFor(projectId: number, zoneId?: number, drillHoleId?: number, intervalId?: number, assayId?: number) {
  if (!zoneId) return `/exploraciones-data-room/projects/${projectId}`;
  if (!drillHoleId) return `/exploraciones-data-room/projects/${projectId}/zones/${zoneId}`;
  if (!intervalId) {
    return `/exploraciones-data-room/projects/${projectId}/zones/${zoneId}/drillholes/${drillHoleId}`;
  }
  if (!assayId) {
    return `/exploraciones-data-room/projects/${projectId}/zones/${zoneId}/drillholes/${drillHoleId}/intervals/${intervalId}`;
  }
  return `/exploraciones-data-room/projects/${projectId}/zones/${zoneId}/drillholes/${drillHoleId}/intervals/${intervalId}/assays/${assayId}`;
}

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

const DEFAULT_PROJECT_MAP_LAT = Number(import.meta.env.VITE_PROJECT_MAP_LAT ?? -16.5);
const DEFAULT_PROJECT_MAP_LNG = Number(import.meta.env.VITE_PROJECT_MAP_LNG ?? -68.15);

export function ExploracionesDataRoomPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERINTENDENTE";
  const params = useParams();
  const projectId = parseId(params.projectId);
  const zoneId = parseId(params.zoneId);
  const drillHoleId = parseId(params.drillHoleId);
  const intervalId = parseId(params.intervalId);
  const assayId = parseId(params.assayId);

  const [modal, setModal] = useState<ModalType | null>(null);
  const projectsQuery = useProjectsQuery({ page: 1, limit: 100 });
  const projectDetail = useProjectDetailQuery(projectId);
  const zonesQuery = useZonesByProjectQuery(projectId);
  const zoneDetail = useZoneDetailQuery(zoneId);
  const drillHolesQuery = useDrillHolesByZoneQuery(zoneId);
  const drillHoleDetail = useDrillHoleDetailQuery(drillHoleId);
  const intervalsQuery = useIntervalsByDrillHoleQuery(drillHoleId);
  const intervalDetail = useIntervalDetailQuery(intervalId);
  const assaysQuery = useAssaysByIntervalQuery(intervalId);
  const lithologiesQuery = useLithologiesByIntervalQuery(intervalId);
  const assayDetail = useAssayDetailQuery(assayId);
  const qaqcQuery = useQaqcByAssayQuery(assayId);
  const resourcesQuery = useResourcesByProjectQuery(projectId);

  const createProject = useCreateProjectMutation();
  const createZone = useCreateZoneMutation();
  const createDrillHole = useCreateDrillHoleMutation();
  const createInterval = useCreateIntervalMutation();
  const createAssay = useCreateAssayMutation();
  const createLithology = useCreateLithologyMutation();
  const createQaqc = useCreateQaqcMutation();
  const createResource = useCreateResourceMutation();
  const intervalsRef = useRef<HTMLDivElement | null>(null);
  const assaysRef = useRef<HTMLDivElement | null>(null);
  const qaqcRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (drillHoleId && intervalsRef.current) {
      intervalsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [drillHoleId]);

  useEffect(() => {
    if (intervalId && assaysRef.current) {
      assaysRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [intervalId]);

  useEffect(() => {
    if (assayId && qaqcRef.current) {
      qaqcRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [assayId]);

  const isLoading = useMemo(
    () =>
      projectsQuery.isLoading ||
      projectDetail.isLoading ||
      zonesQuery.isLoading ||
      zoneDetail.isLoading ||
      drillHolesQuery.isLoading ||
      drillHoleDetail.isLoading ||
      intervalsQuery.isLoading ||
      intervalDetail.isLoading ||
      assaysQuery.isLoading ||
      assayDetail.isLoading ||
      lithologiesQuery.isLoading ||
      qaqcQuery.isLoading ||
      resourcesQuery.isLoading,
    [
      projectsQuery.isLoading,
      projectDetail.isLoading,
      zonesQuery.isLoading,
      zoneDetail.isLoading,
      drillHolesQuery.isLoading,
      drillHoleDetail.isLoading,
      intervalsQuery.isLoading,
      intervalDetail.isLoading,
      assaysQuery.isLoading,
      assayDetail.isLoading,
      lithologiesQuery.isLoading,
      qaqcQuery.isLoading,
      resourcesQuery.isLoading
    ]
  );

  if (!canManage) return <Navigate to="/perfil" replace />;

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
          >
            <ArrowLeft size={14} />
            Atrás
          </button>
          <div className="flex flex-wrap items-center gap-1 text-xs text-[var(--color-on-surface-variant)]">
            <Link className="text-[var(--color-primary)] hover:underline" to="/exploraciones-data-room">
              Exploraciones Data Room
            </Link>
            {projectId ? (
              <>
                <ChevronRight size={12} />
                <Link className="text-[var(--color-primary)] hover:underline" to={pathFor(projectId)}>
                  {projectDetail.data?.name ?? `Project #${projectId}`}
                </Link>
              </>
            ) : null}
            {zoneId ? (
              <>
                <ChevronRight size={12} />
                <Link className="text-[var(--color-primary)] hover:underline" to={pathFor(projectId as number, zoneId)}>
                  {zoneDetail.data?.name ?? `Zone #${zoneId}`}
                </Link>
              </>
            ) : null}
            {drillHoleId ? (
              <>
                <ChevronRight size={12} />
                <Link
                  className="text-[var(--color-primary)] hover:underline"
                  to={pathFor(projectId as number, zoneId, drillHoleId)}
                >
                  {drillHoleDetail.data?.name ?? `DrillHole #${drillHoleId}`}
                </Link>
              </>
            ) : null}
            {intervalId ? (
              <>
                <ChevronRight size={12} />
                <Link
                  className="text-[var(--color-primary)] hover:underline"
                  to={pathFor(projectId as number, zoneId, drillHoleId, intervalId)}
                >
                  {`Interval #${intervalId}`}
                </Link>
              </>
            ) : null}
            {assayId ? (
              <>
                <ChevronRight size={12} />
                <span>{`Assay #${assayId}`}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Database size={20} className="text-[var(--color-primary)]" />
            <div>
              <h1 className="text-2xl font-extrabold">Exploraciones Data Room</h1>
              <p className="text-sm text-[var(--color-on-surface-variant)]">
                Project → Zone → DrillHole → Interval → Assay (QAQC/Lithology/Resource).
              </p>
            </div>
          </div>
          <div className="grid w-full max-w-[520px] grid-cols-1 gap-2 md:grid-cols-2">
            <select
              className={inputClassName}
              value={projectId ?? ""}
              onChange={(e) => {
                const nextId = Number(e.target.value);
                if (!nextId) return;
                navigate(pathFor(nextId));
              }}
            >
              <option value="">Elegir project...</option>
              {(projectsQuery.data?.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.location ?? "s/ubicación"})
                </option>
              ))}
            </select>
            <select
              className={inputClassName}
              value={zoneId ?? ""}
              disabled={!projectId}
              onChange={(e) => {
                const nextZone = Number(e.target.value);
                if (!projectId || !nextZone) return;
                navigate(pathFor(projectId, nextZone));
              }}
            >
              <option value="">Elegir zone...</option>
              {(zonesQuery.data?.data ?? []).map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {isLoading ? <section className="rounded-xl bg-[var(--color-surface-container-low)] p-4">Cargando...</section> : null}

      {!projectId ? (
        <div className="mx-auto max-w-5xl">
          <Card
            title="Projects"
            action={<AddBtn label="Agregar Project" onClick={() => setModal("project")} />}
          >
            <SimpleTable
              headers={["ID", "Nombre", "Ubicación", "Acción"]}
              rows={(projectsQuery.data?.data ?? []).map((p) => [
                String(p.id),
                p.name,
                p.location ?? "-",
                <Link key={p.id} className="text-[var(--color-primary)]" to={pathFor(p.id)}>
                  Abrir
                </Link>
              ])}
              empty="Sin proyectos."
            />
          </Card>
        </div>
      ) : null}

      {projectId && !zoneId ? (
        <div className="space-y-4">
          <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
            <h2 className="text-xl font-bold">{projectDetail.data?.name ?? "Project"}</h2>
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              {projectDetail.data?.location ?? "Sin ubicación"}
            </p>
          </header>
          <Card
            title="Zonas del Project"
            action={<AddBtn label="Agregar Zone" onClick={() => setModal("zone")} />}
          >
            <SimpleTable
              headers={["Zone", "Descripción", "Acción"]}
              rows={(zonesQuery.data?.data ?? []).map((z) => [
                z.name,
                z.description ?? "-",
                <Link key={z.id} className="text-[var(--color-primary)]" to={pathFor(projectId, z.id)}>
                  Ver DrillHoles
                </Link>
              ])}
              empty="Sin zonas."
            />
          </Card>
          <Card title="Mapa del Project">
            <ProjectResourceMap
              latitude={DEFAULT_PROJECT_MAP_LAT}
              longitude={DEFAULT_PROJECT_MAP_LNG}
              resources={resourcesQuery.data?.data ?? []}
            />
          </Card>
        </div>
      ) : null}

      {projectId && zoneId ? (
        <div className="space-y-4">
          <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
            <h2 className="text-xl font-bold">{projectDetail.data?.name ?? "Project"}</h2>
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              {projectDetail.data?.location ?? "Sin ubicación"}
            </p>
            <p className="mt-2 text-sm">
              <strong>Zona:</strong> {zoneDetail.data?.name ?? "-"} · {zoneDetail.data?.description ?? "Sin descripción"}
            </p>
          </header>
          <div className="animate-[fadeIn_.28s_ease-out]">
            {!drillHoleId ? (
              <div className="space-y-4">
                <Card
                  title="DrillHoles de la Zone"
                  action={<AddBtn label="Agregar DrillHole" onClick={() => setModal("drillhole")} />}
                >
                  <SimpleTable
                    headers={["Nombre", "Tipo", "East", "North", "Elevation", "Depth", "Azimuth", "Dip", "Campaign", "Year", "Acción"]}
                    rows={(drillHolesQuery.data?.data ?? []).map((d) => [
                      d.name,
                      d.type,
                      String(d.east),
                      String(d.north),
                      d.elevation === null ? "-" : String(d.elevation),
                      String(d.depth),
                      d.azimuth === null ? "-" : String(d.azimuth),
                      d.dip === null ? "-" : String(d.dip),
                      d.campaign ?? "-",
                      d.year === null ? "-" : String(d.year),
                      <Link key={d.id} className="text-[var(--color-primary)]" to={pathFor(projectId, zoneId, d.id)}>
                        Ver Intervals
                      </Link>
                    ])}
                    empty="Sin drillholes en esta zone."
                  />
                </Card>
                <Card title="Resources del Project" action={<AddBtn label="Agregar Resource" onClick={() => setModal("resource")} />}>
                  <SimpleTable
                    headers={["Type", "Category", "Cutoff", "Tonnes", "Au", "Cu", "Ag", "CuEq"]}
                    rows={(resourcesQuery.data?.data ?? []).map((r) => [
                      r.type,
                      r.category,
                      String(r.cutoff),
                      String(r.tonnes),
                      String(r.au),
                      String(r.cu),
                      String(r.ag),
                      String(r.cuEq)
                    ])}
                    empty="Sin resources."
                  />
                </Card>
              </div>
            ) : null}

            {drillHoleId && !intervalId ? (
              <div ref={intervalsRef}>
                <Card
                  title={`Intervals de ${drillHoleDetail.data?.name ?? `DrillHole #${drillHoleId}`}`}
                  action={<AddBtn label="Agregar Interval" onClick={() => setModal("interval")} />}
                >
                  <div className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
                    Estás viendo los intervals del drillhole seleccionado.
                  </div>
                  <SimpleTable
                    headers={["ID", "From", "To", "Acción"]}
                    rows={(intervalsQuery.data?.data ?? []).map((i) => [
                      String(i.id),
                      String(i.fromDepth),
                      String(i.toDepth),
                      <Link key={i.id} className="text-[var(--color-primary)]" to={pathFor(projectId, zoneId, drillHoleId, i.id)}>
                        Ver Assays
                      </Link>
                    ])}
                    empty="Este drillhole no tiene intervals todavía."
                  />
                </Card>
              </div>
            ) : null}

            {drillHoleId && intervalId && !assayId ? (
              <div ref={assaysRef}>
                <Card
                  title={`Assays y Lithologies de Interval #${intervalId}`}
                  action={
                    <div className="flex gap-2">
                      <AddBtn label="Agregar Assay" onClick={() => setModal("assay")} />
                      <AddBtn label="Agregar Lithology" onClick={() => setModal("lithology")} />
                    </div>
                  }
                >
                  <div className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
                    Estás viendo el detalle del interval seleccionado.
                  </div>
                  <SimpleTable
                    headers={["ID", "Method", "Au", "Cu", "Ag", "Lab", "Acción"]}
                    rows={(assaysQuery.data?.data ?? []).map((a) => [
                      String(a.id),
                      a.assayMethod,
                      String(a.au),
                      String(a.cu),
                      String(a.ag),
                      a.laboratory ?? "-",
                      <Link key={a.id} className="text-[var(--color-primary)]" to={pathFor(projectId, zoneId, drillHoleId, intervalId, a.id)}>
                        Ver QAQC
                      </Link>
                    ])}
                    empty="Sin assays."
                  />
                  <div className="mt-3" />
                  <SimpleTable
                    headers={["ID", "Rock Type", "Alteration", "Mineralization", "Comments"]}
                    rows={(lithologiesQuery.data?.data ?? []).map((l) => [
                      String(l.id),
                      l.rockType ?? "-",
                      l.alteration ?? "-",
                      l.mineralization ?? "-",
                      l.comments ?? "-"
                    ])}
                    empty="Sin lithologies."
                  />
                </Card>
              </div>
            ) : null}

            {drillHoleId && intervalId && assayId ? (
              <div ref={qaqcRef}>
                <Card title={`QAQC de Assay #${assayId}`} action={<AddBtn label="Agregar QAQC" onClick={() => setModal("qaqc")} />}>
                  <div className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
                    Estás viendo los QAQC del assay seleccionado.
                  </div>
                  <SimpleTable
                    headers={["ID", "Type", "Passed", "Notes"]}
                    rows={(qaqcQuery.data?.data ?? []).map((q) => [
                      String(q.id),
                      q.type,
                      q.passed ? "Sí" : "No",
                      q.notes ?? "-"
                    ])}
                    empty="Sin QAQC."
                  />
                </Card>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {modal ? (
        <CreateModal
          type={modal}
          context={{ projectId, zoneId, drillHoleId, intervalId, assayId }}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            try {
              if (modal === "project") await createProject.mutateAsync(payload as any);
              if (modal === "zone") await createZone.mutateAsync(payload as any);
              if (modal === "drillhole") await createDrillHole.mutateAsync(payload as any);
              if (modal === "interval") await createInterval.mutateAsync(payload as any);
              if (modal === "assay") await createAssay.mutateAsync(payload as any);
              if (modal === "lithology") await createLithology.mutateAsync(payload as any);
              if (modal === "qaqc") await createQaqc.mutateAsync(payload as any);
              if (modal === "resource") await createResource.mutateAsync(payload as any);
              showSuccess("Registro creado correctamente.");
              setModal(null);
            } catch (error) {
              showError(error instanceof Error ? error.message : "No se pudo crear el registro.");
            }
          }}
        />
      ) : null}
    </section>
  );
}

function ProjectResourceMap({
  latitude,
  longitude,
  resources
}: {
  latitude: number;
  longitude: number;
  resources: Array<{
    type: string;
    category: string;
    cutoff: number;
    tonnes: number;
    au: number;
    cu: number;
    ag: number;
    cuEq: number;
  }>;
}) {
  const totalTonnes = resources.reduce((acc, item) => acc + item.tonnes, 0);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
      <MapContainer center={[latitude, longitude]} zoom={9} style={{ height: "340px", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="space-y-1 text-xs">
              <p><strong>RESOURCE</strong></p>
              <p>Registros: {resources.length}</p>
              <p>Tonnes total: {totalTonnes.toFixed(2)}</p>
              {resources.slice(0, 3).map((resource, idx) => (
                <p key={`${resource.type}-${resource.category}-${idx}`}>
                  {resource.type}/{resource.category} · Au {resource.au} · Cu {resource.cu} · CuEq {resource.cuEq}
                </p>
              ))}
              {resources.length > 3 ? <p>... y {resources.length - 3} más</p> : null}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold">
      <Plus size={13} /> {label}
    </button>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </article>
  );
}

function CreateModal({
  type,
  context,
  onClose,
  onSubmit
}: {
  type: ModalType;
  context: { projectId?: number; zoneId?: number; drillHoleId?: number; intervalId?: number; assayId?: number };
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [v, setV] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const set = (k: string, val: string) => setV((s) => ({ ...s, [k]: val }));
  const toNumber = (k: string) => {
    const raw = (v[k] ?? "").trim().replace(",", ".");
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const t = (k: string) => (v[k] ?? "").trim();

  function requireNumber(key: string, label: string) {
    const parsed = toNumber(key);
    if (parsed === undefined) {
      setValidationError(`${label} debe ser un número válido.`);
      return null;
    }
    return parsed;
  }

  async function submit() {
    setValidationError(null);
    if (type === "project") {
      if (!t("name")) {
        setValidationError("Nombre del proyecto es obligatorio.");
        return;
      }
      return onSubmit({ name: t("name"), description: t("description") || undefined, location: t("location") || undefined });
    }
    if (type === "zone") {
      if (!context.projectId) {
        setValidationError("No hay project seleccionado.");
        return;
      }
      if (!t("name")) {
        setValidationError("Nombre de la zona es obligatorio.");
        return;
      }
      return onSubmit({ projectId: context.projectId, name: t("name"), description: t("description") || undefined });
    }
    if (type === "drillhole") {
      if (!context.projectId || !context.zoneId) {
        setValidationError("Debes estar dentro de un project y una zone.");
        return;
      }
      if (!t("name")) {
        setValidationError("Nombre del drillhole es obligatorio.");
        return;
      }
      const east = requireNumber("east", "East");
      const north = requireNumber("north", "North");
      const depth = requireNumber("depth", "Depth");
      if (east === null || north === null || depth === null) return;
      return onSubmit({
        projectId: context.projectId,
        zoneId: context.zoneId,
        name: t("name"),
        east,
        north,
        depth,
        type: t("type") || "DDH",
        elevation: toNumber("elevation"),
        azimuth: toNumber("azimuth"),
        dip: toNumber("dip"),
        campaign: t("campaign") || undefined,
        year: toNumber("year")
      });
    }
    if (type === "interval") {
      if (!context.drillHoleId) {
        setValidationError("No hay drillhole seleccionado.");
        return;
      }
      const fromDepth = requireNumber("fromDepth", "From depth");
      const toDepth = requireNumber("toDepth", "To depth");
      if (fromDepth === null || toDepth === null) return;
      return onSubmit({ drillHoleId: context.drillHoleId, fromDepth, toDepth });
    }
    if (type === "assay") {
      if (!context.intervalId) {
        setValidationError("No hay interval seleccionado.");
        return;
      }
      const au = requireNumber("au", "Au");
      const cu = requireNumber("cu", "Cu");
      const ag = requireNumber("ag", "Ag");
      if (au === null || cu === null || ag === null) return;
      return onSubmit({ intervalId: context.intervalId, au, cu, ag, assayMethod: t("assayMethod") || "AAS", laboratory: t("laboratory") || undefined });
    }
    if (type === "lithology") return onSubmit({ intervalId: context.intervalId, rockType: t("rockType") || undefined, alteration: t("alteration") || undefined, mineralization: t("mineralization") || undefined, comments: t("comments") || undefined });
    if (type === "qaqc") return onSubmit({ assayId: context.assayId, type: t("qaqcType") || "BLANK", passed: (t("passed") || "true") === "true", notes: t("notes") || undefined });
    if (!context.projectId) {
      setValidationError("No hay project seleccionado.");
      return;
    }
    const cutoff = requireNumber("cutoff", "Cutoff");
    const tonnes = requireNumber("tonnes", "Tonnes");
    const au = requireNumber("au", "Au");
    const cu = requireNumber("cu", "Cu");
    const ag = requireNumber("ag", "Ag");
    const cuEq = requireNumber("cuEq", "CuEq");
    if (
      cutoff === null ||
      tonnes === null ||
      au === null ||
      cu === null ||
      ag === null ||
      cuEq === null
    ) {
      return;
    }
    return onSubmit({ projectId: context.projectId, type: t("resourceType") || "OPEN_PIT", category: t("resourceCategory") || "MEASURED", cutoff, tonnes, au, cu, ag, cuEq, description: t("description") || undefined });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Crear {type}</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {type === "project" ? (
            <>
              <input className={inputClassName} placeholder="Nombre del proyecto" onChange={(e) => set("name", e.target.value)} />
              <input className={inputClassName} placeholder="Ubicación (opcional)" onChange={(e) => set("location", e.target.value)} />
              <input className={`${inputClassName} col-span-2`} placeholder="Descripción (opcional)" onChange={(e) => set("description", e.target.value)} />
            </>
          ) : null}
          {type === "zone" ? (
            <>
              <input className={inputClassName} placeholder="Nombre de la zona" onChange={(e) => set("name", e.target.value)} />
              <input className={inputClassName} placeholder="Descripción (opcional)" onChange={(e) => set("description", e.target.value)} />
            </>
          ) : null}
          {type === "drillhole" ? (
            <>
              <input className={inputClassName} placeholder="Nombre del drillhole" onChange={(e) => set("name", e.target.value)} />
              <select className={inputClassName} onChange={(e) => set("type", e.target.value)} defaultValue="DDH"><option>DDH</option><option>RC</option><option>AC</option><option>OTHER</option></select>
              <input type="number" step="any" className={inputClassName} placeholder="East (ej: 503210.1254)" onChange={(e) => set("east", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="North (ej: 7712450.2231)" onChange={(e) => set("north", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="Depth (ej: 220.5)" onChange={(e) => set("depth", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="Elevation (opcional)" onChange={(e) => set("elevation", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="Azimuth (opcional)" onChange={(e) => set("azimuth", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="Dip (opcional)" onChange={(e) => set("dip", e.target.value)} />
              <input className={inputClassName} placeholder="Campaign (opcional)" onChange={(e) => set("campaign", e.target.value)} />
              <input type="number" step="1" className={inputClassName} placeholder="Year (opcional)" onChange={(e) => set("year", e.target.value)} />
            </>
          ) : null}
          {type === "interval" ? (
            <>
              <input type="number" step="any" className={inputClassName} placeholder="From depth (ej: 0)" onChange={(e) => set("fromDepth", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="To depth (ej: 25)" onChange={(e) => set("toDepth", e.target.value)} />
            </>
          ) : null}
          {type === "assay" ? (
            <>
              <input type="number" step="any" className={inputClassName} placeholder="Au (ej: 0.35)" onChange={(e) => set("au", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="Cu (ej: 0.12)" onChange={(e) => set("cu", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="Ag (ej: 4.8)" onChange={(e) => set("ag", e.target.value)} />
              <select className={inputClassName} onChange={(e) => set("assayMethod", e.target.value)} defaultValue="AAS"><option>AAS</option><option>ICP</option><option>XRF</option><option>OTHER</option></select>
              <input className={`${inputClassName} col-span-2`} placeholder="Laboratorio (opcional)" onChange={(e) => set("laboratory", e.target.value)} />
            </>
          ) : null}
          {type === "lithology" ? (
            <>
              <input className={inputClassName} placeholder="Rock type (opcional)" onChange={(e) => set("rockType", e.target.value)} />
              <input className={inputClassName} placeholder="Alteration (opcional)" onChange={(e) => set("alteration", e.target.value)} />
              <input className={inputClassName} placeholder="Mineralization (opcional)" onChange={(e) => set("mineralization", e.target.value)} />
              <input className={inputClassName} placeholder="Comments (opcional)" onChange={(e) => set("comments", e.target.value)} />
            </>
          ) : null}
          {type === "qaqc" ? (
            <>
              <select className={inputClassName} onChange={(e) => set("qaqcType", e.target.value)} defaultValue="BLANK"><option>BLANK</option><option>DUPLICATE</option><option>STANDARD</option></select>
              <select className={inputClassName} onChange={(e) => set("passed", e.target.value)} defaultValue="true"><option value="true">Passed: Sí</option><option value="false">Passed: No</option></select>
              <input className={`${inputClassName} col-span-2`} placeholder="Notes (opcional)" onChange={(e) => set("notes", e.target.value)} />
            </>
          ) : null}
          {type === "resource" ? (
            <>
              <select className={inputClassName} onChange={(e) => set("resourceType", e.target.value)} defaultValue="OPEN_PIT"><option>OPEN_PIT</option><option>UNDERGROUND</option></select>
              <select className={inputClassName} onChange={(e) => set("resourceCategory", e.target.value)} defaultValue="MEASURED"><option>MEASURED</option><option>INDICATED</option><option>INFERRED</option></select>
              <input type="number" step="any" className={inputClassName} placeholder="Cutoff" onChange={(e) => set("cutoff", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="Tonnes" onChange={(e) => set("tonnes", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="Au" onChange={(e) => set("au", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="Cu" onChange={(e) => set("cu", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="Ag" onChange={(e) => set("ag", e.target.value)} />
              <input type="number" step="any" className={inputClassName} placeholder="CuEq" onChange={(e) => set("cuEq", e.target.value)} />
              <input className={`${inputClassName} col-span-2`} placeholder="Descripción (opcional)" onChange={(e) => set("description", e.target.value)} />
            </>
          ) : null}
        </div>
        {validationError ? (
          <p className="mt-3 text-sm text-[var(--color-error)]">{validationError}</p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-sm">Cancelar</button>
          <button onClick={() => void submit()} className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-on-primary)]">Crear</button>
        </div>
      </div>
    </div>
  );
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: Array<Array<string | React.ReactNode>>; empty: string; }) {
  return (
    <div className="table-scroll overflow-x-auto rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] shadow-sm">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, idx) => (
            <tr key={idx} className={`border-t border-[var(--color-border-soft)] transition hover:bg-[var(--color-surface-container-highest)] ${idx % 2 === 0 ? "bg-transparent" : "bg-[var(--color-surface-container)]/45"}`}>
              {row.map((col, i) => (
                <td key={i} className="px-3 py-2 text-sm">{col}</td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={headers.length} className="px-3 py-4 text-sm text-[var(--color-on-surface-variant)]">{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
