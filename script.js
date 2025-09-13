// Firebase配置 - 使用免费的Firebase实时数据库
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getDatabase, ref, set, get, onValue, push, serverTimestamp, off } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js';

// Firebase配置 (免费配置)
const firebaseConfig = {
    apiKey: "AIzaSyDummy_Key_For_Quiz_App_12345", // 这是一个示例key
    authDomain: "quiz-app-demo.firebaseapp.com",
    databaseURL: "https://quiz-app-demo-default-rtdb.firebaseio.com/",
    projectId: "quiz-app-demo",
    storageBucket: "quiz-app-demo.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456789"
};

// 如果用户需要，可以很容易替换为自己的Firebase配置
let app, database;
let useLocalStorage = false; // 回退到localStorage如果Firebase不可用

try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    console.log('Firebase初始化成功');
} catch (error) {
    console.log('Firebase不可用，使用本地存储模式:', error);
    useLocalStorage = true;
}

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
    showingResult: false,
    roomId: null, // 房间ID
    syncInterval: null,
    firebaseListeners: [] // 存储Firebase监听器
};

// 数据同步系统 - 支持Firebase和localStorage回退
const DataSync = {
    // 生成房间ID
    generateRoomId() {
        return 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // 获取房间ID
    getRoomId() {
        if (!gameState.roomId) {
            const urlParams = new URLSearchParams(window.location.search);
            const roomFromUrl = urlParams.get('room');
            
            if (roomFromUrl) {
                gameState.roomId = roomFromUrl;
            } else if (gameState.isAdmin) {
                gameState.roomId = this.generateRoomId();
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('room', gameState.roomId);
                window.history.replaceState({}, '', newUrl);
            }
        }
        return gameState.roomId;
    },
    
    // 保存房间数据
    async saveRoomData() {
        const roomId = this.getRoomId();
        if (!roomId) return;
        
        const roomData = {
            roomId: roomId,
            questions: gameState.questions,
            players: gameState.players,
            gameStatus: gameState.gameStatus,
            currentQuestionIndex: gameState.currentQuestionIndex,
            timeLeft: gameState.timeLeft,
            showingResult: gameState.showingResult,
            lastUpdate: Date.now()
        };
        
        if (!useLocalStorage && database) {
            try {
                await set(ref(database, `rooms/${roomId}`), roomData);
            } catch (error) {
                console.error('Firebase保存失败，使用localStorage:', error);
                localStorage.setItem(`quiz_room_${roomId}`, JSON.stringify(roomData));
            }
        } else {
            localStorage.setItem(`quiz_room_${roomId}`, JSON.stringify(roomData));
        }
    },
    
    // 加载房间数据
    async loadRoomData() {
        const roomId = this.getRoomId();
        if (!roomId) return false;
        
        try {
            if (!useLocalStorage && database) {
                const snapshot = await get(ref(database, `rooms/${roomId}`));
                if (snapshot.exists()) {
                    const roomData = snapshot.val();
                    this.updateGameState(roomData);
                    return true;
                }
            } else {
                const data = localStorage.getItem(`quiz_room_${roomId}`);
                if (data) {
                    const roomData = JSON.parse(data);
                    this.updateGameState(roomData);
                    return true;
                }
            }
        } catch (error) {
            console.error('数据加载失败:', error);
        }
        return false;
    },
    
    // 更新游戏状态
    updateGameState(roomData) {
        if (roomData.questions) gameState.questions = roomData.questions;
        if (roomData.players) gameState.players = roomData.players;
        if (roomData.gameStatus) gameState.gameStatus = roomData.gameStatus;
        if (roomData.currentQuestionIndex !== undefined) gameState.currentQuestionIndex = roomData.currentQuestionIndex;
        if (roomData.timeLeft !== undefined) gameState.timeLeft = roomData.timeLeft;
        if (roomData.showingResult !== undefined) gameState.showingResult = roomData.showingResult;
    },
    
    // 开始实时监听
    startRealtimeSync() {
        const roomId = this.getRoomId();
        if (!roomId) return;
        
        this.stopRealtimeSync(); // 清理之前的监听器
        
        if (!useLocalStorage && database) {
            // 使用Firebase实时监听
            const roomRef = ref(database, `rooms/${roomId}`);
            const listener = onValue(roomRef, (snapshot) => {
                if (snapshot.exists()) {
                    const roomData = snapshot.val();
                    
                    // 检查状态变化
                    const oldGameStatus = gameState.gameStatus;
                    const oldQuestionIndex = gameState.currentQuestionIndex;
                    
                    this.updateGameState(roomData);
                    
                    // 更新UI
                    this.handleStateChange(oldGameStatus, oldQuestionIndex);
                }
            });
            gameState.firebaseListeners.push(listener);
        } else {
            // 使用轮询作为回退
            gameState.syncInterval = setInterval(async () => {
                if (!gameState.isAdmin) {
                    const oldGameStatus = gameState.gameStatus;
                    const oldQuestionIndex = gameState.currentQuestionIndex;
                    
                    if (await this.loadRoomData()) {
                        this.handleStateChange(oldGameStatus, oldQuestionIndex);
                    }
                }
            }, 2000);
        }
    },
    
    // 处理状态变化
    handleStateChange(oldGameStatus, oldQuestionIndex) {
        if (!gameState.isAdmin) {
            // 更新参赛者界面
            if (gameState.gameStatus === 'playing' && oldGameStatus !== 'playing') {
                if (gameState.currentPlayer) {
                    showScreen('gameScreen');
                    displayQuestion();
                }
            } else if (gameState.gameStatus === 'finished' && oldGameStatus !== 'finished') {
                if (gameState.currentPlayer) {
                    showScreen('rankingScreen');
                    displayRanking();
                }
            } else if (gameState.currentQuestionIndex !== oldQuestionIndex) {
                if (gameState.currentPlayer && gameState.gameStatus === 'playing') {
                    displayQuestion();
                }
            }
            
            // 更新等待界面的参赛人数
            if (gameState.currentScreen === 'waiting') {
                updateWaitingUI();
            }
        } else {
            // 更新管理员界面
            updateAdminUI();
        }
    },
    
    // 停止实时监听
    stopRealtimeSync() {
        // 清理Firebase监听器
        gameState.firebaseListeners.forEach(listener => {
            if (typeof listener === 'function') {
                off(listener);
            }
        });
        gameState.firebaseListeners = [];
        
        // 清理轮询定时器
        if (gameState.syncInterval) {
            clearInterval(gameState.syncInterval);
            gameState.syncInterval = null;
        }
    },
    
    // 添加参赛者
    async addPlayer(playerName) {
        const playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const player = {
            id: playerId,
            name: playerName,
            score: 0,
            answers: [],
            joinTime: Date.now()
        };
        
        gameState.players.push(player);
        await this.saveRoomData();
        return player;
    },
    
    // 提交答案
    async submitAnswer(playerId, questionIndex, answer, timeUsed) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return;
        
        const question = gameState.questions[questionIndex];
        const isCorrect = answer === question.correctAnswer;
        
        player.answers[questionIndex] = {
            answer: answer,
            isCorrect: isCorrect,
            timeUsed: timeUsed,
            timestamp: Date.now()
        };
        
        if (isCorrect) {
            // 根据答题时间给分，最快满分，最慢60%分数
            const timeScore = Math.max(0.6, 1 - (timeUsed / question.timeLimit) * 0.4);
            player.score += Math.round(100 * timeScore);
        }
        
        await this.saveRoomData();
    }
};

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 应用初始化
function initializeApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId) {
        // 参赛者直接进入
        gameState.roomId = roomId;
        showScreen('playerEntryScreen');
        DataSync.startRealtimeSync();
    } else {
        // 显示首页
        showScreen('homeScreen');
    }
}

