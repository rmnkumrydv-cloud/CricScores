const teamsGrid = document.getElementById('teamsGrid');
const createTeamBtn = document.getElementById('createTeamBtn');
const createTeamFormContainer = document.getElementById('createTeamFormContainer');
const createTeamForm = document.getElementById('createTeamForm');
const cancelCreateBtn = document.getElementById('cancelCreateBtn');
const playerSearch = document.getElementById('playerSearch');
const searchResults = document.getElementById('searchResults');
const selectedPlayersContainer = document.getElementById('selectedPlayersContainer');

let allPlayers = [];
let selectedPlayers = [];

// Load teams on startup
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'umpire') {
        createTeamBtn.style.display = 'block';
        fetchAllPlayers();
    }
    loadTeams();
});

async function fetchAllPlayers() {
    try {
        allPlayers = await fetchAPI('/users/players');
    } catch (err) {
        console.error('Error fetching players for search', err);
    }
}

if (playerSearch) {
    playerSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        searchResults.innerHTML = '';
        if (!term) return;

        const filtered = allPlayers.filter(p => {
            const isAlreadySelected = selectedPlayers.find(sp => sp._id === p._id);
            if (isAlreadySelected) return false;

            const nameMatch = (p.name || '').toLowerCase().includes(term);
            const usernameMatch = (p.username || '').toLowerCase().includes(term);
            return nameMatch || usernameMatch;
        });
        
        filtered.slice(0, 5).forEach(p => {
            const div = document.createElement('div');
            div.style.padding = '8px 12px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid #333';
            div.textContent = `${p.name} (@${p.username})`;
            div.onclick = () => {
                selectedPlayers.push(p);
                playerSearch.value = '';
                searchResults.innerHTML = '';
                renderSelectedPlayers();
            };
            searchResults.appendChild(div);
        });
    });
}

function renderSelectedPlayers() {
    selectedPlayersContainer.innerHTML = '';
    selectedPlayers.forEach((p, index) => {
        const chip = document.createElement('div');
        chip.style.background = 'var(--primary-color)';
        chip.style.color = '#000';
        chip.style.padding = '4px 10px';
        chip.style.borderRadius = '15px';
        chip.style.fontSize = '0.85em';
        chip.style.display = 'flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '5px';
        
        chip.innerHTML = `<span>${p.name}</span> <span style="font-weight: bold; cursor: pointer;">&times;</span>`;
        chip.querySelector('span:last-child').onclick = () => {
            selectedPlayers.splice(index, 1);
            renderSelectedPlayers();
        };
        selectedPlayersContainer.appendChild(chip);
    });
}

createTeamBtn.addEventListener('click', () => {
    createTeamFormContainer.style.display = 'block';
    createTeamBtn.style.display = 'none';
});

cancelCreateBtn.addEventListener('click', () => {
    createTeamFormContainer.style.display = 'none';
    createTeamBtn.style.display = 'block';
});

createTeamForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('teamName').value;
    const city = document.getElementById('teamCity').value;
    const submitBtn = createTeamForm.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const newTeam = await fetchAPI('/teams', {
            method: 'POST',
            body: JSON.stringify({ name, city })
        });

        // Add selected players sequentially
        for (const p of selectedPlayers) {
            try {
                await fetchAPI(`/teams/${newTeam._id}/players`, {
                    method: 'POST',
                    body: JSON.stringify({ userId: p._id })
                });
            } catch (err) {
                console.error(`Failed to add player ${p.name}:`, err);
            }
        }

        // Reset form and reload list
        createTeamForm.reset();
        selectedPlayers = [];
        renderSelectedPlayers();
        createTeamFormContainer.style.display = 'none';
        createTeamBtn.style.display = 'block';
        loadTeams();
    } catch (error) {
        alert(error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Team';
    }
});

async function loadTeams() {
    try {
        const teams = await fetchAPI('/teams/my');

        teamsGrid.innerHTML = '';

        if (teams.length === 0) {
            teamsGrid.innerHTML = '<p class="text-secondary">No teams found. Create one to get started!</p>';
            return;
        }

        teams.forEach(team => {
            const card = document.createElement('div');
            card.className = 'card glass';
            card.innerHTML = `
                <h3>${team.name}</h3>
                <p style="color: var(--text-secondary); margin-bottom: 10px;">${team.city || 'No Location'}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                    <span style="font-size: 0.9em; color: #888;">Players: ${team.players.length}</span>
                    <a href="team-details.html?id=${team._id}" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.9em;">View Details</a>
                </div>
            `;
            teamsGrid.appendChild(card);
        });
    } catch (error) {
        teamsGrid.innerHTML = `<p class="message message-error">Error loading teams: ${error.message}</p>`;
    }
}
