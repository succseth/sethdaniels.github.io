const screens = {
  start: document.getElementById('start-screen'),
  loading: document.getElementById('loading-screen'),
  quiz: document.getElementById('quiz-screen'),
  results: document.getElementById('results-screen'),
};

const categorySelect = document.getElementById('category-select');
const diffBtns = document.querySelectorAll('.diff-btn');
const amountBtns = document.querySelectorAll('.amount-btn');
const startBtn = document.getElementById('start-btn');
const scoreChip = document.getElementById('score-chip');
const scoreDisplay = document.getElementById('score-display');
const qCounter = document.getElementById('q-counter');
const qScore = document.getElementById('q-score');
const progressBar = document.getElementById('progress-bar');
const timerCircle = document.getElementById('timer-circle');
const timerNumber = document.getElementById('timer-number');
const qCategory = document.getElementById('q-category');
const questionText = document.getElementById('question-text');
const answersGrid = document.getElementById('answers-grid');
const resultsEmoji = document.getElementById('results-emoji');
const resultsMessage = document.getElementById('results-message');
const ringFill = document.getElementById('ring-fill');
const scorePct = document.getElementById('score-pct');
const scoreFraction = document.getElementById('score-fraction');
const resultsBreakdown = document.getElementById('results-breakdown');
const restartBtn = document.getElementById('restart-btn');

let settings = { category: '', difficulty: '', amount: 10 };
let questions = [];
let current = 0;
let score = 0;
let timerInterval = null;
let timeLeft = 15;
const TIMER_CIRCUMFERENCE = 113;

function showScreen(name) {
  Object.values(screens).forEach(s => s.hidden = true);
  screens[name].hidden = false;
}

function decodeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.difficulty = btn.dataset.difficulty;
  });
});

amountBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    amountBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.amount = parseInt(btn.dataset.amount);
  });
});

async function fetchQuestions() {
  const { category, difficulty, amount } = settings;
  let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
  if (category) url += `&category=${category}`;
  if (difficulty) url += `&difficulty=${difficulty}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('API error');
  const data = await res.json();

  if (data.response_code === 1) {
    throw new Error('Not enough questions for these settings. Try different options.');
  }
  if (data.response_code !== 0 || !data.results.length) {
    throw new Error('Could not load questions. Please try again.');
  }

  return data.results.map(q => ({
    category: decodeHtml(q.category),
    question: decodeHtml(q.question),
    correct: decodeHtml(q.correct_answer),
    answers: shuffleArray([
      decodeHtml(q.correct_answer),
      ...q.incorrect_answers.map(decodeHtml),
    ]),
  }));
}

startBtn.addEventListener('click', async () => {
  settings.category = categorySelect.value;
  showScreen('loading');
  scoreChip.hidden = true;

  try {
    questions = await fetchQuestions();
    current = 0;
    score = 0;
    startQuiz();
  } catch (err) {
    showScreen('start');
    alert(err.message || 'Failed to load questions. Please check your connection.');
  }
});

function startQuiz() {
  scoreDisplay.textContent = '0';
  scoreChip.hidden = false;
  showScreen('quiz');
  showQuestion();
}

function showQuestion() {
  const q = questions[current];
  stopTimer();

  qCounter.textContent = `Question ${current + 1} of ${questions.length}`;
  qScore.textContent = `Score: ${score}`;
  progressBar.style.width = `${(current / questions.length) * 100}%`;
  qCategory.textContent = q.category;
  questionText.textContent = q.question;

  answersGrid.innerHTML = '';
  q.answers.forEach(answer => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = answer;
    btn.addEventListener('click', () => selectAnswer(btn, answer, q.correct));
    answersGrid.appendChild(btn);
  });

  startTimer();
}

function startTimer() {
  timeLeft = 15;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      stopTimer();
      revealAnswer(null, questions[current].correct);
      scheduleNext();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function updateTimerDisplay() {
  const offset = TIMER_CIRCUMFERENCE * (1 - timeLeft / 15);
  timerCircle.style.strokeDashoffset = offset;
  timerNumber.textContent = timeLeft;

  timerCircle.classList.remove('warning', 'danger');
  timerNumber.classList.remove('danger');

  if (timeLeft <= 5) {
    timerCircle.classList.add('danger');
    timerNumber.classList.add('danger');
  } else if (timeLeft <= 8) {
    timerCircle.classList.add('warning');
  }
}

function selectAnswer(btn, selected, correct) {
  stopTimer();
  if (selected === correct) score++;
  scoreDisplay.textContent = score;
  revealAnswer(btn, correct, selected);
  scheduleNext();
}

function revealAnswer(selectedBtn, correct, selected) {
  const allBtns = answersGrid.querySelectorAll('.answer-btn');
  allBtns.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correct) {
      btn.classList.add('correct');
    } else if (selectedBtn && btn === selectedBtn && selected !== correct) {
      btn.classList.add('wrong');
    }
  });
}

function scheduleNext() {
  setTimeout(() => {
    current++;
    if (current < questions.length) {
      showQuestion();
    } else {
      showResults();
    }
  }, 1600);
}

function showResults() {
  scoreChip.hidden = true;
  stopTimer();
  showScreen('results');

  const pct = Math.round((score / questions.length) * 100);

  scorePct.textContent = `${pct}%`;
  scoreFraction.textContent = `${score}/${questions.length}`;

  const ringOffset = 314 * (1 - score / questions.length);
  ringFill.style.strokeDashoffset = 314;
  ringFill.classList.remove('good', 'ok', 'poor');

  setTimeout(() => {
    ringFill.style.strokeDashoffset = ringOffset;
    if (pct >= 70) {
      ringFill.classList.add('good');
      resultsEmoji.textContent = pct === 100 ? '🏆' : '🎉';
      resultsMessage.textContent = pct === 100
        ? 'Perfect score! You nailed every single question.'
        : 'Great job! You clearly know your stuff.';
    } else if (pct >= 50) {
      ringFill.classList.add('ok');
      resultsEmoji.textContent = '😊';
      resultsMessage.textContent = 'Decent effort! A bit more practice and you\'ll be unstoppable.';
    } else {
      ringFill.classList.add('poor');
      resultsEmoji.textContent = '😅';
      resultsMessage.textContent = 'Tough one! Keep at it — every attempt makes you sharper.';
    }
  }, 100);

  resultsBreakdown.innerHTML = `
    <div class="breakdown-item">
      <span class="breakdown-val correct">${score}</span>
      <span class="breakdown-label">Correct</span>
    </div>
    <div class="breakdown-item">
      <span class="breakdown-val wrong">${questions.length - score}</span>
      <span class="breakdown-label">Wrong</span>
    </div>
    <div class="breakdown-item">
      <span class="breakdown-val">${questions.length}</span>
      <span class="breakdown-label">Total</span>
    </div>
  `;

  progressBar.style.width = '100%';
}

restartBtn.addEventListener('click', () => {
  showScreen('start');
});
