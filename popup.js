document.addEventListener('DOMContentLoaded', function() {
    const subList = document.getElementById('subList');
    const totalAmount = document.getElementById('totalAmount');
    const addBtn = document.getElementById('addBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const manualForm = document.getElementById('manualForm');
    const openDashBtn = document.getElementById('openDashboard');

    const openDash = () => chrome.runtime.sendMessage({ action: "openDashboard" });

    settingsBtn.addEventListener('click', openDash);
    openDashBtn.addEventListener('click', openDash);

    addBtn.addEventListener('click', () => {
        manualForm.style.display = manualForm.style.display === 'block' ? 'none' : 'block';
    });

    document.getElementById('saveManual').addEventListener('click', () => {
        const service = document.getElementById('nameIn').value;
        const price = document.getElementById('priceIn').value;
        const trialDays = document.getElementById('trialIn').value;

        if (service && price) {
            chrome.storage.local.get({ subscriptions: [] }, (data) => {
                const newList = [...data.subscriptions, { 
                    service, price, trialDays, date: new Date().toLocaleDateString(), url: '' 
                }];
                chrome.storage.local.set({ subscriptions: newList }, () => {
                    if (trialDays > 0) chrome.runtime.sendMessage({ action: "setAlarm", service, days: trialDays });
                    // איפוס שדות ורענון
                    document.getElementById('nameIn').value = '';
                    document.getElementById('priceIn').value = '';
                    document.getElementById('trialIn').value = '';
                    manualForm.style.display = 'none';
                    render();
                });
            });
        }
    });

    function render() {
        chrome.storage.local.get({ subscriptions: [] }, (data) => {
            let total = 0;
            subList.innerHTML = '';
            
            if (data.subscriptions.length === 0) {
                subList.innerHTML = '<p style="text-align:center; color:#94a3b8; font-size:12px;">No subscriptions yet.</p>';
                totalAmount.innerText = '$0.00';
                return;
            }

            data.subscriptions.forEach((sub, i) => {
                const div = document.createElement('div');
                div.className = 'sub-item';
                div.innerHTML = `
                    <div>
                        <div class="sub-name">${sub.service}</div>
                        <div class="sub-price">${sub.price}</div>
                    </div>
                    <button class="del-btn">Remove</button>
                `;
                subList.appendChild(div);

                div.querySelector('.del-btn').onclick = () => {
                    const newList = data.subscriptions.filter((_, index) => index !== i);
                    chrome.storage.local.set({ subscriptions: newList }, render);
                };

                const p = parseFloat(sub.price.replace(/[^0-9.]/g, ''));
                if (!isNaN(p)) total += p;
            });
            totalAmount.innerText = `$${total.toFixed(2)}`;
        });
    }

    render();
});