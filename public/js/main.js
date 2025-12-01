document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('uploadForm');
  const msg = document.getElementById('msg');
  const itemsContainer = document.getElementById('itemsContainer');
  const filterType = document.getElementById('filterType');
  const search = document.getElementById('search');

  // Handle form submission (form.html)
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (msg) msg.innerHTML = '';
      const formData = new FormData(uploadForm);

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        uploadForm.reset();
        showMessage('Item reported successfully!', 'success');
      } catch (err) {
        showMessage(err.message || 'Error uploading', 'danger');
      }
    });
  }

  function showMessage(text, type = 'info') {
    if (!msg) return;
    msg.innerHTML = `<div class="alert alert-${type} py-1">${text}</div>`;
    setTimeout(() => (msg.innerHTML = ''), 4000);
  }

  // Load items (items.html)
  async function loadItems() {
    if (!itemsContainer) return; // only run on items.html
    try {
      const res = await fetch('/api/items');
      const items = await res.json();
      renderItems(items);
    } catch {
      itemsContainer.innerHTML = '<p class="text-danger">Cannot load items</p>';
    }
  }

  function renderItems(items) {
    const tfilter = filterType ? filterType.value : 'all';
    const q = (search ? search.value : '').toLowerCase().trim();

    const filtered = items.filter((i) => {
      if (tfilter !== 'all' && i.type !== tfilter) return false;
      if (!q) return true;
      return (i.description + ' ' + i.location + ' ' + i.itemName + ' ' + i.name)
        .toLowerCase()
        .includes(q);
    });

    if (!filtered.length) {
      itemsContainer.innerHTML = '<p class="text-muted">No items found.</p>';
      return;
    }

    itemsContainer.innerHTML = filtered.map(itemCardHTML).join('');

    // Modal open on card click
    document.querySelectorAll('.item-card').forEach((card) => {
      card.addEventListener('click', () => showItemModal(card.dataset.id));
    });
  }

  function itemCardHTML(it) {
    const reportedDate = new Date(it.createdAt).toLocaleString();
    // Use <img> directly to guarantee the image shows; cap the height to keep cards reasonable
    const imgBlock = it.image
      ? `<img src="${it.image}" alt="item image" class="w-100"
               style="max-height:180px; object-fit:contain; display:block;">`
      : '';

    return `
      <div class="col-md-6">
        <div class="card shadow-sm h-100 item-card" data-id="${it.id}" style="cursor:pointer;">
          ${imgBlock}
          <div class="card-body">
            <h6 class="card-title mb-1">${escapeHtml(it.itemName || it.description || 'No description')}</h6>
            <p class="mb-1"><strong>Location found:</strong> ${escapeHtml(it.location || '')}</p>
            <p class="text-muted mb-0"><small>Reported: ${reportedDate}</small></p>
          </div>
        </div>
      </div>
    `;
  }

  async function showItemModal(id) {
    try {
      const res = await fetch('/api/items');
      const items = await res.json();
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const reportedDate = new Date(item.createdAt).toLocaleString();

      document.getElementById('itemModalBody').innerHTML = `
        ${item.image ? `<img src="${item.image}" class="img-fluid mb-3" alt="item image">` : ''}
        <p><strong>Item:</strong> ${escapeHtml(item.itemName || '')}</p>
        <p><strong>Description:</strong> ${escapeHtml(item.description || '')}</p>
        <p><strong>Location found:</strong> ${escapeHtml(item.location || '')}</p>
        <p><strong>Finder:</strong> ${escapeHtml(item.name || '')} (${escapeHtml(item.email || '')})</p>
        <p class="text-muted"><small>Reported: ${reportedDate}</small></p>
      `;

      new bootstrap.Modal(document.getElementById('itemModal')).show();
    } catch (err) {
      console.error('Modal error:', err);
    }
  }

  function escapeHtml(s = '') {
    return (s + '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  if (filterType) filterType.addEventListener('change', loadItems);
  if (search) search.addEventListener('input', loadItems);

  loadItems();
});