// main.js

import { setupEventListeners } from './controls.js';
import { fetchDocuments } from './documentManager.js';
import { state } from './state.js';

// Initialize PDF.js worker with the specified worker script URL
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js';

// Event listener for window load
window.onload = () => {
    fetchDocuments(); // Fetch the list of documents from the backend
    setupEventListeners();
};
