### 1. **Backend - Golang (with Redis)**

#### Setup

First, you'll need to install some dependencies:

```bash
go mod init exploding-kitten
go get github.com/gin-gonic/gin
go get github.com/go-redis/redis/v8
go get github.com/gorilla/websocket
```

#### `main.go` (Backend Entrypoint)

```go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
)

var ctx = context.Background()

type User struct {
	Username string `json:"username"`
}

var rdb *redis.Client
var upgrader = websocket.Upgrader{} // For WebSocket connections

func main() {
	// Setup Redis
	rdb = redis.NewClient(&redis.Options{
		Addr: "localhost:6379", // Redis server address
		DB:   0,                // Use default DB
	})

	// Setup Gin router
	router := gin.Default()

	// Routes
	router.POST("/register", registerUser)
	router.POST("/start-game", startGame)
	router.POST("/draw-card", drawCard)
	router.GET("/leaderboard", getLeaderboard)

	// WebSocket for real-time updates
	router.GET("/ws", serveWs)

	// Run server
	router.Run(":8080")
}

// Register user route
func registerUser(c *gin.Context) {
	var user User
	if err := c.BindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	// Save user to Redis
	err := rdb.HSet(ctx, "user:"+user.Username, "wins", 0).Err()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User registered"})
}

// Start game route
func startGame(c *gin.Context) {
	// Code to initialize a new deck for the user
	// Deck structure: ["Cat", "Cat", "Defuse", "Shuffle", "Exploding Kitten"]
	username := c.Query("username")
	deck := []string{"Cat", "Cat", "Defuse", "Shuffle", "Exploding Kitten"}
	rdb.HSet(ctx, "game:"+username, "deck", deck)
	c.JSON(http.StatusOK, gin.H{"message": "Game started"})
}

// Draw card route
func drawCard(c *gin.Context) {
	username := c.Query("username")
	// Code to pop a card from Redis list (deck) and handle the result (win/lose)
	// Implement the game rules here
	// For simplicity, return a random card
	// Check if the game has ended (win/loss)
	c.JSON(http.StatusOK, gin.H{"message": "Card drawn", "card": "Cat"})
}

// Leaderboard route
func getLeaderboard(c *gin.Context) {
	// Fetch sorted leaderboard from Redis
	// Sorted by wins
	c.JSON(http.StatusOK, gin.H{"leaderboard": "Top players"})
}

// WebSocket handler for real-time updates
func serveWs(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket upgrade failed:", err)
		return
	}
	defer conn.Close()

	for {
		// Code to handle WebSocket messages
		// For example, sending real-time leaderboard updates
		// Broadcast when a user wins
	}
}
```

### 2. **Frontend - React with Redux**

#### Setup

First, initialize a React app with Redux:

```bash
npx create-react-app exploding-kitten
cd exploding-kitten
npm install @reduxjs/toolkit react-redux axios
```

#### `src/store.js` (Redux Store)

```js
import { configureStore } from '@reduxjs/toolkit';
import gameReducer from './gameSlice';

export const store = configureStore({
  reducer: {
    game: gameReducer,
  },
});
```

#### `src/gameSlice.js` (Redux Slice)

```js
import { createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
  username: '',
  deck: [],
  cardDrawn: null,
  gameOver: false,
  wins: 0,
  leaderboard: [],
};

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setUsername: (state, action) => {
      state.username = action.payload;
    },
    setDeck: (state, action) => {
      state.deck = action.payload;
    },
    setCardDrawn: (state, action) => {
      state.cardDrawn = action.payload;
    },
    setGameOver: (state, action) => {
      state.gameOver = action.payload;
    },
    setLeaderboard: (state, action) => {
      state.leaderboard = action.payload;
    },
  },
});

export const { setUsername, setDeck, setCardDrawn, setGameOver, setLeaderboard } = gameSlice.actions;

// Async actions for interacting with the backend API
export const startGame = (username) => async (dispatch) => {
  const response = await axios.post('/start-game', { username });
  dispatch(setDeck(response.data.deck));
};

export const drawCard = (username) => async (dispatch) => {
  const response = await axios.post('/draw-card', { username });
  dispatch(setCardDrawn(response.data.card));
};

export const fetchLeaderboard = () => async (dispatch) => {
  const response = await axios.get('/leaderboard');
  dispatch(setLeaderboard(response.data.leaderboard));
};

export default gameSlice.reducer;
```

#### `src/App.js` (Main Component)

```js
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUsername, startGame, drawCard, fetchLeaderboard } from './gameSlice';

function App() {
  const dispatch = useDispatch();
  const { username, cardDrawn, leaderboard } = useSelector((state) => state.game);

  const [inputUsername, setInputUsername] = useState('');

  const handleRegister = () => {
    dispatch(setUsername(inputUsername));
    dispatch(startGame(inputUsername));
  };

  const handleDrawCard = () => {
    dispatch(drawCard(username));
  };

  const loadLeaderboard = () => {
    dispatch(fetchLeaderboard());
  };

  return (
    <div className="App">
      <h1>😸 Exploding Kitten</h1>
      
      {!username ? (
        <div>
          <input
            type="text"
            placeholder="Enter username"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
          />
          <button onClick={handleRegister}>Register & Start Game</button>
        </div>
      ) : (
        <div>
          <h2>Welcome, {username}!</h2>
          <button onClick={handleDrawCard}>Draw Card</button>
          {cardDrawn && <p>Card drawn: {cardDrawn}</p>}
        </div>
      )}

      <div>
        <h2>Leaderboard</h2>
        <button onClick={loadLeaderboard}>Load Leaderboard</button>
        <ul>
          {leaderboard.map((player, index) => (
            <li key={index}>{player.username}: {player.wins} wins</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
```

### 3. **Frontend - WebSocket Connection for Real-time Leaderboard**

To integrate real-time updates for the leaderboard, modify the frontend to establish a WebSocket connection:

```js
import { useEffect } from 'react';

useEffect(() => {
  const ws = new WebSocket('ws://localhost:8080/ws');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.leaderboard) {
      dispatch(setLeaderboard(data.leaderboard));
    }
  };

  return () => ws.close();
}, []);
```

---

### 4. **Running the App**

#### Backend
```bash
go run main.go
```

Ensure Redis is running locally, or configure the Redis connection string as needed.

#### Frontend
```bash
npm start
```

Make sure to update the backend API URLs in the `axios` calls as per your setup (you might need to use `http://localhost:8080` if running both backend and frontend locally).

---

### 5. **Deployment**

You can deploy the backend using services like **Heroku** or **Render** (which supports Golang), and the frontend using **Vercel** or **Netlify**.

#### Key Points to include in the **README**:

- How to set up the backend (Golang + Redis) locally.
- How to run the frontend.
- Instructions for deploying the backend and frontend on hosting platforms.