// 界面控制函数
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    document.getElementById(screenId).classList.remove('hidden');
    gameState.currentScreen = screenId;
}

function showHome() {
    DataSync.stopRealtimeSync();
    showScreen('homeScreen');
    gameState.isAdmin = false;
    gameState.currentPlayer = null;
    gameState.roomId = null;
    
    // 清除URL参数
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete('room');
    window.history.replaceState({}, '', newUrl);
}

function showAdminLogin() {
    showScreen('adminLoginScreen');
}

// 管理员登录
function adminLogin(event) {
    event.preventDefault();
    const password = document.getElementById('adminPassword').value;
    
    if (password === gameState.adminPassword) {
        gameState.isAdmin = true;
        
        // 创建或加载房间
        DataSync.getRoomId();
        DataSync.loadRoomData();
        
        showScreen('adminScreen');
        generateParticipantLink();
        updateAdminUI();
        
        // 开始实时同步
        DataSync.startRealtimeSync();
        
        showNotification('登录成功！', 'success');
    } else {
        showNotification('密码错误！', 'error');
    }
    
    document.getElementById('adminPassword').value = '';
}

function logout() {
    DataSync.stopRealtimeSync();
    gameState.isAdmin = false;
    gameState.roomId = null;
    showHome();
}

// 参赛者加入
async function joinGame(event) {
    event.preventDefault();
    const playerName = document.getElementById('playerName').value.trim();
    
    if (!playerName) {
        showNotification('请输入昵称', 'error');
        return;
    }
    
    // 检查昵称是否重复
    await DataSync.loadRoomData();
    const existingPlayer = gameState.players.find(p => p.name === playerName);
    if (existingPlayer) {
        showNotification('昵称已存在，请换一个', 'error');
        return;
    }
    
    const player = await DataSync.addPlayer(playerName);
    gameState.currentPlayer = player;
    
    showScreen('waitingScreen');
    document.getElementById('welcomeName').textContent = playerName;
    updateWaitingUI();
    
    showNotification('加入成功！', 'success');
    document.getElementById('playerName').value = '';
}

