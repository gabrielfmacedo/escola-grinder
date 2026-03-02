-- ============================================================
-- POKER SCHOOL — SEED DATA
-- Execute DEPOIS do schema.sql
-- ============================================================

-- ── PLANOS (atualiza cakto_product_id depois) ────────────────
UPDATE plans SET price_cents = 0       WHERE type = 'basic';
UPDATE plans SET price_cents = 9700    WHERE type = 'pro';
UPDATE plans SET price_cents = 19700   WHERE type = 'elite';

-- ── CURSOS ───────────────────────────────────────────────────
INSERT INTO courses (id, title, slug, description, thumbnail_url, required_plan, is_published, order_index, instructor_id)
SELECT
  gen_random_uuid(),
  c.title, c.slug, c.description, c.thumb, c.plan::plan_type, true, c.ord,
  (SELECT id FROM profiles WHERE role IN ('admin','instructor') LIMIT 1)
FROM (VALUES
  (1, 'Fundamentos do Texas Hold''em',   'fundamentos-holdem',
   'Do zero ao sólido: aprenda as regras, posições, hand rankings e fundamentos da estratégia pré-flop.',
   NULL, 'basic'),
  (2, 'Estratégia de Torneios MTT',       'estrategia-mtt',
   'ICM, push/fold, bubble play, estratégias de final de torneio e construção de chip stack.',
   NULL, 'pro'),
  (3, 'Cash Game GTO — NL50 ao NL200',   'cash-game-gto',
   'Ranges balanceados, bet sizing, exploits e como montar um plano de jogo equilibrado.',
   NULL, 'pro'),
  (4, 'Mental Game & Bankroll Management','mental-game-banca',
   'Controle emocional, gestão de banca profissional, metas e como sustentar a carreira no longo prazo.',
   NULL, 'elite')
) AS c(ord, title, slug, description, thumb, plan);

-- ── MÓDULOS ─────────────────────────────────────────────────
DO $$
DECLARE
  cid UUID;
BEGIN

  -- Fundamentos
  SELECT id INTO cid FROM courses WHERE slug = 'fundamentos-holdem';
  INSERT INTO modules (course_id, title, order_index) VALUES
    (cid, 'Regras e Dinâmica de Jogo', 1),
    (cid, 'Fundamentos Pré-Flop',      2),
    (cid, 'Jogo Pós-Flop Básico',      3);

  -- Torneios MTT
  SELECT id INTO cid FROM courses WHERE slug = 'estrategia-mtt';
  INSERT INTO modules (course_id, title, order_index) VALUES
    (cid, 'Estrutura e Fundamentos de MTT', 1),
    (cid, 'ICM — Independent Chip Model',  2),
    (cid, 'Estratégias de Final de Torneio',3);

  -- Cash Game GTO
  SELECT id INTO cid FROM courses WHERE slug = 'cash-game-gto';
  INSERT INTO modules (course_id, title, order_index) VALUES
    (cid, 'Fundamentos GTO',          1),
    (cid, 'Ranges e Bet Sizing',      2),
    (cid, 'Exploits e Ajustes',       3);

  -- Mental Game
  SELECT id INTO cid FROM courses WHERE slug = 'mental-game-banca';
  INSERT INTO modules (course_id, title, order_index) VALUES
    (cid, 'Controle Emocional',       1),
    (cid, 'Gestão de Banca',          2);

END $$;

-- ── AULAS ────────────────────────────────────────────────────
DO $$
DECLARE
  mid UUID;
