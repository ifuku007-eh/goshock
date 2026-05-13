package handlers

import (
	"bytes"
	"database/sql"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"goshock/storage"
	"goshock/utils"

	"github.com/gin-gonic/gin"
	qrcode "github.com/skip2/go-qrcode"
)

type URLHandler struct {
	db *sql.DB
}

func NewURLHandler(db *sql.DB) *URLHandler {
	return &URLHandler{db: db}
}

var validAlias = regexp.MustCompile(`^[a-zA-Z0-9\-]{3,30}$`)
var reservedWords = map[string]bool{
	"shorten": true, "qr": true, "api": true,
	"static": true, "admin": true, "dashboard": true, "login": true,
}

func (h *URLHandler) ShortenURL(c *gin.Context) {
	userID := c.GetInt64("user_id")

	longURL := c.PostForm("url")
	alias := strings.TrimSpace(c.PostForm("alias"))
	expiryDays := c.PostForm("expiry_days")

	if longURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL tidak boleh kosong"})
		return
	}
	parsed, err := url.ParseRequestURI(longURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL tidak valid. Harus diawali http:// atau https://"})
		return
	}

	var expiresAt *time.Time
	switch expiryDays {
	case "1":
		t := time.Now().Add(24 * time.Hour)
		expiresAt = &t
	case "7":
		t := time.Now().Add(7 * 24 * time.Hour)
		expiresAt = &t
	case "30":
		t := time.Now().Add(30 * 24 * time.Hour)
		expiresAt = &t
	}

	var shortCode string
	if alias != "" {
		if !validAlias.MatchString(alias) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Alias hanya boleh huruf, angka, tanda hubung. Min 3, maks 30 karakter."})
			return
		}
		if reservedWords[strings.ToLower(alias)] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Alias '" + alias + "' tidak bisa digunakan."})
			return
		}
		if _, err := storage.GetURLByCode(h.db, alias); err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Alias '" + alias + "' sudah digunakan."})
			return
		}
		shortCode = alias
	} else {
		for {
			shortCode = utils.GenerateShortCode(6)
			if _, err := storage.GetURLByCode(h.db, shortCode); err != nil {
				break
			}
		}
	}

	saved, err := storage.SaveURL(h.db, userID, shortCode, longURL, expiresAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan URL"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"short_url":  "http://localhost:8080/" + saved.ShortCode,
		"short_code": saved.ShortCode,
		"long_url":   saved.LongURL,
		"qr_url":     "http://localhost:8080/api/qr/" + saved.ShortCode,
		"clicks":     saved.Clicks,
		"expires_at": saved.ExpiresAt,
	})
}

func (h *URLHandler) GetQRCode(c *gin.Context) {
	code := c.Param("code")
	urlRecord, err := storage.GetURLByCode(h.db, code)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tidak ditemukan"})
		return
	}
	qr, err := qrcode.New(urlRecord.LongURL, qrcode.High)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal generate QR"})
		return
	}
	png, err := qr.PNG(300)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal render QR"})
		return
	}
	var buf bytes.Buffer
	buf.Write(png)
	c.Header("Content-Type", "image/png")
	c.Header("Cache-Control", "public, max-age=86400")
	c.Data(http.StatusOK, "image/png", buf.Bytes())
}

func (h *URLHandler) GetMyLinks(c *gin.Context) {
	userID := c.GetInt64("user_id")
	links, err := storage.GetURLsByUserID(h.db, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data"})
		return
	}

	type Row struct {
		ID        int64      `json:"id"`
		ShortCode string     `json:"short_code"`
		ShortURL  string     `json:"short_url"`
		LongURL   string     `json:"long_url"`
		QrURL     string     `json:"qr_url"`
		Clicks    int        `json:"clicks"`
		CreatedAt time.Time  `json:"created_at"`
		ExpiresAt *time.Time `json:"expires_at"`
		IsExpired bool       `json:"is_expired"`
	}

	result := make([]Row, 0)
	for _, l := range links {
		expired := l.ExpiresAt != nil && time.Now().After(*l.ExpiresAt)
		result = append(result, Row{
			ID:        l.ID,
			ShortCode: l.ShortCode,
			ShortURL:  "http://localhost:8080/" + l.ShortCode,
			LongURL:   l.LongURL,
			QrURL:     "http://localhost:8080/api/qr/" + l.ShortCode,
			Clicks:    l.Clicks,
			CreatedAt: l.CreatedAt,
			ExpiresAt: l.ExpiresAt,
			IsExpired: expired,
		})
	}
	c.JSON(http.StatusOK, result)
}

func (h *URLHandler) GetMyStats(c *gin.Context) {
	userID := c.GetInt64("user_id")
	total, clicks, active := storage.GetStatsByUserID(h.db, userID)
	c.JSON(http.StatusOK, gin.H{
		"total_links":  total,
		"total_clicks": clicks,
		"active_links": active,
	})
}

// GetClickChart mengembalikan data klik per jam untuk 24 jam terakhir
func (h *URLHandler) GetClickChart(c *gin.Context) {
	code := c.Param("code")

	// Validasi link milik user yang sedang login
	userID := c.GetInt64("user_id")
	urlRecord, err := storage.GetURLByCode(h.db, code)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Link tidak ditemukan"})
		return
	}
	if urlRecord.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Bukan link milik Anda"})
		return
	}

	stats, err := storage.GetClicksPerHour(h.db, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data chart"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"short_code": urlRecord.ShortCode,
		"short_url":  "http://localhost:8080/" + urlRecord.ShortCode,
		"long_url":   urlRecord.LongURL,
		"qr_url":     "http://localhost:8080/api/qr/" + urlRecord.ShortCode,
		"clicks":     urlRecord.Clicks,
		"created_at": urlRecord.CreatedAt,
		"expires_at": urlRecord.ExpiresAt,
		"chart":      stats,
	})
}

func (h *URLHandler) DeleteMyLink(c *gin.Context) {
	userID := c.GetInt64("user_id")
	code := c.Param("code")
	if err := storage.DeleteURL(h.db, code, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil dihapus"})
}

func (h *URLHandler) RedirectURL(c *gin.Context) {
	code := c.Param("code")
	u, err := storage.GetURLByCode(h.db, code)
	if err != nil {
		c.String(http.StatusNotFound, "Link tidak ditemukan")
		return
	}
	if u.ExpiresAt != nil && time.Now().After(*u.ExpiresAt) {
		c.String(http.StatusGone, "Link sudah kadaluarsa")
		return
	}
	go storage.IncrementClicks(h.db, code)
	c.Header("Cache-Control", "no-store")
	c.Redirect(http.StatusMovedPermanently, u.LongURL)
}
