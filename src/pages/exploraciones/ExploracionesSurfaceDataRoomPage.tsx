import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Layers, Plus, X } from "lucide-react";
import imgAcadAgN0 from "@/assets/images/ACAD-nivel 0 OFICIAL GEOQUIMICO AG-Model_page-0001.jpg";
import imgAcadCuN0 from "@/assets/images/ACAD-nivel 0 OFICIAL GEOQUIMICO CU-Modelo_page-0001.jpg";
import imgGeoCentralAg from "@/assets/images/GEOQUIMICO_CENTRAL_PLATA.jpg";
import imgGeoCobre from "@/assets/images/GEOQUIMICO_COBRE.jpg";
import imgGeoGeneral from "@/assets/images/GEOQUIMICO_GENERAL.jpg";
import imgGeoGeneralCu from "@/assets/images/GEOQUIMICO_GENERAL_COBRE.jpg";
import imgGeoCuLipena from "@/assets/images/GEOQUIMICO_LIPEÑA_COBRE_page-0001.jpg";
import imgGeoLipena from "@/assets/images/GEOQUIMICO_LIPEÑA_page-0001.jpg";
import imgGeoMosa from "@/assets/images/GEOQUIMICO_MOSA.jpg";
import imgMapGeoN40 from "@/assets/images/MAPEO GEOLOGICO N-40_page-0001.jpg";
import imgMuestreoAg from "@/assets/images/MUESTREO DE Ag.jpg";
import imgMuestreoAu from "@/assets/images/MUESTREO DE Au.jpg";
import imgMuestreoCu from "@/assets/images/MUESTREO DE Cu.jpg";
import imgStructN0 from "@/assets/images/Nivel 0 mapeo ESTRUCTURAS MINERALIZADAS_page-0001.jpg";
import imgPlanoEstructuras from "@/assets/images/PLANO DE ESTRUCTURAS.jpg";
import imgPlanoAgN40 from "@/assets/images/PLANO GEOQUIMICO N-40 Ag_page-0001.jpg";
import imgPlanoCuN40 from "@/assets/images/PLANO GEOQUIMICO N-40 CU_page-0001.jpg";
import imgExtra01 from "@/assets/images/1778439714268-9e0fd1f6-7558-4c58-a69e-c0c6db4e41ac_1.jpg";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useCreateMiningAreaMutation,
  useCreateMiningLaborMutation,
  useCreateMiningLevelMutation,
  useCreateSampleLaboratoryMutation,
  useCreateSampleQaqcMutation,
  useCreateSampleResultMutation,
  useCreateSurfaceElementMutation,
  useCreateSurfaceLaboratoryMutation,
  useCreateSurfaceSampleMutation,
  useMiningAreasQuery,
  useMiningLaborsQuery,
  useMiningLevelsQuery,
  useSampleLaboratoriesQuery,
  useSampleQaqcQuery,
  useSampleResultsBySampleQuery,
  useSurfaceElementsQuery,
  useSurfaceLaboratoriesQuery,
  useSurfaceSamplesQuery
} from "@/features/exploraciones/hooks/useSurfaceExploration";

function p(areaId?: string, levelId?: string, laborId?: string, sampleId?: string) {
  if (!areaId) return "/exploraciones-data-room/surface";
  if (!levelId) return `/exploraciones-data-room/surface/areas/${areaId}`;
  if (!laborId) return `/exploraciones-data-room/surface/areas/${areaId}/levels/${levelId}`;
  if (!sampleId)
    return `/exploraciones-data-room/surface/areas/${areaId}/levels/${levelId}/labors/${laborId}`;
  return `/exploraciones-data-room/surface/areas/${areaId}/levels/${levelId}/labors/${laborId}/samples/${sampleId}`;
}

type ModalType =
  | "area"
  | "level"
  | "labor"
  | "sample"
  | "laboratory"
  | "sampleLaboratory"
  | "element"
  | "result"
  | "qaqc";

