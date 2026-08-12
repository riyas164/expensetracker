/**
 * ExpenseFlow - Income Data Management & Table Rendering
 */

const LOCAL_INCOME_KEY = 'EF_LOCAL_INCOME_DATA';

// Sample Seed Income Data for Demo Mode
const SAMPLE_INCOME = [
  {
    id: 'inc-1',
    user_id: 'demo-user-12345',
    amount: 5200.00,
    source: 'Salary',
    description: 'Monthly Tech Lead Salary Credit',
    income_date: '2026-08-01',
    created_at: '2026-08-01T09:00:00Z'
  },
  {
    id: 'inc-2',
    user_id: 'demo-user-12345',
    amount: 1450.00,
    source: 'Freelance',
    description: 'UI/UX Redesign for E-commerce Client',
    income_date: '2026-08-04',
    created_at: '2026-08-04T15:30:00Z'
  },
  {
    id: 'inc-3',
    user_id: 'demo-user-12345',
    amount: 320.00,
    source: 'Investment',
    description: 'Quarterly Stock Dividend Yield',
    income_date: '2026-07-28',
    created_at: '2026-07-28T11:00:00Z'
  },
  {
    id: 'inc-4',
    user_id: 'demo-user-12345',
    amount: 5200.00,
    source: 'Salary',
    description: 'Monthly Tech Lead Salary Credit',
    income_date: '2026-07-01',
    created_at: '2026-07-01T09:00:00Z'
  }
];

let cachedIncome = [];

// Get Income Source Color
function getIncomeSourceColor(source) {
  const colors = {
    'Salary': '#10b981',     // Emerald
    'Freelance': '#06b6d4',  // Cyan
    'Business': '#8b5cf6',   // Purple
    'Investment': '#f59e0b', // Amber
    'Bonus': '#d946ef',      // Fuchsia
    'Gift': '#3b82f6',       // Blue
    'Other': '#64748b'       // Slate
  };
  return colors[source] || '#10b981';
}

// Fetch All Income Records
async function fetchIncome(userId) {
  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    try {
      const { data, error } = await supabase
        .from('income')
        .select('*')
        .eq('user_id', userId)
        .order('income_date', { ascending: false });

      if (error) throw error;
      cachedIncome = data || [];
      return cachedIncome;
    } catch (err) {
      console.error("Error fetching income from Supabase:", err);
      showToast("Error loading income from Supabase. Falling back to local data.", "error");
      return loadLocalIncome();
    }
  } else {
    return loadLocalIncome();
  }
}

// Load Local Fallback Income
function loadLocalIncome() {
  const stored = localStorage.getItem(LOCAL_INCOME_KEY);
  if (stored) {
    try {
      cachedIncome = JSON.parse(stored);
    } catch (e) {
      cachedIncome = [...SAMPLE_INCOME];
    }
  } else {
    cachedIncome = [...SAMPLE_INCOME];
    localStorage.setItem(LOCAL_INCOME_KEY, JSON.stringify(cachedIncome));
  }
  return cachedIncome;
}

// Save Local Income
function saveLocalIncome() {
  localStorage.setItem(LOCAL_INCOME_KEY, JSON.stringify(cachedIncome));
}

// Add New Income
async function addIncome(incomeData, userId) {
  const newIncome = {
    amount: parseFloat(incomeData.amount),
    source: incomeData.source,
    description: (incomeData.description || '').trim(),
    income_date: incomeData.income_date,
    user_id: userId,
    created_at: new Date().toISOString()
  };

  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    const { data, error } = await supabase
      .from('income')
      .insert([newIncome])
      .select();

    if (error) throw error;
    if (data && data[0]) {
      cachedIncome.unshift(data[0]);
    }
  } else {
    newIncome.id = 'inc-' + Date.now();
    cachedIncome.unshift(newIncome);
    saveLocalIncome();
  }
  return newIncome;
}

// Update Existing Income
async function updateIncome(id, incomeData) {
  const updatedFields = {
    amount: parseFloat(incomeData.amount),
    source: incomeData.source,
    description: (incomeData.description || '').trim(),
    income_date: incomeData.income_date
  };

  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    const { data, error } = await supabase
      .from('income')
      .update(updatedFields)
      .eq('id', id)
      .select();

    if (error) throw error;
    const idx = cachedIncome.findIndex(i => i.id === id);
    if (idx !== -1 && data && data[0]) {
      cachedIncome[idx] = data[0];
    }
  } else {
    const idx = cachedIncome.findIndex(i => i.id === id);
    if (idx !== -1) {
      cachedIncome[idx] = { ...cachedIncome[idx], ...updatedFields };
      saveLocalIncome();
    }
  }
}

// Delete Income
async function deleteIncome(id) {
  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    const { error } = await supabase
      .from('income')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
  cachedIncome = cachedIncome.filter(i => i.id !== id);
  saveLocalIncome();
}
