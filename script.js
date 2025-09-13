// 全局状态管理
const gameState = {
    currentScreen: 'home',
    isAdmin: false,
    adminPassword: 'admin123', // 可以修改管理员密码
    questions: [],
    players: [],
    currentPlayer: null,
    gameStatus: 'waiting', // waiting, playing, finished
    currentQuestionIndex: 0,
    questionTimer: null,
    timeLeft: 0,
    showingResult: false
};

// 示例题目数据
const sampleQuestions = [
    {
        id: 1,
        question: "JavaScript是哪一年发布的？",
        options: {
            A: "1994年",
            B: "1995年",
            C: "1996年",
            D: "1997年"
        },
        correct: "B",
        timeLimit: 20
    },
    {
        id: 2,
        question: "HTML的全称是什么？",
        options: {
            A: "Hyper Text Markup Language",
            B: "High Tech Modern Language",
            C: "Home Tool Markup Language",
            D: "Hyperlink and Text Markup Language"
        },
        correct: "A",
        timeLimit: 25
    },
    {
        id: 3,
        question: "CSS用于控制什么？",
        options: {
            A: "网页的逻辑",
            B: "网页的样式",
            C: "数据库连接",
            D: "服务器配置"
        },
        correct: "B",
        timeLimit: 15
    }
];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 加载示例题目
    gameState.questions = [...sampleQuestions];
    showScreen('homeScreen');
    updateUI();
});

// 界面切换函数
function showScreen(screenId) {
    // 隐藏所有界面
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // 显示指定界面
    document.getElementById(screenId).classList.remove('hidden');
    gameState.currentScreen = screenId;
}

function showHome() {
    showScreen('homeScreen');
    gameState.isAdmin = false;
    gameState.currentPlayer = null;
}

function showAdminLogin() {
    showScreen('adminLoginScreen');
}

function showPlayerEntry() {
    showScreen('playerEntryScreen');
}

// 管理员登录
function adminLogin(event) {
    event.preventDefault();
    const password = document.getElementById('adminPassword').value;
    
    if (password === gameState.adminPassword) {
        gameState.isAdmin = true;
        showScreen('adminScreen');
        generateParticipantLink();
        updateAdminUI();
        showNotification('登录成功！', 'success');
    } else {
        showNotification('密码错误！', 'error');
    }
    
    document.getElementById('adminPassword').value = '';
}

function logout() {
    gameState.isAdmin = false;
    showHome();
}

// 参赛者加入
function joinGame(event) {
    event.preventDefault();
    const playerName = document.getElementById('playerName').value.trim();
    
    if (!playerName) {
        showNotification('请输入昵称！', 'error');
        return;
    }
    
    // 检查昵称是否已存在
    if (gameState.players.find(p => p.name === playerName)) {
        showNotification('昵称已存在，请换一个！', 'error');
        return;
    }
    
    // 创建玩家对象
    gameState.currentPlayer = {
        id: Date.now(),
        name: playerName,
        score: 0,
        answers: [],
        currentAnswer: null,
        hasAnswered: false
    };
    
    // 添加到玩家列表
    gameState.players.push(gameState.currentPlayer);
    
    // 显示等待界面
    showScreen('waitingScreen');
    document.getElementById('welcomeName').textContent = playerName;
    updatePlayerCount();
    
    showNotification('成功加入比赛！', 'success');
    document.getElementById('playerName').value = '';
}

// 管理员界面标签切换
function showTab(tabName) {
    // 隐藏所有标签内容
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // 移除所有标签的active类
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 显示指定标签
    document.getElementById(tabName + 'Tab').classList.remove('hidden');
    event.target.classList.add('active');
    
    if (tabName === 'control') {
        generateParticipantLink();
    } else if (tabName === 'monitor') {
        updateMonitorDisplay();
    }
}

