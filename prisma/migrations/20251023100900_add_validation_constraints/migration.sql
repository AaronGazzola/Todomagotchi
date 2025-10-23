ALTER TABLE "public"."Tamagotchi"
  ADD CONSTRAINT "hunger_range" CHECK ("hunger" >= 0 AND "hunger" <= 100);

ALTER TABLE "public"."Tamagotchi"
  ADD CONSTRAINT "happiness_range" CHECK ("happiness" >= 0 AND "happiness" <= 100);

ALTER TABLE "public"."Tamagotchi"
  ADD CONSTRAINT "waste_count_positive" CHECK ("wasteCount" >= 0);
