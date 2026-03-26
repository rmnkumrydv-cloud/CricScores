document.addEventListener('DOMContentLoaded', () => {
    let cachedUser = JSON.parse(localStorage.getItem('user'));
    if (!cachedUser) {
        window.location.href = 'login.html';
        return;
    }

    let base64ProfilePic = null;
    let isEditMode = false;

    // Immediately load fresh user data from server to sync isVerified
    initProfile();

    async function initProfile() {
        try {
            // Fetch latest profile from server (so isVerified is always up to date)
            const freshUser = await fetchAPI('/users/me');

            // Merge fresh server data into localStorage (keep token from cached)
            const merged = {
                ...(JSON.parse(localStorage.getItem('user')) || {}),
                ...freshUser
            };
            if (cachedUser && cachedUser.token) merged.token = cachedUser.token;
            
            saveUser(merged);
            cachedUser = merged;
            console.log('Profile Init (Fresh):', merged.isVerified);

            // Set avatar
            const pic = merged.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(merged.name || 'User')}&background=random`;
            document.getElementById('avatarPreview').src = pic;

            // Role-specific header
            if (merged.role === 'umpire') {
                document.querySelector('h2').textContent = 'My Umpire Profile';
                document.querySelector('p[style*="color: var(--text-secondary)"]').textContent =
                    'Manage your umpire details and view your officiating statistics.';
                document.getElementById('playerSpecsBlock').style.display = 'none';
            }

            // Populate form fields
            document.getElementById('name').value = merged.name || '';
            document.getElementById('age').value = merged.age || '';
            if (merged.role === 'player') {
                document.getElementById('playerRole').value = merged.playerRole || 'All-rounder';
                document.getElementById('battingStyle').value = merged.battingStyle || 'Right-hand bat';
                document.getElementById('bowlingStyle').value = merged.bowlingStyle || 'None';
            }

            // Show correct UI mode
            updateVerificationUI(merged);
            applyViewMode(merged);

        } catch (err) {
            console.error('Failed to load fresh profile, using cache', err);
            // Fallback to cached data
            const pic = cachedUser.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(cachedUser.name || 'User')}&background=random`;
            document.getElementById('avatarPreview').src = pic;
            document.getElementById('name').value = cachedUser.name || '';
            document.getElementById('age').value = cachedUser.age || '';
            if (cachedUser.role === 'umpire') {
                document.getElementById('playerSpecsBlock').style.display = 'none';
            }
            updateVerificationUI(cachedUser);
            applyViewMode(cachedUser);
        }

        // Load stats
        loadUserStats();
    }

    // Apply view vs edit mode based on verification
    function applyViewMode(user) {
        const editForm = document.getElementById('profileForm');
        const viewSection = document.getElementById('profileViewMode');
        const editBtn = document.getElementById('editProfileBtn');

        if (user.isVerified) {
            // Show "view" mode with an Edit button — hide the form initially
            if (viewSection) {
                viewSection.style.display = 'block';
                document.getElementById('viewName').textContent = user.name || '—';
                document.getElementById('viewAge').textContent = user.age ? `${user.age} yrs` : '—';
                if (user.role === 'player') {
                    document.getElementById('viewRole').textContent = user.playerRole || '—';
                    document.getElementById('viewBatting').textContent = user.battingStyle || '—';
                    document.getElementById('viewBowling').textContent = user.bowlingStyle || '—';
                    document.getElementById('playerViewSpecs').style.display = 'block';
                } else {
                    document.getElementById('playerViewSpecs').style.display = 'none';
                }
            }
            editForm.style.display = 'none';
            if (editBtn) editBtn.style.display = 'inline-block';
        } else {
            // Unverified — show edit form directly
            if (viewSection) viewSection.style.display = 'none';
            editForm.style.display = 'block';
            if (editBtn) editBtn.style.display = 'none';
        }
    }

    // Edit button toggle
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            isEditMode = true;
            const viewSection = document.getElementById('profileViewMode');
            const editForm = document.getElementById('profileForm');
            if (viewSection) viewSection.style.display = 'none';
            editForm.style.display = 'block';
            editBtn.style.display = 'none';
        });
    }

    // Verify button (for unverified users)
    document.getElementById('verifyProfileBtn').addEventListener('click', async () => {
        const stored = JSON.parse(localStorage.getItem('user'));
        const userRole = stored ? stored.role : 'player';

        const name = document.getElementById('name').value;
        if (!name || name.trim() === '') {
            alert('Please provide your name before verifying.');
            return;
        }

        const payload = { 
            name, 
            isVerified: true,
            age: document.getElementById('age').value ? parseInt(document.getElementById('age').value) : null 
        };

        if (base64ProfilePic) payload.profilePic = base64ProfilePic;

        if (userRole === 'player') {
            const prEl = document.getElementById('playerRole');
            const bsEl = document.getElementById('battingStyle');
            const bwEl = document.getElementById('bowlingStyle');
            if (prEl) payload.playerRole = prEl.value;
            if (bsEl) payload.battingStyle = bsEl.value;
            if (bwEl) payload.bowlingStyle = bwEl.value;
        }

        try {
            const updatedUser = await fetchAPI('/users/profile', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            saveUser(updatedUser);
            cachedUser = JSON.parse(localStorage.getItem('user'));
            updateVerificationUI(cachedUser);
            applyViewMode(cachedUser);

            showMsg('✅ Profile verified and saved!', '#4ade80');
        } catch (err) {
            alert('Verification failed: ' + err.message);
        }
    });

    // Photo upload
    document.getElementById('picUpload').addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { alert('Image must be less than 5MB.'); return; }
            const reader = new FileReader();
            reader.onload = function (e) {
                base64ProfilePic = e.target.result;
                document.getElementById('avatarPreview').src = base64ProfilePic;
            };
            reader.readAsDataURL(file);
        }
    });

    // Save / Update form
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const ageVal = document.getElementById('age').value;
        const age = ageVal ? parseInt(ageVal) : null;
        const payload = { name, age };

        const stored = JSON.parse(localStorage.getItem('user'));
        const userRole = stored ? stored.role : 'player';

        // Auto-verify logic:
        // - Any user: auto-verify as long as name is filled
        if (name && name.trim().length > 0) {
            payload.isVerified = true;
        }

        if (base64ProfilePic) payload.profilePic = base64ProfilePic;

        if (stored && stored.role === 'player') {
            payload.playerRole = document.getElementById('playerRole').value;
            payload.battingStyle = document.getElementById('battingStyle').value;
            payload.bowlingStyle = document.getElementById('bowlingStyle').value;
        }

        try {
            const updatedUser = await fetchAPI('/users/profile', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            saveUser(updatedUser);
            cachedUser = JSON.parse(localStorage.getItem('user'));
            updateVerificationUI(cachedUser);

            if (updatedUser.isVerified) {
                applyViewMode(cachedUser);
                showMsg('✅ Profile saved and verified!', '#4ade80');
            } else {
                showMsg('Profile updated! Add your age to get verified.', 'var(--secondary-color)');
            }
        } catch (error) {
            alert('Failed to update profile: ' + error.message);
        }
    });

    function showMsg(text, color) {
        const msg = document.getElementById('updateMsg');
        msg.style.display = 'block';
        msg.style.color = color;
        msg.textContent = text;
        setTimeout(() => { msg.style.display = 'none'; }, 4000);
    }
});

