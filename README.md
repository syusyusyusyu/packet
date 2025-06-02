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

## 技術

- HTML5 / CSS3 / JavaScript
- TextAlive App API
- Tailwind CSS

## セットアップ

```bash
git clone https://github.com/syusyusyusyu/packet.git
cd packet
python -m http.server 8000
