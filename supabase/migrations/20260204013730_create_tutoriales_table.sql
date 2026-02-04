/*
  # Create tutoriales table

  1. New Tables
    - `tutoriales`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key to empresas)
      - `categoria_id` (uuid, foreign key to categorias)
      - `titulo` (text)
      - `descripcion` (text)
      - `video_url` (text) - URL del video de tutorial
      - `tips` (text) - Consejos y buenas prácticas
      - `activo` (boolean) - Si el tutorial está activo
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `tutoriales` table
    - Add policies for authenticated users to manage tutorials
*/

CREATE TABLE IF NOT EXISTS tutoriales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  video_url text,
  tips text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tutoriales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tutorials"
  ON tutoriales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tutorials"
  ON tutoriales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tutorials"
  ON tutoriales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tutorials"
  ON tutoriales FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_tutoriales_empresa ON tutoriales(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tutoriales_categoria ON tutoriales(categoria_id);
