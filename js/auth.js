/**
 * ExpenseFlow - Authentication Management Module
 */

// Demo User Storage Key
const DEMO_USER_KEY = 'EF_DEMO_USER_SESSION';

// Helper to format and sync user profile from Supabase user object
async function formatUserProfile(supabase, user) {
  if (!user) return null;

  let fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
  let profileEmail = user.email || '';

  // Query profiles table for user full_name and email using auth user UUID
  try {
    const profilePromise = supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ data: null }), 2000));
    const { data: profile } = await Promise.race([profilePromise, timeoutPromise]);

    if (profile && profile.full_name && profile.full_name.trim()) {
      fullName = profile.full_name;
      if (profile.email) profileEmail = profile.email;
    } else {
      // If profile record is missing or blank in database, create or update it now
      const fallbackName = fullName || (profileEmail.includes('@') ? profileEmail.split('@')[0] : 'User');
      const cleanName = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
      
      try {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: cleanName,
            email: profileEmail,
            updated_at: new Date().toISOString()
          });
        fullName = cleanName;
      } catch (upsertErr) {
        console.warn("Notice: auto profile creation error:", upsertErr);
      }
    }
  } catch (profErr) {
    console.warn("Could not query profiles table, using user_metadata fallback:", profErr);
  }

  // Fallback for Username Display (never raw email unless formatted)
  if (!fullName || !fullName.trim()) {
    if (profileEmail && profileEmail.includes('@')) {
      const parts = profileEmail.split('@')[0];
      fullName = parts.charAt(0).toUpperCase() + parts.slice(1);
    } else {
      fullName = 'User';
    }
  }

  return {
    id: user.id,
    email: profileEmail,
    fullName: fullName
  };
}

// Get Currently Authenticated User (Supabase or Demo Mode)
async function getCurrentUser() {
  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    try {
      // 1. First check active local session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || !session.user) {
        return null;
      }

      // 2. Obtain user details from auth server or session fallback
      let activeUser = session.user;
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (user && !userError) {
          activeUser = user;
        }
      } catch (uErr) {
        // Fallback to session user if network/server check has delay
      }

      if (!activeUser) return null;

      return await formatUserProfile(supabase, activeUser);
    } catch (err) {
      console.error("Error fetching Supabase session:", err);
      return null;
    }
  } else {
    // Demo Mode Session
    const stored = localStorage.getItem(DEMO_USER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

// Register / Sign Up
async function signUpUser(fullName, email, password) {
  if (!fullName || !email || !password) {
    throw new Error("All fields are required.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  window._isAuthenticating = true;
  const cleanName = fullName.trim();
  const cleanEmail = email.trim();

  // If in forced demo mode, exit it for real sign up
  if (typeof setDemoMode === 'function') {
    setDemoMode(false);
  }

  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName
          }
        }
      });

      if (error) {
        console.warn("Supabase Sign Up Notice:", error.message || error);
        const errMsg = (error.message || "").toLowerCase();
        if (
          errMsg.includes("user already registered") ||
          errMsg.includes("already exists") ||
          errMsg.includes("already in use") ||
          error.code === "user_already_exists"
        ) {
          throw new Error("An account with this email address already exists. Please log in.");
        }
        if (errMsg.includes("rate limit")) {
          throw new Error("Too many requests. Please wait a few moments before trying again.");
        }
        throw new Error(error.message || "Failed to create account.");
      }

      if (!data || !data.user) {
        throw new Error("Failed to register user. Please try again.");
      }

      // Check if account already exists
      if (data.user.identities && data.user.identities.length === 0) {
        throw new Error("An account with this email address already exists. Please sign in instead.");
      }

      // If session exists (Email Confirmation is DISABLED in Supabase)
      if (data.session) {
        try {
          await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: cleanName,
              email: cleanEmail,
              updated_at: new Date().toISOString()
            });
        } catch (pErr) {
          console.warn("Notice: profile table upsert error during signup:", pErr);
        }

        window._isAuthenticating = false;
        return {
          user: data.user,
          session: data.session,
          requiresConfirmation: false
        };
      }

      // If session is null (Email Confirmation is ENABLED in Supabase)
      window._isAuthenticating = false;
      return {
        user: data.user,
        session: null,
        requiresConfirmation: true
      };
    } catch (err) {
      window._isAuthenticating = false;
      throw err;
    }
  } else {
    // Demo Sign Up Mode
    const demoUser = {
      id: 'demo-user-' + Date.now(),
      email: cleanEmail,
      fullName: cleanName
    };
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    window._isAuthenticating = false;
    return {
      user: demoUser,
      session: true,
      requiresConfirmation: false
    };
  }
}

