import { getDB } from './db';

export async function initializeDatabase() {
  const db = getDB();

  return new Promise<void>((resolve, reject) => {
    // Create users table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        password TEXT,
        name TEXT,
        telegram_id INTEGER UNIQUE,
        telegram_username TEXT,
        telegram_first_name TEXT,
        telegram_last_name TEXT,
        telegram_photo_url TEXT,
        auth_method TEXT DEFAULT 'email',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(email),
        UNIQUE(telegram_id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
        reject(err);
      } else {
        console.log('Database initialized successfully');

        // Add new columns if they don't exist (for existing databases)
        const columnsToAdd = [
          { name: 'telegram_id', type: 'INTEGER' },
          { name: 'telegram_username', type: 'TEXT' },
          { name: 'telegram_first_name', type: 'TEXT' },
          { name: 'telegram_last_name', type: 'TEXT' },
          { name: 'telegram_photo_url', type: 'TEXT' },
          { name: 'auth_method', type: 'TEXT DEFAULT "email"' }
        ];

        let completed = 0;
        columnsToAdd.forEach(column => {
          db.run(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`, (alterErr) => {
            // Ignore "column already exists" errors
            if (alterErr && !alterErr.message.includes('already exists')) {
              console.error(`Error adding column ${column.name}:`, alterErr);
            }
            completed++;
            if (completed === columnsToAdd.length) {
              resolve();
            }
          });
        });
      }
    });
  });
}