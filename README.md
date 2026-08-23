# AI Code Smell Detector

A Chrome/Edge browser extension that uses Google Gemini AI to detect code smells, security issues, and suggest fixes directly from your browser.

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

### 3. Run in Development Mode (Auto-Recompile on Code Changes)
Keeps Webpack running and automatically recompiles whenever you edit and save code files (so you only need to hit "Reload" in Chrome to see changes):
```bash
npm run watch
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

### 1. Preset API Key
The extension is pre-configured with your Gemini API key. Opening the popup and going to the **Settings** tab will show it pre-filled. If you ever need to update it:
1. Open the settings tab.
2. Enter a new key from [Google AI Studio](https://aistudio.google.com/).
3. Click **Save Settings**.

---

### 2. Test Code Smell Analysis (Copy & Paste)
Go to the **Analysis** tab in the extension popup, paste one of these snippets, and click **Analyze Code**:

#### Test Snippet A: JavaScript Smells (Nested loops, eval, callback scopes)
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

#### Test Snippet B: Python Security Vulnerability (SQL Injection)
```python
def get_user_data(user_id):
    # Dangerous direct SQL concatenation
    query = "SELECT * FROM users WHERE id = '" + user_id + "'"
    cursor.execute(query)
    return cursor.fetchall()
```

---

### 3. Test Right-Click Selection Analysis (Context Menu)
1. Highlight any code block on any website (e.g. on GitHub, StackOverflow, or local html files).
2. Right-click the highlighted text.
3. Select **🔍 Analyze with Gemini** from the context menu.
4. Open the extension popup; the code will be loaded, and the analysis will run automatically.

---

## 📁 Technical Architecture

- **Manifest V3**: Using modern service worker backgrounds (`src/background/background.js`).
- **Google Gemini API**: Utilizing the `generateContent` endpoints with `gemini-1.5-flash` (fast) and `gemini-1.5-pro` (deep).
- **Webpack Bundling**: Entry points map to equivalent layouts in `dist/`, letting the same `manifest.json` work seamlessly for both dev and production.