// 题目管理
function addQuestion(event) {
    event.preventDefault();
    
    const questionText = document.getElementById('questionText').value.trim();
    const optionA = document.getElementById('optionA').value.trim();
    const optionB = document.getElementById('optionB').value.trim();
    const optionC = document.getElementById('optionC').value.trim();
    const optionD = document.getElementById('optionD').value.trim();
    const correctAnswer = document.getElementById('correctAnswer').value;
    const timeLimit = parseInt(document.getElementById('timeLimit').value);
    
    if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        showNotification('请填写所有字段！', 'error');
        return;
    }
    
    const newQuestion = {
        id: Date.now(),
        question: questionText,
        options: {
            A: optionA,
            B: optionB,
            C: optionC,
            D: optionD
        },
        correct: correctAnswer,
        timeLimit: timeLimit
    };
    
    gameState.questions.push(newQuestion);
    updateQuestionsList();
    
    // 清空表单
    document.getElementById('questionText').value = '';
    document.getElementById('optionA').value = '';
    document.getElementById('optionB').value = '';
    document.getElementById('optionC').value = '';
    document.getElementById('optionD').value = '';
    document.getElementById('correctAnswer').value = '';
    document.getElementById('timeLimit').value = '30';
    
    showNotification('题目添加成功！', 'success');
}

function deleteQuestion(questionId) {
    if (confirm('确定要删除这道题目吗？')) {
        gameState.questions = gameState.questions.filter(q => q.id !== questionId);
        updateQuestionsList();
        showNotification('题目删除成功！', 'success');
    }
}

function updateQuestionsList() {
    const container = document.getElementById('questionsList');
    
    if (gameState.questions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">暂无题目</p>';
        return;
    }
    
    container.innerHTML = gameState.questions.map((q, index) => `
        <div class="question-item">
            <button class="delete-question" onclick="deleteQuestion(${q.id})">×</button>
            <h4>第${index + 1}题: ${q.question}</h4>
            <div class="question-options">
                <span>A: ${q.options.A}</span>
                <span>B: ${q.options.B}</span>
                <span>C: ${q.options.C}</span>
                <span>D: ${q.options.D}</span>
            </div>
            <div class="question-meta">
                <span>正确答案: ${q.correct}</span>
                <span>答题时间: ${q.timeLimit}秒</span>
            </div>
        </div>
    `).join('');
}

// 生成参赛链接
function generateParticipantLink() {
    const baseUrl = window.location.origin + window.location.pathname;
    const participantUrl = baseUrl + '#join';
    
    const linkInput = document.getElementById('linkInput');
    if (linkInput) {
        linkInput.value = participantUrl;
    }
    
    return participantUrl;
}

// 复制链接功能
function copyLink() {
    const linkInput = document.getElementById('linkInput');
    const copyBtn = document.querySelector('.copy-btn');
    
    if (linkInput) {
        linkInput.select();
        linkInput.setSelectionRange(0, 99999); // 移动端兼容
        
        try {
            document.execCommand('copy');
            copyBtn.textContent = '已复制!';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.textContent = '复制链接';
                copyBtn.classList.remove('copied');
            }, 2000);
            
            showNotification('链接已复制到剪贴板!', 'success');
        } catch (err) {
            // 备用复制方法
            if (navigator.clipboard) {
                navigator.clipboard.writeText(linkInput.value).then(() => {
                    showNotification('链接已复制到剪贴板!', 'success');
                }).catch(() => {
                    showNotification('复制失败，请手动复制链接', 'error');
                });
            } else {
                showNotification('请手动复制链接', 'info');
            }
        }
    }
}

// 在线生成二维码
function generateOnlineQR() {
    const link = document.getElementById('linkInput').value;
    if (link) {
        // 使用免费的二维码API服务
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
        
        // 创建二维码显示
        const qrContainer = document.getElementById('qrcode-fallback');
        
        // 检查是否已存在二维码图片
        const existingImg = qrContainer.querySelector('.qr-image');
        if (existingImg) {
            existingImg.remove();
        }
        
        const img = document.createElement('img');
        img.src = qrUrl;
        img.alt = '参赛二维码';
        img.className = 'qr-image';
        img.style.cssText = `
            display: block;
            margin: 10px auto;
            padding: 10px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 200px;
        `;
        
        img.onload = () => {
            showNotification('二维码生成成功!', 'success');
        };
        
        img.onerror = () => {
            showNotification('二维码生成失败，请检查网络连接', 'error');
            img.remove();
        };
        
        qrContainer.appendChild(img);
    }
}

