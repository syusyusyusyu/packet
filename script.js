/**
 * Miku Network - TextAlive API統合版
 * モバイル対応強化版 - 2ルーター構成
 */

// 曲のデータ
const songsData = [
    { id: 1, title: "ストリートライト", artist: "加賀(ネギシャワーP)", apiToken: "HmfsoBVch26BmLCm", songUrl: "https://piapro.jp/t/ULcJ/20250205120202" },
    { id: 2, title: "アリフレーション", artist: "雨良 Amala", apiToken: "rdja5JxMEtcYmyKP", songUrl: "https://piapro.jp/t/SuQO/20250127235813" },
    { id: 3, title: "インフォーマルダイブ", artist: "99piano", apiToken: "CqbpJNJHwoGvXhlD", songUrl: "https://piapro.jp/t/Ppc9/20241224135843" },
    { id: 4, title: "ハローフェルミ。", artist: "ど～ぱみん", apiToken: "o1B1ZygOqyhK5B3D", songUrl: "https://piapro.jp/t/oTaJ/20250204234235" },
    { id: 5, title: "パレードレコード", artist: "きさら", apiToken: "G8MU8Wf87RotH8OR", songUrl: "https://piapro.jp/t/GCgy/20250202202635" },
    { id: 6, title: "ロンリーラン", artist: "海風太陽", apiToken: "fI0SyBEEBzlB2f5C", songUrl: "https://piapro.jp/t/CyPO/20250128183915" }
];

// ===== ユーティリティ関数 =====
const Utils = {
    isMobile: () => window.innerWidth <= 768,
    isTablet: () => window.innerWidth > 768 && window.innerWidth <= 1024,
    isSmartphone: () => window.innerWidth <= 640,
      getDeviceType: () => {
        if (window.innerWidth <= 640) return 'smartphone';
        if (window.innerWidth <= 768) return 'mobile';
        if (window.innerWidth <= 1024) return 'tablet';
        if (window.innerWidth <= 1200) return 'medium-desktop'; // 1120px付近対応
        return 'desktop';
    },
    
    createLoadingOverlay: () => {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-miku-400 mb-4"></div>
                <p class="text-white text-xl font-medium mb-2">TextAlive API を読み込み中...</p>
                <p class="text-miku-300">ライセンス情報がコンソールに表示されるまでお待ちください</p>
            </div>
        `;
        return overlay;
    },
    
    removeElement: (element) => {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    },
    
    fadeOutAndRemove: (element, duration = 300) => {
        if (!element) return;
        element.classList.add('animate-fadeOut');
        setTimeout(() => Utils.removeElement(element), duration);
    }
};

// ===== ネットワークデータモデル =====
class NetworkModel {
    constructor() {
        this._nodes = {};
        this._connections = [];
        this._initializeNetwork();
    }
    
    _initializeNetwork() {
        const baseScale = 1.2;
        
        this._nodes = {
            A: { x: -35 * baseScale, y: 50 * baseScale, type: 'terminal', label: 'A', direction: 'right' },
            B: { x: -35 * baseScale, y: 450 * baseScale, type: 'terminal', label: 'B', direction: 'right' },
            C: { x: 705 * baseScale, y: 50 * baseScale, type: 'terminal', label: 'C', direction: 'left' },
            D: { x: 705 * baseScale, y: 450 * baseScale, type: 'terminal', label: 'D', direction: 'left' },
            X: { x: 190 * baseScale, y: 250 * baseScale, type: 'router', label: 'X' },
            Y: { x: 480 * baseScale, y: 250 * baseScale, type: 'router', label: 'Y' }
        };
        
        this._connections = [
            { from: 'A', to: 'X', fromPort: null, toPort: 1, portLabel: 1, id: 'A-X' },
            { from: 'B', to: 'X', fromPort: null, toPort: 2, portLabel: 2, id: 'B-X' },
            { from: 'C', to: 'Y', fromPort: null, toPort: 3, portLabel: 3, id: 'C-Y' },
            { from: 'D', to: 'Y', fromPort: null, toPort: 4, portLabel: 4, id: 'D-Y' },
            { from: 'X', to: 'Y', fromPort: 5, toPort: 5, portLabel: 5, id: 'X-Y' }
        ];
    }
    
    getNodes() {
        return this._nodes;
    }
    
    getConnections() {
        return this._connections;
    }
    
    getTerminalNodes() {
        return Object.entries(this._nodes)
            .filter(([_, node]) => node.type === 'terminal')
            .map(([id, _]) => id);
    }
    
    getNextHop(currentNode, destination) {
        if (currentNode === 'A' || currentNode === 'B') return 'X';
        if (currentNode === 'C' || currentNode === 'D') return 'Y';
        if (currentNode === 'X') {
            if (destination === 'A' || destination === 'B') return destination;
            return 'Y';
        }
        if (currentNode === 'Y') {
            if (destination === 'C' || destination === 'D') return destination;
            return 'X';
        }
        return null;
    }
    
    getConnectionId(fromNode, toNode) {
        const conn = this._connections.find(c => c.from === fromNode && c.to === toNode);
        return conn ? conn.id : null;
    }
    
    getPortNumber(fromNode, toNode) {
        const conn = this._connections.find(c => c.from === fromNode && c.to === toNode);
        return conn ? conn.fromPort : null;
    }
}

// ===== ログマネージャー =====
class LogManager {
    constructor(containerId = 'log-entries', mobileContainerId = 'mobile-log-entries') {
        this._container = document.getElementById(containerId);
        this._mobileContainer = document.getElementById(mobileContainerId);
        this._pendingEntries = [];
        this._maxEntries = 100;
        this._updateInterval = setInterval(() => this._flushEntries(), 250);
    }

    addEntry(message, type = 'info') {
        this._pendingEntries.push({ message, type, timestamp: new Date() });
    }

    _flushEntries() {
        if (!this._pendingEntries.length) return;
        if (!this._container && !this._mobileContainer) return;

        this._pendingEntries.forEach(entry => {
            const logEntry = this._createLogEntryElement(entry);
            
            if (window.innerWidth > 1024 && this._container) {
                this._container.appendChild(logEntry.cloneNode(true));
                this._limitLogEntries(this._container);
                this._scrollToBottom(this._container);
            } else if (this._mobileContainer) {
                this._mobileContainer.appendChild(logEntry.cloneNode(true));
                this._limitLogEntries(this._mobileContainer);
                this._scrollToBottom(this._mobileContainer);
            }
        });

        this._pendingEntries = [];
    }

    _createLogEntryElement(entry) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${entry.type} flex items-start`;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'log-message';
        messageDiv.textContent = entry.message;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-timestamp text-xs whitespace-nowrap ml-2';
        timeSpan.textContent = entry.timestamp.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });

        logEntry.appendChild(messageDiv);
        logEntry.appendChild(timeSpan);
        
        return logEntry;
    }

    _limitLogEntries(container) {
        while (container.children.length > this._maxEntries) {
            container.removeChild(container.firstChild);
        }
    }

    _scrollToBottom(container) {
        const logContainer = container.parentElement;
        if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }    dispose() {
        if (this._updateInterval) {
            clearInterval(this._updateInterval);
            this._updateInterval = null;
        }
    }

    clear() {
        this._pendingEntries = [];
        if (this._container) {
            this._container.innerHTML = '';
        }
        if (this._mobileContainer) {
            this._mobileContainer.innerHTML = '';
        }
    }
}

// ===== TextAlive API管理 =====
class TextAliveManager {
    constructor(onReady, onTimeUpdate, onPlay, onPause, onStop) {
        this._player = null;
        this._isReady = false;
        this._isTextAliveLoaded = false;
        this._selectedSongIndex = 0;
        this._fallbackActive = false;
        this._playRequestPending = false;
        
        this._onReady = onReady;
        this._onTimeUpdate = onTimeUpdate;
        this._onPlay = onPlay;
        this._onPause = onPause;
        this._onStop = onStop;
    }
    
    async initialize() {
        try {
            await this._loadTextAliveScript();
            await this._initializePlayer();
            return true;
        } catch (error) {
            console.error('TextAlive API初期化エラー:', error);
            this._setupFallbackMode();
            return false;
        }
    }
    
    async _loadTextAliveScript() {
        if (typeof window.TextAliveApp === 'undefined') {
            const existingScript = document.querySelector('script[src*="textalive-app-api"]');
            if (!existingScript) {
                const script = document.createElement('script');
                script.src = "https://unpkg.com/textalive-app-api/dist/index.js";
                script.async = true;
                
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    setTimeout(() => reject(new Error('TextAlive APIスクリプトのロードがタイムアウトしました')), 10000);
                    document.head.appendChild(script);
                });
            }
            
            for (let i = 0; i < 50; i++) {
                if (typeof window.TextAliveApp !== 'undefined') break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        if (typeof window.TextAliveApp === 'undefined') {
            throw new Error('TextAliveAppが見つかりません。');
        }
        
        this._isTextAliveLoaded = true;
    }
    
