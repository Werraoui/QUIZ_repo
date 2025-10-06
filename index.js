// Simple quiz runtime for main.html: timer, rendering, scoring

//fetching all the categories in open trivia db
window.addEventListener("DOMContentLoaded", function () {
  const category_select = document.getElementById("select2");
  if (!category_select) return; // Only on index.html
  const categoryStatus = document.getElementById("category-status");

  fetch("https://opentdb.com/api_category.php")
    .then(response => response.json())
    .then(data => {
      const categories = data.trivia_categories;

      category_select.innerHTML = '<option value="">Choose Any Category</option>';
      if (categoryStatus) categoryStatus.textContent = '';
      categories.forEach(category => {
        const option = document.createElement("option")
        option.value = category.id;
        option.textContent = category.name;
        category_select.appendChild(option);

      });
    })
    .catch(error => {
      console.error("Error loading categories:", error);
      category_select.innerHTML = '<option value="">Failed to load categories</option>';
      if (categoryStatus) categoryStatus.textContent = 'Couldn\'t load categories. You can still start with Any.';
    });
});

//function to fetch questions from Open trivia db

function fetch_questions(amount, category, difficulty, type) {

  //building the url 
  let api_url = `https://opentdb.com/api.php?amount=${amount}`;

  if (category) api_url += `&category=${category}`;
  if (difficulty) api_url += `&difficulty=${difficulty}`;
  if (type) api_url += `&type=${type}`;

  //fetching using the created url
  fetch(api_url)
    .then(response => response.json())
    .then(data => {
      console.log("API result:", data);
      if (data.response_code === 0) {
        alert(`Fetched ${data.results.length} questions successfully! `);
      } else {
        alert("No questions found for this combination 😢");
      }
    })
    .catch(error => {
      console.error("Error fetching questions:", error);
      alert("Failed to fetch questions. Try again later.");
    });
}
//recuppere the quiz caracteristics choosing by the user

const startBtnEl = document.getElementById("select5");
if (startBtnEl) {
startBtnEl.addEventListener("click", function () {

  //saving the user's choices
  const amount = document.getElementById("select1").value;
  const category = document.getElementById("select2").value;
  const difficulty = document.getElementById("select3").value;
  const type = document.getElementById("select4").value;

  try {
    localStorage.setItem("quiz_amount", amount || "");
    localStorage.setItem("quiz_category", category || "");
    localStorage.setItem("quiz_difficulty", difficulty || "");
    localStorage.setItem("quiz_type", type || "");
  } catch (_) { }

  // Navigate to main page
  window.location.href = 'main.html';

})
}



  (function () {
    const isMainPage = typeof document !== 'undefined' && document.getElementById('question-text');
    if (!isMainPage) return;
    // render fetched questions to the main page
    function decodeHtml(html) {
      const txt = document.createElement('textarea');
      txt.innerHTML = html;
      return txt.value;
    }
    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    function mapApiResultsToQuestions(results) {
      return results.map((q, idx) => {
        const type = q.type; // 'multiple' or 'boolean'
        const correct = decodeHtml(q.correct_answer);
        let options;
        if (type === 'boolean') {
          options = ['True', 'False']; // OpenTDB uses 'True'/'False'
        } else {
          options = shuffle([correct, ...q.incorrect_answers.map(decodeHtml)]);
        }
        return {
          id: idx + 1,
          text: decodeHtml(q.question),
          type,
          options,
          correctAnswer: correct,
        };
      });
    }
    function buildApiUrlFromSelections() {
      const amount = localStorage.getItem('quiz_amount') || '5';
      const category = localStorage.getItem('quiz_category') || '';
      const difficulty = localStorage.getItem('quiz_difficulty') || '';
      const type = localStorage.getItem('quiz_type') || '';

      let url = `https://opentdb.com/api.php?amount=${amount}`;
      if (category) url += `&category=${category}`;
      if (difficulty && difficulty !== 'any') url += `&difficulty=${difficulty}`;
      if (type && type !== 'any') url += `&type=${type}`;
      return url;
    }


    // DOM elements
    const questionTextEl = document.getElementById('question-text');
    const optionsEl = document.getElementById('options');
    const submitBtn = document.getElementById('submit-btn');
    const scoreValueEl = document.getElementById('score-value');
    const timerValueEl = document.getElementById('timer-value');
    const scoreContainerEl = document.getElementById('score');
    const finalScoreEl = document.getElementById('final-score');

    // State
    let questions = [];
    let currentIndex = 0;
    let score = 0;
    let remaining = 30; // seconds per question
    let intervalId = null;

    function clearTimer() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function startTimer(seconds) {
      clearTimer();
      remaining = seconds;
      timerValueEl.textContent = String(remaining);
      intervalId = setInterval(() => {
        remaining -= 1;
        timerValueEl.textContent = String(remaining);
        if (remaining <= 0) {
          clearTimer();
          // Auto-submit with no selection
          handleSubmit();
        }
      }, 1000);
    }

    function renderQuestion(question) {
      questionTextEl.textContent = question.text;
      optionsEl.innerHTML = '';

      const name = 'option';
      if (question.type === 'boolean' || question.type === 'multiple') {
        question.options.forEach((opt, idx) => {
          const id = `opt-${currentIndex}-${idx}`;
          const label = document.createElement('label');
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = name;
          input.value = opt;
          input.id = id;
          label.setAttribute('for', id);
          label.appendChild(input);
          const text = document.createElement('span');
          text.textContent = opt;
          label.appendChild(text);
          optionsEl.appendChild(label);
        });
      }
      // Enable submit only after options rendered
      submitBtn.disabled = false;
      startTimer(30);
    }

    function getSelectedAnswer() {
      const checked = optionsEl.querySelector('input[type="radio"]:checked');
      return checked ? checked.value : null;
    }

    function handleSubmit() {
      clearTimer();
      const question = questions[currentIndex];
      const answer = getSelectedAnswer();
      if (answer && answer === question.correctAnswer) {
        score += 1;
        scoreValueEl.textContent = String(score);
      }

      currentIndex += 1;
      if (currentIndex >= questions.length) {
        // End of quiz: reveal score and scroll to top
        if (scoreContainerEl) {
          scoreValueEl.textContent = `${score} / ${questions.length}`;
          scoreContainerEl.style.display = '';
        }
        questionTextEl.textContent = 'Quiz finished!';
        optionsEl.innerHTML = '';
        submitBtn.disabled = true;
        if (finalScoreEl) {
          finalScoreEl.textContent = `Your Score: ${score} / ${questions.length}`;
          finalScoreEl.style.display = 'block';
        }
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (_) {
          window.scrollTo(0, 0);
        }
        return;
      }
      renderQuestion(questions[currentIndex]);
    }

    submitBtn.addEventListener('click', handleSubmit);
    // Initialize UI
    if (scoreContainerEl) {
      // Hide score until quiz completion
      scoreContainerEl.style.display = 'none';
    }
    scoreValueEl.textContent = String(score);
    timerValueEl.textContent = '30';

    // Fetch questions from OpenTDB based on saved selections, then render
    const url = buildApiUrlFromSelections();
    questionTextEl.textContent = 'Loading questions…';
    submitBtn.disabled = true;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.response_code !== 0 || !data.results?.length) {
          throw new Error('No questions for this selection.');
        }
        questions = mapApiResultsToQuestions(data.results);
        renderQuestion(questions[currentIndex]);
      })
      .catch(err => {
        console.error('Failed to load questions:', err);
        questionTextEl.textContent = 'Failed to load questions. Please go back and try different options.';
        submitBtn.disabled = true;
      });
  })();

