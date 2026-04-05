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

const editTeamFormContainer = document.getElementById('editTeamFormContainer');
const editTeamForm = document.getElementById('editTeamForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editTeamName = document.getElementById('editTeamName');
const editTeamCity = document.getElementById('editTeamCity');
const editTeamCaptain = document.getElementById('editTeamCaptain');

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

cancelEditBtn.addEventListener('click', () => {
    editTeamFormContainer.style.display = 'none';
});

editTeamForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = editTeamForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    try {
        await fetchAPI(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: editTeamName.value,
                city: editTeamCity.value,
                captain: editTeamCaptain.value || null
            })
        });
        editTeamFormContainer.style.display = 'none';
        loadTeamDetails();
    } catch(err) {
        alert(err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
});

async function removePlayer(playerId) {
    if (confirm('Are you sure you want to remove this player from the team?')) {
        try {
            await fetchAPI(`/teams/${teamId}/players/${playerId}`, { method: 'DELETE' });
            loadTeamDetails();
        } catch(err) {
            alert('Failed to remove player: ' + err.message);
        }
    }
}

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
        const isOwner = team.createdBy === loggedInUser._id;

        if (isOwner) {
            deleteTeamBtn.style.display = 'inline-block';
            editTeamName.value = team.name;
            editTeamCity.value = team.city || '';
            editTeamCaptain.innerHTML = '<option value="">No Captain</option>';
        }

        let editBtnHTML = '';
        if (isOwner) {
            editBtnHTML = `<button onclick="document.getElementById('editTeamFormContainer').style.display='block'" class="btn btn-secondary" style="font-size: 0.8rem; padding: 5px 10px; margin-left: 10px;">Edit Info</button>`;
        }

        teamHeader.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h1 style="color: var(--primary-color); display: inline-block;">${team.name}</h1>
                    ${editBtnHTML}
                    <p style="color: var(--text-secondary); font-size: 1.1em; margin-top: 5px;">${team.city || 'No Location'}</p>
                </div>
            </div>
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

                if (isOwner) {
                    const isCaptain = team.captain === player._id;
                    editTeamCaptain.innerHTML += `<option value="${player._id}" ${isCaptain ? 'selected' : ''}>${player.name}</option>`;
                }

                const isCaptainLabel = team.captain === player._id ? `<span style="background: var(--primary-color); color: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; margin-left: 5px; font-weight: bold; vertical-align: middle;">C</span>` : '';

                let removeBtnHTML = '';
                if (isOwner) {
                    removeBtnHTML = `<button onclick="removePlayer('${player._id}')" class="btn" style="background: var(--error-color); color: white; padding: 4px 10px; font-size: 0.75rem; border-radius: 6px;">Remove</button>`;
                }

                item.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div>
                            <h4 style="margin-bottom: 5px; font-weight: 700; display: flex; align-items: center;"><a href="player-profile.html?id=${player._id}" style="color: inherit; text-decoration: none; cursor: pointer;">${player.name}</a> ${isCaptainLabel}</h4>
                            <span style="background: rgba(255,255,255,0.05); padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">${player.role}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="text-align: right; font-size: 0.85rem; color: var(--text-secondary);">
                                <div style="font-weight: 600; color: var(--text-primary);">${player.battingStyle}</div>
                                <div>${player.bowlingStyle}</div>
                            </div>
                            ${removeBtnHTML}
                        </div>
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
