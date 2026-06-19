/* ============================================================
   WARLO — Supabase Auth Configuration
   File ini di-load oleh semua halaman yang memerlukan autentikasi.
   Pastikan Supabase JS SDK sudah di-load sebelum file ini.
   ============================================================ */

// ─── KREDENSIAL SUPABASE ───
// Ganti nilai di bawah dengan kredensial dari Supabase Dashboard > Settings > API
const SUPABASE_URL  = 'https://mwxdbrchbphrwveqxcev.supabase.co';
const SUPABASE_ANON = 'sb_publishable__uaqwsVXPBUCOzBttGnU8g_t09dHxYp';

// ─── INISIALISASI CLIENT ───
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── HELPER FUNCTIONS ───

/**
 * Ambil session aktif saat ini.
 * @returns {Promise<object|null>} session object atau null
 */
async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

/**
 * Ambil data user yang sedang login.
 * @returns {Promise<object|null>} user object atau null
 */
async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * Ambil profil user dari tabel public.users berdasarkan email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function getUserProfile(email) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    if (error) { console.warn('Gagal ambil profil:', error.message); return null; }
    return data;
}

/**
 * Logout user dan redirect ke halaman login.
 */
async function signOut() {
    await supabase.auth.signOut();
    localStorage.removeItem('warlo_user');
    sessionStorage.removeItem('warlo_user');
    window.location.href = (window.location.pathname.includes('/admin/') || window.location.pathname.includes('/user/'))
        ? '../login.html'
        : 'login.html';
}

/**
 * Cek apakah user sudah login. Jika belum, redirect ke login.
 * Jika sudah, kembalikan data profil.
 * @param {string} [requiredRole] - Jika diisi, cek apakah role user sesuai
 * @returns {Promise<object|null>} profil user dari tabel public.users
 */
async function checkAuth(requiredRole) {
    const session = await getSession();
    if (!session) {
        const loginPath = (window.location.pathname.includes('/admin/') || window.location.pathname.includes('/user/'))
            ? '../login.html'
            : 'login.html';
        window.location.href = loginPath;
        return null;
    }

    // Ambil profil dari tabel public.users
    const profile = await getUserProfile(session.user.email);

    // Cek role jika diperlukan
    if (requiredRole && profile && profile.role !== requiredRole) {
        alert('Anda tidak memiliki akses ke halaman ini.');
        const fallback = profile.role === 'admin' ? 'admin/dashboard.html' : 'user/peta.html';
        const basePath = (window.location.pathname.includes('/admin/') || window.location.pathname.includes('/user/'))
            ? '../' + fallback
            : fallback;
        window.location.href = basePath;
        return null;
    }

    return profile;
}

/**
 * Ambil inisial dari nama user (maks 2 huruf).
 * @param {string} nama
 * @returns {string}
 */
function getInisial(nama) {
    if (!nama) return '?';
    const parts = nama.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
}
