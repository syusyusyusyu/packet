# Miku Network - ミク☆スターネットワーク歌詞シミュレーター

TextAlive App API Contest 2025 エントリー作品

## 概要

初音ミクの楽曲の歌詞がネットワーク上を「パケット」として流れる様子を可視化するWebアプリケーションです。

## 特徴

- TextAlive APIによるリアルタイム歌詞同期
- 歌詞が端末間をパケットとして移動するネットワークアニメーション
- 初音ミクカラー（#39f0ec）を基調とした星空テーマ
- PC/スマートフォン対応

## デモ

[https://example.com/miku-network](#) <!-- デプロイ先URL -->

## 使い方

1. 楽曲を選択
2. 送信元・送信先端末を選択
3. 「送信開始」ボタンで再生

## 収録楽曲

- ストリートライト / 加賀(ネギシャワーP)
- アリフレーション / 雨良 Amala
- インフォーマルダイブ / 99piano
- ハローフェルミ。 / ど～ぱみん
- パレードレコード / きさら
- ロンリーラン / 海風太陽

## ファイル構成

```
packet/
├── index.html          # メインのHTMLファイル - アプリケーションのUIとレイアウト
├── script.js           # JavaScriptメインファイル - TextAlive API統合とネットワークアニメーション
├── styles.css          # カスタムCSS - 星空背景、パケット、端末のスタイル定義
├── tailwind.css        # Tailwind CSSフレームワーク（コンパイル済み）
├── tailwind.js         # Tailwind CSS設定ファイル - カスタムテーマとフォント設定
├── README.md           # プロジェクト説明ファイル
└── images/             # アイコンとUI画像フォルダ
    ├── 008955FF-B160-46B7-983C-45A2A8A99706.png  # アプリアイコン
    ├── 54F75B51-169C-4AAC-B781-D459DFE38F65.png  # UI要素画像
    ├── B9CF8581-D931-4993-96B8-7E10B00DB6EA.png  # UI要素画像
    └── E2F9A4A1-8021-4483-8B61-2FECD120E824.png  # UI要素画像
```

### 主要ファイルの説明

- **index.html**: アプリのメインUIとレイアウトを定義。ネットワーク端末、コントロールパネル、歌詞表示エリアを含む
- **script.js**: TextAlive APIとの連携、歌詞のパケット化、ネットワークアニメーション、楽曲管理機能を実装
- **styles.css**: 初音ミクテーマの星空背景、パケットアニメーション、端末のデザインを定義
- **tailwind.css**: レスポンシブデザインとユーティリティクラスを提供
- **tailwind.js**: フォント設定とカスタムテーマ色（#39f0ec）を定義

## 技術

- HTML5 / CSS3 / JavaScript
- TextAlive App API
- Tailwind CSS

## セットアップ

```bash
git clone https://github.com/syusyusyusyu/packet.git
cd packet
python -m http.server 8000
