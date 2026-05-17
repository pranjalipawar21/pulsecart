const db = require('../config/db');
const fs = require('fs');

// A simple, robust, fast keyword-based sentiment analyzer in Node.js
// Eliminates the need for external Python services, making the application 100% self-contained.
const POSITIVE_WORDS = [
    'great', 'awesome', 'good', 'love', 'excellent', 'best', 'perfect', 'fast', 'helpful', 
    'amazing', 'fantastic', 'satisfied', 'superb', 'wonderful', 'cool', 'nice', 'delighted'
];
const NEGATIVE_WORDS = [
    'bad', 'poor', 'hate', 'worst', 'terrible', 'slow', 'broken', 'defective', 'refund', 
    'waste', 'expensive', 'useless', 'disappointed', 'failed', 'returned', 'damage', 'damaged'
];

function analyzeText(text) {
    if (!text) return { score: 0, label: 'neutral', confidence: 0.5, keywords: [] };

    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    let posCount = 0;
    let negCount = 0;
    const foundKeywords = [];

    words.forEach(w => {
        if (POSITIVE_WORDS.includes(w)) {
            posCount++;
            if (!foundKeywords.includes(w)) foundKeywords.push(w);
        }
        if (NEGATIVE_WORDS.includes(w)) {
            negCount++;
            if (!foundKeywords.includes(w)) foundKeywords.push(w);
        }
    });

    const total = posCount + negCount;
    let score = 0;
    let label = 'neutral';
    let confidence = 0.5;

    if (total > 0) {
        score = (posCount - negCount) / total;
        if (score > 0.1) {
            label = 'positive';
            confidence = 0.5 + (score * 0.5);
        } else if (score < -0.1) {
            label = 'negative';
            confidence = 0.5 + (Math.abs(score) * 0.5);
        }
    }

    return {
        score: parseFloat(score.toFixed(3)),
        label,
        confidence: parseFloat(confidence.toFixed(3)),
        keywords: foundKeywords.slice(0, 5)
    };
}

exports.analyzeLive = async (req, res, next) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

        const result = analyzeText(text);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

exports.uploadCSV = async (req, res, next) => {
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
                product_name: cols[headers.indexOf('product_name')] || 'Unknown Product',
                review_text:  cols[txtIdx],
                rating:       cols[headers.indexOf('rating')] || null,
                review_date:  cols[headers.indexOf('review_date')] || null
            });
        }

        // Store reviews in DB & analyze instantly using the self-contained JS engine
        for (const r of reviews) {
            const [result] = await db.execute(
                'INSERT INTO product_reviews (product_id, product_name, review_text, rating, review_date) VALUES (?,?,?,?,?)',
                [r.product_id, r.product_name, r.review_text, r.rating, r.review_date]
            );
            
            const analysis = analyzeText(r.review_text);
            await db.execute(
                'INSERT INTO sentiment_results (review_id, score, label, confidence, keywords) VALUES (?,?,?,?,?)',
                [result.insertId, analysis.score, analysis.label, analysis.confidence, JSON.stringify(analysis.keywords)]
            );
        }

        fs.unlinkSync(req.file.path);
        res.json({ success: true, message: `Processed & analyzed ${reviews.length} reviews successfully using localized NLP engine.` });

    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        next(err);
    }
};

exports.getStats = async (req, res, next) => {
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

        // Safeguard to format labels count
        const labelCounts = { positive: 0, neutral: 0, negative: 0 };
        labels.forEach(l => {
            if (l.label in labelCounts) {
                labelCounts[l.label] = l.count;
            }
        });

        res.json({
            success: true,
            data: {
                total: total[0].count,
                labels: labelCounts,
                avgScore: avgScore[0].avg || 0,
                recent
            }
        });
    } catch (err) {
        next(err);
    }
};
