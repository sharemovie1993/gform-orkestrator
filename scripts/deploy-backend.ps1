# deploy-backend.ps1
# Upload license-server routes ke VPS dan restart PM2

$ErrorActionPreference = "Stop"
$VPS_IP = "103.129.148.127"
$VPS_USER = "asepsuryadi"
$PEM_KEY = "nginxonly.pem"
$REMOTE_BASE = "/var/www/licensing-server"

Write-Host "[BACKEND] Memulai Deploy License-Server ke VPS..." -ForegroundColor Cyan

# 1. Upload routes/license.js
Write-Host "[BACKEND] Upload routes/license.js..." -ForegroundColor Yellow
scp -i $PEM_KEY -o StrictHostKeyChecking=no `
    "license-server\routes\license.js" `
    "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/license.js.tmp"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Upload gagal!" -ForegroundColor Red; exit 1 }

# Pindah ke lokasi sebenarnya sebagai root
ssh -i $PEM_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" `
    "sudo mv /home/${VPS_USER}/license.js.tmp ${REMOTE_BASE}/routes/license.js && sudo chown root:root ${REMOTE_BASE}/routes/license.js"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Gagal memindahkan file!" -ForegroundColor Red; exit 1 }
Write-Host "[BACKEND] routes/license.js berhasil diunggah!" -ForegroundColor Green

# 2. Upload routes/admin.js
Write-Host "[BACKEND] Upload routes/admin.js..." -ForegroundColor Yellow
scp -i $PEM_KEY -o StrictHostKeyChecking=no `
    "license-server\routes\admin.js" `
    "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/admin.js.tmp"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Upload admin.js gagal!" -ForegroundColor Red; exit 1 }
ssh -i $PEM_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" `
    "sudo mv /home/${VPS_USER}/admin.js.tmp ${REMOTE_BASE}/routes/admin.js && sudo chown root:root ${REMOTE_BASE}/routes/admin.js"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Gagal memindahkan admin.js!" -ForegroundColor Red; exit 1 }
Write-Host "[BACKEND] routes/admin.js berhasil diunggah!" -ForegroundColor Green

# 3. Upload server.js
Write-Host "[BACKEND] Upload server.js..." -ForegroundColor Yellow
scp -i $PEM_KEY -o StrictHostKeyChecking=no `
    "license-server\server.js" `
    "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/server.js.tmp"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Upload server.js gagal!" -ForegroundColor Red; exit 1 }
ssh -i $PEM_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" `
    "sudo mv /home/${VPS_USER}/server.js.tmp ${REMOTE_BASE}/server.js && sudo chown root:root ${REMOTE_BASE}/server.js"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Gagal memindahkan server.js!" -ForegroundColor Red; exit 1 }
Write-Host "[BACKEND] server.js berhasil diunggah!" -ForegroundColor Green

# 4. Sync .env ke VPS
Write-Host "[BACKEND] Upload .env ke VPS..." -ForegroundColor Yellow
scp -i $PEM_KEY -o StrictHostKeyChecking=no `
    "license-server\.env" `
    "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/.env.tmp"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Upload .env gagal!" -ForegroundColor Red; exit 1 }
ssh -i $PEM_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" `
    "sudo mv /home/${VPS_USER}/.env.tmp ${REMOTE_BASE}/.env && sudo chown root:root ${REMOTE_BASE}/.env"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Gagal memindahkan .env!" -ForegroundColor Red; exit 1 }
Write-Host "[BACKEND] .env berhasil disinkronkan!" -ForegroundColor Green

# 5. Upload config/db.js (berisi seeding produk Mustahiq Care & pricing plans)
Write-Host "[BACKEND] Upload config/db.js..." -ForegroundColor Yellow
scp -i $PEM_KEY -o StrictHostKeyChecking=no `
    "license-server\config\db.js" `
    "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/db.js.tmp"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Upload config/db.js gagal!" -ForegroundColor Red; exit 1 }
ssh -i $PEM_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" `
    "sudo mv /home/${VPS_USER}/db.js.tmp ${REMOTE_BASE}/config/db.js && sudo chown root:root ${REMOTE_BASE}/config/db.js"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Gagal memindahkan config/db.js!" -ForegroundColor Red; exit 1 }
Write-Host "[BACKEND] config/db.js berhasil diunggah!" -ForegroundColor Green

# 6. Upload public/admin.html (UI dashboard terbaru dengan Mustahiq Care)
Write-Host "[BACKEND] Upload public/admin.html..." -ForegroundColor Yellow
scp -i $PEM_KEY -o StrictHostKeyChecking=no `
    "license-server\public\admin.html" `
    "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/admin.html.tmp"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Upload admin.html gagal!" -ForegroundColor Red; exit 1 }
ssh -i $PEM_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" `
    "sudo mv /home/${VPS_USER}/admin.html.tmp ${REMOTE_BASE}/public/admin.html && sudo chown root:root ${REMOTE_BASE}/public/admin.html"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Gagal memindahkan admin.html!" -ForegroundColor Red; exit 1 }
