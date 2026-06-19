/* ============================================================
   WARLO — Supabase Auth Configuration
   File ini di-load oleh semua halaman yang memerlukan autentikasi.
   Pastikan Supabase JS SDK sudah di-load sebelum file ini.
   ============================================================ */

// ─── KREDENSIAL SUPABASE ───
var SUPABASE_URL  = 'https://mwxdbrchbphrwveqxcev.supabase.co';
var SUPABASE_ANON = 'sb_publishable__uaqwsVXPBUCOzBttGnU8g_t09dHxYp';

// ─── INISIALISASI CLIENT ───
// Catatan: CDN Supabase mendaftarkan window.supabase, jadi kita pakai nama berbeda
var sbClient = null;
try {
    if (window.supabase && window.supabase.createClient) {
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        console.log('✅ Supabase client berhasil diinisialisasi');
    } else {
        console.error('❌ Supabase SDK belum dimuat.');
    }
} catch (e) {
    console.error('❌ Gagal inisialisasi Supabase:', e.message);
}

// ─── HELPER FUNCTIONS ───

async function getSession() {
    if (!sbClient) return null;
    try {
        var result = await sbClient.auth.getSession();
        return result.data.session;
    } catch (e) {
        console.warn('getSession error:', e.message);
        return null;
    }
}

async function getUser() {
    if (!sbClient) return null;
    try {
        var result = await sbClient.auth.getUser();
        return result.data.user;
    } catch (e) {
        console.warn('getUser error:', e.message);
        return null;
    }
}

async function getUserProfile(email) {
    if (!sbClient) return null;
    try {
        var result = await sbClient
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (result.error) { console.warn('Gagal ambil profil:', result.error.message); return null; }
        return result.data;
    } catch (e) {
        console.warn('getUserProfile error:', e.message);
        return null;
    }
}

/**
 * Logout user dan redirect ke halaman login.
 * SELALU redirect, bahkan jika Supabase error.
 */
async function signOut() {
    try {
        if (sbClient) await sbClient.auth.signOut();
    } catch (e) {
        console.warn('signOut error (diabaikan):', e.message);
    }
    try {
        localStorage.removeItem('warlo_user');
        sessionStorage.removeItem('warlo_user');
        localStorage.removeItem('sb-mwxdbrchbphrwveqxcev-auth-token');
    } catch (e) {}

    var loginPath = 'login.html';
    if (window.location.pathname.indexOf('/admin/') !== -1 || window.location.pathname.indexOf('/user/') !== -1) {
        loginPath = '../login.html';
    }
    window.location.href = loginPath;
}

/**
 * Cek auth. Jika belum login → redirect ke login.
 */
async function checkAuth(requiredRole) {
    var session = await getSession();
    if (!session) {
        var loginPath = 'login.html';
        if (window.location.pathname.indexOf('/admin/') !== -1 || window.location.pathname.indexOf('/user/') !== -1) {
            loginPath = '../login.html';
        }
        window.location.href = loginPath;
        return null;
    }

    var profile = await getUserProfile(session.user.email);

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

function getInisial(nama) {
    if (!nama) return '?';
    var parts = nama.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
}
