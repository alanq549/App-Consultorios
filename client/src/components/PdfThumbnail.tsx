// 📂 PdfThumbnail.tsx
import { usePdfThumbnail } from "@/hooks/usePdfThumbnail";

export function PdfThumbnail({ pdfUrl }: { pdfUrl: string }) {
  const thumbnailUrl = usePdfThumbnail({ pdfUrl });

  if (!thumbnailUrl) return <div className="text-gray-500">Generando miniatura...</div>;

  return <img src={thumbnailUrl} alt="PDF Thumbnail" className="max-w-xs max-h-40 border" />;
}