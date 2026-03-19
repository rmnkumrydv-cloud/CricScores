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
        projScoreEl.textContent = Math.round(crr * (match.totalOvers || 20));
        targetEl.textContent = '-';
        rrrEl.textContent = '-';
    } else {
        const target = (match.innings[0].runs || 0) + 1;
        targetEl.textContent = target;
        const runsLeft = target - inningsData.runs;
        const totalLegalBalls = getLegalBalls(inningsData);
        const totalBallsLimit = (match.totalOvers || 20) * 6;
        const ballsRemaining = totalBallsLimit - totalLegalBalls;
        rrrEl.textContent = ballsRemaining > 0 ? ((runsLeft / ballsRemaining) * 6).toFixed(2) : '0.00';
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

function updateWinProbability() {
    if (!winProbEl) return;

    if (currentInningsIdx === 0) {
        winProbEl.textContent = '50% - 50%';
        return;
    }

    const target = match.innings[0].runs + 1;
    const runsLeft = target - inningsData.runs;
    const totalBalls = (match.totalOvers || 20) * 6;
    const ballsLeft = totalBalls - getLegalBalls(inningsData);
    const wicketsLeft = 10 - inningsData.wickets;

    if (runsLeft <= 0) {
        winProbEl.textContent = 'Batting Team Won';
        return;
    }
    if (ballsLeft <= 0 || wicketsLeft <= 0) {
        winProbEl.textContent = 'Bowling Team Won';
        return;
    }

    // Simple probability algorithm
    const rrr = (runsLeft / ballsLeft) * 6;
    let battingWinProb = 100 - (rrr * 10) + (wicketsLeft * 5);
    battingWinProb = Math.max(5, Math.min(95, battingWinProb));

    const bowlingWinProb = 100 - battingWinProb;
    winProbEl.textContent = `${battingWinProb.toFixed(0)}% - ${bowlingWinProb.toFixed(0)}%`;
}

function updatePlayerDisplays() {
    const players = inningsData.battingTeam.players || [];
    const bowlingPlayers = inningsData.bowlingTeam.players || [];

    // Fallback search in playingXI if not in players list
    const findSelectedPlayer = (id, list, playingXI) => {
        if (!id) return null;
        // Search in list first (populated or ID list)
        let p = list.find(x => (x._id || x).toString() === id.toString());
        // If not found or not populated, search in playingXI (which should be populated on match)
        if ((!p || !p.name) && playingXI) {
            p = playingXI.find(x => (x._id || x).toString() === id.toString());
        }
        return p;
    };

    const striker = findSelectedPlayer(strikerId, players, currentInningsIdx === 0 ? match.playingXI1 : match.playingXI2);
    const nonStriker = findSelectedPlayer(nonStrikerId, players, currentInningsIdx === 0 ? match.playingXI1 : match.playingXI2);
    const bowler = findSelectedPlayer(bowlerId, bowlingPlayers, currentInningsIdx === 0 ? match.playingXI2 : match.playingXI1);

    strikerNameEl.textContent = (striker && striker.name) ? striker.name : (strikerId ? strikerId.substring(0, 8) + '...' : 'Select...');
    nonStrikerNameEl.textContent = (nonStriker && nonStriker.name) ? nonStriker.name : (nonStrikerId ? nonStrikerId.substring(0, 8) + '...' : 'Select...');
    bowlerNameEl.textContent = (bowler && bowler.name) ? bowler.name : (bowlerId ? bowlerId.substring(0, 8) + '...' : 'Select...');

    // Highlight striker
    strikerCard.classList.add('active');
    nonStrikerCard.classList.remove('active');
}

async function rotateStrike() {
    [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
    try {
        await fetchAPI(`/matches/${matchId}/players`, {
            method: 'PUT',
            body: JSON.stringify({ strikerId, nonStrikerId, bowlerId })
        });
        updateUI();
    } catch (error) {
        console.error("Strike rotation failed", error);
    }
}

function checkAndPromptPlayers() {
    if (!strikerId || !nonStrikerId) promptNewInningsPlayers();
    else if (!bowlerId) promptNewBowler();
}

function promptNewInningsPlayers() {
    const players = currentInningsIdx === 0 ? match.playingXI1 : match.playingXI2;
    const bowlingPlayers = currentInningsIdx === 0 ? match.playingXI2 : match.playingXI1;

    // This is for opening pair, we might still want dropdowns or multi-step tiles
    // Let's use simplified tiles for one at a time for better UX
    promptNewBatsman('striker', 'Select Striker');
}

function promptNewBowler() {
    const bowlingPlayers = (currentInningsIdx === 0 ? match.playingXI2 : match.playingXI1);

    showSelectionModal('Select Bowler', [
        { label: 'Choose a bowler', id: 'bowlerSelect', options: bowlingPlayers, current: bowlerId }
    ], async (data) => {
        bowlerId = data.bowlerSelect;

        try {
            await fetchAPI(`/matches/${matchId}/players`, {
                method: 'PUT',
                body: JSON.stringify({ strikerId, nonStrikerId, bowlerId })
            });
            updateUI();
        } catch (error) {
            alert("Failed to save bowler: " + error.message);
        }
    });
}

async function handleBall(runs, isExtra = false, extraType = null, wicketDetail = null) {
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

        // Restore state from backend (important for strike rotation, etc.)
        strikerId = match.currentStriker?._id || match.currentStriker;
        nonStrikerId = match.currentNonStriker?._id || match.currentNonStriker;
        bowlerId = match.currentBowler?._id || match.currentBowler;

        updateUI();

        if (inningsData.status === 'Completed') {
            setTimeout(() => {
                handleInningsEnd();
            }, 500);
            return;
        }

        updateUI();

        // Check for over end
        const currentOver = inningsData.oversHistory[inningsData.oversHistory.length - 1];
        if (!currentOver) return;

        const currentOverBalls = currentOver.balls.filter(b => !b.isExtra || (b.extraType !== 'Wide' && b.extraType !== 'NoBall')).length;

        if (currentOverBalls === 6) {
            setTimeout(() => {
                alert("End of Over!");
                rotateStrike().then(() => promptNewBowler());
            }, 500);
        }

        // Check for Innings End
        const target = currentInningsIdx === 1 ? (match.innings[0].runs + 1) : Infinity;
        const totalBalls = (match.totalOvers || 20) * 6;
        if (inningsData.runs >= target || inningsData.wickets >= 10 || getLegalBalls(inningsData) >= totalBalls) {
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

            // Small delay to let wicket modal close before next prompt
            setTimeout(() => promptNewBatsman(), 1000);
        }

    } catch (error) {
        alert(error.message);
    }
}

async function undoLastBall() {
    if (!confirm("Are you sure you want to revert the last ball?")) return;

    try {
        const updatedMatch = await fetchAPI(`/matches/${matchId}/undo`, {
            method: 'PUT',
            body: JSON.stringify({ inningsIndex: currentInningsIdx })
        });

        match = updatedMatch;
        inningsData = match.innings[currentInningsIdx];

        // Restore state from backend
        strikerId = match.currentStriker?._id || match.currentStriker;
        nonStrikerId = match.currentNonStriker?._id || match.currentNonStriker;
        bowlerId = match.currentBowler?._id || match.currentBowler;

        updateUI();
        lastBallDetail.textContent = "- (Undone)";
        alert("Decision Reverted!");
    } catch (error) {
        alert("Failed to undo: " + error.message);
    }
}

function promptNewBatsman(position = 'striker', title = 'Select Batsman') {
    const battingStats = inningsData.battingStats || [];
    const outPlayerIds = battingStats.filter(s => s.isOut).map(s => (s.player._id || s.player).toString());
    const playingXI = currentInningsIdx === 0 ? match.playingXI1 : match.playingXI2;

    // Available players: Not out AND not already at the crease in the OTHER position
    const otherId = position === 'striker' ? nonStrikerId?.toString() : strikerId?.toString();
    const availablePlayers = playingXI.filter(p => {
        const pid = (p._id || p).toString();
        return !outPlayerIds.includes(pid) && pid !== otherId;
    });

    showSelectionModal(title, [
        { label: 'Choose a batsman', id: 'batsmanSelect', options: availablePlayers, current: (position === 'striker' ? strikerId : nonStrikerId) }
    ], async (data) => {
        const selectedId = data.batsmanSelect;
        if (position === 'striker') strikerId = selectedId;
        else nonStrikerId = selectedId;

        try {
            await fetchAPI(`/matches/${matchId}/players`, {
                method: 'PUT',
                body: JSON.stringify({ strikerId, nonStrikerId, bowlerId })
            });
            updateUI();

            // If the other batsman is also not selected, prompt for it
            if (!strikerId || !nonStrikerId) promptNewBatsman(strikerId ? 'nonStriker' : 'striker');
            else if (!bowlerId) promptNewBowler();

        } catch (error) {
            alert("Failed to save batsman: " + error.message);
        }
    });
}

let selectionCallback = null;
let currentSelectionData = {};

function showSelectionModal(title, fields, callback) {
    document.getElementById('selectionTitle').textContent = title;
    const form = document.getElementById('selectionForm');
    currentSelectionData = {};

    form.innerHTML = fields.map(f => {
        return `
            <div class="selection-field" id="field_${f.id}">
                <label class="stat-label">${f.label}</label>
                <div class="player-grid">
                    ${f.options.map(opt => `
                        <div class="player-tile ${opt._id?.toString() === f.current?.toString() || opt.toString() === f.current?.toString() ? 'selected' : ''}" 
                             onclick="selectPlayerTile('${f.id}', '${opt._id || opt}')" 
                             id="tile_${opt._id || opt}">
                            <span class="tile-name">${opt.name || 'Unknown Player'}</span>
                            <span class="tile-role">${opt.role || 'Player'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');

    // Pre-fill current selections
    fields.forEach(f => {
        if (f.current) currentSelectionData[f.id] = f.current.toString();
    });

    selectionCallback = callback;
    document.getElementById('selectionModal').style.display = 'flex';
}

function selectPlayerTile(fieldId, playerId) {
    // Unselect others in the same grid
    const grid = document.querySelector(`#field_${fieldId} .player-grid`);
    grid.querySelectorAll('.player-tile').forEach(t => t.classList.remove('selected'));

    // Select this one
    document.getElementById(`tile_${playerId}`).classList.add('selected');
    currentSelectionData[fieldId] = playerId;
}

function confirmSelection() {
    if (Object.keys(currentSelectionData).length === 0) {
        alert("Please make a selection first!");
        return;
    }

    document.getElementById('selectionModal').style.display = 'none';
    if (selectionCallback) selectionCallback(currentSelectionData);
}

function closeSelectionModal() {
    document.getElementById('selectionModal').style.display = 'none';
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
    const players = inningsData.battingTeam.players;
    const striker = players.find(p => p._id.toString() === strikerId?.toString());
    const nonStriker = players.find(p => p._id.toString() === nonStrikerId?.toString());

    const outSelect = document.getElementById('outBatsmanSelect');
    outSelect.innerHTML = `
        <option value="${strikerId}">${striker ? striker.name : 'Striker'}</option>
        <option value="${nonStrikerId}">${nonStriker ? nonStriker.name : 'Non-Striker'}</option>
    `;

    // Populate fielders from bowling team
    const bowlingTeam = inningsData.bowlingTeam;
    // Check if players are directly on bowlingTeam or if it's populated as an object
    const fielders = bowlingTeam.players || [];

    const fielderSelect = document.getElementById('fielderSelect');
    if (fielders.length > 0) {
        fielderSelect.innerHTML = fielders.map(f => `<option value="${f._id}">${f.name}</option>`).join('');
    } else {
        // Fallback: Use playingXI if team players not populated
        const playingXI = currentInningsIdx === 0 ? match.playingXI2 : match.playingXI1;
        if (playingXI && playingXI.length > 0) {
            fielderSelect.innerHTML = playingXI.map(f => `<option value="${f._id || f}">${f.name || 'Player'}</option>`).join('');
        } else {
            fielderSelect.innerHTML = '<option value="">No fielders found</option>';
        }
    }

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

    closeWicketModal();
    await handleBall(0, false, null, wicketDetail);
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