// Log In / Sign In
async function loginUser(email, password) {
  if (!email || !password) {
    throw new Error("Please enter both email and password.");
  }

  window._isAuthenticating = true;
  const cleanEmail = email.trim();

  // If in forced demo mode, exit it for real sign in
  if (typeof setDemoMode === 'function') {
    setDemoMode(false);
  }

  const supabase = getSupabase();

  if (supabase && !checkIsDemoMode()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (error) {
        console.error("Supabase Login Error:", error);
        if (error.message && error.message.includes("Email not confirmed")) {
          throw new Error("Email not confirmed. Please check your email inbox and click the verification link before logging in.");
        }
        if (error.message && (error.message.includes("Invalid login credentials") || error.message.includes("invalid_credentials"))) {
          throw new Error("Invalid email or password. Please check your credentials or Sign Up.");
        }
        throw new Error(error.message || "Failed to log in.");
      }

      if (!data || !data.user || !data.session) {
        throw new Error("Login failed. Could not establish user session.");
      }

      // Sync profile row in database
      const fullName = data.user.user_metadata?.full_name || (cleanEmail.split('@')[0]);
      try {
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: fullName,
            email: cleanEmail,
            updated_at: new Date().toISOString()
          });
      } catch (pErr) {
        console.warn("Profile sync error on login:", pErr);
      }

      window._isAuthenticating = false;
      return data.user;
    } catch (err) {
      window._isAuthenticating = false;
      throw err;
    }
  } else {
    // Demo Login
    const nameFromEmail = cleanEmail.split('@')[0];
    const capitalized = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
    
    let demoName = capitalized;
    const existing = localStorage.getItem(DEMO_USER_KEY);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed.email === cleanEmail && parsed.fullName) {
          demoName = parsed.fullName;
        }
      } catch(e) {}
    }

    const demoUser = await loginDemoUser(cleanEmail, demoName);
    window._isAuthenticating = false;
    return demoUser;
  }
}

// Quick Instant Demo Login
async function loginDemoUser(email = 'demo@expenseflow.app', fullName = 'Demo User') {
  if (typeof setDemoMode === 'function') {
    setDemoMode(true);
  }
  const demoUser = {
    id: 'demo-user-12345',
    email: email.trim(),
    fullName: fullName.trim()
  };
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
  return demoUser;
}

// Log Out
async function logoutUser() {
  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    try {
      await supabase.auth.signOut();
    } catch(e) {}
  }
  localStorage.removeItem(DEMO_USER_KEY);
  localStorage.removeItem('EF_FORCE_DEMO_MODE');
  window.location.href = '/login.html';
}

// Forgot Password
async function resetPasswordRequest(email) {
  if (!email) throw new Error("Please enter your email address.");

  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login.html`
    });
    if (error) throw error;
  }
  return true;
}

// Update User Profile Full Name
async function updateUserProfile(newFullName) {
  if (!newFullName || !newFullName.trim()) {
    throw new Error("Name cannot be empty.");
  }
  const cleanName = newFullName.trim();
  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No active user session found.");

    // 1. Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: cleanName,
        email: user.email,
        updated_at: new Date().toISOString()
      });

    if (profileError) throw profileError;

    // 2. Update Auth metadata
    await supabase.auth.updateUser({
      data: { full_name: cleanName }
    });

    // 3. Update active UI elements immediately
    const userNameElems = [document.getElementById('header-user-name'), document.getElementById('mobile-header-user-name')];
    const userAvatarElems = [document.getElementById('header-user-avatar'), document.getElementById('mobile-header-user-avatar')];
    
    userNameElems.forEach(elem => {
      if (elem) elem.textContent = cleanName;
    });

    const initials = cleanName
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'U';

    userAvatarElems.forEach(elem => {
      if (elem) elem.textContent = initials;
    });

    return { id: user.id, email: user.email, fullName: cleanName };
  } else {
    // Demo Mode Update
    const stored = localStorage.getItem(DEMO_USER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.fullName = cleanName;
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(parsed));
    }
    return { fullName: cleanName };
  }
}

// Check Route Protection & Initialize Auth State
async function initAuthCheck(pageType) {
  const path = window.location.pathname.toLowerCase();
  const isGuestPage = path.includes('login') || path.includes('signup') || path === '/' || path.endsWith('index.html');
  const isProtectedPage = path.includes('dashboard');

  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    // Listen for Auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && (isProtectedPage || pageType === 'protected')) {
        window.location.href = '/login.html';
      } else if (event === 'SIGNED_IN' && (isGuestPage || pageType === 'guest') && !window._isAuthenticating) {
        window.location.href = '/dashboard.html';
      }
    });
  }

  const user = await getCurrentUser();

  if (pageType === 'protected' || isProtectedPage) {
    if (!user) {
      // Redirect unauthenticated user to login
      window.location.href = '/login.html';
      return null;
    }

    // Update Header Greeting with User Full Name / Username (NOT email)
    const userNameElems = [document.getElementById('header-user-name'), document.getElementById('mobile-header-user-name')];
    const userAvatarElems = [document.getElementById('header-user-avatar'), document.getElementById('mobile-header-user-avatar')];
    
    userNameElems.forEach(elem => {
      if (elem) elem.textContent = user.fullName;
    });

    const initials = user.fullName
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'U';

    userAvatarElems.forEach(elem => {
      if (elem) elem.textContent = initials;
    });

    return user;

  } else if (pageType === 'guest' || isGuestPage) {
    if (user && !window._isAuthenticating) {
      // Redirect authenticated user directly to dashboard
      window.location.href = '/dashboard.html';
      return user;
    }
  }

  return user;
}