    async _initializePlayer() {
        const { Player } = window.TextAliveApp;
        
        this._player = new Player({
            app: {
                token: "vP37NoaGGtVq40se",
                name: "ミク☆スターネットワーク歌詞シミュレーター"
            },
            player: {
                mediaElement: document.createElement("audio"),
                mediaBannerPosition: "bottom right",
                defaultFontSize: "25px"
            }
        });
        
        this._player.addListener({
            onAppReady: (app) => console.log('TextAlive App準備完了:', app),
            onVideoReady: (v) => this._handleVideoReady(v),
            onTimeUpdate: (position) => this._onTimeUpdate(position),
            onPlay: () => this._handlePlay(),
            onPause: () => this._handlePause(),
            onStop: () => this._handleStop()
        });
        
        const initialSong = songsData[this._selectedSongIndex];
        await this._player.createFromSongUrl(initialSong.songUrl, {
            video: { apiKey: initialSong.apiToken }
        });
    }
      _handleVideoReady(v) {
        console.log('楽曲準備完了:', v);
        
        // TextAlive Playerの利用可能メソッドをデバッグログに出力
        if (this._player) {
            console.log('Player利用可能メソッド:', {
                hasRequestSeek: typeof this._player.requestSeek === 'function',
                hasSeekTo: typeof this._player.seekTo === 'function',
                hasVideoSeekTo: this._player.video && typeof this._player.video.seekTo === 'function',
                playerMethods: Object.getOwnPropertyNames(this._player).filter(name => typeof this._player[name] === 'function'),
                videoMethods: this._player.video ? Object.getOwnPropertyNames(this._player.video).filter(name => typeof this._player.video[name] === 'function') : []
            });
        }
        
        this._isReady = true;
        this._onReady();
    }
      _handlePlay() {
        console.log('TextAliveManager._handlePlay() 呼び出し');
        this._playRequestPending = false;
        this._resetLyricProcessedState();
        console.log('歌詞処理状態をリセットしました - _onPlay()を呼び出し');
        this._onPlay();
    }
    
    _handlePause() {
        this._playRequestPending = false;
        this._onPause();
    }
    
    _handleStop() {
        this._playRequestPending = false;
        this._onStop();
    }    _resetLyricProcessedState() {
        try {
            console.log('歌詞処理状態リセット開始');
            let resetCount = 0;
            
            // デバッグ: プレイヤーデータ構造を詳しく調査
            console.log('プレイヤーデータ構造調査:', {
                hasVideo: !!this._player.video,
                hasData: !!this._player.data,
                videoPhrases: this._player.video ? !!this._player.video.phrases : false,
                dataPhrases: this._player.data ? !!this._player.data.phrases : false,
                videoWords: this._player.video ? !!this._player.video.words : false,
                dataWords: this._player.data ? !!this._player.data.words : false,
                videoKeys: this._player.video ? Object.keys(this._player.video) : [],
                dataKeys: this._player.data ? Object.keys(this._player.data) : []
            });
            
            // 方法1: player.video.phrases
            if (this._player && this._player.video && this._player.video.phrases) {
                console.log('video.phrasesを使用して歌詞状態をリセット');
                console.log('phrases数:', this._player.video.phrases.length);
                this._player.video.phrases.forEach((phrase, phraseIndex) => {
                    if (phrase && phrase.words) {
                        console.log(`フレーズ ${phraseIndex}: ${phrase.words.length}個の単語`);
                        phrase.words.forEach((word, wordIndex) => {
                            if (word) {
                                console.log(`  単語 ${wordIndex}: "${word.text}" processed: ${word.processed} -> false`);
                                word.processed = false;
                                resetCount++;
                            }
                        });
                    }
                });
            }
            
            // 方法2: player.data.phrases
            if (this._player && this._player.data && this._player.data.phrases) {
                console.log('data.phrasesを使用して歌詞状態をリセット');
                console.log('phrases数:', this._player.data.phrases.length);
                this._player.data.phrases.forEach((phrase, phraseIndex) => {
                    if (phrase && phrase.words) {
                        console.log(`フレーズ ${phraseIndex}: ${phrase.words.length}個の単語`);
                        phrase.words.forEach((word, wordIndex) => {
                            if (word) {
                                console.log(`  単語 ${wordIndex}: "${word.text}" processed: ${word.processed} -> false`);
                                word.processed = false;
                                resetCount++;
                            }
                        });
                    }
                });
            }
            
            // 方法3: player.video自体にwordsプロパティがある場合
            if (this._player && this._player.video && this._player.video.words) {
                console.log('video.wordsを使用して歌詞状態をリセット');
                console.log('words数:', this._player.video.words.length);
                this._player.video.words.forEach((word, wordIndex) => {
                    if (word) {
                        console.log(`単語 ${wordIndex}: "${word.text}" processed: ${word.processed} -> false`);
                        word.processed = false;
                        resetCount++;
                    }
                });
            }
            
            // 方法4: player.data自体にwordsプロパティがある場合
            if (this._player && this._player.data && this._player.data.words) {
                console.log('data.wordsを使用して歌詞状態をリセット');
                console.log('words数:', this._player.data.words.length);
                this._player.data.words.forEach((word, wordIndex) => {
                    if (word) {
                        console.log(`単語 ${wordIndex}: "${word.text}" processed: ${word.processed} -> false`);
                        word.processed = false;
                        resetCount++;
                    }
                });
            }
            
            console.log(`歌詞処理状態リセット完了: ${resetCount}個の歌詞単語をリセット`);
        } catch (e) {
            console.error('歌詞データ処理エラー:', e);
        }
    }
    
    _setupFallbackMode() {
        this._fallbackActive = true;
        this._isReady = true;
    }
    
    async changeSong(songIndex) {
        if (songIndex === this._selectedSongIndex || !this._player) return;
        
        this._isReady = false;
        this._selectedSongIndex = songIndex;
        
        const selectedSong = songsData[songIndex];
        await this._player.createFromSongUrl(selectedSong.songUrl, {
            video: { apiKey: selectedSong.apiToken }
        });
    }
    
