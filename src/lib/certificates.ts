import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getCourseById, loadTemplate, templateFrom, type Certificate, type Template } from './events';

export async function createCertificatePdf(
  cert: Certificate,
  settings?: Template,
  source?: ArrayBuffer,
  templateUrlOverride?: string
): Promise<Uint8Array> {
  let config = settings;
  let templateUrl = templateUrlOverride;

  if (!config || (!source && !templateUrl)) {
    const course = await getCourseById(cert.cursoId);
    if (!config) {
      config = course?.configPlantilla ? templateFrom(course.configPlantilla) : await loadTemplate();
    }
    if (!templateUrl && course?.plantillaUrl) {
      templateUrl = course.plantillaUrl;
    }
  }

  const finalConfig = templateFrom(config);

  const bytes =
    source ??
    (await (async () => {
      const targetUrl = templateUrl?.trim() || '/plantilla.pdf';
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(
          `No se encontró la plantilla asignada (${targetUrl}). Verifica que el archivo exista en public/plantillas/.`
        );
      }
      return response.arrayBuffer();
    })());

  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPages()[0];
  if (!page) throw new Error('El PDF de plantilla no contiene páginas.');

  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = page.getWidth();
  const displayName = cert.nombre.trim().toUpperCase();

  const hex = finalConfig.color.replace('#', '');
  const color = /^[0-9a-f]{6}$/i.test(hex)
    ? rgb(
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255
      )
    : rgb(0.09, 0.18, 0.23);

  const available =
    finalConfig.align === 'center'
      ? Math.min(finalConfig.x, width - finalConfig.x) * 2 - 40
      : width - finalConfig.x - 25;

  const size = Math.min(
    finalConfig.fontSize,
    Math.max(6, available / Math.max(0.1, font.widthOfTextAtSize(displayName, 1)))
  );

  const nameX =
    finalConfig.align === 'center'
      ? finalConfig.x - font.widthOfTextAtSize(displayName, size) / 2
      : finalConfig.x;

  page.drawText(displayName, {
    x: Math.max(10, nameX),
    y: finalConfig.y,
    size,
    font,
    color,
  });

  return pdf.save();
}

export function downloadFile(bytes: Uint8Array | string, name: string, type: string) {
  const blob = new Blob([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function downloadCertificate(cert: Certificate) {
  downloadFile(await createCertificatePdf(cert), `${cert.folio}.pdf`, 'application/pdf');
}