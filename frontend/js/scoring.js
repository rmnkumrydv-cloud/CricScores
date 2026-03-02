const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get('id');

// DOM Elements
const scoreEl = document.getElementById('score');
const wicketsEl = document.getElementById('wickets');
const oversEl = document.getElementById('overs');
const crrEl = document.getElementById('crr');
const projScoreEl = document.getElementById('projScore');
const rrrEl = document.getElementById('rrr');
const targetEl = document.getElementById('target');
const winProbEl = document.getElementById('winProb');
const battingTeamEl = document.getElementById('battingTeam');
const lastBallDetail = document.getElementById('lastBallDetail');
const matchHeader = document.getElementById('matchHeader');

// Player Elements
const strikerNameEl = document.getElementById('strikerName');
const nonStrikerNameEl = document.getElementById('nonStrikerName');
const bowlerNameEl = document.getElementById('bowlerName');
const strikerCard = document.getElementById('strikerCard');
const nonStrikerCard = document.getElementById('nonStrikerCard');

let match = null;
let currentInningsIdx = 0;
let inningsData = null;

// Scoring State
let strikerId = null;
let nonStrikerId = null;
let bowlerId = null;
let isFirstBall = true;

async function loadMatch() {
    try {
        match = await fetchAPI(`/matches/${matchId}`);

        // Safety checks for innings
        if (!match.innings || match.innings.length === 0) {
            alert("Match data is corrupted or incomplete. Please check match setup.");
            return;
        }

        matchHeader.textContent = `${match.innings[0].battingTeam?.name || 'Team A'} vs ${match.innings[1]?.battingTeam?.name || 'Team B'} at ${match.venue}`;

        if (match.innings[0].status === 'Completed') currentInningsIdx = 1;
        inningsData = match.innings[currentInningsIdx];

        // Load state from backend
        strikerId = match.currentStriker?._id || match.currentStriker;
        nonStrikerId = match.currentNonStriker?._id || match.currentNonStriker;
        bowlerId = match.currentBowler?._id || match.currentBowler;

        updateUI();
        checkAndPromptPlayers();
    } catch (error) {
        console.error('Error loading match', error);
        alert("Error loading match: " + error.message);
    }
}

function updateUI() {
    battingTeamEl.textContent = inningsData.battingTeam.name;
    scoreEl.textContent = inningsData.runs;
    wicketsEl.textContent = inningsData.wickets;
    oversEl.textContent = formatOvers(getLegalBalls(inningsData));

    // Stats
    const totalBalls = getLegalBalls(inningsData);
    const crr = totalBalls > 0 ? (inningsData.runs / (totalBalls / 6)) : 0;
    crrEl.textContent = crr.toFixed(2);

    if (currentInningsIdx === 0) {
        projScoreEl.textContent = Math.round(crr * 20);
        targetEl.textContent = '-';
        rrrEl.textContent = '-';
    } else {
        const target = match.innings[0].runs + 1;
        targetEl.textContent = target;
        const runsLeft = target - inningsData.runs;
        const ballsLeft = 120 - totalBalls;
        rrrEl.textContent = ballsLeft > 0 ? ((runsLeft / ballsLeft) * 6).toFixed(2) : '0.00';
    }

    updateWinProbability();
    updatePlayerDisplays();
}

