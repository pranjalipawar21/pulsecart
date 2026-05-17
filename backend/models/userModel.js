const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
    findByUsername: async (username) => {
        const [rows] = await db.execute(
            'SELECT id, username, password_hash, role, full_name, email FROM users WHERE username = ?',
            [username]
        );
        return rows[0];
    },

    findById: async (id) => {
        const [rows] = await db.execute(
            'SELECT id, username, role, full_name, email, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    },

    getAll: async () => {
        const [rows] = await db.execute(
            'SELECT id, username, role, full_name, email, created_at FROM users ORDER BY created_at DESC'
        );
        return rows;
    },

    create: async (username, plainPassword, role = 'staff', fullName = '', email = '') => {
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(plainPassword, saltRounds);
        const [result] = await db.execute(
            'INSERT INTO users (username, password_hash, role, full_name, email) VALUES (?, ?, ?, ?, ?)',
            [username, password_hash, role, fullName, email]
        );
        return result.insertId;
    },
};

module.exports = User;
