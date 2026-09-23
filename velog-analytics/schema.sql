CREATE TABLE IF NOT EXISTS daily_regions (
  day TEXT NOT NULL,
  post TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (day, post, country, region, city)
);
