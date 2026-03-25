-- Migration 001: Add columns present in TypeScript types but missing from initial schema
-- Run this in the Supabase SQL Editor after the initial schema has been applied.

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
