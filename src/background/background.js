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

    chrome.contextMenus.create({
        id: 'analyze-page',
        title: '🔒 Security Test This Page',
        contexts: ['page']
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
    
    if (info.menuItemId === 'analyze-page') {
        // Will implement security testing in Phase 2
        console.log('Security test triggered');
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

    if (request.action === 'runSecurityScan') {
        runSecurityScan(request.domData, request.checks)
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
        throw error;
    }
}

// Build analysis prompt based on depth
function buildAnalysisPrompt(code, depth) {
    const basePrompt = `Analyze the following code snippet and identify potential code smells, anti-patterns, style violations, and security issues.

Code to analyze:
\`\`\`
${code}
\`\`\`

Provide the response in the following structured format using clear headings and markdown bullet points:
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

// Perform active website security scan
async function runSecurityScan(domData, checks) {
    const localAlerts = [];
    
    // 1. SSL/TLS Verification
    if (domData.protocol === 'http:') {
        localAlerts.push(`🔴 **[HIGH] Insecure Protocol (HTTP)**: The website is loaded over HTTP. Data transmitted (including credentials and session cookies) is unencrypted and vulnerable to MITM interception.`);
    }
    
    // 2. Client-Side CSP Check
    if (checks.includes('csp')) {
        const hasCspMeta = domData.metas.some(m => m.httpEquiv.toLowerCase() === 'content-security-policy');
        if (!hasCspMeta) {
            localAlerts.push(`🟡 **[MEDIUM] Missing Client-Side CSP**: No Content-Security-Policy (CSP) header was declared via HTML <meta> tags. Inline scripts and styling injections are not restricted.`);
        }
    }
    
    // 3. Form CSRF Check
    if (checks.includes('csrf')) {
        const postForms = domData.forms.filter(f => f.method.toLowerCase() === 'post');
        postForms.forEach((form, idx) => {
            const hasCsrfToken = form.inputs.some(input => {
                const name = (input.name || '').toLowerCase();
                const id = (input.id || '').toLowerCase();
                return name.includes('csrf') || name.includes('token') || name.includes('xsrf') ||
                       id.includes('csrf') || id.includes('token') || id.includes('xsrf');
            });
            
            if (!hasCsrfToken) {
                const formAction = form.action ? `submitting to \`${form.action}\`` : 'with unspecified action';
                localAlerts.push(`🟡 **[MEDIUM] Missing Anti-CSRF Protection (POST Form #${idx + 1})**: Form ${formAction} does not contain common hidden anti-CSRF token inputs (\`_token\`, \`csrf_token\`, etc.).`);
            }
        });
    }
    
    // 4. Insecure CDN Dependencies Check
    if (checks.includes('dependencies')) {
        const oldJQueryRegex = /(jquery[-@/])(1\.\d+\.\d+|2\.\d+\.\d+|3\.[0-4]\.\d+)/i;
        domData.scripts.forEach(script => {
            if (script.src) {
                const match = script.src.match(oldJQueryRegex);
                if (match) {
                    localAlerts.push(`🔴 **[HIGH] Outdated & Vulnerable Dependency**: Page loads outdated jQuery version (\`${match[2]}\`). Versions <3.5.0 contain known Prototype Pollution and Cross-Site Scripting (XSS) vulnerabilities.`);
                }
            }
        });
    }
    
    // 5. Deep AI Security Audit Placeholder
    const aiAuditReport = `💡 *Gemini AI Security Deep Audit is currently paused and scheduled for a future update.*`;
    
    // 6. Assemble Report
    let report = `# 🔒 Page Security Audit Report\n\n`;
    report += `**Target URL**: \`${domData.url}\`\n`;
    report += `**Protocol**: \`${domData.protocol}\`\n\n`;
    
    report += `### 🛡️ Passive Signature Scanner Alerts\n`;
    if (localAlerts.length > 0) {
        report += localAlerts.map(alert => `• ${alert}`).join('\n') + '\n\n';
    } else {
        report += `✅ No immediate signature issues flagged in page protocols, forms, or CDN imports.\n\n`;
    }
    
    report += `### 🤖 Gemini AI Security Deep Audit\n`;
    report += aiAuditReport;
    
    return report;
}


