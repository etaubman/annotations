// controls.js

import { state } from './state.js';
import { fetchDocuments, uploadDocument } from './documentManager.js';
import { renderPage, queueRenderPage, handleWindowResize } from './pdfRenderer.js';
import { debounce } from './utility.js';
import { fetchAnnotations, drawAnnotations } from './annotationManager.js';
import { showAnnotationModal } from './modal.js';

/**
 * Sets up event listeners for UI controls and interactions.
 */
export function setupEventListeners() {
    // Show Previous Page
    document.getElementById('prev-page-button').addEventListener('click', () => {
        if (state.pageNum <= 1) return; // Prevent navigating before the first page
        state.pageNum--;
        queueRenderPage(state.pageNum);
    });

    // Show Next Page
    document.getElementById('next-page-button').addEventListener('click', () => {
        if (state.pageNum >= state.pdfDoc.numPages) return; // Prevent navigating beyond the last page
        state.pageNum++;
        queueRenderPage(state.pageNum);
    });

    // Zoom In
    document.getElementById('zoom-in-button').addEventListener('click', () => {
        if (state.scale >= state.maxScale) return; // Prevent zooming in beyond the maximum scale
        state.scale += 0.25;
        document.getElementById('zoom-level').textContent = `${Math.round(state.scale * 100)}%`;
        queueRenderPage(state.pageNum);
    });

    // Zoom Out
    document.getElementById('zoom-out-button').addEventListener('click', () => {
        if (state.scale <= state.minScale) return; // Prevent zooming out beyond the minimum scale
        state.scale -= 0.25;
        document.getElementById('zoom-level').textContent = `${Math.round(state.scale * 100)}%`;
        queueRenderPage(state.pageNum);
    });

    // Annotation Mode Toggle
    document.getElementById('annotation-mode-button').addEventListener('click', () => {
        state.isAnnotationMode = !state.isAnnotationMode;
        const button = document.getElementById('annotation-mode-button');
        const showAnnotationsButton = document.getElementById('show-annotations-button');
        const annotationCanvas = document.getElementById('annotation-canvas');

        if (state.isAnnotationMode) {
            // Enable Annotation Mode
            annotationCanvas.style.pointerEvents = 'auto';    // Allow interactions
            button.textContent = 'Annotation Mode: On';
            button.classList.add('active');
            annotationCanvas.style.cursor = 'crosshair';

            // Ensure annotations are visible
            state.showAnnotations = true;
            document.getElementById('show-annotations-button').textContent = 'Show Annotations: On';
            annotationCanvas.style.display = 'block';

            // Re-render annotations to ensure visibility
            renderPage(state.pageNum);

            // Disable the Show Annotations button to prevent conflicts
            showAnnotationsButton.disabled = true;
            showAnnotationsButton.style.opacity = 0.5;
        } else {
            // Disable Annotation Mode
            annotationCanvas.style.pointerEvents = 'none';    // Prevent interactions
            button.textContent = 'Annotation Mode: Off';
            button.classList.remove('active');
            annotationCanvas.style.cursor = 'default';

            // Re-enable the Show Annotations button
            showAnnotationsButton.disabled = false;
            showAnnotationsButton.style.opacity = 1;
        }
    });

    // Show Annotations Toggle
    document.getElementById('show-annotations-button').addEventListener('click', () => {
        state.showAnnotations = !state.showAnnotations;
        const showAnnotationsButton = document.getElementById('show-annotations-button');

        if (state.showAnnotations) {
            showAnnotationsButton.textContent = 'Show Annotations: On';
            state.annotationCanvas.style.display = 'block';
        } else {
            showAnnotationsButton.textContent = 'Show Annotations: Off';
            state.annotationCanvas.style.display = 'none';
        }

        // Re-render the current page to update annotations visibility
        renderPage(state.pageNum);
    });

    // Upload Document
    document.getElementById('upload-button').addEventListener('click', uploadDocument);

    // Annotation Drawing Events
    state.annotationCanvas.addEventListener('mousedown', (e) => {
        if (state.isAnnotationMode) {
            state.isDrawing = true;
            const rect = state.annotationCanvas.getBoundingClientRect();
            state.startX = (e.clientX - rect.left) / state.scale;
            state.startY = (e.clientY - rect.top) / state.scale;
        }
    });

    state.annotationCanvas.addEventListener('mousemove', (e) => {
        if (state.isDrawing) {
            const rect = state.annotationCanvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) / state.scale;
            const mouseY = (e.clientY - rect.top) / state.scale;

            // Clear the annotation canvas and redraw existing annotations
            state.annotationCtx.clearRect(0, 0, state.annotationCanvas.width, state.annotationCanvas.height);
            drawAnnotations(state.pageNum);

            // Calculate width and height of the annotation rectangle
            const width = mouseX - state.startX;
            const height = mouseY - state.startY;

            // Draw the current annotation rectangle
            state.annotationCtx.beginPath();
            state.annotationCtx.rect(state.startX * state.scale, state.startY * state.scale, width * state.scale, height * state.scale);
            state.annotationCtx.lineWidth = 2;
            state.annotationCtx.strokeStyle = 'blue';
            state.annotationCtx.stroke();
        }
    });

    state.annotationCanvas.addEventListener('mouseup', async (e) => {
        if (state.isDrawing) {
            state.isDrawing = false;
            const rect = state.annotationCanvas.getBoundingClientRect();
            const endX = (e.clientX - rect.left) / state.scale;
            const endY = (e.clientY - rect.top) / state.scale;

            let x = state.startX;
            let y = state.startY;
            let width = endX - state.startX;
            let height = endY - state.startY;

            // Adjust for negative width/height to ensure proper rectangle dimensions
            if (width < 0) {
                x += width;
                width = Math.abs(width);
            }
            if (height < 0) {
                y += height;
                height = Math.abs(height);
            }

            // Prevent saving very small annotations
            if (width < 10 || height < 10) {
                alert('Annotation too small. Please draw a larger area.');
                state.annotationCtx.clearRect(0, 0, state.annotationCanvas.width, state.annotationCanvas.height);
                drawAnnotations(state.pageNum);
                return;
            }

            try {
                // Show the custom modal to get annotation details from the user
                const userAnnotationInput = await showAnnotationModal();

                if (userAnnotationInput) {
                    const annotation = {
                        document_id: state.documentId,
                        page: state.pageNum,
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        value: userAnnotationInput.annotationName,
                        annotation_value: userAnnotationInput.annotationValue
                    };

                    // Save the annotation to the backend
                    const response = await fetch('http://localhost:8000/annotations/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(annotation)
                    });

                    if (!response.ok) {
                        throw new Error('Failed to save annotation');
                    }

                    // Refresh annotations and notify the user
                    await fetchAnnotations();
                    alert('Annotation saved successfully.');
                } else {
                    // If the user discards the annotation, clear the drawn rectangle
                    state.annotationCtx.clearRect(0, 0, state.annotationCanvas.width, state.annotationCanvas.height);
                    drawAnnotations(state.pageNum);
                }
            } catch (error) {
                console.error('Error handling annotation:', error);
                alert('An error occurred while processing the annotation. Please try again.');
                // Clear the annotation in case of error
                state.annotationCtx.clearRect(0, 0, state.annotationCanvas.width, state.annotationCanvas.height);
                drawAnnotations(state.pageNum);
            }
        }
    });

    state.annotationCanvas.addEventListener('mouseleave', (e) => {
        if (state.isDrawing) {
            state.isDrawing = false;
            state.annotationCtx.clearRect(0, 0, state.annotationCanvas.width, state.annotationCanvas.height);
            drawAnnotations(state.pageNum);
        }
    });

    // Window resize event
    window.addEventListener('resize', debounce(handleWindowResize, 300));
}
