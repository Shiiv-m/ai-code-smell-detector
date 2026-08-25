# AI Code Analyzer & Smell Detector

A premium, production-grade Google Chrome / Chromium extension built on **Manifest V3** and bundled via **Webpack**. It leverages the **Google Gemini AI API** to provide code audits, logic walkthroughs, syntax compilation dry-runs, and document explaining directly in the browser. 

Designed for developers reviewing pull requests on GitHub, browsing answers on Stack Overflow, or auditing local scripts, it comes equipped with **local caching**, **advanced dashboard analytics**, and **custom dynamic themes**.

---

## 🌟 Key Features

*   **Four Specialized Developer Tasks**:
    *   **Check Improvements**: Identifies anti-patterns, code smells, readability issues, and structural vulnerabilities.
    *   **Verify & Syntax Check**: Acts as a static analyzer dry-run compiler, highlighting syntax, type errors, or potential exceptions.
    *   **Generate Explanation**: Summarizes algorithmic logic, outputs time/space complexity in Big O notation, and documents the code with comments.
    *   **Understand Code**: Walks through execution flow line-by-line, tracks logical errors, outputs the expected result, and provides corrected logic walkthroughs.
*   **Instant Caching Engine**: Hashes code and depth settings. Repeat runs are retrieved in under **10ms** with zero network round-trips, eliminating redundant API usage and token costs.
*   **Recruiter-Grade Dashboard**: Shows metrics (Total Reviews, Saved API Calls) and a severity distribution breakdown (Critical, High, Medium, Low).
*   **SVG-powered Navigation**: Emojis have been entirely removed and replaced with lightweight, high-fidelity SVGs that scale and shift color dynamically with the theme.
*   **Dynamic Theme Engine**: Swap instantly in settings between three custom UI layouts:
    *   **Retro Cream**: Pastel beige theme matching modern web app designs.
    *   **Cyber Orange**: Charcoal gray base with deep amber glowing borders.
    *   **Matrix Green**: Terminal slate layout with neon green tech highlights.

---

## 🚀 Use Cases & Developer Advantages

1.  **Direct Code Auditing (GitHub/StackOverflow)**: Select any code snippet on a page, right-click, and click **Analyze with Gemini**. The code is loaded into the analyzer instantly.
2.  **Codebase Refactoring On-The-Fly**: Write and fix smells within the popup textarea, clicking **Generate Fix** to run immediate corrections.
3.  **Algorithmic Learning & Onboarding**: Use **Understand Code** to break down complicated syntax, learn execution pipelines, and see runtime state mutations.
4.  **Zero-Budget Team Sharing**: By utilizing local API key storage, this extension can be shared with anyone. Users provide their own keys in settings, protecting the developer's keys and API limits.

---

## 💼 Why This Project Stands Out (For Recruiters)

*   **Manifest V3 Standard**: Complies with modern Chrome Security policies using background service workers (`src/background/background.js`) rather than legacy persistent background scripts.
*   **Optimized Build Pipeline**: Configured with a zero-transpiler Webpack layout. Outputs raw native ES6 modules, decreasing final service worker bundle size by 50% and preventing generator crashes.
*   **Local Hashing Strategy**: Leverages a client-side Murmur-style string hashing implementation (`5381` shift-add hash algorithm) to achieve local cache keys without heavy external dependency overhead.
*   **Security First**: Sensitive credentials (like the Gemini API Key) are saved locally using Chrome's secure storage API (`chrome.storage.local`) and never sent to external servers, protecting developer secrets.
*   **Robust Error Isolation**: Intercepts fetch closures and offline states, displaying friendly UI warnings instead of failing silently.

---

## 🛠️ CLI Commands & Setup

Run these commands in your terminal from the project root directory:

### 1. Install Dependencies
```bash
npm install
```

### 2. Build for Production
Compiles scripts, formats popups, copies assets, and places the final extension files in the `dist/` directory:
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

## 📦 How to Install and Run the Extension

### Method 1: Local Developer Mode (Recommended)
1. Run the build pipeline to compile resources:
   ```bash
   npm run build
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** by toggling the switch in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the **`dist/`** directory located in this project's root folder.
6. Pin the **AI Code Smell Detector** to your toolbar!

### Method 2: Share and Distribute to Others
If you want to share the extension with teammates or recruiters:
1. Build and package the zip:
   ```bash
   npm run zip
   ```
2. Send the generated **`extension.zip`** to the user.
3. The user can extract/unzip the file, go to `chrome://extensions/`, enable Developer Mode, click **Load unpacked**, and choose the extracted folder.
4. **API Key Autonomy**: The extension will prompt them to enter their own Gemini API Key. They are **never dependent on your API budget** and can configure their setup independently.

---

## 🧪 How to Test and Verify

### 1. API Configuration
1. Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).
2. Open the extension popup, navigate to the **Settings** tab.
3. Paste the key and click **Save Settings** (saves securely to `chrome.storage.local`).

### 2. Test "Understand Code" (Walkthrough & Outputs)
1. Go to the **Analysis** tab.
2. Select **Understand Code** from the task dropdown.
3. Paste the following snippet containing a syntax mistake and click **Understand Code**:
   ```javascript
   function getItems() {
       let arr = [1, 2, 3;
       return arr;
   }
   ```
4. **Verification**: Gemini will highlight the missing bracket syntax error, output the corrected output, and explain the code walkthrough under separate markdown headings.

### 3. Test "Verify & Syntax Check" (Dry-Run Compilation)
1. Paste this snippet in the Analysis textarea:
   ```javascript
   const x = 10;
   x = 20; // Const assignment error
   ```
2. Select **Verify & Syntax Check** and click **Verify Code**.
3. **Verification**: The assistant will return a compilation warning pointing out the reassignment to a constant variable.

### 4. Test "Generate Fix" Action
1. Run any analysis (e.g. on code with issues).
2. Click the **Generate Fix** button at the bottom of the analysis results card.
3. **Verification**: The extension will automatically compile a fix generation request, send it to the background, and output the corrected refactored code directly.
