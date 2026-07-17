declare module '*.svg?raw' {
  const contenido: string;
  export default contenido;
}

declare module '*.png' {
  const url: string;
  export default url;
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const url: string;
  export default url;
}
