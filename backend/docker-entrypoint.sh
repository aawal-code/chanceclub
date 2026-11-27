#!/bin/sh
set -e
cd /var/www/html
PORT="${PORT:-10000}"
sed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/\*:80>/\*:${PORT}>/" /etc/apache2/sites-available/000-default.conf
php artisan package:discover --ansi
php artisan config:cache
php artisan migrate --force
exec apache2-foreground