// Editable image scheme: update this object when new maps/models are added.
const SURFACE_IMAGE_SCHEME = {
  default: ["GEOQUIMICO_GENERAL.jpg"],
  byAreaId: {
    // Ayda
    "640d7ed2-66b6-4ca6-85df-8b113205e256": ["GEOQUIMICO_GENERAL.jpg", "GEOQUIMICO_COBRE.jpg"],
    // Central
    "b9e1f191-8ac8-46aa-9f47-fbf3bc301025": ["GEOQUIMICO_CENTRAL_PLATA.jpg", "GEOQUIMICO_GENERAL_COBRE.jpg", "GEOQUIMICO_COBRE.jpg"],
    // El Progreso
    "f7259e26-68ac-4190-9299-fc5bae8f6131": ["GEOQUIMICO_GENERAL.jpg", "GEOQUIMICO_COBRE.jpg"],
    // Horizonte
    "365d677a-63ec-42c8-ac51-43d8323bb9e7": ["GEOQUIMICO_GENERAL.jpg", "PLANO DE ESTRUCTURAS.jpg"],
    // Lipeña
    "2e802037-351e-40a1-a219-d097eebba799": [
      "GEOQUIMICO_LIPEÑA_page-0001.jpg",
      "GEOQUIMICO_LIPEÑA_COBRE_page-0001.jpg",
      "PLANO DE ESTRUCTURAS.jpg"
    ],
    // Mosa
    "ba3aca6c-0545-4e82-82fd-2a62108cd939": ["GEOQUIMICO_MOSA.jpg", "GEOQUIMICO_GENERAL.jpg", "1778439714268-9e0fd1f6-7558-4c58-a69e-c0c6db4e41ac_1.jpg"]
  } as Record<string, string[]>,
  byLevelId: {
    // Lipeña - Cuadro
    "39c57d4b-2c42-4f81-9948-6e40a7bdf431": [
      "GEOQUIMICO_LIPEÑA_page-0001.jpg",
      "GEOQUIMICO_LIPEÑA_COBRE_page-0001.jpg"
    ],
    // Lipeña - Nivel 0
    "baaf5c29-50ab-4e5f-887d-ccd119e36b23": [
      "ACAD-nivel 0 OFICIAL GEOQUIMICO AG-Model_page-0001.jpg",
      "ACAD-nivel 0 OFICIAL GEOQUIMICO CU-Modelo_page-0001.jpg",
      "Nivel 0 mapeo ESTRUCTURAS MINERALIZADAS_page-0001.jpg"
    ],
    // Lipeña - Nivel 40
    "83e3f378-9e92-4da5-a18a-f9da29249e87": [
      "MAPEO GEOLOGICO N-40_page-0001.jpg",
      "PLANO GEOQUIMICO N-40 Ag_page-0001.jpg",
      "PLANO GEOQUIMICO N-40 CU_page-0001.jpg",
      "MUESTREO DE Ag.jpg",
      "MUESTREO DE Cu.jpg",
      "MUESTREO DE Au.jpg"
    ],
    // Lipeña - Nivel 80
    "a78257c0-cef5-4dbe-a73b-fb44131e976e": [
      "PLANO DE ESTRUCTURAS.jpg",
      "MUESTREO DE Ag.jpg",
      "MUESTREO DE Cu.jpg"
    ]
  } as Record<string, string[]>
};

function getSampleTopNumericValue(sample: any): number {
  const direct = Array.isArray(sample?.results) ? sample.results : [];
  const byLab = Array.isArray(sample?.sampleLabs)
    ? sample.sampleLabs.flatMap((x: any) => (Array.isArray(x?.results) ? x.results : []))
    : [];
  const merged = [...direct, ...byLab];
  const numeric = merged.filter((r: any) => typeof r?.value === "number");
  if (!numeric.length) return Number.NEGATIVE_INFINITY;
  return numeric.reduce((max: number, r: any) => (r.value > max ? r.value : max), Number.NEGATIVE_INFINITY);
}

export function ExploracionesSurfaceDataRoomPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERINTENDENTE";
  const { areaId, levelId, laborId, sampleId } = useParams();
  const [modal, setModal] = useState<ModalType | null>(null);
  const [slide, setSlide] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [sampleRowsPerPage, setSampleRowsPerPage] = useState<5 | 10>(5);
  const [samplePage, setSamplePage] = useState(0);
  const relevantSampleRef = useRef<HTMLDivElement | null>(null);

  const areas = useMiningAreasQuery();
  const levels = useMiningLevelsQuery(areaId);
  const labors = useMiningLaborsQuery(levelId);
  const samples = useSurfaceSamplesQuery(laborId, Boolean(levelId || laborId));
  const sampleLabs = useSampleLaboratoriesQuery(sampleId);
  const results = useSampleResultsBySampleQuery(sampleId);
  const qaqc = useSampleQaqcQuery(sampleId);
  const laboratories = useSurfaceLaboratoriesQuery();
  const elements = useSurfaceElementsQuery();

  const createArea = useCreateMiningAreaMutation();
  const createLevel = useCreateMiningLevelMutation();
  const createLabor = useCreateMiningLaborMutation();
  const createSample = useCreateSurfaceSampleMutation();
  const createLab = useCreateSurfaceLaboratoryMutation();
  const createSampleLab = useCreateSampleLaboratoryMutation();
  const createElement = useCreateSurfaceElementMutation();
  const createResult = useCreateSampleResultMutation();
  const createQaqc = useCreateSampleQaqcMutation();

  const selectedSample = useMemo(
    () => (samples.data ?? []).find((s) => s.id === sampleId),
    [samples.data, sampleId]
  );
  const selectedSampleResults = useMemo(() => {
    if (!selectedSample) return [];
    const direct = Array.isArray((selectedSample as any).results) ? (selectedSample as any).results : [];
    const byLab = Array.isArray((selectedSample as any).sampleLabs)
      ? (selectedSample as any).sampleLabs.flatMap((x: any) => (Array.isArray(x?.results) ? x.results : []))
      : [];
    const fromEndpoint = Array.isArray(results.data) ? results.data : [];
    const merged = [...direct, ...byLab, ...fromEndpoint];
    const dedup = new Map<string, any>();
    merged.forEach((r: any) => {
      const key = String(r?.id ?? `${r?.elementId}-${r?.sampleLaboratoryId ?? "none"}-${r?.value ?? "na"}-${r?.sourceColumn ?? "na"}`);
      if (!dedup.has(key)) dedup.set(key, r);
    });
    return Array.from(dedup.values());
  }, [selectedSample, results.data]);
  const sampleRows = useMemo(() => {
    const all = samples.data ?? [];
    if (laborId) {
      return [...all].sort((a: any, b: any) => getSampleTopNumericValue(b) - getSampleTopNumericValue(a));
    }
    if (!levelId) return [];
    const laborSet = new Set((labors.data ?? []).map((l) => l.id));
    return all
      .filter((s) => laborSet.has(s.miningLaborId))
      .sort((a: any, b: any) => getSampleTopNumericValue(b) - getSampleTopNumericValue(a));
  }, [samples.data, laborId, levelId, labors.data]);
  const sampleTotalPages = Math.max(1, Math.ceil(sampleRows.length / sampleRowsPerPage));
  const safeSamplePage = Math.min(samplePage, sampleTotalPages - 1);
  const pagedSamples = useMemo(() => {
    const start = safeSamplePage * sampleRowsPerPage;
    return sampleRows.slice(start, start + sampleRowsPerPage);
  }, [sampleRows, safeSamplePage, sampleRowsPerPage]);
  const sampleLabMap = useMemo(() => {
    const map = new Map<string, string>();
    (sampleLabs.data ?? []).forEach((x) => map.set(x.id, `${x.slot} · ${x.laboratoryId}`));
    const fromSelected = Array.isArray((selectedSample as any)?.sampleLabs) ? (selectedSample as any).sampleLabs : [];
    fromSelected.forEach((x: any) => {
      const labId = x?.laboratoryId ?? x?.laboratory?.id;
      if (x?.id && labId) map.set(x.id, `${x.slot} · ${labId}`);
    });
    return map;
  }, [sampleLabs.data, selectedSample]);
  const laboratoryMap = useMemo(() => {
    const map = new Map<string, string>();
    (laboratories.data ?? []).forEach((x) => map.set(x.id, x.name));
    return map;
  }, [laboratories.data]);
  const elementMap = useMemo(() => {
    const map = new Map<string, string>();
    (elements.data ?? []).forEach((x) => map.set(x.id, `${x.symbol} (${x.name})`));
    return map;
  }, [elements.data]);
  const modelImages = useMemo(() => {
    const allImages = [
      imgGeoGeneral,
      imgGeoGeneralCu,
      imgGeoCentralAg,
      imgGeoCobre,
      imgGeoMosa,
      imgExtra01,
      imgAcadAgN0,
      imgAcadCuN0,
      imgGeoCuLipena,
      imgGeoLipena,
      imgMapGeoN40,
      imgStructN0,
      imgPlanoEstructuras,
      imgMuestreoAg,
      imgMuestreoAu,
      imgMuestreoCu,
      imgPlanoAgN40,
      imgPlanoCuN40
    ];

    const imageByName: Record<string, string> = {
      "1778439714268-9e0fd1f6-7558-4c58-a69e-c0c6db4e41ac_1.jpg": imgExtra01,
      "GEOQUIMICO_COBRE.jpg": imgGeoCobre,
      "GEOQUIMICO_GENERAL.jpg": imgGeoGeneral,
      "GEOQUIMICO_GENERAL_COBRE.jpg": imgGeoGeneralCu,
      "GEOQUIMICO_CENTRAL_PLATA.jpg": imgGeoCentralAg,
      "GEOQUIMICO_MOSA.jpg": imgGeoMosa,
      "GEOQUIMICO_LIPEÑA_page-0001.jpg": imgGeoLipena,
      "GEOQUIMICO_LIPEÑA_COBRE_page-0001.jpg": imgGeoCuLipena,
      "ACAD-nivel 0 OFICIAL GEOQUIMICO AG-Model_page-0001.jpg": imgAcadAgN0,
      "ACAD-nivel 0 OFICIAL GEOQUIMICO CU-Modelo_page-0001.jpg": imgAcadCuN0,
      "Nivel 0 mapeo ESTRUCTURAS MINERALIZADAS_page-0001.jpg": imgStructN0,
      "MAPEO GEOLOGICO N-40_page-0001.jpg": imgMapGeoN40,
      "PLANO GEOQUIMICO N-40 Ag_page-0001.jpg": imgPlanoAgN40,
      "PLANO GEOQUIMICO N-40 CU_page-0001.jpg": imgPlanoCuN40,
      "PLANO DE ESTRUCTURAS.jpg": imgPlanoEstructuras,
      "MUESTREO DE Ag.jpg": imgMuestreoAg,
      "MUESTREO DE Au.jpg": imgMuestreoAu,
      "MUESTREO DE Cu.jpg": imgMuestreoCu
    };

    const resolve = (names: string[]) =>
      names.map((n) => imageByName[n]).filter((src): src is string => Boolean(src));

    if (!areaId && !levelId) {
      const initial = resolve(SURFACE_IMAGE_SCHEME.default);
      return initial.length ? initial : allImages;
    }
    if (levelId && SURFACE_IMAGE_SCHEME.byLevelId[levelId]) {
      const selected = resolve(SURFACE_IMAGE_SCHEME.byLevelId[levelId]);
      if (selected.length) return selected;
    }
    if (areaId && SURFACE_IMAGE_SCHEME.byAreaId[areaId]) {
      const selected = resolve(SURFACE_IMAGE_SCHEME.byAreaId[areaId]);
      if (selected.length) return selected;
    }
    return allImages;
  }, [areaId, levelId, laborId]);
  const getTopResult = (sample: any) => {
    const direct = Array.isArray(sample?.results) ? sample.results : [];
    const byLab = Array.isArray(sample?.sampleLabs)
      ? sample.sampleLabs.flatMap((x: any) => (Array.isArray(x?.results) ? x.results : []))
      : [];
    const merged = [...direct, ...byLab];
    if (!merged.length) return null;
    const numeric = merged.filter((r: any) => typeof r?.value === "number");
    if (!numeric.length) return null;
    const top = numeric.reduce(
      (acc: any, cur: any) => (cur.value > acc.value ? cur : acc),
      numeric[0]
    );
    return {
      symbol: top?.element?.symbol ?? top?.element?.name ?? "Result",
      value: top?.value,
      unit: top?.unit ?? top?.element?.defaultUnit ?? ""
    };
  };
  const resultBadgeClass = (value?: number) => {
    if (value === undefined || value === null) {
      return "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]";
    }
    return "bg-lime-400 text-lime-950 ring-1 ring-lime-500/70";
  };

  useEffect(() => {
    if (sampleId && relevantSampleRef.current) {
      relevantSampleRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [sampleId]);
  useEffect(() => {
    setSlide(0);
  }, [modelImages]);
  useEffect(() => {
    if (!fullScreen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setDragging(false);
    }
  }, [fullScreen]);
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [slide]);

  const clampZoom = (value: number) => Math.min(6, Math.max(1, value));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (!canManage) return <Navigate to="/perfil" replace />;

  return (
    <section className="space-y-4 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-1 text-xs text-[var(--color-on-surface-variant)]">
            <Link
              to="/exploraciones-data-room"
              className="text-[var(--color-primary)] hover:underline"
            >
              Exploraciones Data Room
            </Link>
            <ChevronRight size={12} />
            <span>Surface</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-[var(--color-primary)]" />
          <div>
            <h1 className="text-xl font-bold">Surface Data Room</h1>
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              Mining Area → Mining Level → Mining Labor (top) + Sample/Results view (bottom-right)
            </p>
          </div>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Hierarchy</h2>
          <div className="flex flex-wrap gap-2">
            <AddBtn label="Add Area" onClick={() => setModal("area")} />
            {areaId ? <AddBtn label="Add Level" onClick={() => setModal("level")} /> : null}
            {laborId ? <AddBtn label="Add Sample" onClick={() => setModal("sample")} /> : null}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <MiniList
            title="Areas"
            items={(areas.data ?? []).map((x) => ({
              id: x.id,
              label: x.name,
              to: p(x.id),
              selected: x.id === areaId
            }))}
          />
          <MiniList
            title="Levels"
            items={(levels.data ?? []).map((x) => ({
              id: x.id,
              label: x.name,
              to: p(areaId, x.id),
              selected: x.id === levelId
            }))}
          />
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-9">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4 xl:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold">Models / Images</h3>
            <button
              onClick={() => setFullScreen(true)}
              className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
            >
              Fullscreen
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border-soft)]">
            <img
              src={modelImages[slide]}
              alt={`Model ${slide + 1}`}
              className="h-[320px] w-full object-cover"
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setSlide((s) => (s - 1 + modelImages.length) % modelImages.length)}
              className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
            >
              Prev
            </button>
            <div className="flex gap-2">
              {modelImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={`h-2.5 w-2.5 rounded-full ${i === slide ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-soft)]"}`}
                />
              ))}
            </div>
            <button
              onClick={() => setSlide((s) => (s + 1) % modelImages.length)}
              className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
            >
              Next
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">
            Images are demo placeholders linked to selected Area/Level/Labor.
          </p>
        </article>

        <div className="space-y-4 xl:col-span-6">
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Samples</h3>
              <div className="flex items-center gap-2">
                <select
                  value={sampleRowsPerPage}
                  onChange={(e) => {
                    setSampleRowsPerPage(Number(e.target.value) as 5 | 10);
                    setSamplePage(0);
                  }}
                  className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-2 py-1 text-xs"
                >
                  <option value={5}>5 rows</option>
                  <option value={10}>10 rows</option>
                </select>
                {laborId ? <AddBtn label="Add Sample" onClick={() => setModal("sample")} /> : null}
              </div>
            </div>
            <div className="min-h-[240px]">
              <Table
                headers={["Code", "Type", "Top Result", "Sampled At", "Open"]}
                rows={pagedSamples.map((s) => [
                  s.code,
                  s.sampleType ?? "-",

                  (() => {
                    const top = getTopResult(s);
                    if (!top)
                      return <span className="text-[var(--color-on-surface-variant)]">-</span>;
                    return (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${resultBadgeClass(top.value)}`}
                      >
                        {top.symbol}: {top.value}
                        {top.unit ? ` ${top.unit}` : ""}
                      </span>
                    );
                  })(),
                  s.sampledAt ? new Date(s.sampledAt).toLocaleDateString("es-BO") : "-",
                  <Link
                    key={s.id}
                    className="text-[var(--color-primary)]"
                    to={p(areaId, levelId, s.miningLaborId, s.id)}
                  >
                    Select
                  </Link>
                ])}
                empty={
                  laborId
                    ? "No samples in selected labor."
                    : levelId
                      ? "No samples in selected level."
                      : "Select a level to view samples."
                }
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
              <span>
                Page {safeSamplePage + 1} / {sampleTotalPages} · {sampleRows.length} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSamplePage((p) => Math.max(0, p - 1))}
                  disabled={safeSamplePage <= 0}
                  className="rounded-md border border-[var(--color-border-soft)] px-2 py-1 disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  onClick={() => setSamplePage((p) => Math.min(sampleTotalPages - 1, p + 1))}
                  disabled={safeSamplePage >= sampleTotalPages - 1}
                  className="rounded-md border border-[var(--color-border-soft)] px-2 py-1 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
            <div
              ref={relevantSampleRef}
              className="mt-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3"
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
                Relevant Sample Data
              </p>
              {selectedSample ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <K label="Code" value={selectedSample.code} />
                  {/* <K label="Name" value={selectedSample.name ?? "-"} /> */}
                  <K label="Sample Type" value={selectedSample.sampleType ?? "-"} />
                  {/* <K label="Number" value={selectedSample.number ?? "-"} /> */}
                  <K label="Place Ref." value={selectedSample.placeReference ?? "-"} />
                  <K label="Sampled At" value={selectedSample.sampledAt ?? "-"} />
                  <K label="East" value={selectedSample.east ?? "-"} />
                  <K label="North" value={selectedSample.north ?? "-"} />
                  <K label="Elevation" value={selectedSample.elevation ?? "-"} />
                  <K label="Description" value={selectedSample.description ?? "-"} />
                </div>
              ) : (
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  Select a sample to see key fields.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Results Panel</h3>
              <div className="flex flex-wrap gap-2">
                <AddBtn label="Laboratory" onClick={() => setModal("laboratory")} />
                <AddBtn label="Sample-Lab" onClick={() => setModal("sampleLaboratory")} />
                <AddBtn label="Element" onClick={() => setModal("element")} />
                <AddBtn label="Result" onClick={() => setModal("result")} />
                <AddBtn label="QAQC" onClick={() => setModal("qaqc")} />
              </div>
            </div>
            <div className="space-y-3">
              <Table
                headers={["Laboratory", "Element", "Value", "Unit"]}
                rows={selectedSampleResults.map((x: any) => [
                  x.sampleLaboratoryId
                    ? (() => {
                        const slotLaboratory = sampleLabMap.get(x.sampleLaboratoryId);
                        if (!slotLaboratory) return "-";
                        const parts = slotLaboratory.split(" · ");
                        const labId = parts[1];
                        return laboratoryMap.get(labId) ?? labId ?? "-";
                      })()
                    : "-",
                  elementMap.get(x.elementId) ?? x.elementId,
                  x.value ?? "-",
                  x.unit ?? x.element?.defaultUnit ?? "-"
                ])}
                empty={
                  sampleId ? "No results for selected sample." : "Select a sample to view results."
                }
              />
              {/* <Table
                headers={["Type", "Passed", "Expected", "Obtained", "Deviation %", "Comments"]}
                rows={(qaqc.data ?? []).map((x) => [
                  x.type,
                  x.passed === null || x.passed === undefined ? "-" : x.passed ? "Yes" : "No",
                  x.expectedValue ?? "-",
                  x.obtainedValue ?? "-",
                  x.deviationPercent ?? "-",
                  x.comments ?? "-"
                ])}
                empty={sampleId ? "No QAQC for selected sample." : "Select a sample to view QAQC."}
              /> */}
            </div>
          </article>
        </div>
      </div>

      {fullScreen ? (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 p-4"
          onMouseMove={(e) => {
            if (!dragging) return;
            setPan({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y
            });
          }}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
        >
          <button
            onClick={() => setFullScreen(false)}
            className="absolute right-6 top-6 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Close
          </button>
          <div className="absolute left-6 top-6 flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => clampZoom(z - 0.25))}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Zoom -
            </button>
            <button
              onClick={() => setZoom((z) => clampZoom(z + 0.25))}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Zoom +
            </button>
            <button
              onClick={resetView}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Reset
            </button>
            <span className="rounded-lg border border-white/20 px-2 py-1 text-xs text-white/90">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <button
            onClick={() => setSlide((s) => (s - 1 + modelImages.length) % modelImages.length)}
            className="absolute left-4 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white"
          >
            Prev
          </button>
          <div
            className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl"
            onWheel={(e) => {
              e.preventDefault();
              const direction = e.deltaY > 0 ? -0.12 : 0.12;
              setZoom((z) => clampZoom(z + direction));
            }}
            onDoubleClick={resetView}
          >
            <img
              src={modelImages[slide]}
              alt={`Model ${slide + 1}`}
              draggable={false}
              onMouseDown={(e) => {
                if (zoom <= 1) return;
                setDragging(true);
                setDragStart({
                  x: e.clientX - pan.x,
                  y: e.clientY - pan.y
                });
              }}
              className={`max-h-[90vh] max-w-[90vw] select-none object-contain ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: dragging ? "none" : "transform 120ms ease"
              }}
            />
          </div>
          <button
            onClick={() => setSlide((s) => (s + 1) % modelImages.length)}
            className="absolute right-4 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white"
          >
            Next
          </button>
        </div>
      ) : null}

      {modal ? (
        <SurfaceCreateModal
          type={modal}
          areaId={areaId}
          levelId={levelId}
          laborId={laborId}
          sampleId={sampleId}
          laboratories={laboratories.data ?? []}
          sampleLaboratories={sampleLabs.data ?? []}
          elements={elements.data ?? []}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            if (modal === "area") await createArea.mutateAsync(payload as any);
            if (modal === "level") await createLevel.mutateAsync(payload as any);
            if (modal === "labor") await createLabor.mutateAsync(payload as any);
            if (modal === "sample") await createSample.mutateAsync(payload as any);
            if (modal === "laboratory") await createLab.mutateAsync(payload as any);
            if (modal === "sampleLaboratory") await createSampleLab.mutateAsync(payload as any);
            if (modal === "element") await createElement.mutateAsync(payload as any);
            if (modal === "result") await createResult.mutateAsync(payload as any);
            if (modal === "qaqc") await createQaqc.mutateAsync(payload as any);
            setModal(null);
          }}
        />
      ) : null}
    </section>
  );
}

