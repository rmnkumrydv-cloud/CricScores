const urlParams = new URLSearchParams(window.location.search);
const tournamentId = urlParams.get('id');

const tournamentHeader = document.getElementById('tournamentHeader');
const teamsList = document.getElementById('teamsList');
const fixturesList = document.getElementById('fixturesList');

const addTeamBtn = document.getElementById('addTeamBtn');
const addTeamFormContainer = document.getElementById('addTeamFormContainer');
const addTeamForm = document.getElementById('addTeamForm');
const cancelTeamBtn = document.getElementById('cancelTeamBtn');
const teamSelect = document.getElementById('teamSelect');
const deleteTournamentBtn = document.getElementById('deleteTournamentBtn');

const createMatchBtn = document.getElementById('createMatchBtn');

if (!tournamentId) {
    alert('No tournament specified');
    window.location.href = 'tournaments.html';
}

// Global state for tournament data
let currentTournament = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTournamentDetails();
    loadAllTeams(); // For the dropdown
});

addTeamBtn.addEventListener('click', () => {
    addTeamFormContainer.style.display = 'block';
    addTeamBtn.style.display = 'none';
});

cancelTeamBtn.addEventListener('click', () => {
    addTeamFormContainer.style.display = 'none';
    addTeamBtn.style.display = 'block';
});

createMatchBtn.addEventListener('click', () => {
    window.location.href = `match-setup.html?tournamentId=${tournamentId}`;
});

// Add team to tournament
addTeamForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const teamId = teamSelect.value;

    try {
        await fetchAPI(`/tournaments/${tournamentId}/teams`, {
            method: 'POST',
            body: JSON.stringify({ teamId })
        });

        addTeamForm.reset();
        addTeamFormContainer.style.display = 'none';
        addTeamBtn.style.display = 'block';
        loadTournamentDetails();
    } catch (error) {
        alert(error.message);
    }
});

// (Match creation logic removed; now uses match-setup.html)

deleteTournamentBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete this tournament? This action cannot be undone!')) {
        try {
            await fetchAPI(`/tournaments/${tournamentId}`, { method: 'DELETE' });
            window.location.href = 'tournaments.html';
        } catch (error) {
            alert('Failed to delete tournament: ' + error.message);
        }
    }
});

async function loadTournamentDetails() {
    try {
        const tournament = await fetchAPI(`/tournaments/${tournamentId}`);
        currentTournament = tournament;

        const loggedInUser = JSON.parse(localStorage.getItem('user'));
        if (tournament.createdBy === loggedInUser._id) {
            deleteTournamentBtn.style.display = 'inline-block';
        }

        const start = new Date(tournament.startDate).toLocaleDateString();
        const end = new Date(tournament.endDate).toLocaleDateString();

        tournamentHeader.innerHTML = `
            <h1 style="color: var(--primary-color);">${tournament.name}</h1>
            <p style="color: var(--text-secondary); margin-bottom: 10px;">${start} - ${end} | Organized by ${tournament.organizer}</p>
            <span style="background: var(--secondary-color); color: white; padding: 2px 8px; border-radius: 4px;">${tournament.status}</span>
        `;

        renderTeams(tournament.teams || []);
        loadFixtures();

    } catch (error) {
        tournamentHeader.innerHTML = `<p class="message message-error">Error: ${error.message}</p>`;
    }
}

async function loadAllTeams() {
    try {
        const teams = await fetchAPI('/teams');
        teamSelect.innerHTML = '<option value="">Select a Team</option>';
        teams.forEach(team => {
            const opt = document.createElement('option');
            opt.value = team._id;
            opt.textContent = team.name;
            teamSelect.appendChild(opt);
        });
    } catch (error) {
        console.error('Error loading teams', error);
    }
}

function renderTeams(teamIds) {
    teamsList.innerHTML = ''; // Clear list first! 
    if (!teamIds || teamIds.length === 0) {
        teamsList.innerHTML = '<p style="color: var(--text-secondary);">No teams in this tournament yet.</p>';
        return;
    }

    // Check if teamIds are objects (populated) or just strings
    const teams = teamIds;

    teams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'card glass';
        // Handle cases where team might be just an ID if populate failed (though controller uses populate)
        const name = team.name || 'Unknown Team';
        const city = team.city || '';

        card.innerHTML = `
            <h4 style="font-weight: 700; color: var(--primary-color);">${name}</h4>
            <p style="color: var(--text-secondary); font-size: 0.9em;">${city}</p>
        `;
        teamsList.appendChild(card);
    });
}

// Used to populate internal dropdowns, no longer needed directly here since match creation moved to match-setup

