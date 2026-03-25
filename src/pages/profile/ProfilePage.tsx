import { useAuth } from "@/features/auth/context/AuthContext";

export function ProfilePage() {
  const { user, token } = useAuth();

  if (!user) {
    return (
      <section className="rounded-xl bg-[#0b1324] p-6 text-[#dde5ff]">
        <p className="text-sm text-[#ff9993]">No hay sesión activa.</p>
      </section>
    );
  }

  return (
    <section className="max-w-2xl rounded-xl border border-white/10 bg-[#0b1324] p-6 text-[#dde5ff]">
      <h1 className="font-headline text-3xl font-extrabold">Mi perfil</h1>
      <p className="mt-2 text-sm text-[#9aaad6]">Información cargada desde tu sesión autenticada.</p>

      <dl className="mt-6 grid gap-4 text-sm">
        <div className="rounded-lg bg-[#132549] p-4">
          <dt className="text-xs uppercase tracking-widest text-[#6f7fa3]">ID</dt>
          <dd className="mt-1 font-semibold text-[#dde5ff]">{user.id}</dd>
        </div>
        <div className="rounded-lg bg-[#132549] p-4">
          <dt className="text-xs uppercase tracking-widest text-[#6f7fa3]">Nombre</dt>
          <dd className="mt-1 font-semibold text-[#dde5ff]">{user.nombre}</dd>
        </div>
        <div className="rounded-lg bg-[#132549] p-4">
          <dt className="text-xs uppercase tracking-widest text-[#6f7fa3]">Email</dt>
          <dd className="mt-1 font-semibold text-[#dde5ff]">{user.email}</dd>
        </div>
        <div className="rounded-lg bg-[#132549] p-4">
          <dt className="text-xs uppercase tracking-widest text-[#6f7fa3]">Rol</dt>
          <dd className="mt-1 font-semibold text-[#dde5ff]">{user.role}</dd>
        </div>
        <div className="rounded-lg bg-[#132549] p-4">
          <dt className="text-xs uppercase tracking-widest text-[#6f7fa3]">Token</dt>
          <dd className="mt-1 break-all font-mono text-xs text-[#9ecaff]">
            {token ? `${token.slice(0, 24)}...${token.slice(-16)}` : "No disponible"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
