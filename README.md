# CricScores 🏏

A comprehensive full-stack cricket scoring and tournament management application. CricScores allows users to manage teams, host tournaments, and track live match scores with advanced analytics and leaderboards.

## 🚀 Features

- **User Authentication**: Secure login and registration for tournament organizers and team managers.
- **Team & Player Management**: Create teams, add players, and manage squad details.
- **Tournament Hosting**: Organize tournaments with multiple teams and track progress.
- **Live Match Scoring**: "Umpire Mode" for ball-by-ball scoring with strike rotation and dismissal tracking.
- **Advanced Analytics**: Real-time stats including Run Rate (CRR), Projected Scores, and Win Probability.
- **Leaderboards**: Track top performers (batting and bowling) across the platform.
- **Responsive UI**: Modern, interactive interface built with HTML, CSS, and Vanilla JavaScript.

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rmnkumrydv-cloud/CricScores.git
   cd CricScores
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd backend
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory with the following:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

4. **Run the application**:
   - Start the backend: `npm start` (from the root or backend folder)
   - Open `frontend/index.html` in your browser.

## 📄 License

This project is licensed under the MIT License.
