package main

import (
	"context"
	"log"
	"net/http"
	"math/rand"
	"time"
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
)

type Card struct {
	Type  string `json:"type"`
	Emoji string `json:"emoji"`
}

// Example cards (deck)
var cards = []Card{
	{"Cat", "😼"},
	{"Defuse", "🙅‍♂️"},
	{"Shuffle", "🔀"},
	{"Exploding Kitten", "💣"},
}

var ctx = context.Background()

type User struct {
	Username string `json:"username"`
}

var rdb *redis.Client
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins (be cautious with this in production)
		return true
	},
}

func main() {
	log.Println("Starting server...")

	// Setup Redis
	rdb = redis.NewClient(&redis.Options{
		Addr: "localhost:6379", // Redis server address
		DB:   0,                // Use default DB
	})
	log.Println("Connected to Redis")

	// Setup Gin router
	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // Frontend origin
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Routes
	router.POST("/start-game", startGame)
	router.POST("/draw-card", drawCard)
	router.GET("/leaderboard", getLeaderboard)

	// WebSocket for real-time updates
	router.GET("/ws", serveWs)

	// Run server
	log.Println("Running server on localhost:8080")
	router.Run("localhost:8080")
}

// Initialize a deck for the user
func initializeDeck(userID string) error {
	deckKey := "deck:" + userID

	log.Printf("Initializing deck for user: %s", userID)

	// Shuffle and add cards to the deck
	rand.Seed(time.Now().UnixNano())
	shuffledDeck := []string{
		"Cat", "Cat", "Defuse", "Shuffle", "Exploding Kitten", // Example deck of 5 cards
	}

	// Shuffle the deck (optional)
	rand.Shuffle(len(shuffledDeck), func(i, j int) {
		shuffledDeck[i], shuffledDeck[j] = shuffledDeck[j], shuffledDeck[i]
	})

	log.Printf("Shuffled deck for user: %s", userID)

	// Store the entire deck in Redis in one command
	err := rdb.RPush(ctx, deckKey, shuffledDeck).Err()
	if err != nil {
		log.Printf("Error initializing deck for user %s: %v", userID, err)
		return err
	}

	log.Printf("Deck initialized for user: %s", userID)
	return nil
}