async function loadUserStats() {
    try {
        const stats = await fetchAPI('/users/me/stats');
        const user = JSON.parse(localStorage.getItem('user'));

        document.getElementById('statsLoader').style.display = 'none';
        document.getElementById('statsContainer').style.display = 'block';

        if (user && user.role === 'umpire') {
            document.getElementById('playerStatsSection').style.display = 'none';
            document.getElementById('umpireStatsSection').style.display = 'block';
            document.getElementById('statMatchesUmpired').textContent = stats.matchesUmpired || 0;
            document.getElementById('statTournamentsManaged').textContent = stats.tournamentsManaged || 0;
        } else {
            document.getElementById('playerStatsSection').style.display = 'block';
            document.getElementById('umpireStatsSection').style.display = 'none';

            document.getElementById('statMatches').textContent = stats.matchesPlayed || 0;
            document.getElementById('statRuns').textContent = stats.totalRuns || 0;
            document.getElementById('statFours').textContent = stats.fours || 0;
            document.getElementById('statSixes').textContent = stats.sixes || 0;

            const sr = stats.ballsFaced > 0 ? ((stats.totalRuns / stats.ballsFaced) * 100).toFixed(1) : '0.0';
            document.getElementById('statSR').textContent = sr;

            document.getElementById('statWickets').textContent = stats.totalWickets || 0;
            document.getElementById('statOvers').textContent = stats.oversBowled || 0;
            document.getElementById('statRunsConceded').textContent = stats.runsConceded || 0;

            const econ = stats.oversBowled > 0 ? (stats.runsConceded / stats.oversBowled).toFixed(1) : '0.0';
            document.getElementById('statEcon').textContent = econ;
        }
    } catch (error) {
        document.getElementById('statsLoader').textContent = 'Error loading stats.';
        document.getElementById('statsLoader').style.color = 'var(--accent-red)';
    }
}

function updateVerificationUI(user) {
    const badge = document.getElementById('verifiedBadge');
    const dot = document.getElementById('verifyStatusDot');
    const text = document.getElementById('verifyText');
    const verifyBtn = document.getElementById('verifyProfileBtn');

    badge.style.display = 'flex';

    if (user.isVerified) {
        dot.style.background = '#4ade80';
        text.textContent = 'Profile Verified';
        text.style.color = '#4ade80';
        badge.style.borderColor = '#4ade80';
        verifyBtn.style.display = 'none';
    } else {
        dot.style.background = '#ff4d4d';
        text.textContent = 'Incomplete Profile';
        text.style.color = '#ff4d4d';
        badge.style.borderColor = '#ff4d4d';
        verifyBtn.style.display = 'block';
    }
}
