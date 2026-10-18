import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Coins, Fuel, Info, Trash2 } from "lucide-react";
import {
  useCreateTarifaLiquidacionMutation,
  useDeleteTarifaLiquidacionMutation,
  useTarifaAplicableQuery,
  useTarifasLiquidacionQuery,
  useTiposMineralQuery
} from "@/features/parametrosLogistica/hooks/useParametrosLogistica";
import type {
  TarifaLiquidacion,
  TipoCombustibleViaje,
  TipoEntidadTransportista
} from "@/features/parametrosLogistica/model/parametrosLogistica.schema";
import { useTransportistasQuery } from "@/features/transportista/hooks/useTransportistas";
import { mensajeDeError } from "@/shared/api/core/apiError";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useToast } from "@/shared/ui/toast/ToastProvider";

// ---------------------------------------------------------------------------
// Tarifas de liquidación (precio por tonelada), explicadas y con vista previa.
//
// El orden de prioridad que usa el sistema al liquidar (liquidacion.service.ts,
// buscarTarifaAplicable) es: precio ESPECIAL del transportista antes que el
// FIJO de su tipo y, dentro de cada uno, el de "con/sin combustible" antes que
// el de "el mismo precio siempre". Todo lo que se muestra acá sale de esa regla.
// ---------------------------------------------------------------------------

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const TIPO_LABEL: Record<TipoEntidadTransportista, string> = {
  EMPRESA: "Empresa",
  TRABAJADOR_PARTICULAR: "Trabajador particular"
};
const TIPO_PLURAL: Record<TipoEntidadTransportista, string> = {
  EMPRESA: "todas las Empresas",
  TRABAJADOR_PARTICULAR: "todos los Trabajadores particulares"
};

// "UNICO" = el mismo precio siempre (en la base es incluyeCombustible = null).
type CasoPrecio = "UNICO" | TipoCombustibleViaje;
const CASO_LABEL: Record<CasoPrecio, string> = {
  UNICO: "Mismo precio con o sin combustible",
  CON_COMBUSTIBLE: "Con combustible de la empresa",
  SIN_COMBUSTIBLE: "Sin combustible de la empresa"
};
const CASO_CORTO: Record<CasoPrecio, string> = {
  UNICO: "Con o sin combustible",
  CON_COMBUSTIBLE: "Con combustible",
  SIN_COMBUSTIBLE: "Sin combustible"
};

const casoDe = (t: Pick<TarifaLiquidacion, "incluyeCombustible">): CasoPrecio => t.incluyeCombustible ?? "UNICO";

// Las fechas son de calendario (medianoche UTC): se comparan como "AAAA-MM-DD".
const dia = (iso: string) => iso.slice(0, 10);
const hoyIso = () => new Date().toISOString().slice(0, 10);

