document.addEventListener('DOMContentLoaded', loadPlayerProfile);

async function loadPlayerProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('id');

    if (!playerId) {
        document.getElementById('loadingMessage').style.display = 'none';
        const errorMsg = document.getElementById('errorMessage');
        errorMsg.textContent = 'Player ID not provided in URL.';
        errorMsg.style.display = 'block';
        return;
    }

    try {
        // Fetch both user profile details and their stats
        const [user, stats] = await Promise.all([
            fetchAPI(`/users/${playerId}`),
            fetchAPI(`/users/${playerId}/stats`)
        ]);

        document.getElementById('loadingMessage').style.display = 'none';
        document.getElementById('profileContent').style.display = 'block';

        // Update profile header
        document.getElementById('playerPic').src = user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
        document.getElementById('playerName').textContent = user.name;
        document.getElementById('playerUsername').textContent = user.username;
        
        // Hide missing tags
        const roleTag = document.getElementById('playerRole');
        if (user.playerRole) roleTag.textContent = user.playerRole;
        else roleTag.style.display = 'none';

        const batTag = document.getElementById('playerBattingStyle');
        if (user.battingStyle && user.battingStyle !== 'None') batTag.textContent = user.battingStyle;
        else batTag.style.display = 'none';

        const bowlTag = document.getElementById('playerBowlingStyle');
        if (user.bowlingStyle && user.bowlingStyle !== 'None') bowlTag.textContent = user.bowlingStyle;
        else bowlTag.style.display = 'none';

        // Update stats
        document.getElementById('matchesPlayed').textContent = stats.matchesPlayed || 0;
        document.getElementById('totalRuns').textContent = stats.totalRuns || 0;
        
        const avg = stats.matchesPlayed > 0 ? (stats.totalRuns / stats.matchesPlayed).toFixed(1) : '0.0';
        document.getElementById('battingAvg').textContent = avg;
        
        const sr = stats.ballsFaced > 0 ? ((stats.totalRuns / stats.ballsFaced) * 100).toFixed(1) : '0.0';
        document.getElementById('battingSR').textContent = sr;
        
        document.getElementById('fours').textContent = stats.fours || 0;
        document.getElementById('sixes').textContent = stats.sixes || 0;
        
        document.getElementById('totalWickets').textContent = stats.totalWickets || 0;
        document.getElementById('oversBowled').textContent = (stats.oversBowled || 0).toFixed(1);
        
        const econ = stats.oversBowled > 0 ? (stats.runsConceded / stats.oversBowled).toFixed(1) : '0.0';
        document.getElementById('bowlingEcon').textContent = econ;

    } catch (error) {
        document.getElementById('loadingMessage').style.display = 'none';
        const errorMsg = document.getElementById('errorMessage');
        errorMsg.textContent = `Error loading profile: ${error.message}`;
        errorMsg.style.display = 'block';
    }
}
