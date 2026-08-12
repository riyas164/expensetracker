/**
 * ExpenseFlow - Dashboard Controller & Main Application Logic
 */

let currentUser = null;
let editingExpenseId = null;
let deletingExpenseId = null;

let editingIncomeId = null;
let deletingIncomeId = null;
let deletingType = 'EXPENSE'; // 'EXPENSE' or 'INCOME'

let activeViewTab = 'ALL'; // 'ALL', 'EXPENSES', 'INCOME'
let activeFilters = {
  search: '',
  categoryOrSource: 'ALL',
  sort: 'newest'
};

// Initialize Dashboard Page
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Verify Authentication & Route Guard
    currentUser = await initAuthCheck('protected');
    if (!currentUser) return;

    // Remove loading overlay smoothly once authenticated
    const loadingOverlay = document.getElementById('auth-loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.opacity = '0';
      loadingOverlay.style.visibility = 'hidden';
      setTimeout(() => loadingOverlay.remove(), 300);
    }

    // Set default form date to today (YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0];
    const expenseDateInput = document.getElementById('expense-date');
    const incomeDateInput = document.getElementById('income-date');
    if (expenseDateInput) expenseDateInput.value = todayStr;
    if (incomeDateInput) incomeDateInput.value = todayStr;

    // Setup Event Listeners immediately
    setupEventListeners();

    // Load Data & Render Dashboard
    try {
      await refreshDashboardData();
    } catch (dataErr) {
      console.warn("Notice during dashboard data load:", dataErr);
    }
  } catch (err) {
    console.error("Dashboard initialization error:", err);
    const loadingOverlay = document.getElementById('auth-loading-overlay');
    if (loadingOverlay) loadingOverlay.remove();
  }
});

// Refresh All Stats, Charts, and Table Data
async function refreshDashboardData() {
  const tableBody = document.getElementById('expense-table-body');
  const mobileContainer = document.getElementById('responsive-cards-container');
  if (tableBody && cachedExpenses.length === 0 && cachedIncome.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-dim);">Loading transactions from Supabase...</td></tr>`;
  }
  if (mobileContainer && cachedExpenses.length === 0 && cachedIncome.length === 0) {
    mobileContainer.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-dim);">Loading transactions from Supabase...</div>`;
  }

  const [expensesList, incomeList] = await Promise.all([
    fetchExpenses(currentUser.id),
    fetchIncome(currentUser.id)
  ]);
  
  // 1. Calculate & Render Stats Cards
  calculateAndRenderStats(expensesList, incomeList);

  // 2. Populate Category/Source Filter Dropdown options
  populateFilterOptions();

  // 3. Render Transactions Table & Mobile Cards
  renderTransactionsUI();

  // 4. Update Chart.js Visualizations
  updateCharts(expensesList, incomeList);
}

// Calculate Stats (Current Balance, Total Income, Total Expenses, This Month)
function calculateAndRenderStats(expensesList, incomeList) {
  // Total Income
  const totalIncome = incomeList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Total Expenses
  const totalExpenses = expensesList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Current Net Balance
  const currentBalance = totalIncome - totalExpenses;

  // This Month Expenses & Income
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const thisMonthExpenses = expensesList.reduce((sum, item) => {
    if (!item.expense_date) return sum;
    const d = new Date(item.expense_date);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      return sum + (parseFloat(item.amount) || 0);
    }
    return sum;
  }, 0);

  const thisMonthIncome = incomeList.reduce((sum, item) => {
    if (!item.income_date) return sum;
    const d = new Date(item.income_date);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      return sum + (parseFloat(item.amount) || 0);
    }
    return sum;
  }, 0);

  // Update DOM elements
  const balanceElem = document.getElementById('stat-total-balance');
  const incomeElem = document.getElementById('stat-total-income');
  const expenseElem = document.getElementById('stat-total-expenses');
  const monthExpenseElem = document.getElementById('stat-month-expenses');
  const monthTrendElem = document.getElementById('stat-month-trend');

  if (balanceElem) balanceElem.textContent = formatCurrency(currentBalance);
  if (incomeElem) incomeElem.textContent = formatCurrency(totalIncome);
  if (expenseElem) expenseElem.textContent = formatCurrency(totalExpenses);
  if (monthExpenseElem) monthExpenseElem.textContent = formatCurrency(thisMonthExpenses);

  if (monthTrendElem) {
    monthTrendElem.innerHTML = `
      <span style="font-size: 12px; color: var(--text-dim);">
        Mo. Inflow: <strong style="color: #34d399;">+${formatCurrency(thisMonthIncome)}</strong>
      </span>
    `;
  }
}

