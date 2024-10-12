// state.js

export const state = {
    // PDF.js related variables
    pdfDoc: null,
    pageNum: 1,
    pageIsRendering: false,
    pageNumIsPending: null,
    scale: 1.0,
    minScale: 0.5,
    maxScale: 3.0,
    canvas: document.getElementById('pdf-render-canvas'),
    ctx: document.getElementById('pdf-render-canvas').getContext('2d'),
    annotationCanvas: document.getElementById('annotation-canvas'),
    annotationCtx: document.getElementById('annotation-canvas').getContext('2d'),
    isAnnotationMode: false,
    isDrawing: false,
    startX: 0,
    startY: 0,
    documentId: null,
    annotations: [],
    currentRenderTask: null,
    highlightedAnnotation: null,
    showAnnotations: true,
};
