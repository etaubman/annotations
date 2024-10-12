// Main JavaScript File

// ---------------------------
// Global Variable Declarations
// ---------------------------

// PDF.js related variables
let pdfDoc = null,                     // PDF document object
    pageNum = 1,                       // Current page number
    pageIsRendering = false,           // Flag to indicate if a page is currently rendering
    pageNumIsPending = null,           // Page number pending to render
    scale = 1.0,                       // Current zoom scale
    minScale = 0.5,                    // Minimum zoom scale
    maxScale = 3.0,                    // Maximum zoom scale
    canvas = document.getElementById('pdf-render-canvas'),          // Main canvas for PDF rendering
    ctx = canvas.getContext('2d'),                                      // 2D context for main canvas
    annotationCanvas = document.getElementById('annotation-canvas'),   // Canvas for annotations
    annotationCtx = annotationCanvas.getContext('2d'),                  // 2D context for annotation canvas
    isAnnotationMode = false,                                          // Flag to toggle annotation mode
    isDrawing = false,                                                 // Flag to indicate if drawing is in progress
    startX, startY,                                                    // Starting coordinates for annotation drawing
    documentId = null,                                                  // Current document ID
    annotations = [],                                                   // Array to store annotations
    currentRenderTask = null;                                           // Current PDF render task
let highlightedAnnotation = null;                                       // Currently highlighted annotation

// New state variable to toggle the visibility of annotations
let showAnnotations = true;

// ---------------------------
// Initialization
// ---------------------------

// Initialize PDF.js worker with the specified worker script URL
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js';

// Event listener for window load
window.onload = () => {
    fetchDocuments(); // Fetch the list of documents from the backend
    // Add event listener for window resize with debounce to optimize performance
    window.addEventListener('resize', debounce(handleWindowResize, 300));
};

// ---------------------------
// Utility Functions
// ---------------------------

/**
 * Debounce function to limit the rate at which a function can fire.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The delay in milliseconds.
 * @returns {Function} - Debounced function.
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Handles window resize events by re-rendering the current page.
 */
function handleWindowResize() {
    if (pdfDoc) {
        renderPage(pageNum);
    }
}

// ---------------------------
// Document Management
// ---------------------------

/**
 * Fetches the list of documents from the backend and populates the document list UI.
 */
function fetchDocuments() {
    fetch('http://localhost:8000/documents_with_annotations')
        .then(response => response.json())
        .then(data => {
            const documentList = document.getElementById('document-list');
            documentList.innerHTML = ''; // Clear existing list

            data.forEach(doc => {
                const tr = document.createElement('tr');

                // Document Name Cell
                const tdName = document.createElement('td');
                tdName.textContent = doc.file_path;
                tr.appendChild(tdName);

                // Annotation Count Cell
                const tdAnnotations = document.createElement('td');
                tdAnnotations.textContent = doc.annotation_count;
                tdAnnotations.style.textAlign = 'center';
                tr.appendChild(tdAnnotations);

                // Action Cell with Load Button
                const tdAction = document.createElement('td');
                const loadButton = document.createElement('button');
                loadButton.textContent = 'Load';
                loadButton.onclick = () => loadDocument(doc.id, doc.file_path);
                tdAction.appendChild(loadButton);
                tr.appendChild(tdAction);

                documentList.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error fetching documents:', error);
            alert('Failed to fetch documents. Please try again.');
        });
}

/**
 * Uploads a selected PDF file to the backend.
 */
document.getElementById('upload-button').addEventListener('click', () => {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (file) {
        const formData = new FormData();
        formData.append('file', file);

        fetch('http://localhost:8000/documents/', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('File upload failed');
                }
                return response.json();
            })
            .then(() => {
                fetchDocuments();      // Refresh document list
                fileInput.value = ''; // Reset file input
                alert('File uploaded successfully.');
            })
            .catch(error => {
                console.error('Error uploading file:', error);
                alert('Failed to upload file. Please try again.');
            });
    } else {
        alert('Please select a PDF file to upload.');
    }
});

/**
 * Loads a selected PDF document and initializes rendering.
 * @param {number} id - The document ID.
 * @param {string} filePath - The file path of the PDF.
 */
function loadDocument(id, filePath) {
    documentId = id;
    const url = `http://localhost:8000/uploaded_files/${filePath}`;

    pdfjsLib.getDocument(url).promise.then(pdfDoc_ => {
        pdfDoc = pdfDoc_;
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        pageNum = 1;          // Reset to first page
        scale = 1.0;          // Reset zoom level
        document.getElementById('zoom-level').textContent = `${Math.round(scale * 100)}%`;
        renderPage(pageNum);  // Render the first page
        fetchAnnotations();   // Fetch annotations for the document
    })
    .catch(error => {
        console.error('Error loading PDF:', error);
        alert('Failed to load PDF. Please try again.');
    });
}

