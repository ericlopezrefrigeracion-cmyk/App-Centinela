// Reemplaza expo-print + expo-sharing + expo-file-system (no existen en web): abre el mismo
// HTML del reporte en una pestaña nueva y dispara el diálogo de impresión del navegador -- el
// usuario elige "Guardar como PDF" ahí. Cero dependencias nuevas, mismo HTML que ya se generaba
// para expo-print.
export function exportarReportePDF(html, nombreArchivo) {
  const ventana = window.open('', '_blank');
  if (!ventana) {
    throw new Error('El navegador bloqueó la ventana emergente. Habilitá pop-ups para este sitio e intentá de nuevo.');
  }
  const htmlConTitulo = html.replace('<head>', `<head><title>${nombreArchivo}</title>`);
  ventana.document.open();
  ventana.document.write(htmlConTitulo);
  ventana.document.close();
  ventana.focus();
  // Esperar a que la pestaña termine de pintar antes de abrir el diálogo de impresión --
  // llamarlo sincrónicamente a veces abre el diálogo con la página todavía en blanco.
  ventana.onload = () => {
    ventana.print();
  };
}
