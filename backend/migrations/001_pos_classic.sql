-- 001_pos_classic.sql
-- Migración al modelo POS clásico: estados abierta/cerrada/cancelada, mesas, turnos,
-- configuración editable, notas rápidas, usuarios con login y permisos, sin emojis.
-- Se ejecuta con: node scripts/migrate.js   (dentro de una transacción; hace rollback si falla)

-- ─── 1. Estados de la orden ──────────────────────────────────────────
ALTER TABLE public.ordenes DROP CONSTRAINT IF EXISTS ordenes_estado_actual_check;

UPDATE public.ordenes SET estado_actual = CASE
  WHEN estado_actual IN ('cancelado', 'cancelada') THEN 'cancelada'
  WHEN metodo_pago IS NOT NULL THEN 'cerrada'
  ELSE 'abierta'
END;

UPDATE public.ordenes SET pending_payment = (estado_actual = 'abierta');

ALTER TABLE public.ordenes ADD CONSTRAINT ordenes_estado_actual_check
  CHECK (estado_actual IN ('abierta', 'cerrada', 'cancelada'));
ALTER TABLE public.ordenes ALTER COLUMN estado_actual SET DEFAULT 'abierta';

ALTER TABLE public.ordenes RENAME COLUMN fecha_entrega TO fecha_cierre;

-- 'mixto' = pagos divididos en varios métodos (detalle en tabla pagos)
ALTER TABLE public.ordenes DROP CONSTRAINT IF EXISTS ordenes_metodo_pago_check;
ALTER TABLE public.ordenes ADD CONSTRAINT ordenes_metodo_pago_check
  CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'mixto'));

-- ─── 2. Columnas nuevas en ordenes ───────────────────────────────────
ALTER TABLE public.ordenes ADD COLUMN IF NOT EXISTS mesa VARCHAR(20);
ALTER TABLE public.ordenes ADD COLUMN IF NOT EXISTS id_repartidor INT REFERENCES public.usuarios(id_usuario);
ALTER TABLE public.ordenes ADD COLUMN IF NOT EXISTS comanda_impresa_at TIMESTAMPTZ;
ALTER TABLE public.ordenes ADD COLUMN IF NOT EXISTS descuento_pct NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE public.ordenes ADD COLUMN IF NOT EXISTS clave_idempotencia VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ordenes_idempotencia
  ON public.ordenes (clave_idempotencia) WHERE clave_idempotencia IS NOT NULL;

-- Las órdenes existentes ya se "atendieron": no deben aparecer como pendientes en cocina
UPDATE public.ordenes SET comanda_impresa_at = fecha_creacion WHERE comanda_impresa_at IS NULL;

-- ─── 3. Folio sin condiciones de carrera ─────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.folio_seq;
SELECT setval('public.folio_seq', COALESCE(
  (SELECT MAX(CAST(SUBSTRING(folio FROM 2) AS INTEGER)) FROM public.ordenes WHERE folio ~ '^#[0-9]+$'),
  4000));

-- ─── 4. Menú sin emojis, con color y orden ───────────────────────────
ALTER TABLE public.productos DROP COLUMN IF EXISTS emoji;
ALTER TABLE public.paquetes DROP COLUMN IF EXISTS imagen;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS orden INT NOT NULL DEFAULT 0;
ALTER TABLE public.paquetes ADD COLUMN IF NOT EXISTS orden INT NOT NULL DEFAULT 0;
UPDATE public.productos SET orden = id_producto WHERE orden = 0;
UPDATE public.paquetes SET orden = id_paquete WHERE orden = 0;

ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#4B5563';
UPDATE public.categorias SET color = CASE LOWER(nombre)
  WHEN 'pizzas'   THEN '#B71C1C'
  WHEN 'snacks'   THEN '#E65100'
  WHEN 'bebidas'  THEN '#0D47A1'
  WHEN 'paquetes' THEN '#4A148C'
  ELSE color END;

-- ─── 5. Configuración editable por el admin ──────────────────────────
CREATE TABLE IF NOT EXISTS public.configuracion (
  clave VARCHAR(40) PRIMARY KEY,
  valor VARCHAR(200) NOT NULL
);
INSERT INTO public.configuracion (clave, valor) VALUES
  ('nombre_negocio', 'Pizzería Volcán'),
  ('iva_tasa', '0.16'),
  ('iva_incluido', 'true'),
  ('extra_chica', '-20'),
  ('extra_mediana', '0'),
  ('extra_grande', '30'),
  ('extra_delgada', '0'),
  ('extra_gruesa', '0'),
  ('extra_orilla_rellena', '20'),
  ('ticket_pie', 'Gracias por su preferencia')
