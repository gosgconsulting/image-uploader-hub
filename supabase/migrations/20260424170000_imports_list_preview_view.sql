-- List view: full import row + image_count + first 3 images as JSON (avoids loading every image URL on the hub list page).
CREATE OR REPLACE VIEW public.imports_with_list_preview
WITH (security_invoker = true) AS
SELECT
  i.id,
  i.brand_id,
  i.batch_name,
  i.status,
  i.webhook_url,
  i.created_at,
  i.updated_at,
  (
    SELECT COUNT(*)::bigint
    FROM public.import_images ii
    WHERE ii.import_id = i.id
  ) AS image_count,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', x.id,
          'file_name', x.file_name,
          'file_url', x.file_url
        )
        ORDER BY x.ord_created, x.ord_id
      )
      FROM (
        SELECT
          ii2.id,
          ii2.file_name,
          ii2.file_url,
          ii2.created_at AS ord_created,
          ii2.id AS ord_id
        FROM public.import_images ii2
        WHERE ii2.import_id = i.id
        ORDER BY ii2.created_at ASC, ii2.id ASC
        LIMIT 3
      ) x
    ),
    '[]'::jsonb
  ) AS preview_images
FROM public.imports i;

GRANT SELECT ON public.imports_with_list_preview TO authenticated;
