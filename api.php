<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/config.php';

function respond(int $code, array $data): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Valide et nettoie les données reçues. */
function clean(array $d): array {
    $produit = trim((string)($d['produit'] ?? ''));
    $lot     = filter_var($d['unites_par_lot'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $entree  = filter_var($d['quantite_entree'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
    $sortie  = filter_var($d['quantite_sortie'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
    $achat   = filter_var($d['prix_achat'] ?? null, FILTER_VALIDATE_FLOAT);
    $unit    = filter_var($d['prix_unitaire'] ?? null, FILTER_VALIDATE_FLOAT);

    if ($produit === '' || mb_strlen($produit) > 150) respond(422, ['error' => 'Le nom du produit est obligatoire (150 caractères max).']);
    if ($lot === false)                               respond(422, ['error' => 'Les unités par lot doivent être un entier supérieur ou égal à 1.']);
    if ($entree === false || $sortie === false)       respond(422, ['error' => 'Les quantités doivent être des entiers positifs.']);
    if ($achat === false || $unit === false || $achat < 0 || $unit < 0)
                                                      respond(422, ['error' => 'Les prix doivent être des nombres positifs.']);
    if ($sortie > $entree)                            respond(422, ['error' => 'La quantité sortie ne peut pas dépasser la quantité entrée.']);

    return [$produit, $lot, $entree, $sortie, $achat, $unit];
}

try {
    $pdo    = db();
    $method = $_SERVER['REQUEST_METHOD'];
    $body   = json_decode(file_get_contents('php://input') ?: '[]', true) ?? [];

    switch ($method) {
        case 'GET':
            $q = trim((string)($_GET['q'] ?? ''));
            $stmt = $pdo->prepare(
                'SELECT id, produit, unites_par_lot, quantite_entree, quantite_sortie, reste, prix_achat, prix_unitaire
                 FROM produits WHERE produit LIKE :q ORDER BY produit ASC'
            );
            $stmt->execute([':q' => "%$q%"]);
            respond(200, ['data' => $stmt->fetchAll()]);

        case 'POST':
            [$p, $l, $e, $s, $a, $u] = clean($body);
            $stmt = $pdo->prepare(
                'INSERT INTO produits (produit, unites_par_lot, quantite_entree, quantite_sortie, prix_achat, prix_unitaire)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$p, $l, $e, $s, $a, $u]);
            respond(201, ['id' => (int)$pdo->lastInsertId()]);

        case 'PUT':
            $id = (int)($body['id'] ?? 0);
            if ($id <= 0) respond(422, ['error' => 'Identifiant invalide.']);
            [$p, $l, $e, $s, $a, $u] = clean($body);
            $stmt = $pdo->prepare(
                'UPDATE produits SET produit = ?, unites_par_lot = ?, quantite_entree = ?, quantite_sortie = ?,
                 prix_achat = ?, prix_unitaire = ? WHERE id = ?'
            );
            $stmt->execute([$p, $l, $e, $s, $a, $u, $id]);
            respond(200, ['ok' => true]);

        case 'DELETE':
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) respond(422, ['error' => 'Identifiant invalide.']);
            $pdo->prepare('DELETE FROM produits WHERE id = ?')->execute([$id]);
            respond(200, ['ok' => true]);

        default:
            respond(405, ['error' => 'Méthode non autorisée.']);
    }
} catch (Throwable $e) {
    respond(500, ['error' => 'Erreur serveur : vérifiez la connexion à la base (config.php).']);
}
