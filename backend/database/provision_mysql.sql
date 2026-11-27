-- Run only after inspecting phpMyAdmin and confirming `chance_club` does not already exist.
-- This creates an isolated schema and a least-scope app account; never use MySQL root in Laravel.
-- Replace the password below with a unique random value, then save the same value in backend/.env.
CREATE DATABASE `chance_club` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'chanceclub_app_8eb8ebf1'@'127.0.0.1' IDENTIFIED BY 'REPLACE_WITH_A_UNIQUE_RANDOM_PASSWORD';
GRANT ALL PRIVILEGES ON `chance_club`.* TO 'chanceclub_app_8eb8ebf1'@'127.0.0.1';
FLUSH PRIVILEGES;
