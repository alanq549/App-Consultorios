import { pdfjs } from "react-pdf";

// ESTE es el worker correcto, misma versión que la API
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "react-pdf/dist/pdf.worker.entry.js",
  import.meta.url
).toString();