function formatOvers(balls) {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function getLegalBalls(innings) {
    let balls = 0;
    innings.oversHistory.forEach(over => {
        balls += over.balls.filter(b => !b.isExtra || (b.extraType !== 'Wide' && b.extraType !== 'NoBall')).length;
    });
    return balls;
}

function updatePlayerDisplays() {
    const players = inningsData.battingTeam.players;
    const bowlingPlayers = inningsData.bowlingTeam.players;

    const striker = players.find(p => p._id === strikerId);
    const nonStriker = players.find(p => p._id === nonStrikerId);
    const bowler = bowlingPlayers.find(p => p._id === bowlerId);

    strikerNameEl.textContent = striker ? striker.name : 'Select...';
    nonStrikerNameEl.textContent = nonStriker ? nonStriker.name : 'Select...';
    bowlerNameEl.textContent = bowler ? bowler.name : 'Select...';

    // Highlight striker
    strikerCard.classList.add('active');
    nonStrikerCard.classList.remove('active');
}

function updateWinProbability() {
    if (currentInningsIdx === 0) {
        winProbEl.textContent = "50%";
        return;
    }
    const target = match.innings[0].runs + 1;
    const runsLeft = target - inningsData.runs;
    const ballsLeft = 120 - getLegalBalls(inningsData);
    const wicketsLeft = 10 - inningsData.wickets;

    let prob = 50 + (wicketsLeft * 5) - (runsLeft / Math.max(1, ballsLeft)) * 10;
    prob = Math.max(5, Math.min(95, prob));
    winProbEl.textContent = Math.round(prob) + "%";
}

async function handleBall(runs, isExtra = false, extraType = null, wicketDetail = null) {
    if (!strikerId || !nonStrikerId || !bowlerId) {
        alert("Please select striker, non-striker and bowler first!");
        checkAndPromptPlayers();
        return;
    }

    try {
        const ballData = {
            runs,
            isExtra,
            extraType,
            event: wicketDetail ? 'Wicket' : runs.toString(),
            wicketDetail,
            batsman: strikerId,
            nonStriker: nonStrikerId,
            bowler: bowlerId
        };

        const updatedMatch = await fetchAPI(`/matches/${matchId}/ball`, {
            method: 'POST',
            body: JSON.stringify({ inningsIndex: currentInningsIdx, ballData })
        });

        match = updatedMatch;
        inningsData = match.innings[currentInningsIdx];

        lastBallDetail.textContent = ballData.event + (extraType ? ` (${extraType})` : '');

        // Strike Rotation logic
        if (!isExtra || (extraType === 'Bye' || extraType === 'LegBye')) {
            if (runs % 2 !== 0) rotateStrike();
        }

        updateUI();

        // Check for over end
        const currentOverBalls = inningsData.oversHistory[inningsData.oversHistory.length - 1].balls.filter(b => !b.isExtra || (b.extraType !== 'Wide' && b.extraType !== 'NoBall')).length;

        if (currentOverBalls === 6) {
            alert("End of Over!");
            rotateStrike();
            promptNewBowler();
        }

        // Check for Innings End
        const target = currentInningsIdx === 1 ? (match.innings[0].runs + 1) : Infinity;
        if (inningsData.runs >= target || inningsData.wickets >= 10 || getLegalBalls(inningsData) >= 120) {
            handleInningsEnd();
        } else if (wicketDetail) {
            // Check if it's a "cross" dismissal or if non-striker got out
            const outId = wicketDetail.outId;
            const type = wicketDetail.type;

            if (type === 'Run Out') {
                // In Run Out, non-striker can get out
                if (outId === strikerId) strikerId = null;
                else nonStrikerId = null;
            } else {
                // For other dismissals, striker is out
                strikerId = null;
            }

            promptNewBatsman();
        }

    } catch (error) {
        alert(error.message);
    }
}

function rotateStrike() {
    const temp = strikerId;
    strikerId = nonStrikerId;
    nonStrikerId = temp;
}

function checkAndPromptPlayers() {
    if (!strikerId || !nonStrikerId) promptNewInningsPlayers();
    else if (!bowlerId) promptNewBowler();
}

function promptNewInningsPlayers() {
    const players = currentInningsIdx === 0 ? match.playingXI1 : match.playingXI2;
    const bowlingPlayers = currentInningsIdx === 0 ? match.playingXI2 : match.playingXI1;

    showSelectionModal('Select Opening Pair', [
        { label: 'Striker', id: 'strikerSelect', options: players },
        { label: 'Non-Striker', id: 'nonStrikerSelect', options: players },
        { label: 'Opening Bowler', id: 'bowlerSelect', options: bowlingPlayers }
    ], async (data) => {
        strikerId = data.strikerSelect;
        nonStrikerId = data.nonStrikerSelect;
        bowlerId = data.bowlerSelect;

        // Save to backend
        try {
            await fetchAPI(`/matches/${matchId}/players`, {
                method: 'PUT',
                body: JSON.stringify({ strikerId, nonStrikerId, bowlerId })
            });
            updateUI();
        } catch (error) {
            alert("Failed to save player selection: " + error.message);
        }
    });
}

function promptNewBowler() {
    const bowlingPlayers = (currentInningsIdx === 0 ? match.playingXI2 : match.playingXI1).filter(p => p._id !== bowlerId);
    showSelectionModal('Select New Bowler', [
        { label: 'Bowler', id: 'bowlerSelect', options: bowlingPlayers }
    ], async (data) => {
        bowlerId = data.bowlerSelect;

        try {
            await fetchAPI(`/matches/${matchId}/players`, {
                method: 'PUT',
                body: JSON.stringify({ bowlerId })
            });
            updateUI();
        } catch (error) {
            alert("Failed to save bowler: " + error.message);
        }
    });
}

function promptNewBatsman() {
    const battingStats = inningsData.battingStats || [];
    const battedPlayerIds = battingStats.filter(s => s.isOut).map(s => (s.player._id || s.player).toString());
    const playingXI = currentInningsIdx === 0 ? match.playingXI1 : match.playingXI2;

    // Filter out players who are already out or currently at crease
    const availablePlayers = playingXI.filter(p => !battedPlayerIds.includes(p._id.toString()) && p._id.toString() !== strikerId && p._id.toString() !== nonStrikerId);

    showSelectionModal('New Batsman', [
        { label: 'Next Batsman', id: 'newBatsmanSelect', options: availablePlayers }
    ], async (data) => {
        const newBatsmanId = data.newBatsmanSelect;
        if (!strikerId) strikerId = newBatsmanId;
        else nonStrikerId = newBatsmanId;

        try {
            await fetchAPI(`/matches/${matchId}/players`, {
                method: 'PUT',
                body: JSON.stringify({ strikerId, nonStrikerId })
            });
            updateUI();
        } catch (error) {
            alert("Failed to save batsman: " + error.message);
        }
    });
}

let selectionCallback = null;
function showSelectionModal(title, fields, callback) {
    document.getElementById('selectionTitle').textContent = title;
    const form = document.getElementById('selectionForm');
    form.innerHTML = fields.map(f => `
        <div class="form-group">
            <label>${f.label}</label>
            <select id="${f.id}" class="form-control">
                ${f.options.map(opt => `<option value="${opt._id}">${opt.name}</option>`).join('')}
            </select>
        </div>
    `).join('');

    selectionCallback = callback;
    document.getElementById('selectionModal').style.display = 'flex';
}

function confirmSelection() {
    const form = document.getElementById('selectionForm');
    const selects = form.querySelectorAll('select');
    const data = {};
    selects.forEach(s => data[s.id] = s.value);

    document.getElementById('selectionModal').style.display = 'none';
    if (selectionCallback) selectionCallback(data);
}

function handleExtra(type) {
    let runs = (type === 'Wide' || type === 'NoBall') ? 1 : 0;
    if (type === 'Bye' || type === 'LegBye') {
        const extraRuns = prompt(`Enter ${type} runs:`, "1");
        runs = parseInt(extraRuns) || 0;
    } else if (type === 'Wide' || type === 'NoBall') {
        const extraRuns = prompt(`Enter runs from ${type} (excluding penalty):`, "0");
        runs += (parseInt(extraRuns) || 0);
    }
    handleBall(runs, true, type);
}

function openWicketModal() {
    const striker = inningsData.battingTeam.players.find(p => p._id === strikerId);
    const nonStriker = inningsData.battingTeam.players.find(p => p._id === nonStrikerId);

    const outSelect = document.getElementById('outBatsmanSelect');
    outSelect.innerHTML = `
        <option value="${strikerId}">${striker ? striker.name : 'Striker'}</option>
        <option value="${nonStrikerId}">${nonStriker ? nonStriker.name : 'Non-Striker'}</option>
    `;

    // Populate fielders
    const fielders = inningsData.bowlingTeam.players;
    const fielderSelect = document.getElementById('fielderSelect');
    fielderSelect.innerHTML = fielders.map(f => `<option value="${f._id}">${f.name}</option>`).join('');

    document.getElementById('wicketModal').style.display = 'flex';
}

function toggleDismissalFields() {
    const type = document.getElementById('dismissalType').value;
    const group = document.getElementById('fielderGroup');
    const label = document.getElementById('fielderLabel');
    if (['Caught', 'Run Out', 'Stumped'].includes(type)) {
        group.style.display = 'block';
        label.textContent = type === 'Caught' ? 'Caught by' : (type === 'Stumped' ? 'Wicketkeeper' : 'Fielder');
    } else {
        group.style.display = 'none';
    }
}

async function submitWicket() {
    const outId = document.getElementById('outBatsmanSelect').value;
    const type = document.getElementById('dismissalType').value;
    const fielder = document.getElementById('fielderSelect').value;

    const wicketDetail = { type, outId };
    if (['Caught', 'Run Out', 'Stumped'].includes(type)) wicketDetail.fielder = fielder;

    await handleBall(0, false, null, wicketDetail);
    closeWicketModal();
}

function closeWicketModal() {
    document.getElementById('wicketModal').style.display = 'none';
}

function handleInningsEnd() {
    if (currentInningsIdx === 0) {
        alert("Innings Over! Target set: " + (inningsData.runs + 1));
        window.location.reload();
    } else {
        alert("Match Finished!");
        window.location.href = `match-result.html?id=${matchId}`;
    }
}

document.addEventListener('DOMContentLoaded', loadMatch);
