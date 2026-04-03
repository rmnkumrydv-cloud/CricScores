# CricScores Project - Comprehensive Documentation Report

## Project Overview

CricScores is a full-stack cricket scoring and tournament management application built with Node.js, Express, and MongoDB. It enables tournament organizers to create tournaments, manage teams and players, conduct live match scoring with umpire mode, and track player statistics through leaderboards.

---

## ROOT FILES

### [package.json](package.json)

- **Purpose**: Define project dependencies and scripts
- **Key Functions**:
  - Specifies npm scripts for running the backend (`npm start`, `npm run dev`)
  - Lists all dependencies including Express, MongoDB (Mongoose), JWT authentication, bcrypt for password hashing, CORS, and body-parser
- **Key Packages**:
  - `express`: Web framework
  - `mongoose`: MongoDB ODM
  - `jsonwebtoken`: JWT authentication
  - `bcryptjs`: Password hashing
  - `nodemon`: Auto-restart during development

### [README.md](README.md)

- **Purpose**: Project documentation and setup guide
- **Content**: Features overview, technology stack, installation instructions, environment configuration, and licensing details
- **Key Features Listed**: User authentication, team/player management, tournament hosting, live match scoring with umpire mode, advanced analytics, leaderboards, responsive UI

---

## BACKEND STRUCTURE

### Core Server - [backend/server.js](backend/server.js)

- **Purpose**: Main Express server entry point
- **Key Functions**:
  - Initializes Express application with middleware (CORS, body-parser)
  - Connects to MongoDB via `connectDB()`
  - Registers all API route handlers for users, teams, tournaments, matches, and leaderboards
  - Serves frontend static files
  - Implements global error handler middleware
  - Runs on port 5000 (configurable via PORT env variable)

---

### DATABASE CONFIGURATION

#### [backend/config/db.js](backend/config/db.js)

- **Purpose**: MongoDB connection setup
- **Key Functions**:
  - Establishes connection to MongoDB using Mongoose
  - Reads `MONGO_URI` from environment variables (defaults to localhost:27017/cricscores)
  - Logs connection status and handles connection errors
  - Auto-exits process on connection failure

---

### DATA MODELS

#### [backend/models/User.js](backend/models/User.js)

- **Purpose**: Schema for user accounts
- **Key Fields**:
  - `name`, `username`, `email`: User identification
  - `password`: Hashed with bcrypt automatically on save
  - `role`: Either 'player' or 'umpire'
  - `isAdmin`, `isVerified`: Account status flags
  - `age`, `profilePic`: User profile information
  - `playerRole`: Position (Batsman, Bowler, All-rounder, Wicketkeeper)
  - `battingStyle`, `bowlingStyle`: Cricket preferences
- **Key Methods**:
  - `matchPassword()`: Compares entered password with hashed password
  - Pre-save hook: Automatically hashes password if modified

#### [backend/models/Team.js](backend/models/Team.js)

- **Purpose**: Schema for cricket teams
- **Key Fields**:
  - `name`, `city`: Team identification
  - `captain`: Reference to a Player document
  - `players`: Array of Player references (the team roster)
  - `createdBy`: Reference to User who created the team
- **Purpose in System**: Represents cricket teams that can be added to tournaments

#### [backend/models/Player.js](backend/models/Player.js)

- **Purpose**: Schema for individual players
- **Key Fields**:
  - `name`, `role`, `battingStyle`, `bowlingStyle`: Player core info
  - `team`: Reference to Team
  - `userRef`: Reference to original User account
  - `createdBy`: Reference to User who added them
  - `matchesPlayed`, `totalRuns`, `totalWickets`, `highestScore`, `bestBowling`: Aggregated stats
- **Purpose in System**: Tracks individual player statistics and team membership

#### [backend/models/Tournament.js](backend/models/Tournament.js)

