import { useSystemStatus } from "@/features/system-status/hooks/useSystemStatus";

function LoaderRing() {
  return (
    <div className="relative mb-7 inline-block h-20 w-20">
      {[0, 1, 2, 3].map((index) => (
        <span
          // The indexed animation delay recreates the original ring effect.
          key={index}
          className="absolute m-2 block h-16 w-16 rounded-full border-[6px] border-mars-gold border-t-transparent border-r-transparent border-b-transparent animate-loaderRing"
          style={{ animationDelay: `${-0.45 + index * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export function SystemProgressCard() {
  const { progress, statusText, systemInfo } = useSystemStatus();

  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl">
      <div className="rounded-[2.5rem] border border-mars-gold/25 bg-mars-glass p-8 shadow-glass backdrop-blur-xl lg:p-10">
        <header className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-[linear-gradient(135deg,var(--color-gold),var(--color-rust))] p-[1px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-mars-bgDeep text-2xl text-mars-gold">
              <span aria-hidden>◎</span>
            </div>
          </div>
          <h2 className="mt-3 text-[1.8rem] font-bold tracking-[0.18em] text-mars-textPrimary">
            MARTE MINING
          </h2>
          <p className="text-sm text-mars-textMuted">Innovación y desarrollo minero</p>
        </header>

        <article className="my-8 text-center">
          <h1 className="mb-8 bg-[linear-gradient(120deg,var(--color-ivory),var(--color-gold))] bg-clip-text text-4xl font-bold text-transparent lg:text-[2.6rem]">
            SISTEMA EN PROGRESO
          </h1>
          <LoaderRing />
          <div className="mx-auto mb-6 mt-1 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-rust-soft))] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="inline-block rounded-full bg-black/40 px-5 py-2 text-[1.05rem] font-medium tracking-[0.015em] text-mars-ivory backdrop-blur">
            {statusText}
          </p>
        </article>

        <div className="mb-6 mt-10 flex flex-wrap justify-center gap-8">
          <article className="w-[240px] rounded-[2rem] border border-mars-gold/30 bg-black/45 p-6 text-center transition hover:-translate-y-1.5 hover:border-mars-gold hover:bg-[#141823b3]">
            <img
              src="/images/miner.png"
              alt="Creador"
              className="mx-auto mb-4 w-24 object-contain [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.4))]"
            />
            <h3 className="text-2xl font-semibold text-mars-ivory">Creador</h3>
            <p className="mt-1 text-sm text-[#c7bd97]">
              Equipo de ingeniería
              <br />
              Encuentra Software Solutions.
            </p>
          </article>

          <article className="w-[240px] rounded-[2rem] border border-mars-gold/30 bg-black/45 p-6 text-center transition hover:-translate-y-1.5 hover:border-mars-gold hover:bg-[#141823b3]">
            <div className="mx-auto mb-3 mt-5 h-12 w-12 animate-pulseSoft rounded-full border border-mars-gold/50 bg-mars-gold/10" />
            <h3 className="text-2xl font-semibold text-mars-ivory">
              {systemInfo?.company ?? "Marte Mining"}
            </h3>
            <p className="mt-1 text-sm text-[#c7bd97]">
              Excelencia en operaciones
              <br />
              mineras sostenibles
            </p>
          </article>
        </div>

        <footer className="border-t border-dashed border-mars-gold/20 pt-5 text-center text-xs text-mars-textSubtle">
          Despliegue continuo • {systemInfo?.version ?? "v3.0.0"}
        </footer>
      </div>
    </section>
  );
}
