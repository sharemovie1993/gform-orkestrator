#!/bin/bash
# add-wg-peer.sh
SCHOOL_NAME=$1
PUBLIC_KEY=$2
CLIENT_IP=$3
SLUG=$4
PORT=$5
DOMAIN="${SLUG}.absenta.id"

if [ -z "$PORT" ]; then
    PORT="5002"
fi

if [ -z "$SCHOOL_NAME" ] || [ -z "$PUBLIC_KEY" ] || [ -z "$CLIENT_IP" ] || [ -z "$SLUG" ]; then
    echo "Parameter tidak lengkap: school_name public_key client_ip slug"
    exit 1
fi

if grep -q "$PUBLIC_KEY" /etc/wireguard/wg0.conf 2>/dev/null; then
    echo "Peer dengan public key ini sudah ada."
else
    cat <<WGEOF >> /etc/wireguard/wg0.conf

# Tenant: $SCHOOL_NAME
[Peer]
PublicKey = $PUBLIC_KEY
AllowedIPs = $CLIENT_IP/32
WGEOF
fi

wg syncconf wg0 <(wg-quick strip wg0) 2>/dev/null || true

cat <<NGEOF > /etc/nginx/sites-available/$DOMAIN
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://$CLIENT_IP:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
    }
}
NGEOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Registrasi SSL/HTTPS via Certbot
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@absenta.id --redirect
