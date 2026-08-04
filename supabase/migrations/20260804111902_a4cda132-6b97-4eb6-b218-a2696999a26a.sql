ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

CREATE POLICY "Staff read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins assign roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins remove roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));