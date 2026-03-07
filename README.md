# 🚀 Deploy NovChat in 10 Minutes (FREE)

## What's in this folder
```
chat-app/
├── server.js        ← Backend (Node.js + Socket.io)
├── package.json     ← Dependencies
└── public/
    └── index.html   ← Frontend (the chat UI)
```

---

## Deploy on Railway (Recommended — Free)

1. Go to **https://railway.app** → Sign up with GitHub (free)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Upload this folder to a GitHub repo first:
   - Go to **github.com** → New repository → Upload the files
4. Connect the repo in Railway → it auto-detects Node.js
5. Railway gives you a URL like: `https://novchat-xxxx.up.railway.app`
6. **Share that link with friends — done! 🎉**

---

## Deploy on Render (Also Free)

1. Go to **https://render.com** → Sign up
2. New → **Web Service** → Connect GitHub repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Get your public URL → share!

---

## Run Locally (for testing)

```bash
cd chat-app
npm install
node server.js
# Open http://localhost:3000
```

---

## Features
- ✅ Real-time messaging (WebSockets)
- ✅ Multiple rooms — just type a room name
- ✅ No login or signup needed
- ✅ Typing indicators
- ✅ Online user count & sidebar
- ✅ Emoji picker
- ✅ Beautiful animated UI
- ✅ Works on mobile
