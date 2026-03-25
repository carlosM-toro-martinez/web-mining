import { FormEvent, useMemo, useState } from "react";
import { useRegisterMutation } from "@/features/auth/hooks/useRegisterMutation";
import { ApiError } from "@/shared/api/core/apiError";
import type { AuthRole } from "@/features/auth/model/auth.schema";

const roleOptions: AuthRole[] = ["ADMIN", "ALMACENERO", "SUPERINTENDENTE", "TRABAJADOR"];

export function RegisterUserPage() {
  const registerMutation = useRegisterMutation();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AuthRole>("TRABAJADOR");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    registerMutation.mutate({ nombre, email, password, role });
  }

  const message = useMemo(() => {
    if (registerMutation.isSuccess) {
      return `Usuario registrado: ${registerMutation.data.data.nombre} (${registerMutation.data.data.role})`;
    }
    if (registerMutation.error instanceof ApiError) {
      return registerMutation.error.message;
    }
    return "";
  }, [registerMutation.data, registerMutation.error, registerMutation.isSuccess]);

  return (
    <section className="max-w-2xl rounded-xl border border-white/10 bg-[#0b1324] p-6 text-[#dde5ff]">
      <h1 className="font-headline text-3xl font-extrabold">Registrar nuevo usuario</h1>
      <p className="mt-2 text-sm text-[#9aaad6]">Solo administradores pueden crear cuentas.</p>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs uppercase tracking-widest text-[#6f7fa3]">Nombre</label>
          <input
            required
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            className="w-full rounded-lg border-none bg-[#132549] px-4 py-2.5 text-sm text-[#dde5ff] focus:ring-1 focus:ring-[#9ecaff]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-[#6f7fa3]">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border-none bg-[#132549] px-4 py-2.5 text-sm text-[#dde5ff] focus:ring-1 focus:ring-[#9ecaff]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-[#6f7fa3]">Role</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as AuthRole)}
            className="w-full rounded-lg border-none bg-[#132549] px-4 py-2.5 text-sm text-[#dde5ff] focus:ring-1 focus:ring-[#9ecaff]"
          >
            {roleOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs uppercase tracking-widest text-[#6f7fa3]">
            Contraseña
          </label>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border-none bg-[#132549] px-4 py-2.5 text-sm text-[#dde5ff] focus:ring-1 focus:ring-[#9ecaff]"
          />
        </div>

        {message ? (
          <p className={`md:col-span-2 text-sm ${registerMutation.isSuccess ? "text-[#9ecaff]" : "text-[#ff9993]"}`}>
            {message}
          </p>
        ) : null}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="rounded-lg bg-[#9ecaff] px-5 py-2.5 text-sm font-semibold text-[#004272] transition hover:opacity-90 disabled:opacity-60"
          >
            {registerMutation.isPending ? "Registrando..." : "Crear usuario"}
          </button>
        </div>
      </form>
    </section>
  );
}
