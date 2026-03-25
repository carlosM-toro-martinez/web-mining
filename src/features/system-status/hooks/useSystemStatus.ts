import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSystemStatus } from "@/features/system-status/api/systemStatusApi";
import { saveStatusSnapshot } from "@/features/system-status/db/systemStatusDb";
import { queryKeys } from "@/shared/lib/queryKeys";

const baseMessages = [
  "Sincronizando módulos de exploración...",
  "Optimizando flujo de operación minera...",
  "Verificando métricas de continuidad...",
  "Ajustando núcleo operativo..."
];

export function useSystemStatus() {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const query = useQuery({
    queryKey: queryKeys.systemStatus.detail(),
    queryFn: getSystemStatus
  });

  const messages = useMemo(() => {
    if (!query.data?.message) return baseMessages;
    return [...baseMessages, query.data.message];
  }, [query.data?.message]);

  useEffect(() => {
    if (!query.data) return;
    void saveStatusSnapshot(query.data);
  }, [query.data]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 100) return 100;
        const increment = Math.floor(Math.random() * 2) + 2;
        return Math.min(current + increment, 100);
      });

      setStepIndex((current) => {
        if (current >= messages.length - 1) return current;
        return current + 1;
      });
    }, 980);

    return () => window.clearInterval(timer);
  }, [messages.length]);

  const statusText =
    progress >= 100
      ? "Sistema operativo - listo para producción"
      : messages[Math.min(stepIndex, messages.length - 1)];

  return {
    progress,
    statusText,
    systemInfo: query.data
  };
}
