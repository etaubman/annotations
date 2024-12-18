// documentManager.js

import { state } from './state.js';
import { renderPage } from './pdfRenderer.js';
import { fetchAnnotations } from './annotationManager.js';

/**
 * Fetches the list of documents from the backend and populates the document list UI.
 */
export function fetchDocuments() {
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
 * Loads a selected PDF document and initializes rendering.
 * @param {number} id - The document ID.
 * @param {string} filePath - The file path of the PDF.
 */
export function loadDocument(id, filePath) {
    state.documentId = id;
    const url = `http://localhost:8000/uploaded_files/${filePath}`;

    pdfjsLib.getDocument(url).promise.then(pdfDoc_ => {
        state.pdfDoc = pdfDoc_;
        document.getElementById('page-count').textContent = state.pdfDoc.numPages;
        state.pageNum = 1;          // Reset to first page
        state.scale = 1.0;          // Reset zoom level
        document.getElementById('zoom-level').textContent = `${Math.round(state.scale * 100)}%`;
        renderPage(state.pageNum);  // Render the first page
        fetchAnnotations();   // Fetch annotations for the document
    })
    .catch(error => {
        console.error('Error loading PDF:', error);
        alert('Failed to load PDF. Please try again.');
    });
}

/**
 * Uploads a selected PDF file to the backend.
 */
export function uploadDocument() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    const document_type_id = state.selectedDocumentType;

    if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type_id', document_type_id);

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
}

/**
 * Fetches a list of document types from the backend and populates the document type dropdown.
 * This function is called when the page loads and sets the state value for documentTypeOptions
 * and also populates the select input with the id document-type-select
 */
export function fetchDocumentTypes() {
    fetch('http://localhost:8000/document_types')
        .then(response => response.json())
        .then(data => {
            state.documentTypeOptions = data;
            const select = document.getElementById('document-type-select');
            select.innerHTML = ''; // Clear existing options

            data.forEach((type, index) => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name;
                select.appendChild(option);

                // Set the first available option as default
                if (index === 0) {
                    select.value = type.id;
                    state.selectedDocumentType = type.id;
                }
            });
        })
        .catch(error => {
            console.error('Error fetching document types:', error);
            alert('Failed to fetch document types. Please try again.');
        });
}