// 比赛控制
function startGame() {
    if (gameState.questions.length === 0) {
        showNotification('请先添加题目！', 'error');
        return;
    }
    
    if (gameState.players.length === 0) {
        showNotification('暂无参赛者！', 'error');
        return;
    }
    
    gameState.gameStatus = 'playing';
    gameState.currentQuestionIndex = 0;
    
    // 重置所有玩家状态
    gameState.players.forEach(player => {
        player.score = 0;
        player.answers = [];
        player.hasAnswered = false;
        player.currentAnswer = null;
    });
    
    updateAdminUI();
    startQuestion();
    
    // 通知所有参赛者开始比赛
    if (gameState.currentPlayer) {
        showGameScreen();
    }
    
    showNotification('比赛开始！', 'success');
}

function startQuestion() {
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
        endGame();
        return;
    }
    
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    gameState.timeLeft = currentQ.timeLimit;
    gameState.showingResult = false;
    
    // 重置玩家答题状态
    gameState.players.forEach(player => {
        player.hasAnswered = false;
        player.currentAnswer = null;
    });
    
    if (gameState.currentPlayer) {
        displayQuestion(currentQ);
    }
    
    updateMonitorDisplay();
    startTimer();
}

function startTimer() {
    if (gameState.questionTimer) {
        clearInterval(gameState.questionTimer);
    }
    
    gameState.questionTimer = setInterval(() => {
        gameState.timeLeft--;
        updateTimerDisplay();
        
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.questionTimer);
            showQuestionResult();
        }
    }, 1000);
}

function showQuestionResult() {
    gameState.showingResult = true;
    
    if (gameState.currentPlayer) {
        displayQuestionResult();
    }
    
    updateMonitorDisplay();
    
    // 3秒后自动进入下一题
    setTimeout(() => {
        if (gameState.currentQuestionIndex < gameState.questions.length - 1) {
            nextQuestion();
        } else {
            endGame();
        }
    }, 3000);
}

function nextQuestion() {
    gameState.currentQuestionIndex++;
    startQuestion();
}

function endGame() {
    gameState.gameStatus = 'finished';
    clearInterval(gameState.questionTimer);
    
    updateAdminUI();
    
    if (gameState.currentPlayer) {
        showRankingScreen();
    }
    
    showNotification('比赛结束！', 'info');
}

function resetGame() {
    if (confirm('确定要重置比赛吗？这将清除所有参赛者数据。')) {
        gameState.gameStatus = 'waiting';
        gameState.currentQuestionIndex = 0;
        gameState.players = [];
        gameState.currentPlayer = null;
        clearInterval(gameState.questionTimer);
        
        updateAdminUI();
        updatePlayerCount();
        showNotification('比赛已重置！', 'info');
    }
}

// 参赛者答题界面
function showGameScreen() {
    showScreen('gameScreen');
    document.getElementById('gamePlayerName').textContent = gameState.currentPlayer.name;
    document.getElementById('totalQuestions').textContent = gameState.questions.length;
    updatePlayerScore();
    
    if (gameState.gameStatus === 'playing') {
        const currentQ = gameState.questions[gameState.currentQuestionIndex];
        displayQuestion(currentQ);
    }
}

function displayQuestion(question) {
    document.getElementById('currentQuestionNum').textContent = gameState.currentQuestionIndex + 1;
    document.getElementById('questionTitle').textContent = question.question;
    
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = Object.entries(question.options).map(([key, value]) => `
        <div class="option" onclick="selectAnswer('${key}')" data-option="${key}">
            ${key}. ${value}
        </div>
    `).join('');
    
    // 隐藏结果显示
    document.getElementById('questionResult').classList.add('hidden');
}