// Populate Filter Options depending on View Mode
function populateFilterOptions() {
  const select = document.getElementById('filter-category-select');
  if (!select) return;

  const currentSelection = activeFilters.categoryOrSource;

  if (activeViewTab === 'INCOME') {
    select.innerHTML = `
      <option value="ALL">All Sources</option>
      <option value="Salary">Salary</option>
      <option value="Freelance">Freelance</option>
      <option value="Business">Business</option>
      <option value="Investment">Investment</option>
      <option value="Bonus">Bonus</option>
      <option value="Gift">Gift</option>
      <option value="Other">Other</option>
    `;
  } else if (activeViewTab === 'EXPENSES') {
    select.innerHTML = `
      <option value="ALL">All Categories</option>
      <option value="Food">Food</option>
      <option value="Transport">Transport</option>
      <option value="Shopping">Shopping</option>
      <option value="Bills">Bills</option>
      <option value="Entertainment">Entertainment</option>
      <option value="Health">Health</option>
      <option value="Education">Education</option>
      <option value="Travel">Travel</option>
      <option value="Other">Other</option>
    `;
  } else {
    select.innerHTML = `
      <option value="ALL">All Categories & Sources</option>
      <option value="Salary">Salary (Income)</option>
      <option value="Freelance">Freelance (Income)</option>
      <option value="Business">Business (Income)</option>
      <option value="Investment">Investment (Income)</option>
      <option value="Food">Food (Expense)</option>
      <option value="Transport">Transport (Expense)</option>
      <option value="Shopping">Shopping (Expense)</option>
      <option value="Bills">Bills (Expense)</option>
      <option value="Entertainment">Entertainment (Expense)</option>
      <option value="Health">Health (Expense)</option>
      <option value="Other">Other</option>
    `;
  }

  select.value = currentSelection;
}

