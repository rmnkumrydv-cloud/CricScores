const API_URL = 'http://localhost:5000/api';

async function fetchAPI(endpoint, options = {}) {
    const user = JSON.parse(localStorage.getItem('user'));

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (user && user.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
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
                localStorage.removeItem('user');
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