- **Purpose**: Schema for cricket tournaments
- **Key Fields**:
  - `name`, `organizer`: Tournament identification
  - `startDate`, `endDate`: Tournament timeline
  - `teams`: Array of Team references participating
  - `createdBy`: Reference to Umpire who created tournament
  - `status`: Upcoming, Ongoing, or Completed
- **Purpose in System**: Organizes multiple teams into a tournament structure

#### [backend/models/Match.js](backend/models/Match.js)

- **Purpose**: Comprehensive schema for cricket matches with detailed scoring
- **Key Fields**:
  - `tournament`, `date`, `venue`: Match metadata
  - `playingXI1`, `playingXI2`: Arrays of 11 players per team
  - `status`: Scheduled, Live, or Completed
  - `tossWinner`, `tossDecision`: Toss information
  - `winner`, `result`: Match outcome
  - `currentStriker`, `currentNonStriker`, `currentBowler`: Active players during live match
  - `targetRuns`, `totalOvers`: Match format (default 20 overs T20)
  - `playerOfTheMatch`: Reference to top performer
- **Complex Nested Structure - Innings Array**:
  - Each match has 2 innings (or more for multi-inning formats)
  - Each innings contains:
    - `battingTeam`, `bowlingTeam`: Team references
    - `runs`, `wickets`, `overs`: Current score
    - `extras`: Tracks wides, no-balls, byes, leg-byes
    - `battingStats`: Array tracking each batter's performance (runs, balls, dismissal)
    - `bowlingStats`: Array tracking each bowler's performance (wickets, runs conceded)
    - `oversHistory`: Detailed ball-by-ball record of each over with every delivery event

---

### MIDDLEWARE

#### [backend/middleware/authMiddleware.js](backend/middleware/authMiddleware.js)

- **Purpose**: Authentication and authorization
- **Key Functions**:
  - `protect()`: Verifies JWT token from Authorization header, ensures user exists, passes user to request object
  - `restrictTo(...roles)`: Role-based access control, restricts endpoints to specific roles (e.g., 'umpire')
- **Usage**: Guards protected routes to ensure only authenticated users with proper roles can access

#### [backend/middleware/errorMiddleware.js](backend/middleware/errorMiddleware.js)

- **Purpose**: Global error handling
- **Key Functions**:
  - `errorHandler()`: Catches errors from any route, returns JSON error response with status code
  - Hides stack trace in production
- **Usage**: Applied last in server to catch and format all errors uniformly

---

### CONTROLLERS

#### [backend/controllers/userController.js](backend/controllers/userController.js)

- **Purpose**: Handles all user-related operations
- **Key Functions**:
  - `registerUser()`: Creates new user account (validates signup code for umpires)
  - `loginUser()`: Authenticates user and returns JWT token
  - `getMe()`: Returns current authenticated user's profile
  - `getPlayers()`: Lists all verified players
  - `getUmpires()`: Lists all umpires
  - `updateUserProfile()`: Updates user profile data and verification status
  - `getUserStats()`: Aggregates lifetime statistics for current user (batting/bowling/umpiring)
  - `getPlayerStats()`: Public endpoint to get any player's lifetime stats

#### [backend/controllers/teamController.js](backend/controllers/teamController.js)

- **Purpose**: Manages team operations
- **Key Functions**:
  - `getTeams()`: Fetches all teams
  - `getMyTeams()`: Returns teams created by logged-in user
  - `createTeam()`: Creates new team (umpire-only)
  - `addPlayerToTeam()`: Adds verified player to team (creates Player document)
  - `getTeamById()`: Gets team details with populated players
  - `getTeamPlayers()`: Lists players in a specific team
  - `deleteTeam()`: Removes team and associated players
- **Authorization**: Only team creators can add/delete players

#### [backend/controllers/tournamentController.js](backend/controllers/tournamentController.js)

