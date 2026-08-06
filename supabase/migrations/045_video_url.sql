-- fal.ai: vídeo gerado pro post de teste (Reels). Guardado junto do post.
alter table marketing_ai_test_content
  add column if not exists video_url text;
