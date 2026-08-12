/**
 * ExpenseFlow - Expenses Data Management & Table Rendering
 */

const LOCAL_EXPENSES_KEY = 'EF_LOCAL_EXPENSES_DATA';

// Sample Seed Data for Demo Mode when user starts fresh
const SAMPLE_EXPENSES = [
  {
    id: 'exp-1',
    user_id: 'demo-user-12345',
    amount: 85.50,
    category: 'Food',
    description: 'Weekly Grocery Shopping at Whole Foods',
    expense_date: '2026-08-08',
    payment_method: 'Credit Card',
    created_at: '2026-08-08T10:30:00Z'
  },
  {
    id: 'exp-2',
    user_id: 'demo-user-12345',
    amount: 140.00,
    category: 'Bills',
    description: 'Electricity & High-Speed Internet Bill',
    expense_date: '2026-08-06',
    payment_method: 'Bank Transfer',
    created_at: '2026-08-06T14:15:00Z'
  },
  {
    id: 'exp-3',
    user_id: 'demo-user-12345',
    amount: 42.00,
    category: 'Transport',
    description: 'Uber Ride to Downtown Office',
    expense_date: '2026-08-05',
    payment_method: 'UPI',
    created_at: '2026-08-05T08:45:00Z'
  },
  {
    id: 'exp-4',
    user_id: 'demo-user-12345',
    amount: 129.99,
    category: 'Shopping',
    description: 'Noise Cancelling Wireless Earbuds',
    expense_date: '2026-08-02',
    payment_method: 'Debit Card',
    created_at: '2026-08-02T16:20:00Z'
  },
  {
    id: 'exp-5',
    user_id: 'demo-user-12345',
    amount: 28.50,
    category: 'Entertainment',
    description: 'Cinema Movie Tickets & Popcorn',
    expense_date: '2026-07-28',
    payment_method: 'Cash',
    created_at: '2026-07-28T19:00:00Z'
  },
  {
    id: 'exp-6',
    user_id: 'demo-user-12345',
    amount: 65.00,
    category: 'Health',
    description: 'Monthly Gym Subscription',
    expense_date: '2026-07-25',
    payment_method: 'Credit Card',
    created_at: '2026-07-25T09:00:00Z'
  }
];

let cachedExpenses = [];
let expenseFilters = {
  search: '',
  category: 'ALL',
  sort: 'newest'
};

// Fetch All Expenses
async function fetchExpenses(userId) {
  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      cachedExpenses = data || [];
      return cachedExpenses;
    } catch (err) {
      console.error("Error fetching expenses from Supabase:", err);
      showToast("Error loading expenses from Supabase. Falling back to local data.", "error");
      return loadLocalExpenses();
    }
  } else {
    return loadLocalExpenses();
  }
}

// Load Local Fallback Expenses
function loadLocalExpenses() {
  const stored = localStorage.getItem(LOCAL_EXPENSES_KEY);
  if (stored) {
    try {
      cachedExpenses = JSON.parse(stored);
    } catch (e) {
      cachedExpenses = [...SAMPLE_EXPENSES];
    }
  } else {
    cachedExpenses = [...SAMPLE_EXPENSES];
    localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify(cachedExpenses));
  }
  return cachedExpenses;
}

// Save Local Expenses
function saveLocalExpenses() {
  localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify(cachedExpenses));
}

// Add New Expense
async function addExpense(expenseData, userId) {
  const newExpense = {
    amount: parseFloat(expenseData.amount),
    category: expenseData.category,
    description: expenseData.description.trim(),
    expense_date: expenseData.expense_date,
    payment_method: expenseData.payment_method,
    user_id: userId,
    created_at: new Date().toISOString()
  };

  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    const { data, error } = await supabase
      .from('expenses')
      .insert([newExpense])
      .select();

    if (error) throw error;
    if (data && data[0]) {
      cachedExpenses.unshift(data[0]);
    }
  } else {
    newExpense.id = 'exp-' + Date.now();
    cachedExpenses.unshift(newExpense);
    saveLocalExpenses();
  }
  return newExpense;
}

