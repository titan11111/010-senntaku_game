document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const mainScreen = document.getElementById('main-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');
    const maouWinScreen = document.getElementById('maou-win-screen');

    const displayPoints = document.getElementById('display-points');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const maouBattleBtn = document.getElementById('maou-battle-btn');
    const resetPointsBtn = document.getElementById('reset-points-btn');
    const mainMessage = document.getElementById('main-message');

    const quizCategoryTitle = document.getElementById('quiz-category-title');
    const timeLeftSpan = document.getElementById('time-left');
    const currentQuestionNumSpan = document.getElementById('current-question-num');
    const enemyImage = document.getElementById('enemy-image');
    const questionText = document.getElementById('question-text');
    const optionButtons = document.querySelectorAll('.option-btn');
    const skipQuestionBtn = document.getElementById('skip-question-btn');

    const finalScoreSpan = document.getElementById('final-score');
    const correctAnswersCountSpan = document.getElementById('correct-answers-count');
    const resultMessage = document.getElementById('result-message');
    const backToMainBtn = document.getElementById('back-to-main-btn');
    const restartGameBtn = document.getElementById('restart-game-btn');

    // --- オーディオ要素の取得 ---
    const fieldAudio = document.getElementById('field-audio');
    const seikaiAudio = document.getElementById('seikai-audio');
    const fuseikaiAudio = document.getElementById('fuseikai-audio');
    const levelupAudio = document.getElementById('levelup-audio');
    const maouAudio = document.getElementById('maou-audio');
    const sentouAudio = document.getElementById('sentou-audio');

    // --- ゲームの状態変数 ---
    let totalPoints = 0;
    let allQuizData = {};
    let currentQuizData = [];
    let currentQuestionIndex = 0;
    let correctAnswersInQuiz = 0;
    let quizCategory = '';
    let isMaouBattle = false;
    let timer;
    let timeLeft = 10;
    const QUIZ_QUESTIONS_PER_CATEGORY = 5;
    const POINTS_PER_CORRECT_ANSWER = 10;
    const TOTAL_CATEGORIES = 9; // 全カテゴリ数：国語、理科、社会、算数、英語、あたしんち、ドラえもん、ぼっちざロック、甘いもの
    let clearedCategories = [];

    // --- 効果音関連のパス ---
    const AUDIO_PATHS = {
        field: 'audio/field.mp3',
        seikai: 'audio/seikai2.mp3',
        fuseikai: 'audio/fuseikai2.mp3',
        levelup: 'audio/levelup.mp3',
        maou: 'audio/maou.mp3',
        sentou: 'audio/sentou.mp3',
    };

    // --- 画像パス ---
    const ENEMY_IMAGES = {
        normal: ['images/enemy1.png', 'images/enemy2.png', 'images/enemy3.png', 'images/enemy4.png'],
        maou: 'images/maou.png',
        hero: 'images/hero.png'
    };

    // --- 画面切り替え関数 ---
    function showScreen(screenToShow) {
        const screens = [mainScreen, quizScreen, resultScreen, maouWinScreen];
        screens.forEach(screen => {
            if (screen === screenToShow) {
                screen.classList.add('active');
            } else {
                screen.classList.remove('active');
            }
        });
    }

    // --- オーディオ再生関数 ---
    function playAudio(audioElement, loop = false) {
        if (fieldAudio.loop && fieldAudio.currentTime > 0 && fieldAudio !== audioElement) {
            fieldAudio.pause();
            fieldAudio.currentTime = 0;
        }
        if (sentouAudio.loop && sentouAudio.currentTime > 0 && sentouAudio !== audioElement) {
            sentouAudio.pause();
            sentouAudio.currentTime = 0;
        }
        if (maouAudio.loop && maouAudio.currentTime > 0 && maouAudio !== audioElement) {
            maouAudio.pause();
            maouAudio.currentTime = 0;
        }

        audioElement.loop = loop;
        audioElement.play().catch(error => console.error("Audio play failed:", error));
    }

    function stopAllAudio() {
        [fieldAudio, seikaiAudio, fuseikaiAudio, levelupAudio, maouAudio, sentouAudio].forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }

    // --- ゲームデータの保存と読み込み ---
    function saveGameData() {
        localStorage.setItem('totalPoints', totalPoints);
        localStorage.setItem('clearedCategories', JSON.stringify(clearedCategories));
    }

    function loadGameData() {
        const savedPoints = localStorage.getItem('totalPoints');
        if (savedPoints !== null) {
            totalPoints = parseInt(savedPoints, 10);
        }
        const savedClearedCategories = localStorage.getItem('clearedCategories');
        if (savedClearedCategories) {
            clearedCategories = JSON.parse(savedClearedCategories);
        }
    }

    // --- 全カテゴリクリア判定 ---
    function isAllCategoriesCleared() {
        return clearedCategories.length === TOTAL_CATEGORIES;
    }

    // --- メイン画面の更新 ---
    function updateMainScreen() {
        displayPoints.textContent = totalPoints;
        
        // 魔王戦ボタンの状態を更新
        if (isAllCategoriesCleared()) {
            maouBattleBtn.disabled = false;
            mainMessage.textContent = '✨ 全てのカテゴリをクリアした！魔王に挑戦しよう！ ✨';
        } else {
            maouBattleBtn.disabled = true;
            const remaining = TOTAL_CATEGORIES - clearedCategories.length;
            mainMessage.textContent = `あと${remaining}個のカテゴリをクリアしたら魔王に挑戦できるぞ！`;
        }

        // カテゴリボタンの表示更新
        categoryButtons.forEach(button => {
            const category = button.dataset.category;
            if (clearedCategories.includes(category)) {
                button.classList.add('cleared-category');
                button.disabled = true;
            } else {
                button.classList.remove('cleared-category');
                button.disabled = false;
            }
        });

        playAudio(fieldAudio, true);
    }

    // --- ゲーム初期化 ---
    async function initializeGame() {
        loadGameData();
        if (Object.keys(allQuizData).length === 0) {
            try {
                const response = await fetch('quizData.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                allQuizData = await response.json();
                console.log("Quiz data loaded:", allQuizData);
            } catch (error) {
                console.error("Failed to load quiz data:", error);
                alert("クイズデータの読み込みに失敗しました。ページをリロードしてください。");
                return;
            }
        }
        updateMainScreen();
        showScreen(mainScreen);
    }

    // --- クイズ開始 ---
    async function startQuiz(category) {
        stopAllAudio();

        quizCategory = category;
        isMaouBattle = (category === 'Maou');

        if (isMaouBattle) {
            enemyImage.src = ENEMY_IMAGES.maou;
            playAudio(maouAudio, true);
        } else {
            const randomIndex = Math.floor(Math.random() * ENEMY_IMAGES.normal.length);
            enemyImage.src = ENEMY_IMAGES.normal[randomIndex];
            playAudio(sentouAudio, true);
        }

        const availableQuestions = allQuizData[quizCategory];

        if (!availableQuestions || availableQuestions.length === 0) {
            alert("このカテゴリのクイズデータが見つかりません。");
            showScreen(mainScreen);
            playAudio(fieldAudio, true);
            return;
        }

        if (!isMaouBattle && availableQuestions.length < QUIZ_QUESTIONS_PER_CATEGORY) {
            alert(`「${quizCategory}」カテゴリは問題数が少ないため、現在プレイできません。別のカテゴリを選んでください。（最低${QUIZ_QUESTIONS_PER_CATEGORY}問必要）`);
            showScreen(mainScreen);
            playAudio(fieldAudio, true);
            return;
        }

        const shuffledQuestions = [...availableQuestions].sort(() => Math.random() - 0.5);
        currentQuizData = shuffledQuestions.slice(0, QUIZ_QUESTIONS_PER_CATEGORY);

        currentQuestionIndex = 0;
        correctAnswersInQuiz = 0;
        quizCategoryTitle.textContent = `${quizCategory}クイズ`;
        timeLeft = 10;

        showScreen(quizScreen);
        loadQuestion();
    }

    // --- 問題を読み込む ---
    function loadQuestion() {
        stopTimer();

        if (currentQuestionIndex >= QUIZ_QUESTIONS_PER_CATEGORY) {
            endQuiz();
            return;
        }

        resetOptionsStyle();
        const question = currentQuizData[currentQuestionIndex];
        
        if (!question) {
            console.error("Error: Question is undefined at index", currentQuestionIndex);
            endQuiz();
            return;
        }

        questionText.textContent = question.question;
        question.options.forEach((option, index) => {
            optionButtons[index].textContent = option;
            optionButtons[index].disabled = false;
        });

        currentQuestionNumSpan.textContent = currentQuestionIndex + 1;
        startTimer();
    }

    // --- 解答を処理する ---
    function handleAnswer(selectedIndex) {
        stopTimer();
        const question = currentQuizData[currentQuestionIndex];
        const correctAnswerIndex = question.correct;

        optionButtons.forEach(button => button.disabled = true);

        if (selectedIndex === correctAnswerIndex) {
            correctAnswersInQuiz++;
            totalPoints += POINTS_PER_CORRECT_ANSWER;
            playAudio(seikaiAudio);
            optionButtons[selectedIndex].classList.add('correct');
        } else {
            playAudio(fuseikaiAudio);
            optionButtons[selectedIndex].classList.add('wrong');
            optionButtons[correctAnswerIndex].classList.add('correct');
        }

        saveGameData();
        updateMainScreen();

        setTimeout(() => {
            currentQuestionIndex++;
            loadQuestion();
        }, 1500);
    }

    // --- 選択肢のスタイルをリセット ---
    function resetOptionsStyle() {
        optionButtons.forEach(button => {
            button.classList.remove('correct', 'wrong');
            button.disabled = false;
        });
    }

    // --- タイマー機能 ---
    function startTimer() {
        timeLeft = 10;
        timeLeftSpan.textContent = timeLeft;
        timer = setInterval(() => {
            timeLeft--;
            timeLeftSpan.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timer);
                handleAnswer(-1);
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timer);
    }

    // --- クイズ終了 ---
    function endQuiz() {
        stopTimer();
        stopAllAudio();

        finalScoreSpan.textContent = totalPoints;
        correctAnswersCountSpan.textContent = correctAnswersInQuiz;

        if (isMaouBattle) {
            if (correctAnswersInQuiz >= QUIZ_QUESTIONS_PER_CATEGORY) {
                showScreen(maouWinScreen);
                mainMessage.textContent = '魔王を撃破したぞ！';
                localStorage.setItem('maouDefeated', 'true');
                playAudio(levelupAudio);
            } else {
                showScreen(resultScreen);
                resultMessage.textContent = '魔王には及ばなかった...。修行を重ねてまた挑もう！';
                playAudio(fieldAudio, true);
            }
        } else {
            let message = '';
            if (correctAnswersInQuiz === QUIZ_QUESTIONS_PER_CATEGORY) {
                message = '全問正解！素晴らしい！';
                playAudio(levelupAudio);
                // カテゴリをクリア済みにする
                if (!clearedCategories.includes(quizCategory)) {
                    clearedCategories.push(quizCategory);
                    saveGameData();
                }
            } else if (correctAnswersInQuiz >= QUIZ_QUESTIONS_PER_CATEGORY / 2) {
                message = 'よく頑張った！もう少しだ！';
                playAudio(fieldAudio, true);
            } else {
                message = '残念！また挑戦して知識を深めよう！';
                playAudio(fieldAudio, true);
            }
            resultMessage.textContent = message;
            showScreen(resultScreen);
        }
        updateMainScreen();
    }

    // --- ポイントリセット ---
    function resetPoints() {
        if (confirm('本当にポイントをリセットしますか？')) {
            totalPoints = 0;
            clearedCategories = [];
            localStorage.removeItem('maouDefeated');
            saveGameData();
            updateMainScreen();
            mainMessage.textContent = 'ポイントとクリア情報がリセットされたぞ！';
        }
    }

    // --- デバッグ機能：問題スキップ ---
    function skipQuestion() {
        if (confirm('現在の問題をスキップして次の問題に進みますか？')) {
            stopTimer();
            currentQuestionIndex++;
            loadQuestion();
        }
    }

    // --- イベントリスナー ---
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            startQuiz(button.dataset.category);
        });
    });

    maouBattleBtn.addEventListener('click', () => {
        if (isAllCategoriesCleared()) {
            startQuiz('Maou');
        } else {
            const remaining = TOTAL_CATEGORIES - clearedCategories.length;
            alert(`魔王に挑戦するには、あと${remaining}個のカテゴリをクリアする必要があります！`);
        }
    });

    optionButtons.forEach((button, index) => {
        button.addEventListener('click', () => handleAnswer(index));
    });

    backToMainBtn.addEventListener('click', () => {
        showScreen(mainScreen);
        playAudio(fieldAudio, true);
    });

    restartGameBtn.addEventListener('click', () => {
        if (confirm('ゲームを最初からやり直しますか？現在のポイントもリセットされます。')) {
            totalPoints = 0;
            clearedCategories = [];
            localStorage.removeItem('maouDefeated');
            saveGameData();
            initializeGame();
        }
    });

    resetPointsBtn.addEventListener('click', resetPoints);
    skipQuestionBtn.addEventListener('click', skipQuestion);

    // ゲーム開始
    initializeGame();
});
