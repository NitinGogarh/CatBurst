import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import { startGame, drawCard, lboard } from "./gameSlice";
import "./App.css"; // Add your custom CSS styles here

function App() {
  const dispatch = useDispatch();
  const { username, cardDrawn, leaderboard, canDraw } = useSelector(
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

  useEffect(() => {
    let ws;

    const connect = () => {
      ws = new WebSocket("ws://localhost:8080/ws");

      ws.onopen = () => {
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Message:", data);
        if (data) {
          dispatch(lboard(data)); // Dispatch leaderboard data to Redux store
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed, reconnecting...", event);
        setTimeout(connect, 3000); // Attempt to reconnect after 3 seconds
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
    };
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
              <div className="deck-container">
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
              {canDraw && (
                <button className="draw-card" onClick={handleDrawCard}>
                  Draw Card
                </button>
              )}
              {cardDrawn && (
                <p className="status-text">Card drawn: {cardDrawn}</p>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="leaderboard-container">
          <h2>Leaderboard</h2>
          <ul className="leaderboard">
            {leaderboard &&
              leaderboard.length > 0 &&
              leaderboard.map((player, index) => (
                <li key={index} className="leaderboard-item">
                  {player.username}: {player.win} wins , {player.lose} lose
                </li>
              ))}
          </ul>
        </div>
      </div>
    </>
  );
}

export default App;
