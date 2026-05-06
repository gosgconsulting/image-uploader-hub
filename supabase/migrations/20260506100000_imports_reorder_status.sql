-- Track the variant-aware reorder phase that runs after each shopify_imports finishes
-- uploading. Surfaces in the UI as a checklist step so users can see that even when
-- every image was skipped (filename dedup), the variant-color reorder still ran.

ALTER TABLE shopify_imports
  ADD COLUMN IF NOT EXISTS reorder_status TEXT
    CHECK (reorder_status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS reorder_summary JSONB,
  ADD COLUMN IF NOT EXISTS reorder_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reorder_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN shopify_imports.reorder_status IS
  'Lifecycle of the auto-fired variant-color reorder: pending → running → completed/failed/skipped';
COMMENT ON COLUMN shopify_imports.reorder_summary IS
  'Counts emitted by the reorder run: { processed, moved, variants_pinned, failed, errors[] }';
