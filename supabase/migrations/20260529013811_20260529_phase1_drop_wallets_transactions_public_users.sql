/*
  # Phase 1: Drop wallets, transactions, public.users

  ## Changes
  1. Drop `transactions` table — no FK children, no active code path; companion to wallets
  2. Drop `wallets` table — wallet checkout UI removed; Worldpay is the only payment method
  3. Drop `users` (public schema) — exact duplicate of `user_profiles`; nothing writes to it;
     `handle_new_user` trigger populates `user_profiles` only

  ## Tables dropped
  - transactions
  - wallets
  - users (public schema only — auth.users is NOT affected)

  ## Security
  - All associated RLS policies are automatically dropped with each table
*/

DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.wallets;
DROP TABLE IF EXISTS public.users;
