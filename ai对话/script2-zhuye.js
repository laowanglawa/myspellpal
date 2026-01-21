const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const voiceToggle = document.getElementById('voiceToggle');
const settingsBtn = document.getElementById('aiChatSettingsBtn');
const settingsModal = document.getElementById('aiChatSettingsModal');
const settingsOverlay = document.getElementById('aiChatSettingsOverlay');
const closeSettings = document.getElementById('aiChatCloseSettings');
const cancelSettings = document.getElementById('aiChatCancelSettings');
const saveSettingsBtn = document.getElementById('aiChatSaveSettings');

const rateRange = document.getElementById('aiChatRateRange');
const pitchRange = document.getElementById('aiChatPitchRange');
const volumeRange = document.getElementById('aiChatVolumeRange');
const rateValue = document.getElementById('aiChatRateValue');
const pitchValue = document.getElementById('aiChatPitchValue');
const volumeValue = document.getElementById('aiChatVolumeValue');
const voiceSelect = document.getElementById('aiChatVoiceSelect');

const temperatureRange = document.getElementById('aiChatTemperatureRange');
const temperatureValue = document.getElementById('aiChatTemperatureValue');
const maxTokensInput = document.getElementById('aiChatMaxTokensInput');
const editableOutputToggle = document.getElementById('aiChatEditableOutputToggle');
const thinkingToggle = document.getElementById('thinkingToggle');

const API_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODEL_NAME = 'glm-4.5-flash';
const API_KEY = 'aaf20d23b2f842ebb9a75252d0a1dbda.N4ten0XTQKkNQ0K4';

let nodes = {};
const ROOT_ID = 'root';

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
    
    if (!synthesis) {
        console.warn('浏览器不支持语音合成功能');
        voiceToggle.disabled = true;
        voiceToggle.parentElement.style.opacity = '0.5';
    } else {
        loadVoices();
        synthesis.onvoiceschanged = loadVoices;
    }
}

function createNode(role, content, parentId) {
    const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const node = {
        id: id,
        role: role,
        content: content,
        reasoning: null,
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
        if (n.content || n.role === 'assistant') {
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

// 渲染单条消息到界面
function drawMessage(node) {
    // 创建消息容器
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${node.role}-message`;
    if (node.role === 'assistant') msgDiv.classList.add('bot-message');
    msgDiv.id = `dom-${node.id}`;

    // 创建消息头部
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';

    // 添加角色标签
    const roleLabel = document.createElement('div');
    roleLabel.className = 'role-label';
    roleLabel.textContent = node.role === 'user' ? 'You' : 'AI Assistant';
    headerDiv.appendChild(roleLabel);

    // 如果存在多个分支，添加分页控件
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

    // 如果启用了可编辑输出，添加编辑按钮
    if (aiSettings.editableOutput) {
        const editBtn = document.createElement('span');
        editBtn.className = 'edit-btn';
        editBtn.textContent = '✏️ 编辑';
        editBtn.onclick = () => enterEditMode(msgDiv, node);
        headerDiv.appendChild(editBtn);
    }

    // 如果是AI助手消息，添加重新生成按钮
    if (node.role === 'assistant') {
        const regenBtn = document.createElement('span');
        regenBtn.className = 'regen-btn';
        regenBtn.textContent = '🔄 重新生成';
        regenBtn.onclick = () => regenerateResponse(node);
        headerDiv.appendChild(regenBtn);
    }

    msgDiv.appendChild(headerDiv);

    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking-box';
    thinkingDiv.innerHTML = `
        <div class="thinking-header">
            <span class="thinking-arrow">▼</span>
            <span>深度思考</span>
        </div>
        <div class="thinking-content"></div>
    `;
    
    const thinkingHeader = thinkingDiv.querySelector('.thinking-header');
    const thinkingArrow = thinkingDiv.querySelector('.thinking-arrow');
    const thinkingContent = thinkingDiv.querySelector('.thinking-content');
    
    thinkingHeader.addEventListener('click', () => {
        thinkingArrow.classList.toggle('collapsed');
        thinkingContent.classList.toggle('collapsed');
    });
    
    msgDiv.appendChild(thinkingDiv);

    if (node.reasoning) {
        thinkingDiv.style.display = 'block';
        thinkingContent.innerHTML = marked.parse(node.reasoning || '');
    } else {
        thinkingDiv.style.display = 'none';
    }

    // 创建消息内容区域
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const p = document.createElement('div');
    if (node.role === 'assistant') {
        p.innerHTML = marked.parse(node.content || '');
    } else {
        p.textContent = node.content;
    }
    contentDiv.appendChild(p);
    
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
        editableOutput: tempSettings.editableOutput,
        thinkingEnabled: tempSettings.thinkingEnabled
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

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
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
    const thinkingEnabledForThisRequest = aiSettings.thinkingEnabled;
    const thinkingConfig = {
        thinking: {
            type: thinkingEnabledForThisRequest ? 'enabled' : 'disabled'
        }
    };
    
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
    
    const msgDiv = document.getElementById(`dom-${assistantNode.id}`);
    const contentP = msgDiv ? msgDiv.querySelector('.message-content div') : null;
    const thinkingDiv = msgDiv ? msgDiv.querySelector('.thinking-box') : null;
    const thinkingContent = msgDiv ? msgDiv.querySelector('.thinking-content') : null;
    
    const history = getMessageHistory();
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
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: messages,
                temperature: aiSettings.temperature,
                max_tokens: aiSettings.maxTokens,
                stream: true,
                ...thinkingConfig
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
                            
                            const reasoning = delta.reasoning_content || '';
                            if (reasoning && thinkingEnabledForThisRequest) {
                                if (!assistantNode.reasoning) assistantNode.reasoning = '';
                                assistantNode.reasoning += reasoning;
                                
                                if (thinkingDiv && thinkingContent) {
                                    thinkingDiv.style.display = 'block';
                                    thinkingContent.innerHTML = marked.parse(assistantNode.reasoning);
                                }
                            }

                            const content = delta.content || '';
                            if (content) {
                                fullContent += content;
                                assistantNode.content = fullContent;
                                if (contentP) contentP.innerHTML = marked.parse(fullContent);
                            }
                        }

                        if (json.usage) {
                            assistantNode.usage = json.usage;
                        }
                    } catch (e) {
                        console.error('解析流数据错误:', e);
                    }
                }
            }
        }
        
        if (!fullContent && !assistantNode.reasoning) {
            assistantNode.content = '抱歉，没有收到有效的响应。';
            renderConversation();
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('生成已中断');
        } else {
            console.error('生成错误:', error);
            assistantNode.content = `错误: ${error.message}`;
            renderConversation();
        }
    } finally {
        isGenerating = false;
        updateSendButton(false);
        abortController = null;
    }
}

document.addEventListener('DOMContentLoaded', init);