// Update Existing Expense
async function updateExpense(id, expenseData) {
  const updatedFields = {
    amount: parseFloat(expenseData.amount),
    category: expenseData.category,
    description: expenseData.description.trim(),
    expense_date: expenseData.expense_date,
    payment_method: expenseData.payment_method
  };

  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    const { data, error } = await supabase
      .from('expenses')
      .update(updatedFields)
      .eq('id', id)
      .select();

    if (error) throw error;
    const idx = cachedExpenses.findIndex(e => e.id === id);
    if (idx !== -1 && data && data[0]) {
      cachedExpenses[idx] = data[0];
    }
  } else {
    const idx = cachedExpenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      cachedExpenses[idx] = { ...cachedExpenses[idx], ...updatedFields };
      saveLocalExpenses();
    }
  }
}

// Delete Expense
async function deleteExpense(id) {
  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
  cachedExpenses = cachedExpenses.filter(e => e.id !== id);
  saveLocalExpenses();
}

// Get Filtered and Sorted Expenses
function getFilteredExpenses() {
  let list = [...cachedExpenses];

  // Search filter
  if (expenseFilters.search) {
    const q = expenseFilters.search.toLowerCase();
    list = list.filter(e => 
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.category && e.category.toLowerCase().includes(q)) ||
      (e.payment_method && e.payment_method.toLowerCase().includes(q))
    );
  }

  // Category filter
  if (expenseFilters.category && expenseFilters.category !== 'ALL') {
    list = list.filter(e => e.category === expenseFilters.category);
  }

  // Sorting
  if (expenseFilters.sort === 'newest') {
    list.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
  } else if (expenseFilters.sort === 'oldest') {
    list.sort((a, b) => new Date(a.expense_date) - new Date(b.expense_date));
  } else if (expenseFilters.sort === 'highest') {
    list.sort((a, b) => b.amount - a.amount);
  } else if (expenseFilters.sort === 'lowest') {
    list.sort((a, b) => a.amount - b.amount);
  }

  return list;
}

// Render Table and Mobile Cards
function renderExpensesUI() {
  const filtered = getFilteredExpenses();
  const tableBody = document.getElementById('expense-table-body');
  const mobileContainer = document.getElementById('responsive-cards-container');
  const emptyState = document.getElementById('empty-state');
  const countBadge = document.getElementById('expense-count-badge');

  if (countBadge) {
    countBadge.textContent = `${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`;
  }

  if (filtered.length === 0) {
    if (tableBody) tableBody.innerHTML = '';
    if (mobileContainer) mobileContainer.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // Desktop Table HTML
  if (tableBody) {
    tableBody.innerHTML = filtered.map(item => `
      <tr data-id="${item.id}">
        <td>
          <span style="font-weight: 600;">${formatDate(item.expense_date)}</span>
        </td>
        <td>
          <span style="font-weight: 500; color: var(--text-main);">${escapeHtml(item.description)}</span>
        </td>
        <td>
          <span class="category-chip" style="border-color: ${getCategoryColor(item.category)}40; color: ${getCategoryColor(item.category)}; background: ${getCategoryColor(item.category)}15;">
            ${escapeHtml(item.category)}
          </span>
        </td>
        <td>
          <span class="payment-chip">${escapeHtml(item.payment_method)}</span>
        </td>
        <td>
          <span class="amount-text">-${formatCurrency(item.amount)}</span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon edit-expense-btn" onclick="handleEditClick('${item.id}')" title="Edit Expense">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon delete-expense-btn" onclick="handleDeleteClick('${item.id}')" title="Delete Expense">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Mobile Cards HTML
  if (mobileContainer) {
    mobileContainer.innerHTML = filtered.map(item => `
      <div class="mobile-expense-card" data-id="${item.id}">
        <div class="mobile-card-top">
          <div>
            <div style="font-weight: 700; font-size: 15px;">${escapeHtml(item.description)}</div>
            <div style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">${formatDate(item.expense_date)} • ${escapeHtml(item.payment_method)}</div>
          </div>
          <div class="amount-text" style="font-size: 16px;">-${formatCurrency(item.amount)}</div>
        </div>
        <div class="mobile-card-bottom">
          <span class="category-chip" style="border-color: ${getCategoryColor(item.category)}40; color: ${getCategoryColor(item.category)}; background: ${getCategoryColor(item.category)}15;">
            ${escapeHtml(item.category)}
          </span>
          <div class="table-actions">
            <button class="btn-icon" onclick="handleEditClick('${item.id}')" title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon" onclick="handleDeleteClick('${item.id}')" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }
}
