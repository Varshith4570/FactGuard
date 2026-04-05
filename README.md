# FactGuard

**AI-Powered Video Content Verification**

FactGuard transcribes video/audio using the Groq Whisper API, extracts factual claims via Groq's LLaMA 3 model, verifies them with SerpAPI web searches, and scores each claim for accuracy.

---

## Project Structure

```
FactGuard/
├── backend/
│   ├── controllers/verifyController.js
│   ├── middleware/auth.js, upload.js
│   ├── models/User.js, Verification.js
│   ├── routes/auth.js, verify.js
│   ├── uploads/           ← auto-created
│   ├── .env               ← fill in your keys!
│   ├── package.json
│   └── server.js
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

---

## ⚠️ Before You Start — Fill in `.env`

Edit `backend/.env` and replace all placeholder values:

| Variable         | Where to get it |
|------------------|----------------|
| `MONGO_URI`      | MongoDB Atlas → Connect → Drivers |
| `JWT_SECRET`     | Any long random string |
| `GROQ_API_KEY`   | https://console.groq.com/keys |
| `SERPAPI_KEY`    | https://serpapi.com/manage-api-key |

---

## Requirements

- **Node.js** v18+
- **FFmpeg** in PATH (used for extracting audio from video files)

---

## Running Locally

```powershell
# In backend/ folder:
npm install
npm run dev         # uses nodemon (auto-restart)
# or
npm start           # plain node

# Then open browser at:
http://localhost:5000
```

---

## Usage

1. Open the application URL (localhost or deployed URL)
2. Register an account, then log in
3. Drag & drop (or browse) a video/audio file
4. Click **"Verify Now"**
5. See the transcript, per-claim scores, and overall accuracy score

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `MongoDB connection error` | Check `MONGO_URI` and Atlas IP whitelist (must include 0.0.0.0/0 if deploying) |
| `Audio extraction failed` | Ensure `ffmpeg` is installed and added to your system PATH |
| `Groq API error` | Check your `GROQ_API_KEY` at console.groq.com |
| `SerpAPI error` | Free tier = 100 searches/month; check your quota if verifications fail |
