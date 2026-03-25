import { Building2, Mail, MoonStar, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useTheme } from "@/shared/theme/ThemeProvider";

export function ProfilePage() {
  const { user } = useAuth();
  const { mode, setMode } = useTheme();

  if (!user) {
    return (
      <section className="rounded-xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-low)] p-6 text-[var(--color-on-surface)]">
        <p className="text-sm text-[var(--color-error)]">No hay sesion activa.</p>
      </section>
    );
  }

  const initials = user.nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <h1 className="font-headline text-3xl font-extrabold">Mi perfil</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
          Revisa tus datos de usuario y personaliza la apariencia del sistema.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="xl:col-span-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
          <div className="flex flex-wrap items-center gap-4 border-b border-[var(--color-border-soft)] pb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--color-primary)]/14 text-lg font-bold text-[var(--color-primary)]">
              {initials || "MM"}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.nombre}</h2>
              <p className="text-sm text-[var(--color-on-surface-variant)]">Usuario activo del sistema</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-[var(--color-surface-container-high)] p-4">
              <dt className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                <Mail size={14} />
                Email
              </dt>
              <dd className="mt-2 text-sm font-semibold text-[var(--color-on-surface)]">{user.email}</dd>
            </div>

            <div className="rounded-lg bg-[var(--color-surface-container-high)] p-4">
              <dt className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                <ShieldCheck size={14} />
                Rol
              </dt>
              <dd className="mt-2 text-sm font-semibold text-[var(--color-on-surface)]">{user.role}</dd>
            </div>

            <div className="rounded-lg bg-[var(--color-surface-container-high)] p-4">
              <dt className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                <Building2 size={14} />
                Empresa
              </dt>
              <dd className="mt-2 text-sm font-semibold text-[var(--color-on-surface)]">Empresa Minera Marte</dd>
            </div>

            <div className="rounded-lg bg-[var(--color-surface-container-high)] p-4">
              <dt className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                <UserRound size={14} />
                Estado
              </dt>
              <dd className="mt-2 inline-flex rounded-full bg-[var(--color-success)]/18 px-2.5 py-1 text-xs font-bold text-[var(--color-success)]">
                Sesion vigente
              </dd>
            </div>
          </dl>
        </article>

        <aside className="space-y-4 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)]">Apariencia</p>
            <h3 className="mt-1 text-lg font-bold">Tema del sistema</h3>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Elige el modo visual que te resulte mas comodo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--color-surface-container-high)] p-1.5">
            <button
              type="button"
              onClick={() => setMode("dark")}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                mode === "dark"
                  ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                  : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
              }`}
            >
              <MoonStar size={14} />
              Oscuro
            </button>
            <button
              type="button"
              onClick={() => setMode("light")}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                mode === "light"
                  ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                  : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
              }`}
            >
              <Sun size={14} />
              Claro
            </button>
          </div>

          <div className="rounded-lg bg-[var(--color-surface-container-high)] p-4">
            <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)]">Escalabilidad</p>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Esta vista esta preparada para mostrar mas datos de perfil, permisos y preferencias en siguientes fases.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