// Get Unified Filtered Transactions
function getFilteredTransactions() {
  let items = [];

  if (activeViewTab === 'EXPENSES' || activeViewTab === 'ALL') {
    cachedExpenses.forEach(e => {
      items.push({
        id: e.id,
        date: e.expense_date,
        description: e.description,
        categoryOrSource: e.category,
        method: e.payment_method,
        amount: parseFloat(e.amount),
        type: 'EXPENSE',
        original: e
      });
    });
  }

  if (activeViewTab === 'INCOME' || activeViewTab === 'ALL') {
    cachedIncome.forEach(i => {
      items.push({
        id: i.id,
        date: i.income_date,
        description: i.description || 'Income Deposit',
        categoryOrSource: i.source,
        method: 'Income Inflow',
        amount: parseFloat(i.amount),
        type: 'INCOME',
        original: i
      });
    });
  }

  // Search filter
  if (activeFilters.search) {
    const q = activeFilters.search.toLowerCase();
    items = items.filter(t => 
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.categoryOrSource && t.categoryOrSource.toLowerCase().includes(q)) ||
      (t.method && t.method.toLowerCase().includes(q)) ||
      (t.amount.toString().includes(q))
    );
  }

  // Category / Source filter
  if (activeFilters.categoryOrSource && activeFilters.categoryOrSource !== 'ALL') {
    items = items.filter(t => t.categoryOrSource === activeFilters.categoryOrSource);
  }

  // Sort
  if (activeFilters.sort === 'newest') {
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (activeFilters.sort === 'oldest') {
    items.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else if (activeFilters.sort === 'highest') {
    items.sort((a, b) => b.amount - a.amount);
  } else if (activeFilters.sort === 'lowest') {
    items.sort((a, b) => a.amount - b.amount);
  }

  return items;
}

// Render Transactions UI (Desktop Table & Mobile Cards)
function renderTransactionsUI() {
  const filtered = getFilteredTransactions();
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
    tableBody.innerHTML = filtered.map(item => {
      const isIncome = item.type === 'INCOME';
      const badgeClass = isIncome ? 'type-chip-income' : 'type-chip-expense';
      const amountClass = isIncome ? 'amount-income' : 'amount-expense';
      const amountPrefix = isIncome ? '+' : '-';
      const catColor = isIncome ? getIncomeSourceColor(item.categoryOrSource) : getCategoryColor(item.categoryOrSource);

      return `
        <tr data-id="${item.id}">
          <td>
            <span style="font-weight: 600;">${formatDate(item.date)}</span>
          </td>
          <td>
            <span class="${badgeClass}">
              ${isIncome ? '🟢 Income' : '🔴 Expense'}
            </span>
          </td>
          <td>
            <span style="font-weight: 500; color: var(--text-main);">${escapeHtml(item.description)}</span>
          </td>
          <td>
            <span class="category-chip" style="border-color: ${catColor}40; color: ${catColor}; background: ${catColor}15;">
              ${escapeHtml(item.categoryOrSource)}
            </span>
          </td>
          <td>
            <span class="${amountClass}">${amountPrefix}${formatCurrency(item.amount)}</span>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn-icon" onclick="handleEditTransaction('${item.id}', '${item.type}')" title="Edit ${item.type.toLowerCase()}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon" onclick="handleDeleteTransaction('${item.id}', '${item.type}')" title="Delete ${item.type.toLowerCase()}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Mobile Cards HTML
  if (mobileContainer) {
    mobileContainer.innerHTML = filtered.map(item => {
      const isIncome = item.type === 'INCOME';
      const badgeClass = isIncome ? 'type-chip-income' : 'type-chip-expense';
      const amountClass = isIncome ? 'amount-income' : 'amount-expense';
      const amountPrefix = isIncome ? '+' : '-';
      const catColor = isIncome ? getIncomeSourceColor(item.categoryOrSource) : getCategoryColor(item.categoryOrSource);

      return `
        <div class="mobile-expense-card" data-id="${item.id}">
          <div class="mobile-card-top">
            <div>
              <div style="font-weight: 700; font-size: 15px; color: var(--text-main);">${escapeHtml(item.description)}</div>
              <div style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">
                ${formatDate(item.date)} • <span class="${badgeClass}">${isIncome ? 'Income' : 'Expense'}</span>
              </div>
            </div>
            <div class="${amountClass}" style="font-size: 16px;">${amountPrefix}${formatCurrency(item.amount)}</div>
          </div>
          <div class="mobile-card-bottom">
            <span class="category-chip" style="border-color: ${catColor}40; color: ${catColor}; background: ${catColor}15;">
              ${escapeHtml(item.categoryOrSource)}
            </span>
            <div class="table-actions">
              <button class="btn-icon" onclick="handleEditTransaction('${item.id}', '${item.type}')" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon" onclick="handleDeleteTransaction('${item.id}', '${item.type}')" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Switch View Tab (ALL, EXPENSES, INCOME)
function switchViewTab(tab) {
  activeViewTab = tab;

  document.querySelectorAll('.view-tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-${tab.toLowerCase()}`);
  if (activeBtn) activeBtn.classList.add('active');

  activeFilters.categoryOrSource = 'ALL';
  populateFilterOptions();
  renderTransactionsUI();
}

// Setup Event Listeners
function setupEventListeners() {
  // Search Input
  const searchInput = document.getElementById('search-expenses-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      activeFilters.search = e.target.value.trim();
      renderTransactionsUI();
    }, 250));
  }

  // Category / Source Filter
  const categorySelect = document.getElementById('filter-category-select');
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      activeFilters.categoryOrSource = e.target.value;
      renderTransactionsUI();
    });
  }

  // Sort Select
  const sortSelect = document.getElementById('sort-expenses-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      activeFilters.sort = e.target.value;
      renderTransactionsUI();
    });
  }

  // Clear Filters Button
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      activeFilters.search = '';
      activeFilters.categoryOrSource = 'ALL';
      activeFilters.sort = 'newest';

      if (searchInput) searchInput.value = '';
      if (categorySelect) categorySelect.value = 'ALL';
      if (sortSelect) sortSelect.value = 'newest';

      renderTransactionsUI();
    });
  }

  // Expense Form Submit
  const expenseForm = document.getElementById('expense-form');
  if (expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleExpenseFormSubmit();
    });
  }

  // Income Form Submit
  const incomeForm = document.getElementById('income-form');
  if (incomeForm) {
    incomeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleIncomeFormSubmit();
    });
  }

  // Confirm Delete Button (Handles both Expense and Income deletion)
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      try {
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = 'Deleting...';

        if (deletingType === 'EXPENSE' && deletingExpenseId) {
          await deleteExpense(deletingExpenseId);
          showToast('Expense deleted successfully', 'success');
          deletingExpenseId = null;
        } else if (deletingType === 'INCOME' && deletingIncomeId) {
          await deleteIncome(deletingIncomeId);
          showToast('Income record deleted successfully', 'success');
          deletingIncomeId = null;
        }

        closeModal('delete-modal');
        await refreshDashboardData();
      } catch (err) {
        showToast(err.message || 'Failed to delete record', 'error');
      } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = 'Yes, Delete';
      }
    });
  }

  // Supabase Configuration Form Modal
  const supabaseForm = document.getElementById('supabase-config-form');
  if (supabaseForm) {
    const urlInput = document.getElementById('cfg-supabase-url');
    const keyInput = document.getElementById('cfg-supabase-key');
    if (urlInput) urlInput.value = localStorage.getItem('EF_SUPABASE_URL') || '';
    if (keyInput) keyInput.value = localStorage.getItem('EF_SUPABASE_KEY') || '';

    supabaseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = urlInput.value.trim();
      const key = keyInput.value.trim();
      updateSupabaseConfig(url, key);
    });
  }
}

