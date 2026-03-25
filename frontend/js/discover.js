let currentFilter = 'matches';
let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../login.html';
        return;
    }

    document.getElementById('navUserName').textContent = user.name;
    if (user.profilePic) {
        document.getElementById('navProfilePic').src = user.profilePic;
    }

    // Initialize search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            loadResults(e.target.value);
        }, 500);
    });

    loadResults();
});

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.toLowerCase() === filter);
    });
    loadResults(document.getElementById('searchInput').value);
}

async function loadResults(query = '') {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Searching...</div>';

    try {
        let results = [];
        const qParam = query ? `?q=${encodeURIComponent(query)}` : '';

        if (currentFilter === 'matches') {
            const response = await fetch(`${API_URL}/matches${qParam}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            results = await response.json();
            renderMatches(results);
        } else {
            const response = await fetch(`${API_URL}/tournaments${qParam}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            results = await response.json();
            renderTournaments(results);
        }
    } catch (error) {
        console.error('Search error:', error);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ff4d4d;">Failed to load results.</div>';
    }
}

function renderMatches(matches) {
    const grid = document.getElementById('resultsGrid');
    if (!matches || matches.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">No matches found matching your search.</div>';
        return;
    }

    grid.innerHTML = matches.map(match => `
        <div class="card glass match-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <span class="status-badge status-${match.status.toLowerCase()}">${match.status}</span>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(match.date).toLocaleDateString()}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div style="text-align: center; flex: 1;">
                    <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 5px;">${match.innings[0].battingTeam.name}</div>
                    <div style="font-size: 1.5rem; font-weight: 800;">${match.innings[0].runs}/${match.innings[0].wickets}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">(${match.innings[0].overs} ov)</div>
                </div>
                <div style="padding: 0 20px; color: var(--primary-color); font-weight: 800; font-size: 0.9rem;">VS</div>
                <div style="text-align: center; flex: 1;">
                    <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 5px;">${match.innings[1].battingTeam.name}</div>
                    <div style="font-size: 1.5rem; font-weight: 800;">${match.innings[1].runs}/${match.innings[1].wickets}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">(${match.innings[1].overs} ov)</div>
                </div>
            </div>

            <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                    <span>📍</span> ${match.venue}
                </div>
                ${match.status === 'Completed' && match.winner ? `
                    <div style="margin-top: 10px; font-weight: 600; color: #00c853; font-size: 0.9rem;">
                        🏆 ${match.winner.name} won
                    </div>
                ` : ''}
                <a href="match-details.html?id=${match._id}" class="btn btn-secondary" style="margin-top: 15px; display: block; text-align: center; font-size: 0.85rem;">View Scorecard</a>
            </div>
        </div>
    `).join('');
}

function renderTournaments(tournaments) {
    const grid = document.getElementById('resultsGrid');
    if (!tournaments || tournaments.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">No tournaments found matching your search.</div>';
        return;
    }

    grid.innerHTML = tournaments.map(tournament => `
        <div class="card glass match-card">
            <h3 style="margin-bottom: 10px; font-weight: 700;">${tournament.name}</h3>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                    👤 Organizer: ${tournament.organizer}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                    📅 ${new Date(tournament.startDate).toLocaleDateString()} - ${new Date(tournament.endDate).toLocaleDateString()}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                    👥 ${tournament.teams.length} Teams Participating
                </div>
            </div>
            <a href="tournament-details.html?id=${tournament._id}" class="btn btn-primary" style="display: block; text-align: center; font-size: 0.85rem;">View Standings</a>
        </div>
    `).join('');
}
