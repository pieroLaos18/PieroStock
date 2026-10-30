-- Ejecutar una vez en bases ya existentes antes de desplegar esta version.
-- Las instalaciones nuevas ya incluyen esta columna en schema.sql.
ALTER TABLE users
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER verificado;
