/*
  # Fix Ajmi brand slug

  The brand named "Ajmi" has an incorrect slug of "nila-brand".
  This migration corrects the slug to match the brand name.
*/

UPDATE brands
SET slug = 'ajmi'
WHERE id = '315c5b92-bccd-417e-97fc-f87796ce4ee3'
  AND name = 'Ajmi'
  AND slug = 'nila-brand';
