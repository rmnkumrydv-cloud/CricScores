# CricScores 🏏

CricScores is a comprehensive, production-ready Cricket scoring and tournament management platform. Built to bring professional-grade analytics, live ball-by-ball updates, and robust multi-team competition handling directly to your fingertips. 

Whether you are a casual player looking to track your local weekend games or a dedicated umpire managing full-scale tournaments, CricScores provides all the necessary architectural tooling wrapped in a stunning, premium UI with full Light and Dark mode support.

## 🌟 Key Features

*   **Dual-Role Architecture**: Dedicated Dashboards for **Players** (to check stats, leaderboards, and teams) and **Umpires** (who possess full jurisdiction to start matches, manage rosters, and score live games).
*   **Live Ball-by-Ball Scoring Engine**: High-granularity match engine tracking runs, boundaries (4s & 6s), extras (Wides, No Balls, Byes), wickets, Net Run Rate (CRR/RRR), and projected scores in real-time.
*   **Dynamic Theming**: An automatic, system-aware Light and Dark Mode toggle engine built without UI flickering ("FOUC"), ensuring WCAG AA accessible contrast wherever you're scoring.
*   **Tournament & Team Management**: Host whole tournaments with custom naming schema. Build teams, construct distinct rosters, assign captains, and view active tournament standings with auto-calculating Net Run Rates.
*   **Advanced Player Leaderboards**: Track MVP players through aggregated stats globally across batting, bowling, strike rates, economy, and centuries.

## 🛠 Tech Stack

**Frontend Framework**: Pure Vanilla HTML5, CSS3, & JavaScript (ES6+).
*   *Styling*: Custom-built CSS Design System without reliance on Bootstrap/Tailwind. Minimalist glassmorphism overlays and robust CSS-variable based dual-theme architecture.
*   *Interaction*: Native DOM manipulation with asynchronous Fetch API integrations.

**Backend Engine**: Node.js & Express.
*   *Database*: MongoDB (via Mongoose) featuring heavy schema validation and referential integrity between Tournaments, Matches, Teams, Users, and specialized Player entities.
*   *Auth*: Secure JSON Web Token (JWT) Authentication workflow integrated directly into persistent backend sessions and UI hydration.

## 🚀 Getting Started

### Local Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rmnkumrydv-cloud/CricScores.git
   cd CricScores
   ```

2. **Configure your Database Environment**:
   Navigate to the `/backend` folder and ensure your `.env` file contains your connection details (example below):
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_cluster_string
   JWT_SECRET=your_hyper_secure_jwt_secret
   ```

3. **Install Dependencies & Boot the Server**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *The backend will boot up on `http://localhost:5000`.*

4. **Launch the Application**:
   Since the frontend relies on Vanilla JS and HTML, simply host the `frontend` folder using any static server extension (like VSCode Native Live Server) or open `frontend/index.html` directly in your browser.

## 📱 Platform Workflow

1. Register an account and assign yourself an identity (`Player` or `Umpire`).
2. **Players** must complete their profile (Batting/Bowling styles) fully to be drafted.
3. **Umpires** can create Teams, draft verified players, and setup a `Match`.
4. Initiate a Match, declare the toss, assign opening strikers/bowlers, and begin clicking the UI scoring console to track the live match ball-by-ball.
5. Watch the global Leaderboards instantly react to the completed match data!
