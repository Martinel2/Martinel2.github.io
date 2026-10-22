CREATE TABLE IF NOT EXISTS visits (
  time TEXT NOT NULL,
  post TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  kind TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS visits_time ON visits (time);
DROP TABLE IF EXISTS daily_regions;
