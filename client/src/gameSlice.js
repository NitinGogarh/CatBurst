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
  canDraw: true,
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
    setcanDraw: (state, action) => {
      state.canDraw = action.payload;
    },
  },
});

export const {
  setUsername,
  setDeck,
  setCardDrawn,
  setGameOver,
  setLeaderboard,
  setcanDraw,
} = gameSlice.actions;

// Async actions for interacting with the backend API

export const startGame = (inputUsername) => async (dispatch) => {
  dispatch(setUsername(inputUsername));
  dispatch(setcanDraw(true));
  const response = await axios.post("http://localhost:8080/start-game", {
    username: inputUsername,
  });
  dispatch(setDeck(response.data.deck));
};

export const lboard = (payload) => async(dispatch)=> {
  dispatch(setLeaderboard(payload));
};

export const drawCard = (username) => async (dispatch) => {
  const response = await axios.post("http://localhost:8080/draw-card", {
    username,
  });
  dispatch(setCardDrawn(response.data.card));
  if (response.data.message.includes("You lose!")) {
    toast.error("You lose the game");
    dispatch(setcanDraw(false));
    setTimeout(() => {
      dispatch(setUsername(""));
      dispatch(setCardDrawn(null));
      window.location.reload();
    }, 2000);
  }
};

export default gameSlice.reducer;