function SurfaceCreateModal({
  type,
  areaId,
  levelId,
  laborId,
  sampleId,
  laboratories,
  sampleLaboratories,
  elements,
  onClose,
  onSubmit
}: {
  type: ModalType;
  areaId?: string;
  levelId?: string;
  laborId?: string;
  sampleId?: string;
  laboratories: Array<{ id: string; name: string }>;
  sampleLaboratories: Array<{ id: string; slot: "L1" | "L2" | "L3"; laboratoryId: string }>;
  elements: Array<{ id: string; name: string; symbol: string }>;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const fieldClass =
    "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:border-[var(--color-primary)] focus:outline-none";
  const [v, setV] = useState<Record<string, string>>({});
  const set = (k: string, value: string) => setV((s) => ({ ...s, [k]: value }));
  const t = (k: string) => {
    const raw = v[k];
    if (raw === undefined) return undefined;
    const trimmed = raw.trim();
    return trimmed ? trimmed : undefined;
  };
  const n = (k: string) => {
    const raw = (v[k] ?? "").trim().replace(",", ".");
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const b = (k: string) => (v[k] ? v[k] === "true" : undefined);
  const iso = (k: string) => {
    const raw = t(k);
    if (!raw) return undefined;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold capitalize">Create {type}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-[var(--color-surface-container-high)]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {type === "area" ? (
            <>
              <input
                className={fieldClass}
                placeholder="Name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Abbreviation"
                onChange={(e) => set("abbreviation", e.target.value)}
              />
              <input
                className={`${fieldClass} col-span-2`}
                placeholder="Description"
                onChange={(e) => set("description", e.target.value)}
              />
            </>
          ) : null}
          {type === "level" ? (
            <>
              <input
                className={fieldClass}
                placeholder="Name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Abbreviation"
                onChange={(e) => set("abbreviation", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="Elevation"
                onChange={(e) => set("elevation", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Description"
                onChange={(e) => set("description", e.target.value)}
              />
            </>
          ) : null}
          {type === "labor" ? (
            <>
              <input
                className={fieldClass}
                placeholder="Name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Abbreviation"
                onChange={(e) => set("abbreviation", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Code"
                onChange={(e) => set("code", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Description"
                onChange={(e) => set("description", e.target.value)}
              />
            </>
          ) : null}
          {type === "sample" ? (
            <>
              <input
                className={fieldClass}
                placeholder="Code"
                onChange={(e) => set("code", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="1"
                placeholder="Number"
                onChange={(e) => set("number", e.target.value)}
              />
              <select
                className={fieldClass}
                defaultValue=""
                onChange={(e) => set("sampleType", e.target.value)}
              >
                <option value="">Sample Type</option>
                <option>SIMPLE</option>
                <option>DOUBLE</option>
                <option>SIMPLE_DOUBLE</option>
                <option>OTHER</option>
              </select>
              <input
                className={fieldClass}
                type="datetime-local"
                onChange={(e) => set("sampledAt", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Place Reference"
                onChange={(e) => set("placeReference", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="East"
                onChange={(e) => set("east", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="North"
                onChange={(e) => set("north", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="Elevation"
                onChange={(e) => set("elevation", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Description"
                onChange={(e) => set("description", e.target.value)}
              />
              <input
                className={`${fieldClass} col-span-2`}
                placeholder="Observations"
                onChange={(e) => set("observations", e.target.value)}
              />
            </>
          ) : null}
          {type === "laboratory" ? (
            <>
              <input
                className={fieldClass}
                placeholder="Name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Abbreviation"
                onChange={(e) => set("abbreviation", e.target.value)}
              />
              <input
                className={`${fieldClass} col-span-2`}
                placeholder="Description"
                onChange={(e) => set("description", e.target.value)}
              />
            </>
          ) : null}
          {type === "sampleLaboratory" ? (
            <>
              <select
                className={fieldClass}
                defaultValue={sampleId ?? ""}
                onChange={(e) => set("sampleId", e.target.value)}
              >
                <option value="">Sample</option>
                {sampleId ? <option value={sampleId}>{sampleId}</option> : null}
              </select>
              <select
                className={fieldClass}
                defaultValue=""
                onChange={(e) => set("laboratoryId", e.target.value)}
              >
                <option value="">Laboratory</option>
                {laboratories.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <select
                className={fieldClass}
                defaultValue="L1"
                onChange={(e) => set("slot", e.target.value)}
              >
                <option>L1</option>
                <option>L2</option>
                <option>L3</option>
              </select>
              <div className="text-xs text-[var(--color-on-surface-variant)]">
                Current slots: {sampleLaboratories.map((x) => x.slot).join(", ") || "-"}
              </div>
            </>
          ) : null}
          {type === "element" ? (
            <>
              <input
                className={fieldClass}
                placeholder="Name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Symbol"
                onChange={(e) => set("symbol", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Default Unit"
                onChange={(e) => set("defaultUnit", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Description"
                onChange={(e) => set("description", e.target.value)}
              />
            </>
          ) : null}
          {type === "result" ? (
            <>
              <select
                className={fieldClass}
                defaultValue={sampleId ?? ""}
                onChange={(e) => set("sampleId", e.target.value)}
              >
                <option value="">Sample</option>
                {sampleId ? <option value={sampleId}>{sampleId}</option> : null}
              </select>
              <select
                className={fieldClass}
                defaultValue=""
                onChange={(e) => set("sampleLaboratoryId", e.target.value)}
              >
                <option value="">Sample-Laboratory (optional)</option>
                {sampleLaboratories.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.slot} · {x.laboratoryId}
                  </option>
                ))}
              </select>
              <select
                className={fieldClass}
                defaultValue=""
                onChange={(e) => set("elementId", e.target.value)}
              >
                <option value="">Element</option>
                {elements.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.symbol} ({e.name})
                  </option>
                ))}
              </select>
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="Value"
                onChange={(e) => set("value", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Qualifier"
                onChange={(e) => set("qualifier", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Unit"
                onChange={(e) => set("unit", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Source Column"
                onChange={(e) => set("sourceColumn", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Comments"
                onChange={(e) => set("comments", e.target.value)}
              />
            </>
          ) : null}
          {type === "qaqc" ? (
            <>
              <select
                className={fieldClass}
                defaultValue={sampleId ?? ""}
                onChange={(e) => set("sampleId", e.target.value)}
              >
                <option value="">Sample</option>
                {sampleId ? <option value={sampleId}>{sampleId}</option> : null}
              </select>
              <input
                className={fieldClass}
                placeholder="Type"
                onChange={(e) => set("type", e.target.value)}
              />
              <select
                className={fieldClass}
                defaultValue=""
                onChange={(e) => set("passed", e.target.value)}
              >
                <option value="">Passed?</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="Expected Value"
                onChange={(e) => set("expectedValue", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="Obtained Value"
                onChange={(e) => set("obtainedValue", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="Deviation %"
                onChange={(e) => set("deviationPercent", e.target.value)}
              />
              <input
                className={`${fieldClass} col-span-2`}
                placeholder="Comments"
                onChange={(e) => set("comments", e.target.value)}
              />
            </>
          ) : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border-soft)] px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              void (async () => {
                if (type === "area")
                  await onSubmit({
                    name: t("name"),
                    abbreviation: t("abbreviation"),
                    description: t("description")
                  });
                if (type === "level")
                  await onSubmit({
                    miningAreaId: areaId,
                    name: t("name"),
                    abbreviation: t("abbreviation"),
                    elevation: n("elevation"),
                    description: t("description")
                  });
                if (type === "labor")
                  await onSubmit({
                    miningLevelId: levelId,
                    name: t("name"),
                    abbreviation: t("abbreviation"),
                    code: t("code"),
                    description: t("description")
                  });
                if (type === "sample")
                  await onSubmit({
                    miningLaborId: laborId,
                    number: n("number"),
                    sampledAt: iso("sampledAt"),
                    name: t("name"),
                    sampleType: t("sampleType"),
                    code: t("code"),
                    placeReference: t("placeReference"),
                    east: n("east"),
                    north: n("north"),
                    elevation: n("elevation"),
                    description: t("description"),
                    observations: t("observations")
                  });
                if (type === "laboratory")
                  await onSubmit({
                    name: t("name"),
                    abbreviation: t("abbreviation"),
                    description: t("description")
                  });
                if (type === "sampleLaboratory")
                  await onSubmit({
                    sampleId: t("sampleId") ?? sampleId,
                    laboratoryId: t("laboratoryId"),
                    slot: t("slot") ?? "L1"
                  });
                if (type === "element")
                  await onSubmit({
                    name: t("name"),
                    symbol: t("symbol"),
                    defaultUnit: t("defaultUnit"),
                    description: t("description")
                  });
                if (type === "result")
                  await onSubmit({
                    sampleId: t("sampleId") ?? sampleId,
                    sampleLaboratoryId: t("sampleLaboratoryId"),
                    elementId: t("elementId"),
                    value: n("value"),
                    qualifier: t("qualifier"),
                    unit: t("unit"),
                    sourceColumn: t("sourceColumn"),
                    comments: t("comments")
                  });
                if (type === "qaqc")
                  await onSubmit({
                    sampleId: t("sampleId") ?? sampleId,
                    type: t("type"),
                    passed: b("passed"),
                    expectedValue: n("expectedValue"),
                    obtainedValue: n("obtainedValue"),
                    deviationPercent: n("deviationPercent"),
                    comments: t("comments")
                  });
              })()
            }
            className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniList({
  title,
  items
}: {
  title: string;
  items: Array<{ id: string; label: string; to: string; selected: boolean }>;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-2">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
        {title}
      </p>
      <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto pr-1 xl:grid-cols-3">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className={`block rounded px-2 py-1.5 text-sm ${item.selected ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "hover:bg-[var(--color-surface-container-highest)]"}`}
            >
              {item.label}
            </Link>
          ))
        ) : (
          <p className="px-2 py-1 text-xs text-[var(--color-on-surface-variant)]">No data</p>
        )}
      </div>
    </div>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
    >
      <Plus size={13} /> {label}
    </button>
  );
}

function K({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] px-2 py-1">
      <span className="block text-[10px] uppercase tracking-wide text-[var(--color-on-surface-variant)]">
        {label}
      </span>
      <span className="text-xs">{value}</span>
    </div>
  );
}

function Table({
  headers,
  rows,
  empty
}: {
  headers: string[];
  rows: Array<Array<string | number | ReactNode>>;
  empty: string;
}) {
  return (
    <div className="table-scroll overflow-x-auto rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, idx) => (
              <tr key={idx} className="border-t border-[var(--color-border-soft)]">
                {row.map((col, i) => (
                  <td key={i} className="px-3 py-2 text-sm">
                    {col}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-4 text-sm text-[var(--color-on-surface-variant)]"
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