// 生成参赛链接
function generateParticipantLink() {
    const roomId = DataSync.getRoomId();
    const baseUrl = window.location.origin + window.location.pathname;
    const participantUrl = `${baseUrl}?room=${roomId}`;
    
    document.getElementById('linkInput').value = participantUrl;
    
    // 尝试生成QR码
    generateQRCode(participantUrl);
}

// 生成二维码
function generateQRCode(url) {
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    
    // 使用在线QR码服务
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    qrImg.alt = 'QR Code';
    qrImg.style.width = '200px';
    qrImg.style.height = '200px';
    qrImg.style.display = 'block';
    qrImg.style.margin = '10px auto';
    
    qrImg.onerror = function() {
        qrContainer.innerHTML = '<p style="color: #666; text-align: center;">二维码生成失败<br>请使用上方链接</p>';
    };
    
    qrContainer.appendChild(qrImg);
}

// 复制链接
function copyLink() {
    const linkInput = document.getElementById('linkInput');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    
    try {
        document.execCommand('copy');
        showNotification('链接已复制到剪贴板', 'success');
    } catch (err) {
        showNotification('复制失败，请手动复制', 'error');
    }
}

// 在线生成二维码
function generateOnlineQR() {
    const url = document.getElementById('linkInput').value;
    const qrUrl = `https://www.qr-code-generator.com/free/?basicUrl=${encodeURIComponent(url)}`;
    window.open(qrUrl, '_blank');
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
        showNotification('请填写完整的题目信息', 'error');
        return;
    }
    
    const question = {
        id: 'q_' + Date.now(),
        text: questionText,
        options: {
            A: optionA,
            B: optionB,
            C: optionC,
            D: optionD
        },
        correctAnswer: correctAnswer,
        timeLimit: timeLimit
    };
    
    gameState.questions.push(question);
    DataSync.saveRoomData();
    
    // 清空表单
    event.target.reset();
    document.getElementById('timeLimit').value = 30;
    
    updateQuestionsList();
    showNotification('题目添加成功', 'success');
}

