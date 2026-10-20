# Gestion de stock

Application web simple de **gestion de stock** (CRUD complet) en PHP + JavaScript vanille.

## Fonctionnalités

- Ajout, modification, suppression de produits
- Recherche en temps réel
- Quantités en unités, support des lots (casiers, packs…)
- Calcul automatique :
  - Coût unitaire
  - Bénéfice par unité / potentiel / réalisé
  - Valeur du stock
- Alerte visuelle quand le reste est faible (seuil configurable)
- Export PDF de l’état du stock (jsPDF + AutoTable)
- Interface claire et responsive

## Prérequis

- PHP 8.0+ (avec extension PDO MySQL)
- MySQL / MariaDB
- Serveur web (Apache, Nginx, ou `php -S` en local)

## Installation

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/bosseck/gestion-stock.git
   cd gestion-stock
   ```

2. Créez la base de données :
   - Importez `database.sql` dans phpMyAdmin **ou**
   - Exécutez-le via la ligne de commande MySQL.

3. Configurez la connexion :
   ```bash
   cp config.example.php config.php
   ```
   Éditez `config.php` avec vos identifiants MySQL.

4. (Optionnel) Si vous aviez déjà une ancienne base sans la colonne `unites_par_lot`, exécutez `migration.sql` **une seule fois**.

5. Placez le dossier sur votre serveur web (ou lancez) :
   ```bash
   php -S localhost:8000
   ```
   Ouvrez http://localhost:8000

## Structure

```
├── index.html          # Interface
├── style.css           # Styles
├── app.js              # Logique frontend + export PDF
├── api.php             # API REST (GET/POST/PUT/DELETE)
├── config.example.php  # Exemple de configuration BDD
├── database.sql        # Création de la base + données de démo
└── migration.sql       # Migration pour anciennes bases
```

Les bibliothèques PDF (jsPDF) sont chargées depuis un CDN dans `index.html`.

## Devise et seuil d’alerte

Dans `app.js` :
```js
const DEVISE = 'FCFA';   // changez en '€', 'USD', etc.
const SEUIL_ALERTE = 5;  // reste en dessous duquel la ligne est rouge
```

## Licence

Libre d’utilisation.
