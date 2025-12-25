document.addEventListener('DOMContentLoaded', function() {
  renderSubs();

  function renderSubs() {
    const subList = document.getElementById('subList');
    const totalAmount = document.getElementById('totalAmount');

    chrome.storage.local.get({ subscriptions: [] }, (data) => {
      if (data.subscriptions.length === 0) {
        subList.innerHTML = '<p class="empty">No subscriptions found.</p>';
        totalAmount.innerText = '';
        return;
      }

      let total = 0;
      subList.innerHTML = '';

      data.subscriptions.forEach((sub, index) => {
        const div = document.createElement('div');
        div.className = 'sub-item';
        div.innerHTML = `
          <div>
            <div style="font-weight: 600;">${sub.service}</div>
            <div style="font-size: 12px; color: #6b7280;">${sub.price} (${sub.date})</div>
          </div>
          <button class="delete-btn" data-index="${index}" style="background: #fee2e2; color: #ef4444; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer;">Delete</button>
        `;
        subList.appendChild(div);

        const numPrice = parseFloat(sub.price.replace(/[^0-9.]/g, ''));
        if (!isNaN(numPrice)) total += numPrice;
      });

      totalAmount.innerText = `Total Monthly: $${total.toFixed(2)}`;

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = function() {
          const idx = this.getAttribute('data-index');
          chrome.storage.local.get({ subscriptions: [] }, (data) => {
            const newList = data.subscriptions.filter((_, i) => i !== parseInt(idx));
            chrome.storage.local.set({ subscriptions: newList }, renderSubs);
          });
        };
      });
    });
  }
});