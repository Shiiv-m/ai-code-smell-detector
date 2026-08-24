// Popup UI Logic - Handles user interactions

document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeButtons();
    initializeSettings();
    loadSettings();
});

// ==================== TAB SWITCHING ====================
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            
            // Hide all tabs
            tabContents.forEach(tab => tab.classList.remove('active'));
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            button.classList.add('active');
            
            // Refresh stats and history list if History tab is opened
            if (tabName === 'history') {
                loadHistoryAndStats();
            }
        });
    });
}

// ==================== ANALYSIS LOGIC ====================
function initializeButtons() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const copyBtn = document.getElementById('copyBtn');
    const generateFixBtn = document.getElementById('generateFixBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const onboardingBanner = document.getElementById('onboardingBanner');
    const actionSelect = document.getElementById('actionSelect');
    
    analyzeBtn.addEventListener('click', analyzeCode);
    copyBtn.addEventListener('click', copyAnalysis);
    generateFixBtn.addEventListener('click', generateFix);
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Change action button label dynamically
    actionSelect.addEventListener('change', () => {
        const val = actionSelect.value;
        if (val === 'analyze') analyzeBtn.textContent = 'Analyze Code';
        else if (val === 'compile') analyzeBtn.textContent = 'Verify Code';
        else if (val === 'explain') analyzeBtn.textContent = 'Explain Code';
        else if (val === 'understand') analyzeBtn.textContent = 'Understand Code';
    });

    // Redirect onboarding clicks to Settings tab
    onboardingBanner.addEventListener('click', () => {
        document.querySelector('[data-tab="settings"]').click();
    });
    
    // Enter key to analyze
    document.getElementById('codeInput').addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            analyzeCode();
        }
    });
}

async function analyzeCode() {
    const codeInput = document.getElementById('codeInput');
    const code = codeInput.value.trim();
    
    if (!code) {
        showError('Please paste some code or enter a prompt to analyze');
        return;
    }
    
    showLoading(true);
    hideResults();
    hideError();
    
    try {
        const {depth} = await chrome.storage.local.get('depth');
        const task = document.getElementById('actionSelect').value;
        
        // Send message to background.js
        chrome.runtime.sendMessage(
            {
                action: 'analyzeCode',
                code: code,
                depth: depth || 'normal',
                task: task
            },
            (response) => {
                showLoading(false);
                
                if (response && response.success) {
                    displayResults(response.data);
                } else {
                    showError((response && response.error) || 'Analysis failed. Make sure your Gemini API key is configured correctly under Settings.');
                }
            }
        );
        
    } catch (error) {
        showLoading(false);
        showError(error.message);
    }
}

function displayResults(analysis) {
    const output = document.getElementById('analysisOutput');
    output.innerHTML = parseMarkdown(analysis);
    document.getElementById('results').classList.remove('hidden');
    
    // Store for later use
    window.lastAnalysis = analysis;
}

function copyAnalysis() {
    if (window.lastAnalysis) {
        navigator.clipboard.writeText(window.lastAnalysis).then(() => {
            showMessage('Analysis copied to clipboard!');
        });
    }
}

function generateFix() {
    if (window.lastAnalysis) {
        const fixPrompt = `Based on this analysis:\n\n${window.lastAnalysis}\n\nProvide:\n1. A corrected version of the code\n2. Explanation of changes\n3. How to test the fix`;
        
        document.getElementById('codeInput').value = fixPrompt;
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        const originalText = analyzeBtn.textContent;
        analyzeBtn.textContent = '🔧 Generate Fix';
        
        setTimeout(() => {
            analyzeBtn.textContent = originalText;
        }, 2000);
    }
}



// ==================== SETTINGS ====================
function initializeSettings() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    saveBtn.addEventListener('click', saveSettings);
}

