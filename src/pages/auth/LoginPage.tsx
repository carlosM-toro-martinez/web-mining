import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLoginMutation } from "@/features/auth/hooks/useLoginMutation";
import { ApiError } from "@/shared/api/core/apiError";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = (location.state as { from?: string } | null)?.from ?? "/";
  const loginMutation = useLoginMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => navigate(redirectPath, { replace: true })
      }
    );
  }

  const errorMessage =
    loginMutation.error instanceof ApiError
      ? loginMutation.error.message
      : loginMutation.error
        ? "No se pudo iniciar sesión."
        : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090e1a] p-6 text-[#dde5ff]">
      <section className="w-full max-w-md rounded-xl border border-white/10 bg-[#0b1324] p-7">
        <h1 className="font-headline text-3xl font-extrabold">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-[#9aaad6]">
          Accede para desbloquear el sistema y cargar tu perfil.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-[#6f7fa3]">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border-none bg-[#132549] px-4 py-2.5 text-sm text-[#dde5ff] focus:ring-1 focus:ring-[#9ecaff]"
              placeholder="usuario@empresa.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-[#6f7fa3]">
              Contraseña
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border-none bg-[#132549] px-4 py-2.5 text-sm text-[#dde5ff] focus:ring-1 focus:ring-[#9ecaff]"
              placeholder="••••••••"
            />
          </div>

          {errorMessage ? <p className="text-sm text-[#ff9993]">{errorMessage}</p> : null}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-lg bg-[#9ecaff] px-5 py-2.5 text-sm font-semibold text-[#004272] transition hover:opacity-90 disabled:opacity-60"
          >
            {loginMutation.isPending ? "Ingresando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