function updateQuestionsList() {
    const container = document.getElementById('questionsList');
    container.innerHTML = '';
    
    if (gameState.questions.length === 0) {
        container.innerHTML = '<p class="no-questions">暂无题目</p>';
        return;
    }
    
    gameState.questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.innerHTML = `
            <div class="question-header">
                <span class="question-number">第 ${index + 1} 题</span>
                <span class="question-time">⏰ ${question.timeLimit}秒</span>
                <button onclick="deleteQuestion(${index})" class="delete-btn">删除</button>
            </div>
            <div class="question-text">${question.text}</div>
            <div class="question-options">
                <div class="option ${question.correctAnswer === 'A' ? 'correct' : ''}">A. ${question.options.A}</div>
                <div class="option ${question.correctAnswer === 'B' ? 'correct' : ''}">B. ${question.options.B}</div>
                <div class="option ${question.correctAnswer === 'C' ? 'correct' : ''}">C. ${question.options.C}</div>
                <div class="option ${question.correctAnswer === 'D' ? 'correct' : ''}">D. ${question.options.D}</div>
            </div>
        `;
        container.appendChild(questionDiv);
    });
}

function deleteQuestion(index) {
    if (confirm('确定要删除这道题吗？')) {
        gameState.questions.splice(index, 1);
        DataSync.saveRoomData();
        updateQuestionsList();
        showNotification('题目已删除', 'success');
    }
}

// 比赛控制
async function startGame() {
    if (gameState.questions.length === 0) {
        showNotification('请先添加题目', 'error');
        return;
    }
    
    if (gameState.players.length === 0) {
        showNotification('暂无参赛者', 'error');
        return;
    }
    
    gameState.gameStatus = 'playing';
    gameState.currentQuestionIndex = 0;
    gameState.timeLeft = gameState.questions[0].timeLimit;
    
    await DataSync.saveRoomData();
    
    startQuestionTimer();
    updateAdminUI();
    showNotification('比赛已开始', 'success');
}

async function nextQuestion() {
    if (gameState.currentQuestionIndex < gameState.questions.length - 1) {
        gameState.currentQuestionIndex++;
        gameState.timeLeft = gameState.questions[gameState.currentQuestionIndex].timeLimit;
        gameState.showingResult = false;
        
        await DataSync.saveRoomData();
        
        startQuestionTimer();
        updateAdminUI();
        showNotification('进入下一题', 'success');
    } else {
        endGame();
    }
}

async function endGame() {
    gameState.gameStatus = 'finished';
    
    if (gameState.questionTimer) {
        clearInterval(gameState.questionTimer);
        gameState.questionTimer = null;
    }
    
    await DataSync.saveRoomData();
    
    updateAdminUI();
    showNotification('比赛已结束', 'success');
}

async function resetGame() {
    if (confirm('确定要重置比赛吗？所有数据将被清除。')) {
        gameState.gameStatus = 'waiting';
        gameState.players = [];
        gameState.currentQuestionIndex = 0;
        gameState.timeLeft = 0;
        gameState.showingResult = false;
        
        if (gameState.questionTimer) {
            clearInterval(gameState.questionTimer);
            gameState.questionTimer = null;
        }
        
        await DataSync.saveRoomData();
        updateAdminUI();
        showNotification('比赛已重置', 'success');
    }
}

