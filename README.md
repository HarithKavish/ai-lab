# AI Chat - DistilGPT2 Browser-Based Chat

A lightweight, fast AI chat application powered by **DistilGPT2** running entirely in your browser using WebAssembly. No server needed, no API keys required!

## ✨ Features

- **Browser-Based AI**: DistilGPT2 model runs 100% client-side using Transformers.js
- **No Backend Required**: All processing happens in your browser
- **Multiple Conversations**: Create and manage unlimited chat sessions
- **Persistent Storage**: All chats saved to localStorage and Google Drive
- **Google Drive Sync**: Automatic cloud backup of all conversations
- **Dark/Light Mode**: Theme toggle in header
- **Google OAuth**: Sign in with Google account
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Glassmorphism UI**: Modern, frosted glass design effects
- **Conversation Memory**: AI maintains context from previous messages

## 🚀 Quick Start

### Live Demo
Visit: [harithkavish.github.io/ai/](https://harithkavish.github.io/ai/)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/HarithKavish/AI-Chat.git
cd AI-Chat
```

2. **Start a local server** (Python)
```bash
python -m http.server 5500
# or for Python 2
python -m SimpleHTTPServer 5500
```

3. **Open in browser**
```
http://localhost:5500
```

## 📋 System Requirements

- Modern browser with WebAssembly support
- ~200MB disk space for DistilGPT2 model (downloaded once on first load)
- No installation or dependencies needed

## 🔧 Technology Stack

- **Language**: Vanilla JavaScript (ES6+)
- **AI Model**: DistilGPT2 (distilbert-base-cased)
- **Model Loading**: Transformers.js + ONNX Runtime
- **CSS**: Custom CSS with glassmorphism effects
- **Storage**: localStorage + Google Drive API
- **Authentication**: Google OAuth 2.0

## 📁 Project Structure

```
AI-Chat/
├── index.html           # Main HTML structure
├── app.js              # Core app logic, AI chat handler
├── styles.css          # UI styling with glassmorphism
├── GOOGLE_DRIVE_SYNC.md # Drive integration setup guide
└── README.md           # This file
```

## 🎯 How It Works

### First Time Setup
1. Page loads and downloads DistilGPT2 model (~200MB)
2. Model loads into browser memory
3. Ready to chat locally

### Chat Flow
1. User types message
2. Message added to sidebar chat list
3. AI generates response using conversation history (last 5 message pairs)
4. Response displayed in chat
5. Both messages saved to localStorage
6. If authenticated, synced to Google Drive

### Chat Persistence
- **localStorage**: Stores all chats locally for instant access
- **Google Drive**: Optional cloud backup (requires Google Sign-In)
- One file per day: `ai-chats-YYYY-MM-DD.json`

## 🔐 Google Drive Integration

### Setup
1. Create Google OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Drive API
3. Add your domain to authorized redirect URIs
4. Update Client ID in `app.js`

### How It Works
- Click "Sign in with Google" in header
- Authenticate with your Google account
- Grant Drive access permission
- All future chats automatically sync to your Drive
- Stored in "AI Chat Backups" folder

**Privacy**: Your data is only stored in your personal Google Drive. No third-party servers involved.

## 🎨 UI Features

### Sidebar
- **New Chat Button**: Start fresh conversation
- **Chat History**: List of all conversations
- **Chat Management**: 
  - Click to switch chats
  - Double-click to rename
  - Click ✕ to delete

### Main Chat Area
- **Chat Header**: Title and model status
- **Messages Area**: Scrollable chat history with glassmorphism bubbles
- **User Messages**: Blue gradient background
- **AI Messages**: Semi-transparent with backdrop blur
- **Input Form**: Bottom text input with Send button

### Header
- **Brand**: "Harith Kavish" with nav links
- **Theme Toggle**: Light/dark mode button
- **Google Sign-In**: OAuth button for Drive sync

## 🚀 Deployment

### GitHub Pages

1. **Rename your repo** to `AI-Chat` (if not already)

2. **Update repository settings**:
   - Go to Settings → Pages
   - Select "main" branch as source
   - Click Save

3. **Access your site**:
   ```
   https://YOUR_USERNAME.github.io/AI-Chat/
   ```

### Deploy to Your Domain

If you have a custom domain, add CNAME file:
```bash
echo "yourcustom.domain" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push
```

Then configure your domain's DNS settings to point to GitHub Pages.

## ⚙️ Configuration

### Model Settings
Edit `app.js` - line 4:
```javascript
const SYSTEM_PROMPT = "You are a helpful, friendly AI assistant...";
```

### Google OAuth (Optional)
Edit `app.js` - line 7:
```javascript
const GOOGLE_DRIVE_API_KEY = 'YOUR_API_KEY_HERE';
```

### AI Generation Parameters
Edit `app.js` - `sendMessage()` function:
```javascript
const result = await pipeline(prompt, {
    max_new_tokens: 100,      // Response length
    temperature: 0.7,          // Creativity (0.0-1.0)
    top_k: 50,                 // Token sampling
    top_p: 0.95,               // Nucleus sampling
    repetition_penalty: 1.2    // Prevent repetition
});
```

## 📊 Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Recommended |
| Firefox | ✅ Full | Great performance |
| Safari | ✅ Full | May need webkit prefix CSS |
| Edge | ✅ Full | Chromium-based |
| IE 11 | ❌ No | WebAssembly not supported |

## 🐛 Troubleshooting

### Model Takes Long to Load
- First load downloads ~200MB model - this is normal
- Subsequent loads use cached model
- Use `Clear Storage` in DevTools if needed

### Chat Not Saving
- Check browser localStorage is enabled
- For Drive sync, ensure you're signed in
- Check browser console for errors

### AI Responses Slow
- Model uses CPU for inference (first time slower)
- Response quality depends on input length
- Longer prompts = longer generation time

### Drive Sync Not Working
- Verify Google Sign-In was successful
- Check Drive "AI Chat Backups" folder
- Ensure OAuth credentials are valid
- Check browser console for API errors

## 📈 Performance

- **Model Download**: 1-5 minutes (first time)
- **Model Loading**: 10-30 seconds
- **Response Generation**: 2-10 seconds per message
- **Message History Lookup**: <100ms
- **localStorage Access**: Instant

## 🤝 Contributing

Found a bug or want to add features? 
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Credits

- **AI Model**: [Xenova/distilgpt2](https://huggingface.co/Xenova/distilgpt2) via Hugging Face
- **Model Framework**: [Transformers.js](https://xenova.github.io/transformers.js/)
- **UI Framework**: Custom CSS + Vanilla JS
- **Icons**: Unicode + Google Fonts

## 📚 References

- [Transformers.js Documentation](https://xenova.github.io/transformers.js/)
- [DistilGPT2 Model Card](https://huggingface.co/Xenova/distilgpt2)
- [Google Drive API](https://developers.google.com/drive)
- [GitHub Pages Deployment](https://docs.github.com/en/pages)

## 🎯 Future Enhancements

- [ ] Export conversations as PDF
- [ ] Share chat links
- [ ] Conversation search
- [ ] Typing animation
- [ ] Voice input/output
- [ ] Multi-language support
- [ ] Custom system prompts per chat
- [ ] Chat statistics/insights

---

**Made by Harith Kavish** | [Portfolio](https://harithkavish.github.io) | [GitHub](https://github.com/HarithKavish)
