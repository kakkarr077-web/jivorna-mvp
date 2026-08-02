CREATE POLICY "Users create own profile reminders"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND type = 'profile');