Write-Host "[BACKEND] public/admin.html berhasil diunggah!" -ForegroundColor Green

# 6b. Upload views/invoice-template.js (Template invoice dinamis)
Write-Host "[BACKEND] Upload views/invoice-template.js..." -ForegroundColor Yellow
scp -i $PEM_KEY -o StrictHostKeyChecking=no `
    "license-server\views\invoice-template.js" `
    "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/invoice-template.js.tmp"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Upload invoice-template.js gagal!" -ForegroundColor Red; exit 1 }
ssh -i $PEM_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" `
    "sudo mv /home/${VPS_USER}/invoice-template.js.tmp ${REMOTE_BASE}/views/invoice-template.js && sudo chown root:root ${REMOTE_BASE}/views/invoice-template.js"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Gagal memindahkan views/invoice-template.js!" -ForegroundColor Red; exit 1 }
Write-Host "[BACKEND] views/invoice-template.js berhasil diunggah!" -ForegroundColor Green

# 6c. Upload public/modules/admin-render.js (Render UI Dashboard terbaru dengan VPN info)
Write-Host "[BACKEND] Upload public/modules/admin-render.js..." -ForegroundColor Yellow
scp -i $PEM_KEY -o StrictHostKeyChecking=no `
    "license-server\public\modules\admin-render.js" `
    "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/admin-render.js.tmp"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Upload admin-render.js gagal!" -ForegroundColor Red; exit 1 }
ssh -i $PEM_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" `
    "sudo mv /home/${VPS_USER}/admin-render.js.tmp ${REMOTE_BASE}/public/modules/admin-render.js && sudo chown root:root ${REMOTE_BASE}/public/modules/admin-render.js"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Gagal memindahkan admin-render.js!" -ForegroundColor Red; exit 1 }
Write-Host "[BACKEND] public/modules/admin-render.js berhasil diunggah!" -ForegroundColor Green

# 6d. Upload public/admin.js (UI Logic Utama Admin)
Write-Host "[BACKEND] Upload public/admin.js..." -ForegroundColor Yellow
scp -i $PEM_KEY -o StrictHostKeyChecking=no `
    "license-server\public\admin.js" `
    "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/admin.js.tmp"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Upload admin.js gagal!" -ForegroundColor Red; exit 1 }
ssh -i $PEM_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" `
    "sudo mv /home/${VPS_USER}/admin.js.tmp ${REMOTE_BASE}/public/admin.js && sudo chown root:root ${REMOTE_BASE}/public/admin.js"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Gagal memindahkan admin.js!" -ForegroundColor Red; exit 1 }
Write-Host "[BACKEND] public/admin.js berhasil diunggah!" -ForegroundColor Green

# 7. Restart PM2 service (nama: licensing-server, dijalankan sebagai root)
Write-Host "[BACKEND] Merestart PM2 licensing-server di VPS..." -ForegroundColor Yellow
ssh -i $PEM_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" `
    "sudo pm2 restart licensing-server --update-env && sudo pm2 save"
if ($LASTEXITCODE -ne 0) { Write-Host "[BACKEND] Restart PM2 gagal!" -ForegroundColor Red; exit 1 }
Write-Host "[BACKEND] PM2 licensing-server berhasil direstart!" -ForegroundColor Green

# 8. Konfigurasi Firewall Isolasi Klien VPN (Client-to-Client Isolation)
Write-Host "[BACKEND] Mengonfigurasi Aturan Isolasi Firewall VPN di VPS..." -ForegroundColor Yellow
ssh -i $PEM_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" `
    "sudo iptables -D FORWARD -i wg0 -o wg0 -m iprange --src-range 10.0.0.10-10.0.0.254 -j REJECT --reject-with icmp-port-unreachable 2>/dev/null; sudo iptables -D FORWARD -i wg0 -o wg0 -m iprange --dst-range 10.0.0.10-10.0.0.254 -j REJECT --reject-with icmp-port-unreachable 2>/dev/null; sudo iptables -A FORWARD -i wg0 -o wg0 -m iprange --src-range 10.0.0.10-10.0.0.254 -j REJECT --reject-with icmp-port-unreachable && sudo iptables -A FORWARD -i wg0 -o wg0 -m iprange --dst-range 10.0.0.10-10.0.0.254 -j REJECT --reject-with icmp-port-unreachable && if [ -d /etc/iptables ]; then sudo sh -c 'iptables-save > /etc/iptables/rules.v4'; fi"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[BACKEND] Warning: Gagal menerapkan konfigurasi iptables (mungkin modul iprange tidak didukung)." -ForegroundColor Yellow
} else {
    Write-Host "[BACKEND] Konfigurasi isolasi firewall VPN berhasil diterapkan!" -ForegroundColor Green
}

Write-Host "[BACKEND] DEPLOY BACKEND BERHASIL & LIVE!" -ForegroundColor Green
Write-Host "[BACKEND] Test: curl https://api.absenta.id/admin" -ForegroundColor Cyan
Write-Host "[BACKEND] Produk Mustahiq Care (project-yatim) telah terdaftar di license server!" -ForegroundColor Green
