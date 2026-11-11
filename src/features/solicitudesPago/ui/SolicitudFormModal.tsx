import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useComprasQuery } from "@/features/compras/hooks/useCompras";
import {
  useBeneficiariosQuery,
  useCreateSolicitudMutation,
  useDefaultsSolicitudQuery,
  useUpdateSolicitudMutation
} from "@/features/solicitudesPago/hooks/useSolicitudesPago";
import { ETIQUETA_FIRMA, TIPOS_FIRMA, formatBs, firmaDe } from "@/features/solicitudesPago/lib/etiquetas";
import { montoEnLetras } from "@/features/solicitudesPago/lib/montoEnLetras";
import type { SolicitudPago, SolicitudPayload, TipoFirma } from "@/features/solicitudesPago/model/solicitudesPago.schema";
import { ApiError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-60";
const labelClassName = "mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]";

interface ItemForm {
  referencia: string;
  descripcion: string;
  cantidad: string;
  precioUnit: string;
  descuento: string;
}

const itemVacio = (): ItemForm => ({ referencia: "", descripcion: "", cantidad: "1", precioUnit: "", descuento: "0" });

const aNumero = (texto: string) => {
  const valor = Number(texto.replace(",", "."));
  return Number.isFinite(valor) ? valor : 0;
};

const hoyIso = () => {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // Con solicitud: se edita. Sin solicitud: se crea.
  solicitud?: SolicitudPago | null;
  // Mes que se está viendo, para sugerir el siguiente número
  anio: number;
  mes: number;
}

export function SolicitudFormModal({ isOpen, onClose, solicitud, anio, mes }: Props) {
  const { showError, showSuccess } = useToast();
  const crear = useCreateSolicitudMutation();
  const actualizar = useUpdateSolicitudMutation();
  const editando = Boolean(solicitud);
  const guardando = crear.isPending || actualizar.isPending;

  const [fecha, setFecha] = useState(hoyIso());
  const [numero, setNumero] = useState("");
  const [solicitadoPor, setSolicitadoPor] = useState("");
  const [beneficiario, setBeneficiario] = useState("");
  const [nit, setNit] = useState("");
  const [banco, setBanco] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [compraId, setCompraId] = useState<string>("");
  const [cotizacion, setCotizacion] = useState("");
  const [informeUso, setInformeUso] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [items, setItems] = useState<ItemForm[]>([itemVacio()]);
  const [firmas, setFirmas] = useState<Record<TipoFirma, { nombre: string; cargo: string }>>({
    ELABORADO: { nombre: "", cargo: "" },
    REVISADO: { nombre: "", cargo: "" },
    VISTO_BUENO: { nombre: "", cargo: "" },
    ADMINISTRADOR: { nombre: "", cargo: "" }
  });

  const defaults = useDefaultsSolicitudQuery(anio, mes, isOpen && !editando);
  const beneficiarios = useBeneficiariosQuery(beneficiario.trim());
  // Pedidos de compra que se pueden vincular (los anulados no)
  const pedidos = useComprasQuery({ page: 1, limit: 60 }, isOpen);
  const pedidosVigentes = useMemo(
    () => (pedidos.data?.data ?? []).filter((c) => c.estado !== "ANULADA"),
    [pedidos.data]
  );

  // Cada vez que se abre, parte de la solicitud (o de los valores sugeridos si es nueva)
  useEffect(() => {
    if (!isOpen) return;
    if (solicitud) {
      setFecha(solicitud.fecha.slice(0, 10));
      setNumero(String(solicitud.numero));
      setSolicitadoPor(solicitud.solicitadoPor);
      setBeneficiario(solicitud.beneficiarioNombre);
      setNit(solicitud.beneficiarioNit ?? "");
      setBanco(solicitud.banco ?? "");
      setCuenta(solicitud.cuenta ?? "");
      setProveedorId(solicitud.proveedorId ?? null);
      setCompraId(solicitud.compraId ?? "");
      setCotizacion(solicitud.cotizacion ?? "");
      setInformeUso(solicitud.informeUso ?? "");
      setObservaciones(solicitud.observaciones ?? "");
      setItems(
        solicitud.items.length
          ? solicitud.items.map((item) => ({
              referencia: item.referencia ?? "",
              descripcion: item.descripcion,
              cantidad: String(item.cantidad),
              precioUnit: String(item.precioUnit),
              descuento: String(item.descuento)
            }))
          : [itemVacio()]
      );
      const siguiente = {} as Record<TipoFirma, { nombre: string; cargo: string }>;
      for (const tipo of TIPOS_FIRMA) {
        const firma = firmaDe(solicitud, tipo);
        siguiente[tipo] = { nombre: firma?.nombre ?? "", cargo: firma?.cargo ?? "" };
      }
      setFirmas(siguiente);
    } else {
      // Fecha dentro del mes que se está viendo si hoy cae en otro mes
      const hoy = hoyIso();
      setFecha(hoy.startsWith(`${anio}-${String(mes).padStart(2, "0")}`) ? hoy : `${anio}-${String(mes).padStart(2, "0")}-01`);
      setNumero("");
      setBeneficiario("");
      setNit("");
      setBanco("");
      setCuenta("");
      setProveedorId(null);
      setCompraId("");
      setCotizacion("");
      setInformeUso("");
      setObservaciones("");
      setItems([itemVacio()]);
    }
  }, [isOpen, solicitud, anio, mes]);

  // Valores sugeridos de la última solicitud (solo para una nueva)
  useEffect(() => {
    if (!isOpen || editando || !defaults.data) return;
    const d = defaults.data.data;
    setNumero(String(d.siguienteNumero));
    setSolicitadoPor(d.solicitadoPor);
    const siguiente = {} as Record<TipoFirma, { nombre: string; cargo: string }>;
    for (const tipo of TIPOS_FIRMA) {
      siguiente[tipo] = { nombre: d.firmas[tipo]?.nombre ?? "", cargo: d.firmas[tipo]?.cargo ?? "" };
    }
    setFirmas(siguiente);
  }, [isOpen, editando, defaults.data]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !guardando) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, guardando, onClose]);

  const total = useMemo(
    () =>
      items.reduce((suma, item) => suma + Math.max(0, aNumero(item.cantidad) * aNumero(item.precioUnit) - aNumero(item.descuento)), 0),
    [items]
  );

  if (!isOpen) return null;

  function elegirBeneficiario(valor: string) {
    setBeneficiario(valor);
    const conocido = beneficiarios.data?.data.find((b) => b.nombre.toLowerCase() === valor.trim().toLowerCase());
    if (conocido) {
      // Completa los datos que ya conocemos, sin pisar lo que la persona ya escribió
      setNit((actual) => actual || conocido.nit || "");
      setBanco((actual) => actual || conocido.banco || "");
      setCuenta((actual) => actual || conocido.cuenta || "");
      setProveedorId(conocido.proveedorId);
    } else {
      setProveedorId(null);
    }
  }

  function elegirPedido(id: string) {
    setCompraId(id);
    const pedido = pedidosVigentes.find((c) => c.id === id);
    if (!pedido) return;
    // Trae del pedido lo que aún está vacío: proveedor y detalle
    if (pedido.proveedor?.nombre && !beneficiario.trim()) {
      setBeneficiario(pedido.proveedor.nombre);
      setNit(pedido.proveedor.nit ?? "");
      setProveedorId(pedido.proveedorId ?? null);
    }
    if (items.length === 1 && !items[0]!.descripcion.trim() && !items[0]!.precioUnit && pedido.items.length) {
      setItems(
        pedido.items.map((item) => ({
          referencia: item.producto?.codigo ?? "",
          descripcion: item.producto?.nombre ?? "Producto",
          cantidad: String(item.cantidadPedida),
          precioUnit: String(item.precioUnit),
          descuento: "0"
        }))
      );
    }
  }

  function cambiarItem(indice: number, cambio: Partial<ItemForm>) {
    setItems((actuales) => actuales.map((item, i) => (i === indice ? { ...item, ...cambio } : item)));
  }

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numeroEntero = Number(numero);
    const payload: SolicitudPayload = {
      fecha,
      numero: Number.isInteger(numeroEntero) && numeroEntero > 0 ? numeroEntero : undefined,
      solicitadoPor: solicitadoPor.trim(),
      cotizacion: cotizacion.trim() || null,
      informeUso: informeUso.trim() || null,
      observaciones: observaciones.trim() || null,
      proveedorId,
      compraId: compraId || null,
      beneficiarioNombre: beneficiario.trim(),
      beneficiarioNit: nit.trim() || null,
      banco: banco.trim() || null,
      cuenta: cuenta.trim() || null,
      items: items
        .filter((item) => item.descripcion.trim() || item.precioUnit)
        .map((item) => ({
          referencia: item.referencia.trim() || null,
          descripcion: item.descripcion.trim(),
          cantidad: aNumero(item.cantidad),
          precioUnit: aNumero(item.precioUnit),
          descuento: aNumero(item.descuento)
        })),
      firmas: Object.fromEntries(
        TIPOS_FIRMA.map((tipo) => [tipo, { nombre: firmas[tipo].nombre.trim(), cargo: firmas[tipo].cargo.trim() || null }])
      )
    };

    const alTerminar = {
      onSuccess: () => {
        showSuccess(editando ? "Solicitud actualizada." : "Solicitud registrada.");
        onClose();
      },
      onError: (error: unknown) => showError(error instanceof ApiError ? error.message : "No se pudo guardar la solicitud.")
    };
    if (solicitud) actualizar.mutate({ id: solicitud.id, payload }, alTerminar);
    else crear.mutate(payload, alTerminar);
  }

  const hayFirmasPrevias = Boolean(solicitud?.firmas.some((f) => f.tipo !== "ELABORADO" && f.firmadoAt));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !guardando) onClose();
      }}
    >
      <div className="relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-[var(--color-surface-container-high)] p-6 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          disabled={guardando}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]"
        >
          <X size={18} />
        </button>
        <h2 className="mb-1 text-lg font-bold">{editando ? `Editar solicitud Nº ${solicitud?.numero}` : "Nueva solicitud de pago"}</h2>
        <p className="mb-5 text-sm text-[var(--color-on-surface-variant)]">
          {hayFirmasPrevias
            ? "Al guardar cambios se quitan las firmas de Revisó, VºBº y Administración: deben firmar de nuevo."
            : "Llena lo que sepas; después puedes completar o corregir antes de firmar."}
        </p>

        <form onSubmit={enviar} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelClassName}>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClassName} required />
            </div>
            <div>
              <label className={labelClassName}>Nº de solicitud</label>
              <input type="number" min={1} value={numero} onChange={(e) => setNumero(e.target.value)} className={inputClassName} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClassName}>Solicitado por</label>
              <input value={solicitadoPor} onChange={(e) => setSolicitadoPor(e.target.value)} className={inputClassName} />
            </div>
          </div>

          <div>
            <label className={labelClassName}>Pedido de compra relacionado (opcional)</label>
            <select value={compraId} onChange={(e) => elegirPedido(e.target.value)} className={inputClassName}>
              <option value="">Sin pedido de compra</option>
              {pedidosVigentes.map((c) => (
                <option key={c.id} value={c.id}>
                  {`${(c.fechaOperacion ?? c.createdAt ?? "").slice(0, 10)} · ${c.proveedor?.nombre ?? "Sin proveedor"} · ${c.items
                    .slice(0, 2)
                    .map((i) => i.producto?.nombre ?? "")
                    .join(", ")}`}
                </option>
              ))}
              {compraId && !pedidosVigentes.some((c) => c.id === compraId) ? <option value={compraId}>Pedido vinculado</option> : null}
            </select>
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
              Al elegirlo se completan el proveedor y el detalle si aún están vacíos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className={labelClassName}>
                Beneficiario (a quién se paga) <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                list="sp-beneficiarios"
                value={beneficiario}
                onChange={(e) => elegirBeneficiario(e.target.value)}
                className={inputClassName}
                placeholder="Escribe para buscar o agrega uno nuevo"
                required
              />
              <datalist id="sp-beneficiarios">
                {(beneficiarios.data?.data ?? []).map((b) => (
                  <option key={`${b.origen}-${b.nombre}-${b.cuenta ?? ""}`} value={b.nombre} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelClassName}>NIT o C.I.</label>
              <input value={nit} onChange={(e) => setNit(e.target.value)} className={inputClassName} />
            </div>
            <div>
              <label className={labelClassName}>Cotización Nº</label>
              <input value={cotizacion} onChange={(e) => setCotizacion(e.target.value)} className={inputClassName} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClassName}>Banco</label>
              <input value={banco} onChange={(e) => setBanco(e.target.value)} className={inputClassName} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClassName}>Nº de cuenta</label>
              <input value={cuenta} onChange={(e) => setCuenta(e.target.value)} className={inputClassName} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold">Detalle de lo que se paga</h3>
              <button
                type="button"
                onClick={() => setItems((actuales) => [...actuales, itemVacio()])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--color-primary)]"
              >
                <Plus size={14} /> Agregar ítem
              </button>
            </div>
            <div className="space-y-2">
              <div className="hidden grid-cols-12 gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)] sm:grid">
                <span className="col-span-2">Referencia</span>
                <span className="col-span-4">Descripción</span>
                <span className="col-span-1">Cant.</span>
                <span className="col-span-2">Precio Bs</span>
                <span className="col-span-1">Desc.</span>
                <span className="col-span-1 text-right">Total</span>
              </div>
              {items.map((item, indice) => {
                const totalItem = Math.max(0, aNumero(item.cantidad) * aNumero(item.precioUnit) - aNumero(item.descuento));
                return (
                  <div key={indice} className="grid grid-cols-12 items-center gap-2">
                    <input className={`${inputClassName} col-span-6 sm:col-span-2`} placeholder="Referencia" value={item.referencia} onChange={(e) => cambiarItem(indice, { referencia: e.target.value })} />
                    <input className={`${inputClassName} col-span-6 sm:col-span-4`} placeholder="Descripción" value={item.descripcion} onChange={(e) => cambiarItem(indice, { descripcion: e.target.value })} />
                    <input className={`${inputClassName} col-span-3 sm:col-span-1`} inputMode="decimal" placeholder="Cant." value={item.cantidad} onChange={(e) => cambiarItem(indice, { cantidad: e.target.value })} />
                    <input className={`${inputClassName} col-span-4 sm:col-span-2`} inputMode="decimal" placeholder="Precio" value={item.precioUnit} onChange={(e) => cambiarItem(indice, { precioUnit: e.target.value })} />
                    <input className={`${inputClassName} col-span-3 sm:col-span-1`} inputMode="decimal" placeholder="Desc." value={item.descuento} onChange={(e) => cambiarItem(indice, { descuento: e.target.value })} />
                    <div className="col-span-2 flex items-center justify-end gap-1 text-xs font-semibold sm:col-span-2">
                      <span className="tabular-nums">{totalItem.toFixed(2)}</span>
                      <button
                        type="button"
                        disabled={items.length === 1}
                        onClick={() => setItems((actuales) => actuales.filter((_, i) => i !== indice))}
                        aria-label="Quitar ítem"
                        className="rounded p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-error)] disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 rounded-lg bg-[var(--color-surface-container-highest)] px-4 py-3 text-sm">
              <div className="flex items-center justify-between font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatBs(total)}</span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{montoEnLetras(total)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName}>Informe de uso</label>
              <textarea rows={2} value={informeUso} onChange={(e) => setInformeUso(e.target.value)} className={inputClassName} />
            </div>
            <div>
              <label className={labelClassName}>Observaciones</label>
              <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={inputClassName} />
            </div>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-bold">Nombres que salen en las firmas</h3>
            <p className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
              Se imprimen en el formulario. La firma en sí se da desde el detalle de la solicitud.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TIPOS_FIRMA.map((tipo) => (
                <div key={tipo} className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClassName}>{ETIQUETA_FIRMA[tipo]}</label>
                    <input
                      value={firmas[tipo].nombre}
                      onChange={(e) => setFirmas((actual) => ({ ...actual, [tipo]: { ...actual[tipo], nombre: e.target.value } }))}
                      className={inputClassName}
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>Cargo</label>
                    <input
                      value={firmas[tipo].cargo}
                      onChange={(e) => setFirmas((actual) => ({ ...actual, [tipo]: { ...actual[tipo], cargo: e.target.value } }))}
                      className={inputClassName}
                      placeholder="Cargo"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={guardando} className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60">
              {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Registrar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
