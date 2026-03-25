document.addEventListener('DOMContentLoaded', init);

const team1Select = document.getElementById('team1Select');
const team2Select = document.getElementById('team2Select');
const tournamentSelect = document.getElementById('tournamentSelect');
const team1PlayersEl = document.getElementById('team1Players');
const team2PlayersEl = document.getElementById('team2Players');
const team1Counter = document.getElementById('team1Counter');
const team2Counter = document.getElementById('team2Counter');
const startBtn = document.getElementById('startSetupBtn');

let teams = [];
let tournaments = [];
let selectedPlayers1 = [];
let selectedPlayers2 = [];

async function init() {
    try {
        const [teamsData, tournamentsData] = await Promise.all([
            fetchAPI('/teams'),
            fetchAPI('/tournaments')
        ]);

        teams = teamsData;
        tournaments = tournamentsData;

        tournaments.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t._id;
            opt.textContent = t.name;
            tournamentSelect.appendChild(opt);
        });

        const urlParams = new URLSearchParams(window.location.search);
        const urlTourneyId = urlParams.get('tournamentId');
        if (urlTourneyId) {
            tournamentSelect.value = urlTourneyId;
            tournamentSelect.disabled = true; // Lock it in
        }

        teams.forEach(team => {
            const opt1 = document.createElement('option');
            opt1.value = team._id;
            opt1.textContent = team.name;
            team1Select.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = team._id;
            opt2.textContent = team.name;
            team2Select.appendChild(opt2);
        });

        team1Select.addEventListener('change', (e) => loadPlayers(e.target.value, 1));
        team2Select.addEventListener('change', (e) => loadPlayers(e.target.value, 2));

        startBtn.addEventListener('click', handleProceed);
    } catch (error) {
        console.error('Error loading data', error);
    }
}

async function loadPlayers(teamId, teamNum) {
    if (!teamId) return;

    try {
        // Fetch players for this team (Assuming backend has /api/teams/:id/players)
        // For now, let's assume we can fetch them or they are already populated in team object
        const selectedTeam = teams.find(t => t._id === teamId);

        // If team object doesn't have players, we might need an API call
        // Assuming team.players is populated or we fetch from /players?teamId=...
        const players = await fetchAPI(`/teams/${teamId}/players`);

        const container = teamNum === 1 ? team1PlayersEl : team2PlayersEl;
        container.innerHTML = '';

        players.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-item';
            item.innerHTML = `
                <input type="checkbox" value="${player._id}" data-name="${player.name}">
                <label>${player.name} (${player.role})</label>
            `;

            const checkbox = item.querySelector('input');
            checkbox.addEventListener('change', (e) => updateSelection(e, teamNum));

            container.appendChild(item);
        });

        updateCounter(teamNum);

        // Show Select All link
        document.getElementById(`team${teamNum}SelectAll`).style.display = 'inline';
    } catch (error) {
        console.error('Error loading players', error);
    }
}

function updateSelection(e, teamNum) {
    const id = e.target.value;
    if (teamNum === 1) {
        if (e.target.checked) selectedPlayers1.push(id);
        else selectedPlayers1 = selectedPlayers1.filter(pid => pid !== id);
    } else {
        if (e.target.checked) selectedPlayers2.push(id);
        else selectedPlayers2 = selectedPlayers2.filter(pid => pid !== id);
    }
    updateCounter(teamNum);
    checkValidity();
}

function updateCounter(teamNum) {
    const count = teamNum === 1 ? selectedPlayers1.length : selectedPlayers2.length;
    const el = teamNum === 1 ? team1Counter : team2Counter;
    el.textContent = `Players selected: ${count}/11`;
    if (count === 11) el.classList.add('valid');
    else el.classList.remove('valid');
}

function checkValidity() {
    startBtn.disabled = !(selectedPlayers1.length === 11 && selectedPlayers2.length === 11 && team1Select.value !== team2Select.value);
}

function toggleAll(teamNum) {
    const container = teamNum === 1 ? team1PlayersEl : team2PlayersEl;
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const link = document.getElementById(`team${teamNum}SelectAll`);

    // Determine if we should select all or none
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        const id = cb.value;
        if (teamNum === 1) {
            if (cb.checked) {
                if (!selectedPlayers1.includes(id)) selectedPlayers1.push(id);
            } else {
                selectedPlayers1 = selectedPlayers1.filter(pid => pid !== id);
            }
        } else {
            if (cb.checked) {
                if (!selectedPlayers2.includes(id)) selectedPlayers2.push(id);
            } else {
                selectedPlayers2 = selectedPlayers2.filter(pid => pid !== id);
            }
        }
    });

    link.textContent = allChecked ? 'Select All' : 'Deselect All';
    updateCounter(teamNum);
    checkValidity();
}

async function handleProceed() {
    try {
        const totalOvers = parseInt(document.getElementById('oversInput').value) || 20;
        const payload = {
            team1Id: team1Select.value,
            team2Id: team2Select.value,
            tournamentId: tournamentSelect.value || null,
            playingXI1: selectedPlayers1,
            playingXI2: selectedPlayers2,
            venue: 'Main Stadium',
            date: new Date(),
            totalOvers
        };

        const match = await fetchAPI('/matches/initialize', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        window.location.href = `toss.html?id=${match._id}`;
    } catch (error) {
        alert(error.message);
    }
}
