ALTER TABLE "public"."Todo" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own todos"
  ON "public"."Todo"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can insert their own todos"
  ON "public"."Todo"
  FOR INSERT
  WITH CHECK ("userId" = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can update their own todos"
  ON "public"."Todo"
  FOR UPDATE
  USING ("userId" = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can delete their own todos"
  ON "public"."Todo"
  FOR DELETE
  USING ("userId" = current_setting('app.current_user_id', TRUE));

ALTER TABLE "public"."Tamagotchi" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tamagotchi"
  ON "public"."Tamagotchi"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can insert their own tamagotchi"
  ON "public"."Tamagotchi"
  FOR INSERT
  WITH CHECK ("userId" = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can update their own tamagotchi"
  ON "public"."Tamagotchi"
  FOR UPDATE
  USING ("userId" = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can delete their own tamagotchi"
  ON "public"."Tamagotchi"
  FOR DELETE
  USING ("userId" = current_setting('app.current_user_id', TRUE));
