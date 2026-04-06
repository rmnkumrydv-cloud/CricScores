// Determine if the frontend is running locally or deployed
// If you host the frontend on GitHub Pages and backend on Render, change the `/api` string below to your Render URL (like 'https://your-ren-app.onrender.com/api')
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const API_URL = isLocal ? 'http://localhost:5000/api' : '/api';

async function fetchAPI(endpoint, options = {}) {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token') || (user ? user.token : null);

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();

        
        if (!response.ok) {
            if (response.status === 401) {
                clearUser();
                // Only redirect if not already on a login/register page and not index
                const path = window.location.pathname;
                if (!path.includes('login.html') && !path.includes('register.html') && !path.endsWith('/') && !path.endsWith('index.html')) {
                    window.location.href = path.includes('/pages/') ? 'login.html' : 'pages/login.html';
                }
            }
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function saveUser(userData) {
    if (userData.token) {
        localStorage.setItem('token', userData.token);
    }
    localStorage.setItem('user', JSON.stringify(userData));
}

function clearUser() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
}

function logout() {
    clearUser();
    // Redirect to login, handling both root-level and /pages/ depth
    const isInPages = window.location.pathname.includes('/pages/');
    window.location.href = isInPages ? 'login.html' : 'pages/login.html';
}
