import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { Building2, Search, Upload, UserPlus } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useCreateProveedorMutation,
  useProveedoresQuery
} from "@/features/proveedores/hooks/useProveedores";
import { ApiError } from "@/shared/api/core/apiError";
import { normalizeSpreadsheetRow, readSpreadsheetSheets } from "@/shared/lib/spreadsheetImport";
import { SubrouteBackButton } from "@/shared/ui/SubrouteBackButton";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) return error.message;
  return fallbackMessage;
}

export function ProveedoresPage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "ALMACENERO";
  const { showError, showSuccess } = useToast();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [search, setSearch] = useState("");
  const [nombre, setNombre] = useState("");
  const [lugar, setLugar] = useState("");
  const [contacto, setContacto] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nit, setNit] = useState("");

  const proveedoresQuery = useProveedoresQuery({
    page: 1,
    limit: 300,
    search: search.trim() || undefined
  });
  const createProveedorMutation = useCreateProveedorMutation();

  const proveedores = proveedoresQuery.data?.data ?? [];
  const proveedoresOrdenados = useMemo(
    () =>
      [...proveedores].sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })
      ),
    [proveedores]
  );

  function handleCreateProveedor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      showError("No tienes permisos para crear proveedores.");
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      lugar: lugar.trim(),
      contacto: contacto.trim() || undefined,
      razonSocial: razonSocial.trim() || undefined,
      nit: nit.trim() || undefined
    };

    if (!payload.nombre || !payload.lugar) {
      showError("Debes ingresar nombre y lugar del proveedor.");
      return;
    }

    createProveedorMutation.mutate(payload, {
      onSuccess: (response) => {
        showSuccess(`Proveedor creado: ${response.data.nombre}`);
        setNombre("");
        setLugar("");
        setContacto("");
        setRazonSocial("");
        setNit("");
      },
      onError: (error) => showError(normalizeError(error, "No se pudo crear el proveedor."))
    });
  }

  function openImportDialog() {
    importInputRef.current?.click();
  }

  async function handleImportProveedores(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!canManage) {
      showError("No tienes permisos para importar proveedores.");
      return;
    }

    try {
      setIsImporting(true);
      const sheets = await readSpreadsheetSheets(file);
      const rows = sheets.flatMap((sheet) => sheet.rows).map((row) => normalizeSpreadsheetRow(row));
      if (!rows.length) {
        showError("El archivo no tiene filas para importar.");
        return;
      }

      const existingByName = new Set(
        proveedores.map((item) => item.nombre.trim().toUpperCase())
      );

      let created = 0;
      let skipped = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const [index, row] of rows.entries()) {
        const rowLabel = `Fila ${index + 2}`;
        const nombreRow = (row.nombre || row.proveedor || row.proveedornombre || "").trim();
        const lugarRow = (row.lugar || row.ciudad || row.ubicacion || row.direccion || "").trim();
        const contactoRow = (row.contacto || row.telefono || row.celular || row.personacontacto || "").trim();
        const razonSocialRow = (row.razonsocial || row.razon || "").trim();
        const nitRow = (row.nit || row.nitci || "").trim();

        if (!nombreRow || !lugarRow) {
          skipped += 1;
          continue;
        }

        const normalizedName = nombreRow.toUpperCase();
        if (existingByName.has(normalizedName)) {
          skipped += 1;
          continue;
        }

        try {
          await createProveedorMutation.mutateAsync({
            nombre: nombreRow,
            lugar: lugarRow,
            contacto: contactoRow || undefined,
            razonSocial: razonSocialRow || undefined,
            nit: nitRow || undefined
          });
          existingByName.add(normalizedName);
          created += 1;
        } catch (error) {
          failed += 1;
          errors.push(normalizeError(error, `${rowLabel}: no se pudo crear proveedor.`));
        }
      }

      showSuccess(`Importación completada. Creados: ${created}, Omitidos: ${skipped}, Errores: ${failed}.`);
      if (errors.length) {
        showError(errors.slice(0, 3).join(" | "));
      }
    } catch (error) {
      showError(normalizeError(error, "No se pudo procesar el archivo de proveedores."));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="mb-4">
          <SubrouteBackButton />
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/14 p-2.5 text-[var(--color-primary)]">
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Proveedores</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Registra y administra proveedores para que el flujo de compras use datos reales.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <UserPlus size={16} className="text-[var(--color-primary)]" />
            Nuevo proveedor
          </h2>

          <form className="space-y-3" onSubmit={handleCreateProveedor}>
            <input
              required
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className={inputClassName}
              placeholder="Nombre del proveedor"
              disabled={!canManage}
            />
            <input
              required
              value={lugar}
              onChange={(event) => setLugar(event.target.value)}
              className={inputClassName}
              placeholder="Lugar (ciudad o ubicacion de la empresa)"
              disabled={!canManage}
            />
            <input
              value={contacto}
              onChange={(event) => setContacto(event.target.value)}
              className={inputClassName}
              placeholder="Contacto (telefono o persona)"
              disabled={!canManage}
            />
            <input
              value={razonSocial}
              onChange={(event) => setRazonSocial(event.target.value)}
              className={inputClassName}
              placeholder="Razon social (opcional)"
              disabled={!canManage}
            />
            <input
              value={nit}
              onChange={(event) => setNit(event.target.value)}
              className={inputClassName}
              placeholder="NIT (opcional)"
              disabled={!canManage}
            />
            <button
              type="submit"
              disabled={!canManage || createProveedorMutation.isPending}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {createProveedorMutation.isPending ? "Guardando..." : "Crear proveedor"}
            </button>
          </form>
          <button
            type="button"
            onClick={openImportDialog}
            disabled={!canManage || isImporting}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:opacity-60"
          >
            <Upload size={14} />
            {isImporting ? "Importando..." : "Importar proveedores CSV/Excel"}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImportProveedores}
            className="hidden"
          />
        </article>

        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-4 text-lg font-bold">Listado de proveedores</h2>
          <div className="relative mb-3">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`${inputClassName} pl-9`}
              placeholder="Buscar por nombre"
            />
          </div>

          <div className="table-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Nombre
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Contacto
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Lugar
                  </th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    NIT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {proveedoresQuery.isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
                      Cargando proveedores...
                    </td>
                  </tr>
                ) : null}
                {!proveedoresQuery.isLoading && proveedoresOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
                      No se encontraron proveedores.
                    </td>
                  </tr>
                ) : null}
                {proveedoresOrdenados.map((proveedor) => (
                  <tr key={proveedor.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                    <td className="px-3 py-2 text-xs">{proveedor.nombre}</td>
                    <td className="px-3 py-2 text-xs">{proveedor.contacto ?? "-"}</td>
                    <td className="px-3 py-2 text-xs">{proveedor.lugar ?? "-"}</td>
                    <td className="px-3 py-2 text-xs">{proveedor.nit ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