- **Purpose**: Tournament management
- **Key Functions**:
  - `getTournaments()`: Lists all tournaments with optional search
  - `getTournamentById()`: Gets tournament details with teams
  - `createTournament()`: Creates new tournament (umpire-only)
  - `addTeamToTournament()`: Registers a team in tournament
  - `getTournamentStandings()`: Calculates and returns tournament standings/points table
  - `deleteTournament()`: Removes tournament

#### [backend/controllers/matchController.js](backend/controllers/matchController.js)

- **Purpose**: Live match scoring and management
- **Key Functions**:
  - `initializeMatch()`: Creates match with playing XI (11 players per team)
  - `startMatch()`: Conducts toss, sets batting/bowling decision, marks match as Live
  - `recordBall()`: Records individual ball during match (umpire mode)
    - Updates runs, wickets, extras, batting/bowling stats
    - Handles strike rotation on odd runs
    - Detects innings/match completion
    - Manages dismissal information
  - `updateCurrentPlayers()`: Sets striker, non-striker, bowler for new over
  - `setPlayerOfTheMatch()`: Designates match MVP
  - `undoBall()`: Removes last recorded ball (error correction)
  - `populateMatch()`: Helper function to fully populate match data with nested objects
- **Key Logic**: Ball-by-ball tracking with comprehensive statistics aggregation

#### [backend/controllers/leaderboardController.js](backend/controllers/leaderboardController.js)

- **Purpose**: Aggregates player statistics for rankings
- **Key Functions**:
  - `getTopBatters()`: MongoDB aggregation pipeline that ranks top 10 batters by total runs
  - `getTopBowlers()`: Aggregates top 10 bowlers by wickets (sorted by runs conceded as tiebreaker)
- **Data Source**: Pulls from Match documents' innings.battingStats and innings.bowlingStats

---

### ROUTES

#### [backend/routes/userRoutes.js](backend/routes/userRoutes.js)

- `POST /api/users` → registerUser (public)
- `POST /api/users/login` → loginUser (public)
- `GET /api/users/me` → getMe (protected)
- `GET /api/users/me/stats` → getUserStats (protected)
- `PUT /api/users/profile` → updateUserProfile (protected)
- `GET /api/users/umpires` → getUmpires (public)
- `GET /api/users/players` → getPlayers (public)
- `GET /api/users/:id/stats` → getPlayerStats (public)

#### [backend/routes/teamRoutes.js](backend/routes/teamRoutes.js)

- `GET /api/teams` → getTeams (public)
- `POST /api/teams` → createTeam (protected, umpire only)
- `GET /api/teams/my` → getMyTeams (protected)
- `GET /api/teams/:id` → getTeamById (public)
- `DELETE /api/teams/:id` → deleteTeam (protected)
- `GET /api/teams/:id/players` → getTeamPlayers (public)
- `POST /api/teams/:id/players` → addPlayerToTeam (protected)

#### [backend/routes/tournamentRoutes.js](backend/routes/tournamentRoutes.js)

- `GET /api/tournaments` → getTournaments (public, searchable)
- `POST /api/tournaments` → createTournament (protected, umpire only)
- `GET /api/tournaments/:id` → getTournamentById (public)
- `DELETE /api/tournaments/:id` → deleteTournament (protected, umpire only)
- `POST /api/tournaments/:id/teams` → addTeamToTournament (protected, umpire only)
- `GET /api/tournaments/:id/standings` → getTournamentStandings (public)

#### [backend/routes/matchRoutes.js](backend/routes/matchRoutes.js)

- `GET /api/matches` → getMatches (public)
- `POST /api/matches/initialize` → initializeMatch (protected, umpire only)
- `GET /api/matches/:id` → getMatchById (public)
- `PUT /api/matches/:id/start` → startMatch (protected, umpire only)
- `PUT /api/matches/:id/players` → updateCurrentPlayers (protected, umpire only)
- `POST /api/matches/:id/ball` → recordBall (protected, umpire only)
- `PUT /api/matches/:id/pom` → setPlayerOfTheMatch (protected, umpire only)
- `PUT /api/matches/:id/undo` → undoBall (protected, umpire only)

