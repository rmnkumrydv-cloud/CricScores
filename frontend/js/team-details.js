const urlParams = new URLSearchParams(window.location.search);
const teamId = urlParams.get('id');

const teamHeader = document.getElementById('teamHeader');
const playersList = document.getElementById('playersList');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const addPlayerFormContainer = document.getElementById('addPlayerFormContainer');
const addPlayerForm = document.getElementById('addPlayerForm');
const cancelPlayerBtn = document.getElementById('cancelPlayerBtn');

if (!teamId) {
    alert('No team specified');
    window.location.href = 'teams.html';
}

// Load team details on startup
document.addEventListener('DOMContentLoaded', () => {
    loadTeamDetails();
    loadAvailablePlayers();
});

async function loadAvailablePlayers() {
    try {
        const players = await fetchAPI('/users/players');
        const playerSelect = document.getElementById('playerSelect');
        playerSelect.innerHTML = '<option value="">-- Select a Player --</option>';
        
        players.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p._id; // userId
            opt.textContent = `${p.name} (@${p.username})`;
            playerSelect.appendChild(opt);
        });
    } catch (error) {
        console.error('Error loading players:', error);
        document.getElementById('playerSelect').innerHTML = '<option value="">Error loading players</option>';
    }
}

document.getElementById('playerSelect').addEventListener('change', (e) => {
    const userId = e.target.value;
    const viewStatsLink = document.getElementById('viewStatsLink');
    if (userId) {
        viewStatsLink.href = `player-view.html?id=${userId}`;
        viewStatsLink.style.display = 'inline-block';
    } else {
        viewStatsLink.style.display = 'none';
    }
});

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
    const userId = document.getElementById('playerSelect').value;

    if (!userId) {
        alert('Please select a player');
        return;
    }

    try {
        await fetchAPI(`/teams/${teamId}/players`, {
            method: 'POST',
            body: JSON.stringify({ userId })
        });

        // Reset form and reload
        addPlayerForm.reset();
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

        if (team.players && team.players.length > 0) {
            team.players.forEach(player => {
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
