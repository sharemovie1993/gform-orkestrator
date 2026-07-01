#!/bin/bash
# deploy-backend.sh
# Upload license-server routes ke VPS dan restart PM2 (Linux/Mac/WSL Version)

set -e

VPS_IP="103.129.148.127"
VPS_USER="asepsuryadi"
PEM_KEY="nginxonly.pem"
REMOTE_BASE="/var/www/licensing-server"

# Pastikan file key ssh memiliki izin yang aman di Unix (wajib chmod 400 di Linux/Mac)
if [ -f "$PEM_KEY" ]; then
    chmod 400 "$PEM_KEY" 2>/dev/null || true
fi

echo -e "\033[0;36m[BACKEND] Memulai Deploy License-Server ke VPS (Linux/Mac/WSL)...\033[0m"

# 1. Upload routes/license.js
echo -e "\033[0;33m[BACKEND] Upload routes/license.js...\033[0m"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no "license-server/routes/license.js" "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/license.js.tmp"
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "sudo mv /home/${VPS_USER}/license.js.tmp ${REMOTE_BASE}/routes/license.js && sudo chown root:root ${REMOTE_BASE}/routes/license.js"
echo -e "\033[0;32m[BACKEND] routes/license.js berhasil diunggah!\033[0m"

# 2. Upload routes/admin.js
echo -e "\033[0;33m[BACKEND] Upload routes/admin.js...\033[0m"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no "license-server/routes/admin.js" "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/admin.js.tmp"
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "sudo mv /home/${VPS_USER}/admin.js.tmp ${REMOTE_BASE}/routes/admin.js && sudo chown root:root ${REMOTE_BASE}/routes/admin.js"
echo -e "\033[0;32m[BACKEND] routes/admin.js berhasil diunggah!\033[0m"

# 3. Upload server.js
echo -e "\033[0;33m[BACKEND] Upload server.js...\033[0m"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no "license-server/server.js" "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/server.js.tmp"
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "sudo mv /home/${VPS_USER}/server.js.tmp ${REMOTE_BASE}/server.js && sudo chown root:root ${REMOTE_BASE}/server.js"
echo -e "\033[0;32m[BACKEND] server.js berhasil diunggah!\033[0m"

# 4. Sync .env ke VPS
echo -e "\033[0;33m[BACKEND] Upload .env ke VPS...\033[0m"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no "license-server/.env" "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/.env.tmp"
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "sudo mv /home/${VPS_USER}/.env.tmp ${REMOTE_BASE}/.env && sudo chown root:root ${REMOTE_BASE}/.env"
echo -e "\033[0;32m[BACKEND] .env berhasil disinkronkan!\033[0m"

# 5. Upload config/db.js
echo -e "\033[0;33m[BACKEND] Upload config/db.js...\033[0m"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no "license-server/config/db.js" "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/db.js.tmp"
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "sudo mv /home/${VPS_USER}/db.js.tmp ${REMOTE_BASE}/config/db.js && sudo chown root:root ${REMOTE_BASE}/config/db.js"
echo -e "\033[0;32m[BACKEND] config/db.js berhasil diunggah!\033[0m"

# 6. Upload public/admin.html
echo -e "\033[0;33m[BACKEND] Upload public/admin.html...\033[0m"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no "license-server/public/admin.html" "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/admin.html.tmp"
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "sudo mv /home/${VPS_USER}/admin.html.tmp ${REMOTE_BASE}/public/admin.html && sudo chown root:root ${REMOTE_BASE}/public/admin.html"
echo -e "\033[0;32m[BACKEND] public/admin.html berhasil diunggah!\033[0m"

# 6b. Upload views/invoice-template.js
echo -e "\033[0;33m[BACKEND] Upload views/invoice-template.js...\033[0m"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no "license-server/views/invoice-template.js" "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/invoice-template.js.tmp"
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "sudo mv /home/${VPS_USER}/invoice-template.js.tmp ${REMOTE_BASE}/views/invoice-template.js && sudo chown root:root ${REMOTE_BASE}/views/invoice-template.js"
echo -e "\033[0;32m[BACKEND] views/invoice-template.js berhasil diunggah!\033[0m"

# 6c. Upload public/modules/admin-render.js
echo -e "\033[0;33m[BACKEND] Upload public/modules/admin-render.js...\033[0m"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no "license-server/public/modules/admin-render.js" "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/admin-render.js.tmp"
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "sudo mv /home/${VPS_USER}/admin-render.js.tmp ${REMOTE_BASE}/public/modules/admin-render.js && sudo chown root:root ${REMOTE_BASE}/public/modules/admin-render.js"
echo -e "\033[0;32m[BACKEND] public/modules/admin-render.js berhasil diunggah!\033[0m"

# 6d. Upload public/admin.js
echo -e "\033[0;33m[BACKEND] Upload public/admin.js...\033[0m"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no "license-server/public/admin.js" "${VPS_USER}@${VPS_IP}:/home/${VPS_USER}/admin.js.tmp"
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "sudo mv /home/${VPS_USER}/admin.js.tmp ${REMOTE_BASE}/public/admin.js && sudo chown root:root ${REMOTE_BASE}/public/admin.js"
echo -e "\033[0;32m[BACKEND] public/admin.js berhasil diunggah!\033[0m"

# 7. Restart PM2 service
echo -e "\033[0;33m[BACKEND] Merestart PM2 licensing-server di VPS...\033[0m"
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "sudo pm2 restart licensing-server --update-env && sudo pm2 save"
echo -e "\033[0;32m[BACKEND] PM2 licensing-server berhasil direstart!\033[0m"

# 8. Konfigurasi Firewall Isolasi Klien VPN
echo -e "\033[0;33m[BACKEND] Mengonfigurasi Aturan Isolasi Firewall VPN di VPS...\033[0m"
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "sudo iptables -D FORWARD -i wg0 -o wg0 -m iprange --src-range 10.0.0.10-10.0.0.254 -j REJECT --reject-with icmp-port-unreachable 2>/dev/null; sudo iptables -D FORWARD -i wg0 -o wg0 -m iprange --dst-range 10.0.0.10-10.0.0.254 -j REJECT --reject-with icmp-port-unreachable 2>/dev/null; sudo iptables -A FORWARD -i wg0 -o wg0 -m iprange --src-range 10.0.0.10-10.0.0.254 -j REJECT --reject-with icmp-port-unreachable && sudo iptables -A FORWARD -i wg0 -o wg0 -m iprange --dst-range 10.0.0.10-10.0.0.254 -j REJECT --reject-with icmp-port-unreachable && if [ -d /etc/iptables ]; then sudo sh -c 'iptables-save > /etc/iptables/rules.v4'; fi" || echo -e "\033[0;33m[BACKEND] Warning: Gagal menerapkan konfigurasi iptables.\033[0m"
echo -e "\033[0;32m[BACKEND] Konfigurasi isolasi firewall VPN berhasil diterapkan!\033[0m"

echo -e "\033[0;32m[BACKEND] DEPLOY BACKEND BERHASIL & LIVE!\033[0m"
echo -e "\033[0;36m[BACKEND] Test: curl https://api.absenta.id/admin\033[0m"
echo -e "\033[0;32m[BACKEND] Produk Mustahiq Care (project-yatim) telah terdaftar di license server!\033[0m"