    async requestPlay() {
        if (!this._isReady) return false;
        
        if (this._player && !this._fallbackActive) {
            try {
                this._playRequestPending = true;
                
                if (this._player.isPlaying) {
                    await this._player.requestPause();
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                await this._player.requestPlay();
                return true;
            } catch (error) {
                console.error('TextAlive Player再生エラー:', error);
                this._setupFallbackMode();
                return false;
            }
        }
        return false;
    }
      async requestPause() {
        if (this._player && !this._fallbackActive) {
            try {
                if (this._playRequestPending) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                this._player.requestPause();
                
                setTimeout(() => {
                    if (this._player && this._player.isPlaying) {
                        this._player.requestStop();
                    }
                }, 500);
            } catch (e) {
                console.error('TextAlive Player一時停止エラー:', e);
            }
        }
    }    async requestRestart() {
        if (this._player && !this._fallbackActive) {
            try {
                console.log('リスタート開始 - プレイヤー状態:', {
                    isPlaying: this._player.isPlaying,
                    position: this._player.timer ? this._player.timer.position : 'N/A',
                    hasTimer: !!this._player.timer,
                    hasVideo: !!this._player.video
                });
                  // 現在の再生を確実に停止し、保留中のリクエストもクリア
                this._playRequestPending = false;
                
                if (this._player.isPlaying) {
                    this._player.requestPause();
                    // 少し長めに待機してpause処理が完了するのを確実にする
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                // 楽曲の最初に戻る - 複数の方法を試す
                let seekSuccess = false;
                
                // 方法1: timer.seek (最も一般的)
                if (!seekSuccess && this._player.timer && this._player.timer.seek) {
                    try {
                        this._player.timer.seek(0);
                        seekSuccess = true;
                        console.log('timer.seekでリスタート成功');
                    } catch (e) {
                        console.log('timer.seek使用不可:', e.message);
                    }
                }
                
                // 方法2: requestSeek
                if (!seekSuccess && this._player.requestSeek) {
                    try {
                        this._player.requestSeek(0);
                        seekSuccess = true;
                        console.log('requestSeekでリスタート成功');
                    } catch (e) {
                        console.log('requestSeek使用不可:', e.message);
                    }
                }
                
                // 方法3: seekTo
                if (!seekSuccess && this._player.seekTo) {
                    try {
                        this._player.seekTo(0);
                        seekSuccess = true;
                        console.log('seekToでリスタート成功');
                    } catch (e) {
                        console.log('seekTo使用不可:', e.message);
                    }
                }
                
                // 方法4: video.seekTo
                if (!seekSuccess && this._player.video && this._player.video.seekTo) {
                    try {
                        this._player.video.seekTo(0);
                        seekSuccess = true;
                        console.log('video.seekToでリスタート成功');
                    } catch (e) {
                        console.log('video.seekTo使用不可:', e.message);
                    }
                }
                
                // 方法5: プレイヤーを再初期化
                if (!seekSuccess) {
                    console.log('シーク機能が使用できないため、曲を再読み込みします');
                    const currentSongIndex = this._selectedSongIndex;
                    await this.changeSong(currentSongIndex);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    seekSuccess = true;
                }
                  // 歌詞の処理状態をリセット
                this._resetLyricProcessedState();
                console.log('歌詞処理状態をリセットしました');
                
                // 少し待ってから再生開始
                await new Promise(resolve => setTimeout(resolve, 200));
                  this._playRequestPending = true;
                console.log('requestPlay()を呼び出します - _playRequestPending:', this._playRequestPending);
                await this._player.requestPlay();
                console.log('リスタート完了 - requestPlay()呼び出し完了');
                return true;
            } catch (error) {
                console.error('TextAlive Player最初から再生エラー:', error);
                return false;
            }
        }
        return false;
    }
    
    getCurrentSongInfo() {
        if (this._player && this._player.data && this._player.data.song) {
            return {
                name: this._player.data.song.name,
                license: this._player.data.song.license
            };
        }
        return null;
    }
    
    findCurrentLyric(position) {
        if (!this._player || this._fallbackActive) return null;
        
        try {
            let phrase = null;
            let word = null;
            
            if (typeof this._player.findPhrase === 'function') {
                phrase = this._player.findPhrase(position);
                
                if (phrase && this._player.video && typeof this._player.video.findWord === 'function') {
                    word = this._player.video.findWord(position);
                } else if (phrase && typeof phrase.findWord === 'function') {
                    word = phrase.findWord(position);
                }
            } else if (this._player.video && typeof this._player.video.findPhrase === 'function') {
                phrase = this._player.video.findPhrase(position);
                
                if (phrase && typeof this._player.video.findWord === 'function') {
                    word = this._player.video.findWord(position);
                }
            } else if (this._player.data && typeof this._player.data.findPhrase === 'function') {
                phrase = this._player.data.findPhrase(position);
                
                if (phrase && this._player.data && typeof this._player.data.findWord === 'function') {
                    word = this._player.data.findWord(position);
                }
            }
            
            return word;
        } catch (e) {
            console.error('歌詞取得エラー:', e);
            return null;
        }
    }
    
    isReady() {
        return this._isReady;
    }
    
    isFallbackMode() {
        return this._fallbackActive;
    }
    
    isPlaying() {
        return this._player && this._player.isPlaying;
    }
    
    getSelectedSongIndex() {
        return this._selectedSongIndex;
    }
    
    dispose() {
        if (this._player) {
            this._player.dispose();
        }
    }
}

// ===== ネットワークレンダラー =====
class NetworkRenderer {
    constructor(networkModel, onTerminalClick) {
        this._model = networkModel;
        this._onTerminalClick = onTerminalClick;
        this._scaleFactor = 1;
        this._offsetX = 0;
        this._offsetY = 0;
        this._baseWidth = 800;
        this._baseHeight = 700;
        this._activeElements = new Set();
        this._viewerLyricsContainer = null;
        this._displayedViewerLyrics = new Map();
        
        this._initializeViewerLyricsContainer();
    }      
    
    _initializeViewerLyricsContainer() {
        this._viewerLyricsContainer = document.getElementById('viewer-lyrics-container') || document.createElement('div');
        if (!this._viewerLyricsContainer.parentNode) {
            this._viewerLyricsContainer.className = 'viewer-lyrics-container absolute top-0 left-0 right-0 flex flex-wrap justify-center items-start gap-2 py-2 px-4 overflow-hidden z-10 pointer-events-none text-2xl font-bold';
            const networkEl = document.getElementById('network');
            if (networkEl) networkEl.appendChild(this._viewerLyricsContainer);
        }
    }

    // 端末位置を考慮した歌詞表示の調整
    _adjustLyricsForTerminals() {
        if (!this._viewerLyricsContainer || !this._model) return;

        const nodes = this._model.getNodes();
        const networkEl = document.getElementById('network');
        if (!networkEl) return;

        const networkRect = networkEl.getBoundingClientRect();
        const terminalPositions = [];

        // 端末（A, B, C, D）の位置を取得
        ['A', 'B', 'C', 'D'].forEach(nodeId => {
            const node = nodes[nodeId];
            if (node) {
                const scaledPos = this.scalePosition(node.x, node.y);
                terminalPositions.push({
                    id: nodeId,
                    x: scaledPos.x,
                    y: scaledPos.y,
                    radius: 40 // 端末の影響範囲
                });
            }
        });

        // 歌詞コンテナの安全な配置位置を計算
        this._adjustLyricsPosition(terminalPositions, networkRect);
    }      _adjustLyricsPosition(terminalPositions, networkRect) {
        if (!this._viewerLyricsContainer) return;

        const containerHeight = Math.min(120, networkRect.height * 0.3);
        let topPosition = 0; // 一番上から開始

        // 上部の端末との衝突をチェック
        const topTerminals = terminalPositions.filter(terminal => 
            terminal.y < containerHeight + terminal.radius
        );

        if (topTerminals.length > 0) {
            // 最も下にある端末の下に配置
            const lowestTopTerminal = Math.max(...topTerminals.map(t => t.y + t.radius));
            topPosition = Math.max(topPosition, lowestTopTerminal + 10);
        }

        // 歌詞コンテナが画面外に出ないよう調整
        if (topPosition + containerHeight > networkRect.height - 40) {
            topPosition = Math.max(0, networkRect.height - containerHeight - 40); // 最小値を0に設定
        }

        // 端末の左右の位置も考慮してパディングを調整
        const leftTerminals = terminalPositions.filter(t => t.x < networkRect.width * 0.3);
        const rightTerminals = terminalPositions.filter(t => t.x > networkRect.width * 0.7);
        
        let leftPadding = 20;
        let rightPadding = 20;
        
        if (leftTerminals.length > 0) {
            leftPadding = Math.max(40, ...leftTerminals.map(t => t.x + t.radius - networkRect.left));
        }
        
        if (rightTerminals.length > 0) {
            rightPadding = Math.max(40, networkRect.right - Math.min(...rightTerminals.map(t => t.x - t.radius)));
        }

        this._viewerLyricsContainer.style.top = `${topPosition}px`;
        this._viewerLyricsContainer.style.maxHeight = `${containerHeight}px`;
        this._viewerLyricsContainer.style.paddingLeft = `${leftPadding}px`;
        this._viewerLyricsContainer.style.paddingRight = `${rightPadding}px`;
    }
      calculateScaleFactor() {
        const networkEl = document.getElementById('network');
        if (!networkEl) return;
        
        const containerWidth = networkEl.clientWidth;
        const containerHeight = networkEl.clientHeight;
        
        if (containerWidth === 0 || containerHeight === 0) return;
        
        const scaleX = containerWidth / this._baseWidth;
        const scaleY = containerHeight / this._baseHeight;
        
        this._scaleFactor = Math.min(scaleX, scaleY, 1);
        
        // デバイスタイプに応じたスケーリング調整
        const deviceType = Utils.getDeviceType();
          switch (deviceType) {
            case 'smartphone':
                // スマートフォンはより小さくして、全体が見えるように
                this._scaleFactor = Math.min(this._scaleFactor * 0.75, 0.6);
                break;
            case 'mobile':
                // 768px以下のモバイルデバイス
                this._scaleFactor = Math.min(this._scaleFactor * 0.8, 0.7);
                break;
            case 'tablet':
                // タブレットは少し小さめだが見やすく
                this._scaleFactor = Math.min(this._scaleFactor * 0.9, 0.85);
                break;
            case 'medium-desktop':
                // 1120px付近の中サイズデスクトップ - 適度にスケーリング
                this._scaleFactor = Math.min(this._scaleFactor * 0.95, 0.9);
                break;
            default:
                // デスクトップはそのまま
                break;
        }
        
        // オフセット計算（中央配置）
        this._offsetX = (containerWidth - (this._baseWidth * this._scaleFactor)) / 2;
        this._offsetY = (containerHeight - (this._baseHeight * this._scaleFactor)) / 2;
        
        // モバイルデバイスの場合、少し上に配置して操作しやすくする
        if (Utils.isMobile()) {
            this._offsetY = Math.max(this._offsetY - 20, 10);
        }
    }
    
    scalePosition(x, y) {
        return {
            x: (x * this._scaleFactor) + this._offsetX,
            y: (y * this._scaleFactor) + this._offsetY
        };
    }
      render() {
        const networkEl = document.getElementById('network');
        if (!networkEl) return;
        
        const zoomArea = networkEl.querySelector('.zoom-area');
        const zoomIndicator = networkEl.querySelector('.zoom-indicator');
        networkEl.innerHTML = '';
        
        if (zoomArea && zoomIndicator) {
            networkEl.appendChild(zoomArea);
            networkEl.appendChild(zoomIndicator);
        }
        
        this._renderConnections(networkEl);
        this._renderNodes(networkEl);
        
        if (this._viewerLyricsContainer && !this._viewerLyricsContainer.parentNode) {
            networkEl.appendChild(this._viewerLyricsContainer);
        }
        
        if (Utils.isMobile()) {
            this._setupTouchTargets(networkEl);
        }

        // レンダリング後に歌詞位置を調整
        this._adjustLyricsForTerminals();
    }
    
    _renderConnections(networkEl) {
        const nodes = this._model.getNodes();
        const connections = this._model.getConnections();
        
        for (const connection of connections) {
            const fromNode = nodes[connection.from];
            const toNode = nodes[connection.to];
            
            if (!fromNode || !toNode) continue;
            
            const fromPos = this.scalePosition(fromNode.x, fromNode.y);
            const toPos = this.scalePosition(toNode.x, toNode.y);
            
            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            const connectionEl = document.createElement('div');
            connectionEl.classList.add('connection');
            connectionEl.dataset.id = connection.id;
            if (this._activeElements.has(connection.id)) {
                connectionEl.classList.add('active');
            }
              connectionEl.style.left = `${fromPos.x}px`;
            connectionEl.style.top = `${fromPos.y}px`;
            connectionEl.style.width = `${length}px`;
            connectionEl.style.transform = `rotate(${angle}rad)`;
            connectionEl.title = `接続: ${connection.from} → ${connection.to}`;
            
            // デバイスタイプに応じた接続線の太さ調整
            const deviceType = Utils.getDeviceType();
            let connectionHeight = '3px';
            
            switch (deviceType) {
                case 'smartphone':
                    connectionHeight = '4px';
                    break;
                case 'mobile':
                    connectionHeight = '5px';
                    break;
                case 'tablet':
                    connectionHeight = '4px';
                    break;
                default:
                    connectionHeight = '3px';
                    break;
            }
            
            connectionEl.style.height = connectionHeight;
            
            networkEl.appendChild(connectionEl);
              if (connection.portLabel) {
                const midX = fromPos.x + dx / 2;
                const midY = fromPos.y + dy / 2;
                
                const portLabelEl = document.createElement('div');
                portLabelEl.classList.add('port-label');
                portLabelEl.dataset.id = `port-${connection.id}`;
                portLabelEl.dataset.port = connection.portLabel;
                if (this._activeElements.has(`port-${connection.id}`)) {
                    portLabelEl.classList.add('active');
                }
                
                portLabelEl.textContent = connection.portLabel;
                portLabelEl.style.left = `${midX}px`;
                portLabelEl.style.top = `${midY}px`;
                portLabelEl.title = `ポート ${connection.portLabel}: ${connection.from} → ${connection.to}`;
                  // デバイスタイプに応じたポートラベルサイズ調整
                const deviceType = Utils.getDeviceType();
                let portSize = '40px';
                let fontSize = '16px';
                
                switch (deviceType) {
                    case 'smartphone':
                        portSize = '24px';
                        fontSize = '10px';
                        break;
                    case 'mobile':
                        portSize = '28px';
                        fontSize = '12px';
                        break;
                    case 'tablet':
                        portSize = '32px';
                        fontSize = '14px';
                        break;
                    case 'medium-desktop':
                        portSize = '36px';
                        fontSize = '15px';
                        break;
                    default:
                        portSize = '40px';
                        fontSize = '16px';
                        break;
                }portLabelEl.style.setProperty('width', portSize, 'important');
                portLabelEl.style.setProperty('height', portSize, 'important');
                portLabelEl.style.setProperty('font-size', fontSize, 'important');
                
                networkEl.appendChild(portLabelEl);
            }
        }
    }
    
    _renderNodes(networkEl) {
        const nodes = this._model.getNodes();
        
        for (const [id, node] of Object.entries(nodes)) {
            const pos = this.scalePosition(node.x, node.y);
            
            const nodeEl = document.createElement('div');
            nodeEl.classList.add('node');
            nodeEl.dataset.id = id;
            
            if (this._activeElements.has(id)) {
                nodeEl.classList.add('active');
            }            
            if (node.type === 'terminal') {
                nodeEl.classList.add('terminal');
                const pcIcon = document.createElement('img');
                pcIcon.src = './images/54F75B51-169C-4AAC-B781-D459DFE38F65.png';
                pcIcon.classList.add('pc-icon');
                
                // デバイスタイプに応じたアイコンサイズ調整
                const deviceType = Utils.getDeviceType();
                let iconSize = '70px';
                let labelSize = '16px';
                
                switch (deviceType) {
                    case 'smartphone':
                        iconSize = '45px';
                        labelSize = '12px';
                        break;
                    case 'mobile':
                        iconSize = '55px';
                        labelSize = '14px';
                        break;
                    case 'tablet':
                        iconSize = '60px';
                        labelSize = '15px';
                        break;
                    case 'medium-desktop':
                        iconSize = '60px';
                        labelSize = '15px';
                        break;
                    default:
                        iconSize = '70px';
                        labelSize = '16px';
                        break;
                }
                
                pcIcon.style.width = iconSize;
                pcIcon.style.height = iconSize;
                if (node.direction === 'right') {
                    pcIcon.style.transform = 'scaleX(-1)';
                }
                nodeEl.appendChild(pcIcon);
                
                const label = document.createElement('div');
                label.textContent = `端末${node.label}`;
                label.classList.add('terminal-label');
                label.style.position = 'absolute';
                label.style.left = '50%';
                label.style.transform = 'translateX(-50%)';
                label.style.bottom = '-24px';
                label.style.fontSize = labelSize;
                label.style.fontWeight = 'bold';
                label.style.whiteSpace = 'nowrap';
                nodeEl.appendChild(label);
                
                nodeEl.addEventListener('click', () => this._onTerminalClick(id));
                nodeEl.title = `端末 ${id}`;            } else if (node.type === 'router') {
                nodeEl.classList.add('router');
                const pcIcon = document.createElement('img');
                // ルータYの場合は異なる画像を使用
                if (id === 'Y') {
                    pcIcon.src = './images/E2F9A4A1-8021-4483-8B61-2FECD120E824.png';
                } else {
                    pcIcon.src = './images/B9CF8581-D931-4993-96B8-7E10B00DB6EA.png';
                }
                pcIcon.classList.add('pc-icon');
                
                // デバイスタイプに応じたアイコンサイズ調整
                const deviceType = Utils.getDeviceType();
                let iconSize = '70px';
                let labelSize = '16px';
                
                switch (deviceType) {
                    case 'smartphone':
                        iconSize = '45px';
                        labelSize = '12px';
                        break;
                    case 'mobile':
                        iconSize = '55px';
                        labelSize = '14px';
                        break;
                    case 'tablet':
                        iconSize = '60px';
                        labelSize = '15px';
                        break;
                    case 'medium-desktop':
                        iconSize = '65px';
                        labelSize = '15px';
                        break;
                    default:
                        iconSize = '70px';
                        labelSize = '16px';
                        break;
                }
                
                pcIcon.style.width = iconSize;
                pcIcon.style.height = iconSize;
                nodeEl.appendChild(pcIcon);
                
                const label = document.createElement('div');
                label.textContent = `ルータ${node.label}`;
                label.classList.add('terminal-label');
                label.style.position = 'absolute';
                label.style.left = '50%';
                label.style.transform = 'translateX(-50%)';
                label.style.bottom = '0px';
                label.style.fontSize = labelSize;
                label.style.fontWeight = 'bold';
                label.style.color = 'white';
                label.style.whiteSpace = 'nowrap';
                nodeEl.appendChild(label);
                
                nodeEl.title = `ルータ${node.label}`;
            }
            
            nodeEl.style.left = `${pos.x}px`;
            nodeEl.style.top = `${pos.y}px`;
            
            nodeEl.addEventListener('mouseenter', () => this._highlightConnections(id));
            nodeEl.addEventListener('mouseleave', () => this._unhighlightConnections(id));
            nodeEl.addEventListener('touchstart', () => this._highlightConnections(id));
            nodeEl.addEventListener('touchend', () => this._unhighlightConnections(id));
            
            networkEl.appendChild(nodeEl);
        }
    }
    
    _highlightConnections(nodeId) {
        const connections = this._model.getConnections();
        for (const conn of connections) {
            if (conn.from === nodeId || conn.to === nodeId) {
                const connEl = document.querySelector(`.connection[data-id="${conn.id}"]`);
                if (connEl) connEl.classList.add('active');
                
                const portEl = document.querySelector(`.port-label[data-id="port-${conn.id}"]`);
                if (portEl) portEl.classList.add('active');
            }
        }
    }
    
    _unhighlightConnections(nodeId) {
        const connections = this._model.getConnections();
        for (const conn of connections) {
            if ((conn.from === nodeId || conn.to === nodeId) && !this._activeElements.has(conn.id)) {
                const connEl = document.querySelector(`.connection[data-id="${conn.id}"]`);
                if (connEl) connEl.classList.remove('active');
                
                const portEl = document.querySelector(`.port-label[data-id="port-${conn.id}"]`);
                if (portEl && !this._activeElements.has(`port-${conn.id}`)) {
                    portEl.classList.remove('active');
                }
            }
        }
    }
      _setupTouchTargets(networkEl) {
        document.querySelectorAll('.terminal').forEach(terminal => {
            const touchArea = document.createElement('div');
            touchArea.className = 'mobile-touch-area';
            
            // デバイスタイプに応じたタッチターゲットサイズ調整
            const deviceType = Utils.getDeviceType();
            let touchSize = '44px';
            
            switch (deviceType) {
                case 'smartphone':
                    touchSize = '48px';
                    break;
                case 'mobile':
                    touchSize = '46px';
                    break;
                case 'tablet':
                    touchSize = '44px';
                    break;
                default:
                    touchSize = '44px';
                    break;
            }
            
            touchArea.style.width = touchSize;
            touchArea.style.height = touchSize;
            touchArea.style.left = terminal.style.left;
            touchArea.style.top = terminal.style.top;
            touchArea.dataset.target = terminal.dataset.id;
            
            touchArea.addEventListener('click', () => {
                this._onTerminalClick(touchArea.dataset.target);
            });
            
            networkEl.appendChild(touchArea);
        });
    }
    
    setActiveElements(elements) {
        this._activeElements = new Set(elements);
    }
    
    updateActiveConnections() {
        const connections = this._model.getConnections();
        const nodes = this._model.getNodes();
        
        for (const connection of connections) {
            const connEl = document.querySelector(`.connection[data-id="${connection.id}"]`);
            const portEl = document.querySelector(`.port-label[data-id="port-${connection.id}"]`);
            
            if (connEl) {
                if (this._activeElements.has(connection.id)) {
                    connEl.classList.add('active');
                } else {
                    connEl.classList.remove('active');
                }
            }
            
            if (portEl) {
                if (this._activeElements.has(`port-${connection.id}`)) {
                    portEl.classList.add('active');
                } else {
                    portEl.classList.remove('active');
                }
            }
        }
        
        for (const [id, node] of Object.entries(nodes)) {
            const nodeEl = document.querySelector(`.node[data-id="${id}"]`);
            if (nodeEl) {
                if (this._activeElements.has(id)) {
                    nodeEl.classList.add('active');
                } else {
                    nodeEl.classList.remove('active');
                }
            }
        }
    }      displayViewerLyric(text) {
        if (this._displayedViewerLyrics.has(text)) return;
        if (!this._viewerLyricsContainer) return;

        // 端末位置を考慮した歌詞表示位置の調整
        this._adjustLyricsForTerminals();

        const viewerChar = document.createElement('span');
        viewerChar.className = 'viewer-lyric-char';
        viewerChar.textContent = text;
          // デバイスタイプに応じたフォントサイズ調整
        const deviceType = Utils.getDeviceType();
        let fontSize = '24px';
        
        switch (deviceType) {
            case 'smartphone':
                fontSize = '18px';
                break;
            case 'mobile':
                fontSize = '20px';
                break;
            case 'tablet':
                fontSize = '22px';
                break;
            case 'medium-desktop':
                fontSize = '23px';
                break;
            default:
                fontSize = '24px';
                break;
        }
        
        viewerChar.style.fontSize = fontSize;
        
        if (this._viewerLyricsContainer.children.length > 0) {
            this._viewerLyricsContainer.appendChild(document.createTextNode(' '));
        }
        
        this._viewerLyricsContainer.appendChild(viewerChar);

        requestAnimationFrame(() => {
            viewerChar.classList.add('active');
        });        this._displayedViewerLyrics.set(text, {
            element: viewerChar
        });

        // 定期的に歌詞位置を再調整（特に動的な画面変更に対応）
        const adjustmentInterval = setInterval(() => {
            if (viewerChar.parentNode) {
                this._adjustLyricsForTerminals();
            } else {
                clearInterval(adjustmentInterval);
            }
        }, 1000);

        setTimeout(() => {
            viewerChar.classList.add('fade-out');
            setTimeout(() => {
                if (viewerChar.parentNode) {
                    const prev = viewerChar.previousSibling;
                    if (prev && prev.nodeType === Node.TEXT_NODE) {
                        prev.remove();
                    }
                    viewerChar.remove();
                }
                this._displayedViewerLyrics.delete(text);
                clearInterval(adjustmentInterval);
            }, 500);
        }, 5000);
    }
    
    clearViewerLyrics() {
        if (this._viewerLyricsContainer) {
            this._viewerLyricsContainer.innerHTML = '';
        }
        this._displayedViewerLyrics.clear();
    }
}

// ===== 歌詞アニメーションマネージャー =====
class LyricAnimationManager {
    constructor(networkModel, renderer) {
        this._model = networkModel;
        this._renderer = renderer;
        this._animationFrames = new Map();
        this._activeElements = new Set();
    }
    
    animateLyric(lyric, onComplete) {
        const nodes = this._model.getNodes();
        const fromNode = nodes[lyric.currentNode];
        const toNode = nodes[lyric.nextNode];
        
        if (!fromNode || !toNode) {
            onComplete(lyric);
            return;
        }
        
        const connectionId = this._model.getConnectionId(lyric.currentNode, lyric.nextNode);
        
        this._activeElements.add(lyric.currentNode);
        this._activeElements.add(lyric.nextNode);
        if (connectionId) {
            this._activeElements.add(connectionId);
            this._activeElements.add(`port-${connectionId}`);
        }
        
        this._renderer.setActiveElements(this._activeElements);
        this._renderer.updateActiveConnections();
        
        const networkEl = document.getElementById('network');
        if (!networkEl) {
            onComplete(lyric);
            return;
        }
        
        const lyricEl = this._createLyricElement(lyric);
        const fromPos = this._renderer.scalePosition(fromNode.x, fromNode.y);
        lyricEl.style.left = `${fromPos.x}px`;
        lyricEl.style.top = `${fromPos.y}px`;
        
        networkEl.appendChild(lyricEl);
        
        this._startAnimation(lyric, lyricEl, fromNode, toNode, () => {
            this._removeElement(lyricEl);
            this._cleanupActiveElements(lyric);
            this._renderer.setActiveElements(this._activeElements);
            this._renderer.updateActiveConnections();
            onComplete(lyric);
        });
    }
      _createLyricElement(lyric) {
        const lyricEl = document.createElement('div');
        lyricEl.classList.add('packet');
        lyricEl.textContent = lyric.text;
        lyricEl.dataset.id = `lyric-${lyric.id}`;
        lyricEl.title = `歌詞 #${lyric.id}: 「${lyric.text}」 ${lyric.source} → ${lyric.destination}`;
        
        // デバイスタイプに応じたパケットサイズ調整
        const deviceType = Utils.getDeviceType();
        let fontSize = '12px';
        let height = '24px';
        let padding = '2px 6px';
        
        switch (deviceType) {
            case 'smartphone':
                fontSize = '9px';
                height = '18px';
                padding = '1px 4px';
                break;
            case 'mobile':
                fontSize = '10px';
                height = '20px';
                padding = '2px 5px';
                break;
            case 'tablet':
                fontSize = '11px';
                height = '22px';
                padding = '2px 6px';
                break;
            default:
                fontSize = '12px';
                height = '24px';
                padding = '2px 6px';
                break;
        }
        
        if (lyric.text.length > 5) {
            lyricEl.style.fontSize = fontSize;
            lyricEl.style.width = 'auto';
            lyricEl.style.minWidth = deviceType === 'smartphone' ? '28px' : '36px';
            lyricEl.style.padding = '0 8px';
        }
        
        if (lyric.text.length > 3) {
            lyricEl.style.fontSize = fontSize;
            lyricEl.style.height = height;
            lyricEl.style.padding = padding;
        }
        
        return lyricEl;
    }
    
    _startAnimation(lyric, lyricEl, fromNode, toNode, onComplete) {
        const startTime = performance.now();
        const duration = 1000;
        
        const animate = (currentTime) => {
            if (lyric.completed) {
                this._animationFrames.delete(lyric.id);
                onComplete();
                return;
            }
            
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const fromPos = this._renderer.scalePosition(fromNode.x, fromNode.y);
            const toPos = this._renderer.scalePosition(toNode.x, toNode.y);
            
            const x = fromPos.x + (toPos.x - fromPos.x) * progress;
            const y = fromPos.y + (toPos.y - fromPos.y) * progress;
            
            try {
                lyricEl.style.left = `${x}px`;
                lyricEl.style.top = `${y}px`;
            } catch (e) {
                console.error('歌詞位置設定エラー:', e);
                this._animationFrames.delete(lyric.id);
                onComplete();
                return;
            }
            
            if (progress < 1) {
                const frameId = requestAnimationFrame(animate);
                this._animationFrames.set(lyric.id, frameId);
            } else {
                this._animationFrames.delete(lyric.id);
                onComplete();
            }
        };
        
        const frameId = requestAnimationFrame(animate);
        this._animationFrames.set(lyric.id, frameId);
    }
    
    _removeElement(element) {
        try {
            element.classList.add('animate-fadeOut');
            setTimeout(() => {
                try {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                } catch (e) {
                    console.error('歌詞要素削除エラー:', e);
                }
            }, 300);
        } catch (e) {
            console.error('歌詞アニメーション終了エラー:', e);
        }
    }
    
    _cleanupActiveElements(lyric) {
        const oldConnectionId = this._model.getConnectionId(lyric.currentNode, lyric.nextNode);
        if (oldConnectionId) {
            let stillActive = false;
            
            for (const frameId of this._animationFrames.keys()) {
                if (frameId !== lyric.id) {
                    stillActive = true;
                    break;
                }
            }
            
            if (!stillActive) {
                this._activeElements.delete(oldConnectionId);
                this._activeElements.delete(`port-${oldConnectionId}`);
            }
        }
    }
    
    clearAll() {
        for (const [id, frameId] of this._animationFrames.entries()) {
            cancelAnimationFrame(frameId);
        }
        this._animationFrames.clear();
        this._activeElements.clear();
        
        const networkEl = document.getElementById('network');
        if (!networkEl) return;
        
        const lyricEls = networkEl.querySelectorAll('.packet');
        lyricEls.forEach(el => {
            Utils.fadeOutAndRemove(el);
        });
    }
    
    dispose() {
        this.clearAll();
    }
}

// ===== 歌詞フローマネージャー =====
class LyricFlowManager {
    constructor(networkModel, renderer, animationManager, logManager) {
        this._model = networkModel;
        this._renderer = renderer;
        this._animationManager = animationManager;
        this._logManager = logManager;
        this._lyrics = [];
        this._lyricId = 0;
        this._stats = {
            lyricsCreated: 0,
            lyricsDelivered: 0,
            totalHops: 0
        };
    }
    
    sendLyric(text, source, destination) {
        this._lyricId++;
        const id = this._lyricId;
        
        const lyric = {
            id,
            source,
            destination,
            text: text,
            currentNode: source,
            nextNode: this._model.getNextHop(source, destination),
            status: 'created',
            createdAt: Date.now(),
            completed: false,
            hops: 0
        };
        
        if (!lyric.nextNode) {
            this._logManager.addEntry(`歌詞 #${id}: 無効なルート設定です。`, 'error');
            return;
        }
        
        this._lyrics.push(lyric);
        this._stats.lyricsCreated++;
        this._logManager.addEntry(`歌詞 #${id}: 「${lyric.text}」を 端末 ${source} から 端末 ${destination} へ送信します。`, 'info');
        this._updateLyricCounter();
        
        this._moveLyric(lyric);
        this._renderer.displayViewerLyric(lyric.text);
    }
    
    _moveLyric(lyric) {
        if (lyric.completed) return;
        
        lyric.hops++;
        
        const portNumber = this._model.getPortNumber(lyric.currentNode, lyric.nextNode);
        
        if (lyric.currentNode !== lyric.source) {
            if (portNumber) {
                this._logManager.addEntry(`歌詞 #${lyric.id}: ルータ ${lyric.currentNode} が「${lyric.text}」を受信し、ポート ${portNumber} から転送します。`, 'info');
            } else {
                this._logManager.addEntry(`歌詞 #${lyric.id}: ルータ ${lyric.currentNode} が「${lyric.text}」を転送します。`, 'info');
            }
        }
        
        this._animationManager.animateLyric(lyric, (completedLyric) => {
            this._processNextHop(completedLyric);
        });
    }
    
    _processNextHop(lyric) {
        if (lyric.completed) return;
        
        lyric.currentNode = lyric.nextNode;
        
        if (lyric.currentNode === lyric.destination) {
            this._stats.lyricsDelivered++;
            this._stats.totalHops += lyric.hops;
            
            this._logManager.addEntry(`歌詞 #${lyric.id}: 「${lyric.text}」が端末 ${lyric.destination} に到達しました。 (${lyric.hops}ホップ)`, 'success');
            lyric.completed = true;
            this._updateLyricCounter();
        } else {
            lyric.nextNode = this._model.getNextHop(lyric.currentNode, lyric.destination);
            
            if (!lyric.nextNode) {
                this._logManager.addEntry(`歌詞 #${lyric.id}: 次ホップが見つかりません。歌詞は破棄されます。`, 'error');
                lyric.completed = true;
                this._updateLyricCounter();
                return;
            }
            
            setTimeout(() => {
                if (!lyric.completed) {
                    this._moveLyric(lyric);
                }
            }, 100);
        }
    }
    
    _updateLyricCounter() {
        const counter = document.getElementById('packet-counter');
        if (counter) {
            const activeCount = this._lyrics.filter(p => !p.completed).length;
            counter.innerHTML = `アクティブな歌詞: <span class="font-bold text-miku-300">${activeCount}</span>`;
        }
    }
      clearAll() {
        this._lyrics = [];
        this._updateLyricCounter();
        this._animationManager.clearAll();
        this._renderer.clearViewerLyrics();
    }
    
    resetStats() {
        this._stats = {
            lyricsCreated: 0,
            lyricsDelivered: 0,
            totalHops: 0
        };
        this._lyricId = 0;
    }
    
    getStats() {
        return this._stats;
    }
}

// ===== UIコントローラー =====
class UIController {
    constructor(simulation) {
        this._simulation = simulation;
        this._lastTerminalTap = null;
        this._isMobileLyricsVisible = localStorage.getItem('lyricsVisible') === 'true';
        
        this._setupEventListeners();
        this._setupMobileLyricsControl();
        this._setupHelpModal();
        this._setupTabControls();
        this._setupMobileInteraction();
        this._setupKeyboardShortcuts();
    }
      _setupEventListeners() {
        const sendBtn = document.getElementById('send-btn');
        const stopBtn = document.getElementById('stop-btn');
        const restartBtn = document.getElementById('restart-btn');
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const songSelect = document.getElementById('song-select');
        const sourceSelect = document.getElementById('source');
        const destSelect = document.getElementById('destination');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this._simulation.startPlayback());
            this._addTouchFeedback(sendBtn);
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this._simulation.stopSimulation());
            this._addTouchFeedback(stopBtn);
        }
        
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this._simulation.restartPlayback());
            this._addTouchFeedback(restartBtn);
        }
        
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this._toggleFullscreen());
            this._addTouchFeedback(fullscreenBtn);
        }
        
        if (songSelect) {
            songSelect.addEventListener('change', () => {
                const selectedIndex = parseInt(songSelect.value);
                this._simulation.changeSong(selectedIndex);
            });
        }
        
        if (sourceSelect && destSelect) {
            this._updateTerminalOptions(sourceSelect);
            this._updateTerminalOptions(destSelect);
            
            sourceSelect.addEventListener('change', () => this._updateActiveTerminals());
            destSelect.addEventListener('change', () => this._updateActiveTerminals());
        }
        
        document.addEventListener('fullscreenchange', () => this._handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this._handleFullscreenChange());
    }
    
    _addTouchFeedback(element) {
        if (Utils.isMobile()) {
            element.addEventListener('touchstart', () => {
                element.classList.add('scale-95', 'opacity-90');
            });
            
            element.addEventListener('touchend', () => {
                element.classList.remove('scale-95', 'opacity-90');
            });
        }
    }
    
    _setupMobileLyricsControl() {
        const lyricsToggleBtn = document.getElementById('lyrics-toggle-btn');
        const lyricsDisplayArea = document.getElementById('lyrics-display-area');
        const closeLyricsBtn = document.getElementById('close-lyrics-btn');

        if (lyricsToggleBtn && lyricsDisplayArea) {
            this._updateMobileLyricsVisibility();

            lyricsToggleBtn.addEventListener('click', () => {
                this._isMobileLyricsVisible = !this._isMobileLyricsVisible;
                this._updateMobileLyricsVisibility();
                localStorage.setItem('lyricsVisible', this._isMobileLyricsVisible);
            });

            if (closeLyricsBtn) {
                closeLyricsBtn.addEventListener('click', () => {
                    this._isMobileLyricsVisible = false;
                    this._updateMobileLyricsVisibility();
                    localStorage.setItem('lyricsVisible', 'false');
                });
            }
        }
    }
    
    _updateMobileLyricsVisibility() {
        const lyricsDisplayArea = document.getElementById('lyrics-display-area');
        const lyricsToggleBtn = document.getElementById('lyrics-toggle-btn');

        if (lyricsDisplayArea) {
            if (this._isMobileLyricsVisible) {
                lyricsDisplayArea.classList.remove('lyrics-display-area-hidden');
                lyricsDisplayArea.classList.add('lyrics-display-area-visible');
                if (lyricsToggleBtn) lyricsToggleBtn.classList.add('active');
            } else {
                lyricsDisplayArea.classList.add('lyrics-display-area-hidden');
                lyricsDisplayArea.classList.remove('lyrics-display-area-visible');
                if (lyricsToggleBtn) lyricsToggleBtn.classList.remove('active');
            }
        }
    }
    
    _setupHelpModal() {
        const helpModal = document.getElementById('help-modal');
        const helpBtn = document.getElementById('help-btn');
        const closeHelp = document.getElementById('close-help');
        const closeHelpBtn = document.getElementById('close-help-btn');
        
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                helpModal.classList.remove('hidden');
                helpModal.classList.add('animate-fadeIn');
            });
        }
        
        if (closeHelp) {
            closeHelp.addEventListener('click', () => this._closeHelpModal(helpModal));
        }
        
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', () => this._closeHelpModal(helpModal));
        }
        
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                this._closeHelpModal(helpModal);
            }
        });
        
        helpModal.addEventListener('touchend', (e) => {
            if (e.target === helpModal) {
                this._closeHelpModal(helpModal);
            }
        });
    }
    
    _closeHelpModal(modal) {
        modal.classList.add('animate-fadeOut');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('animate-fadeOut');
        }, 300);
    }
    
    _setupTabControls() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-tab');
                
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const tabContents = document.querySelectorAll('.tab-content');
                tabContents.forEach(content => {
                    if (content.id === targetId) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            });
        });

        const mobileTabButtons = document.querySelectorAll('.mobile-tab-button');
        mobileTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-tab');
                
                mobileTabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const tabContents = document.querySelectorAll('#mobile-tabs-container .tab-content');
                tabContents.forEach(content => {
                    if (content.id === targetId) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            });
        });
    }
    
    _setupMobileInteraction() {
        if (Utils.isMobile()) {
            this._setupDrawerSwipe();
        }
    }
    
    _setupDrawerSwipe() {
        const drawer = document.getElementById('sidebar-drawer');
        const backdrop = document.getElementById('drawer-backdrop');
        const network = document.getElementById('network');
        
        if (!drawer || !network) return;
        
        let startY = 0;
        let startTime = 0;
        
        network.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startTime = Date.now();
        });
        
        network.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const deltaY = startY - endY;
            const deltaTime = Date.now() - startTime;
            
            if (deltaY > 50 && deltaTime < 300) {
                drawer.classList.add('open');
                backdrop.classList.add('open');
            }
        });
        
        drawer.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startTime = Date.now();
        });
        
        drawer.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const deltaY = endY - startY;
            const deltaTime = Date.now() - startTime;
            
            if (deltaY > 50 && deltaTime < 300) {
                drawer.classList.remove('open');
                backdrop.classList.remove('open');
            }
        });
    }
      _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this._handleEscapeKey();
            } else if (e.key === 'h' || e.key === 'H') {
                this._toggleHelpModal();
            } else if (e.key === 's' || e.key === 'S') {
                this._toggleSimulation();
            } else if (e.key === 'r' || e.key === 'R') {
                this._simulation.restartPlayback();
            } else if (e.key === 'f' || e.key === 'F') {
                this._toggleFullscreen();
            }
        });
    }
    
    _handleEscapeKey() {
        const helpModal = document.getElementById('help-modal');
        if (helpModal && !helpModal.classList.contains('hidden')) {
            this._closeHelpModal(helpModal);
            return;
        }
        
        const drawerEl = document.getElementById('sidebar-drawer');
        const backdropEl = document.getElementById('drawer-backdrop');
        if (drawerEl && drawerEl.classList.contains('open')) {
            drawerEl.classList.remove('open');
            if (backdropEl) backdropEl.classList.remove('open');
            return;
        }
        
        this._simulation.stopSimulation();
    }
    
    _toggleHelpModal() {
        const helpModal = document.getElementById('help-modal');
        if (helpModal.classList.contains('hidden')) {
            helpModal.classList.remove('hidden');
            helpModal.classList.add('animate-fadeIn');
        } else {
            this._closeHelpModal(helpModal);
        }
    }
    
    _toggleSimulation() {
        if (this._simulation.isRunning()) {
            this._simulation.stopSimulation();
        } else {
            this._simulation.startPlayback();
        }
    }
    
    _toggleFullscreen() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        if (!document.fullscreenElement &&
            !document.mozFullScreenElement &&
            !document.webkitFullscreenElement &&
            !document.msFullscreenElement) {
            if (appContainer.requestFullscreen) {
                appContainer.requestFullscreen();
            } else if (appContainer.mozRequestFullScreen) {
                appContainer.mozRequestFullScreen();
            } else if (appContainer.webkitRequestFullscreen) {
                appContainer.webkitRequestFullscreen();
            } else if (appContainer.msRequestFullscreen) {
                appContainer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }
    
    _handleFullscreenChange() {
        this._simulation.handleResize();
        this._updateFullscreenButton();
    }
    
    _updateFullscreenButton() {
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        
        if (!fullscreenBtn) return;
        
        if (document.fullscreenElement ||
            document.mozFullScreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement) {
            fullscreenBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                全画面解除
            `;
        } else {
            fullscreenBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
                </svg>
                全画面
            `;
        }
    }
    
    _updateTerminalOptions(selectElement) {
        if (!selectElement) return;
        
        selectElement.innerHTML = '';
        
        const terminalNodes = this._simulation.getTerminalNodes();
            
        terminalNodes.forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `端末 ${id}`;
            selectElement.appendChild(option);
        });
        
        if (terminalNodes.length > 0) {
            if (selectElement.id === 'source') {
                selectElement.value = terminalNodes[0];
            } else if (selectElement.id === 'destination') {
                selectElement.value = terminalNodes.length > 1 ? terminalNodes[1] : terminalNodes[0];
            }
        }
    }
    
    _updateActiveTerminals() {
        const sourceSelect = document.getElementById('source');
        const destSelect = document.getElementById('destination');
        
        if (!sourceSelect || !destSelect) return;
        
        const source = sourceSelect.value;
        const destination = destSelect.value;
        
        document.querySelectorAll('.terminal').forEach(el => {
            el.classList.remove('active');
        });
        
        const sourceEl = document.querySelector(`.terminal[data-id="${source}"]`);
        const destEl = document.querySelector(`.terminal[data-id="${destination}"]`);
        
        if (sourceEl) sourceEl.classList.add('active');
        if (destEl) destEl.classList.add('active');
    }
    
    handleTerminalClick(id) {
        const sourceSelect = document.getElementById('source');
        const destSelect = document.getElementById('destination');
        
        if (!sourceSelect || !destSelect) return;
        
        if (window.event && window.event.shiftKey) {
            destSelect.value = id;
        } else {
            const now = new Date().getTime();
            if (this._lastTerminalTap && this._lastTerminalTap.id === id && now - this._lastTerminalTap.time < 500) {
                destSelect.value = id;
            } else {
                sourceSelect.value = id;
            }
            
            this._lastTerminalTap = { id, time: now };
        }
        
        this._updateActiveTerminals();
    }
    
    updateSongSelectionDropdown() {
        const songSelect = document.getElementById('song-select');
        if (!songSelect) return;
        
        songSelect.innerHTML = '';
        
        songsData.forEach((song, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${song.title} - ${song.artist}`;
            songSelect.appendChild(option);
        });
        
        songSelect.value = this._simulation.getSelectedSongIndex();
        
        if (Utils.isMobile()) {
            songSelect.classList.add('text-sm');
        }
    }
    
    updateSimulationStatus(isRunning) {
        const statusEl = document.getElementById('simulation-status');
        if (!statusEl) return;
        
        if (isRunning) {
            statusEl.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-miku-500 bg-opacity-20 text-miku-300 shadow-sm transition-all duration-300';
            statusEl.innerHTML = '<span class="h-2.5 w-2.5 mr-1.5 rounded-full bg-miku-400 animate-pulse"></span>再生中';
        } else {
            statusEl.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-500 bg-opacity-20 text-pink-300 shadow-sm transition-all duration-300';
            statusEl.innerHTML = '<span class="h-2.5 w-2.5 mr-1.5 rounded-full bg-pink-400"></span>停止中';
        }
    }
    
    updateRoutingTable() {
        this._updateRoutingTableById('routing-table');
        this._updateRoutingTableById('mobile-routing-table');
    }
    
    _updateRoutingTableById(tableId) {
        const tableBody = document.querySelector(`#${tableId} tbody`);
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        const sections = [
            { title: 'ルータ X', routes: [
                { dest: '端末 A', port: '1' },
                { dest: '端末 B', port: '2' },
                { dest: '端末 C,D', port: '5' }
            ]},
            { title: 'ルータ Y', routes: [
                { dest: '端末 C', port: '3' },
                { dest: '端末 D', port: '4' },
                { dest: '端末 A,B', port: '5' }
            ]}
        ];
        
        sections.forEach(section => {
            this._addRoutingTableSection(tableBody, section.title);
            section.routes.forEach(route => {
                this._addRoutingTableRow(tableBody, route.dest, route.port);
            });
        });
    }
    
    _addRoutingTableSection(tableBody, title) {
        if (!tableBody) return;
        
        const row = document.createElement('tr');
        row.classList.add('bg-space-800', 'bg-opacity-80');
        const cell = document.createElement('td');
        cell.setAttribute('colspan', '2');
        cell.classList.add('px-4', 'py-2.5', 'font-medium', 'text-miku-300', 'text-center', 'border-t', 'border-b', 'border-miku-800');
        cell.textContent = title;
        row.appendChild(cell);
        tableBody.appendChild(row);
    }
    
    _addRoutingTableRow(tableBody, destination, port) {
        if (!tableBody) return;
        
        const row = document.createElement('tr');
        row.classList.add('hover:bg-space-800', 'hover:bg-opacity-50', 'transition-colors');
        
        const destCell = document.createElement('td');
        destCell.classList.add('px-4', 'py-2.5', 'border-b', 'border-miku-800', 'text-sm', 'text-white');
        destCell.textContent = destination;
        
        const portCell = document.createElement('td');
        portCell.classList.add('px-4', 'py-2.5', 'border-b', 'border-miku-800', 'text-sm', 'font-medium', 'text-miku-300');
        portCell.textContent = port;
        
        row.appendChild(destCell);
        row.appendChild(portCell);
        tableBody.appendChild(row);
    }
    
    showInitialHelp() {
        setTimeout(() => {
            const helpModal = document.getElementById('help-modal');
            if (helpModal) {
                helpModal.classList.remove('hidden');
                helpModal.classList.add('animate-fadeIn');
            }
        }, 500);
    }
    
    enableSendButton(enabled) {
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.disabled = !enabled;
            if (enabled) {
                sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    }
}

// ===== フォールバックマネージャー =====
class FallbackManager {
    constructor(onSendLyric) {
        this._onSendLyric = onSendLyric;
        this._fallbackLyrics = [
            { text: "マジカル", time: 1000 },
            { text: "ミライ", time: 3000 },
            { text: "初音", time: 5000 },
            { text: "ミク", time: 6000 },
            { text: "歌詞が", time: 8000 },
            { text: "流れて", time: 9500 },
            { text: "いく", time: 11000 }
        ];
        this._fallbackTimer = null;
        this._fallbackLyricsIndex = 0;
        this._fallbackStartTime = 0;
    }
    
    start() {
        this._fallbackLyricsIndex = 0;
        this._fallbackStartTime = Date.now();
        
        if (this._fallbackTimer) clearInterval(this._fallbackTimer);
        
        this._fallbackTimer = setInterval(() => {
            const elapsed = Date.now() - this._fallbackStartTime;
            
            while (this._fallbackLyricsIndex < this._fallbackLyrics.length) {
                const lyric = this._fallbackLyrics[this._fallbackLyricsIndex];
                
                if (lyric.time <= elapsed) {
                    this._onSendLyric(lyric.text);
                    this._fallbackLyricsIndex++;
                } else {
                    break;
                }
            }
            
            if (this._fallbackLyricsIndex >= this._fallbackLyrics.length) {
                this._fallbackLyricsIndex = 0;
                this._fallbackStartTime = Date.now();
            }
        }, 100);
    }
      stop() {
        if (this._fallbackTimer) {
            clearInterval(this._fallbackTimer);
            this._fallbackTimer = null;
        }
    }
    
    restart() {
        this.stop();
        this.start();
    }
}

// ===== メインシミュレーションクラス =====
class LyricsNetworkSimulation {
    constructor() {
        this._isRunning = false;
        this._isCleaningUp = false;
        this._userInteracted = false;
        this._loadingOverlay = Utils.createLoadingOverlay();
        document.body.appendChild(this._loadingOverlay);
        
        // 各マネージャーの初期化
        this._networkModel = new NetworkModel();
        this._logManager = new LogManager();
        this._renderer = new NetworkRenderer(this._networkModel, (id) => this._uiController.handleTerminalClick(id));
        this._animationManager = new LyricAnimationManager(this._networkModel, this._renderer);
        this._lyricFlowManager = new LyricFlowManager(this._networkModel, this._renderer, this._animationManager, this._logManager);
        
        this._textAliveManager = new TextAliveManager(
            () => this._handleTextAliveReady(),
            (position) => this._handleTimeUpdate(position),
            () => this._handlePlay(),
            () => this._handlePause(),
            () => this._handleStop()
        );
        
        this._fallbackManager = new FallbackManager((text) => this._sendFallbackLyric(text));
        this._uiController = new UIController(this);
        
        // 初期化処理
        this._initialize();
    }
    
    async _initialize() {
        this._setupUserInteractionDetection();
        this._initUI();
        this._renderer.calculateScaleFactor();
        this._renderer.render();
        this._uiController.updateRoutingTable();
        this._uiController.showInitialHelp();
          window.addEventListener('resize', () => this.handleResize());
        
        // デバイスの向き変更にも対応
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 100);
        });
        
        window.addEventListener('beforeunload', () => {
            this.dispose();
        });
        
        await this._textAliveManager.initialize();
    }
    
    _setupUserInteractionDetection() {
        const interactionHandler = () => {
            this._userInteracted = true;
            
            const messageEl = document.getElementById('user-interaction-message');
            if (messageEl && messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        };
        
        document.addEventListener('click', interactionHandler, { once: true });
        document.addEventListener('keydown', interactionHandler, { once: true });
        document.addEventListener('touchstart', interactionHandler, { once: true });
    }
    
    _initUI() {
        this._logManager.addEntry('ミク☆スターネットワーク歌詞シミュレーションを初期化しました。', 'system');
        this._logManager.addEntry('TextAlive APIを読み込み中です。', 'system');
        this._logManager.addEntry('「送信開始」ボタンをクリックして再生を開始します。', 'system');
        this._logManager.addEntry('「H」キーを押すとヘルプが表示されます。', 'system');
        
        this._uiController.updateSimulationStatus(false);
        this._uiController.updateSongSelectionDropdown();
    }
    
    _handleTextAliveReady() {
        Utils.removeElement(this._loadingOverlay);
        
        const songInfo = this._textAliveManager.getCurrentSongInfo();
        if (songInfo) {
            this._logManager.addEntry(`曲「${songInfo.name}」の準備完了`, 'success');
            if (songInfo.license) {
                console.log('ライセンス情報:', songInfo.license);
            }
        }
        
        if (this._textAliveManager.isFallbackMode()) {
            this._logManager.addEntry("TextAlive API接続に失敗しました。フォールバックモードで実行します。", "error");
            this._logManager.addEntry("このモードでは、歌詞の正確なタイミングは提供されません。", "system");
        }
    }    _handleTimeUpdate(position) {
        if (!this._isRunning) {
            console.log('_handleTimeUpdate: シミュレーションが停止中なのでスキップ, position:', position);
            return;
        }
        
        const word = this._textAliveManager.findCurrentLyric(position);
        
        if (word && word.startTime <= position && !word.processed) {
            console.log('歌詞送信:', word.text, 'at position:', position, 'startTime:', word.startTime, 'word object:', word);
            this._sendLyricWord(word);
            word.processed = true;
        } else if (word && word.processed) {
            // 処理済みの歌詞をデバッグ（最初の3個だけ表示）
            if (position < 10000) { // 最初の10秒間のみ
                console.log('処理済み歌詞スキップ:', word.text, 'at position:', position, 'startTime:', word.startTime);
            }
        } else if (word) {
            // その他の条件
            console.log('歌詞あるが条件不一致:', {
                text: word.text,
                position: position,
                startTime: word.startTime,
                processed: word.processed,
                条件: `startTime(${word.startTime}) <= position(${position}): ${word.startTime <= position}, processed: ${word.processed}`
            });
        }
    }_handlePlay() {
        console.log('_handlePlay イベント発生 - 再生開始, 現在の_isRunning:', this._isRunning);
        this._logManager.addEntry('再生開始', 'success');
        this._isRunning = true;
        console.log('_handlePlay で _isRunning を true に設定しました');
        this._uiController.updateSimulationStatus(true);
    }
    
    _handlePause() {
        this._logManager.addEntry('再生一時停止', 'info');
        this._isRunning = false;
        this._uiController.updateSimulationStatus(false);
    }
    
    _handleStop() {
        this._logManager.addEntry('再生停止', 'info');
        this._isRunning = false;
        this._lyricFlowManager.clearAll();
        this._uiController.updateSimulationStatus(false);
        this._uiController.enableSendButton(true);
        
        if (this._textAliveManager.isPlaying()) return;
        
        const position = 0; // 簡略化のため
        const duration = 1; // 簡略化のため
        
        if (duration > 0 && position > 0 && (duration - position) < 5000) {
            this._logManager.addEntry('曲が終了しました。ページをリロードします...', 'system');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }
    
    _sendLyricWord(word) {
        if (!this._isRunning || !word) return;
        
        const sourceSelect = document.getElementById('source');
        const destSelect = document.getElementById('destination');
        
        if (!sourceSelect || !destSelect) return;
        
        const source = sourceSelect.value;
        const destination = destSelect.value;
        
        this._lyricFlowManager.sendLyric(word.text, source, destination);
    }
    
    _sendFallbackLyric(text) {
        const sourceSelect = document.getElementById('source');
        const destSelect = document.getElementById('destination');
        
        if (!sourceSelect || !destSelect) return;
        
        const source = sourceSelect.value;
        const destination = destSelect.value;
        
        this._lyricFlowManager.sendLyric(text, source, destination);
    }
    
    // ===== 公開API =====
    
    async startPlayback() {
        if (!this._textAliveManager.isReady()) {
            this._logManager.addEntry('曲の準備ができていません。しばらくお待ちください。', 'error');
            return;
        }
        
        if (this._isRunning) {
            this.stopSimulation();
            return;
        }
        
        if (!this._userInteracted) {
            if (!document.getElementById('user-interaction-message')) {
                const messageEl = document.createElement('div');
                messageEl.id = 'user-interaction-message';
                messageEl.className = 'fixed top-0 left-0 right-0 bg-pink-500 text-white p-2 text-center z-50';
                messageEl.innerHTML = 'ページ上のどこかをクリックして再生を開始してください';
                
                document.body.appendChild(messageEl);
                
                const handleInteraction = () => {
                    this._userInteracted = true;
                    if (messageEl.parentNode) {
                        messageEl.parentNode.removeChild(messageEl);
                    }
                    
                    document.removeEventListener('click', handleInteraction);
                    document.removeEventListener('keydown', handleInteraction);
                    document.removeEventListener('touchstart', handleInteraction);
                    
                    setTimeout(() => {
                        this._actuallyStartPlayback();
                    }, 100);
                };
                
                document.addEventListener('click', handleInteraction);
                document.addEventListener('keydown', handleInteraction);
                document.addEventListener('touchstart', handleInteraction);
                
                this._logManager.addEntry('再生を開始するには、ページ上で操作してください。', 'info');
                return;
            }
            return;
        }
        
        this._actuallyStartPlayback();
    }
    
    async _actuallyStartPlayback() {
        const success = await this._textAliveManager.requestPlay();
        
        if (!success) {
            this._fallbackManager.start();
            this._isRunning = true;
            this._uiController.updateSimulationStatus(true);
        }
        
        this._uiController.enableSendButton(false);
    }
    
    async stopSimulation() {
        if (this._isCleaningUp) return;
        
        this._isCleaningUp = true;
        
        await this._textAliveManager.requestPause();
        this._fallbackManager.stop();
        
        this._isRunning = false;
        this._lyricFlowManager.clearAll();
        this._renderer.setActiveElements(new Set());
        this._renderer.render();
        this._logManager.addEntry('再生を停止しました。', 'info');
          this._uiController.enableSendButton(true);
        this._uiController.updateSimulationStatus(false);
        
        this._isCleaningUp = false;
    }    async restartPlayback() {
        if (!this._textAliveManager.isReady()) {
            this._logManager.addEntry('曲の準備ができていません。しばらくお待ちください。', 'error');
            return;
        }
        
        // ログをクリアしてから開始メッセージを追加
        this._logManager.clear();
        this._logManager.addEntry('再生を最初から開始します...', 'info');
        console.log('restartPlayback開始 - 現在の_isRunning:', this._isRunning);
          // 現在の再生を停止してクリア（ただし状態はまだ維持）
        if (this._isRunning) {
            console.log('現在実行中なので歌詞とアニメーションをクリア');
            this._lyricFlowManager.clearAll();
            this._renderer.setActiveElements(new Set());
            this._renderer.render();
        }
        
        // 統計情報をリセット
        this._lyricFlowManager.resetStats();
        console.log('統計情報をリセットしました');
        
        // TextAliveManagerに再開を要求
        console.log('TextAliveManager.requestRestart()を呼び出し中...');
        const success = await this._textAliveManager.requestRestart();
        console.log('requestRestart()の結果:', success);
        
        if (success) {
            // TextAliveが正常に動作している場合、_handlePlay()イベントで状態が更新される
            this._logManager.addEntry('再生をリスタートしました', 'success');
            console.log('TextAliveリスタート成功 - _handlePlay()イベントを待機中...');
        } else {
            // フォールバックモードでリスタート
            console.log('フォールバックモードでリスタート開始');
            await this.stopSimulation();
            await new Promise(resolve => setTimeout(resolve, 200));
            this._fallbackManager.restart();
            this._isRunning = true;
            console.log('フォールバックモード: _isRunning を true に設定');
            this._uiController.updateSimulationStatus(true);
            this._logManager.addEntry('フォールバックモードでリスタートしました', 'info');
            console.log('フォールバックモードでリスタート完了');
        }
        
        this._uiController.enableSendButton(false);
        console.log('restartPlayback完了');
    }

    async changeSong(songIndex) {
        await this.stopSimulation();
        await new Promise(resolve => setTimeout(resolve, 300));
        
        document.body.appendChild(this._loadingOverlay);
        
        try {
            const selectedSong = songsData[songIndex];
            this._logManager.addEntry(`曲「${selectedSong.title}」を読み込み中...`, 'system');
            await this._textAliveManager.changeSong(songIndex);
        } catch (error) {
            console.error('曲変更エラー:', error);
            this._logManager.addEntry(`曲変更エラー: ${error.message}`, 'error');
            Utils.removeElement(this._loadingOverlay);
        }
    }
      handleResize() {
        this._renderer.calculateScaleFactor();
        this._renderer.render();
        // 画面サイズ変更時に歌詞位置も再調整
        this._renderer._adjustLyricsForTerminals();
    }
    
    isRunning() {
        return this._isRunning;
    }
    
    getTerminalNodes() {
        return this._networkModel.getTerminalNodes();
    }
    
    getSelectedSongIndex() {
        return this._textAliveManager.getSelectedSongIndex();
    }
    
    dispose() {
        window.removeEventListener('resize', () => this.handleResize());
        
        this._fallbackManager.stop();
        this._animationManager.dispose();
        this._textAliveManager.dispose();
        this._logManager.dispose();
        this._lyricFlowManager.clearAll();
    }
}

// ===== エントリーポイント =====
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.simulation = new LyricsNetworkSimulation();
    } catch (e) {
        console.error('シミュレーションの初期化エラー:', e);
    }

    // サイドバー（ドロワー）閉じるボタンの設定
    const closeDrawerBtn = document.getElementById('close-drawer');
    const drawerEl = document.getElementById('sidebar-drawer');
    const backdropEl = document.getElementById('drawer-backdrop');
    const networkEl = document.getElementById('network');

    if (closeDrawerBtn && drawerEl && backdropEl) {
        closeDrawerBtn.addEventListener('click', () => {
            drawerEl.classList.remove('open');
            backdropEl.classList.remove('open');
        });
        
        if (networkEl) {
            networkEl.addEventListener('click', (e) => {
                if (drawerEl.classList.contains('open')) {
                    drawerEl.classList.remove('open');
                    backdropEl.classList.remove('open');
                }
            });
        }
    }

    if (drawerEl) {
        let startY = 0;
        let startTime = 0;
        
        drawerEl.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startTime = Date.now();
        });
        
        drawerEl.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const deltaY = endY - startY;
            const deltaTime = Date.now() - startTime;
            
            if (deltaY > 30 && deltaTime < 300) {
                drawerEl.classList.remove('open');
                backdropEl.classList.remove('open');
            }
        });
    }
});