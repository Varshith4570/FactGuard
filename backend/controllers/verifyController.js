const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Verification = require('../models/Verification');
const Groq = require('groq-sdk');
const { getJson } = require('serpapi');
const dotenv = require('dotenv');
dotenv.config();

let groqInstance = null;
function getGroq() {
    if (!groqInstance) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error("CRITICAL: GROQ_API_KEY is not set in environment variables.");
        }
        groqInstance = new Groq({ apiKey });
    }
    return groqInstance;
}

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const crypto = require('crypto');

// ─── Extract Audio & Transcribe via Groq Whisper ───────────────────────────
async function transcribeAudio(filePath) {
    const groq = getGroq();
    // generate a safe temp file name
    const tempAudioPath = path.join(__dirname, '..', 'uploads', `temp_${crypto.randomBytes(8).toString('hex')}.m4a`);

    try {
        // Extract a small, highly compressed audio file using ffmpeg
        await exec(`ffmpeg -y -i "${filePath}" -vn -c:a aac -b:a 64k "${tempAudioPath}"`);

        // Transcribe through Groq's Whisper API (Free & Extremely fast)
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tempAudioPath),
            model: "whisper-large-v3",
            response_format: "verbose_json",
        });

        return transcription.text;
    } catch (err) {
        throw new Error('Groq transcription failed: ' + err.message);
    } finally {
        // Clean up the temp file
        if (fs.existsSync(tempAudioPath)) {
            fs.unlinkSync(tempAudioPath);
        }
    }
}

// ─── Extract Claims via Groq ───────────────────────────────────────────────
async function extractClaims(transcript) {
    const prompt = `Extract all distinct factual claims from the following text. Return ONLY a valid JSON array of strings, no other text.

Text: "${transcript.substring(0, 3000)}"

Return format: ["claim 1", "claim 2", ...]`;

    const groq = getGroq();
    const result = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0,
    });

    let content = result.choices[0].message.content.trim();

    // Strip markdown formatting if any
    if (content.startsWith('```json')) {
        content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (content.startsWith('```')) {
        content = content.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    try {
        return JSON.parse(content);
    } catch (e) {
        const match = content.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
        throw new Error('Could not parse claims from Groq response');
    }
}

// ─── Search a Claim with SerpAPI ─────────────────────────────────────────────
async function searchClaim(claim) {
    const response = await getJson({
        q: claim,
        api_key: process.env.SERPAPI_KEY,
        engine: 'google',
        num: 3,
    });
    const results = response.organic_results || [];
    return results.map(r => r.snippet || '').filter(Boolean).join('\n');
}

// ─── Verify Claims via Groq + SerpAPI ──────────────────────────────────────
async function verifyClaims(claims) {
    const verifiedDetails = [];
    let totalScore = 0;

    // Limit to 5 claims to save API quota
    const claimsToCheck = claims.slice(0, 5);
    const groq = getGroq();

    for (const claim of claimsToCheck) {
        let snippets = '';
        try {
            snippets = await searchClaim(claim);
        } catch (searchErr) {
            snippets = 'Search unavailable';
        }

        const prompt = `Based on the search results below, rate this claim from 0 (completely false) to 10 (completely true).
Return ONLY a single integer between 0 and 10, nothing else.

Claim: "${claim}"
Search results:
${snippets || 'No search results available'}`;

        const result = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0,
        });

        const scoreText = result.choices[0].message.content.trim();
        const score = parseInt(scoreText.replace(/[^0-9]/g, ''), 10);
        const finalScore = isNaN(score) ? 5 : Math.min(10, Math.max(0, score));

        verifiedDetails.push({ claim, score: finalScore, snippets });
        totalScore += finalScore;
    }

    const avgScore = claimsToCheck.length > 0
        ? Math.round((totalScore / claimsToCheck.length) * 10) // convert 0-10 → 0-100
        : 50;

    return { score: avgScore, details: verifiedDetails };
}

// ─── Controller: Verify File ─────────────────────────────────────────────────
exports.verifyFile = async (req, res) => {
    let filePath = null;
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        filePath = req.file.path;

        // Run Groq Whisper transcription directly
        const transcript = await transcribeAudio(filePath);

        if (!transcript || transcript.trim() === '') {
            return res.status(400).json({ error: 'Could not extract any speech from the file' });
        }

        // Extract claims
        const claims = await extractClaims(transcript);

        // Verify claims
        const verification = await verifyClaims(claims);

        // Save to database
        const record = new Verification({
            user: req.user,
            inputType: 'file',
            input: req.file.originalname,
            transcript,
            claims,
            verificationScore: verification.score,
            details: verification.details,
        });
        await record.save();

        res.json({
            transcript,
            claims,
            score: verification.score,
            details: verification.details,
        });
    } catch (err) {
        console.error('verifyFile error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ─── Controller: Get History ─────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
    try {
        const records = await Verification.find({ user: req.user })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
