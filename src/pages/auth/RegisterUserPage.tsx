import { FormEvent, useState } from "react";
import { useRegisterMutation } from "@/features/auth/hooks/useRegisterMutation";
import { ApiError } from "@/shared/api/core/apiError";
import type { AuthRole } from "@/features/auth/model/auth.schema";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import {
  authInputClassName,
  authLabelClassName,
  authPrimaryButtonClassName
} from "@/pages/auth/authUi";

const roleOptions: AuthRole[] = ["ADMIN", "ALMACENERO", "SUPERINTENDENTE", "TRABAJADOR"];

export function RegisterUserPage() {
  const registerMutation = useRegisterMutation();
  const { showError, showSuccess } = useToast();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AuthRole>("TRABAJADOR");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    registerMutation.mutate(
      { nombre, email, password, role },
      {
        onSuccess: (response) =>
          showSuccess(`Usuario registrado: ${response.data.nombre} (${response.data.role})`),
        onError: (error) => {
          const message =
            error instanceof ApiError ? error.message : "No se pudo registrar el usuario.";
          showError(message);
        }
      }
    );
  }

  return (
    <section className="relative max-w-2xl rounded-xl border border-[var(--color-outline-variant)]/60 bg-[linear-gradient(160deg,rgba(17,31,60,0.9),rgba(11,19,36,0.95))] p-6 text-[var(--color-on-surface)]">
      <span className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[var(--color-tertiary)]/20 blur-xl" />
      <h1 className="font-headline text-3xl font-extrabold">Registrar nuevo usuario</h1>
      <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
        Solo administradores pueden crear cuentas.
      </p>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <div className="md:col-span-2">
          <label className={authLabelClassName}>Nombre</label>
          <input
            required
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            className={authInputClassName}
          />
        </div>

        <div>
          <label className={authLabelClassName}>Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authInputClassName}
          />
        </div>

        <div>
          <label className={authLabelClassName}>Role</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as AuthRole)}
            className={authInputClassName}
          >
            {roleOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <PasswordInput
          required
          label="Contraseña"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          labelClassName={authLabelClassName}
          wrapperClassName="md:col-span-2"
          className={`${authInputClassName} pr-10`}
        />

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={registerMutation.isPending}
            className={authPrimaryButtonClassName}
          >
            {registerMutation.isPending ? "Registrando..." : "Crear usuario"}
          </button>
        </div>
      </form>
    </section>
  );
}
