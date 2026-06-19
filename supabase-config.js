/* ============================================================
   WARLO — Supabase Auth Configuration
   File ini di-load oleh semua halaman yang memerlukan autentikasi.
   Pastikan Supabase JS SDK sudah di-load sebelum file ini.
   ============================================================ */

// ─── KREDENSIAL SUPABASE ───
const SUPABASE_URL  = 'https://mwxdbrchbphrwveqxcev.supabase.co';
const SUPABASE_ANON = 'sb_publishable__uaqwsVXPBUCOzBttGnU8g_t09dHxYp';

// ─── INISIALISASI CLIENT (dengan fallback jika gagal) ───
var supabase = null;
try {
    if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        console.log('✅ Supabase client berhasil diinisialisasi');
    } else {
        console.error('❌ Supabase SDK belum dimuat. Pastikan CDN script di-load terlebih dahulu.');
    }
} catch (e) {
    console.error('❌ Gagal inisialisasi Supabase:', e.message);
}

// ─── HELPER FUNCTIONS ───

/**
 * Ambil session aktif saat ini.
 * @returns {Promise<object|null>} session object atau null
 */
async function getSession() {
    if (!supabase) return null;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    } catch (e) {
        console.warn('getSession error:', e.message);
        return null;
    }
}

/**
 * Ambil data user yang sedang login.
 * @returns {Promise<object|null>} user object atau null
 */
async function getUser() {
    if (!supabase) return null;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (e) {
        console.warn('getUser error:', e.message);
        return null;
    }
}

/**
 * Ambil profil user dari tabel public.users berdasarkan email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function getUserProfile(email) {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (error) { console.warn('Gagal ambil profil:', error.message); return null; }
        return data;
    } catch (e) {
        console.warn('getUserProfile error:', e.message);
        return null;
    }
}

/**
 * Logout user dan redirect ke halaman login.
 * Fungsi ini SELALU redirect, bahkan jika Supabase gagal.
 */
async function signOut() {
    // Coba logout dari Supabase (jika ada)
    try {
        if (supabase) await supabase.auth.signOut();
    } catch (e) {
        console.warn('signOut Supabase error (diabaikan):', e.message);
    }

    // Bersihkan storage lokal
    try {
        localStorage.removeItem('warlo_user');
        sessionStorage.removeItem('warlo_user');
        localStorage.removeItem('sb-mwxdbrchbphrwveqxcev-auth-token');
    } catch (e) {}

    // SELALU redirect ke login
    var loginPath = 'login.html';
    if (window.location.pathname.indexOf('/admin/') !== -1 || window.location.pathname.indexOf('/user/') !== -1) {
        loginPath = '../login.html';
    }
    window.location.href = loginPath;
}

/**
 * Cek apakah user sudah login. Jika belum, redirect ke login.
 * Jika sudah, kembalikan data profil.
 * @param {string} [requiredRole] - Jika diisi, cek apakah role user sesuai
 * @returns {Promise<object|null>} profil user dari tabel public.users
 */
async function checkAuth(requiredRole) {
    var session = await getSession();
    if (!session) {
        // Tidak ada session → redirect ke login
        var loginPath = 'login.html';
        if (window.location.pathname.indexOf('/admin/') !== -1 || window.location.pathname.indexOf('/user/') !== -1) {
            loginPath = '../login.html';
        }
        window.location.href = loginPath;
        return null;
    }

    // Ambil profil dari tabel public.users
    var profile = await getUserProfile(session.user.email);

    // Cek role jika diperlukan
    if (requiredRole && profile && profile.role !== requiredRole) {
        alert('Anda tidak memiliki akses ke halaman ini.');
        var fallback = profile.role === 'admin' ? 'admin/dashboard.html' : 'user/peta.html';
        var basePath = (window.location.pathname.indexOf('/admin/') !== -1 || window.location.pathname.indexOf('/user/') !== -1)
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
    var parts = nama.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
}
