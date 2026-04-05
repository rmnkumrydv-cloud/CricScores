const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '../frontend');

function injectFiles(dir, depth = 0) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            injectFiles(fullPath, depth + 1);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // 1. Inject script into <head>
            const relPath = depth === 0 ? 'js/theme.js' : '../js/theme.js';
            const scriptTag = `<script src="${relPath}"></script>`;
            
            if (!content.includes(scriptTag)) {
                content = content.replace('</head>', `    ${scriptTag}\n</head>`);
                modified = true;
            }

            // 2. Inject button inside first <div class="nav-links...">
            const btnHtml = `<button id="themeToggle" class="theme-toggle" aria-label="Toggle Theme" style="background:transparent;border:none;color:var(--text-primary);cursor:pointer;padding:5px;display:flex;align-items:center;transition:all 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 50%; opacity: 0.8;"></button>`;
            
            if (!content.includes('id="themeToggle"')) {
                // regex find <div class="nav-links..."
                content = content.replace(/(<div[^>]*class="[^"]*nav-links[^"]*"[^>]*>)/i, `$1\n                ${btnHtml}`);
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Injected: ${fullPath}`);
            }
        }
    }
}

injectFiles(frontendDir);
console.log('Injection complete.');
