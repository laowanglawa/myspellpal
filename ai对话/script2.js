const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const voiceToggle = document.getElementById('voiceToggle');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsOverlay = document.getElementById('settingsOverlay');
const closeSettings = document.getElementById('closeSettings');
const cancelSettings = document.getElementById('cancelSettings');
const saveSettingsBtn = document.getElementById('saveSettings');

const apiKeyBtn = document.getElementById('apiKeyBtn');
const apiKeyModal = document.getElementById('apiKeyModal');
const apiKeyOverlay = document.getElementById('apiKeyOverlay');
const closeApiKey = document.getElementById('closeApiKey');
const cancelApiKey = document.getElementById('cancelApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const apiKeyInput = document.getElementById('apiKeyInput');
const toggleVisibility = document.getElementById('toggleVisibility');

const rateRange = document.getElementById('rateRange');
const pitchRange = document.getElementById('pitchRange');
const volumeRange = document.getElementById('volumeRange');
const rateValue = document.getElementById('rateValue');
const pitchValue = document.getElementById('pitchValue');
const volumeValue = document.getElementById('volumeValue');
const voiceSelect = document.getElementById('voiceSelect');

const temperatureRange = document.getElementById('temperatureRange');
const temperatureValue = document.getElementById('temperatureValue');
const maxTokensInput = document.getElementById('maxTokensInput');
const editableOutputToggle = document.getElementById('editableOutputToggle');
const thinkingToggle = document.getElementById('thinkingToggle');

const API_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODEL_NAME = 'glm-4.5-flash';

// Tree Structure State
let nodes = {};
const ROOT_ID = 'root';

let apiKey = '';
let isGenerating = false;
let abortController = null;

const synthesis = window.speechSynthesis;
let currentUtterance = null;
let voices = [];

let voiceSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voiceURI: ''
};

let aiSettings = {
    temperature: 0.7,
    maxTokens: 3000,
    editableOutput: false,
    thinkingEnabled: false
};

let tempSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voiceURI: '',
    temperature: 0.7,
    maxTokens: 3000,
    editableOutput: false,
    thinkingEnabled: false
};

// Initialize Root Node
function initTree() {
    nodes = {};
    nodes[ROOT_ID] = {
        id: ROOT_ID,
        role: 'system',
        content: '',
        parentId: null,
        childrenIds: [],
        selectedChildId: null
    };
}

function init() {
    initTree();
    
    sendBtn.addEventListener('click', handleSendOrStop);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendOrStop();
        }
    });
    
    settingsBtn.addEventListener('click', openSettings);
    closeSettings.addEventListener('click', closeSettingsModal);
    settingsOverlay.addEventListener('click', closeSettingsModal);
    cancelSettings.addEventListener('click', closeSettingsModal);
    saveSettingsBtn.addEventListener('click', saveAndCloseSettings);
    
    apiKeyBtn.addEventListener('click', openApiKeyModal);
    closeApiKey.addEventListener('click', closeApiKeyModal);
    apiKeyOverlay.addEventListener('click', closeApiKeyModal);
    cancelApiKey.addEventListener('click', closeApiKeyModal);
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    toggleVisibility.addEventListener('click', toggleApiKeyVisibility);
    
    temperatureRange.addEventListener('input', (e) => {
        tempSettings.temperature = parseFloat(e.target.value);
        temperatureValue.textContent = tempSettings.temperature.toFixed(1);
    });
    
    maxTokensInput.addEventListener('input', (e) => {
        tempSettings.maxTokens = parseInt(e.target.value);
    });
    
    editableOutputToggle.addEventListener('change', (e) => {
        tempSettings.editableOutput = e.target.checked;
    });
    
    thinkingToggle.addEventListener('change', (e) => {
        aiSettings.thinkingEnabled = e.target.checked;
        localStorage.setItem('thinkingEnabled', e.target.checked);
        renderConversation();
    });
    
    rateRange.addEventListener('input', (e) => {
        tempSettings.rate = parseFloat(e.target.value);
        rateValue.textContent = tempSettings.rate.toFixed(1);
    });
    
    pitchRange.addEventListener('input', (e) => {
        tempSettings.pitch = parseFloat(e.target.value);
        pitchValue.textContent = tempSettings.pitch.toFixed(1);
    });
    
    volumeRange.addEventListener('input', (e) => {
        tempSettings.volume = parseFloat(e.target.value);
        volumeValue.textContent = tempSettings.volume.toFixed(1);
    });
    
    voiceSelect.addEventListener('change', (e) => {
        tempSettings.voiceURI = e.target.value;
    });
    
    loadSettings();
    loadApiKey();
    
    if (!synthesis) {
        console.warn('浏览器不支持语音合成功能');
        voiceToggle.disabled = true;
        voiceToggle.parentElement.style.opacity = '0.5';
    } else {
        loadVoices();
        synthesis.onvoiceschanged = loadVoices;
    }
}

