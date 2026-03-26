const urlParams = new URLSearchParams(window.location.search);
const teamId = urlParams.get('id');

const teamHeader = document.getElementById('teamHeader');
const playersList = document.getElementById('playersList');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const addPlayerFormContainer = document.getElementById('addPlayerFormContainer');
const addPlayerForm = document.getElementById('addPlayerForm');
const cancelPlayerBtn = document.getElementById('cancelPlayerBtn');
const playerSearch = document.getElementById('playerSearch');
const searchResults = document.getElementById('searchResults');
const selectedPlayerProfile = document.getElementById('selectedPlayerProfile');
const selectedPlayerName = document.getElementById('selectedPlayerName');
const selectedPlayerUsername = document.getElementById('selectedPlayerUsername');
const viewStatsLink = document.getElementById('viewStatsLink');

let allPlayers = [];
let selectedPlayerId = null;
let teamPlayersIds = [];

if (!teamId) {
    alert('No team specified');
    window.location.href = 'teams.html';
}

// Load team details on startup
document.addEventListener('DOMContentLoaded', () => {
    loadTeamDetails();
    initPlayerSearch();
});

async function initPlayerSearch() {
    try {
        allPlayers = await fetchAPI('/users/players');
        
        playerSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            searchResults.innerHTML = '';
            
            if (term.length < 2) {
                searchResults.style.display = 'none';
                return;
            }

            const filtered = allPlayers.filter(p => 
                !teamPlayersIds.includes(p._id) && 
                ((p.name || '').toLowerCase().includes(term) || (p.username || '').toLowerCase().includes(term))
            ).slice(0, 10);

            if (filtered.length > 0) {
                searchResults.style.display = 'block';
                filtered.forEach(p => {
                    const div = document.createElement('div');
                    div.className = 'player-item';
                    div.style.cursor = 'pointer';
                    div.style.padding = '12px';
                    div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    div.innerHTML = `
                        <div style="font-weight: 600;">${p.name}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary);">@${p.username}</div>
                    `;
                    div.onclick = () => selectPlayer(p);
                    searchResults.appendChild(div);
                });
            } else {
                searchResults.style.display = 'none';
            }
        });

        // Close search on blur
        document.addEventListener('click', (e) => {
            if (!playerSearch.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });

    } catch (error) {
        console.error('Error fetching players:', error);
    }
}

function selectPlayer(p) {
    selectedPlayerId = p._id;
    playerSearch.value = '';
    searchResults.style.display = 'none';
    
    selectedPlayerName.textContent = p.name;
    selectedPlayerUsername.textContent = `@${p.username}`;
    viewStatsLink.href = `player-view.html?id=${p._id}`;
    
    selectedPlayerProfile.style.display = 'flex';
}

function resetSearch() {
    selectedPlayerId = null;
    playerSearch.value = '';
    selectedPlayerProfile.style.display = 'none';
    searchResults.style.display = 'none';
}

addPlayerBtn.addEventListener('click', () => {
    addPlayerFormContainer.style.display = 'block';
    addPlayerBtn.style.display = 'none';
});

cancelPlayerBtn.addEventListener('click', () => {
    addPlayerFormContainer.style.display = 'none';
    addPlayerBtn.style.display = 'block';
});

addPlayerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = selectedPlayerId;

    if (!userId) {
        alert('Please search and select a player first');
        return;
    }

    try {
        await fetchAPI(`/teams/${teamId}/players`, {
            method: 'POST',
            body: JSON.stringify({ userId })
        });

        // Reset form and reload
        addPlayerForm.reset();
        resetSearch();
        addPlayerFormContainer.style.display = 'none';
        addPlayerBtn.style.display = 'block';
        loadTeamDetails();
    } catch (error) {
        alert(error.message);
    }
});

const deleteTeamBtn = document.getElementById('deleteTeamBtn');
deleteTeamBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete this team? All associated players will be permanently removed!')) {
        try {
            await fetchAPI(`/teams/${teamId}`, { method: 'DELETE' });
            window.location.href = 'teams.html';
        } catch (error) {
            alert('Failed to delete team: ' + error.message);
        }
    }
});

async function loadTeamDetails() {
    try {
        const team = await fetchAPI(`/teams/${teamId}`);

        const loggedInUser = JSON.parse(localStorage.getItem('user'));
        if (team.createdBy === loggedInUser._id) {
            deleteTeamBtn.style.display = 'inline-block';
        }

        teamHeader.innerHTML = `
            <h1 style="color: var(--primary-color);">${team.name}</h1>
            <p style="color: var(--text-secondary); font-size: 1.1em;">${team.city || 'No Location'}</p>
        `;

        playersList.innerHTML = '';
        teamPlayersIds = []; // Reset team members tracking

        if (team.players && team.players.length > 0) {
            team.players.forEach(player => {
                teamPlayersIds.push(player._id); // Tracking current members
                const item = document.createElement('div');
                item.className = 'player-card glass';
                item.style.marginBottom = '10px';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';

                item.innerHTML = `
                    <div>
                        <h4 style="margin-bottom: 5px; font-weight: 700;">${player.name}</h4>
                        <span style="background: rgba(255,255,255,0.05); padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">${player.role}</span>
                    </div>
                    <div style="text-align: right; font-size: 0.85rem; color: var(--text-secondary);">
                        <div style="font-weight: 600; color: var(--text-primary);">${player.battingStyle}</div>
                        <div>${player.bowlingStyle}</div>
                    </div>
                `;
                playersList.appendChild(item);
            });
        } else {
            playersList.innerHTML = '<p style="color: var(--text-secondary);">No players added yet.</p>';
        }

    } catch (error) {
        teamHeader.innerHTML = `<p class="message message-error">Error loading team: ${error.message}</p>`;
    }
}
