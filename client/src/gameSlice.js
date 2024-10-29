import { createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import toast from "react-hot-toast";

const initialState = {
  username: "",
  deck: [],
  cardDrawn: null,
  gameOver: false,
  wins: 0,
  leaderboard: [],
};

export const gameSlice = createSlice({
  name: "game",
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

export const {
  setUsername,
  setDeck,
  setCardDrawn,
  setGameOver,
  setLeaderboard,
} = gameSlice.actions;

// Async actions for interacting with the backend API

export const startGame = (inputUsername) => async (dispatch) => {
  dispatch(setUsername(inputUsername));
  const response = await axios.post("http://localhost:8080/start-game", {
    username: inputUsername,
  });
  dispatch(setDeck(response.data.deck));
};

export const drawCard = (username) => async (dispatch) => {
  const response = await axios.post("http://localhost:8080/draw-card", {
    username,
  });
  dispatch(setCardDrawn(response.data.card));
  if (response.data.message.includes("You lose!")) {
    dispatch(setUsername(""));
    toast.error("You lose the game");
    dispatch(setCardDrawn(null));
  }
};

export const fetchLeaderboard = () => async (dispatch) => {
  const response = await axios.get("http://localhost:8080/leaderboard");
  dispatch(setLeaderboard(response.data.leaderboard));
};

export default gameSlice.reducer;
