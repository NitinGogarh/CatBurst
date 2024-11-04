import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import { startGame, drawCard, lboard } from "./gameSlice";

function App() {
  const dispatch = useDispatch();
  const { username, cardDrawn, leaderboard, canDraw } = useSelector(
    (state) => state.game
  );

  const [inputUsername, setInputUsername] = useState("");
  const [cardFlipped, setCardFlipped] = useState(false);

  const handleRegister = () => {
    if (inputUsername) {
      dispatch(startGame(inputUsername));
    }
  };

  const handleDrawCard = () => {
    if (username) {
      dispatch(drawCard(username));
      setCardFlipped(true);
      setTimeout(() => setCardFlipped(false), 1000);
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
          dispatch(lboard(data));
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed, reconnecting...", event);
        setTimeout(connect, 3000);
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
      <div
        style={{
          textAlign: "center",
          background: "linear-gradient(145deg, #7283e1, #2ba7f4)",
          color: "#333",
          padding: "20px",
          borderRadius: "15px",
          width: "90%",
          maxWidth: "500px",
          margin: "0 auto",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
          transition: "transform 0.2s ease-in-out",
        }}
      >
        <h1 style={{ fontSize: "2.8em", color: "#fff", marginBottom: "10px" }}>  Kitten Game</h1>
        {!username ? (
          <div style={{ margin: "20px 0" }}>
            <input
              type="text"
              placeholder="Enter your username"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              style={{
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #ddd",
                width: "75%",
                marginBottom: "15px",
                outline: "none",
                transition: "border-color 0.3s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4caf50")}
              onBlur={(e) => (e.target.style.borderColor = "#ddd")}
            />
            <button
              onClick={handleRegister}
              style={{
                padding: "12px 25px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#4caf50",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background-color 0.3s",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#388e3c")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#4caf50")}
            >
              Start Game
            </button>
          </div>
        ) : (
          <div style={{ marginTop: "20px",display:"flex", flexDirection:"column" ,justifyContent:"center" ,alignItems:"center" }}>
            <h2>Welcome..., {username}!</h2>
            <div
              style={{
                display: "inline-block",
                width: "120px",
                height: "180px",
                marginTop: "20px",
                perspective: "1000px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  transition: "transform 0.6s",
                  transformStyle: "preserve-3d",
                  transform: cardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  boxShadow: "0 6px 10px rgba(0, 0, 0, 0.15)",
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backfaceVisibility: "hidden",
                    backgroundColor: "#333",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5em",
                    borderRadius: "10px",
                  }}
                >
                🃏
                </div>
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backfaceVisibility: "hidden",
                    backgroundColor: "#4caf50",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5em",
                    transform: "rotateY(180deg)",
                    borderRadius: "10px",
                  }}
                >
                  {cardDrawn || "?"}
                </div>
              </div>
            </div>
            {canDraw && (
              <button
                onClick={handleDrawCard}
                style={{
                  padding: "12px 30px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#ff5722",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer",
                  marginTop: "20px",
                  transition: "transform 0.3s ease, background-color 0.3s",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#e64a19")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#ff5722")}
                onMouseDown={(e) => (e.target.style.transform = "scale(0.95)")}
                onMouseUp={(e) => (e.target.style.transform = "scale(1)")}
              >
                Draw Card
              </button>
            )}
            {cardDrawn && (
              <p style={{ color: "#333", marginTop: "10px", fontWeight: "bold" }}>
                Card drawn: {cardDrawn}
              </p>
            )}
          </div>
        )}
        <div style={{ marginTop: "30px" }}>
          <h2 style={{ color: "#fff", fontSize: "1.8em", marginBottom: "15px" }}>Leaderboard</h2>
          <ul style={{ listStyle: "none", padding: 0, textAlign: "left", fontWeight: "bold" }}>
            {leaderboard &&
              leaderboard.length > 0 &&
              leaderboard.map((player, index) => (
                <li
                  key={index}
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    backgroundColor: index % 2 === 0 ? "#ffccbc" : "#ffe0b2",
                    marginBottom: "5px",
                    display: "flex",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                  onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                >
                  <span>{player.username}</span>
                  <span>{player.win} Wins, {player.lose} Losses</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </>
  );
}

export default App;