#### [backend/routes/leaderboardRoutes.js](backend/routes/leaderboardRoutes.js)

- `GET /api/leaderboard/batting` → getTopBatters (public)
- `GET /api/leaderboard/bowling` → getTopBowlers (public)

---

## FRONTEND STRUCTURE

### MAIN PAGES

#### [frontend/index.html](frontend/index.html)

- **Purpose**: Landing/home page
- **Content**:
  - Hero section with call-to-action buttons
  - Features section highlighting key capabilities
  - Statistics display and navigation
- **Styling**: Modern dark theme with gradient overlays, glass-morphism effects
- **Navigation**: Links to register, login, and main dashboard

#### [frontend/dashboard.html](frontend/dashboard.html)

- **Purpose**: Player dashboard after login
- **Key Features**:
  - Profile completion banner (with warning if unverified)
  - Quick action cards (View Profile, Explore Matches, Leaderboards)
  - Lists nearby umpires with contact info
  - Recent matches display with scoring links
- **Access Control**: Redirects umpires to umpire-dashboard.html
- **Data Loading**: Dynamically loads umpires and recent matches

#### [frontend/umpire-dashboard.html](frontend/umpire-dashboard.html)

- **Purpose**: Administrator/umpire dashboard
- **Key Sections**: Team management, tournament creation, match initialization
- **Note**: Exclusive to users with 'umpire' role

### SECONDARY PAGES (in frontend/pages/)

#### [frontend/pages/login.html](frontend/pages/login.html)

- **Purpose**: User authentication portal
- **Fields**: Email and password
- **Functionality**: Authenticates user and stores JWT token

#### [frontend/pages/register.html](frontend/pages/register.html)

- **Purpose**: New user registration
- **Fields**: Name, username, email, password, role selection
- **Umpire Registration**: Requires special signup code (configurable)

#### [frontend/pages/profile.html](frontend/pages/profile.html)

- **Purpose**: User profile management and verification
- **Features**:
  - Profile picture upload
  - Edit player-specific info (role, batting/bowling styles, age)
  - Account verification toggle
  - Display lifetime statistics
  - View mode for verified profiles with edit button

#### [frontend/pages/teams.html](frontend/pages/teams.html)

- **Purpose**: Team management interface
- **Umpire Features**: Create teams, add verified players via search
- **Display**: Shows teams with player roster

#### [frontend/pages/tournaments.html](frontend/pages/tournaments.html)

- **Purpose**: Browse and manage tournaments
- **Features**:
  - List all tournaments with dates and organizer
  - Umpires can create and start tournaments
  - Links to tournament details

#### [frontend/pages/tournament-details.html](frontend/pages/tournament-details.html)

- **Purpose**: Tournament information and match organization
- **Content**: Teams participating, matches scheduled, standings

#### [frontend/pages/match-setup.html](frontend/pages/match-setup.html)

- **Purpose**: Initialize a new match (umpire-only)
- **Features**:
  - Select two teams from tournament
  - Build playing XI (11 players each)
  - Search verified players globally or filter by team
  - Select all/deselect functionality
  - Validate exactly 11 players per team

#### [frontend/pages/toss.html](frontend/pages/toss.html)

- **Purpose**: Conduct coin toss and set batting decision
- **Features**:
  - Interactive coin flip animation
  - Display toss winner
  - Buttons to choose "Bat" or "Bowl"
  - Transition to match scoring page

#### [frontend/pages/match-scoring.html](frontend/pages/match-scoring.html)

- **Purpose**: Live match scoring interface (umpire mode)
- **Real-time Display**:
  - Current runs, wickets, overs
  - Striker, non-striker, bowler names
  - Run rate (CRR), projected score, required run rate (RRR)
  - Win probability calculations
