const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testTranscription() {
    const uploadDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadDir);
    if (files.length === 0) {
        console.log("No files to test.");
        return;
    }
    const filePath = path.join(uploadDir, files[0]);
    const tempAudio = path.join(uploadDir, 'temp_test.m4a');

    try {
        console.log("Extracting audio...");
        await execPromise(`ffmpeg -y -i "${filePath}" -vn -c:a aac -b:a 64k "${tempAudio}"`);
        console.log("Transcribing with Groq...");

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tempAudio),
            model: "whisper-large-v3",
            response_format: "json", // default
        });
        console.log("SUCCESS! Transcript:\n", transcription.text);
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);
    }
}

testTranscription();
