// modal.js

/**
 * Displays a custom modal to get annotation details from the user.
 * @returns {Promise<Object|boolean>} - Resolves with annotation details or false if discarded.
 */
export function showAnnotationModal() {
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
