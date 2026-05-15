const db = require('../config/db');
const axios = require('axios');
const fs = require('fs');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

exports.analyzeLive = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

        const response = await axios.post(`${ML_SERVICE_URL}/analyze-live`, { text });
        res.json({ success: true, data: response.data });
    } catch (err) {
        console.error('ML Service Error:', err.message);
        res.status(500).json({ success: false, message: 'Sentiment analysis service is unavailable' });
    }
};

exports.uploadCSV = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    try {
        const fileContent = fs.readFileSync(req.file.path, 'utf-8');
        const lines = fileContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const txtIdx = headers.indexOf('review_text');
        if (txtIdx === -1) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'CSV must contain review_text column' });
        }

        const reviews = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const cols = lines[i].split(',').map(c => c.trim());
            reviews.push({
                product_id:   cols[headers.indexOf('product_id')] || null,
                product_name: cols[headers.indexOf('product_name')] || 'Unknown',
                review_text:  cols[txtIdx],
                rating:       cols[headers.indexOf('rating')] || null,
                review_date:  cols[headers.indexOf('review_date')] || null
            });
        }

        // 1. Store reviews in DB
        const insertedIds = [];
        for (const r of reviews) {
            const [result] = await db.execute(
                'INSERT INTO product_reviews (product_id, product_name, review_text, rating, review_date) VALUES (?,?,?,?,?)',
                [r.product_id, r.product_name, r.review_text, r.rating, r.review_date]
            );
            insertedIds.push({ id: result.insertId, text: r.review_text });
        }

        // 2. Send to ML service
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/analyze-bulk`, {
            reviews: insertedIds.map(i => ({ id: i.id, text: i.text }))
        });

        // 3. Store sentiment results
        if (mlResponse.data.success) {
            for (const s of mlResponse.data.results) {
                await db.execute(
                    'INSERT INTO sentiment_results (review_id, score, label, confidence, keywords) VALUES (?,?,?,?,?)',
                    [s.review_id, s.score, s.label, s.confidence, JSON.stringify(s.keywords)]
                );
            }
        }

        fs.unlinkSync(req.file.path);
        res.json({ success: true, message: `Processed ${reviews.length} reviews successfully` });

    } catch (err) {
        console.error(err);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const [total]    = await db.execute('SELECT COUNT(*) as count FROM sentiment_results');
        const [labels]   = await db.execute('SELECT label, COUNT(*) as count FROM sentiment_results GROUP BY label');
        const [avgScore] = await db.execute('SELECT AVG(score) as avg FROM sentiment_results');
        const [recent]   = await db.execute(`
            SELECT r.product_name, r.review_text, s.label, s.score, s.keywords 
            FROM sentiment_results s 
            JOIN product_reviews r ON s.review_id = r.id 
            ORDER BY s.created_at DESC LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                total: total[0].count,
                labels: labels.reduce((acc, curr) => ({ ...acc, [curr.label]: curr.count }), {}),
                avgScore: avgScore[0].avg || 0,
                recent
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