// Start game route
func startGame(c *gin.Context) {
	var user User
	if err := c.BindJSON(&user); err != nil {
		log.Printf("Error parsing request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	log.Printf("Starting game for user: %s", user.Username)

	// Redis key for the user's deck
	deckKey := "deck:" + user.Username

	// Check if a deck already exists for this user
	existingDeck, err := rdb.LRange(ctx, deckKey, 0, -1).Result()
	if err != nil && err != redis.Nil { // Check for Redis errors, ignore if it's a 'nil' error (key doesn't exist)
		log.Printf("Error checking existing deck for user %s: %v", user.Username, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking existing deck"})
		return
	}

	// If a deck exists, return the existing deck
	if len(existingDeck) > 0 {
		log.Printf("Resuming game for user: %s", user.Username)
		c.JSON(http.StatusOK, gin.H{
			"message":  "Resuming game",
			"username": user.Username,
			"deck":     existingDeck,
		})
		return
	}

	// If no deck exists, initialize a new one
	err = initializeDeck(user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error initializing deck"})
		return
	}

	// Retrieve the newly initialized deck from Redis
	newDeck, err := rdb.LRange(ctx, deckKey, 0, -1).Result()
	if err != nil {
		log.Printf("Error retrieving new deck for user %s: %v", user.Username, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error retrieving new deck"})
		return
	}

	log.Printf("Game started for user: %s", user.Username)
	c.JSON(http.StatusOK, gin.H{
		"message":  "Game started",
		"username": user.Username,
		"deck":     newDeck,
	})
}

func drawCard(c *gin.Context) {
	var user User
	if err := c.BindJSON(&user); err != nil {
		log.Printf("Error parsing request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	log.Printf("User %s is drawing a card", user.Username)

	// Retrieve the deck for the user from Redis
	deckKey := "deck:" + user.Username
	deck, err := rdb.LRange(ctx, deckKey, 0, -1).Result()
	if err != nil {
		log.Printf("Error retrieving deck for user %s: %v", user.Username, err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error retrieving deck"})
		return
	}

	if len(deck) == 0 {
		initializeDeck(user.Username);
		log.Printf("No cards left in the deck for user: %s", user.Username)
		c.JSON(http.StatusBadRequest, gin.H{"message": "No cards left in the deck"})
		return
	}

	// Randomly select a card index
	rand.Seed(time.Now().UnixNano())
	cardIndex := rand.Intn(len(deck))
	drawnCard := deck[cardIndex]

	log.Printf("User %s drew card: %s", user.Username, drawnCard)

	// Remove the drawn card from the Redis list
	_, err = rdb.LRem(ctx, deckKey, 1, drawnCard).Result()
	if err != nil {
		log.Printf("Error removing card from deck for user %s: %v", user.Username, err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error removing card from deck"})
		return
	}

	// Call the function to handle the drawn card
	handleDrawnCard(c, drawnCard, user.Username)
}

func handleDrawnCard(c *gin.Context, drawnCard string, username string) {
	var emoji string
	var cardType string

	// Find the emoji and card type based on the drawn card
	for _, card := range cards {
		if card.Type == drawnCard {
			cardType = card.Type
			emoji = card.Emoji
			break
		}
	}

	log.Printf("Handling card for user %s: %s (%s)", username, cardType, emoji)

	switch cardType {
	case "Exploding Kitten":
		// Check if the user has a defuse card
		hasDefuse, err := rdb.HGet(ctx, "user:"+username, "defuse").Result()
		if err != nil {
			log.Printf("Error retrieving defuse status for user %s: %v", username, err)
		}

		log.Printf("Can defuse : " , hasDefuse)

		defuseCount, _ := strconv.Atoi(hasDefuse)
		
		if defuseCount > 0 {  // If user has defuse card
			log.Printf("User %s used a Defuse card to defuse the Exploding Kitten!", username)
			
			// Set the defuse status to false in Redis
			rdb.HSet(ctx, "user:"+username, "defuse" , 0)
	
			// Send a response back to the user confirming they defused the bomb
			c.JSON(http.StatusOK, gin.H{"message": "You defused the Exploding Kitten using your Defuse card!", "card": emoji})
			return
		}
	
		log.Printf("User %s drew an Exploding Kitten without a Defuse card!", username)
		c.JSON(http.StatusOK, gin.H{"message": "You drew an Exploding Kitten! You lose!", "card": emoji})
		// Optional: Reset the game or end it
		_, errr := rdb.Del(ctx, "deck:"+username).Result()
    if errr != nil {
        log.Printf("Error deleting deck for user %s: %v", username, err)
    }

    _, err = rdb.Del(ctx, "user:"+username).Result()
    if err != nil {
        log.Printf("Error deleting user data for user %s: %v", username, err)
    }
	rdb.HSet(ctx, "defuse:"+username, "false")
		return
	
	case "Defuse":
		log.Printf("User %s drew a Defuse card", username)
		c.JSON(http.StatusOK, gin.H{"message": "You drew a Defuse card! Keep this to defuse an Exploding Kitten.", "card": emoji})
		
		// Save defuse card status in Redis for future use
		rdb.HSet(ctx, "user:"+username, "defuse", 1)
		return
	

	case "Shuffle":
		log.Printf("User %s drew a Shuffle card", username)
		resetGame(username)
		c.JSON(http.StatusOK, gin.H{"message": "You drew a Shuffle card! The deck is reshuffled.", "card": emoji})
		return

	default:
		log.Printf("User %s drew a Cat card", username)
	
		// Log successful removal of the cat card
		c.JSON(http.StatusOK, gin.H{
			"message": "You drew a Cat card! One Cat card has been removed from your deck.",
			"card":    emoji,
		})
		return		
	}
}

func resetGame(username string) {
	log.Printf("Resetting game for user: %s", username)

	// Initialize deck
	deck := []string{"Cat", "Cat", "Defuse", "Shuffle", "Exploding Kitten",}

	// Shuffle the deck
	rand.Seed(time.Now().UnixNano()) // Ensure randomness on each run
	rand.Shuffle(len(deck), func(i, j int) {
		deck[i], deck[j] = deck[j], deck[i]
	})

	// Select the first 5 cards from the shuffled deck
	randomCards := deck[:5]

	// Create deck key for the user
	deckKey := "deck:" + username

	// Clear the previous deck in Redis
	rdb.Del(ctx, deckKey)

	// Add the random cards to the deck in Redis
	rdb.RPush(ctx, deckKey, randomCards)

	log.Printf("Game reset for user: %s with cards: %v", username, randomCards)
}

// Leaderboard route
func getLeaderboard(c *gin.Context) {
	log.Println("Fetching leaderboard")
	// Fetch sorted leaderboard from Redis
	// Example: Fetch users with most wins
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

	log.Println("WebSocket connection established")

	// Fetch all user details from Redis
	usersData, err := fetchAllUsers()
	if err != nil {
		log.Println("Error fetching users data from Redis:", err)
		return
	}

	// Send users data to the WebSocket
	err = conn.WriteJSON(usersData)
	if err != nil {
		log.Println("Error sending users data through WebSocket:", err)
		return
	}

	// Keep WebSocket connection alive for further communication
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			log.Println("WebSocket connection closed:", err)
			break
		}
	}
}

// Helper function to fetch all users' data from Redis
func fetchAllUsers() ([]map[string]string, error) {
	// Example Redis key pattern for users, assuming the keys are in the format "user:<username>"
	userKeys, err := rdb.Keys(ctx, "user:*").Result()
	if err != nil {
		log.Printf("Error fetching user keys: %v", err)
		return nil, err
	}

	var usersData []map[string]string

	for _, key := range userKeys {
		// Fetch the user details from Redis
		userData, err := rdb.HGetAll(ctx, key).Result()
		if err != nil {
			log.Printf("Error fetching data for key %s: %v", key, err)
			continue
		}

		// Append the user data to the list
		usersData = append(usersData, userData)
	}

	log.Println("Fetched user data:", usersData)
	return usersData, nil
}
