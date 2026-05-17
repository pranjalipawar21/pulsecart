const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
    /**
     * Find a user by username. Returns undefined if not found.
     */
    findByUsername: async (username) => {
        const [rows] = await db.execute(
            'SELECT id, username, password_hash, role, full_name FROM users WHERE username = ?',
            [username]
        );
        return rows[0];
    },

    /**
     * Find a user by ID (used for token refresh / me endpoint).
     */
    findById: async (id) => {
        const [rows] = await db.execute(
            'SELECT id, username, role, full_name, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    },

    /**
     * Create a new user with a bcrypt-hashed password.
     * @param {string} username
     * @param {string} plainPassword
     * @param {string} role  — 'owner' | 'staff'
     * @param {string} fullName
     */
    create: async (username, plainPassword, role = 'staff', fullName = '') => {
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(plainPassword, saltRounds);
        const [result] = await db.execute(
            'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)',
            [username, password_hash, role, fullName]
        );
        return result.insertId;
    },
};

module.exports = User;
