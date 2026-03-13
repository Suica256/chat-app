// ID生成関数
function generateId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

let myAnswerId = localStorage.getItem('answerId');
let currentQuestionerId = null;
let unsubscribeMessages = null;
const viewedQuestioners = new Set();

// 回答者ID生成または取得
if (!myAnswerId) {
  myAnswerId = generateId();
  localStorage.setItem('answerId', myAnswerId);

  db.collection('chats').doc(myAnswerId).set({
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).catch((err) => console.error('初期化失敗:', err));
}

// ID表示
document.getElementById('answerer-id').textContent = myAnswerId;

// 接続状態の監視
function updateConnectionStatus(isOnline) {
  const el = document.getElementById('connection-status');
  el.textContent = isOnline ? 'オンライン' : 'オフライン';
  el.className = 'connection-status ' + (isOnline ? 'online' : 'offline');
}
window.addEventListener('online', () => updateConnectionStatus(true));
window.addEventListener('offline', () => updateConnectionStatus(false));
updateConnectionStatus(navigator.onLine);

// URLコピー機能
document.getElementById('copy-btn').addEventListener('click', () => {
  const path = window.location.pathname.replace('answerer.html', 'questioner.html');
  const url = `${window.location.origin}${path}?id=${myAnswerId}`;

  const showCopied = () => {
    const copyMessage = document.getElementById('copy-message');
    copyMessage.textContent = 'URLをコピーしました！';
    setTimeout(() => { copyMessage.textContent = ''; }, 3000);
  };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(showCopied).catch(() => fallbackCopy(url, showCopied));
  } else {
    fallbackCopy(url, showCopied);
  }
});

function fallbackCopy(text, callback) {
  const input = document.createElement('input');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  callback();
}

// 質問者一覧を監視
db.collection('chats')
  .doc(myAnswerId)
  .collection('conversations')
  .onSnapshot((snapshot) => {
    const listDiv = document.getElementById('questioner-list');

    if (snapshot.empty) {
      listDiv.innerHTML = '<p class="empty-message">質問者が接続されていません</p>';
      return;
    }

    listDiv.innerHTML = '';

    snapshot.forEach((doc) => {
      const questionerId = doc.id;
      const isNew = !viewedQuestioners.has(questionerId);

      const div = document.createElement('div');
      div.className = 'questioner-item';
      div.dataset.questionerId = questionerId;
      if (questionerId === currentQuestionerId) {
        div.classList.add('active');
      }

      const nameSpan = document.createElement('span');
      nameSpan.textContent = `質問者 ${questionerId.substring(2, 6)}`;
      div.appendChild(nameSpan);

      if (isNew) {
        const badge = document.createElement('span');
        badge.className = 'new-badge';
        badge.textContent = 'NEW';
        div.appendChild(badge);
      }

      div.addEventListener('click', () => loadConversation(questionerId));
      listDiv.appendChild(div);
    });
  }, (err) => {
    console.error('質問者一覧の取得に失敗:', err);
  });

// 会話を読み込む
function loadConversation(questionerId) {
  // 前のリスナーを解除（メモリリーク防止）
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }

  currentQuestionerId = questionerId;
  viewedQuestioners.add(questionerId);

  // アクティブ状態・バッジ更新
  document.querySelectorAll('.questioner-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.questionerId === questionerId) {
      item.classList.add('active');
      const badge = item.querySelector('.new-badge');
      if (badge) badge.remove();
    }
  });

  document.getElementById('chat-title').textContent = `質問者 ${questionerId.substring(2, 6)} との会話`;
  document.getElementById('message-input').disabled = false;
  document.getElementById('send-btn').disabled = false;

  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = '';

  // メッセージをリアルタイム監視
  unsubscribeMessages = db.collection('chats')
    .doc(myAnswerId)
    .collection('conversations')
    .doc(questionerId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .onSnapshot((snapshot) => {
      messagesDiv.innerHTML = '';

      if (snapshot.empty) {
        messagesDiv.innerHTML = '<p class="empty-message">まだメッセージがありません</p>';
        return;
      }

      snapshot.forEach((doc) => {
        const msg = doc.data();
        displayMessage(msg.text, msg.sender, msg.timestamp);
      });
    }, (err) => {
      console.error('メッセージ取得に失敗:', err);
    });
}

// メッセージ表示
function displayMessage(text, sender, timestamp) {
  const messagesDiv = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'message ' + (sender === 'answerer' ? 'mine' : 'other');

  const textSpan = document.createElement('span');
  textSpan.className = 'message-text';
  textSpan.textContent = text;
  div.appendChild(textSpan);

  if (timestamp) {
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = timestamp.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    div.appendChild(timeSpan);
  }

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// メッセージ送信
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  if (!currentQuestionerId) {
    alert('質問者を選択してください');
    return;
  }

  const input = document.getElementById('message-input');
  const btn = document.getElementById('send-btn');
  const text = input.value.trim();

  if (text === '') return;

  btn.disabled = true;

  db.collection('chats')
    .doc(myAnswerId)
    .collection('conversations')
    .doc(currentQuestionerId)
    .collection('messages')
    .add({
      text: text,
      sender: 'answerer',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      input.value = '';
    })
    .catch((err) => {
      console.error('送信失敗:', err);
      alert('メッセージの送信に失敗しました。再度お試しください。');
    })
    .finally(() => {
      btn.disabled = false;
      input.focus();
    });
}
