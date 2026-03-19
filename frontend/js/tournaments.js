const tournamentsGrid = document.getElementById('tournamentsGrid');
const createTournamentBtn = document.getElementById('createTournamentBtn');
const createTournamentFormContainer = document.getElementById('createTournamentFormContainer');
const createTournamentForm = document.getElementById('createTournamentForm');
const cancelTourneyBtn = document.getElementById('cancelTourneyBtn');

// Load tournaments on startup
document.addEventListener('DOMContentLoaded', loadTournaments);

createTournamentBtn.addEventListener('click', () => {
    createTournamentFormContainer.style.display = 'block';
    createTournamentBtn.style.display = 'none';
});

cancelTourneyBtn.addEventListener('click', () => {
    createTournamentFormContainer.style.display = 'none';
    createTournamentBtn.style.display = 'block';
});

createTournamentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('tourneyName').value;
    const organizer = document.getElementById('organizer').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    try {
        await fetchAPI('/tournaments', {
            method: 'POST',
            body: JSON.stringify({ name, organizer, startDate, endDate })
        });

        createTournamentForm.reset();
        createTournamentFormContainer.style.display = 'none';
        createTournamentBtn.style.display = 'block';
        loadTournaments();
    } catch (error) {
        alert(error.message);
    }
});

async function loadTournaments() {
    try {
        const tournaments = await fetchAPI('/tournaments');

        tournamentsGrid.innerHTML = '';

        if (tournaments.length === 0) {
            tournamentsGrid.innerHTML = '<p class="text-secondary">No tournaments found. Host one today!</p>';
            return;
        }

        tournaments.forEach(tourney => {
            const card = document.createElement('div');
            card.className = 'card glass';

            const start = new Date(tourney.startDate).toLocaleDateString();
            const end = new Date(tourney.endDate).toLocaleDateString();

            card.innerHTML = `
                <h3>${tourney.name}</h3>
                <p style="color: var(--primary-color); font-size: 0.9em; margin-bottom: 5px;">${tourney.status}</p>
                <p style="color: var(--text-secondary); font-size: 0.9em;">${start} - ${end}</p>
                <p style="color: var(--text-secondary); margin-bottom: 15px;">Org: ${tourney.organizer}</p>
                <a href="tournament-details.html?id=${tourney._id}" class="btn btn-secondary" style="width: 100%; text-align: center;">View Details</a>
            `;
            tournamentsGrid.appendChild(card);
        });
    } catch (error) {
        tournamentsGrid.innerHTML = `<p class="message message-error">Error loading tournaments: ${error.message}</p>`;
    }
}
