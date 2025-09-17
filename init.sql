-- Création de la table stations (déjà fait dans ton init.sql actuel)
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    line TEXT NOT NULL
);

INSERT INTO stations (name, line) VALUES
  ('Chatelet', 'M1'),
  ('Bastille', 'M1'),
  ('Nation', 'M1');

-- Création de la table config
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- Données globales
INSERT INTO config (key, value) VALUES
  ('metro.defaults', '{"line": "M1", "tz": "Europe/Paris"}'),
  ('metro.last', '{
    "Chatelet": "01:05",
    "Bastille": "01:10",
    "Nation": "01:15"
  }');
