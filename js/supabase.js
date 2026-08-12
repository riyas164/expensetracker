/**
 * ExpenseFlow - Supabase Configuration & Client Initialization
 * 
 * Instructions:
 * 1. Replace YOUR_SUPABASE_URL with your Supabase Project URL.
 * 2. Replace YOUR_SUPABASE_ANON_KEY with your Supabase Anon/Public Key.
 * 
 * Never use the service_role key on the client side.
 */

let envUrl = '';
let envKey = '';
try {
  if (typeof window !== 'undefined') {
    envUrl = window.VITE_SUPABASE_URL || (window.ENV && window.ENV.VITE_SUPABASE_URL) || '';
    envKey = window.VITE_SUPABASE_ANON_KEY || (window.ENV && window.ENV.VITE_SUPABASE_ANON_KEY) || '';
  }
  if (!envUrl && typeof process !== 'undefined' && process.env) {
    envUrl = process.env.VITE_SUPABASE_URL || '';
    envKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  }
} catch (e) {}

const SUPABASE_URL = envUrl || "https://wmqezligjotwpnjpauzf.supabase.co";
const SUPABASE_ANON_KEY = envKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWV6bGlnam90d3BuanBhdXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNzExMjUsImV4cCI6MjEwMTg0NzEyNX0.OY4G0VzQwJdAHhF6ZS_gEiaK4SeVAXS7knOY-uCRwjk";

// Runtime override from localStorage if set via UI settings modal
const activeSupabaseUrl = (localStorage.getItem('EF_SUPABASE_URL') || SUPABASE_URL || '').trim();
const activeSupabaseKey = (localStorage.getItem('EF_SUPABASE_KEY') || SUPABASE_ANON_KEY || '').trim();
const forcedDemoMode = localStorage.getItem('EF_FORCE_DEMO_MODE') === 'true';

let supabaseClient = null;
let isDemoMode = forcedDemoMode;

const isPlaceholderUrl = !activeSupabaseUrl || activeSupabaseUrl === 'YOUR_SUPABASE_URL' || activeSupabaseUrl.includes('YOUR_');
const isPlaceholderKey = !activeSupabaseKey || activeSupabaseKey === 'YOUR_SUPABASE_ANON_KEY' || activeSupabaseKey.includes('YOUR_');

// Initialize Supabase Client if valid keys exist, else fall back to Demo/Local Mode
if (!forcedDemoMode && window.supabase && !isPlaceholderUrl && !isPlaceholderKey) {
  try {
    supabaseClient = window.supabase.createClient(activeSupabaseUrl, activeSupabaseKey);
    console.log("Supabase Client initialized successfully.");
  } catch (err) {
    console.warn("Failed to initialize Supabase client, enabling Demo Mode:", err);
    isDemoMode = true;
  }
} else {
  console.info("ExpenseFlow running in Demo Mode.");
  isDemoMode = true;
}

// Get Active Supabase Client
function getSupabase() {
  return supabaseClient;
}

// Check if running in Demo Mode
function checkIsDemoMode() {
  return isDemoMode;
}

// Enable/Disable Forced Demo Mode
function setDemoMode(enabled) {
  if (enabled) {
    localStorage.setItem('EF_FORCE_DEMO_MODE', 'true');
    isDemoMode = true;
  } else {
    localStorage.removeItem('EF_FORCE_DEMO_MODE');
    isDemoMode = isPlaceholderUrl || isPlaceholderKey;
  }
}

// Update Supabase Configuration dynamically from UI
function updateSupabaseConfig(url, key) {
  if (!url || !key) {
    localStorage.removeItem('EF_SUPABASE_URL');
    localStorage.removeItem('EF_SUPABASE_KEY');
  } else {
    localStorage.setItem('EF_SUPABASE_URL', url.trim());
    localStorage.setItem('EF_SUPABASE_KEY', key.trim());
    localStorage.removeItem('EF_FORCE_DEMO_MODE');
  }
  window.location.reload();
}

window.getSupabase = getSupabase;
window.checkIsDemoMode = checkIsDemoMode;
window.setDemoMode = setDemoMode;
window.updateSupabaseConfig = updateSupabaseConfig;