BEGIN

  -- Fundamentos > Regras e Dinâmica
  SELECT id INTO mid FROM modules WHERE title = 'Regras e Dinâmica de Jogo';
  INSERT INTO lessons (module_id, title, type, content_url, duration_minutes, order_index, is_free_preview) VALUES
    (mid, 'Como funciona uma mão de poker',    'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 18, 1, true),
    (mid, 'Posições na mesa e sua importância','video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 22, 2, false),
    (mid, 'Hand Rankings e Probabilidades',    'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 15, 3, true);

  -- Fundamentos > Pré-Flop
  SELECT id INTO mid FROM modules WHERE title = 'Fundamentos Pré-Flop';
  INSERT INTO lessons (module_id, title, type, content_url, duration_minutes, order_index) VALUES
    (mid, 'Opening Ranges por posição',         'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 28, 1),
    (mid, '3-bet e 4-bet: quando e por quê',   'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 32, 2),
    (mid, 'Como responder a opens e 3-bets',   'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 25, 3);

  -- Fundamentos > Pós-Flop
  SELECT id INTO mid FROM modules WHERE title = 'Jogo Pós-Flop Básico';
  INSERT INTO lessons (module_id, title, type, content_url, duration_minutes, order_index) VALUES
    (mid, 'C-bet: conceito e frequência',       'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 20, 1),
    (mid, 'Draws e como jogá-los',              'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 24, 2),
    (mid, 'Showdown vs. bluff: decisões básicas','video_youtube','https://www.youtube.com/watch?v=dQw4w9WgXcQ', 18, 3);

  -- MTT > Estrutura
  SELECT id INTO mid FROM modules WHERE title = 'Estrutura e Fundamentos de MTT';
  INSERT INTO lessons (module_id, title, type, content_url, duration_minutes, order_index, is_free_preview) VALUES
    (mid, 'Diferenças MTT vs Cash Game',        'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 20, 1, true),
    (mid, 'Early, Mid e Late Stage',            'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 26, 2, false),
    (mid, 'Gestão de Stack: M-ratio e big blinds','video_youtube','https://www.youtube.com/watch?v=dQw4w9WgXcQ', 22, 3, false);

  -- MTT > ICM
  SELECT id INTO mid FROM modules WHERE title = 'ICM — Independent Chip Model';
  INSERT INTO lessons (module_id, title, type, content_url, duration_minutes, order_index) VALUES
    (mid, 'O que é ICM e por que importa',      'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 30, 1),
    (mid, 'ICM na bolha: como ajustar',         'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 35, 2),
    (mid, 'Calculando ICM com ferramentas',     'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 28, 3);

  -- Cash GTO > Fundamentos
  SELECT id INTO mid FROM modules WHERE title = 'Fundamentos GTO';
  INSERT INTO lessons (module_id, title, type, content_url, duration_minutes, order_index, is_free_preview) VALUES
    (mid, 'O que é GTO e quando aplicar',       'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 25, 1, true),
    (mid, 'Equilíbrio de Nash aplicado ao poker','video_youtube','https://www.youtube.com/watch?v=dQw4w9WgXcQ', 38, 2, false);

  -- Mental > Controle Emocional
  SELECT id INTO mid FROM modules WHERE title = 'Controle Emocional';
  INSERT INTO lessons (module_id, title, type, content_url, duration_minutes, order_index, is_free_preview) VALUES
    (mid, 'Tilt: tipos e como identificar',     'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 20, 1, true),
    (mid, 'Técnicas para sair do tilt',         'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 24, 2, false),
    (mid, 'Rotina de estudo e performance',     'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 18, 3, false);

  -- Mental > Banca
  SELECT id INTO mid FROM modules WHERE title = 'Gestão de Banca';
  INSERT INTO lessons (module_id, title, type, content_url, duration_minutes, order_index) VALUES
    (mid, 'Regras de buy-in por stake',         'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 22, 1),
    (mid, 'Quando subir e descer de stake',     'video_youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 19, 2);

END $$;

-- ── TRILHAS ─────────────────────────────────────────────────
INSERT INTO learning_paths (id, title, slug, description, required_plan, is_published, order_index, created_by)
SELECT
  gen_random_uuid(),
  lp.title, lp.slug, lp.description, lp.plan::plan_type, true, lp.ord,
  (SELECT id FROM profiles WHERE role IN ('admin','instructor') LIMIT 1)
FROM (VALUES
  (1, 'Do Zero ao MTT Rentável', 'zero-ao-mtt',
   'Trilha completa para quem quer começar a jogar torneios com lucro consistente.',
   'pro'),
  (2, 'Carreira Profissional no Poker', 'carreira-profissional',
   'Tudo que você precisa para transformar o poker em profissão: técnica, mental e gestão.',
   'elite')
) AS lp(ord, title, slug, description, plan);

-- Associa cursos às trilhas
INSERT INTO learning_path_courses (learning_path_id, course_id, order_index)
SELECT lp.id, c.id, 1
FROM learning_paths lp, courses c
WHERE lp.slug = 'zero-ao-mtt' AND c.slug = 'fundamentos-holdem';

INSERT INTO learning_path_courses (learning_path_id, course_id, order_index)
SELECT lp.id, c.id, 2
FROM learning_paths lp, courses c
WHERE lp.slug = 'zero-ao-mtt' AND c.slug = 'estrategia-mtt';

INSERT INTO learning_path_courses (learning_path_id, course_id, order_index)
SELECT lp.id, c.id, 1
FROM learning_paths lp, courses c
WHERE lp.slug = 'carreira-profissional' AND c.slug = 'cash-game-gto';

INSERT INTO learning_path_courses (learning_path_id, course_id, order_index)
SELECT lp.id, c.id, 2
FROM learning_paths lp, courses c
WHERE lp.slug = 'carreira-profissional' AND c.slug = 'mental-game-banca';

-- ── TROFÉUS ─────────────────────────────────────────────────
INSERT INTO trophies (title, description, icon, condition_type, condition_value) VALUES
  ('Primeira Mão',      'Registrou sua primeira sessão',           '🃏', 'sessions_count',  1),
  ('10 Sessões',        'Registrou 10 sessões',                    '🎯', 'sessions_count',  10),
  ('50 Sessões',        'Registrou 50 sessões',                    '🔥', 'sessions_count',  50),
  ('Primeira Aula',     'Concluiu sua primeira aula',              '📚', 'lessons_count',   1),
  ('Estudante Dedicado','Concluiu 20 aulas',                       '🏆', 'lessons_count',   20),
  ('Primeiro Lucro',    'Atingiu lucro positivo',                  '💰', 'profit_milestone', 1),
  ('R$ 500 de Lucro',   'Acumulou R$ 500 de lucro',               '💎', 'profit_milestone', 50000),
  ('Volume Monster',    'Jogou mais de 100 horas',                 '⚡', 'hours_played',    100);
