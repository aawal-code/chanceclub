#!/bin/sh
set -e
cd /var/www/html
PORT="${PORT:-10000}"
sed -i "s/^Listen .*/Listen 8080/" /etc/apache2/ports.conf
sed -i "s/\*:80>/\*:8080>/" /etc/apache2/sites-available/000-default.conf
php artisan package:discover --ansi
php artisan config:cache
php artisan migrate --force
# Node gateway owns the public port: /ws -> WebSockets, everything else -> Apache/Laravel on 8080
export PORT UPSTREAM_PORT=8080 SPAWN_APACHE=1
exec node /opt/ws/server.js
