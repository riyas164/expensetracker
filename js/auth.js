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
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && profile.full_name) {
      fullName = profile.full_name;
      if (profile.email) profileEmail = profile.email;
    } else {
      // If profile record is missing in database, create or update it now
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
        if (!fullName) fullName = cleanName;
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
      // REQUIREMENT: Authenticated user's ID obtained from supabase.auth.getUser()
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        // Fallback check session in case getUser token needs session sync
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) return null;
        return await formatUserProfile(supabase, session.user);
      }

      return await formatUserProfile(supabase, user);
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

  const cleanName = fullName.trim();
  const cleanEmail = email.trim();

  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
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
      console.error("Supabase Sign Up Error:", error);
      if (error.message && error.message.toLowerCase().includes("user already registered")) {
        throw new Error("An account with this email address already exists. Please log in.");
      }
      throw new Error(error.message || "Failed to create account.");
    }

    if (!data || !data.user) {
      throw new Error("Failed to register user. Please try again.");
    }

    // Check if account already exists (Supabase returns empty identities array when email is registered and email confirmation is ON)
    if (data.user.identities && data.user.identities.length === 0) {
      throw new Error("An account with this email address already exists. Please sign in instead.");
    }

    // If session exists (Email Confirmation is DISABLED in Supabase)
    if (data.session) {
      try {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      } catch (sErr) {
        console.warn("setSession error during signup:", sErr);
      }

      // Store user full_name and email in public.profiles table
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

      return {
        user: data.user,
        session: data.session,
        requiresConfirmation: false
      };
    }

    // If session is null (Email Confirmation is ENABLED in Supabase)
    return {
      user: data.user,
      session: null,
      requiresConfirmation: true
    };
  } else {
    // Demo Sign Up Mode
    const demoUser = {
      id: 'demo-user-' + Date.now(),
      email: cleanEmail,
      fullName: cleanName
    };
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    return {
      user: demoUser,
      session: true,
      requiresConfirmation: false
    };
  }
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

// Log In / Sign In
async function loginUser(email, password) {
  if (!email || !password) {
    throw new Error("Please enter both email and password.");
  }

  const cleanEmail = email.trim();
  const supabase = getSupabase();

  if (supabase && !checkIsDemoMode()) {
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

    // Ensure session is active
    try {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
    } catch(sErr) {}

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

    return data.user;
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

    return loginDemoUser(cleanEmail, demoName);
  }
}

// Log Out
async function logoutUser() {
  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem(DEMO_USER_KEY);
  window.location.href = 'login.html';
}

// Forgot Password
async function resetPasswordRequest(email) {
  if (!email) throw new Error("Please enter your email address.");

  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login.html`
    });
    if (error) throw error;
  }
  return true;
}

// Check Route Protection & Initialize Auth State
async function initAuthCheck(pageType) {
  const user = await getCurrentUser();

  const supabase = getSupabase();
  if (supabase && !checkIsDemoMode()) {
    // Listen for Auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && pageType === 'protected') {
        window.location.href = 'login.html';
      } else if (event === 'SIGNED_IN' && pageType === 'guest') {
        if (window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html')) {
          window.location.href = 'dashboard.html';
        }
      }
    });
  }

  if (pageType === 'protected') {
    if (!user) {
      // Redirect unauthenticated user to login
      window.location.href = 'login.html';
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

  } else if (pageType === 'guest') {
    if (user) {
      // Redirect authenticated user to dashboard
      window.location.href = 'dashboard.html';
      return user;
    }
  }

  return user;
}

