-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna type a canvases
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS type text DEFAULT 'home' NOT NULL;

-- 2. Índice único por usuario+tipo (un canvas home y un canvas space por usuario)
CREATE UNIQUE INDEX IF NOT EXISTS canvases_user_type_idx ON canvases(user_id, type);

-- 3. Tabla de mensajes anónimos
CREATE TABLE IF NOT EXISTS anonymous_messages (
  id         uuid primary key default gen_random_uuid(),
  to_user_id uuid references auth.users(id) on delete cascade,
  message    text not null,
  created_at timestamptz default now()
);

-- 4. Row Level Security
ALTER TABLE anonymous_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario lee sus mensajes"
  ON anonymous_messages FOR SELECT
  USING (auth.uid() = to_user_id);

CREATE POLICY "Cualquiera puede escribir"
  ON anonymous_messages FOR INSERT
  WITH CHECK (true);
