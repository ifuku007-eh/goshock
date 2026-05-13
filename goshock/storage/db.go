package storage

import (
	"database/sql"
	"time"

	"goshock/models"

	_ "github.com/mattn/go-sqlite3"
)

func InitDB(filepath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", filepath)
	if err != nil {
		return nil, err
	}

	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id         INTEGER  PRIMARY KEY AUTOINCREMENT,
		username   TEXT     NOT NULL UNIQUE,
		email      TEXT     NOT NULL UNIQUE,
		password   TEXT     NOT NULL,
		created_at DATETIME NOT NULL
	);
	CREATE TABLE IF NOT EXISTS urls (
		id         INTEGER  PRIMARY KEY AUTOINCREMENT,
		user_id    INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		short_code TEXT     NOT NULL UNIQUE,
		long_url   TEXT     NOT NULL,
		clicks     INTEGER  NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL,
		expires_at DATETIME
	);
	CREATE TABLE IF NOT EXISTS click_logs (
		id         INTEGER  PRIMARY KEY AUTOINCREMENT,
		short_code TEXT     NOT NULL,
		clicked_at DATETIME NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX IF NOT EXISTS idx_short_code  ON urls(short_code);
	CREATE INDEX IF NOT EXISTS idx_user_id     ON urls(user_id);
	CREATE INDEX IF NOT EXISTS idx_click_logs  ON click_logs(short_code, clicked_at);`

	if _, err = db.Exec(schema); err != nil {
		return nil, err
	}

	// Migrate lama: tambah kolom jika belum ada
	db.Exec(`ALTER TABLE urls ADD COLUMN expires_at DATETIME`)

	return db, nil
}

// ── User ────────────────────────────────────────────────────

func CreateUser(db *sql.DB, username, email, hashedPassword string) (*models.User, error) {
	now := time.Now()
	res, err := db.Exec(
		`INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)`,
		username, email, hashedPassword, now,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &models.User{ID: id, Username: username, Email: email, CreatedAt: now}, nil
}

func GetUserByEmail(db *sql.DB, email string) (*models.User, error) {
	u := &models.User{}
	err := db.QueryRow(
		`SELECT id, username, email, password, created_at FROM users WHERE email = ?`, email,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Password, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func GetUserByID(db *sql.DB, id int64) (*models.User, error) {
	u := &models.User{}
	err := db.QueryRow(
		`SELECT id, username, email, created_at FROM users WHERE id = ?`, id,
	).Scan(&u.ID, &u.Username, &u.Email, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

// ── URL ─────────────────────────────────────────────────────

func SaveURL(db *sql.DB, userID int64, shortCode, longURL string, expiresAt *time.Time) (*models.URL, error) {
	now := time.Now()
	res, err := db.Exec(
		`INSERT INTO urls (user_id, short_code, long_url, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`,
		userID, shortCode, longURL, now, expiresAt,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &models.URL{
		ID: id, UserID: userID, ShortCode: shortCode,
		LongURL: longURL, Clicks: 0, CreatedAt: now, ExpiresAt: expiresAt,
	}, nil
}

func GetURLByCode(db *sql.DB, shortCode string) (*models.URL, error) {
	u := &models.URL{}
	err := db.QueryRow(
		`SELECT id, user_id, short_code, long_url, clicks, created_at, expires_at FROM urls WHERE short_code = ?`,
		shortCode,
	).Scan(&u.ID, &u.UserID, &u.ShortCode, &u.LongURL, &u.Clicks, &u.CreatedAt, &u.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func GetURLsByUserID(db *sql.DB, userID int64) ([]*models.URL, error) {
	rows, err := db.Query(
		`SELECT id, user_id, short_code, long_url, clicks, created_at, expires_at
		 FROM urls WHERE user_id = ? ORDER BY created_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.URL
	for rows.Next() {
		u := &models.URL{}
		if err := rows.Scan(&u.ID, &u.UserID, &u.ShortCode, &u.LongURL, &u.Clicks, &u.CreatedAt, &u.ExpiresAt); err != nil {
			continue
		}
		list = append(list, u)
	}
	return list, nil
}

func GetStatsByUserID(db *sql.DB, userID int64) (totalLinks, totalClicks, activeLinks int) {
	db.QueryRow(`SELECT COUNT(*) FROM urls WHERE user_id = ?`, userID).Scan(&totalLinks)
	db.QueryRow(`SELECT COALESCE(SUM(clicks),0) FROM urls WHERE user_id = ?`, userID).Scan(&totalClicks)
	db.QueryRow(
		`SELECT COUNT(*) FROM urls WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`,
		userID,
	).Scan(&activeLinks)
	return
}

func DeleteURL(db *sql.DB, shortCode string, userID int64) error {
	_, err := db.Exec(`DELETE FROM urls WHERE short_code = ? AND user_id = ?`, shortCode, userID)
	return err
}

// IncrementClicks mencatat klik ke tabel urls DAN click_logs
func IncrementClicks(db *sql.DB, shortCode string) error {
	db.Exec(`UPDATE urls SET clicks = clicks + 1 WHERE short_code = ?`, shortCode)
	_, err := db.Exec(
		`INSERT INTO click_logs (short_code, clicked_at) VALUES (?, datetime('now'))`,
		shortCode,
	)
	return err
}

// ClickHourStat adalah data klik per jam untuk satu short code
type ClickHourStat struct {
	Hour   string `json:"hour"`   // format "HH:00"
	Clicks int    `json:"clicks"`
}

// GetClicksPerHour mengembalikan data klik per jam untuk 24 jam terakhir
func GetClicksPerHour(db *sql.DB, shortCode string) ([]ClickHourStat, error) {
	rows, err := db.Query(`
		SELECT
			strftime('%H:00', clicked_at) AS hour,
			COUNT(*) AS clicks
		FROM click_logs
		WHERE short_code = ?
		  AND clicked_at >= datetime('now', '-24 hours')
		GROUP BY strftime('%H', clicked_at)
		ORDER BY strftime('%H', clicked_at) ASC
	`, shortCode)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Buat map jam → klik
	clickMap := make(map[string]int)
	for rows.Next() {
		var hour string
		var clicks int
		if err := rows.Scan(&hour, &clicks); err != nil {
			continue
		}
		clickMap[hour] = clicks
	}

	// Isi 24 jam terakhir (jam saat ini mundur ke belakang, agar urut kronologis)
	now := time.Now()
	result := make([]ClickHourStat, 24)
	for i := 0; i < 24; i++ {
		t := now.Add(time.Duration(i-23) * time.Hour)
		label := t.Format("15:00")
		result[i] = ClickHourStat{
			Hour:   label,
			Clicks: clickMap[label],
		}
	}
	return result, nil
}