function loadSettings() {
    chrome.runtime.sendMessage({action: 'getSettings'}, (settings) => {
        if (settings) {
            if (settings.apiKey) {
                document.getElementById('apiKeyInput').value = settings.apiKey;
                document.getElementById('onboardingBanner').classList.add('hidden');
            } else {
                document.getElementById('onboardingBanner').classList.remove('hidden');
            }
            if (settings.depth) {
                document.getElementById('depthSelect').value = settings.depth;
            }
            // Load and apply theme selection
            const theme = settings.theme || 'retro';
            document.getElementById('themeSelect').value = theme;
            document.body.className = `theme-${theme}`;

            if (settings.autoAnalyze) {
                document.getElementById('autoAnalyzeCheck').checked = settings.autoAnalyze;
            }
            
            // Check for pending analysis from context menu selection
            chrome.storage.local.get('pendingAnalysis', (data) => {
                if (data.pendingAnalysis) {
                    document.getElementById('codeInput').value = data.pendingAnalysis;
                    chrome.storage.local.remove('pendingAnalysis');
                    
                    // Trigger analyze code if API key is configured
                    if (settings.apiKey) {
                        analyzeCode();
                    } else {
                        showError('Please configure your Gemini API Key in the Settings tab first.');
                    }
                }
            });
        }
    });
}

function saveSettings() {
    const settings = {
        apiKey: document.getElementById('apiKeyInput').value.trim(),
        depth: document.getElementById('depthSelect').value,
        theme: document.getElementById('themeSelect').value,
        autoAnalyze: document.getElementById('autoAnalyzeCheck').checked
    };
    
    if (!settings.apiKey) {
        showErrorInSettings('Please enter a Gemini API key');
        return;
    }
    
    chrome.runtime.sendMessage(
        {action: 'saveSettings', settings: settings},
        () => {
            showMessageInSettings('✅ Settings saved successfully!');
            // Apply selected theme dynamically
            document.body.className = `theme-${settings.theme}`;
            // Hide the onboarding banner once the API key is successfully saved
            document.getElementById('onboardingBanner').classList.add('hidden');
        }
    );
}

// ==================== UI HELPERS ====================
function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

function showError(message) {
    const error = document.getElementById('error');
    error.textContent = '❌ ' + message;
    error.classList.remove('hidden');
}

function showErrorInSettings(message) {
    const msgDiv = document.getElementById('settingsMessage');
    msgDiv.textContent = '❌ ' + message;
    msgDiv.className = 'message error-message';
    msgDiv.classList.remove('hidden');
    setTimeout(() => msgDiv.classList.add('hidden'), 3000);
}

function hideError() {
    document.getElementById('error').classList.add('hidden');
}

function hideResults() {
    document.getElementById('results').classList.add('hidden');
}

function showMessage(message) {
    const msgDiv = document.getElementById('settingsMessage');
    msgDiv.textContent = message;
    msgDiv.className = 'message';
    msgDiv.classList.remove('hidden');
    setTimeout(() => msgDiv.classList.add('hidden'), 3000);
}

function showMessageInSettings(message) {
    const msgDiv = document.getElementById('settingsMessage');
    msgDiv.textContent = message;
    msgDiv.className = 'message';
    msgDiv.classList.remove('hidden');
    setTimeout(() => msgDiv.classList.add('hidden'), 3000);
}

