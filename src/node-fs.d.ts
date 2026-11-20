// Lo mínimo de node:fs que usan los tests guardianes (el proyecto no instala los tipos de Node).
// Vitest corre en Node: los tests leen los archivos tal cual están en el repositorio.
declare module 'node:fs' {
  export function readFileSync(ruta: string, codificacion: 'utf8'): string;
}