// Open Expense Modal
function openAddExpenseModal() {
  editingExpenseId = null;
  const form = document.getElementById('expense-form');
  if (form) form.reset();

  const titleElem = document.getElementById('modal-expense-title');
  const submitBtn = document.getElementById('modal-expense-submit');
  if (titleElem) titleElem.textContent = 'Add New Expense';
  if (submitBtn) submitBtn.textContent = 'Add Expense';

  const dateInput = document.getElementById('expense-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  openModal('expense-modal');
}

// Open Income Modal
function openAddIncomeModal() {
  editingIncomeId = null;
  const form = document.getElementById('income-form');
  if (form) form.reset();

  const titleElem = document.getElementById('modal-income-title');
  const submitBtn = document.getElementById('modal-income-submit');
  if (titleElem) titleElem.textContent = 'Add New Income';
  if (submitBtn) submitBtn.textContent = 'Add Income';

  const dateInput = document.getElementById('income-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  openModal('income-modal');
}

// Edit Transaction Route Dispatcher
function handleEditTransaction(id, type) {
  if (type === 'EXPENSE') {
    handleEditExpenseClick(id);
  } else {
    handleEditIncomeClick(id);
  }
}

// Delete Transaction Route Dispatcher
function handleDeleteTransaction(id, type) {
  deletingType = type;
  if (type === 'EXPENSE') {
    deletingExpenseId = id;
    const titleElem = document.getElementById('delete-modal-title');
    const msgElem = document.getElementById('delete-modal-msg');
    if (titleElem) titleElem.textContent = 'Delete Expense?';
    if (msgElem) msgElem.textContent = 'Are you sure you want to delete this expense record?';
  } else {
    deletingIncomeId = id;
    const titleElem = document.getElementById('delete-modal-title');
    const msgElem = document.getElementById('delete-modal-msg');
    if (titleElem) titleElem.textContent = 'Delete Income?';
    if (msgElem) msgElem.textContent = 'Are you sure you want to delete this income entry?';
  }
  openModal('delete-modal');
}

// Edit Expense
function handleEditExpenseClick(id) {
  const expense = cachedExpenses.find(e => e.id === id);
  if (!expense) return;

  editingExpenseId = id;
  const titleElem = document.getElementById('modal-expense-title');
  const submitBtn = document.getElementById('modal-expense-submit');

  if (titleElem) titleElem.textContent = 'Edit Expense';
  if (submitBtn) submitBtn.textContent = 'Save Changes';

  document.getElementById('expense-amount').value = expense.amount;
  document.getElementById('expense-description').value = expense.description;
  document.getElementById('expense-category').value = expense.category;
  document.getElementById('expense-payment-method').value = expense.payment_method;
  document.getElementById('expense-date').value = expense.expense_date;

  openModal('expense-modal');
}

// Edit Income
function handleEditIncomeClick(id) {
  const income = cachedIncome.find(i => i.id === id);
  if (!income) return;

  editingIncomeId = id;
  const titleElem = document.getElementById('modal-income-title');
  const submitBtn = document.getElementById('modal-income-submit');

  if (titleElem) titleElem.textContent = 'Edit Income Entry';
  if (submitBtn) submitBtn.textContent = 'Save Changes';

  document.getElementById('income-amount').value = income.amount;
  document.getElementById('income-source').value = income.source;
  document.getElementById('income-description').value = income.description || '';
  document.getElementById('income-date').value = income.income_date;

  openModal('income-modal');
}

// Submit Expense Form
async function handleExpenseFormSubmit() {
  const amount = document.getElementById('expense-amount').value;
  const description = document.getElementById('expense-description').value;
  const category = document.getElementById('expense-category').value;
  const paymentMethod = document.getElementById('expense-payment-method').value;
  const date = document.getElementById('expense-date').value;

  if (!amount || parseFloat(amount) <= 0) {
    showToast('Expense amount must be greater than $0.', 'error');
    return;
  }
  if (!description || !description.trim()) {
    showToast('Please enter an expense description.', 'error');
    return;
  }
  if (!category) {
    showToast('Please select an expense category.', 'error');
    return;
  }
  if (!paymentMethod) {
    showToast('Please select a payment method.', 'error');
    return;
  }
  if (!date) {
    showToast('Please select an expense date.', 'error');
    return;
  }

  const submitBtn = document.getElementById('modal-expense-submit');
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const payload = {
      amount,
      description,
      category,
      payment_method: paymentMethod,
      expense_date: date
    };

    if (editingExpenseId) {
      await updateExpense(editingExpenseId, payload);
      showToast('Expense updated successfully!', 'success');
    } else {
      await addExpense(payload, currentUser.id);
      showToast('New expense added successfully!', 'success');
    }

    closeModal('expense-modal');
    await refreshDashboardData();
  } catch (err) {
    showToast(err.message || 'Error saving expense.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingExpenseId ? 'Save Changes' : 'Add Expense';
  }
}

// Submit Income Form
async function handleIncomeFormSubmit() {
  const amount = document.getElementById('income-amount').value;
  const source = document.getElementById('income-source').value;
  const description = document.getElementById('income-description').value;
  const date = document.getElementById('income-date').value;

  if (!amount || parseFloat(amount) <= 0) {
    showToast('Income amount must be greater than $0.', 'error');
    return;
  }
  if (!source) {
    showToast('Please select an income source.', 'error');
    return;
  }
  if (!date) {
    showToast('Please select an income date.', 'error');
    return;
  }

  const submitBtn = document.getElementById('modal-income-submit');
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const payload = {
      amount,
      source,
      description,
      income_date: date
    };

    if (editingIncomeId) {
      await updateIncome(editingIncomeId, payload);
      showToast('Income entry updated successfully!', 'success');
    } else {
      await addIncome(payload, currentUser.id);
      showToast('New income added successfully!', 'success');
    }

    closeModal('income-modal');
    await refreshDashboardData();
  } catch (err) {
    showToast(err.message || 'Error saving income.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingIncomeId ? 'Save Changes' : 'Add Income';
  }
}

// Mobile Hamburger Navigation Drawer Handlers
function toggleMobileMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  if (!drawer) return;

  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

function openMobileMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  if (drawer) drawer.classList.add('open');
  if (toggleBtn) {
    toggleBtn.classList.add('active');
    const openIcon = toggleBtn.querySelector('.icon-hamburger');
    const closeIcon = toggleBtn.querySelector('.icon-close');
    if (openIcon) openIcon.style.display = 'none';
    if (closeIcon) closeIcon.style.display = 'block';
  }
}

function closeMobileMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  if (drawer) drawer.classList.remove('open');
  if (toggleBtn) {
    toggleBtn.classList.remove('active');
    const openIcon = toggleBtn.querySelector('.icon-hamburger');
    const closeIcon = toggleBtn.querySelector('.icon-close');
    if (openIcon) openIcon.style.display = 'block';
    if (closeIcon) closeIcon.style.display = 'none';
  }
}

function handleMobileNav(view) {
  closeMobileMenu();
  if (view === 'MONTHLY') {
    const monthlySection = document.getElementById('monthly-chart-canvas');
    if (monthlySection) {
      monthlySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } else {
    switchViewTab(view);
  }
}

// Close mobile navigation drawer when clicking outside the header
document.addEventListener('click', (e) => {
  const header = document.querySelector('.app-header');
  const drawer = document.getElementById('mobile-nav-drawer');
  if (drawer && drawer.classList.contains('open')) {
    if (header && !header.contains(e.target)) {
      closeMobileMenu();
    }
  }
});