- **Umpire Controls**: Record balls, manage extras, handle dismissals, rotate strike
- **Updates**: Aggregates and displays running statistics

#### [frontend/pages/match-result.html](frontend/pages/match-result.html)

- **Purpose**: Display completed match scorecard
- **Content**: Both innings scores, player stats, man of the match

#### [frontend/pages/leaderboards.html](frontend/pages/leaderboards.html)

- **Purpose**: Player rankings and statistics
- **Displays**: Top batters (runs) and top bowlers (wickets)

#### [frontend/pages/discover.html](frontend/pages/discover.html)

- **Purpose**: Search and browse matches/tournaments
- **Features**:
  - Searchable match list with status filters
  - Tournament search
  - Display match scores and winners
  - Links to match details

---

### STYLESHEETS

#### [frontend/css/style.css](frontend/css/style.css)

- **Purpose**: Global styling and component library
- **Design System**:
  - **Color Palette**:
    - Primary (Electric Pitch Green): `#00ff88`
    - Secondary (Sky Blue): `#00d4ff`
    - Accent Red (Ball Red): `#ff4d4d`
    - Background Dark: `#080c14`
  - **Components**: Buttons (primary/secondary), cards (glass-morphism), navbar, forms
  - **Effects**: Transitions, shadows, backdrop filters, gradients
- **Responsive**: Mobile-first design with flexbox/grid layouts
- **Typography**: 'Outfit' font family with various weights (300-900)

---

### JAVASCRIPT MODULES

#### [frontend/js/api.js](frontend/js/api.js)

- **Purpose**: Centralized API communication layer
- **Key Functions**:
  - `fetchAPI()`: Wrapper around fetch() that:
    - Automatically adds JWT token from localStorage to Authorization header
    - Handles JSON serialization
    - Detects 401 errors and redirects to login
    - Throws errors for failed requests
  - `saveUser()`: Stores user data and token in localStorage
  - `clearUser()`: Clears user session
- **Usage**: All frontend pages import this and use `fetchAPI()` to communicate with backend

#### [frontend/js/profile.js](frontend/js/profile.js)

- **Purpose**: User profile management
- **Features**:
  - Load and display current user profile
  - Edit mode toggle (visible only for unverified users)
  - Profile picture upload with base64 encoding
  - Save profile changes and verify account
  - Display lifetime batting and bowling statistics
  - Distinguishes between player and umpire profiles
- **Data Sync**: Fetches fresh profile from server on load to ensure isVerified is current

#### [frontend/js/teams.js](frontend/js/teams.js)

