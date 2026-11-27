FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader --no-scripts

FROM node:22-slim AS wsdeps
WORKDIR /ws
COPY ws/package.json ./
RUN npm install --omit=dev

FROM php:8.4-apache
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev libstdc++6 \
 && docker-php-ext-install pdo_pgsql \
 && a2enmod rewrite \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf
WORKDIR /var/www/html
COPY . .
COPY --from=vendor /app/vendor ./vendor
RUN mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache storage/logs bootstrap/cache \
 && chown -R www-data:www-data storage bootstrap/cache
COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=wsdeps /ws/node_modules /opt/ws/node_modules
COPY ws/server.js ws/words.js /opt/ws/
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 10000
ENTRYPOINT ["docker-entrypoint.sh"]
