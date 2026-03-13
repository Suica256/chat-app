// URLから回答者IDを取得
const urlParams = new URLSearchParams(window.location.search);
let answererId = urlParams.get('id');

if (!answererId) {
  // ID入力画面を表示
  document.getElementById('entry-screen').style.display = 'flex';

  document.getElementById('entry-btn').addEventListener('click', submitEntry);
  document.getElementById('entry-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitEntry();
  });
  document.getElementById('entry-input').focus();
} else {
  // チャット画面を表示
  document.getElementById('chat-screen').style.display = 'flex';
  initChat(answererId);
}

function submitEntry() {
  const raw = document.getElementById('entry-input').value.trim();
  const errorDiv = document.getElementById('entry-error');

  if (!raw) {
    errorDiv.textContent = 'URLまたはIDを入力してください';
    return;
  }

  // URLまたは生IDからanswerIdを抽出
  let extractedId = raw;
  try {
    const url = new URL(raw);
    const id = url.searchParams.get('id');
    if (id) extractedId = id;
  } catch {
    // URLでなければそのままIDとして使う
  }

  extractedId = extractedId.toUpperCase().trim();

  if (extractedId.length < 4) {
    errorDiv.textContent = '有効なURLまたはIDを入力してください';
    return;
  }

  // 同ページにIDつきでリダイレクト
  window.location.href = `questioner.html?id=${extractedId}`;
}

function initChat(id) {
  // 質問者IDを生成または取得
  let questionerId = localStorage.getItem(`questionerId_${id}`);

  if (!questionerId) {
    questionerId = 'q_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(`questionerId_${id}`, questionerId);

    db.collection('chats')
      .doc(id)
      .collection('conversations')
      .doc(questionerId)
      .set({
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch((err) => console.error('会話ルーム作成失敗:', err));
  }

  // メッセージをリアルタイム監視
  db.collection('chats')
    .doc(id)
    .collection('conversations')
    .doc(questionerId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .onSnapshot((snapshot) => {
      const messagesDiv = document.getElementById('messages');
      messagesDiv.innerHTML = '';

      if (snapshot.empty) {
        messagesDiv.innerHTML = '<p class="empty-message">メッセージを送ってみましょう</p>';
        return;
      }

      snapshot.forEach((doc) => {
        const msg = doc.data();
        displayMessage(msg.text, msg.sender, msg.timestamp);
      });
    }, (err) => {
      console.error('メッセージ取得に失敗:', err);
    });

  // メッセージ送信
  document.getElementById('send-btn').addEventListener('click', () => sendMessage(id, questionerId));
  document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(id, questionerId);
  });
}

function displayMessage(text, sender, timestamp) {
  const messagesDiv = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'message ' + (sender === 'questioner' ? 'mine' : 'other');

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

function sendMessage(id, questionerId) {
  const input = document.getElementById('message-input');
  const btn = document.getElementById('send-btn');
  const text = input.value.trim();

  if (text === '') return;

  btn.disabled = true;

  db.collection('chats')
    .doc(id)
    .collection('conversations')
    .doc(questionerId)
    .collection('messages')
    .add({
      text: text,
      sender: 'questioner',
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