ON CONFLICT (clave) DO NOTHING;

-- ─── 6. Mesas ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mesas (
  id_mesa SERIAL PRIMARY KEY,
  nombre VARCHAR(20) NOT NULL UNIQUE,
  orden INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO public.mesas (nombre, orden)
SELECT g::text, g FROM generate_series(1, 12) g
ON CONFLICT (nombre) DO NOTHING;

-- ─── 7. Notas rápidas para cocina ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notas_rapidas (
  id_nota SERIAL PRIMARY KEY,
  texto VARCHAR(60) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO public.notas_rapidas (texto, orden)
SELECT t, row_number() OVER ()
FROM unnest(ARRAY[
  'Sin cebolla', 'Sin jitomate', 'Extra queso', 'Poco queso', 'Bien cocida',
  'Sin picante', 'Extra picante', 'Aderezo aparte', 'Sin hielo', 'Cortada en cuadros', 'Sin orégano'
]) AS t
WHERE NOT EXISTS (SELECT 1 FROM public.notas_rapidas);

-- ─── 8. Turnos (corte de caja) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.turnos (
  id_turno SERIAL PRIMARY KEY,
  id_empleado INT NOT NULL REFERENCES public.usuarios(id_usuario),
  apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cierre TIMESTAMPTZ,
  fondo_inicial NUMERIC(10,2) NOT NULL DEFAULT 0,
  efectivo_contado NUMERIC(10,2),
  notas TEXT
);
ALTER TABLE public.ordenes ADD COLUMN IF NOT EXISTS id_turno INT REFERENCES public.turnos(id_turno);

-- ─── 9. Usuarios: login por usuario + contraseña, permisos editables ─
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS usuario VARCHAR(40);
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS permisos TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_usuario ON public.usuarios (LOWER(usuario));

UPDATE public.usuarios SET usuario = CASE id_usuario
  WHEN 1 THEN 'carlos' WHEN 2 THEN 'ana' WHEN 3 THEN 'miguel' WHEN 4 THEN 'juan' WHEN 5 THEN 'luis'
  ELSE 'usuario' || id_usuario END
WHERE usuario IS NULL;

UPDATE public.usuarios SET permisos = CASE rol
  WHEN 'admin'      THEN ARRAY['vender','cobrar','descuentos','cancelar','turnos','reportes','menu','usuarios','configuracion','cocina','entregas']
  WHEN 'cajero'     THEN ARRAY['vender','cobrar','descuentos','turnos']
  WHEN 'cocinero'   THEN ARRAY['cocina']
  WHEN 'repartidor' THEN ARRAY['entregas']
  ELSE ARRAY[]::TEXT[] END
WHERE cardinality(permisos) = 0;

-- ─── 10. Índices de rendimiento ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS ix_ordenes_fecha ON public.ordenes (fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS ix_ordenes_estado ON public.ordenes (estado_actual);
CREATE INDEX IF NOT EXISTS ix_detalle_orden ON public.orden_detalle (id_orden);
CREATE INDEX IF NOT EXISTS ix_pagos_orden ON public.pagos (id_orden);
CREATE INDEX IF NOT EXISTS ix_canc_orden ON public.cancelacionesauditoria (id_orden);

-- ─── 11. Vistas adaptadas al nuevo modelo ────────────────────────────
CREATE OR REPLACE VIEW public.v_ventas_dia AS
  SELECT date(fecha_creacion) AS dia, count(*) AS ordenes, sum(total) AS total_vendido
  FROM public.ordenes
  WHERE estado_actual = 'cerrada'
  GROUP BY date(fecha_creacion);

-- Tiempo desde que se creó la orden hasta que cocina imprimió la comanda
CREATE OR REPLACE VIEW public.v_tiempo_cocina AS
  SELECT o.id_orden, o.folio, (o.comanda_impresa_at - o.fecha_creacion) AS tiempo_cocina
  FROM public.ordenes o
  WHERE o.comanda_impresa_at IS NOT NULL;
