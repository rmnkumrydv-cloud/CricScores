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
let allVerifiedPlayers = []; // For global search
let team1PlayersData = []; // Local team players
let team2PlayersData = []; 
let selectedPlayers1 = [];
let selectedPlayers2 = [];

async function init() {
    try {
        const [teamsData, tournamentsData, playersData] = await Promise.all([
            fetchAPI('/teams'),
            fetchAPI('/tournaments'),
            fetchAPI('/users/players')
        ]);

        teams = teamsData;
        tournaments = tournamentsData;
        allVerifiedPlayers = playersData;

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

        // Setup Search Listeners
        setupSearch(1);
        setupSearch(2);

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
        const players = await fetchAPI(`/teams/${teamId}/players`);
        
        if (teamNum === 1) team1PlayersData = players;
        else team2PlayersData = players;

        renderPlayerList(teamNum);
        updateCounter(teamNum);

        // Show Select All link
        document.getElementById(`team${teamNum}SelectAll`).style.display = 'inline';
    } catch (error) {
        console.error('Error loading players', error);
    }
}

function renderPlayerList(teamNum, filterTerm = '') {
    const players = teamNum === 1 ? team1PlayersData : team2PlayersData;
    const container = teamNum === 1 ? team1PlayersEl : team2PlayersEl;
    const selectedIds = teamNum === 1 ? selectedPlayers1 : selectedPlayers2;
    
    container.innerHTML = '';
    
    const term = filterTerm.toLowerCase();
    const filtered = players.filter(p => 
        (p.name || '').toLowerCase().includes(term) || 
        (p.username || '').toLowerCase().includes(term)
    );

    if (filtered.length === 0 && players.length > 0) {
        container.innerHTML = '<p style="text-align: center; color: #555; margin-top: 20px;">No matching players in team</p>';
    }

    filtered.forEach(player => {
        const item = document.createElement('div');
        item.className = 'player-item';
        const isChecked = selectedIds.includes(player._id);
        
        item.innerHTML = `
            <input type="checkbox" value="${player._id}" ${isChecked ? 'checked' : ''}>
            <label>${player.name} (${player.role || 'Player'})</label>
        `;

        const checkbox = item.querySelector('input');
        checkbox.addEventListener('change', (e) => updateSelection(e, teamNum));

        container.appendChild(item);
    });
}

function setupSearch(teamNum) {
    const searchInput = document.getElementById(`team${teamNum}Search`);
    const resultsContainer = document.getElementById(`team${teamNum}GlobalResults`);

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        
        // 1. Filter current list
        renderPlayerList(teamNum, term);

        // 2. Global search if term > 1
        resultsContainer.innerHTML = '';
        if (term.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }

        const teamPlayers = teamNum === 1 ? team1PlayersData : team2PlayersData;
        const teamPlayerIds = teamPlayers.map(p => p._id);
        
        const globalMatches = allVerifiedPlayers.filter(p => 
            !teamPlayerIds.includes(p._id) && 
            ((p.name || '').toLowerCase().includes(term) || (p.username || '').toLowerCase().includes(term))
        ).slice(0, 5);

        if (globalMatches.length > 0) {
            resultsContainer.style.display = 'block';
            const header = document.createElement('div');
            header.style.padding = '5px 10px';
            header.style.fontSize = '0.7em';
            header.style.color = 'var(--primary-color)';
            header.style.background = 'rgba(0,0,0,0.5)';
            header.textContent = 'GLOBAL PLAYERS (Click to add)';
            resultsContainer.appendChild(header);

            globalMatches.forEach(p => {
                const div = document.createElement('div');
                div.className = 'player-item';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                div.innerHTML = `<strong>${p.name}</strong> (@${p.username})`;
                div.onclick = () => {
                    addGlobalPlayer(teamNum, p);
                    searchInput.value = '';
                    resultsContainer.style.display = 'none';
                    renderPlayerList(teamNum);
                };
                resultsContainer.appendChild(div);
            });
        } else {
            resultsContainer.style.display = 'none';
        }
    });

    // Close results on blur
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });
}

function addGlobalPlayer(teamNum, player) {
    const teamData = teamNum === 1 ? team1PlayersData : team2PlayersData;
    const selectedIds = teamNum === 1 ? selectedPlayers1 : selectedPlayers2;

    if (!teamData.find(p => p._id === player._id)) {
        teamData.push(player);
    }
    
    if (!selectedIds.includes(player._id)) {
        selectedIds.push(player._id);
    }

    updateCounter(teamNum);
    checkValidity();
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
    const players = teamNum === 1 ? team1PlayersData : team2PlayersData;
    const selectedIds = teamNum === 1 ? selectedPlayers1 : selectedPlayers2;
    const container = teamNum === 1 ? team1PlayersEl : team2PlayersEl;
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    
    if (checkboxes.length === 0) return;

    // Determine if we should select all or none of the VISIBLE ones
    const allVisibleChecked = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(cb => {
        cb.checked = !allVisibleChecked;
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

    const link = document.getElementById(`team${teamNum}SelectAll`);
    link.textContent = allVisibleChecked ? 'Select All' : 'Deselect All';
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
