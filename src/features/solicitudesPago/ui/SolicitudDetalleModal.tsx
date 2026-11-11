import { useEffect, useState } from "react";
import { Check, Download, Pencil, Undo2, X } from "lucide-react";
import { usePermisos } from "@/features/auth/hooks/usePermisos";
import {
  useAnularSolicitudMutation,
  useEntregaSolicitudMutation,
  useFacturaSolicitudMutation,
  useFirmarSolicitudMutation,
  usePagarSolicitudMutation,
  useQuitarFirmaMutation,
  useRevertirPagoMutation,
  useSolicitudQuery
} from "@/features/solicitudesPago/hooks/useSolicitudesPago";
import { exportarSolicitudesExcel, exportarSolicitudesPdf } from "@/features/solicitudesPago/lib/exportFormulario";
import {
  ESTADO_ENTREGA,
  ETIQUETA_DOCUMENTO,
  ETIQUETA_FIRMA,
  TIPOS_FIRMA,
  fechaCorta,
  firmaDe,
  formatBs
} from "@/features/solicitudesPago/lib/etiquetas";
import { montoEnLetras } from "@/features/solicitudesPago/lib/montoEnLetras";
import type {
  EstadoEntrega,
  SolicitudPago,
  TipoDocumentoSolicitud,
  TipoFirma
} from "@/features/solicitudesPago/model/solicitudesPago.schema";
import { InsigniaPago } from "@/features/solicitudesPago/ui/Insignias";
import { ApiError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";
const labelClassName = "mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]";
const botonPrimario =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:opacity-60";
const botonSecundario =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60";

const ACCION_FIRMA: Record<Exclude<TipoFirma, "ELABORADO">, string> = {
  REVISADO: "revisar",
  VISTO_BUENO: "visto_bueno",
  ADMINISTRADOR: "autorizar"
};

const hoyIso = () => {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--color-border-soft)] p-4">
      <h3 className="mb-3 text-sm font-bold">{titulo}</h3>
      {children}
    </section>
  );
}

interface Props {
  id: string | null;
  onClose: () => void;
  onEditar: (solicitud: SolicitudPago) => void;
}