- **Purpose**: Team management interface
- **Features**:
  - Load and display all teams (shows only user's teams for umpires)
  - Team creation form (umpire-only)
  - Search verified players by name/username
  - Select multiple players for team
  - Remove players from selection
  - Add players to existing teams
- **Authorization**: Only umpires see "Create Team" button
- **Verification Check**: Ensures players have verified profiles before adding

#### [frontend/js/tournaments.js](frontend/js/tournaments.js)

- **Purpose**: Tournament management
- **Features**:
  - List all tournaments with dates and status
  - Create new tournament (umpire form)
  - Search tournaments by name
  - Links to tournament details pages
- **Status Display**: Shows Upcoming, Ongoing, or Completed status badges

#### [frontend/js/match-setup.js](frontend/js/match-setup.js)

- **Purpose**: Initialize new matches with playing XI
- **Key Features**:
  - Load teams and tournaments at startup
  - Build 11-player playing XI for each team
  - Search players globally or filter by team
  - Visual counter for selected players
  - "Select All" / "Deselect All" button
  - Validate exactly 11 players per team before proceeding
  - Initialize match once validation passes
- **Dynamic UI**: Updates player list when team is selected

#### [frontend/js/toss.js](frontend/js/toss.js)

- **Purpose**: Conduct toss
- **Features**:
  - Load match details
  - Animated coin flip with random 3-second duration
  - Random toss winner selection
  - Display toss decision buttons (Bat/Bowl)
  - Submit toss decision to backend
  - Redirect to match scoring page
- **Animation**: 3D coin rotation effect with transition to scoring page

#### [frontend/js/scoring.js](frontend/js/scoring.js)

- **Purpose**: Live match scoring (umpire mode)
- **Core Functionality**:
  - Load match and current innings
  - Display striker, non-striker, current bowler
  - Track live score, wickets, overs
  - Calculate and display:
    - Current run rate (CRR)
    - Projected score (1st innings) or Required run rate (2nd innings)
    - Win probability calculations
  - Record each ball with:
    - Runs scored (0-6, boundaries)
    - Extras (wides, no-balls, byes, leg-byes)
    - Dismissal information (type, fielder, bowler)
  - Strike rotation on odd runs
  - Auto-transition between innings on completion
- **State Management**: Persists current striker/bowler for multi-over tracking
- **Error Handling**: Prompts for player selection if not set

#### [frontend/js/team-details.js](frontend/js/team-details.js)

- **Purpose**: Display team roster and statistics
- **Content**: Team information, playing XI, recent matches

#### [frontend/js/discover.js](frontend/js/discover.js)

- **Purpose**: Search and filter matches/tournaments
- **Features**:
  - Toggle between matches and tournaments
  - Real-time search with debounce (500ms)
  - Display match scores with team names and overs
  - Show match winners for completed matches
  - Venue and date information
  - Status badges (Live, Scheduled, Completed)
  - Links to match details and scorecards
- **Rendering**: Dynamically generates card UI for results

#### [frontend/js/tournament-details.js](frontend/js/tournament-details.js)

- **Purpose**: Display tournament information
- **Content**: Participating teams, match schedule, standings/points table

---

## KEY FEATURES & WORKFLOWS

### 1. User Management Workflow

- User registers as player or umpire
- Profile verification required (players must complete profile before matches)
- JWT authentication for secure API access
- Role-based access control (umpires have exclusive match/tournament creation)

### 2. Team & Player Management

- Umpires create teams and add verified players
- Player objects created from verified user accounts
- Team roster tracked via Player references

### 3. Tournament Setup Workflow

- Umpire creates tournament with date range and organizer info
- Teams registered to tournament
- Multiple matches can be scheduled under single tournament

### 4. Match Lifecycle

- **Initialization**: Umpire selects two teams, confirms 11-player playing XI
- **Toss**: Randomized toss winner and batting decision
- **Live Scoring**: Ball-by-ball entry by umpire:
  - Runs, dismissals, extras tracked
  - Player stats auto-updated
  - Strike management and over progression
- **Completion**: Match status updated, winner determined
- **Analytics**: Results feed into leaderboards

### 5. Statistics Aggregation

- Real-time batting stats: runs, balls, fours, sixes, dismissals
- Real-time bowling stats: wickets, runs conceded, overs
- Lifetime stats: aggregated from all completed matches
- Leaderboards: top 10 batters and bowlers by platform-wide stats

---

## TECHNOLOGY INTEGRATION SUMMARY

| Layer              | Technology                | Purpose                                                 |
| ------------------ | ------------------------- | ------------------------------------------------------- |
| **Frontend**       | HTML5/CSS3/Vanilla JS     | Responsive UI, real-time scoring                        |
| **Backend**        | Node.js + Express.js      | RESTful API server                                      |
| **Database**       | MongoDB + Mongoose        | Persistent data storage with schema validation          |
| **Authentication** | JWT + bcryptjs            | Secure user authentication and authorization            |
| **Utilities**      | CORS, body-parser, dotenv | Cross-origin requests, JSON parsing, environment config |

---

This comprehensive CricScores system provides a complete cricket management and scoring platform with clear separation between umpire (admin) and player (user) roles, real-time match scoring with detailed statistics, and platform-wide analytics via leaderboards.
