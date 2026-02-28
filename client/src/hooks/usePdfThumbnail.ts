import "@/pdfWorker"; // worker ya definido
import { useEffect, useState } from "react";
import { pdfjs } from "react-pdf";

type UsePdfThumbnailProps = {
  pdfUrl: string;
  scale?: number;
};

export function usePdfThumbnail({ pdfUrl, scale = 1.0 }: UsePdfThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const { getDocument } = pdfjs;

  useEffect(() => {
    console.log("useEffect ejecutado, pdfUrl:", pdfUrl);
    if (!pdfUrl) return;

    let pdfDoc: Awaited<
      ReturnType<typeof getDocument>
    >["promise"] extends Promise<infer T>
      ? T
      : never;
const loadPdf = async () => {
  try {
    console.log("Descargando PDF:", pdfUrl);

    const res = await fetch(pdfUrl);
    console.log("Fetch completado, status:", res.status);

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const contentType = res.headers.get("content-type");
    console.log("Content-Type:", contentType);

    if (!contentType || !contentType.includes("pdf")) {
      throw new Error(`La respuesta no es un PDF (${contentType})`);
    }

    const arrayBuffer = await res.arrayBuffer();
    console.log("ArrayBuffer obtenido, bytes:", arrayBuffer.byteLength);

    const loadingTask = getDocument({ data: arrayBuffer });
    pdfDoc = await loadingTask.promise;

    console.log("PDF cargado, páginas:", pdfDoc.numPages);

    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvas,
      viewport,
    }).promise;

    const dataUrl = canvas.toDataURL();
    setThumbnailUrl(dataUrl);

  } catch (err) {
    console.error("Error descargando o cargando PDF:", err);
  }
};


    loadPdf();

    return () => {
      pdfDoc?.destroy();
    };
  }, [pdfUrl, scale]);

  return thumbnailUrl;
}
