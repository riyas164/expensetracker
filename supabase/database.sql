-- ==========================================
-- ExpenseFlow - Supabase Database SQL Schema
-- ==========================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------
-- 1. Create Profiles Table (User Profile Metadata)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for Profiles Table
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- Enable Row Level Security (RLS) on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if updating to prevent duplicate conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- RLS Security Policies for Profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ------------------------------------------
-- 2. Trigger for Automatic Profile Creation on Sign-Up
-- ------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1), 'User'),
    new.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(nullif(EXCLUDED.full_name, ''), public.profiles.full_name),
      email = COALESCE(EXCLUDED.email, public.profiles.email),
      updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------
-- 3. Backfill Script for Users Registered Prior to Trigger
-- ------------------------------------------
INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
SELECT 
    id, 
    COALESCE(nullif(raw_user_meta_data->>'full_name', ''), split_part(email, '@', 1), 'User'), 
    email,
    created_at,
    NOW()
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = CASE 
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
      THEN EXCLUDED.full_name 
      ELSE public.profiles.full_name 
    END;

-- ------------------------------------------
-- 4. Create Expenses Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes for Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, expense_date DESC);

-- Enable Row Level Security (RLS) on Expenses Table
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Security Policies for Expenses
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Users can view own expenses"
ON public.expenses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
ON public.expenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
ON public.expenses FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
ON public.expenses FOR DELETE
USING (auth.uid() = user_id);

-- ------------------------------------------
-- 5. Create Income Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    source TEXT NOT NULL,
    description TEXT,
    income_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes for Income
CREATE INDEX IF NOT EXISTS idx_income_user_id ON public.income(user_id);
CREATE INDEX IF NOT EXISTS idx_income_user_date ON public.income(user_id, income_date DESC);

-- Enable Row Level Security (RLS) on Income Table
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

-- RLS Security Policies for Income
DROP POLICY IF EXISTS "Users can view own income" ON public.income;
DROP POLICY IF EXISTS "Users can insert own income" ON public.income;
DROP POLICY IF EXISTS "Users can update own income" ON public.income;
DROP POLICY IF EXISTS "Users can delete own income" ON public.income;

CREATE POLICY "Users can view own income"
ON public.income FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income"
ON public.income FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income"
ON public.income FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own income"
ON public.income FOR DELETE
USING (auth.uid() = user_id);

-- ==========================================
-- Verification Queries
-- ==========================================
-- SELECT * FROM public.profiles;
-- SELECT * FROM public.expenses;
-- SELECT * FROM public.income;

