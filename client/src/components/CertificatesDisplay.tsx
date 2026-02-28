import { usePdfThumbnail } from "@/hooks/usePdfThumbnail";

export function PdfThumbnail({ pdfUrl }: { pdfUrl: string }) {
  const thumbnailUrl = usePdfThumbnail({ pdfUrl });

  if (!thumbnailUrl)
    return (
      <div className="flex justify-center items-center w-40 h-40 border rounded bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400">
        Generando miniatura...
      </div>
    );

  return (
    <img
      src={thumbnailUrl}
      alt="PDF Thumbnail"
      className="w-40 h-40 object-contain  rounded shadow-sm"
    />
  );
}

type Props = {
  existingCertificates: string[]; // URLs desde backend
  newCertificates?: File[]; // Archivos cargados localmente
  onRemoveNewFile?: (file: File) => void; // Opcional, para eliminar archivos nuevos
};

export default function CertificatesDisplay({
  existingCertificates,
  newCertificates = [],
  onRemoveNewFile,
}: Props) {
  const staticUrl = import.meta.env.VITE_STATIC_URL;

  const isImage = (filename: string) => /\.(jpg|jpeg|png|gif)$/i.test(filename);
  const isPdf = (filename: string) => /\.pdf$/i.test(filename);

  const newFilePreviews = newCertificates.map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file),
    file,
  }));

  // Componente para miniatura genérica
  const ThumbnailItem = ({
    src,
    alt,
    onRemove,
  }: {
    src: string;
    alt: string;
    onRemove?: () => void;
  }) => (
    <div className="relative group w-40 h-40 border rounded-md overflow-hidden shadow-sm bg-white dark:bg-transparent dark:border-none">
      <img src={src} alt={alt} className="w-full h-full object-contain" />
      {onRemove && (
        <button
          onClick={onRemove}
          type="button"
          aria-label={`Eliminar certificado ${alt}`}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-sm"
        >
          ✕
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-8  pt-4">
      {/* Certificados existentes */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          Certificados guardados
        </h3>
        {existingCertificates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {existingCertificates.map((cert, i) => {
              const filename = cert.split("/").pop() || "";
              const fullUrl = `${staticUrl}${cert}`;

              if (isImage(filename)) {
                return (
                  <div
                    key={i}
                    className="w-40 h-48 flex flex-col items-center gap-2"
                  >
                    <ThumbnailItem src={fullUrl} alt={`Certificado ${i + 1}`} />
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:text-teal-800 font-semibold text-sm dark:text-zinc-200"
                    >
                      Ver
                    </a>
                  </div>
                );
              } else if (isPdf(filename)) {
                return (
                  <div
                    key={i}
                    className="w-40 h-48 flex flex-col items-center gap-2"
                  >
                    <PdfThumbnail pdfUrl={fullUrl} />
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:text-teal-800 font-semibold text-sm dark:text-zinc-200"
                    >
                      Ver
                    </a>
                  </div>
                );
              } else {
                return (
                  <div
                    key={i}
                    className="flex items-center justify-center w-40 h-40  bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400"
                  >
                    {filename}
                    <p>
                      <a href={fullUrl}>VER</a>
                    </p>
                  </div>
                );
              }
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">
            No hay certificados guardados.
          </p>
        )}
      </section>

      {/* Certificados nuevos */}
      {newCertificates.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
            Certificados nuevos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {newFilePreviews.map(({ name, url, file }) => {
              const isImg = isImage(name);
              const isPdfFile = isPdf(name);

              if (isImg) {
                return (
                  <ThumbnailItem
                    key={url}
                    src={url}
                    alt={name}
                    onRemove={() => onRemoveNewFile?.(file)}
                  />
                );
              } else if (isPdfFile) {
                return (
                  <div key={url} className="relative w-40 h-40">
                    <PdfThumbnail pdfUrl={url} />
                    {onRemoveNewFile && (
                      <button
                        onClick={() => onRemoveNewFile(file)}
                        type="button"
                        aria-label={`Eliminar certificado ${name}`}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              } else {
                return (
                  <div
                    key={url}
                    className="relative flex items-center justify-center w-40 h-40 border rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400"
                  >
                    {name}
                    {onRemoveNewFile && (
                      <button
                        onClick={() => onRemoveNewFile(file)}
                        type="button"
                        aria-label={`Eliminar certificado ${name}`}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              }
            })}
          </div>
        </section>
      )}
    </div>
  );
}