// 计时器
function startQuestionTimer() {
    if (gameState.questionTimer) {
        clearInterval(gameState.questionTimer);
    }
    
    gameState.questionTimer = setInterval(async () => {
        gameState.timeLeft--;
        await DataSync.saveRoomData();
        
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.questionTimer);
            gameState.questionTimer = null;
            gameState.showingResult = true;
            await DataSync.saveRoomData();
            
            // 3秒后自动下一题
            setTimeout(() => {
                if (gameState.currentQuestionIndex < gameState.questions.length - 1) {
                    nextQuestion();
                } else {
                    endGame();
                }
            }, 3000);
        }
    }, 1000);
}

// 答题相关
function displayQuestion() {
    if (!gameState.currentPlayer || !gameState.questions[gameState.currentQuestionIndex]) return;
    
    const question = gameState.questions[gameState.currentQuestionIndex];
    
    document.getElementById('currentQuestionNum').textContent = gameState.currentQuestionIndex + 1;
    document.getElementById('totalQuestions').textContent = gameState.questions.length;
    document.getElementById('timeLeft').textContent = gameState.timeLeft;
    document.getElementById('questionTitle').textContent = question.text;
    document.getElementById('gamePlayerName').textContent = gameState.currentPlayer.name;
    document.getElementById('playerScore').textContent = gameState.currentPlayer.score;
    
    // 生成选项
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    Object.entries(question.options).forEach(([key, value]) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.innerHTML = `${key}. ${value}`;
        optionDiv.onclick = () => selectAnswer(key);
        optionsContainer.appendChild(optionDiv);
    });
    
    // 隐藏结果显示
    document.getElementById('questionResult').classList.add('hidden');
    
    // 更新计时器显示
    updateTimer();
}

function selectAnswer(answer) {
    // 防止重复选择
    if (gameState.currentPlayer.answers[gameState.currentQuestionIndex]) {
        return;
    }
    
    const timeUsed = gameState.questions[gameState.currentQuestionIndex].timeLimit - gameState.timeLeft;
    
    // 提交答案
    DataSync.submitAnswer(gameState.currentPlayer.id, gameState.currentQuestionIndex, answer, timeUsed);
    
    // 高亮选择的答案
    document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
    event.target.classList.add('selected');
    
    // 显示结果等待
    showQuestionResult(answer);
}