function formatFecha(value: string) {
  return new Date(value).toLocaleDateString("es-BO", { timeZone: "UTC" });
}
function formatFechaIso(value: string) {
  return formatFecha(`${value}T00:00:00.000Z`);
}
function bs(value: string | number) {
  return `Bs ${Number(value).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Estado = "VIGENTE" | "PROXIMA" | "CERRADA";
function estadoDe(t: TarifaLiquidacion, hoy: string): Estado {
  if (dia(t.vigenteDesde) > hoy) return "PROXIMA";
  if (t.vigenteHasta && dia(t.vigenteHasta) <= hoy) return "CERRADA";
  return "VIGENTE";
}

function descripcionTarifa(t: TarifaLiquidacion) {
  const quien = t.transportista
    ? `${t.transportista.nombreORazonSocial} (precio especial)`
    : `${TIPO_LABEL[t.tipoEntidad]} (precio fijo)`;
  const mineral = t.tipoMineral ? ` · solo ${t.tipoMineral.nombre}` : "";
  return `${quien} · ${CASO_CORTO[casoDe(t)]}${mineral}`;
}

const ESTADO_CLASS: Record<Estado, string> = {
  VIGENTE: "bg-[var(--color-success)]/18 text-[var(--color-success)]",
  PROXIMA: "bg-[var(--color-warning)]/20 text-[var(--color-warning)]",
  CERRADA: "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]"
};
const ESTADO_LABEL: Record<Estado, string> = { VIGENTE: "Vigente", PROXIMA: "Próxima", CERRADA: "Cerrada" };

export function TarifasLiquidacionPanel() {
  const { showError, showSuccess } = useToast();
  const tarifasQuery = useTarifasLiquidacionQuery();
  const transportistasQuery = useTransportistasQuery();
  const tiposMineralQuery = useTiposMineralQuery();
  const createMutation = useCreateTarifaLiquidacionMutation();
  const deleteMutation = useDeleteTarifaLiquidacionMutation();

  const tarifas = tarifasQuery.data?.data ?? [];
  const transportistas = transportistasQuery.data?.data ?? [];
  const tiposMineral = tiposMineralQuery.data?.data ?? [];
  const hoy = hoyIso();

  // Solo las tarifas generales (sin mineral puntual) arman el cuadro de "hoy":
  // las de un mineral puntual se ven en el historial.
  const vigentesHoy = useMemo(() => tarifas.filter((t) => estadoDe(t, hoy) === "VIGENTE"), [tarifas, hoy]);

  const precioFijo = (tipo: TipoEntidadTransportista, caso: CasoPrecio) =>
    vigentesHoy.find((t) => t.tipoEntidad === tipo && !t.transportistaId && !t.tipoMineralId && casoDe(t) === caso);

  // Precio que de verdad se usaría hoy, para cada tipo y cada caso (el propio
  // de ese caso o, si no hay, el "mismo precio siempre").
  const efectivo = (tipo: TipoEntidadTransportista, caso: TipoCombustibleViaje) => {
    const propio = precioFijo(tipo, caso);
    if (propio) return { tarifa: propio, origen: "propio" as const };
    const unico = precioFijo(tipo, "UNICO");
    return unico ? { tarifa: unico, origen: "unico" as const } : null;
  };

  const especiales = useMemo(() => {
    const porTransportista = new Map<number, { nombre: string; tipo: TipoEntidadTransportista; tarifas: TarifaLiquidacion[] }>();
    for (const t of vigentesHoy) {
      if (!t.transportistaId) continue;
      const nombre = t.transportista?.nombreORazonSocial ?? `Transportista ${t.transportistaId}`;
      const grupo = porTransportista.get(t.transportistaId) ?? { nombre, tipo: t.tipoEntidad, tarifas: [] };
      grupo.tarifas.push(t);
      porTransportista.set(t.transportistaId, grupo);
    }
    return [...porTransportista.entries()].sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, "es"));
  }, [vigentesHoy]);

  const proximas = useMemo(() => tarifas.filter((t) => estadoDe(t, hoy) === "PROXIMA"), [tarifas, hoy]);

  // ---- Formulario guiado --------------------------------------------------
  const [aQuien, setAQuien] = useState<"TIPO" | "TRANSPORTISTA">("TIPO");
  const [tipoEntidad, setTipoEntidad] = useState<TipoEntidadTransportista>("TRABAJADOR_PARTICULAR");
  const [transportistaId, setTransportistaId] = useState("");
  const [caso, setCaso] = useState<CasoPrecio>("UNICO");
  const [tipoMineralId, setTipoMineralId] = useState("");
  const [precio, setPrecio] = useState("");
  const [desde, setDesde] = useState(hoy);

  const transportistaElegido = transportistas.find((t) => String(t.id) === transportistaId) ?? null;
  // Con un transportista puntual el tipo no se elige: es el suyo (si no, el
  // precio quedaba guardado con un tipo que nunca coincide y jamás se aplicaba).
  const tipoEfectivo: TipoEntidadTransportista | null =
    aQuien === "TRANSPORTISTA" ? (transportistaElegido?.tipoEntidad ?? null) : tipoEntidad;

  const mismaClase = (t: TarifaLiquidacion, c: CasoPrecio) =>
    t.tipoEntidad === tipoEfectivo &&
    (t.transportistaId ?? null) === (aQuien === "TRANSPORTISTA" ? Number(transportistaId) || null : null) &&
    (t.tipoMineralId ?? null) === (tipoMineralId ? Number(tipoMineralId) : null) &&
    casoDe(t) === c;

  // La que este precio va a reemplazar (la abierta de su misma clase).
  const reemplaza = tipoEfectivo ? tarifas.find((t) => !t.vigenteHasta && mismaClase(t, caso)) : undefined;
  // Si se elige "mismo precio siempre", los precios por combustible que ya
  // existan en ese mismo alcance seguirían ganándole: se avisa y se pueden quitar.
  const quedanPorCombustible =
    tipoEfectivo && caso === "UNICO"
      ? tarifas.filter((t) => !t.vigenteHasta && (mismaClase(t, "CON_COMBUSTIBLE") || mismaClase(t, "SIN_COMBUSTIBLE")))
      : [];
  const otroUnico =
    tipoEfectivo && caso !== "UNICO"
      ? tarifas.find((t) => !t.vigenteHasta && mismaClase(t, "UNICO"))
      : undefined;

  const fechaInvalida = Boolean(reemplaza && desde && desde <= dia(reemplaza.vigenteDesde));
  const puedeGuardar = Boolean(tipoEfectivo && Number(precio) > 0 && desde && !fechaInvalida);

  const sujeto =
    aQuien === "TRANSPORTISTA"
      ? (transportistaElegido?.nombreORazonSocial ?? "el transportista elegido")
      : tipoEfectivo
        ? TIPO_PLURAL[tipoEfectivo]
        : "";
  const frase =
    puedeGuardar || Number(precio) > 0
      ? `A ${sujeto} ${aQuien === "TIPO" ? "se les pagará" : "se le pagará"} ${bs(precio || 0)} por tonelada ${
          caso === "UNICO"
            ? "en todos sus viajes, con o sin combustible"
            : caso === "CON_COMBUSTIBLE"
              ? "en los viajes con combustible de la empresa"
              : "en los viajes sin combustible de la empresa"
        }${tipoMineralId ? ` (solo ${tiposMineral.find((t) => String(t.id) === tipoMineralId)?.nombre ?? "ese mineral"})` : ""}, desde el ${desde ? formatFechaIso(desde) : "…"}.`
      : "";

  function prellenar(opts: { tipo?: TipoEntidadTransportista; transportistaId?: number; caso: CasoPrecio; precio?: string }) {
    if (opts.transportistaId) {
      setAQuien("TRANSPORTISTA");
      setTransportistaId(String(opts.transportistaId));
    } else {
      setAQuien("TIPO");
      setTransportistaId("");
      if (opts.tipo) setTipoEntidad(opts.tipo);
    }
    setCaso(opts.caso);
    setTipoMineralId("");
    setPrecio(opts.precio ?? "");
    setDesde(hoyIso());
    document.getElementById("form-tarifa")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tipoEfectivo || !puedeGuardar) return;
    createMutation.mutate(
      {
        tipoEntidad: tipoEfectivo,
        transportistaId: aQuien === "TRANSPORTISTA" ? Number(transportistaId) : null,
        tipoMineralId: tipoMineralId ? Number(tipoMineralId) : null,
        incluyeCombustible: caso === "UNICO" ? null : caso,
        precioPorTonelada: Number(precio),
        vigenteDesde: desde
      },
      {
        onSuccess: () => {
          showSuccess(
            reemplaza
              ? `Precio guardado. El anterior (${bs(reemplaza.precioPorTonelada)}) quedó cerrado.`
              : "Precio guardado."
          );
          setPrecio("");
        },
        onError: (error) => showError(mensajeDeError(error, "No se pudo guardar el precio."))
      }
    );
  }

  // ---- Quitar precios ----------------------------------------------------
  const [porQuitar, setPorQuitar] = useState<TarifaLiquidacion[] | null>(null);
  const [quitando, setQuitando] = useState(false);

  async function confirmarQuitar() {
    if (!porQuitar) return;
    setQuitando(true);
    try {
      for (const t of porQuitar) await deleteMutation.mutateAsync(t.id);
      // El precio que reemplace a los quitados debe regir desde la misma fecha que
      // ellos: si empieza después, los viajes anteriores se quedan sin precio.
      const masAntigua = porQuitar.map((t) => dia(t.vigenteDesde)).sort()[0];
      if (masAntigua && masAntigua < desde) setDesde(masAntigua);
      showSuccess(
        porQuitar.length === 1
          ? "Precio eliminado."
          : `${porQuitar.length} precios eliminados. Ahora guarda el precio único: la fecha de inicio ya quedó igual a la de los que se quitaron.`
      );
      setPorQuitar(null);
    } catch (error) {
      showError(mensajeDeError(error, "No se pudo eliminar el precio."));
    } finally {
      setQuitando(false);
    }
  }

  // ---- "¿Cuánto se pagaría?" -----------------------------------------------
  const [simTransportistaId, setSimTransportistaId] = useState("");
  const [simCombustible, setSimCombustible] = useState<TipoCombustibleViaje>("SIN_COMBUSTIBLE");
  const [simFecha, setSimFecha] = useState(hoy);
  const simParams = simTransportistaId
    ? { transportistaId: Number(simTransportistaId), incluyeCombustible: simCombustible, fecha: simFecha || undefined }
    : null;
  const simQuery = useTarifaAplicableQuery(simParams);
  const sim = simQuery.data?.data ?? null;

  const [verTodas, setVerTodas] = useState(false);
  const historial = useMemo(() => {
    const orden: Record<Estado, number> = { VIGENTE: 0, PROXIMA: 1, CERRADA: 2 };
    return [...tarifas].sort(
      (a, b) =>
        orden[estadoDe(a, hoy)] - orden[estadoDe(b, hoy)] || dia(b.vigenteDesde).localeCompare(dia(a.vigenteDesde))
    );
  }, [tarifas, hoy]);

  const claseTarjeta = "rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5";
  const claseBoton = "rounded-lg border border-[var(--color-outline-variant)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-primary)]";

  return (
    <article className={claseTarjeta}>
      <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <Coins size={16} className="text-[var(--color-primary)]" />
        Tarifas: cuánto se paga por tonelada
      </h3>
      <p className="mb-4 max-w-3xl text-sm text-[var(--color-on-surface-variant)]">
        Es el precio que se le paga a cada transportista por tonelada transportada. Al liquidar, el sistema elige el
        precio de cada viaje según <b>quién lo hizo</b>, <b>si la empresa puso el combustible</b> y <b>la fecha del viaje</b>.
      </p>

      {/* 1. Lo que rige hoy */}
      <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
        Precios que rigen hoy
      </h4>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border-soft)]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-container-high)] text-[11px] uppercase tracking-wide text-[var(--color-on-surface-variant)]">
              <th className="px-3 py-2">Tipo de transportista</th>
              <th className="px-3 py-2">Viajes con combustible de la empresa</th>
              <th className="px-3 py-2">Viajes sin combustible de la empresa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-soft)]">
            {(["TRABAJADOR_PARTICULAR", "EMPRESA"] as const).map((tipo) => {
              const con = efectivo(tipo, "CON_COMBUSTIBLE");
              const sin = efectivo(tipo, "SIN_COMBUSTIBLE");
              const mismo = con && sin && con.tarifa.id === sin.tarifa.id;
              const celda = (r: ReturnType<typeof efectivo>, c: TipoCombustibleViaje) =>
                r ? (
                  <div>
                    <p className="text-base font-bold">{bs(r.tarifa.precioPorTonelada)} <span className="text-xs font-normal text-[var(--color-on-surface-variant)]">/ ton</span></p>
                    <p className="text-[11px] text-[var(--color-on-surface-variant)]">desde {formatFecha(r.tarifa.vigenteDesde)}</p>
                    <button type="button" className={`${claseBoton} mt-1`} onClick={() => prellenar({ tipo, caso: r.origen === "unico" ? "UNICO" : c })}>
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="flex items-center gap-1 text-sm font-semibold text-[var(--color-warning)]">
                      <AlertTriangle size={13} /> Sin precio
                    </p>
                    <p className="text-[11px] text-[var(--color-on-surface-variant)]">No se podría liquidar</p>
                    <button type="button" className={`${claseBoton} mt-1`} onClick={() => prellenar({ tipo, caso: c })}>
                      Definir
                    </button>
                  </div>
                );
              return (
                <tr key={tipo}>
                  <td className="px-3 py-3 font-semibold">{TIPO_LABEL[tipo]}</td>
                  {mismo ? (
                    <td colSpan={2} className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {celda(con, "CON_COMBUSTIBLE")}
                        <span className="rounded-full bg-[var(--color-primary)]/12 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-primary)]">
                          Mismo precio con o sin combustible
                        </span>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-3">{celda(con, "CON_COMBUSTIBLE")}</td>
                      <td className="px-3 py-3">{celda(sin, "SIN_COMBUSTIBLE")}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {proximas.length > 0 ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-[var(--color-warning)]">
          <Info size={13} className="mt-0.5 shrink-0" />
          Hay {proximas.length} precio{proximas.length === 1 ? "" : "s"} que empieza{proximas.length === 1 ? "" : "n"} más adelante (ver el historial abajo).
        </p>
      ) : null}

      {/* 2. Precios especiales */}
      <h4 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
        Precios especiales (contrato propio)
      </h4>
      {especiales.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-border-soft)] px-3 py-3 text-sm text-[var(--color-on-surface-variant)]">
          Ningún transportista tiene un precio especial: todos usan el precio de su tipo (la tabla de arriba).
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {especiales.map(([id, grupo]) => (
            <div key={id} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold">{grupo.nombre}</p>
                <span className="rounded-full bg-[var(--color-surface-container-highest)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-on-surface-variant)]">
                  {TIPO_LABEL[grupo.tipo]}
                </span>
              </div>
              <ul className="space-y-1 text-sm">
                {grupo.tarifas.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span>
                      <b>{bs(t.precioPorTonelada)}</b> / ton · {CASO_CORTO[casoDe(t)]}
                      {t.tipoMineral ? ` · solo ${t.tipoMineral.nombre}` : ""}
                    </span>
                    <span className="flex gap-1">
                      <button type="button" className={claseBoton} onClick={() => prellenar({ transportistaId: id, caso: casoDe(t) })}>
                        Cambiar
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--color-error)]/40 px-2 py-1 text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10"
                        title="Quitar este precio"
                        onClick={() => setPorQuitar([t])}
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 3. Registrar o cambiar un precio */}
      <h4 id="form-tarifa" className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
        Registrar o cambiar un precio
      </h4>
      <form className="space-y-4 rounded-lg border border-[var(--color-border-soft)] p-4" onSubmit={handleSubmit}>
        <div>
          <p className="mb-2 text-sm font-semibold"><span className="mr-2 rounded-full bg-[var(--color-primary)]/14 px-2 py-0.5 text-xs text-[var(--color-primary)]">1</span>¿A quién se aplica?</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {([
              ["TIPO", "A todos los de un tipo", "Es el precio de siempre (precio fijo)."],
              ["TRANSPORTISTA", "A un transportista puntual", "Tiene un contrato propio (precio especial). Gana sobre el fijo."]
            ] as const).map(([valor, titulo, ayuda]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setAQuien(valor)}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  aQuien === valor
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border-soft)] hover:bg-[var(--color-surface-container-highest)]"
                }`}
              >
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="block text-xs text-[var(--color-on-surface-variant)]">{ayuda}</span>
              </button>
            ))}
          </div>
          <div className="mt-2">
            {aQuien === "TIPO" ? (
              <select value={tipoEntidad} onChange={(e) => setTipoEntidad(e.target.value as TipoEntidadTransportista)} className={inputClassName}>
                <option value="TRABAJADOR_PARTICULAR">Trabajador particular</option>
                <option value="EMPRESA">Empresa</option>
              </select>
            ) : (
              <>
                <select required value={transportistaId} onChange={(e) => setTransportistaId(e.target.value)} className={inputClassName}>
                  <option value="">Elige el transportista…</option>
                  {transportistas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombreORazonSocial} ({TIPO_LABEL[t.tipoEntidad]})
                    </option>
                  ))}
                </select>
                {transportistaElegido ? (
                  <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                    Su tipo es <b>{TIPO_LABEL[transportistaElegido.tipoEntidad]}</b>; se toma del transportista.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold"><span className="mr-2 rounded-full bg-[var(--color-primary)]/14 px-2 py-0.5 text-xs text-[var(--color-primary)]">2</span>¿En qué viajes?</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(["UNICO", "CON_COMBUSTIBLE", "SIN_COMBUSTIBLE"] as const).map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => setCaso(valor)}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  caso === valor
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border-soft)] hover:bg-[var(--color-surface-container-highest)]"
                }`}
              >
                <span className="flex items-center gap-1 text-sm font-semibold">
                  {valor !== "UNICO" ? <Fuel size={12} /> : null}
                  {CASO_LABEL[valor]}
                </span>
                <span className="block text-xs text-[var(--color-on-surface-variant)]">
                  {valor === "UNICO"
                    ? "Un solo precio para todos sus viajes."
                    : valor === "CON_COMBUSTIBLE"
                      ? "Cuando el lote se registró con combustible."
                      : "Cuando el lote se registró sin combustible."}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold"><span className="mr-2 rounded-full bg-[var(--color-primary)]/14 px-2 py-0.5 text-xs text-[var(--color-primary)]">3</span>¿Cuánto y desde cuándo?</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Precio por tonelada (Bs)</label>
              <input required type="number" min="0.01" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={inputClassName} placeholder="Ej. 336,41" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--color-on-surface-variant)]">Rige desde</label>
              <input required type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClassName} />
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">
            El precio se aplica a los viajes <b>desde esa fecha</b> (según la fecha de despacho del viaje). Si lo registras para viajes que todavía no se pagaron, pon una fecha anterior a ellos.
          </p>
          {tiposMineral.length > 1 ? (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-xs font-semibold text-[var(--color-primary)]">Opciones avanzadas: solo para un tipo de mineral</summary>
              <select value={tipoMineralId} onChange={(e) => setTipoMineralId(e.target.value)} className={`${inputClassName} mt-2`}>
                <option value="">Todos los tipos de mineral</option>
                {tiposMineral.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </details>
          ) : null}
        </div>

        {/* Lo que va a pasar, en palabras */}
        <div className="space-y-2" aria-live="polite">
          {frase ? (
            <p className="flex items-start gap-2 rounded-lg bg-[var(--color-primary)]/10 px-3 py-2 text-sm">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
              <span>{frase}</span>
            </p>
          ) : (
            <p className="text-xs text-[var(--color-on-surface-variant)]">Completa los pasos y aquí verás, en una frase, cómo quedaría.</p>
          )}
          {tipoEfectivo ? (
            reemplaza ? (
              <p className="flex items-start gap-2 text-xs text-[var(--color-on-surface-variant)]">
                <Info size={13} className="mt-0.5 shrink-0" />
                Reemplaza al precio actual de {bs(reemplaza.precioPorTonelada)} (rige desde {formatFecha(reemplaza.vigenteDesde)}), que se cierra en la fecha nueva. Los viajes anteriores a esa fecha conservan el precio viejo.
              </p>
            ) : (
              <p className="flex items-start gap-2 text-xs text-[var(--color-on-surface-variant)]">
                <Info size={13} className="mt-0.5 shrink-0" />
                No había un precio para esto: será el primero.
              </p>
            )
          ) : null}
          {fechaInvalida && reemplaza ? (
            <p className="flex items-start gap-2 text-xs text-[var(--color-error)]">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              La fecha tiene que ser posterior al {formatFecha(reemplaza.vigenteDesde)}, cuando empezó el precio actual.
            </p>
          ) : null}
          {quedanPorCombustible.length > 0 ? (
            <div className="rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3 py-2 text-xs">
              <p className="flex items-start gap-2 font-semibold text-[var(--color-warning)]">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Ojo: este precio no va a ser el único.
              </p>
              <p className="mt-1">
                Ya hay un precio propio para{" "}
                {quedanPorCombustible.map((t) => `${CASO_CORTO[casoDe(t)].toLowerCase()} (${bs(t.precioPorTonelada)})`).join(" y para ")}.
                Ese precio sigue mandando sobre este en esos viajes. Si quieres un solo precio para todos, hay que quitarlo.
              </p>
              <button type="button" className={`${claseBoton} mt-2`} onClick={() => setPorQuitar(quedanPorCombustible)}>
                Quitar {quedanPorCombustible.length === 1 ? "ese precio" : "esos precios"}…
              </button>
            </div>
          ) : null}
          {otroUnico ? (
            <p className="flex items-start gap-2 text-xs text-[var(--color-on-surface-variant)]">
              <Info size={13} className="mt-0.5 shrink-0" />
              Los demás viajes siguen con el precio único de {bs(otroUnico.precioPorTonelada)}; este precio manda solo en los de combustible elegido.
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={!puedeGuardar || createMutation.isPending}
          className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-50"
        >
          {createMutation.isPending ? "Guardando…" : reemplaza ? "Guardar y reemplazar el precio" : "Guardar precio"}
        </button>
      </form>

      {/* 4. Probar */}
      <h4 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
        Probar: ¿cuánto se le pagaría a…?
      </h4>
      <div className="rounded-lg border border-[var(--color-border-soft)] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select value={simTransportistaId} onChange={(e) => setSimTransportistaId(e.target.value)} className={inputClassName}>
            <option value="">Elige un transportista…</option>
            {transportistas.map((t) => (
              <option key={t.id} value={t.id}>{t.nombreORazonSocial}</option>
            ))}
          </select>
          <select value={simCombustible} onChange={(e) => setSimCombustible(e.target.value as TipoCombustibleViaje)} className={inputClassName}>
            <option value="SIN_COMBUSTIBLE">En un viaje sin combustible</option>
            <option value="CON_COMBUSTIBLE">En un viaje con combustible</option>
          </select>
          <input type="date" value={simFecha} onChange={(e) => setSimFecha(e.target.value)} className={inputClassName} aria-label="Fecha del viaje" />
        </div>
        <div className="mt-3 text-sm" aria-live="polite">
          {!simParams ? (
            <p className="text-xs text-[var(--color-on-surface-variant)]">Elige un transportista para ver qué precio usaría la liquidación. No cambia nada.</p>
          ) : simQuery.isLoading ? (
            <p className="text-xs text-[var(--color-on-surface-variant)]">Calculando…</p>
          ) : simQuery.isError ? (
            <p className="text-xs text-[var(--color-error)]">{mensajeDeError(simQuery.error, "No se pudo calcular.")}</p>
          ) : sim?.tarifa ? (
            <p className="flex items-start gap-2 rounded-lg bg-[var(--color-success)]/10 px-3 py-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
              <span>
                <b>{bs(sim.tarifa.precioPorTonelada)}</b> por tonelada. Sale de: {descripcionTarifa(sim.tarifa)}, vigente desde {formatFecha(sim.tarifa.vigenteDesde)}.
              </span>
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-lg bg-[var(--color-warning)]/10 px-3 py-2 text-[var(--color-warning)]">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>No hay ningún precio vigente para este caso. Una liquidación con ese viaje daría error hasta que se defina.</span>
            </p>
          )}
        </div>
      </div>

      {/* 5. Cómo decide el sistema + historial */}
      <details className="mt-6 rounded-lg border border-[var(--color-border-soft)] px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold">¿Cómo elige el sistema el precio de cada viaje?</summary>
        <p className="mt-2 text-[var(--color-on-surface-variant)]">
          Busca, en este orden, y usa el primer precio que exista y esté vigente en la fecha del viaje:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Precio <b>especial</b> del transportista para ese caso (con o sin combustible).</li>
          <li>Precio <b>especial</b> del transportista que vale para los dos casos.</li>
          <li>Precio <b>fijo</b> de su tipo para ese caso (con o sin combustible).</li>
          <li>Precio <b>fijo</b> de su tipo que vale para los dos casos.</li>
        </ol>
        <p className="mt-2 text-[var(--color-on-surface-variant)]">
          Si no encuentra ninguno, la liquidación se detiene con el aviso "No hay una tarifa vigente". Un precio nunca se
          edita: al registrar uno nuevo, el anterior de su misma clase se cierra y conserva su historial.
        </p>
      </details>

      <h4 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
        Historial de precios
      </h4>
      <div className="space-y-2 text-sm">
        {(verTodas ? historial : historial.slice(0, 8)).map((t) => {
          const estado = estadoDe(t, hoy);
          return (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border-soft)] px-3 py-2">
              <div>
                <p className="font-semibold">{descripcionTarifa(t)}</p>
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  {bs(t.precioPorTonelada)} / ton · desde {formatFecha(t.vigenteDesde)}
                  {t.vigenteHasta ? ` hasta ${formatFecha(t.vigenteHasta)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ESTADO_CLASS[estado]}`}>{ESTADO_LABEL[estado]}</span>
                <button
                  type="button"
                  className="rounded p-1 text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10"
                  title="Eliminar este precio"
                  onClick={() => setPorQuitar([t])}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {historial.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Aún no hay precios registrados.</p> : null}
        {historial.length > 8 ? (
          <button type="button" className={claseBoton} onClick={() => setVerTodas((v) => !v)}>
            {verTodas ? "Ver menos" : `Ver los ${historial.length} precios`}
          </button>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(porQuitar)}
        title={porQuitar && porQuitar.length > 1 ? "¿Quitar estos precios?" : "¿Quitar este precio?"}
        tone="danger"
        confirmLabel="Quitar"
        isLoading={quitando}
        onConfirm={confirmarQuitar}
        onCancel={() => setPorQuitar(null)}
      >
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
          {(porQuitar ?? []).map((t) => (
            <li key={t.id}>
              {descripcionTarifa(t)}: <b>{bs(t.precioPorTonelada)}</b>
            </li>
          ))}
        </ul>
        <p className="text-sm text-[var(--color-on-surface-variant)]">
          Las liquidaciones ya hechas no cambian: cada una guarda el precio con el que se pagó. Solo deja de usarse para liquidaciones futuras.
        </p>
        <p className="mt-2 rounded-lg bg-[var(--color-warning)]/10 px-3 py-2 text-sm">
          <b>Después registra el precio que lo reemplace.</b> Mientras no haya uno, los viajes de ese transportista no se pueden liquidar.
        </p>
      </ConfirmDialog>
    </article>
  );
}
