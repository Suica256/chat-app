# 匿名チャットアプリ

Firebaseを使用した1対多のリアルタイムチャットアプリケーション

## 概要

- **回答者**: 固有のIDを持ち、複数の質問者と同時にチャット可能
- **質問者**: 回答者から共有されたURLまたはIDを使って匿名でチャット


## 使い方

1. 回答者が `answerer.html` を開く
2. 表示された回答者IDとURLを質問者に共有
3. 質問者が共有されたURLまたはIDを入力してチャット開始

## ファイル構成

```
.
├── answerer.html      # 回答者用ページ
├── answerer.css       # 回答者用スタイル
├── answerer.js        # 回答者用スクリプト
├── questioner.html    # 質問者用ページ
├── questioner.css     # 質問者用スタイル
├── questioner.js      # 質問者用スクリプト
├── common.js          # Firebase設定（非公開）
├── common.example.js  # Firebase設定のサンプル
├── firebase.json      # Firebase Hosting設定
└── README.md          # このファイル
```


