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

const createMatchBtn = document.getElementById('createMatchBtn');
const createMatchFormContainer = document.getElementById('createMatchFormContainer');
const createMatchForm = document.getElementById('createMatchForm');
const cancelMatchBtn = document.getElementById('cancelMatchBtn');
const team1Select = document.getElementById('team1Select');
const team2Select = document.getElementById('team2Select');

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
    createMatchFormContainer.style.display = 'block';
    createMatchBtn.style.display = 'none';
    populateMatchTeams();
});

cancelMatchBtn.addEventListener('click', () => {
    createMatchFormContainer.style.display = 'none';
    createMatchBtn.style.display = 'block';
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

createMatchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const team1Id = team1Select.value;
    const team2Id = team2Select.value;
    const date = document.getElementById('matchDate').value;
    const venue = document.getElementById('venue').value;

    if (team1Id === team2Id) {
        alert('Teams must be different');
        return;
    }

    try {
        await fetchAPI('/matches', {
            method: 'POST',
            body: JSON.stringify({
                team1Id,
                team2Id,
                tournamentId,
                date,
                venue
            })
        });

        createMatchForm.reset();
        createMatchFormContainer.style.display = 'none';
        createMatchBtn.style.display = 'block';
        alert('Match scheduled!');
        loadFixtures();
    } catch (error) {
        alert(error.message);
    }
});

async function loadTournamentDetails() {
    try {
        const tournament = await fetchAPI(`/tournaments/${tournamentId}`);
        currentTournament = tournament;

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

function populateMatchTeams() {
    // Populate match dropdowns with tournament teams
    // Should use currentTournament.teams if populated
    if (currentTournament && currentTournament.teams) {
        const populate = (select) => {
            select.innerHTML = '<option value="">Select Team</option>';
            currentTournament.teams.forEach(team => {
                const opt = document.createElement('option');
                opt.value = team._id;
                opt.textContent = team.name;
                select.appendChild(opt);
            });
        };
        populate(team1Select);
        populate(team2Select);
    } else {
        // Fallback to all teams if needed, but tournament teams is better
        loadAllTeamsToMatchSelects();
    }
}

async function loadAllTeamsToMatchSelects() {
    try {
        const teams = await fetchAPI('/teams');
        const populate = (select) => {
            select.innerHTML = '<option value="">Select Team</option>';
            teams.forEach(team => {
                const opt = document.createElement('option');
                opt.value = team._id;
                opt.textContent = team.name;
                select.appendChild(opt);
            });
        };
        populate(team1Select);
        populate(team2Select);
    } catch (error) {
        console.error(error);
    }
}

async function loadFixtures() {
    try {
        const matches = await fetchAPI(`/matches?tournamentId=${tournamentId}`);
        fixturesList.innerHTML = '';

        if (matches.length === 0) {
            fixturesList.innerHTML = '<p style="color: var(--text-secondary);">No matches scheduled yet.</p>';
            return;
        }

        matches.forEach(match => {
            const date = new Date(match.date).toLocaleString();
            const card = document.createElement('div');
            card.className = 'card glass';
            card.style.marginBottom = '15px';
            card.innerHTML = `
                    <div>
                        <h4 style="margin-bottom: 5px; font-weight: 700;">${match.innings[0]?.battingTeam?.name || 'Team A'} vs ${match.innings[1]?.battingTeam?.name || 'Team B'}</h4>
                        <p style="color: var(--text-secondary); font-size: 0.85em;">${date} | ${match.venue}</p>
                    </div>
                    <div>
                        <a href="match-scoring.html?id=${match._id}" class="btn btn-primary" style="padding: 10px 20px; font-size: 0.85rem; border-radius: 10px;">Score</a>
                    </div>
                </div>
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