function selectAnswer(option) {
    if (gameState.currentPlayer.hasAnswered || gameState.showingResult) {
        return;
    }
    
    // 清除之前的选择
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // 标记当前选择
    document.querySelector(`[data-option="${option}"]`).classList.add('selected');
    
    // 记录答案
    gameState.currentPlayer.currentAnswer = option;
    gameState.currentPlayer.hasAnswered = true;
    
    // 禁用所有选项
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.add('disabled');
    });
    
    // 检查答案并计分
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    const isCorrect = option === currentQ.correct;
    
    gameState.currentPlayer.answers.push({
        questionIndex: gameState.currentQuestionIndex,
        answer: option,
        correct: isCorrect,
        timeSpent: currentQ.timeLimit - gameState.timeLeft
    });
    
    if (isCorrect) {
        gameState.currentPlayer.score += 10; // 每题10分
    }
    
    updatePlayerScore();
    updateMonitorDisplay();
}

function displayQuestionResult() {
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    const resultContainer = document.getElementById('questionResult');
    const resultTitle = document.getElementById('resultTitle');
    const resultStats = document.getElementById('resultStats');
    const correctAnswerInfo = document.getElementById('correctAnswerInfo');
    
    // 显示正确答案
    document.querySelectorAll('.option').forEach(opt => {
        const optionKey = opt.dataset.option;
        if (optionKey === currentQ.correct) {
            opt.classList.add('correct');
        } else if (optionKey === gameState.currentPlayer.currentAnswer && optionKey !== currentQ.correct) {
            opt.classList.add('wrong');
        }
    });
    
    // 计算统计信息
    const totalAnswered = gameState.players.filter(p => p.hasAnswered).length;
    const correctAnswers = gameState.players.filter(p => 
        p.answers.length > gameState.currentQuestionIndex && 
        p.answers[gameState.currentQuestionIndex].correct
    ).length;
    
    const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    
    resultTitle.textContent = gameState.currentPlayer.currentAnswer === currentQ.correct ? '回答正确！ 🎉' : '回答错误 😔';
    resultStats.textContent = `本题正确率: ${accuracy}% (${correctAnswers}/${totalAnswered})`;
    correctAnswerInfo.innerHTML = `正确答案: <strong>${currentQ.correct}. ${currentQ.options[currentQ.correct]}</strong>`;
    
    resultContainer.classList.remove('hidden');
}

function updatePlayerScore() {
    document.getElementById('playerScore').textContent = gameState.currentPlayer.score;
}

function updateTimerDisplay() {
    document.getElementById('timeLeft').textContent = gameState.timeLeft;
}

// 排行榜
function showRankingScreen() {
    showScreen('rankingScreen');
    
    // 计算最终统计
    const totalQuestions = gameState.questions.length;
    const playerAnswers = gameState.currentPlayer.answers;
    const correctCount = playerAnswers.filter(a => a.correct).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    document.getElementById('finalTotalQuestions').textContent = totalQuestions;
    document.getElementById('finalScore').textContent = gameState.currentPlayer.score;
    document.getElementById('finalAccuracy').textContent = accuracy;
    
    // 生成排行榜
    generateRankingTable();
}

function generateRankingTable() {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    const container = document.getElementById('rankingTable');
    
    container.innerHTML = sortedPlayers.map((player, index) => {
        const isCurrentPlayer = player.id === gameState.currentPlayer.id;
        const correctCount = player.answers.filter(a => a.correct).length;
        const accuracy = player.answers.length > 0 ? Math.round((correctCount / player.answers.length) * 100) : 0;
        
        let className = 'rank-item';
        if (index < 3) className += ' top3';
        if (isCurrentPlayer) className += ' current-player';
        
        return `
            <div class="${className}">
                <div class="rank-number">${index + 1}</div>
                <div class="rank-info">
                    <span>${player.name}</span>
                    <span>得分: ${player.score}</span>
                    <span>正确率: ${accuracy}%</span>
                </div>
            </div>
        `;
    }).join('');
}

