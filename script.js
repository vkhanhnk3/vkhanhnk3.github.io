document.addEventListener('DOMContentLoaded', () => {
    // State
    let allCountries = [];
    let selectedCountries = new Set();
    let availableFields = [];
    let selectedFields = new Set();
    
    // DOM Elements
    const fieldsContainer = document.getElementById('fields-container');
    const countriesContainer = document.getElementById('countries-list');
    const searchInput = document.getElementById('country-search');
    const selectedCountLabel = document.getElementById('selected-count');
    const jsonPreview = document.getElementById('json-preview');
    const fileSizeLabel = document.getElementById('size-value');
    const btnDownload = document.getElementById('btn-download');
    
    // Select buttons
    const btnSelectAllFields = document.getElementById('btn-select-all');
    const btnDeselectAllFields = document.getElementById('btn-deselect-all');
    const btnSelectAllCountries = document.getElementById('btn-select-all-countries');
    const btnDeselectAllCountries = document.getElementById('btn-deselect-all-countries');

    // Fetch Data
    fetch('info_countries.json')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load data');
            return response.json();
        })
        .then(data => {
            allCountries = data;
            initialize(data);
        })
        .catch(err => {
            console.error(err);
            jsonPreview.textContent = '// Error loading info_countries.json.\n// Make sure the file exists in the same directory.';
            fieldsContainer.innerHTML = '<div class="error">Error loading data</div>';
        });

    function initialize(data) {
        if (!data || data.length === 0) return;

        // 1. Extract Fields from first item
        const firstItem = data[0];
        availableFields = Object.keys(firstItem);
        
        // Default: select all fields except maybe extremely large ones if we wanted logic, 
        // but for now select all.
        availableFields.forEach(f => selectedFields.add(f));

        // 2. Select all countries by default
        data.forEach(c => selectedCountries.add(c.id));

        renderFields();
        renderCountries(data);
        updatePreview();
    }

    // --- Rendering ---

    function renderFields() {
        fieldsContainer.innerHTML = '';
        availableFields.forEach(field => {
            const div = document.createElement('div');
            div.className = 'checkbox-label';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `field-${field}`;
            checkbox.checked = selectedFields.has(field);
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) selectedFields.add(field);
                else selectedFields.delete(field);
                updatePreview();
            });
            
            const label = document.createElement('label');
            label.htmlFor = `field-${field}`;
            label.textContent = field.charAt(0).toUpperCase() + field.slice(1);
            
            div.appendChild(checkbox);
            div.appendChild(label);
            fieldsContainer.appendChild(div);
        });
    }

    function renderCountries(countries) {
        countriesContainer.innerHTML = '';
        
        // Virtual scrolling or just limiting if huge? 
        // For ~250 items, DOM is fine.
        
        countries.forEach(country => {
            const div = document.createElement('div');
            div.className = 'country-item checkbox-label';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `country-${country.id}`;
            checkbox.checked = selectedCountries.has(country.id);
            checkbox.dataset.id = country.id;
            
            checkbox.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                if (e.target.checked) selectedCountries.add(id);
                else selectedCountries.delete(id);
                
                updateSelectedCount();
                updatePreview();
            });
            
            const label = document.createElement('label');
            label.htmlFor = `country-${country.id}`;
            label.style.cursor = 'pointer';
            label.style.flex = '1';

            // Display flag emoji if available, otherwise just name
            const flag = country.emoji ? `<span style="margin-right:8px">${country.emoji}</span>` : '';
            label.innerHTML = `${flag}${country.name}`;
            
            div.appendChild(checkbox);
            div.appendChild(label);
            countriesContainer.appendChild(div);
        });
        
        updateSelectedCount();
    }

    // --- Updates ---

    function updateSelectedCount() {
        selectedCountLabel.textContent = `${selectedCountries.size} selected`;
    }

    function updatePreview() {
        // Filter countries
        const fileData = allCountries
            .filter(c => selectedCountries.has(c.id))
            .map(c => {
                // Filter fields
                const newObj = {};
                selectedFields.forEach(field => {
                    if (c.hasOwnProperty(field)) {
                        newObj[field] = c[field];
                    }
                });
                return newObj;
            });

        // Generate JSON string
        const jsonStr = JSON.stringify(fileData, null, 4);
        
        // Update size estimate
        const sizeInBytes = new Blob([jsonStr]).size;
        fileSizeLabel.textContent = formatBytes(sizeInBytes);

        // Update Preview Window (First 3 items only)
        const previewData = fileData.slice(0, 3);
        let previewStr = JSON.stringify(previewData, null, 4);
        
        // Add ellipsis if more data
        if (fileData.length > 3) {
            previewStr = previewStr.replace(/]$/, '    ...\n]'); 
        }
        
        jsonPreview.textContent = previewStr;
        
        // Disable download if empty
        if (fileData.length === 0 || selectedFields.size === 0) {
            btnDownload.classList.add('disabled');
            btnDownload.style.opacity = '0.5';
            btnDownload.style.pointerEvents = 'none';
        } else {
            btnDownload.classList.remove('disabled');
            btnDownload.style.opacity = '1';
            btnDownload.style.pointerEvents = 'auto';
        }
        
        // Store current full JSON for download
        window.currentJSON = jsonStr;
    }

    // --- Search ---
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const countryItems = countriesContainer.querySelectorAll('.country-item');
        
        countryItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(term)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // --- Bulk Actions ---
    
    // Fields
    btnSelectAllFields.addEventListener('click', () => {
        availableFields.forEach(f => selectedFields.add(f));
        renderFields();
        updatePreview();
    });

    btnDeselectAllFields.addEventListener('click', () => {
        selectedFields.clear();
        renderFields();
        updatePreview();
    });

    // Countries
    btnSelectAllCountries.addEventListener('click', () => {
        allCountries.forEach(c => selectedCountries.add(c.id));
        // Update UI checkboxes
        document.querySelectorAll('#countries-list input[type="checkbox"]').forEach(cb => cb.checked = true);
        updateSelectedCount();
        updatePreview();
    });

    btnDeselectAllCountries.addEventListener('click', () => {
        selectedCountries.clear();
        document.querySelectorAll('#countries-list input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateSelectedCount();
        updatePreview();
    });

    // --- Download ---
    btnDownload.addEventListener('click', () => {
        if (!window.currentJSON) return;
        
        const blob = new Blob([window.currentJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'custom_countries.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }
});
