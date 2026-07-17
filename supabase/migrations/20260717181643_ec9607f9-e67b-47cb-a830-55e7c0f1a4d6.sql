
CREATE POLICY "docs bucket select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documentos');
CREATE POLICY "docs bucket insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "docs bucket update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documentos');
CREATE POLICY "docs bucket delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documentos');

-- Harden SECURITY DEFINER functions: they only need to be called from within
-- other SQL/policies, not directly by end users.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.obra_cria_centro_custo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cotacao_marca_sc_em_cotacao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.oc_gera_conta_pagar() FROM PUBLIC, anon, authenticated;
