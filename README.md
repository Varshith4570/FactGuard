# FactGuard

**AI-Powered Video Content Verification**

FactGuard transcribes video/audio using Vosk (offline speech recognition), extracts factual claims via Groq, verifies them with SerpAPI web searches, and scores each claim for accuracy.

---

## Project Structure

```
FactGuard/
├── backend/
│   ├── controllers/verifyController.js
│   ├── middleware/auth.js, upload.js
│   ├── models/User.js, Verification.js
│   ├── python_scripts/transcribe.py
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
| `OPENAI_API_KEY` | (Deprecated/Optional) |
| `SERPAPI_KEY`    | https://serpapi.com/manage-api-key |

---

## Requirements

- **Node.js** v18+
- **Python** 3.8+
- **FFmpeg** in PATH
- Python packages: `vosk`, `imageio[ffmpeg]`, `imageio-ffmpeg`

---

## Running

```powershell
# In backend/ folder:
npm run dev         # uses nodemon (auto-restart)
# or
npm start           # plain node

# Then open browser at:
http://localhost:5000
```

---

## Usage

1. Open `http://localhost:5000`
2. Register an account, then log in
3. Drag & drop (or browse) a video/audio file
4. Click **"Verify Now"**
5. See the transcript, per-claim scores, and overall accuracy score

---

> **Note:** The first time you run the backend, it will download a small (~40MB) Vosk acoustic model. Please be patient.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `MongoDB connection error` | Check `MONGO_URI` and Atlas IP whitelist |
| `Python script error` | Ensure `ffmpeg` is in PATH; run `ffmpeg -version` |
| `Vosk model download` | First run downloads ~40 MB model — wait for it |
| `Groq API error` | Check key at console.groq.com |
| `SerpAPI error` | Free tier = 100 searches/month; check quota |