// ---------------------------
// PDF Rendering
// ---------------------------

/**
 * Renders a specific page of the PDF document.
 * @param {number} num - The page number to render.
 */
function renderPage(num) {
    // Cancel any ongoing render task
    if (currentRenderTask) {
        currentRenderTask.cancel();
    }

    pageIsRendering = true;

    pdfDoc.getPage(num).then(page => {
        // Handle page rotation for correct orientation
        let rotation = page.rotate % 360; // Normalize rotation

        const viewport = page.getViewport({ scale: scale, rotation: rotation });

        // Adjust canvas for high DPI screens
        const devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = viewport.width * devicePixelRatio;
        canvas.height = viewport.height * devicePixelRatio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

        // Resize annotation canvas to match PDF canvas
        annotationCanvas.width = viewport.width * devicePixelRatio;
        annotationCanvas.height = viewport.height * devicePixelRatio;
        annotationCanvas.style.width = `${viewport.width}px`;
        annotationCanvas.style.height = `${viewport.height}px`;
        annotationCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        currentRenderTask = page.render(renderContext);

        currentRenderTask.promise.then(() => {
            pageIsRendering = false;
            currentRenderTask = null;

            // Render the next page if there is a pending request
            if (pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
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
function queueRenderPage(num) {
    if (pageIsRendering) {
        pageNumIsPending = num;
    } else {
        renderPage(num);
    }
}

// ---------------------------
// Navigation Controls
// ---------------------------

// Show Previous Page
document.getElementById('prev-page-button').addEventListener('click', () => {
    if (pageNum <= 1) return; // Prevent navigating before the first page
    pageNum--;
    queueRenderPage(pageNum);
});

// Show Next Page
document.getElementById('next-page-button').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return; // Prevent navigating beyond the last page
    pageNum++;
    queueRenderPage(pageNum);
});

// Zoom In
document.getElementById('zoom-in-button').addEventListener('click', () => {
    if (scale >= maxScale) return; // Prevent zooming in beyond the maximum scale
    scale += 0.25;
    document.getElementById('zoom-level').textContent = `${Math.round(scale * 100)}%`;
    queueRenderPage(pageNum);
});

// Zoom Out
document.getElementById('zoom-out-button').addEventListener('click', () => {
    if (scale <= minScale) return; // Prevent zooming out beyond the minimum scale
    scale -= 0.25;
    document.getElementById('zoom-level').textContent = `${Math.round(scale * 100)}%`;
    queueRenderPage(pageNum);
});

// ---------------------------
// Annotation Management
// ---------------------------

/**
 * Fetches annotations for the current document from the backend.
 */
function fetchAnnotations() {
    if (!documentId) return;

    fetch(`http://localhost:8000/annotations/${documentId}`)
        .then(response => response.json())
        .then(data => {
            annotations = data;
            updateAnnotationList(); // Update the annotation list UI
            renderPage(pageNum);    // Re-render the current page to display annotations
        })
        .catch(error => {
            console.error('Error fetching annotations:', error);
            alert('Failed to fetch annotations. Please try again.');
        });
}

/**
 * Updates the annotation list UI with the fetched annotations.
 */
function updateAnnotationList() {
    const annotationList = document.getElementById('annotation-list');
    annotationList.innerHTML = ''; // Clear existing annotations

    if (annotations.length === 0) {
        // Display message if no annotations are available
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.setAttribute('colspan', '4');
        td.textContent = 'No annotations available.';
        tr.appendChild(td);
        annotationList.appendChild(tr);
        return;
    }

    annotations.forEach(ann => {
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
            pageNum = ann.page;
            queueRenderPage(pageNum);
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
function drawAnnotations(pageNum) {
    if (!showAnnotations) {
        // If annotations are hidden, clear the annotation canvas
        annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
        return;
    }

    // Clear the annotation canvas before drawing
    annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);

    // Filter annotations for the current page
    annotations.filter(ann => ann.page === pageNum).forEach(ann => {
        // Determine if the annotation is currently highlighted
        const isHighlighted = highlightedAnnotation && ann.id === highlightedAnnotation.id;

        // Draw the annotation rectangle
        annotationCtx.beginPath();
        annotationCtx.rect(ann.x * scale, ann.y * scale, ann.width * scale, ann.height * scale);
        annotationCtx.lineWidth = isHighlighted ? 3 : 2; // Thicker border for highlighted annotations
        annotationCtx.strokeStyle = isHighlighted ? 'orange' : 'red'; // Color based on highlight status
        annotationCtx.stroke();

        // Set text properties for annotation label
        annotationCtx.fillStyle = 'red';
        annotationCtx.font = '12px Arial';
        annotationCtx.textBaseline = 'top'; // Align text to the top

        // Calculate text position with padding
        const textX = ann.x * scale + 5; // 5px padding from the left edge
        const textY = ann.y * scale + 5; // 5px padding from the top edge

        // Draw the annotation name
        annotationCtx.fillText(ann.value, textX, textY);
    });
}

// ---------------------------
// Annotation Mode Controls
// ---------------------------

/**
 * Toggles the annotation mode on and off.
 */
document.getElementById('annotation-mode-button').addEventListener('click', () => {
    isAnnotationMode = !isAnnotationMode;
    const button = document.getElementById('annotation-mode-button');
    const showAnnotationsButton = document.getElementById('show-annotations-button');
    const annotationCanvas = document.getElementById('annotation-canvas');

    if (isAnnotationMode) {
        // Enable Annotation Mode
        annotationCanvas.style.pointerEvents = 'auto';    // Allow interactions
        button.textContent = 'Annotation Mode: On';
        button.classList.add('active');
        annotationCanvas.style.cursor = 'crosshair';

        // Ensure annotations are visible
        showAnnotations = true;
        document.getElementById('show-annotations-button').textContent = 'Show Annotations: On';
        annotationCanvas.style.display = 'block';

        // Re-render annotations to ensure visibility
        renderPage(pageNum);

        // Disable the Show Annotations button to prevent conflicts
        showAnnotationsButton.disabled = true;
        showAnnotationsButton.style.opacity = 0.5;
    } else {
        // Disable Annotation Mode
        annotationCanvas.style.pointerEvents = 'none';    // Prevent interactions
        button.textContent = 'Annotation Mode: Off';
        annotationCanvas.style.cursor = 'default';

        // Re-enable the Show Annotations button
        showAnnotationsButton.disabled = false;
        showAnnotationsButton.style.opacity = 1;
    }
});

/**
 * Toggles the visibility of annotations on the PDF.
 */
document.getElementById('show-annotations-button').addEventListener('click', () => {
    showAnnotations = !showAnnotations;
    const showAnnotationsButton = document.getElementById('show-annotations-button');

    if (showAnnotations) {
        showAnnotationsButton.textContent = 'Show Annotations: On';
        annotationCanvas.style.display = 'block';
    } else {
        showAnnotationsButton.textContent = 'Show Annotations: Off';
        annotationCanvas.style.display = 'none';
    }

    // Re-render the current page to update annotations visibility
    renderPage(pageNum);
});

// ---------------------------
// Annotation Drawing Events
// ---------------------------

/**
 * Handles the mousedown event on the annotation canvas to start drawing.
 * @param {MouseEvent} e - The mouse event.
 */
annotationCanvas.addEventListener('mousedown', (e) => {
    if (isAnnotationMode) {
        isDrawing = true;
        const rect = annotationCanvas.getBoundingClientRect();
        startX = (e.clientX - rect.left) / scale;
        startY = (e.clientY - rect.top) / scale;
    }
});

/**
 * Handles the mousemove event on the annotation canvas to draw the annotation rectangle.
 * @param {MouseEvent} e - The mouse event.
 */
annotationCanvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        const rect = annotationCanvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / scale;
        const mouseY = (e.clientY - rect.top) / scale;

        // Clear the annotation canvas and redraw existing annotations
        annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
        drawAnnotations(pageNum);

        // Calculate width and height of the annotation rectangle
        const width = mouseX - startX;
        const height = mouseY - startY;

        // Draw the current annotation rectangle
        annotationCtx.beginPath();
        annotationCtx.rect(startX * scale, startY * scale, width * scale, height * scale);
        annotationCtx.lineWidth = 2;
        annotationCtx.strokeStyle = 'blue';
        annotationCtx.stroke();
    }
});

/**
 * Handles the mouseup event on the annotation canvas to finalize and save the annotation.
 * @param {MouseEvent} e - The mouse event.
 */
annotationCanvas.addEventListener('mouseup', async (e) => {
    if (isDrawing) {
        isDrawing = false;
        const rect = annotationCanvas.getBoundingClientRect();
        const endX = (e.clientX - rect.left) / scale;
        const endY = (e.clientY - rect.top) / scale;

        let x = startX;
        let y = startY;
        let width = endX - startX;
        let height = endY - startY;

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
            annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
            drawAnnotations(pageNum);
            return;
        }

        try {
            // Show the custom modal to get annotation details from the user
            const userAnnotationInput = await showAnnotationModal();

            if (userAnnotationInput) {
                const annotation = {
                    document_id: documentId,
                    page: pageNum,
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
                annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
                drawAnnotations(pageNum);
            }
        } catch (error) {
            console.error('Error handling annotation:', error);
            alert('An error occurred while processing the annotation. Please try again.');
            // Clear the annotation in case of error
            annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
            drawAnnotations(pageNum);
        }
    }
});

/**
 * Handles the mouseleave event on the annotation canvas to cancel drawing if the mouse leaves the canvas.
 * @param {MouseEvent} e - The mouse event.
 */
annotationCanvas.addEventListener('mouseleave', (e) => {
    if (isDrawing) {
        isDrawing = false;
        annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
        drawAnnotations(pageNum);
    }
});

// ---------------------------
// Annotation Modal
// ---------------------------

/**
 * Displays a custom modal to get annotation details from the user.
 * @returns {Promise<Object|boolean>} - Resolves with annotation details or false if discarded.
 */
function showAnnotationModal() {
    return new Promise((resolve) => {
        // Create overlay for modal
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '1000'
        });

        // Create modal container
        const modal = document.createElement('div');
        Object.assign(modal.style, {
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.26)',
            width: '300px',
            boxSizing: 'border-box'
        });

        // Modal title
        const title = document.createElement('h2');
        title.innerText = 'Add Annotation';
        title.style.marginTop = '0';

        // Create form elements
        const form = document.createElement('form');

        // Annotation Name Field
        const nameLabel = document.createElement('label');
        nameLabel.innerText = 'Annotation Name:';
        nameLabel.htmlFor = 'annotation-name';
        Object.assign(nameLabel.style, {
            display: 'block',
            marginBottom: '5px'
        });

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'annotation-name';
        nameInput.required = true;
        Object.assign(nameInput.style, {
            width: '100%',
            padding: '8px',
            marginBottom: '15px',
            boxSizing: 'border-box'
        });

        // Annotation Value Field
        const valueLabel = document.createElement('label');
        valueLabel.innerText = 'Annotation Value:';
        valueLabel.htmlFor = 'annotation-value';
        Object.assign(valueLabel.style, {
            display: 'block',
            marginBottom: '5px'
        });

        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.id = 'annotation-value';
        valueInput.required = true;
        Object.assign(valueInput.style, {
            width: '100%',
            padding: '8px',
            marginBottom: '15px',
            boxSizing: 'border-box'
        });

        // Buttons container
        const buttonsDiv = document.createElement('div');
        Object.assign(buttonsDiv.style, {
            display: 'flex',
            justifyContent: 'flex-end'
        });

        // Submit Button
        const submitButton = document.createElement('button');
        submitButton.type = 'button';
        submitButton.innerText = 'Submit';
        Object.assign(submitButton.style, {
            padding: '8px 12px',
            marginRight: '10px',
            backgroundColor: '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
        });

        // Discard Button
        const discardButton = document.createElement('button');
        discardButton.type = 'button';
        discardButton.innerText = 'Discard';
        Object.assign(discardButton.style, {
            padding: '8px 12px',
            backgroundColor: '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
        });

        // Append buttons to buttons container
        buttonsDiv.appendChild(submitButton);
        buttonsDiv.appendChild(discardButton);

        // Append form elements
        form.appendChild(nameLabel);
        form.appendChild(nameInput);
        form.appendChild(valueLabel);
        form.appendChild(valueInput);
        form.appendChild(buttonsDiv);

        // Assemble modal
        modal.appendChild(title);
        modal.appendChild(form);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        /**
         * Cleans up and removes the modal from the DOM.
         */
        const closeModal = () => {
            document.body.removeChild(overlay);
        };

        // Event listener for Submit button
        submitButton.addEventListener('click', () => {
            if (nameInput.value.trim() === '') {
                alert('Please include a name for the annotation');
                return;
            }
            const result = {
                annotationName: nameInput.value.trim(),
                annotationValue: valueInput.value.trim(),
            };
            closeModal();
            resolve(result);
        });

        // Event listener for Discard button
        discardButton.addEventListener('click', () => {
            closeModal();
            resolve(false);
        });

        // Handle Enter key for form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitButton.click();
        });

        // Focus on the first input field
        nameInput.focus();
    });
}

/**
 * Optional function to log annotation modal results.
 * Can be removed if not needed.
 */
async function getUserAnnotation() {
    const result = await showAnnotationModal();
    if (result) {
        console.log("Submitted Data:", result);
        return result;
    } else {
        console.log("Modal was discarded.");
        return false;
    }
}
