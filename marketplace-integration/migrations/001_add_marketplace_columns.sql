-- Marketplace entegrasyon kolonları
-- Orders tablosuna marketplace kaynak bilgisi eklenir.
-- Elle girilen siparişler 'MANUAL', marketplace'ten gelenler ilgili marketplace adıyla kaydedilir.

ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS marketplace_order_id text,
  ADD COLUMN IF NOT EXISTS marketplace_data jsonb;

-- Mevcut kayıtları MANUAL olarak işaretle
UPDATE orders SET source = 'MANUAL' WHERE source IS NULL;

-- Index: marketplace_order_id ile hızlı arama
CREATE INDEX IF NOT EXISTS idx_orders_marketplace_order_id ON orders (marketplace_order_id) WHERE marketplace_order_id IS NOT NULL;

-- Index: source ile filtreleme
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders (source);
