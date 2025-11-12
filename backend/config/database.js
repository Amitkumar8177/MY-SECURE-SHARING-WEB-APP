// backend/config/database.js
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcryptjs'); // For hashing default admin password

async function openDb() {
  const db = await open({
    filename: './database.sqlite', // The database file
    driver: sqlite3.Database,
  });

  // Enable foreign key support (important for relationships)
  await db.exec('PRAGMA foreign_keys = ON;');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL UNIQUE,
      size INTEGER NOT NULL,
      is_private INTEGER DEFAULT 1,
      upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- NEW TABLE FOR SHARING
    CREATE TABLE IF NOT EXISTS shared_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      shared_by_user_id INTEGER NOT NULL,
      shared_with_user_id INTEGER NOT NULL,
      shared_date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (file_id, shared_with_user_id) -- A file can be shared only once with a specific user
    );
  `);

  // Check if admin user exists, if not, create default admin
  const adminUser = await db.get('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('adminpassword', 10); // Hash default admin password
    await db.run(
      'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@example.com', hashedPassword, 1] // 1 for admin
    );
    console.log('Default admin user created.');
  }

  return db;
}

module.exports = { openDb };