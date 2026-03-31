import { systemStatusEndpoints } from "@/shared/api/endpoints/systemStatus.endpoints";
import { kardexValoradoEndpoints } from "@/shared/api/endpoints/kardexValorado.endpoints";
import { authEndpoints } from "@/shared/api/endpoints/auth.endpoints";
import { categoriasInventarioEndpoints } from "@/shared/api/endpoints/categoriasInventario.endpoints";
import { productosEndpoints } from "@/shared/api/endpoints/productos.endpoints";
import { contabilidadEndpoints } from "@/shared/api/endpoints/contabilidad.endpoints";
import { exploracionesEndpoints } from "@/shared/api/endpoints/exploraciones.endpoints";

export const apiEndpoints = {
  auth: authEndpoints,
  systemStatus: systemStatusEndpoints,
  kardexValorado: kardexValoradoEndpoints,
  categoriasInventario: categoriasInventarioEndpoints,
  productos: productosEndpoints,
  exploraciones: exploracionesEndpoints,
  contabilidad: contabilidadEndpoints
} as const;
