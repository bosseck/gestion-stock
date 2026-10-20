<?php
/**
 * Copiez ce fichier en config.php et renseignez vos identifiants MySQL.
 * Ne commitez jamais config.php (mots de passe).
 */
declare(strict_types=1);

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $host = '127.0.0.1';
    $port = '3306';
    $dbname = 'gestion_stock';
    $user = 'root';
    $pass = ''; // ← votre mot de passe MySQL

    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}
