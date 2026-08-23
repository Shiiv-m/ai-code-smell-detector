# AI Code Smell Detector

A Chrome/Edge browser extension that uses Google Gemini AI to detect code smells, anti-patterns, style violations, and suggest fixes directly from your browser. Equipped with local result caching and a stats dashboard.

---

## 🌟 Key Features
- **AI Code Review**: Analyze selected code snippets using Gemini `gemini-3.6-flash` (Quick/Normal) and `gemini-3.6-pro` (Deep) to identify smells and get refactoring suggestions.
- **Fast Result Caching**: Locally hashes and caches code snippets so repeating reviews for the same code takes under 10ms and costs zero API tokens.
- **History & Stats Dashboard**: Track review stats (Total Reviews, API Calls Saved) and see a breakdown of severity distributions (Critical/High/Medium/Low).
- **Right-Click Context Menu**: Select code on any page (GitHub, StackOverflow), right-click, and click **🔍 Analyze with Gemini** to trigger audits instantly.

---

## 🚀 CLI Commands Quick Reference

Run these commands in your terminal from the project root directory:

### 1. Install Dependencies
```bash
npm install
```

### 2. Build for Production
Compiles and bundles the code, generating the final extension files in the `dist/` directory:
```bash
npm run build
```

### 3. Run in Development Mode (Auto-Recompile)
Keeps Webpack running and automatically recompiles whenever you edit and save code files:
```bash
npm run watch
```

### 4. Package for Chrome Web Store
Creates a submission-ready `extension.zip` containing the compiled `dist/` build:
```bash
npm run zip
```

---

## 🛠️ How to Run the Extension in Chrome

1. Build the extension:
   ```bash
   npm run build
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** by toggling the switch in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the **`dist/`** directory in the project folder:
   `/Users/shivamsharma/Documents/My Projects/dist/`
6. The extension is now loaded and will appear in your Chrome extensions menu!

---

## 🧪 How to Test and Verify

### 1. Configure API Key (Onboarding)
To run analyses, you need a Gemini API key:
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/).
2. Open the extension popup, go to the **Settings** tab.
3. Paste the key and click **Save Settings**.
4. The welcome onboarding banner will automatically hide.

---

### 2. Test Code Smell Analysis (Copy & Paste)
Go to the **Analysis** tab in the extension popup, paste one of these snippets, and click **Analyze Code**:

#### Test Snippet: JavaScript Smells (Nested loops, eval, callback scopes)
```javascript
var total = 0;
function calculateTotal(items) {
    for (var i = 0; i < items.length; i++) {
        for (var j = 0; j < items[i].subitems.length; j++) {
            setTimeout(function() {
                // Dangerous eval and variable scoping issues
                eval("total = total + items[i].subitems[j].price;");
            }, 100);
        }
    }
    return total;
}
```

---

### 3. Test Right-Click Selection Analysis
1. Highlight any code block on any website (e.g. on GitHub).
2. Right-click the highlighted text.
3. Select **🔍 Analyze with Gemini** from the context menu.
4. Open the extension popup; the code will be loaded, and the analysis will run automatically.

---

## 📁 Technical Architecture

- **Manifest V3**: Using modern service worker backgrounds (`src/background/background.js`).
- **Google Gemini API**: Utilizing the `generateContent` v1beta endpoint with `gemini-3.6-flash` (fast) and `gemini-3.6-pro` (deep).
- **Webpack Bundling**: Entry points map to equivalent layouts in `dist/` for optimization.

