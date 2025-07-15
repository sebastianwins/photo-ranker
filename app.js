
async function loadMetadata() {
    const response = await fetch('metadata.json');
    return response.json();
}

function prettyLabel(key) {
    return key.trim().replace(/([a-z])([A-Z])/g, '$1 $2');
}

function prettyValue(val) {
    if (val === 1) return 'Yes';
    if (val === 0) return 'No';
    return val;
}

function createPhotoElement(filename, metadata) {
    const div = document.createElement('div');
    div.className = 'photo-card';
    div.setAttribute('data-filename', filename);

    const img = document.createElement('img');
    img.src = 'img/' + filename;
    img.alt = filename;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'metadata';

    for (const [key, value] of Object.entries(metadata)) {
        const p = document.createElement('p');
        p.textContent = `• ${prettyLabel(key)}: ${prettyValue(value)}`;
        metaDiv.appendChild(p);
    }

    div.appendChild(img);
    div.appendChild(metaDiv);
    return div;
}

function enableDragAndDrop(container) {
    let dragSrcEl = null;

    function handleDragStart(e) {
        dragSrcEl = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.outerHTML);
        this.classList.add('dragElem');
    }

    function handleDragOver(e) {
        e.preventDefault();
        this.classList.add('over');
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter() {
        this.classList.add('over');
    }

    function handleDragLeave() {
        this.classList.remove('over');
    }

    function handleDrop(e) {
        e.stopPropagation();
        if (dragSrcEl !== this) {
            dragSrcEl.outerHTML = this.outerHTML;
            this.outerHTML = e.dataTransfer.getData('text/html');
            addDnDHandlers(container.querySelectorAll('.photo-card'));
        }
        return false;
    }

    function handleDragEnd() {
        const items = container.querySelectorAll('.photo-card');
        items.forEach(item => item.classList.remove('over', 'dragElem'));
    }

    function addDnDHandlers(items) {
        items.forEach(item => {
            item.setAttribute('draggable', true);
            item.addEventListener('dragstart', handleDragStart, false);
            item.addEventListener('dragenter', handleDragEnter, false);
            item.addEventListener('dragover', handleDragOver, false);
            item.addEventListener('dragleave', handleDragLeave, false);
            item.addEventListener('drop', handleDrop, false);
            item.addEventListener('dragend', handleDragEnd, false);
        });
    }

    addDnDHandlers(container.querySelectorAll('.photo-card'));
}

function exportCSV(container) {
    const rows = [['Rank', 'Filename']];
    const cards = container.querySelectorAll('.photo-card');
    cards.forEach((card, i) => {
        rows.push([i + 1, card.getAttribute('data-filename')]);
    });

    const csvContent = rows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'photo_rankings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('photo-grid');
    const metadata = await loadMetadata();

    for (const filename in metadata) {
        const photoCard = createPhotoElement(filename, metadata[filename]);
        grid.appendChild(photoCard);
    }

    enableDragAndDrop(grid);

    document.getElementById('export-btn').addEventListener('click', () => {
        exportCSV(grid);
    });
});
