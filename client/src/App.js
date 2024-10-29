import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import {
  startGame,
  drawCard,
  fetchLeaderboard,
  setLeaderboard,
} from "./gameSlice";
import "./App.css"; // Add your custom CSS styles here

function App() {
  const dispatch = useDispatch();
  const { username, cardDrawn, leaderboard } = useSelector(
    (state) => state.game
  );

  const [inputUsername, setInputUsername] = useState("");
  const [cardFlipped, setCardFlipped] = useState(false); // For flip animation

  const handleRegister = () => {
    if (inputUsername) {
      dispatch(startGame(inputUsername));
    }
  };

  const handleDrawCard = () => {
    if (username) {
      dispatch(drawCard(username));
      setCardFlipped(true);
      setTimeout(() => setCardFlipped(false), 1000); // Reset flip after animation
    }
  };

  const loadLeaderboard = () => {
    dispatch(fetchLeaderboard());
  };

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/ws");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Message : ", data);
      // if (data.leaderboard) {
      // dispatch(setLeaderboard(data.leaderboard));
      // }
    };

    return () => ws.close();
  }, [dispatch]);

  return (
    <>
      <Toaster position="top-center" />

      <div className="app">
        <h1 className="game-title">😸 Exploding Kitten</h1>

        {/* User Registration */}
        {!username ? (
          <div className="user-login">
            <input
              type="text"
              placeholder="Enter your username"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              className="username-input"
            />
            <button className="start-btn" onClick={handleRegister}>
              Start Game
            </button>
          </div>
        ) : (
          <div className="game-container">
            {/* Game Info */}
            <h2 className="welcome-message">Welcome, {username}!</h2>
            <div className="cards">
              {/* Card Deck */}
              <div className="deck-container" onClick={handleDrawCard}>
                <div className={`card ${cardFlipped ? "flipped" : ""}`}>
                  {/* Display back of the card or card drawn */}
                  {!cardDrawn ? (
                    <div className="card-back">🂠</div>
                  ) : (
                    <div className="card-front">{cardDrawn}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Game Status */}
            <div className="game-status">
              {cardDrawn && (
                <p className="status-text">Card drawn: {cardDrawn}</p>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {/* <div className="leaderboard-container">
        <h2>Leaderboard</h2>
        <ul className="leaderboard">
          {leaderboard &&
            leaderboard.length > 0 &&
            leaderboard.map((player, index) => (
              <li key={index} className="leaderboard-item">
                {player.username}: {player.wins} wins
              </li>
            ))}
        </ul>
      </div> */}
      </div>
    </>
  );
}

export default App;