async function loadFixtures() {
    try {
        const matches = await fetchAPI(`/matches?tournamentId=${tournamentId}`);
        fixturesList.innerHTML = '';
        const loggedInUser = JSON.parse(localStorage.getItem('user'));

        if (matches.length === 0) {
            fixturesList.innerHTML = `<div class="card glass" style="text-align:center;padding:40px;color:var(--text-secondary);">
                <div style="font-size:2rem;margin-bottom:12px;">🏏</div>
                <p style="font-weight:700;margin-bottom:6px;">No matches scheduled yet</p>
                <p style="font-size:0.85em;">Click "Create Match" to add the first fixture to this tournament.</p>
            </div>`;
            return;
        }

        matches.forEach(match => {
            const date = new Date(match.date).toLocaleString();
            const team1 = match.innings[0]?.battingTeam?.name || 'Team A';
            const team2 = match.innings[1]?.battingTeam?.name || 'Team B';
            const name = match.matchName || `${team1} vs ${team2}`;
            const statusColors = { Live: '#4ade80', Completed: '#888', Scheduled: '#f59e0b' };
            const statusBg = { Live: 'rgba(74,222,128,0.15)', Completed: 'rgba(136,136,136,0.15)', Scheduled: 'rgba(245,158,11,0.15)' };
            const statusBadge = `<span style="font-size:0.75em;padding:3px 10px;border-radius:20px;background:${statusBg[match.status]||'#333'};color:${statusColors[match.status]||'#fff'};font-weight:700;">${match.status}</span>`;

            const isCreator = loggedInUser && (match.createdBy === loggedInUser._id || match.createdBy?._id === loggedInUser._id);
            let actionBtn = '';
            if (match.status === 'Completed') {
                actionBtn = `<a href="match-result.html?id=${match._id}" class="btn btn-secondary" style="padding:8px 16px;font-size:0.85rem;border-radius:10px;">🏆 Result</a>
                             <a href="live-match.html?id=${match._id}" class="btn btn-secondary" style="padding:8px 16px;font-size:0.85rem;border-radius:10px;">Scorecard</a>`;
            } else if (isCreator && loggedInUser.role === 'umpire') {
                actionBtn = `<a href="match-scoring.html?id=${match._id}" class="btn btn-primary" style="padding:8px 16px;font-size:0.85rem;border-radius:10px;">🎙️ Score</a>`;
            } else {
                actionBtn = `<a href="live-match.html?id=${match._id}" class="btn btn-primary" style="padding:8px 16px;font-size:0.85rem;border-radius:10px;">📺 Watch Live</a>`;
            }

            const score1 = match.innings[0] ? `${match.innings[0].runs}/${match.innings[0].wickets}` : '—';
            const score2 = match.innings[1] ? `${match.innings[1].runs}/${match.innings[1].wickets}` : '—';
            const showScores = match.status !== 'Scheduled';

            const card = document.createElement('div');
            card.className = 'card glass';
            card.style.cssText = 'margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;';
            card.innerHTML = `
                <div style="flex:1;min-width:200px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                        <h4 style="margin:0;font-weight:800;">${name}</h4>
                        ${statusBadge}
                    </div>
                    <div style="font-size:0.85em;color:var(--text-secondary);">📅 ${date} &nbsp;|&nbsp; 📍 ${match.venue || 'TBD'}</div>
                    ${showScores ? `<div style="margin-top:8px;font-size:0.9em;font-weight:700;color:var(--text-primary);">
                        ${team1}: <span style="color:var(--primary-color)">${score1}</span>
                        &nbsp;vs&nbsp;
                        ${team2}: <span style="color:var(--secondary-color)">${score2}</span>
                    </div>` : `<div style="margin-top:6px;font-size:0.85em;color:var(--text-secondary);">${team1} vs ${team2}</div>`}
                    ${match.winner?.name ? `<div style="margin-top:6px;font-size:0.85em;color:#4ade80;font-weight:700;">🏆 ${match.winner.name} won</div>` : ''}
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">${actionBtn}</div>
            `;
            fixturesList.appendChild(card);
        });
    } catch (error) {
        fixturesList.innerHTML = `<p class="message message-error">Error loading fixtures: ${error.message}</p>`;
    }
}

async function loadStandings() {
    const body = document.getElementById('standingsBody');
    body.innerHTML = '<tr><td colspan="7" style="padding: 20px; text-align: center; color: #888;">Updating standings...</td></tr>';

    try {
        const standings = await fetchAPI(`/tournaments/${tournamentId}/standings`);
        body.innerHTML = '';

        if (standings.length === 0) {
            body.innerHTML = '<tr><td colspan="7" style="padding: 20px; text-align: center; color: #888;">No data available</td></tr>';
            return;
        }

        standings.forEach(row => {
            body.innerHTML += `
                <tr style="border-bottom: 1px solid var(--glass-border);">
                    <td style="padding: 15px; font-weight: 700;">${row.name}</td>
                    <td style="color: var(--text-secondary);">${row.played}</td>
                    <td style="color: var(--text-secondary);">${row.won}</td>
                    <td style="color: var(--text-secondary);">${row.lost}</td>
                    <td style="color: var(--text-secondary);">${row.tied}</td>
                    <td style="color: var(--primary-color); font-weight: 800;">${row.points}</td>
                    <td style="color: var(--text-secondary);">${row.nrr}</td>
                </tr>
            `;
        });
    } catch (error) {
        body.innerHTML = `<tr><td colspan="7" style="padding: 20px; text-align: center; color: var(--error-color);">Error: ${error.message}</td></tr>`;
    }
}

// Global scope function for tab switching (needed by HTML onclick)
window.showTab = (tabName) => {
    document.getElementById('teamsTab').style.display = 'none';
    document.getElementById('fixturesTab').style.display = 'none';
    document.getElementById('standingsTab').style.display = 'none';

    document.getElementById(tabName + 'Tab').style.display = 'block';

    if (tabName === 'standings') loadStandings();
    if (tabName === 'fixtures') loadFixtures();
    if (tabName === 'teams') loadTournamentDetails();
};
