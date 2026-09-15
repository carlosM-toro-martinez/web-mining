import type { CajaChica } from "@/features/parametrosCajaChica/model/parametrosCajaChica.schema";

// Caja Bolivianos Lipeña es, en la práctica, la única caja que se usa a
// diario — todos los formularios del módulo la preseleccionan para no
// obligar a elegirla cada vez. Sigue siendo editable si hace falta otra.
export function encontrarCajaLipena(cajas: CajaChica[]): CajaChica | undefined {
  return cajas.find((c) => c.nombre.toLowerCase().includes("lipeñ")) ?? cajas[0];
}
