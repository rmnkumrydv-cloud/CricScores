const teamsGrid = document.getElementById('teamsGrid');
const createTeamBtn = document.getElementById('createTeamBtn');
const createTeamFormContainer = document.getElementById('createTeamFormContainer');
const createTeamForm = document.getElementById('createTeamForm');
const cancelCreateBtn = document.getElementById('cancelCreateBtn');

// Load teams on startup
document.addEventListener('DOMContentLoaded', loadTeams);

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

    try {
        await fetchAPI('/teams', {
            method: 'POST',
            body: JSON.stringify({ name, city })
        });

        // Reset form and reload list
        createTeamForm.reset();
        createTeamFormContainer.style.display = 'none';
        createTeamBtn.style.display = 'block';
        loadTeams();
    } catch (error) {
        alert(error.message);
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
