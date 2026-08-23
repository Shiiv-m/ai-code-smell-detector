// Service Worker - Runs in background, handles API calls & context menu

chrome.runtime.onInstalled.addListener(() => {
    console.log('🚀 AI Code Smell Detector installed');
    
    // Initialize storage with defaults
    chrome.storage.local.set({
        apiKey: '',
        depth: 'normal',
        autoAnalyze: false,
        totalReviews: 0,
        cacheHits: 0,
        codeCache: {}, // { codeHash: { analysis, timestamp } }
        historyLogs: [], // [ { hash, code, analysis, timestamp, severity, depth } ]
        severityStats: { critical: 0, high: 0, medium: 0, low: 0 }
    });

    // Create context menus programmatically
    chrome.contextMenus.create({
        id: 'analyze-code',
        title: '🔍 Analyze with Gemini',
        contexts: ['selection']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'analyze-code') {
        const selectedText = info.selectionText;
        
        // Store selected text for the popup to pick up and analyze
        await chrome.storage.local.set({ pendingAnalysis: selectedText });
        
        // Automatically open the extension popup if supported by the browser API
        if (chrome.action && chrome.action.openPopup) {
            try {
                await chrome.action.openPopup();
            } catch (e) {
                console.log('chrome.action.openPopup not supported or requires policy.', e);
            }
        }
    }
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeCode') {
        analyzeCodeWithGemini(request.code, request.depth)
            .then(result => {
                sendResponse({
                    success: true,
                    data: result
                });
            })
            .catch(error => {
                sendResponse({
                    success: false,
                    error: error.message
                });
            });
        
        return true; // Will respond asynchronously
    }
    
    if (request.action === 'getSettings') {
        chrome.storage.local.get(null, (items) => {
            sendResponse(items);
        });
        return true;
    }
    
    if (request.action === 'saveSettings') {
        chrome.storage.local.set(request.settings, () => {
            sendResponse({success: true});
        });
        return true;
    }


});

// Simple DJB2 string hashing function
function getCodeHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
}

// Call Gemini API
async function analyzeCodeWithGemini(code, depth = 'normal') {
    // Get settings and caches from local storage
    const {
        apiKey,
        codeCache = {},
        historyLogs = [],
        totalReviews = 0,
        cacheHits = 0,
        severityStats = { critical: 0, high: 0, medium: 0, low: 0 }
    } = await chrome.storage.local.get([
        'apiKey', 'codeCache', 'historyLogs', 'totalReviews', 'cacheHits', 'severityStats'
    ]);

    const codeHash = getCodeHash(code + '_' + depth);

    // 1. Check Cache Hit
    if (codeCache[codeHash]) {
        console.log('⚡ Code Smell Cache Hit! Returning cached output.');
        await chrome.storage.local.set({
            cacheHits: cacheHits + 1
        });
        return codeCache[codeHash].analysis;
    }

    if (!apiKey) {
        throw new Error('API key not configured. Please set your Gemini API key in extension settings.');
    }
    
    // Choose model based on depth (gemini-3.6-flash is standard, gemini-3.6-pro is deep)
    const resolvedModel = depth === 'deep' ? 'gemini-3.6-pro' : 'gemini-3.6-flash';
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`;
    
    // Build prompt based on depth
    let prompt = buildAnalysisPrompt(code, depth);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `Gemini API error (Status: ${response.status})`);
        }
        
        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            const resultText = data.candidates[0].content.parts[0].text;
            
            // 2. Parse Severity for Analytics
            let severity = 'low';
            const lowerText = resultText.toLowerCase();
            if (lowerText.includes('**critical**') || lowerText.includes('severity: critical') || lowerText.includes('severity** (critical')) {
                severity = 'critical';
            } else if (lowerText.includes('**high**') || lowerText.includes('severity: high') || lowerText.includes('severity** (high')) {
                severity = 'high';
            } else if (lowerText.includes('**medium**') || lowerText.includes('severity: medium') || lowerText.includes('severity** (medium')) {
                severity = 'medium';
            }
            
            // 3. Save to Cache & Logs
            const updatedCache = { ...codeCache };
            updatedCache[codeHash] = {
                analysis: resultText,
                timestamp: Date.now()
            };
            
            const newLog = {
                hash: codeHash,
                code: code,
                analysis: resultText,
                timestamp: Date.now(),
                severity: severity,
                depth: depth
            };
            
            const updatedHistory = [newLog, ...historyLogs].slice(0, 50); // limit to 50 logs
            
            const updatedSeverityStats = { ...severityStats };
            updatedSeverityStats[severity] = (updatedSeverityStats[severity] || 0) + 1;
            
            await chrome.storage.local.set({
                codeCache: updatedCache,
                historyLogs: updatedHistory,
                totalReviews: totalReviews + 1,
                severityStats: updatedSeverityStats
            });
            
            return resultText;
        } else {
            throw new Error('Unexpected response format from Gemini API. Make sure your API key is valid.');
        }
        
    } catch (error) {
        console.error('Gemini API call failed:', error);
        // User-friendly network offline alerts
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('network')) {
            throw new Error('🌐 Network offline. Please check your internet connection and try again.');
        }
        throw error;
    }
}

// Build analysis prompt based on depth
function buildAnalysisPrompt(code, depth) {
    const basePrompt = `You are a dedicated AI Code Smell Detector and Coding Assistant. 
Your ONLY purpose is to analyze source code for smells, anti-patterns, style violations, security issues, and suggest code improvements.

CRITICAL INSTRUCTION: If the user input is not valid programming code, a software script, or a specific query directly related to software engineering/coding, you must strictly refuse to answer. Respond with: "❌ Error: I can only assist with software development, programming code, and code smell analysis. Please enter a valid code snippet." Do not answer off-topic queries (such as what car to buy, general advice, history, or trivia).

Code or Query to analyze:
\`\`\`
${code}
\`\`\`

If the input is valid code, provide the analysis response strictly in the following structured format using clear headings and markdown bullet points:
1. **Issues Found** (List specific issues found, or state "None" if clean)
2. **Severity** (Critical / High / Medium / Low)
3. **Explanation** (Brief explanation of why it is an issue)
4. **Suggested Fix** (Actionable advice to resolve it)
5. **Code Example** (Provide a corrected version of the code)`;

    if (depth === 'quick') {
        return basePrompt + '\n\nKeep the analysis concise and focused only on the most critical issues.';
    } else if (depth === 'deep') {
        return basePrompt + '\n\nProvide an exhaustive analysis including:\n- Performance and algorithmic efficiency\n- Security implications\n- Best practices & readability\n- Architectural and testing recommendations';
    }
    
    return basePrompt;
}




