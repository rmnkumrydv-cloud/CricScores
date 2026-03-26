function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleUI(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggleUI(newTheme);
}

function updateThemeToggleUI(theme) {
    const toggleIcon = document.getElementById('theme-toggle-icon');
    if (toggleIcon) {
        toggleIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initTheme);
