// 聊天界面元素
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

// 设置面板元素
const rateRange = document.getElementById('rateRange');
const pitchRange = document.getElementById('pitchRange');
const volumeRange = document.getElementById('volumeRange');
const rateValue = document.getElementById('rateValue');
const pitchValue = document.getElementById('pitchValue');
const volumeValue = document.getElementById('volumeValue');
const voiceSelect = document.getElementById('voiceSelect');

// API 配置
const API_BASE_URL = 'https://text.pollinations.ai/prompt/';

// 对话历史数组，用于存储上下文
let conversationHistory = [];

// 语音合成
const synthesis = window.speechSynthesis;
let currentUtterance = null;
let voices = [];

// 语音设置
let voiceSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voiceURI: ''
};

// 临时设置（用于弹窗中）
let tempSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voiceURI: ''
};

// 初始化事件监听
function init() {
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 设置弹窗事件
    settingsBtn.addEventListener('click', openSettings);
    closeSettings.addEventListener('click', closeSettingsModal);
    settingsOverlay.addEventListener('click', closeSettingsModal);
    cancelSettings.addEventListener('click', closeSettingsModal);
    saveSettingsBtn.addEventListener('click', saveAndCloseSettings);
    
    // 语音设置事件（更新临时设置）
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
    
    // 加载保存的设置
    loadSettings();
    
    // 将初始欢迎消息添加到对话历史
    const welcomeMessage = '你好！我是 AI 助手，有什么可以帮助你的吗？';
    conversationHistory.push({ role: 'AI', content: welcomeMessage });
    
    // 检查浏览器是否支持语音合成
    if (!synthesis) {
        console.warn('浏览器不支持语音合成功能');
        voiceToggle.disabled = true;
        voiceToggle.parentElement.style.opacity = '0.5';
    } else {
        // 加载语音列表
        loadVoices();
        synthesis.onvoiceschanged = loadVoices;
    }
}

// 打开设置弹窗
function openSettings() {
    // 复制当前设置到临时设置
    tempSettings = { ...voiceSettings };
    
    // 更新UI显示
    rateRange.value = tempSettings.rate;
    rateValue.textContent = tempSettings.rate.toFixed(1);
    
    pitchRange.value = tempSettings.pitch;
    pitchValue.textContent = tempSettings.pitch.toFixed(1);
    
    volumeRange.value = tempSettings.volume;
    volumeValue.textContent = tempSettings.volume.toFixed(1);
    
    voiceSelect.value = tempSettings.voiceURI;
    
    // 显示弹窗
    settingsModal.classList.add('show');
}

// 关闭设置弹窗
function closeSettingsModal() {
    settingsModal.classList.remove('show');
}

// 保存并关闭设置
function saveAndCloseSettings() {
    // 将临时设置保存到正式设置
    voiceSettings = { ...tempSettings };
    saveSettings();
    closeSettingsModal();
}

// 加载语音列表
function loadVoices() {
    voices = synthesis.getVoices();
    voiceSelect.innerHTML = '';
    
    // 筛选中文语音
    const zhVoices = voices.filter(voice => voice.lang.includes('zh'));
    
    if (zhVoices.length === 0) {
        // 如果没有中文语音，使用所有语音
        voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = voice.voiceURI;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        });
    } else {
        // 使用中文语音
        zhVoices.forEach((voice) => {
            const option = document.createElement('option');
            option.value = voice.voiceURI;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        });
    }
    
    // 恢复之前选择的语音
    if (voiceSettings.voiceURI) {
        voiceSelect.value = voiceSettings.voiceURI;
    }
}

// 保存设置到localStorage
function saveSettings() {
    localStorage.setItem('voiceSettings', JSON.stringify(voiceSettings));
}

// 从localStorage加载设置
function loadSettings() {
    const saved = localStorage.getItem('voiceSettings');
    if (saved) {
        voiceSettings = JSON.parse(saved);
    }
}

// 朗读文本
function speakText(text) {
    // 停止当前正在播放的语音
    synthesis.cancel();
    
    // 创建新的语音实例
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 设置语言为中文
    utterance.lang = 'zh-CN';
    
    // 应用语音设置
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;
    
    // 选择指定的语音
    if (voiceSettings.voiceURI) {
        const selectedVoice = voices.find(voice => voice.voiceURI === voiceSettings.voiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
    }
    
    // 开始朗读
    synthesis.speak(utterance);
}

// 发送消息
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // 停止当前正在播放的语音
    if (synthesis) {
        synthesis.cancel();
    }
    
    // 显示用户消息
    addMessage(message, 'user');
    
    // 将用户消息添加到对话历史
    conversationHistory.push({ role: '用户', content: message });
    
    // 清空输入框
    userInput.value = '';
    
    // 显示加载状态
    const loadingMessage = addMessage('正在思考...', 'bot', true);
    
    try {
        // 调用 API 获取响应
        const response = await getAIResponse(conversationHistory);
        
        // 移除加载状态
        chatMessages.removeChild(loadingMessage);
        
        // 显示 AI 响应
        addMessage(response, 'bot');
        
        // 将 AI 响应添加到对话历史
        conversationHistory.push({ role: 'AI', content: response });
        
        // 如果语音开关打开，则朗读AI的回复
        if (voiceToggle.checked && synthesis) {
            speakText(response);
        }
        
        // 限制对话历史长度，避免请求过大
        if (conversationHistory.length > 10) {
            conversationHistory.shift();
        }
    } catch (error) {
        // 移除加载状态
        chatMessages.removeChild(loadingMessage);
        
        // 显示错误消息
        addMessage('抱歉，出现了错误，请稍后重试。', 'bot');
        console.error('API 错误:', error);
    }
}

// 添加消息到聊天界面
function addMessage(text, sender, isLoading = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (isLoading) {
        contentDiv.innerHTML = `<div class="loading">${text}</div>`;
    } else {
        const p = document.createElement('p');
        p.textContent = text;
        contentDiv.appendChild(p);
        
        // 如果是AI消息，添加朗读按钮
        if (sender === 'bot') {
            const speakBtn = document.createElement('button');
            speakBtn.className = 'speak-btn';
            speakBtn.innerHTML = '🔊';
            speakBtn.title = '朗读此消息';
            speakBtn.onclick = () => {
                if (synthesis) {
                    synthesis.cancel();
                    speakText(text);
                }
            };
            contentDiv.appendChild(speakBtn);
        }
    }
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

// 调用 AI API
async function getAIResponse(history) {
    // 构建包含上下文的 prompt
    let contextPrompt = '';
    
    // 添加对话历史到 prompt，使用更清晰的格式
    history.forEach((msg, index) => {
        contextPrompt += `${index + 1}. ${msg.role}: ${msg.content}\n`;
    });
    
    // 添加明确的请求
    contextPrompt += `\n请基于上述对话历史，回答用户的最后一个问题。确保你的回答与对话上下文相关。`;
    
    // 编码 prompt 以适应 URL
    const encodedPrompt = encodeURIComponent(contextPrompt);
    const url = `${API_BASE_URL}${encodedPrompt}`;
    
    // 调试：显示发送的完整 prompt
    console.log('发送的完整 Prompt:', contextPrompt);
    
    // 发送请求
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'text/plain',
        },
        timeout: 30000 // 30秒超时
    });
    
    // 检查响应状态
    if (!response.ok) {
        throw new Error(`API 响应错误: ${response.status}`);
    }
    
    // 获取响应文本
    const text = await response.text();
    
    // 清理响应文本（移除可能的格式问题）
    const cleanedText = text.trim();
    
    return cleanedText;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);