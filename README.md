# AI Chat - DistilGPT2 Browser-Based Chat

A 
lightweight, fast AI chat application powered
 by **DistilGPT2** running entirely in your b
rowser using WebAssembly. No server needed, n
o API keys required!

## ✨ Features

- **Br
owser-Based AI**: DistilGPT2 model runs 100% 
client-side using Transformers.js
- **No Back
end Required**: All processing happens in you
r browser
- **Multiple Conversations**: Creat
e and manage unlimited chat sessions
- **Pers
istent Storage**: All chats saved to localSto
rage and Google Drive
- **Google Drive Sync**
: Automatic cloud backup of all conversations

- **Dark/Light Mode**: Theme toggle in heade
r
- **Google OAuth**: Sign in with Google acc
ount
- **Responsive Design**: Works on deskto
p, tablet, and mobile
- **Glassmorphism UI**:
 Modern, frosted glass design effects
- **Con
versation Memory**: AI maintains context from
 previous messages

## 🚀 Quick Start

### 
Live Demo
Visit: [harithkavish.github.io/ai-l
ab/](https://harithkavish.github.io/ai-lab/)


### Local Development

1. **Clone the reposi
tory**
```bash
git clone https://github.com/H
arithKavish/AI-Chat.git
cd AI-Chat
```

2. **
Start a local server** (Python)
```bash
pytho
n -m http.server 5500
# or for Python 2
pytho
n -m SimpleHTTPServer 5500
```

3. **Open in 
browser**
```
http://localhost:5500
```

## �
��� System Requirements

- Modern browser wit
h WebAssembly support
- ~200MB disk space for
 DistilGPT2 model (downloaded once on first l
oad)
- No installation or dependencies needed


## 🔧 Technology Stack

- **Language**: V
anilla JavaScript (ES6+)
- **AI Model**: Dist
ilGPT2 (distilbert-base-cased)
- **Model Load
ing**: Transformers.js + ONNX Runtime
- **CSS
**: Custom CSS with glassmorphism effects
- *
*Storage**: localStorage + Google Drive API
-
 **Authentication**: Google OAuth 2.0

## �
� Project Structure

```
AI-Chat/
├── i
ndex.html           # Main HTML structure
├
── app.js              # Core app logic, 
AI chat handler
├── styles.css         
 # UI styling with glassmorphism
├── GO
OGLE_DRIVE_SYNC.md # Drive integration setup 
guide
└── README.md           # This fi
le
```

## 🎯 How It Works

### First Time 
Setup
1. Page loads and downloads DistilGPT2 
model (~200MB)
2. Model loads into browser me
mory
3. Ready to chat locally

### Chat Flow

1. User types message
2. Message added to sid
ebar chat list
3. AI generates response using
 conversation history (last 5 message pairs)

4. Response displayed in chat
5. Both message
s saved to localStorage
6. If authenticated, 
synced to Google Drive

### Chat Persistence

- **localStorage**: Stores all chats locally 
for instant access
- **Google Drive**: Option
al cloud backup (requires Google Sign-In)
- O
ne file per day: `ai-chats-YYYY-MM-DD.json`


## 🔐 Google Drive Integration

### Setup
1
. Create Google OAuth credentials in [Google 
Cloud Console](https://console.cloud.google.c
om/)
2. Enable Google Drive API
3. Add your d
omain to authorized redirect URIs
4. Update C
lient ID in `app.js`

### How It Works
- Clic
k "Sign in with Google" in header
- Authentic
ate with your Google account
- Grant Drive ac
cess permission
- All future chats automatica
lly sync to your Drive
- Stored in "AI Chat B
ackups" folder

**Privacy**: Your data is onl
y stored in your personal Google Drive. No th
ird-party servers involved.

## 🎨 UI Featu
res

### Sidebar
- **New Chat Button**: Start
 fresh conversation
- **Chat History**: List 
of all conversations
- **Chat Management**: 

  - Click to switch chats
  - Double-click to
 rename
  - Click ✕ to delete

### Main Cha
t Area
- **Chat Header**: Title and model sta
tus
- **Messages Area**: Scrollable chat hist
ory with glassmorphism bubbles
- **User Messa
ges**: Blue gradient background
- **AI Messag
es**: Semi-transparent with backdrop blur
- *
*Input Form**: Bottom text input with Send bu
tton

### Header
- **Brand**: "Harith Kavish"
 with nav links
- **Theme Toggle**: Light/dar
k mode button
- **Google Sign-In**: OAuth but
ton for Drive sync

## 🚀 Deployment

### G
itHub Pages

1. **Rename your repo** to `AI-C
hat` (if not already)

2. **Update repository
 settings**:
   - Go to Settings → Pages
  
 - Select "main" branch as source
   - Click 
Save

3. **Access your site**:
   ```
   http
s://YOUR_USERNAME.github.io/AI-Chat/
   ```


### Deploy to Your Domain

If you have a cust
om domain, add CNAME file:
```bash
echo "your
custom.domain" > CNAME
git add CNAME
git comm
it -m "Add custom domain"
git push
```

Then 
configure your domain's DNS settings to point
 to GitHub Pages.

## ⚙️ Configuration

#
## Model Settings
Edit `app.js` - line 4:
```
javascript
const SYSTEM_PROMPT = "You are a h
elpful, friendly AI assistant...";
```

### G
oogle OAuth (Optional)
Edit `app.js` - line 7
:
```javascript
const GOOGLE_DRIVE_API_KEY = 
'YOUR_API_KEY_HERE';
```

### AI Generation P
arameters
Edit `app.js` - `sendMessage()` fun
ction:
```javascript
const result = await pip
eline(prompt, {
    max_new_tokens: 100,     
 // Response length
    temperature: 0.7,    
      // Creativity (0.0-1.0)
    top_k: 50, 
                // Token sampling
    top_p: 
0.95,               // Nucleus sampling
    r
epetition_penalty: 1.2    // Prevent repetiti
on
});
```

## 📊 Browser Compatibility

| 
Browser | Support | Notes |
|---------|------
---|-------|
| Chrome | ✅ Full | Recommende
d |
| Firefox | ✅ Full | Great performance 
|
| Safari | ✅ Full | May need webkit prefi
x CSS |
| Edge | ✅ Full | Chromium-based |

| IE 11 | ❌ No | WebAssembly not supported 
|

## 🐛 Troubleshooting

### Model Takes L
ong to Load
- First load downloads ~200MB mod
el - this is normal
- Subsequent loads use ca
ched model
- Use `Clear Storage` in DevTools 
if needed

### Chat Not Saving
- Check browse
r localStorage is enabled
- For Drive sync, e
nsure you're signed in
- Check browser consol
e for errors

### AI Responses Slow
- Model u
ses CPU for inference (first time slower)
- R
esponse quality depends on input length
- Lon
ger prompts = longer generation time

### Dri
ve Sync Not Working
- Verify Google Sign-In w
as successful
- Check Drive "AI Chat Backups"
 folder
- Ensure OAuth credentials are valid

- Check browser console for API errors

## �
�� Performance

- **Model Download**: 1-5 min
utes (first time)
- **Model Loading**: 10-30 
seconds
- **Response Generation**: 2-10 secon
ds per message
- **Message History Lookup**: 
<100ms
- **localStorage Access**: Instant

##
 🤝 Contributing

Found a bug or want to ad
d features? 
1. Fork the repository
2. Create
 a feature branch
3. Make your changes
4. Sub
mit a pull request

## 📝 License

MIT Lice
nse - feel free to use this project for perso
nal or commercial purposes.

## 🙏 Credits


- **AI Model**: [Xenova/distilgpt2](https://
huggingface.co/Xenova/distilgpt2) via Hugging
 Face
- **Model Framework**: [Transformers.js
](https://xenova.github.io/transformers.js/)

- **UI Framework**: Custom CSS + Vanilla JS
-
 **Icons**: Unicode + Google Fonts

## 📚 R
eferences

- [Transformers.js Documentation](
https://xenova.github.io/transformers.js/)
- 
[DistilGPT2 Model Card](https://huggingface.c
o/Xenova/distilgpt2)
- [Google Drive API](htt
ps://developers.google.com/drive)
- [GitHub P
ages Deployment](https://docs.github.com/en/p
ages)

## 🎯 Future Enhancements

- [ ] Exp
ort conversations as PDF
- [ ] Share chat lin
ks
- [ ] Conversation search
- [ ] Typing ani
mation
- [ ] Voice input/output
- [ ] Multi-l
anguage support
- [ ] Custom system prompts p
er chat
- [ ] Chat statistics/insights

---


**Made by Harith Kavish** | [Portfolio](https
://harithkavish.github.io) | [GitHub](https:/
/github.com/HarithKavish)



