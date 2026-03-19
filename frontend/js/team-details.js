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
document.addEventListener('DOMContentLoaded', loadTeamDetails);

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
    const name = document.getElementById('playerName').value;
    const role = document.getElementById('playerRole').value;
    const battingStyle = document.getElementById('battingStyle').value;
    const bowlingStyle = document.getElementById('bowlingStyle').value;

    try {
        await fetchAPI(`/teams/${teamId}/players`, {
            method: 'POST',
            body: JSON.stringify({ name, role, battingStyle, bowlingStyle })
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

async function loadTeamDetails() {
    try {
        const team = await fetchAPI(`/teams/${teamId}`);

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
