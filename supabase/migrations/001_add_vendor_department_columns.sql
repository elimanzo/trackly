-- Migration 001: Add description to departments/categories/locations,
-- and contact_phone/website/notes to vendors.

alter table public.departments
  add column if not exists description text;

alter table public.categories
  add column if not exists description text;

alter table public.locations
  add column if not exists description text;

alter table public.vendors
  add column if not exists contact_phone text,
  add column if not exists website       text,
  add column if not exists notes         text;
