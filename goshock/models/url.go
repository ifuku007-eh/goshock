package models

import "time"

type URL struct {
	ID        int64      `json:"id"`
	UserID    int64      `json:"user_id"`
	ShortCode string     `json:"short_code"`
	LongURL   string     `json:"long_url"`
	Clicks    int        `json:"clicks"`
	CreatedAt time.Time  `json:"created_at"`
	ExpiresAt *time.Time `json:"expires_at"`
}

type ClickStat struct {
	Date   string `json:"date"`
	Clicks int    `json:"clicks"`
}
