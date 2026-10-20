-- À exécuter UNE SEULE FOIS si vous avez déjà la base gestion_stock (sans perdre vos données)
USE gestion_stock;
ALTER TABLE produits
  ADD COLUMN unites_par_lot INT UNSIGNED NOT NULL DEFAULT 1 AFTER produit;
