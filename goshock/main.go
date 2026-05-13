package main

import (
	"log"
	"time"

	"goshock/handlers"
	"goshock/middleware"
	"goshock/storage"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	db, err := storage.InitDB("goshock.db")
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	auth := handlers.NewAuthHandler(db)
	url := handlers.NewURLHandler(db)

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:3000",
		},
		AllowMethods: []string{
			"GET",
			"POST",
			"DELETE",
			"OPTIONS",
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Authorization",
		},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Redirect public
	r.GET("/:code", url.RedirectURL)

	api := r.Group("/api")
	{
		// ─── Public Routes ─────────────────────────────
		api.POST("/register", auth.Register)
		api.POST("/login", auth.Login)
		api.POST("/logout", auth.Logout)

		// QR PUBLIC
		// agar bisa:
		// - tampil di <img>
		// - download via fetch/blob
		// - tidak terkena CORS auth issue
		api.GET("/qr/:code", url.GetQRCode)

		// ─── Protected Routes (JWT Required) ──────────
		p := api.Group("/")
		p.Use(middleware.AuthRequired())
		{
			p.GET("/me", auth.Me)

			p.POST("/shorten", url.ShortenURL)

			p.GET("/links", url.GetMyLinks)

			p.GET("/stats", url.GetMyStats)

			// Grafik klik per jam (24 jam terakhir)
			p.GET("/chart/:code", url.GetClickChart)

			// Delete link milik user
			p.DELETE("/links/:code", url.DeleteMyLink)
		}
	}

	log.Println("GoShock API running at http://localhost:8080")

	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}