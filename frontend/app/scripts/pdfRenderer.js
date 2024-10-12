// pdfRenderer.js

import { state } from './state.js';
import { drawAnnotations } from './annotationManager.js';

/**
 * Renders a specific page of the PDF document.
 * @param {number} num - The page number to render.
 */
export function renderPage(num) {
    // Cancel any ongoing render task
    if (state.currentRenderTask) {
        state.currentRenderTask.cancel();
    }

    state.pageIsRendering = true;

    state.pdfDoc.getPage(num).then(page => {
        // Handle page rotation for correct orientation
        let rotation = page.rotate % 360; // Normalize rotation

        const viewport = page.getViewport({ scale: state.scale, rotation: rotation });

        // Adjust canvas for high DPI screens
        const devicePixelRatio = window.devicePixelRatio || 1;
        state.canvas.width = viewport.width * devicePixelRatio;
        state.canvas.height = viewport.height * devicePixelRatio;
        state.canvas.style.width = `${viewport.width}px`;
        state.canvas.style.height = `${viewport.height}px`;
        state.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

        // Resize annotation canvas to match PDF canvas
        state.annotationCanvas.width = viewport.width * devicePixelRatio;
        state.annotationCanvas.height = viewport.height * devicePixelRatio;
        state.annotationCanvas.style.width = `${viewport.width}px`;
        state.annotationCanvas.style.height = `${viewport.height}px`;
        state.annotationCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

        const renderContext = {
            canvasContext: state.ctx,
            viewport: viewport
        };

        state.currentRenderTask = page.render(renderContext);

        state.currentRenderTask.promise.then(() => {
            state.pageIsRendering = false;
            state.currentRenderTask = null;

            // Render the next page if there is a pending request
            if (state.pageNumIsPending !== null) {
                renderPage(state.pageNumIsPending);
                state.pageNumIsPending = null;
            }

            drawAnnotations(num); // Draw annotations for the current page
        }).catch(error => {
            if (error.name === 'RenderingCancelledException') {
                // Rendering was cancelled, no action needed
                console.warn('Rendering cancelled for page', num);
            } else {
                console.error('Error during rendering:', error);
                alert('Failed to render page. Please try again.');
            }
        });
    })
    .catch(error => {
        console.error('Error getting page:', error);
        alert('Failed to get page. Please try again.');
    });

    // Update the current page number display
    document.getElementById('page-num').textContent = num;
}

/**
 * Queues a page to render if another page is currently rendering.
 * @param {number} num - The page number to render.
 */
export function queueRenderPage(num) {
    if (state.pageIsRendering) {
        state.pageNumIsPending = num;
    } else {
        renderPage(num);
    }
}

/**
 * Handles window resize events by re-rendering the current page.
 */
export function handleWindowResize() {
    if (state.pdfDoc) {
        renderPage(state.pageNum);
    }
}
