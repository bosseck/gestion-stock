-- Installation complète (nouvelle base) : importer ce fichier dans phpMyAdmin
CREATE DATABASE IF NOT EXISTS gestion_stock
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestion_stock;

CREATE TABLE IF NOT EXISTS produits (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  produit         VARCHAR(150) NOT NULL,
  -- Nombre d'unités vendues dans un lot (1 = vendu à la pièce)
  unites_par_lot  INT UNSIGNED NOT NULL DEFAULT 1,
  -- Les quantités sont comptées en UNITÉS (bouteilles, bonbons...)
  quantite_entree INT UNSIGNED NOT NULL DEFAULT 0,
  quantite_sortie INT UNSIGNED NOT NULL DEFAULT 0,
  reste           INT GENERATED ALWAYS AS (quantite_entree - quantite_sortie) STORED,
  -- Prix payé pour UN LOT entier (casier, pack...)
  prix_achat      DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Prix de vente d'UNE unité
  prix_unitaire   DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_produit (produit)
) ENGINE=InnoDB;

INSERT INTO produits (produit, unites_par_lot, quantite_entree, quantite_sortie, prix_achat, prix_unitaire) VALUES
  ('Bière (casier de 12)',   12, 48, 20, 7800, 700),
  ('Bonbons (pack de 25)',   25, 100, 62, 1500, 100),
  ('Clavier mécanique',       1, 40, 18, 12000, 18000),
  ('Câble HDMI 2 m',          1, 100, 72, 1200, 2500);