// Tree Logic
function createNode(role, content, parentId) {
    const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const node = {
        id: id,
        role: role,
        content: content,
        reasoning: null, // Add reasoning field
        parentId: parentId,
        childrenIds: [],
        selectedChildId: null,
        usage: null
    };
    nodes[id] = node;
    
    if (nodes[parentId]) {
        nodes[parentId].childrenIds.push(id);
        nodes[parentId].selectedChildId = id;
    }
    
    return node;
}

function getLastNode() {
    let curr = nodes[ROOT_ID];
    while (curr.selectedChildId && nodes[curr.selectedChildId]) {
        curr = nodes[curr.selectedChildId];
    }
    return curr;
}

function getMessageHistory() {
    const history = [];
    let currId = nodes[ROOT_ID].selectedChildId;
    while (currId && nodes[currId]) {
        const n = nodes[currId];
        if (n.content || n.role === 'assistant') { // Include empty assistant nodes if they are being generated
             history.push({ role: n.role, content: n.content });
        }
        currId = n.selectedChildId;
    }
    return history;
}

function renderConversation() {
    chatMessages.innerHTML = '';
    
    let currentId = nodes[ROOT_ID].selectedChildId;
    while (currentId && nodes[currentId]) {
        const node = nodes[currentId];
        drawMessage(node);
        currentId = node.selectedChildId;
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function drawMessage(node) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${node.role}-message`; // match styles.css .user-message / .assistant-message
    if (node.role === 'assistant') msgDiv.classList.add('bot-message'); // Compatibility if needed
    msgDiv.id = `dom-${node.id}`;

    // Header: Role + Pagination
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';

    const roleLabel = document.createElement('div');
    roleLabel.className = 'role-label';
    roleLabel.textContent = node.role === 'user' ? 'You' : 'AI Assistant';
    headerDiv.appendChild(roleLabel);

    // Pagination
    const parent = nodes[node.parentId];
    if (parent && parent.childrenIds.length > 1) {
        const currentIndex = parent.childrenIds.indexOf(node.id);
        const total = parent.childrenIds.length;
        
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';
        
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '&lt;';
        prevBtn.disabled = currentIndex === 0;
        prevBtn.onclick = () => switchBranch(node.parentId, currentIndex - 1);
        
        const countSpan = document.createElement('span');
        countSpan.textContent = `${currentIndex + 1}/${total}`;
        
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '&gt;';
        nextBtn.disabled = currentIndex === total - 1;
        nextBtn.onclick = () => switchBranch(node.parentId, currentIndex + 1);
        
        paginationDiv.appendChild(prevBtn);
        paginationDiv.appendChild(countSpan);
        paginationDiv.appendChild(nextBtn);
        
        headerDiv.appendChild(paginationDiv);
    }

    // Edit Button (only show if editableOutput is enabled)
    if (aiSettings.editableOutput) {
        const editBtn = document.createElement('span');
        editBtn.className = 'edit-btn';
        editBtn.textContent = '✏️ 编辑';
        editBtn.onclick = () => enterEditMode(msgDiv, node);
        headerDiv.appendChild(editBtn);
    }

    // Regenerate Button (Assistant only)
    if (node.role === 'assistant') {
        const regenBtn = document.createElement('span');
        regenBtn.className = 'regen-btn';
        regenBtn.textContent = '🔄 重新生成';
        regenBtn.onclick = () => regenerateResponse(node);
        headerDiv.appendChild(regenBtn);
    }

    msgDiv.appendChild(headerDiv);

    // Thinking Box (for reasoning models)
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking-box';
    thinkingDiv.innerHTML = `
        <div class="thinking-header">
            <span class="thinking-arrow">▼</span>
            <span>深度思考</span>
        </div>
        <div class="thinking-content"></div>
    `;
    
    // Toggle functionality
    const thinkingHeader = thinkingDiv.querySelector('.thinking-header');
    const thinkingArrow = thinkingDiv.querySelector('.thinking-arrow');
    const thinkingContent = thinkingDiv.querySelector('.thinking-content');
    
    thinkingHeader.addEventListener('click', () => {
        thinkingArrow.classList.toggle('collapsed');
        thinkingContent.classList.toggle('collapsed');
    });
    
    msgDiv.appendChild(thinkingDiv);

    if (node.reasoning && aiSettings.thinkingEnabled) {
        thinkingDiv.style.display = 'block';
        thinkingContent.innerHTML = marked.parse(node.reasoning || '');
    }

    // Content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const p = document.createElement('div');
    if (node.role === 'assistant') {
        p.innerHTML = marked.parse(node.content || '');
    } else {
        p.textContent = node.content;
    }
    contentDiv.appendChild(p);
    
    // Add speak button for assistant
    if (node.role === 'assistant') {
        const speakBtn = document.createElement('button');
        speakBtn.className = 'speak-btn';
        speakBtn.innerHTML = '🔊';
        speakBtn.title = '朗读此消息';
        speakBtn.style.marginLeft = '8px';
        speakBtn.style.cursor = 'pointer';
        speakBtn.style.background = 'none';
        speakBtn.style.border = 'none';
        speakBtn.style.fontSize = '1.2em';
        speakBtn.onclick = () => {
            if (synthesis) {
                synthesis.cancel();
                speakText(node.content);
            }
        };
        contentDiv.appendChild(speakBtn);
    }

    msgDiv.appendChild(contentDiv);
    
    // Token Stats (Hidden as per request)
    // const statsDiv = document.createElement('div');
    // statsDiv.className = 'token-stats';
    // if (node.usage) {
    //      const { total_tokens } = node.usage;
    //      statsDiv.textContent = `Tokens: ${total_tokens}`;
    //      statsDiv.style.display = 'block';
    // } else {
    //      statsDiv.style.display = 'none';
    // }
    // msgDiv.appendChild(statsDiv);

    chatMessages.appendChild(msgDiv);
}

function switchBranch(parentId, index) {
    const parent = nodes[parentId];
    if (!parent || index < 0 || index >= parent.childrenIds.length) return;
    
    parent.selectedChildId = parent.childrenIds[index];
    renderConversation();
}

function enterEditMode(msgDiv, node) {
    if (msgDiv.querySelector('.edit-area')) return;

    msgDiv.classList.add('editing');
    const contentDiv = msgDiv.querySelector('.message-content');
    const thinkingDiv = msgDiv.querySelector('.thinking-box');
    
    contentDiv.style.display = 'none';
    if (thinkingDiv) thinkingDiv.style.display = 'none';

    const editArea = document.createElement('div');
    editArea.className = 'edit-area';
    
    const textarea = document.createElement('textarea');
    textarea.value = node.content;
    
    const actionDiv = document.createElement('div');
    actionDiv.className = 'edit-actions';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-save';
    saveBtn.textContent = '保存修改';
    saveBtn.onclick = () => saveEdit(node, textarea.value, 'save');
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-cancel';
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = () => {
        editArea.remove();
        msgDiv.classList.remove('editing');
        contentDiv.style.display = 'block';
        if (node.reasoning && thinkingDiv) thinkingDiv.style.display = 'block';
    };

    actionDiv.appendChild(cancelBtn);
    actionDiv.appendChild(saveBtn);

    if (node.role === 'user') {
        const regenBtn = document.createElement('button');
        regenBtn.className = 'btn-regen';
        regenBtn.textContent = '保存并重新生成';
        regenBtn.onclick = () => saveEdit(node, textarea.value, 'regen');
        actionDiv.appendChild(regenBtn);
    }

    editArea.appendChild(textarea);
    editArea.appendChild(actionDiv);
    msgDiv.appendChild(editArea);
}

async function saveEdit(node, newText, mode) {
    if (mode === 'save') {
        node.content = newText;
        renderConversation();
    } else if (mode === 'regen') {
        if (isGenerating) {
            alert('请等待当前对话生成完毕后再尝试。');
            return;
        }
        createNode(node.role, newText, node.parentId);
        renderConversation();
        await performGeneration();
    }
}

async function regenerateResponse(node) {
    if (isGenerating) {
        alert('请等待当前对话生成完毕后再尝试。');
        return;
    }
    
    const parentId = node.parentId;
    if (!parentId || !nodes[parentId]) return;
    
    await performGeneration(parentId);
}

// Settings Functions
function openSettings() {
    tempSettings = { ...voiceSettings, ...aiSettings };
    
    temperatureRange.value = tempSettings.temperature;
    temperatureValue.textContent = tempSettings.temperature.toFixed(1);
    
    maxTokensInput.value = tempSettings.maxTokens;
    
    editableOutputToggle.checked = tempSettings.editableOutput;
    
    rateRange.value = tempSettings.rate;
    rateValue.textContent = tempSettings.rate.toFixed(1);
    
    pitchRange.value = tempSettings.pitch;
    pitchValue.textContent = tempSettings.pitch.toFixed(1);
    
    volumeRange.value = tempSettings.volume;
    volumeValue.textContent = tempSettings.volume.toFixed(1);
    
    voiceSelect.value = tempSettings.voiceURI;
    
    settingsModal.classList.add('show');
}

function closeSettingsModal() {
    settingsModal.classList.remove('show');
}

function saveAndCloseSettings() {
    voiceSettings = {
        rate: tempSettings.rate,
        pitch: tempSettings.pitch,
        volume: tempSettings.volume,
        voiceURI: tempSettings.voiceURI
    };
    
    aiSettings = {
        temperature: tempSettings.temperature,
        maxTokens: tempSettings.maxTokens,
        editableOutput: tempSettings.editableOutput
    };
    
    saveSettings();
    renderConversation();
    closeSettingsModal();
}

function stopGeneration() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
    isGenerating = false;
    updateSendButton(false);
}

function handleSendOrStop() {
    if (isGenerating) {
        stopGeneration();
    } else {
        sendMessage();
    }
}

function updateSendButton(generating) {
    const originalText = sendBtn.getAttribute('data-original-text') || '发送';
    if (generating) {
        sendBtn.textContent = '⏹️ 中断';
        sendBtn.classList.add('stop-mode');
    } else {
        sendBtn.textContent = originalText;
        sendBtn.classList.remove('stop-mode');
    }
}

function openApiKeyModal() {
    apiKeyInput.value = apiKey;
    apiKeyModal.classList.add('show');
}

function closeApiKeyModal() {
    apiKeyModal.classList.remove('show');
}

function saveApiKey() {
    const key = apiKeyInput.value.trim();
    if (!key) {
        alert('请输入 API Key');
        return;
    }
    apiKey = key;
    localStorage.setItem('glmApiKey', apiKey);
    closeApiKeyModal();
}

function loadApiKey() {
    const saved = localStorage.getItem('glmApiKey');
    if (saved) {
        apiKey = saved;
    }
}

function toggleApiKeyVisibility() {
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleVisibility.textContent = '🙈';
    } else {
        apiKeyInput.type = 'password';
        toggleVisibility.textContent = '👁️';
    }
}

function loadVoices() {
    voices = synthesis.getVoices();
    voiceSelect.innerHTML = '';
    
    const zhVoices = voices.filter(voice => voice.lang.includes('zh'));
    
    if (zhVoices.length === 0) {
        voices.forEach((voice) => {
            const option = document.createElement('option');
            option.value = voice.voiceURI;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        });
    } else {
        zhVoices.forEach((voice) => {
            const option = document.createElement('option');
            option.value = voice.voiceURI;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        });
    }
    
    if (voiceSettings.voiceURI) {
        voiceSelect.value = voiceSettings.voiceURI;
    }
}

function saveSettings() {
    localStorage.setItem('voiceSettings', JSON.stringify(voiceSettings));
    localStorage.setItem('aiSettings', JSON.stringify(aiSettings));
}

function loadSettings() {
    const savedVoice = localStorage.getItem('voiceSettings');
    if (savedVoice) {
        voiceSettings = JSON.parse(savedVoice);
    }
    
    const savedAI = localStorage.getItem('aiSettings');
    if (savedAI) {
        aiSettings = JSON.parse(savedAI);
        if (aiSettings.editableOutput === undefined) {
            aiSettings.editableOutput = false;
        }
        if (aiSettings.thinkingEnabled === undefined) {
            aiSettings.thinkingEnabled = false;
        }
    }
    
    const savedThinking = localStorage.getItem('thinkingEnabled');
    if (savedThinking !== null) {
        aiSettings.thinkingEnabled = JSON.parse(savedThinking);
        thinkingToggle.checked = aiSettings.thinkingEnabled;
    }
}

function speakText(text) {
    synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;
    
    if (voiceSettings.voiceURI) {
        const selectedVoice = voices.find(voice => voice.voiceURI === voiceSettings.voiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
    }
    
    synthesis.speak(utterance);
}

// Core Messaging Functions
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    if (!apiKey) {
        alert('请先配置 API Key');
        openApiKeyModal();
        return;
    }
    
    if (synthesis) {
        synthesis.cancel();
    }
    
    const lastNode = getLastNode();
    createNode('user', message, lastNode.id);
    
    userInput.value = '';
    renderConversation();
    
    await performGeneration();
}

async function performGeneration(targetParentId = null) {
    if (!apiKey) return;
    
    abortController = new AbortController();
    isGenerating = true;
    updateSendButton(true);
    
    let lastNode;
    if (targetParentId && nodes[targetParentId]) {
        lastNode = nodes[targetParentId];
    } else {
        lastNode = getLastNode();
    }
    
    const assistantNode = createNode('assistant', '', lastNode.id);
    renderConversation();
    
    // Get message div to update in real-time
    const msgDiv = document.getElementById(`dom-${assistantNode.id}`);
    const contentP = msgDiv ? msgDiv.querySelector('.message-content div') : null;
    const thinkingDiv = msgDiv ? msgDiv.querySelector('.thinking-box') : null;
    const thinkingContent = msgDiv ? msgDiv.querySelector('.thinking-content') : null;
    
    const history = getMessageHistory();
    // Remove the empty assistant node we just added from the history sent to API
    history.pop();
    
    const messages = history.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
    
    let fullContent = '';
    
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: messages,
                temperature: aiSettings.temperature,
                max_tokens: aiSettings.maxTokens,
                stream: true,
                ...(aiSettings.thinkingEnabled && { thinking: { type: "enabled" } })
            }),
            signal: abortController.signal
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API 响应错误: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') break;
                    
                    try {
                        const json = JSON.parse(data);

                        if (json.choices && json.choices.length > 0) {
                            const delta = json.choices[0].delta;
                            
                            // Reasoning
                            const reasoning = delta.reasoning_content || '';
                            if (reasoning) {
                                if (!assistantNode.reasoning) assistantNode.reasoning = '';
                                assistantNode.reasoning += reasoning;
                                
                                if (aiSettings.thinkingEnabled && thinkingDiv && thinkingContent) {
                                    thinkingDiv.style.display = 'block';
                                    thinkingContent.innerHTML = marked.parse(assistantNode.reasoning);
                                }
                            }

                            // Content
                            const content = delta.content || '';
                            if (content) {
                                fullContent += content;
                                assistantNode.content = fullContent;
                                if (contentP) contentP.innerHTML = marked.parse(fullContent);
                            }
                        }

                        if (json.usage) {
                            assistantNode.usage = json.usage;
                            const statsDiv = msgDiv.querySelector('.token-stats');
                            if (statsDiv) {
                                const { total_tokens, prompt_tokens, completion_tokens } = json.usage;
                                const p = prompt_tokens || 0;
                                const c = completion_tokens || 0;
                                const t = total_tokens || (p + c);
                                statsDiv.textContent = `Tokens: ${t} | Prompt: ${p} | Completion: ${c}`;
                                statsDiv.style.display = 'block';
                            }
                        }
                    } catch (e) {
                        console.error('解析错误:', e);
                    }
                }
            }
        }
        
        if (voiceToggle.checked && synthesis) {
            speakText(fullContent);
        }
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('API 错误:', error);
            if (contentP) {
                contentP.innerHTML += `<br><span style="color:red">Error: ${error.message}</span>`;
            }
        }
    } finally {
        isGenerating = false;
        updateSendButton(false);
    }
}

document.addEventListener('DOMContentLoaded', init);
