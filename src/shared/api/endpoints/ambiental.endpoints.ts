export const ambientalEndpoints = {
  dashboard: "/api/ambiental/dashboard",
  mapa: "/api/ambiental/mapa",
  puntos: "/api/ambiental/puntos",
  puntoById: (id: number | string) => `/api/ambiental/puntos/${id}`,
  hidrico: "/api/ambiental/hidrico",
  hidricoById: (id: number | string) => `/api/ambiental/hidrico/${id}`,
  residuos: "/api/ambiental/residuos",
  residuosById: (id: number | string) => `/api/ambiental/residuos/${id}`,
  ruido: "/api/ambiental/ruido",
  ruidoById: (id: number | string) => `/api/ambiental/ruido/${id}`,
  suelo: "/api/ambiental/suelo",
  sueloById: (id: number | string) => `/api/ambiental/suelo/${id}`,
  pozos: "/api/ambiental/pozos",
  pozoById: (id: number | string) => `/api/ambiental/pozos/${id}`,
  manifiestos: "/api/ambiental/manifiestos",
  manifiestoById: (id: number | string) => `/api/ambiental/manifiestos/${id}`
} as const;
