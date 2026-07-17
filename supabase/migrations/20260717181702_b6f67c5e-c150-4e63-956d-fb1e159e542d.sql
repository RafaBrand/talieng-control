
DROP POLICY IF EXISTS "centros_custo authenticated all" ON public.centros_custo;
CREATE POLICY "view centros_custo" ON public.centros_custo FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write centros_custo" ON public.centros_custo FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
