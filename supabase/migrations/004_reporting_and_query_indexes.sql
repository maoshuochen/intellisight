create index if not exists idx_reports_project_updated on public.reports(project_id, updated_at desc);
create index if not exists idx_annotation_codes_annotation on public.annotation_codes(annotation_id, code_id);
