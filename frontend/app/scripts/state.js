// state.js

/**
 * The `state` object maintains the global state of the PDF viewer application.
 * It centralizes all the variables that need to be accessed or modified across different modules.
 */
export const state = {
    // ---------------------------
    // PDF.js Related Variables
    // ---------------------------

    /**
     * `pdfDoc` holds the currently loaded PDF document object from PDF.js.
     * It is used to access properties like the number of pages and to fetch individual pages for rendering.
     */
    pdfDoc: null,

    /**
     * `pageNum` represents the current page number being displayed.
     * It starts at 1 and is incremented/decremented based on user navigation.
     */
    pageNum: 1,

    /**
     * `pageIsRendering` is a flag indicating whether a page is currently being rendered.
     * It helps prevent multiple rendering processes from overlapping, ensuring smooth performance.
     */
    pageIsRendering: false,

    /**
     * `pageNumIsPending` holds the page number that is waiting to be rendered.
     * If a render is already in progress, the requested page is stored here and rendered once the current render completes.
     */
    pageNumIsPending: null,

    /**
     * `scale` controls the zoom level of the PDF rendering.
     * It can be adjusted to zoom in or out of the PDF pages.
     */
    scale: 1.0,

    /**
     * `minScale` defines the minimum allowed zoom level.
     * Prevents users from zooming out too much, which could make the PDF content unreadable.
     */
    minScale: 0.5,

    /**
     * `maxScale` defines the maximum allowed zoom level.
     * Prevents users from zooming in excessively, which could degrade performance or display quality.
     */
    maxScale: 3.0,

    /**
     * `canvas` is the main HTMLCanvasElement used for rendering the PDF page.
     * It displays the content of the current PDF page.
     */
    canvas: document.getElementById('pdf-render-canvas'),

    /**
     * `ctx` is the 2D rendering context for the main PDF canvas.
     * It provides the methods needed to draw on the canvas, such as rendering PDF pages.
     */
    ctx: document.getElementById('pdf-render-canvas').getContext('2d'),

    // ---------------------------
    // Annotation Related Variables
    // ---------------------------

    /**
     * `annotationCanvas` is the HTMLCanvasElement used for rendering annotations over the PDF.
     * It sits above the main PDF canvas and is used to draw annotation shapes and labels.
     */
    annotationCanvas: document.getElementById('annotation-canvas'),

    /**
     * `annotationCtx` is the 2D rendering context for the annotation canvas.
     * It provides the methods needed to draw annotations, such as rectangles and text.
     */
    annotationCtx: document.getElementById('annotation-canvas').getContext('2d'),

    /**
     * `isAnnotationMode` is a flag indicating whether the application is in annotation mode.
     * When true, users can draw annotations on the PDF. When false, annotation drawing is disabled.
     */
    isAnnotationMode: false,

    /**
     * `isDrawing` is a flag indicating whether the user is currently drawing an annotation.
     * It is used to track the drawing state during mouse events (e.g., mousedown, mousemove, mouseup).
     */
    isDrawing: false,

    /**
     * `startX` and `startY` store the starting coordinates of the current annotation being drawn.
     * They are used to calculate the dimensions of the annotation rectangle as the user drags the mouse.
     */
    startX: 0,
    startY: 0,

    /**
     * `documentId` holds the ID of the currently loaded PDF document.
     * It is used when fetching or saving annotations related to the document.
     */
    documentId: null,

    /**
     * `annotations` is an array that stores all the annotations for the current document.
     * Each annotation typically includes properties like page number, coordinates, dimensions, and content.
     */
    annotations: [],

    /**
     * `currentRenderTask` holds the current PDF.js render task.
     * It allows the application to cancel or manage ongoing render operations, ensuring only one render occurs at a time.
     */
    currentRenderTask: null,

    /**
     * `highlightedAnnotation` stores the currently highlighted annotation.
     * This can be used to apply special styles or actions to a selected annotation, such as highlighting it in the UI.
     */
    highlightedAnnotation: null,

    /**
     * `showAnnotations` is a flag to toggle the visibility of annotations.
     * When true, annotations are displayed over the PDF. When false, annotations are hidden.
     */
    showAnnotations: true,

    /**
     * `documentTypeOptions` is an array of document type options
     * that can be selected when creating a new document.
     */
    documentTypeOptions: [],

    /**
     * `selectedDocumentType` is the selected document type
     * when creating a new document.
     */
    selectedDocumentType: null,

    /**
     * `loadedDocumentType` is the document type of the loaded document
     * when viewing an existing document.
     */
    loadedDocumentType: null,
};