// 实时监控
function updateMonitorDisplay() {
    if (!gameState.isAdmin) return;
    
    const currentQuestionInfo = document.getElementById('currentQuestionInfo');
    const playersStatus = document.getElementById('playersStatus');
    const realTimeStats = document.getElementById('realTimeStats');
    
    if (gameState.gameStatus === 'playing') {
        const currentQ = gameState.questions[gameState.currentQuestionIndex];
        const answeredCount = gameState.players.filter(p => p.hasAnswered).length;
        const totalPlayers = gameState.players.length;
        const progress = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0;
        
        currentQuestionInfo.innerHTML = `
            <div class="monitor-question">
                <h4>第 ${gameState.currentQuestionIndex + 1} / ${gameState.questions.length} 题</h4>
                <p><strong>${currentQ.question}</strong></p>
                <p>正确答案: ${currentQ.correct}. ${currentQ.options[currentQ.correct]}</p>
                <p>剩余时间: ${gameState.timeLeft}秒</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%">
                        ${answeredCount}/${totalPlayers} 已答题
                    </div>
                </div>
            </div>
        `;
        
        // 显示玩家状态
        playersStatus.innerHTML = `
            <h4>参赛者答题状态</h4>
            <div class="players-grid">
                ${gameState.players.map(player => `
                    <div class="player-status ${player.hasAnswered ? 'answered' : 'waiting'}">
                        <div><strong>${player.name}</strong></div>
                        <div>得分: ${player.score}</div>
                        <div>状态: ${player.hasAnswered ? '已答题' : '答题中'}</div>
                        ${player.hasAnswered && player.currentAnswer ? `<div>选择: ${player.currentAnswer}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        
        // 实时统计
        if (gameState.showingResult && answeredCount > 0) {
            const correctCount = gameState.players.filter(p => 
                p.answers.length > gameState.currentQuestionIndex && 
                p.answers[gameState.currentQuestionIndex].correct
            ).length;
            const accuracy = Math.round((correctCount / answeredCount) * 100);
            
            realTimeStats.innerHTML = `
                <div class="stats-summary">
                    <h4>本题统计</h4>
                    <p>参与人数: ${answeredCount}</p>
                    <p>正确人数: ${correctCount}</p>
                    <p>正确率: ${accuracy}%</p>
                </div>
            `;
        }
    } else {
        currentQuestionInfo.innerHTML = '<p>比赛未开始或已结束</p>';
        playersStatus.innerHTML = '';
        realTimeStats.innerHTML = '';
    }
}

// UI更新函数
function updateAdminUI() {
    updateQuestionsList();
    updatePlayerCount();
    updateGameStatus();
    updateControlButtons();
}

function updatePlayerCount() {
    const count = gameState.players.length;
    document.getElementById('playerCount').textContent = count;
    document.getElementById('waitingPlayerCount').textContent = count;
}

function updateGameStatus() {
    const statusText = {
        'waiting': '等待开始',
        'playing': '进行中',
        'finished': '已结束'
    };
    document.getElementById('gameStatus').textContent = statusText[gameState.gameStatus];
}

function updateControlButtons() {
    const startBtn = document.getElementById('startBtn');
    const nextBtn = document.getElementById('nextBtn');
    const endBtn = document.getElementById('endBtn');
    
    if (gameState.gameStatus === 'waiting') {
        startBtn.classList.remove('hidden');
        nextBtn.classList.add('hidden');
        endBtn.classList.add('hidden');
    } else if (gameState.gameStatus === 'playing') {
        startBtn.classList.add('hidden');
        nextBtn.classList.remove('hidden');
        endBtn.classList.remove('hidden');
    } else {
        startBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
        endBtn.classList.add('hidden');
    }
}

// 通知系统
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 检查URL哈希，支持扫码进入
function checkUrlHash() {
    if (window.location.hash === '#join') {
        showPlayerEntry();
    }
}

// 页面加载时检查哈希
window.addEventListener('load', checkUrlHash);
window.addEventListener('hashchange', checkUrlHash);

// 定期更新UI（模拟实时同步）
setInterval(() => {
    if (gameState.isAdmin && gameState.currentScreen === 'adminScreen') {
        updateMonitorDisplay();
    }
}, 1000);