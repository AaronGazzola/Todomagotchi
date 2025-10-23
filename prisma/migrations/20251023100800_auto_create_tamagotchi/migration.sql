CREATE OR REPLACE FUNCTION create_user_tamagotchi()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "public"."Tamagotchi" ("id", "userId")
  VALUES (gen_random_uuid()::text, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created
  AFTER INSERT ON "auth"."user"
  FOR EACH ROW
  EXECUTE FUNCTION create_user_tamagotchi();
