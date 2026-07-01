// ── LOOKUP.JS — License Lookup Module ──
// Depends on: state.js, invoice.js, polling.js

function lookupLicense() {
    const keyInput = document.getElementById('licenseSearchInput');
    const key = keyInput ? keyInput.value.trim() : '';
    
    if (!key) {
        alert('Silakan masukkan Kunci Lisensi Anda terlebih dahulu.');
        return;
    }
    
    keyInput.disabled = true;
    
    fetch(`${API_BASE}/api/license/my-invoices/${key}`)
        .then(res => res.json())
        .then(res => {
            keyInput.disabled = false;
            
            if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                const inv = res.data[0];
                
                let parsedInstructions = [];
                if (inv.payment_instructions) {
                    try {
                        parsedInstructions = typeof inv.payment_instructions === 'string' 
                            ? JSON.parse(inv.payment_instructions) 
                            : inv.payment_instructions;
                    } catch (e) {
                        console.error('Failed to parse instructions:', e);
                    }
                }
                
                const dataForRender = {
                    license_key: key,
                    invoice_number: inv.invoice_number,
                    amount: inv.amount,
                    payment_method: inv.payment_method.replace(' VA', 'VA').replace('QRIS', 'QRIS2'),
                    qr_url: inv.qr_url,
                    pay_code: inv.pay_code,
                    payment_instructions: parsedInstructions,
                    expired_time: inv.expired_time
                };
                
                if (inv.status === 'paid') {
                    showSuccessStep(key, inv.school_name, inv.requested_slug);
                    checkoutModal.classList.add('active');
                } else {
                    renderInvoiceDetails(dataForRender, inv.school_name);
                    checkoutModal.classList.add('active');
                }
            } else {
                alert('Kunci Lisensi tidak ditemukan atau belum memiliki riwayat invoice.');
            }
        })
        .catch(err => {
            keyInput.disabled = false;
            console.error(err);
            alert('Gagal menghubungi server. Silakan coba beberapa saat lagi.');
        });
}