export function SolicitudDetalleModal({ id, onClose, onEditar }: Props) {
  const { can } = usePermisos();
  const { showError, showSuccess } = useToast();
  const consulta = useSolicitudQuery(id);
  const solicitud = consulta.data?.data ?? null;

  const firmar = useFirmarSolicitudMutation();
  const quitarFirma = useQuitarFirmaMutation();
  const pagar = usePagarSolicitudMutation();
  const revertir = useRevertirPagoMutation();
  const factura = useFacturaSolicitudMutation();
  const entrega = useEntregaSolicitudMutation();
  const anular = useAnularSolicitudMutation();
  const ocupado =
    firmar.isPending || quitarFirma.isPending || pagar.isPending || revertir.isPending || factura.isPending || entrega.isPending || anular.isPending;

  const [fechaPago, setFechaPago] = useState(hoyIso());
  const [referenciaPago, setReferenciaPago] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoSolicitud | "">("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [estadoEntrega, setEstadoEntrega] = useState<EstadoEntrega>("PENDIENTE");
  const [notaEntrega, setNotaEntrega] = useState("");
  const [motivo, setMotivo] = useState("");
  const [anulando, setAnulando] = useState(false);

  // Al abrir otra solicitud (o cuando cambia en el servidor) los campos parten de lo guardado
  const versionDatos = solicitud ? `${solicitud.id}|${solicitud.tipoDocumento}|${solicitud.numeroFactura}|${solicitud.estadoEntrega}|${solicitud.notaEntrega}|${solicitud.fechaPago}|${solicitud.referenciaPago}` : "";
  useEffect(() => {
    if (!solicitud) return;
    setTipoDocumento(solicitud.tipoDocumento ?? "");
    setNumeroFactura(solicitud.numeroFactura ?? "");
    setEstadoEntrega(solicitud.estadoEntrega);
    setNotaEntrega(solicitud.notaEntrega ?? "");
    setFechaPago(solicitud.fechaPago ? solicitud.fechaPago.slice(0, 10) : hoyIso());
    setReferenciaPago(solicitud.referenciaPago ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionDatos]);

  useEffect(() => {
    setAnulando(false);
    setMotivo("");
  }, [id]);

  useEffect(() => {
    if (!id) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !ocupado) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [id, ocupado, onClose]);

  if (!id) return null;

  const ejecutar = (mutar: (opciones: { onSuccess: () => void; onError: (e: unknown) => void }) => void, exito: string) =>
    mutar({
      onSuccess: () => showSuccess(exito),
      onError: (error) => showError(error instanceof ApiError ? error.message : "No se pudo completar la acción.")
    });

  const cerrada = solicitud?.estado === "ANULADA";
  const pagada = solicitud?.estado === "PAGADA";
  const puedeEditar = can("pagos.solicitudes", "editar");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !ocupado) onClose();
      }}
    >
      <div className="relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-[var(--color-surface-container-high)] p-6 shadow-lg">
        <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 rounded-lg p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]">
          <X size={18} />
        </button>

        {!solicitud ? (
          <p className="py-10 text-center text-sm text-[var(--color-on-surface-variant)]">
            {consulta.isError ? "No se pudo cargar la solicitud." : "Cargando..."}
          </p>
        ) : (
          <div className="space-y-4">
            <header className="pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">Solicitud de pago Nº {solicitud.numero}</h2>
                <InsigniaPago estado={solicitud.estado} />
              </div>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                {fechaCorta(solicitud.fecha)} · {solicitud.beneficiarioNombre}
                {solicitud.beneficiarioNit ? ` · NIT ${solicitud.beneficiarioNit}` : ""}
              </p>
              {cerrada && solicitud.motivoAnulacion ? (
                <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">Anulada: {solicitud.motivoAnulacion}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={botonSecundario} onClick={() => exportarSolicitudesPdf([solicitud])}>
                  <Download size={14} /> Formulario PDF
                </button>
                <button type="button" className={botonSecundario} onClick={() => exportarSolicitudesExcel([solicitud])}>
                  <Download size={14} /> Formulario Excel
                </button>
                {puedeEditar && !pagada && !cerrada ? (
                  <button type="button" className={botonSecundario} onClick={() => onEditar(solicitud)}>
                    <Pencil size={14} /> Editar
                  </button>
                ) : null}
              </div>
            </header>

            <Seccion titulo="Detalle">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      <th className="pb-1 pr-2">Descripción</th>
                      <th className="pb-1 pr-2 text-right">Cant.</th>
                      <th className="pb-1 pr-2 text-right">Precio</th>
                      <th className="pb-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitud.items.map((item) => (
                      <tr key={item.id} className="border-t border-[var(--color-border-soft)]">
                        <td className="py-1.5 pr-2">{item.descripcion}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{item.cantidad}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{item.precioUnit.toFixed(2)}</td>
                        <td className="py-1.5 text-right tabular-nums">{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-right text-sm font-bold">{formatBs(solicitud.total)}</div>
              <p className="text-right text-xs text-[var(--color-on-surface-variant)]">{montoEnLetras(solicitud.total)}</p>
              {solicitud.banco || solicitud.cuenta ? (
                <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">
                  {solicitud.banco} {solicitud.cuenta ? `· Cuenta ${solicitud.cuenta}` : ""}
                </p>
              ) : null}
              {solicitud.compra ? (
                <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Vinculada a un pedido de compra ({solicitud.compra.estado}).</p>
              ) : null}
            </Seccion>

            <Seccion titulo="Firmas">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TIPOS_FIRMA.map((tipo, indice) => {
                  const firma = firmaDe(solicitud, tipo);
                  const firmada = Boolean(firma?.firmadoAt);
                  const anteriorFirmada = indice === 0 || Boolean(firmaDe(solicitud, TIPOS_FIRMA[indice - 1]!)?.firmadoAt);
                  const permitido = tipo !== "ELABORADO" && can("pagos.solicitudes", ACCION_FIRMA[tipo]);
                  const bloqueada = pagada || cerrada;
                  return (
                    <div key={tipo} className="rounded-lg bg-[var(--color-surface-container-highest)] p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider">{ETIQUETA_FIRMA[tipo]}</span>
                        {firmada ? <Check size={16} className="text-emerald-500" /> : null}
                      </div>
                      <p className="mt-1 text-sm">{firma?.nombre || <span className="text-[var(--color-on-surface-variant)]">Sin nombre</span>}</p>
                      {firma?.cargo ? <p className="text-xs text-[var(--color-on-surface-variant)]">{firma.cargo}</p> : null}
                      {firmada ? (
                        <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">
                          Firmó {firma?.usuarioNombre ?? ""} el {fechaCorta(firma?.firmadoAt)}
                        </p>
                      ) : null}
                      {tipo !== "ELABORADO" && permitido && !bloqueada ? (
                        <div className="mt-2">
                          {firmada ? (
                            <button type="button" disabled={ocupado} className={botonSecundario} onClick={() => ejecutar((o) => quitarFirma.mutate({ id: solicitud.id, tipo }, o), "Firma quitada.")}>
                              <Undo2 size={13} /> Quitar firma
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={ocupado || !anteriorFirmada}
                              title={anteriorFirmada ? undefined : `Primero debe firmar ${ETIQUETA_FIRMA[TIPOS_FIRMA[indice - 1]!]}`}
                              className={botonPrimario}
                              onClick={() => ejecutar((o) => firmar.mutate({ id: solicitud.id, tipo }, o), "Firma registrada.")}
                            >
                              Firmar como {ETIQUETA_FIRMA[tipo]}
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">
                Se firma en orden. Con las cuatro firmas la solicitud pasa a “Pedida · falta pago”.
              </p>
            </Seccion>

            {!cerrada ? (
              <Seccion titulo="Pago">
                {pagada ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      Pagada el {fechaCorta(solicitud.fechaPago)}
                      {solicitud.referenciaPago ? ` · Ref. ${solicitud.referenciaPago}` : ""}
                    </span>
                    {can("pagos.solicitudes", "pagar") ? (
                      <button type="button" disabled={ocupado} className={botonSecundario} onClick={() => ejecutar((o) => revertir.mutate(solicitud.id, o), "Pago revertido.")}>
                        <Undo2 size={13} /> Deshacer pago
                      </button>
                    ) : null}
                  </div>
                ) : can("pagos.solicitudes", "pagar") ? (
                  <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClassName}>Fecha del pago</label>
                      <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className={inputClassName} />
                    </div>
                    <div>
                      <label className={labelClassName}>Referencia (opcional)</label>
                      <input value={referenciaPago} onChange={(e) => setReferenciaPago(e.target.value)} className={inputClassName} />
                    </div>
                    <button
                      type="button"
                      disabled={ocupado}
                      className={botonPrimario}
                      onClick={() => ejecutar((o) => pagar.mutate({ id: solicitud.id, payload: { fechaPago, referenciaPago: referenciaPago.trim() || null } }, o), "Pago registrado.")}
                    >
                      Marcar como pagada
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-on-surface-variant)]">Aún no se registró el pago.</p>
                )}
              </Seccion>
            ) : null}

            {!cerrada ? (
              <Seccion titulo="Factura o recibo">
                {puedeEditar ? (
                  <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClassName}>Documento</label>
                      <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value as TipoDocumentoSolicitud | "")} className={inputClassName}>
                        <option value="">Falta factura</option>
                        {(Object.keys(ETIQUETA_DOCUMENTO) as TipoDocumentoSolicitud[]).map((tipo) => (
                          <option key={tipo} value={tipo}>{ETIQUETA_DOCUMENTO[tipo]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClassName}>Número</label>
                      <input value={numeroFactura} disabled={tipoDocumento === "" || tipoDocumento === "SIN_DOCUMENTO"} onChange={(e) => setNumeroFactura(e.target.value)} className={inputClassName} />
                    </div>
                    <button
                      type="button"
                      disabled={ocupado}
                      className={botonPrimario}
                      onClick={() =>
                        ejecutar(
                          (o) =>
                            factura.mutate(
                              {
                                id: solicitud.id,
                                payload: {
                                  tipoDocumento: tipoDocumento === "" ? null : tipoDocumento,
                                  numeroFactura: tipoDocumento === "" || tipoDocumento === "SIN_DOCUMENTO" ? null : numeroFactura.trim() || null
                                }
                              },
                              o
                            ),
                          "Documento guardado."
                        )
                      }
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <p className="text-sm">{solicitud.tipoDocumento ? `${ETIQUETA_DOCUMENTO[solicitud.tipoDocumento]} ${solicitud.numeroFactura ?? ""}` : "Falta factura"}</p>
                )}
              </Seccion>
            ) : null}

            {!cerrada ? (
              <Seccion titulo="Entrega o ejecución">
                {puedeEditar ? (
                  <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClassName}>Estado</label>
                      <select value={estadoEntrega} onChange={(e) => setEstadoEntrega(e.target.value as EstadoEntrega)} className={inputClassName}>
                        {(Object.keys(ESTADO_ENTREGA) as EstadoEntrega[]).map((estado) => (
                          <option key={estado} value={estado}>{ESTADO_ENTREGA[estado]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClassName}>Nota (ej. Ingreso 12 de octubre)</label>
                      <input value={notaEntrega} onChange={(e) => setNotaEntrega(e.target.value)} className={inputClassName} />
                    </div>
                    <button
                      type="button"
                      disabled={ocupado}
                      className={botonPrimario}
                      onClick={() => ejecutar((o) => entrega.mutate({ id: solicitud.id, payload: { estadoEntrega, notaEntrega: notaEntrega.trim() || null } }, o), "Entrega guardada.")}
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <p className="text-sm">{ESTADO_ENTREGA[solicitud.estadoEntrega]} {solicitud.notaEntrega ?? ""}</p>
                )}
              </Seccion>
            ) : null}

            {!cerrada && can("pagos.solicitudes", "anular") ? (
              <div className="flex flex-col gap-2">
                {anulando ? (
                  <div className="rounded-lg border border-red-500/40 p-3">
                    <label className={labelClassName}>Motivo de la anulación</label>
                    <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputClassName} autoFocus />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={ocupado || motivo.trim().length < 3}
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        onClick={() => ejecutar((o) => anular.mutate({ id: solicitud.id, motivo: motivo.trim() }, o), "Solicitud anulada.")}
                      >
                        Confirmar anulación
                      </button>
                      <button type="button" className={botonSecundario} onClick={() => setAnulando(false)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setAnulando(true)} className="self-start text-xs font-semibold text-red-500 hover:underline">
                    Anular esta solicitud
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