// ==================== ADVANCED HISTORY & STATS ====================
function loadHistoryAndStats() {
    chrome.storage.local.get([
        'totalReviews', 'cacheHits', 'severityStats', 'historyLogs'
    ], (data) => {
        // 1. Populate stats cards
        document.getElementById('statTotalReviews').textContent = data.totalReviews || 0;
        document.getElementById('statCacheHits').textContent = data.cacheHits || 0;
        
        const stats = data.severityStats || { critical: 0, high: 0, medium: 0, low: 0 };
        document.getElementById('sevCritical').textContent = stats.critical || 0;
        document.getElementById('sevHigh').textContent = stats.high || 0;
        document.getElementById('sevMedium').textContent = stats.medium || 0;
        document.getElementById('sevLow').textContent = stats.low || 0;
        
        // 2. Populate history logs list
        const historyList = document.getElementById('historyList');
        const logs = data.historyLogs || [];
        
        // Clear list
        historyList.innerHTML = '';
        
        if (logs.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history" id="emptyHistoryMsg" style="text-align: center; padding: 30px; color: #6b7280; font-style: italic; font-size: 13px;">
                    No review history found. Analyze some code to get started!
                </div>
            `;
            return;
        }
        
        logs.forEach(log => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.style.cssText = `
                background: #111827;
                border: 1px solid #1f2937;
                border-left: 4px solid ${getSeverityColor(log.severity)};
                padding: 10px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            
            // Add hover visual styles
            item.addEventListener('mouseenter', () => item.style.background = '#1f2937');
            item.addEventListener('mouseleave', () => item.style.background = '#111827');
            
            // Format preview strings
            const codePreview = log.code.substring(0, 38).replace(/[\n\r]/g, ' ') + (log.code.length > 38 ? '...' : '');
            const dateStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            item.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 3px; max-width: 80%;">
                    <span style="font-family: monospace; font-size: 12px; color: #e2e8f0; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${codePreview}</span>
                    <span style="font-size: 10px; color: #6b7280;">${dateStr} • Depth: ${log.depth}</span>
                </div>
                <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${getSeverityColor(log.severity)}; padding: 2px 6px; background: rgba(0,0,0,0.25); border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                    ${log.severity}
                </span>
            `;
            
            // Re-load review into Analysis Tab on click
            item.addEventListener('click', () => {
                document.getElementById('codeInput').value = log.code;
                displayResults(log.analysis);
                
                // Route user back to Analysis panel
                document.querySelector('[data-tab="analysis"]').click();
            });
            
            historyList.appendChild(item);
        });
    });
}

function getSeverityColor(sev) {
    switch (sev) {
        case 'critical': return '#ef4444';
        case 'high': return '#f97316';
        case 'medium': return '#eab308';
        case 'low': return '#10b981';
        default: return '#9ca3af';
    }
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all code analysis history and statistics?')) {
        chrome.storage.local.set({
            totalReviews: 0,
            cacheHits: 0,
            codeCache: {},
            historyLogs: [],
            severityStats: { critical: 0, high: 0, medium: 0, low: 0 }
        }, () => {
            loadHistoryAndStats();
        });
    }
}

// Markdown parser helper to remove raw double asterisks and format code outputs
function parseMarkdown(text) {
    if (!text) return '';
    
    // Escape HTML to prevent injection
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
    // Parse Bold: **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Parse Headers: ### or ## -> styled headers with bottom border
    html = html.replace(/^### (.*?)$/gm, '<div style="margin-top: 14px; margin-bottom: 6px; font-weight: 700; font-size: 16px; border-bottom: 1.5px solid var(--border-color); padding-bottom: 3px; text-shadow: var(--glow-shadow);">$1</div>');
    html = html.replace(/^## (.*?)$/gm, '<div style="margin-top: 18px; margin-bottom: 8px; font-weight: 700; font-size: 18px; border-bottom: 1.5px solid var(--border-color); padding-bottom: 3px; text-shadow: var(--glow-shadow);">$1</div>');
    
    // Parse Bullet lists: * or - or • -> styled inline block elements
    html = html.replace(/^• (.*?)$/gm, '<div style="margin-left: 8px; margin-bottom: 6px; line-height: 1.5; display: flex; gap: 6px;"><span style="color: var(--accent-color); font-weight: bold;">&gt;</span><span>$1</span></div>');
    html = html.replace(/^[\*-] (.*?)$/gm, '<div style="margin-left: 8px; margin-bottom: 6px; line-height: 1.5; display: flex; gap: 6px;"><span style="color: var(--accent-color); font-weight: bold;">&gt;</span><span>$1</span></div>');
    
    return html;
}
