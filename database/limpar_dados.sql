-- ============================================================
-- POKER SCHOOL — LIMPAR DADOS FICTÍCIOS
-- Execute no Supabase SQL Editor
-- ============================================================

-- PASSO 1: Descubra seu user_id
-- Execute esta query e copie o ID do seu usuário:
SELECT id, email, role FROM profiles ORDER BY created_at;

-- ============================================================
-- PASSO 2: Substitua 'SEU_USER_ID_AQUI' pelo ID encontrado acima
--          e execute os DELETE abaixo
-- ============================================================

-- Remove todas as sessões de poker (dados fictícios do seed)
DELETE FROM poker_sessions
WHERE user_id = 'SEU_USER_ID_AQUI';

-- Remove as notificações fictícias
DELETE FROM notifications
WHERE user_id = 'SEU_USER_ID_AQUI';

-- Remove o progresso fictício nas aulas
DELETE FROM lesson_progress
WHERE user_id = 'SEU_USER_ID_AQUI';

-- Remove sessões grind fictícias (se houver)
DELETE FROM grind_sessions
WHERE user_id = 'SEU_USER_ID_AQUI';

-- ============================================================
-- PASSO 3: Confirme que os dados foram removidos
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM poker_sessions WHERE user_id = 'SEU_USER_ID_AQUI') AS sessoes_restantes,
  (SELECT COUNT(*) FROM notifications WHERE user_id = 'SEU_USER_ID_AQUI') AS notificacoes_restantes,
  (SELECT COUNT(*) FROM lesson_progress WHERE user_id = 'SEU_USER_ID_AQUI') AS progresso_restante;

-- Todos os valores devem ser 0 após a limpeza.
