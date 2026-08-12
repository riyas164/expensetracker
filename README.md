# ExpenseFlow – Personal Expense Tracker

A complete, responsive, full-featured **Expense Management Web Application** built with clean Vanilla JavaScript, modern HTML5/CSS3, Chart.js analytics, and Supabase Authentication & Database.

---

## 🌟 Resume Description

> "Developed a responsive expense management web application using HTML, CSS, JavaScript, and Supabase, featuring secure authentication, CRUD-based expense management, category filtering, dashboard analytics, and interactive charts."

---

## ✨ Features

- **Authentication System:**
  - Secure Registration with Full Name, Email & Password
  - Login & Session Persistence via Supabase Auth
  - Forgot Password reset request flow
  - Protected Dashboard routing (redirects unauthenticated users)
  - Display user's **Full Name** in header (never email)

- **Expense Management (CRUD):**
  - **Add Expense:** Amount, Description, Category, Payment Method, Date
  - **Edit Expense:** Modal auto-populates existing data
  - **Delete Expense:** Confirmation modal with instant UI update
  - **Real-Time Validations:** Amount > $0, description required, etc.

- **Interactive Dashboard & Analytics:**
  - **Total Balance Card:** Real-time net balance calculation
  - **Total Monthly Income Card:** Customizable income/budget allowance
  - **Total Expenses Card:** All-time outflow summary
  - **This Month's Spent:** Month-to-date tracking with % trend vs previous month
  - **Category Breakdown Chart:** Interactive Doughnut chart (Chart.js)
  - **Monthly Trend Chart:** Interactive Bar chart (Chart.js)

- **Advanced Search, Filtering & Sorting:**
  - Live search bar by description, category, or payment method
  - Category dropdown filter (Food, Transport, Bills, Shopping, etc.)
  - Multi-criteria sorting (Newest, Oldest, Highest Amount, Lowest Amount)

- **Responsive Mobile UI:**
  - Converts table into sleek mobile cards on smaller screens
  - Dark Violet/Purple modern theme with glassmorphism touches
  - Modern toast notifications and loading indicators

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Custom CSS variables, Flexbox, Grid), Vanilla JavaScript (ES6+ Modules)
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Auth SDK v2)
- **Data Visualization:** Chart.js
- **Hosting/Deployment Compatible:** Vercel, Netlify, GitHub Pages

---

## 📁 Project Structure

```
expense-tracker/
│
├── index.html               # Landing / Home Page
├── dashboard.html           # Main Expense Dashboard Page
├── login.html               # Login Page
├── signup.html              # Registration Page
├── forgot-password.html     # Password Reset Request Page
│
├── css/
│   ├── style.css            # Global Theme Variables, Reset, Buttons & Toasts
│   ├── auth.css             # Landing Hero Section & Auth Form Cards
│   └── dashboard.css        # Stat Cards, Table, Responsive Cards & Charts
│
├── js/
│   ├── supabase.js          # Supabase Client Init & Fallback Demo Storage
│   ├── auth.js              # Authentication, Registration & Route Guard
│   ├── expenses.js          # Expense CRUD Data Logic, Table & Card Renderer
│   ├── charts.js            # Chart.js Doughnut & Bar Chart Controllers
│   ├── dashboard.js         # Stats Calculations & Modal Form Event Handlers
│   └── utils.js             # Toast System, Currency/Date Formatting & Sanitize
│
├── supabase/
│   └── database.sql         # Supabase PostgreSQL DDL & Row Level Security (RLS)
│
├── .gitignore
└── README.md
```

---

## 🚀 Step-by-Step Setup & Deployment Guide

### Step 1: Set Up Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up / log in.
2. Click **New Project** and name it `ExpenseFlow`.
3. Set your database password and choose a region close to your users.
4. Once provisioned, go to **Project Settings -> API**.
5. Copy your **Project URL** and **anon public key**.

### Step 2: Execute Database SQL Schema

1. In your Supabase Dashboard, click on **SQL Editor** in the left menu.
2. Click **New Query**.
3. Copy and paste the entire contents of `supabase/database.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);
```

4. Click **Run**.

### Step 3: Configure Credentials in Code

Open `js/supabase.js` and replace the placeholder values with your project values:

```javascript
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-actual-anon-key";
```

*Note: You can also configure or test these credentials live inside the web application via the "Supabase Connected" badge modal on the dashboard!*

### Step 4: Run Locally in VS Code

1. Open the project folder in **VS Code**.
2. Install the **Live Server** extension in VS Code.
3. Right-click `index.html` and select **Open with Live Server**.
4. The app will launch at `http://127.0.0.1:5500/index.html`.

### Step 5: Push to GitHub

1. Create a new repository on [GitHub](https://github.com) named `expenseflow-tracker`.
2. Open terminal in the project directory:

```bash
git init
git add .
git commit -m "Initial commit - ExpenseFlow Personal Expense Tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/expenseflow-tracker.git
git push -u origin main
```

### Step 6: Deploy to Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New... -> Project**.
3. Import your `expenseflow-tracker` GitHub repository.
4. Keep framework preset as **Other** or **Static HTML**.
5. Click **Deploy**. Vercel will generate your live app URL!

### Step 7: Deploy to Netlify

1. Log in to [Netlify](https://netlify.com).
2. Click **Add new site -> Import an existing project**.
3. Select **GitHub** and authorize.
4. Select `expenseflow-tracker`.
5. Set Publish Directory to `.` (or root).
6. Click **Deploy Site**.

### Step 8: Configure Supabase Authentication Redirect URLs

1. In Supabase Dashboard, go to **Authentication -> URL Configuration**.
2. Add your deployed Vercel/Netlify URL to **Site URL** and **Redirect URLs** (e.g. `https://your-app.vercel.app/dashboard.html`).

---

## 🔮 Future Enhancements

- Export transaction records to CSV / Excel / PDF
- Recurring subscriptions & bill payment reminders
- Multiple currency support with automated exchange rates
