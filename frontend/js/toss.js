const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get('id');

const coin = document.getElementById('coin');
const tossResultEl = document.getElementById('tossResult');
const decisionBox = document.getElementById('decisionBox');
const matchTitle = document.getElementById('matchTitle');
const tossIntro = document.getElementById('tossIntro');

let match = null;
let tossWinnerId = null;

async function loadMatch() {
    if (!matchId) return;
    try {
        match = await fetchAPI(`/matches/${matchId}`);
        matchTitle.textContent = `${match.innings[0].battingTeam.name} vs ${match.innings[1].battingTeam.name}`;
    } catch (error) {
        console.error('Failed to load match', error);
    }
}

document.getElementById('coinBox').addEventListener('click', flipCoin);

async function flipCoin() {
    if (coin.classList.contains('spinning')) return;

    tossIntro.textContent = "Flipping...";
    coin.classList.add('spinning');
    tossResultEl.classList.remove('show');
    decisionBox.style.display = 'none';

    // Randomize winner
    const winnerIdx = Math.random() > 0.5 ? 0 : 1;
    const tossWinner = winnerIdx === 0 ? match.innings[0].battingTeam : match.innings[1].battingTeam;
    tossWinnerId = tossWinner._id;

    // Calculate rotation: 5-7 full spins + target side
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const targetRotation = (winnerIdx === 0 ? 0 : 180) + (extraSpins * 360);

    setTimeout(() => {
        coin.classList.remove('spinning');
        coin.style.transform = `rotateY(${targetRotation}deg)`;

        setTimeout(() => {
            tossResultEl.textContent = `${tossWinner.name} won the toss!`;
            tossResultEl.classList.add('show');
            tossIntro.style.display = 'none';
            decisionBox.style.display = 'flex';
        }, 500);
    }, 3000);
}

async function makeDecision(decision) {
    try {
        const buttons = decisionBox.querySelectorAll('button');
        buttons.forEach(b => b.disabled = true);

        await fetchAPI(`/matches/${matchId}/start`, {
            method: 'PUT',
            body: JSON.stringify({
                tossWinner: tossWinnerId,
                tossDecision: decision
            })
        });

        document.getElementById('finalLoading').style.display = 'block';
        setTimeout(() => {
            window.location.href = `match-scoring.html?id=${matchId}`;
        }, 1500);
    } catch (error) {
        alert(error.message);
        const buttons = decisionBox.querySelectorAll('button');
        buttons.forEach(b => b.disabled = false);
    }
}

loadMatch();
