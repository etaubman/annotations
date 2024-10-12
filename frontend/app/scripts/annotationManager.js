// annotationManager.js

import { state } from './state.js';
import { renderPage } from './pdfRenderer.js';
import { showAnnotationModal } from './modal.js';
import { queueRenderPage } from './pdfRenderer.js';

/**
 * Fetches annotations for the current document from the backend.
 */
export function fetchAnnotations() {
    if (!state.documentId) return;

    fetch(`http://localhost:8000/annotations/${state.documentId}`)
        .then(response => response.json())
        .then(data => {
            state.annotations = data;
            updateAnnotationList(); // Update the annotation list UI
            renderPage(state.pageNum);    // Re-render the current page to display annotations
        })
        .catch(error => {
            console.error('Error fetching annotations:', error);
            alert('Failed to fetch annotations. Please try again.');
        });
}

/**
 * Updates the annotation list UI with the fetched annotations.
 */
export function updateAnnotationList() {
    const annotationList = document.getElementById('annotation-list');
    annotationList.innerHTML = ''; // Clear existing annotations

    if (state.annotations.length === 0) {
        // Display message if no annotations are available
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.setAttribute('colspan', '4');
        td.textContent = 'No annotations available.';
        tr.appendChild(td);
        annotationList.appendChild(tr);
        return;
    }

    state.annotations.forEach(ann => {
        const tr = document.createElement('tr');

        // Page Number Cell
        const tdPage = document.createElement('td');
        tdPage.textContent = ann.page;
        tdPage.style.textAlign = 'center';
        tr.appendChild(tdPage);

        // Annotation Description Cell
        const tdDescription = document.createElement('td');
        tdDescription.textContent = ann.value;
        tr.appendChild(tdDescription);

        // Annotation Value Cell
        const tdValue = document.createElement('td');
        tdValue.textContent = ann.annotation_value;
        tr.appendChild(tdValue);

        // Action Cell with Go Button
        const tdAction = document.createElement('td');
        const gotoButton = document.createElement('button');
        gotoButton.textContent = 'Go';
        gotoButton.onclick = () => {
            state.pageNum = ann.page;
            queueRenderPage(state.pageNum);
            // Optionally, highlight the annotation here
        };
        tdAction.style.textAlign = 'center';
        tdAction.appendChild(gotoButton);
        tr.appendChild(tdAction);

        annotationList.appendChild(tr);
    });
}

/**
 * Draws annotations on the annotation canvas for the specified page.
 * @param {number} pageNum - The page number to draw annotations on.
 */
export function drawAnnotations(pageNum) {
    if (!state.showAnnotations) {
        // If annotations are hidden, clear the annotation canvas
        state.annotationCtx.clearRect(0, 0, state.annotationCanvas.width, state.annotationCanvas.height);
        return;
    }

    // Clear the annotation canvas before drawing
    state.annotationCtx.clearRect(0, 0, state.annotationCanvas.width, state.annotationCanvas.height);

    // Filter annotations for the current page
    state.annotations.filter(ann => ann.page === pageNum).forEach(ann => {
        // Determine if the annotation is currently highlighted
        const isHighlighted = state.highlightedAnnotation && ann.id === state.highlightedAnnotation.id;

        // Draw the annotation rectangle
        state.annotationCtx.beginPath();
        state.annotationCtx.rect(ann.x * state.scale, ann.y * state.scale, ann.width * state.scale, ann.height * state.scale);
        state.annotationCtx.lineWidth = isHighlighted ? 3 : 2; // Thicker border for highlighted annotations
        state.annotationCtx.strokeStyle = isHighlighted ? 'orange' : 'red'; // Color based on highlight status
        state.annotationCtx.stroke();

        // Set text properties for annotation label
        state.annotationCtx.fillStyle = 'red';
        state.annotationCtx.font = '12px Arial';
        state.annotationCtx.textBaseline = 'top'; // Align text to the top

        // Calculate text position with padding
        const textX = ann.x * state.scale + 5; // 5px padding from the left edge
        const textY = ann.y * state.scale + 5; // 5px padding from the top edge

        // Draw the annotation name
        state.annotationCtx.fillText(ann.value, textX, textY);
    });
}