function showQuestionResult(selectedAnswer) {
    const question = gameState.questions[gameState.currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    document.getElementById('resultTitle').textContent = isCorrect ? '✅ 回答正确！' : '❌ 回答错误';
    document.getElementById('correctAnswerInfo').innerHTML = `
        <p><strong>正确答案：</strong>${question.correctAnswer}. ${question.options[question.correctAnswer]}</p>
        <p><strong>您的答案：</strong>${selectedAnswer}. ${question.options[selectedAnswer]}</p>
    `;
    
    // 计算统计信息
    const totalAnswered = gameState.players.filter(p => p.answers[gameState.currentQuestionIndex]).length;
    const correctAnswered = gameState.players.filter(p => 
        p.answers[gameState.currentQuestionIndex] && p.answers[gameState.currentQuestionIndex].isCorrect
    ).length;
    const accuracy = totalAnswered > 0 ? Math.round((correctAnswered / totalAnswered) * 100) : 0;
    
    document.getElementById('resultStats').textContent = `${totalAnswered}人已答题，正确率：${accuracy}%`;
    
    document.getElementById('questionResult').classList.remove('hidden');
}

function updateTimer() {
    const timerInterval = setInterval(() => {
        document.getElementById('timeLeft').textContent = gameState.timeLeft;
        
        if (gameState.timeLeft <= 0 || gameState.showingResult) {
            clearInterval(timerInterval);
        }
    }, 100);
}

// 排行榜
function displayRanking() {
    if (!gameState.currentPlayer) return;
    
    // 按分数排序
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    
    // 显示个人统计
    const correctAnswers = gameState.currentPlayer.answers.filter(a => a && a.isCorrect).length;
    const totalQuestions = gameState.questions.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    document.getElementById('finalTotalQuestions').textContent = totalQuestions;
    document.getElementById('finalScore').textContent = gameState.currentPlayer.score;
    document.getElementById('finalAccuracy').textContent = accuracy;
    
    // 显示排行榜
    const rankingTable = document.getElementById('rankingTable');
    rankingTable.innerHTML = '';
    
    sortedPlayers.forEach((player, index) => {
        const correctCount = player.answers.filter(a => a && a.isCorrect).length;
        const playerAccuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        
        const rankDiv = document.createElement('div');
        rankDiv.className = `rank-item ${player.id === gameState.currentPlayer.id ? 'current-player' : ''}`;
        
        let medalEmoji = '';
        if (index === 0) medalEmoji = '🥇';
        else if (index === 1) medalEmoji = '🥈';
        else if (index === 2) medalEmoji = '🥉';
        
        rankDiv.innerHTML = `
            <div class="rank-number">${medalEmoji} ${index + 1}</div>
            <div class="rank-name">${player.name}</div>
            <div class="rank-score">${player.score}分</div>
            <div class="rank-accuracy">${playerAccuracy}%</div>
        `;
        
        rankingTable.appendChild(rankDiv);
    });
}

// UI更新函数
function updateAdminUI() {
    document.getElementById('playerCount').textContent = gameState.players.length;
    document.getElementById('gameStatus').textContent = getGameStatusText();
    
    updateQuestionsList();
    updateGameControls();
    updatePlayerMonitor();
}

function updateWaitingUI() {
    document.getElementById('waitingPlayerCount').textContent = gameState.players.length;
}

function getGameStatusText() {
    switch (gameState.gameStatus) {
        case 'waiting': return '等待开始';
        case 'playing': return '进行中';
        case 'finished': return '已结束';
        default: return '未知';
    }
}

function updateGameControls() {
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

function updatePlayerMonitor() {
    const currentQuestionInfo = document.getElementById('currentQuestionInfo');
    const playersStatus = document.getElementById('playersStatus');
    
    if (gameState.gameStatus === 'playing') {
        const question = gameState.questions[gameState.currentQuestionIndex];
        currentQuestionInfo.innerHTML = `
            <h4>当前题目 (${gameState.currentQuestionIndex + 1}/${gameState.questions.length})</h4>
            <p>${question.text}</p>
            <p>剩余时间: ${gameState.timeLeft}秒</p>
        `;
        
        // 显示参赛者答题状态
        const playerStatusHtml = gameState.players.map(player => {
            const answered = player.answers[gameState.currentQuestionIndex];
            const status = answered ? (answered.isCorrect ? '✅ 正确' : '❌ 错误') : '⏳ 未答';
            return `<div class="player-status">${player.name}: ${status}</div>`;
        }).join('');
        
        playersStatus.innerHTML = `<h4>答题状态</h4>${playerStatusHtml}`;
    } else {
        currentQuestionInfo.innerHTML = '<p>比赛未开始</p>';
        playersStatus.innerHTML = '';
    }
}

// Tab切换
function showTab(tabName) {
    // 隐藏所有tab内容
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // 移除所有tab按钮的active状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 显示选中的tab
    document.getElementById(tabName + 'Tab').classList.remove('hidden');
    
    // 激活对应按钮
    event.target.classList.add('active');
}

// 通知系统
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 全局函数暴露
window.showHome = showHome;
window.showAdminLogin = showAdminLogin;
window.adminLogin = adminLogin;
window.logout = logout;
window.joinGame = joinGame;
window.copyLink = copyLink;
window.generateOnlineQR = generateOnlineQR;
window.addQuestion = addQuestion;
window.deleteQuestion = deleteQuestion;
window.startGame = startGame;
window.nextQuestion = nextQuestion;
window.endGame = endGame;
window.resetGame = resetGame;
window.showTab = showTab;
window.selectAnswer = selectAnswer;