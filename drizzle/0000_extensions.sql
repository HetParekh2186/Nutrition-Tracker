-- Extensions live in the "extensions" schema, which is on the search path.
create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;
