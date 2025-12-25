document.addEventListener('DOMContentLoaded', function() {
    renderDashboard();
    document.getElementById('current-date').textContent = new Date().toLocaleDateString();

    function renderDashboard() {
        const tableBody = document.getElementById('subs-table-body');
        const totalSpendEl = document.getElementById('total-spend');
        const activeSubsEl = document.getElementById('active-subs');

        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            const subs = data.subscriptions;
            tableBody.innerHTML = '';
            let total = 0;

            subs.forEach((sub, index) => {
                const row = document.createElement('tr');
                
                const trialBadge = sub.trialDays 
                    ? `<span class="badge badge-trial">⏳ ${sub.trialDays} Days</span>` 
                    : '<span style="color:#ccc">-</span>';

                row.innerHTML = `
                    <td style="font-weight:600;">${sub.service}</td>
                    <td>${sub.price}</td>
                    <td>${trialBadge}</td>
                    <td>${sub.date}</td>
                    <td>
                        ${sub.url ? `<a href="${sub.url}" target="_blank" class="btn-link">Visit site</a>` : ''}
                        <button class="btn-delete" data-index="${index}">Remove</button>
                    </td>
                `;
                tableBody.appendChild(row);

                const priceNum = parseFloat(sub.price.replace(/[^0-9.]/g, ''));
                if (!isNaN(priceNum)) total += priceNum;
            });

            totalSpendEl.textContent = `$${total.toFixed(2)}`;
            activeSubsEl.textContent = subs.length;

            // הוספת אירועי מחיקה
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.onclick = function() {
                    const idx = this.getAttribute('data-index');
                    deleteSubscription(idx);
                };
            });
        });
    }

    function deleteSubscription(index) {
        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            const newList = data.subscriptions.filter((_, i) => i !== parseInt(index));
            chrome.storage.local.set({ subscriptions: newList }, renderDashboard);
        });
    }
});