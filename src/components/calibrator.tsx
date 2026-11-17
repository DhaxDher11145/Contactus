import { useEffect, useRef, useState } from 'react';
import { Download, Type } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Feedback } from './portal';
import { defaultTemplate, type Template, type Certificate } from '@/lib/events';
import { createCertificatePdf, downloadFile } from '@/lib/certificates';

const testCert: Certificate = {
  id: 'PRUEBA',
  folio: 'CERT-2026-PRUEBA',
  participanteId: 'prueba',
  email: 'prueba@example.com',
  nombre: 'MARÍA FERNANDA HERNÁNDEZ CASTELLANOS',
  cursoId: 'prueba',
  curso: 'Curso de prueba',
  fecha: '2026-11-14',
  horas: 4,
};

type CalibratorProps = {
  value?: Template;
  onChange?: (next: Template) => void;
  templateUrl?: string;
};

export function Calibrator({ value, onChange, templateUrl }: CalibratorProps) {
  const [internalConfig, setInternalConfig] = useState<Template>(value ?? defaultTemplate);
  const config = value ?? internalConfig;

  const updateConfig = (next: Template) => {
    if (onChange) onChange(next);
    else setInternalConfig(next);
  };

  const [dimensions, setDimensions] = useState({ width: 792, height: 612 });
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setMessage('');

    const timer = setTimeout(async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

        const targetUrl = templateUrl?.trim() || '/plantillas/curso1.pdf';
        const bytes = await createCertificatePdf(testCert, config, undefined, targetUrl);
        const task = pdfjs.getDocument({ data: bytes });
        const pdf = await task.promise;
        const page = await pdf.getPage(1);
        const natural = page.getViewport({ scale: 1 });

        if (!cancelled) setDimensions({ width: natural.width, height: natural.height });
        const viewport = page.getViewport({ scale: 1.15 });

        if (cancelled || !canvas.current) {
          await task.destroy();
          return;
        }

        const element = canvas.current;
        element.width = viewport.width;
        element.height = viewport.height;
        const context = element.getContext('2d');
        if (context) {
          await page.render({ canvasContext: context, viewport, canvas: element }).promise;
        }
        await task.destroy();
      } catch (err) {
        if (!cancelled) {
          setError(true);
          setMessage(
            err instanceof Error
              ? err.message
              : 'No se pudo previsualizar. Asegúrate de poner el PDF en public/plantillas/.'
          );
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [config, templateUrl]);

  function numeric(key: 'x' | 'y' | 'fontSize', label: string, max: number, min = 0) {
    return (
      <div className="slider-control">
        <div className="slider-label">
          <label htmlFor={`cal-${key}`}>{label}</label>
          <input
            id={`cal-${key}`}
            aria-label={label}
            className="text-input"
            type="number"
            min={min}
            max={max}
            value={config[key]}
            onChange={(e) =>
              updateConfig({
                ...config,
                [key]: Math.min(max, Math.max(min, Number(e.target.value))),
              })
            }
          />
        </div>
        <Slider
          aria-label={label}
          value={[config[key]]}
          min={min}
          max={max}
          step={1}
          onValueChange={([v]) => updateConfig({ ...config, [key]: v })}
        />
      </div>
    );
  }

  async function downloadPreview() {
    setBusy(true);
    setError(false);
    try {
      const targetUrl = templateUrl?.trim() || '/plantillas/curso1.pdf';
      const bytes = await createCertificatePdf(testCert, config, undefined, targetUrl);
      downloadFile(bytes, 'constancia-de-prueba.pdf', 'application/pdf');
      setMessage('PDF de prueba descargado.');
    } catch (err) {
      setError(true);
      setMessage(err instanceof Error ? err.message : 'No fue posible generar la prueba.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <Feedback message={message} error={error} />
      <div className="calibration-layout">
        <div>
          <div className="preview-surface">
            <canvas ref={canvas} aria-label="Vista previa de la constancia" />
          </div>
          <p className="field-hint">
            {Math.round(dimensions.width)} × {Math.round(dimensions.height)} puntos · Coordenadas desde la esquina inferior izquierda
          </p>
        </div>

        <section className="calibration-controls">
          <h3 className="flex items-center gap-2">
            <Type size={18} />
            Posición del nombre en esta plantilla
          </h3>
          {numeric('x', 'Posición X (Horizontal)', Math.round(dimensions.width))}
          {numeric('y', 'Posición Y (Vertical)', Math.round(dimensions.height) - config.fontSize)}
          {numeric('fontSize', 'Tamaño de fuente', 72, 8)}

          <label className="field">
            <span className="field-label">Color del texto</span>
            <div className="flex gap-3">
              <input
                aria-label="Selector de color"
                type="color"
                value={config.color}
                onChange={(e) => updateConfig({ ...config, color: e.target.value })}
              />
              <input
                className="text-input"
                aria-label="Color hexadecimal"
                value={config.color}
                pattern="#[0-9a-fA-F]{6}"
                onChange={(e) => {
                  if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
                    updateConfig({ ...config, color: e.target.value });
                  }
                }}
              />
            </div>
          </label>

          <label className="field">
            <span className="field-label">Alineación</span>
            <select
              className="text-input"
              value={config.align}
              onChange={(e) =>
                updateConfig({ ...config, align: e.target.value === 'left' ? 'left' : 'center' })
              }
            >
              <option value="center">Centrado en X</option>
              <option value="left">Desde la izquierda (X)</option>
            </select>
          </label>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={downloadPreview}
          >
            <Download />
            Descargar PDF de prueba
          </Button>
        </section>
      </div>
    </div>
  );
}