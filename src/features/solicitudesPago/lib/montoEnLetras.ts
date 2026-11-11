const UNIDADES = [
  "", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE",
  "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUNO", "VEINTIDOS",
  "VEINTITRES", "VEINTICUATRO", "VEINTICINCO", "VEINTISEIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"
];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS",
  "OCHOCIENTOS", "NOVECIENTOS"
];

// 0 a 999
function menorAMil(n: number, apocopar: boolean): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (centena > 0) partes.push(CENTENAS[centena]!);
  if (resto > 0) {
    if (resto < 30) {
      let texto = UNIDADES[resto]!;
      // "un" antes de mil o de millones: "VEINTIUN MIL", "UN MILLON"
      if (apocopar && (resto === 1 || resto === 21)) texto = texto.replace(/UNO$/, "UN");
      partes.push(texto);
    } else {
      const decena = Math.floor(resto / 10);
      const unidad = resto % 10;
      let texto = DECENAS[decena]!;
      if (unidad > 0) texto += ` Y ${apocopar && unidad === 1 ? "UN" : UNIDADES[unidad]}`;
      partes.push(texto);
    }
  }
  return partes.join(" ");
}

export function enteroEnLetras(valor: number): string {
  const n = Math.floor(Math.abs(valor));
  if (n === 0) return "CERO";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones > 0) {
    partes.push(millones === 1 ? "UN MILLON" : `${menorAMil(millones, true)} MILLONES`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? "MIL" : `${menorAMil(miles, true)} MIL`);
  }
  if (resto > 0) partes.push(menorAMil(resto, false));
  return partes.join(" ");
}

// Como lo escriben en la solicitud: "SON: DIEZ MIL QUINIENTOS 00/100 BOLIVIANOS"
export function montoEnLetras(total: number): string {
  const centavosTotales = Math.round(Math.abs(total) * 100);
  const enteros = Math.floor(centavosTotales / 100);
  const centavos = String(centavosTotales % 100).padStart(2, "0");
  return `SON: ${enteroEnLetras(enteros)} ${centavos}/100 BOLIVIANOS`;
}
