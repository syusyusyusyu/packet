/**
 * ミク☆スターネットワーク歌詞シミュレーター
 * 歌詞ネットワークシミュレーション - TextAlive API統合版
 * 初音ミクの曲の歌詞がネットワーク上を流れる様子を表示する
 * モバイル対応強化版 - 2ルーター構成
 */

// TextAliveネットワークシミュレーション - 歌詞流れ可視化
class LyricsNetworkSimulation {
    constructor() {
        // 基本設定
        this.nodes = {};                 // ノード情報を格納
        this.connections = [];           // ノード間の接続情報
        this.lyrics = [];                // 歌詞情報
        this.lyricId = 0;                // 歌詞ID（自動増加）
        this.isRunning = false;          // シミュレーション実行中かどうか
        this.isCleaningUp = false;       // クリーンアップ処理中フラグ
        this.sendInterval = null;        // 定期送信用インターバル
        this.scaleFactor = 1;            // 表示スケール係数
        this.offsetX = 0;                // X軸オフセット
        this.offsetY = 0;                // Y軸オフセット
        this.baseWidth = 800;            // 基準幅
        this.baseHeight = 700;           // 基準高さ
        this.activeElements = new Set(); // アクティブ要素を追跡
        this.currentSource = null;       // 現在の送信元
        this.currentDestination = null;  // 現在の送信先
        this.animationFrames = new Map();// アニメーションフレームを追跡
        this.stats = {                   // 統計情報
            lyricsCreated: 0,
            lyricsDelivered: 0,
            totalHops: 0
        };
        this.isMobile = window.innerWidth <= 768; // モバイル判定
        
        // TextAlive API関連
        this.player = null;              // TextAlive Player
        this.app = null;                 // TextAlive App
        this.isReady = false;            // 準備完了フラグ
        this.selectedSongIndex = 0;      // 選択された曲のインデックス
        this.isTextAliveLoaded = false;  // TextAlive API読み込み完了フラグ
        this.userInteracted = false;     // ユーザー操作があったかフラグ
        this.fallbackActive = false;     // フォールバックモード有効フラグ
        this.playRequestPending = false; // 再生リクエスト中フラグ
        
        // ロード画面
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'loading-overlay';
        this.loadingOverlay.innerHTML = `
            <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-miku-400 mb-4"></div>
                <p class="text-white text-xl font-medium mb-2">TextAlive API を読み込み中...</p>
                <p class="text-miku-300">ライセンス情報がコンソールに表示されるまでお待ちください</p>
            </div>
        `;
        document.body.appendChild(this.loadingOverlay);
        
        // ログマネージャーの初期化（デスクトップとモバイル両方のコンテナを指定）
        this.logManager = new LogManager('log-entries', 'mobile-log-entries');
        
        // 鑑賞用歌詞表示のための追加設定
        this.displayedViewerLyrics = new Map(); // 表示済み鑑賞用歌詞を追跡
        this.viewerLyricsContainer = document.getElementById('viewer-lyrics-container') || document.createElement('div');
        if (!this.viewerLyricsContainer.parentNode) {
            this.viewerLyricsContainer.className = 'viewer-lyrics-container absolute bottom-12 left-0 right-0 flex flex-wrap justify-center items-center gap-2 py-2 px-4 overflow-hidden z-10 pointer-events-none text-2xl font-bold';
            const networkEl = document.getElementById('network');
            if (networkEl) networkEl.appendChild(this.viewerLyricsContainer);
        }
        
        // 歌詞表示状態の初期化
        this.isMobileLyricsVisible = localStorage.getItem('lyricsVisible') === 'true';
        this.setupMobileLyricsControl();
        
        // データ初期化
        this.initializeNodes();
        this.createConnections();
        
        // UI初期化
        this.initUI();
        this.setupEventListeners();
        this.renderNetwork();
        this.renderRoutingTable();
        this.updateLyricCounter();
        this.updateActiveTerminals();
        
        // ユーザー操作の検出
        this.setupUserInteractionDetection();
        
        // TextAlive APIスクリプトをロード
        this.loadTextAliveAPI();
        
        // ウィンドウサイズ変更時の処理
        this.resizeHandler = this.handleResize.bind(this);
        window.addEventListener('resize', this.resizeHandler);
        
        // キーボードショートカット
        this.keydownHandler = this.handleKeyboardShortcuts.bind(this);
        document.addEventListener('keydown', this.keydownHandler);
        
        // ヘルプモーダル
        this.setupHelpModal();

        // モバイルタブの初期化
        this.setupTabControls();
        
        // モバイル用タッチイベント設定
        this.setupMobileInteraction();

        // 初期ヘルプを表示
        setTimeout(() => {
            const helpModal = document.getElementById('help-modal');
            if (helpModal) {
                helpModal.classList.remove('hidden');
                helpModal.classList.add('animate-fadeIn');
            }
        }, 500); // 500ms後に表示（UIの初期化を待つため）
    }
    
    // モバイル用歌詞表示制御の設定
    setupMobileLyricsControl() {
        const lyricsToggleBtn = document.getElementById('lyrics-toggle-btn');
        const lyricsDisplayArea = document.getElementById('lyrics-display-area');
        const closeLyricsBtn = document.getElementById('close-lyrics-btn');

        if (lyricsToggleBtn && lyricsDisplayArea) {
            // 初期状態を設定
            this.updateMobileLyricsVisibility();

            // トグルボタンのクリック処理
            lyricsToggleBtn.addEventListener('click', () => {
                this.isMobileLyricsVisible = !this.isMobileLyricsVisible;
                this.updateMobileLyricsVisibility();
                localStorage.setItem('lyricsVisible', this.isMobileLyricsVisible);
            });

            // 閉じるボタンのクリック処理
            if (closeLyricsBtn) {
                closeLyricsBtn.addEventListener('click', () => {
                    this.isMobileLyricsVisible = false;
                    this.updateMobileLyricsVisibility();
                    localStorage.setItem('lyricsVisible', false);
                });
            }
        }
    }

    // 歌詞表示状態の更新
    updateMobileLyricsVisibility() {
        const lyricsDisplayArea = document.getElementById('lyrics-display-area');
        const lyricsToggleBtn = document.getElementById('lyrics-toggle-btn');

        if (lyricsDisplayArea) {
            if (this.isMobileLyricsVisible) {
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
    
    // モバイル用タッチイベント設定
    setupMobileInteraction() {
        if (this.isMobile) {
            this.setupTouchTargets();
        }
    }
    
    // モバイル用タッチ操作領域設定
    setupTouchTargets() {
        // 端末アイコンにタッチ領域を追加
        document.querySelectorAll('.terminal').forEach(terminal => {
            const touchArea = document.createElement('div');
            touchArea.className = 'mobile-touch-area';
            touchArea.style.left = terminal.style.left;
            touchArea.style.top = terminal.style.top;
            touchArea.dataset.target = terminal.dataset.id;
            
            // タッチアイコンのイベント伝播
            touchArea.addEventListener('click', () => {
                this.handleTerminalClick(touchArea.dataset.target);
            });
            
            const network = document.getElementById('network');
            if (network) {
                network.appendChild(touchArea);
            }
        });
        
        // スワイプでドロワーを開閉
        const drawer = document.getElementById('sidebar-drawer');
        const backdrop = document.getElementById('drawer-backdrop');
        const network = document.getElementById('network');
        
        if (drawer && network) {
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
                
                // 下から上へのスワイプでドロワーを開く
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
                
                // 上から下へのスワイプでドロワーを閉じる
                if (deltaY > 50 && deltaTime < 300) {
                    drawer.classList.remove('open');
                    backdrop.classList.remove('open');
                }
            });
        }
    }
    
    // ユーザー操作検出の設定
    setupUserInteractionDetection() {
        const interactionHandler = () => {
            this.userInteracted = true;
            
            // 操作要求メッセージがあれば削除
            const messageEl = document.getElementById('user-interaction-message');
            if (messageEl && messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        };
        
        // さまざまなユーザー操作イベントを検出
        document.addEventListener('click', interactionHandler, { once: true });
        document.addEventListener('keydown', interactionHandler, { once: true });
        document.addEventListener('touchstart', interactionHandler, { once: true });
    }
    
    // TextAlive API読み込み
    async loadTextAliveAPI() {
        try {
            // スクリプトをロード
            this.addLogEntry('TextAlive APIスクリプトを読み込み中...', 'system');
            
            // すでにロード済みかどうかをチェック
            if (typeof window.TextAliveApp === 'undefined') {
                const existingScript = document.querySelector('script[src*="textalive-app-api"]');
                if (!existingScript) {
                    console.log('TextAlive APIスクリプトをロードしています...');
                    const script = document.createElement('script');
                    script.src = "https://unpkg.com/textalive-app-api/dist/index.js";
                    script.async = true;
                    
                    // スクリプトロードを待つ
                    await new Promise((resolve, reject) => {
                        script.onload = () => {
                            console.log('TextAlive APIスクリプトのロード完了');
                            resolve();
                        };
                        script.onerror = (e) => {
                            console.error('TextAlive APIスクリプトのロード失敗:', e);
                            reject(new Error('TextAlive APIスクリプトのロードに失敗しました'));
                        };
                        // タイムアウト
                        setTimeout(() => reject(new Error('TextAlive APIスクリプトのロードがタイムアウトしました')), 10000);
                        document.head.appendChild(script);
                    });
                }
                
                // TextAliveAppが定義されるまで待機
                for (let i = 0; i < 50; i++) {
                    if (typeof window.TextAliveApp !== 'undefined') break;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            // TextAliveAppが定義されているかチェック
            if (typeof window.TextAliveApp === 'undefined') {
                console.error('TextAliveAppが見つかりません');
                throw new Error('TextAliveAppが見つかりません。');
            }
            
            console.log('TextAlive APIスクリプトのロードが完了しました');
            this.isTextAliveLoaded = true;
            
            // 初期化処理
            console.log('TextAlive API初期化開始');
            this.addLogEntry('TextAlive API初期化中...', 'system');
            
            // 正しいPlayerコンストラクタ取得
            const { Player } = window.TextAliveApp;
            console.log('Playerコンストラクタ取得:', Player);
            
            // Playerインスタンス作成
            this.player = new Player({
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
            
            // APIの参照を保存
            this.app = { player: this.player };
            
            // イベントリスナー設定
            this.player.addListener({
                onAppReady: this.handleAppReady.bind(this),
                onVideoReady: this.handleVideoReady.bind(this),
                onTimeUpdate: this.handleTimeUpdate.bind(this),
                onPlay: this.handlePlay.bind(this),
                onPause: this.handlePause.bind(this),
                onStop: this.handleStop.bind(this)
            });
            
            // 初期曲の設定
            const initialSong = songsData[this.selectedSongIndex];
            this.addLogEntry(`曲「${initialSong.title}」を読み込み中...`, 'system');
            
            await this.player.createFromSongUrl(initialSong.songUrl, {
                video: {
                    apiKey: initialSong.apiToken
                }
            });
            
            console.log('TextAlive API初期化成功');
        
        } catch (error) {
            console.error('TextAlive API初期化エラー:', error);
            this.addLogEntry(`TextAlive API初期化エラー: ${error.message}`, 'error');
            this.removeLoadingOverlay();
            
            // フォールバックモードをセットアップ
            this.setupFallbackMode();
        }
    }
    
    // フォールバックモードのセットアップ
    setupFallbackMode() {
        this.fallbackActive = true;
        this.addLogEntry("TextAlive API接続に失敗しました。フォールバックモードで実行します。", "error");
        this.addLogEntry("このモードでは、歌詞の正確なタイミングは提供されません。", "system");
        
        // フォールバック用の簡易的な歌詞データ
        this.fallbackLyrics = [
            { text: "マジカル", time: 1000 },
            { text: "ミライ", time: 3000 },
            { text: "初音", time: 5000 },
            { text: "ミク", time: 6000 },
            { text: "歌詞が", time: 8000 },
            { text: "流れて", time: 9500 },
            { text: "いく", time: 11000 }
        ];
        
        // フォールバックモード用タイマー
        this.fallbackLyricsIndex = 0;
        
        // APIフラグを有効化して送信ボタンを使えるようにする
        this.isReady = true;
        this.apiLoaded = true;
        
        // 選択された曲情報を表示
        const selectedSong = songsData[this.selectedSongIndex];
        this.addLogEntry(`フォールバックモード: ${selectedSong.title} - ${selectedSong.artist}`, 'info');
    }
    
    // TextAlive App準備完了ハンドラ
    handleAppReady(app) {
        console.log('TextAlive App準備完了:', app);
        this.addLogEntry('TextAlive App準備完了', 'system');
    }
    
    // TextAlive Video準備完了ハンドラ
    handleVideoReady(v) {
        console.log('楽曲準備完了:', v);
        if (this.player.data && this.player.data.song) {
            console.log('ライセンス情報:', this.player.data.song.license);
        }
        
        // プレーヤーとビデオの準備状態をログ
        console.log('Player状態:', this.player);
        
        // video と phrases の存在確認（APIによって異なる場合がある）
        if (this.player.video) {
            console.log('Video状態:', this.player.video);
            if (this.player.video.phrases) {
                console.log('Phrases状態:', this.player.video.phrases.length);
            } else {
                console.log('Phrasesが見つかりません（API構造を確認）');
            }
        } else if (this.player.data && this.player.data.video) {
            console.log('Data.video状態:', this.player.data.video);
        }
        
        // APIの主要な状態と使用可能なメソッドをログ出力（デバッグ用）
        console.log('利用可能なメソッド:');
        if (this.player.video) {
            console.log('- player.video.findPhrase:', typeof this.player.video.findPhrase === 'function');
            console.log('- player.video.findWord:', typeof this.player.video.findWord === 'function');
        }
        console.log('- player.findPhrase:', typeof this.player.findPhrase === 'function');
        
        // データ構造と利用可能なメソッドをさらに詳しくチェック
        if (this.player.data) {
            console.log('- player.data.findPhrase:', typeof this.player.data.findPhrase === 'function');
            if (this.player.data.song) {
                console.log('曲名:', this.player.data.song.name);
            }
        }
        
        this.isReady = true;
        if (this.player.data && this.player.data.song) {
            this.addLogEntry(`曲「${this.player.data.song.name}」の準備完了`, 'success');
        } else {
            this.addLogEntry('楽曲データの準備完了', 'success');
        }
        this.updateLyricCounter();
        
        // ロード画面を削除
        this.removeLoadingOverlay();
        
        // 歌詞データを取得
        let phrasesFound = false;
        if (this.player.video && this.player.video.phrases) {
            phrasesFound = true;
            this.addLogEntry(`歌詞データを読み込みました: ${this.player.video.phrases.length}フレーズ`, 'info');
        } else if (this.player.data && this.player.data.phrases) {
            phrasesFound = true;
            this.addLogEntry(`歌詞データを読み込みました: ${this.player.data.phrases.length}フレーズ`, 'info');
        }
        
        if (!phrasesFound) {
            this.addLogEntry('歌詞データが見つかりません。フォールバックモードを使用します。', 'warning');
            this.setupFallbackMode();
        }
    }
    
    // ロード画面を削除
    removeLoadingOverlay() {
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
            this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
        }
    }
    
    // 時間更新ハンドラ
    handleTimeUpdate(position) {
        // 現在の時間位置で表示すべき歌詞を取得
        if (!this.player) return;
        
        try {
            // APIの構造に応じて適切なメソッドを呼び出す
            let phrase = null;
            let word = null;
            
            // player.findPhrase が有効な場合
            if (typeof this.player.findPhrase === 'function') {
                phrase = this.player.findPhrase(position);
                
                // phraseが見つかり、player.video.findWord が有効な場合
                if (phrase && this.player.video && typeof this.player.video.findWord === 'function') {
                    word = this.player.video.findWord(position);
                }
                // phraseが自身でfindWordを持っている場合
                else if (phrase && typeof phrase.findWord === 'function') {
                    word = phrase.findWord(position);
                }
            } 
            // 代替の構造: player.video.findPhrase
            else if (this.player.video && typeof this.player.video.findPhrase === 'function') {
                phrase = this.player.video.findPhrase(position);
                
                if (phrase && typeof this.player.video.findWord === 'function') {
                    word = this.player.video.findWord(position);
                }
            }
            // 代替の構造: player.data.findPhrase
            else if (this.player.data && typeof this.player.data.findPhrase === 'function') {
                phrase = this.player.data.findPhrase(position);
                
                if (phrase && this.player.data && typeof this.player.data.findWord === 'function') {
                    word = this.player.data.findWord(position);
                }
            }
            
            if (!phrase) return;
            
            // 単語単位で歌詞を流す
            if (word && this.isRunning && word.startTime <= position && !word.processed) {
                // この単語をまだ処理していない場合、ネットワークに流す
                this.sendLyricWord(word);
                word.processed = true;
            }
        } catch (e) {
            console.error('時間更新ハンドラエラー:', e);
            
            // フォールバックモードに切り替え
            if (!this.fallbackActive) {
                this.addLogEntry('歌詞読み込みに問題が発生しました。フォールバックモードに切り替えます。', 'error');
                this.setupFallbackMode();
                
                // 既に再生中なら、フォールバックモードで再生を継続
                if (this.isRunning) {
                    this.initiateFallbackPlayback();
                }
            }
        }
    }
    
    // 再生開始ハンドラ
    handlePlay() {
        this.addLogEntry('再生開始', 'success');
        this.isRunning = true;
        this.updateSimulationStatus();
        this.playRequestPending = false;
        
        // 歌詞処理状態をリセット（API構造に応じた分岐処理）
        try {
            console.log('歌詞データリセット');
            
            // player.video.phrases が存在する場合
            if (this.player && this.player.video && this.player.video.phrases) {
                this.player.video.phrases.forEach(phrase => {
                    if (phrase && phrase.words) {
                        phrase.words.forEach(word => {
                            if (word) word.processed = false;
                        });
                    }
                });
            }
            // player.data.phrases が存在する場合
            else if (this.player && this.player.data && this.player.data.phrases) {
                this.player.data.phrases.forEach(phrase => {
                    if (phrase && phrase.words) {
                        phrase.words.forEach(word => {
                            if (word) word.processed = false;
                        });
                    }
                });
            }
        } catch (e) {
            console.error('歌詞データ処理エラー:', e);
            this.addLogEntry('歌詞データの処理中にエラーが発生しました', 'error');
            
            // フォールバックモードに切り替え
            if (!this.fallbackActive) {
                this.setupFallbackMode();
                this.initiateFallbackPlayback();
            }
        }
    }
    
    // 一時停止ハンドラ
    handlePause() {
        this.addLogEntry('再生一時停止', 'info');
        this.isRunning = false;
        this.playRequestPending = false;
        this.updateSimulationStatus();
    }
    
    // 停止ハンドラ
    handleStop() {
        this.addLogEntry('再生停止', 'info');
        this.isRunning = false;
        this.playRequestPending = false;
        this.clearLyrics();
        this.updateSimulationStatus();

        // 送信開始ボタンを有効化
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // 曲変更処理
    async changeSong(songIndex) {
        if (songIndex === this.selectedSongIndex || !this.player) return;
        
        // 現在の再生を停止
        this.stopSimulation();
        
        // すべてのリクエストが完了するのを待つ
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // ロード画面を表示
        document.body.appendChild(this.loadingOverlay);
        this.isReady = false;
        
        try {
            // 新しい曲を読み込む
            const selectedSong = songsData[songIndex];
            this.selectedSongIndex = songIndex;
            
            this.addLogEntry(`曲「${selectedSong.title}」を読み込み中...`, 'system');
            
            await this.player.createFromSongUrl(selectedSong.songUrl, {
                video: {
                    apiKey: selectedSong.apiToken
                }
            });
            
        } catch (error) {
            console.error('曲変更エラー:', error);
            this.addLogEntry(`曲変更エラー: ${error.message}`, 'error');
            this.removeLoadingOverlay();
        }
    }
    
    // リソース解放
    dispose() {
        window.removeEventListener('resize', this.resizeHandler);
        document.removeEventListener('keydown', this.keydownHandler);
        
        this.stopContinuousSending();
        
        // アニメーションフレームのキャンセル
        for (const [id, frameId] of this.animationFrames.entries()) {
            cancelAnimationFrame(frameId);
        }
        this.animationFrames.clear();
        
        // TextAlive Player解放
        if (this.player) {
            this.player.dispose();
        }
        
        // ログマネージャーの解放
        this.logManager.dispose();
        
        // UIクリア
        this.clearLyrics();
        
        // メモリリークを防ぐためにDOM参照をクリア
        this.nodes = {};
        this.connections = [];
        this.lyrics = [];
        this.activeElements.clear();
        
        // 鑑賞用歌詞のクリーンアップ
        if (this.viewerLyricsContainer) {
            this.viewerLyricsContainer.innerHTML = '';
        }
        this.displayedViewerLyrics.clear();
    }
    
    // 連続送信の停止
    stopContinuousSending() {
        this.isRunning = false;
        
        if (this.sendInterval) {
            clearInterval(this.sendInterval);
            this.sendInterval = null;
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        if (this.fallbackTimer) {
            clearInterval(this.fallbackTimer);
            this.fallbackTimer = null;
        }
    }
    
    // ウィンドウサイズ変更ハンドラー
    handleResize() {
        this.isMobile = window.innerWidth <= 768;
        this.calculateScaleFactor();
        this.renderNetwork();
        
        // モバイル/デスクトップ切り替え時にDOMを再構築
        if (this.isMobile) {
            this.setupTouchTargets();
        }
    }

    // タブコントロールのセットアップ
    setupTabControls() {
        // デスクトップタブ
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-tab');
                
                // タブボタンの状態更新
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // タブ内容表示切替
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

        // モバイルタブ
        const mobileTabButtons = document.querySelectorAll('.mobile-tab-button');
        mobileTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-tab');
                
                // タブボタンの状態更新
                mobileTabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // タブ内容表示切替
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

    // UIコンポーネントの初期化
    initUI() {
        this.calculateScaleFactor();
        
        // ログの初期メッセージ
        this.addLogEntry('ミク☆スターネットワーク歌詞シミュレーションを初期化しました。', 'system');
        this.addLogEntry('TextAlive APIを読み込み中です。', 'system');
        this.addLogEntry('「送信開始」ボタンをクリックして再生を開始します。', 'system');
        this.addLogEntry('「H」キーを押すとヘルプが表示されます。', 'system');
        
        // シミュレーションの状態表示を更新
        this.updateSimulationStatus();
        
        // 曲選択ドロップダウンを設定
        this.updateSongSelectionDropdown();
        
        // モバイルズームボタンのイベント設定
        this.setupMobileZoomButtons();
    }
    
    // モバイルズームボタンの設定
    setupMobileZoomButtons() {
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const network = document.getElementById('network');
        
        if (!zoomInBtn || !zoomOutBtn || !network) return;
        
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        
        // ズームイン
        zoomInBtn.addEventListener('click', () => {
            scale = Math.min(scale * 1.2, 3);
            applyTransform();
        });
        
        // ズームアウト
        zoomOutBtn.addEventListener('click', () => {
            scale = Math.max(scale / 1.2, 0.5);
            translateX = scale === 0.5 ? 0 : translateX;
            translateY = scale === 0.5 ? 0 : translateY;
            applyTransform();
        });
        
        // 変換適用
        function applyTransform() {
            const transformValue = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            network.style.transform = transformValue;
        }
    }
    
    // 曲選択ドロップダウンの更新
    updateSongSelectionDropdown() {
        const songSelect = document.getElementById('song-select');
        if (!songSelect) return;
        
        songSelect.innerHTML = '';
        
        // 曲データからオプションを生成
        songsData.forEach((song, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${song.title} - ${song.artist}`;
            songSelect.appendChild(option);
        });
        
        // 初期選択値を設定
        songSelect.value = this.selectedSongIndex;
        
        // モバイル用にフォントサイズ調整
        if (this.isMobile) {
            songSelect.classList.add('text-sm');
        }
    }
    
    // ノード位置の初期化 - 4端末・2ルーター構成
    initializeNodes() {
        // モバイル用に基本サイズを調整
        const baseScale = this.isMobile ? 1.0 : 1.2; 
        this.nodes = {
            // 端末ノード - 左側2台、右側2台の配置
            A: { x: 25 * baseScale, y: 50 * baseScale, type: 'terminal', label: 'A' },
            B: { x: 25 * baseScale, y: 450 * baseScale, type: 'terminal', label: 'B' },
            C: { x: 765 * baseScale, y: 50 * baseScale, type: 'terminal', label: 'C' },
            D: { x: 765 * baseScale, y: 450 * baseScale, type: 'terminal', label: 'D' },
            
            // ルータノード - 中央に2台配置
            X: { x: 250 * baseScale, y: 250 * baseScale, type: 'router', label: 'ルータX' },
            Y: { x: 540 * baseScale, y: 250 * baseScale, type: 'router', label: 'ルータY' }  
        };

        // 基準サイズも更新
        this.baseWidth = 800 * baseScale;
        this.baseHeight = 600 * baseScale;
    }
    
    // ノード間の接続を作成 - 4端末・2ルーター構成
    createConnections() {
        this.connections = [
            // 端末A,BとルータXの接続
            { from: 'A', to: 'X', fromPort: null, toPort: 1, portLabel: 1, id: 'A-X' },
            { from: 'B', to: 'X', fromPort: null, toPort: 2, portLabel: 2, id: 'B-X' },
            
            // 端末C,DとルータYの接続（ZをYに変更）
            { from: 'C', to: 'Y', fromPort: null, toPort: 3, portLabel: 3, id: 'C-Y' },
            { from: 'D', to: 'Y', fromPort: null, toPort: 4, portLabel: 4, id: 'D-Y' },
            
            // ルータX-Y間の接続（ZをYに変更）
            { from: 'X', to: 'Y', fromPort: 5, toPort: 5, portLabel: 5, id: 'X-Y' }
        ];
    }
    
    // ヘルプモーダルの設定
    setupHelpModal() {
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
            closeHelp.addEventListener('click', () => this.closeHelpModal(helpModal));
        }
        
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', () => this.closeHelpModal(helpModal));
        }
        
        // 背景クリックで閉じる
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                this.closeHelpModal(helpModal);
            }
        });
        
        // タッチイベント用
        helpModal.addEventListener('touchend', (e) => {
            if (e.target === helpModal) {
                this.closeHelpModal(helpModal);
            }
        });
    }
    
    // ヘルプモーダルを閉じる
    closeHelpModal(modal) {
        modal.classList.add('animate-fadeOut');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('animate-fadeOut');
        }, 300);
    }
    
    // キーボードショートカットの処理
    handleKeyboardShortcuts(e) {
        // Escキー
        if (e.key === 'Escape') {
            // モーダルが表示されている場合は閉じる
            const helpModal = document.getElementById('help-modal');
            if (helpModal && !helpModal.classList.contains('hidden')) {
                this.closeHelpModal(helpModal);
                return;
            }
            
            // モバイルドロワーが開いていれば閉じる
            const drawerEl = document.getElementById('sidebar-drawer');
            const backdropEl = document.getElementById('drawer-backdrop');
            if (drawerEl && drawerEl.classList.contains('open')) {
                drawerEl.classList.remove('open');
                if (backdropEl) backdropEl.classList.remove('open');
                return;
            }
            
            // シミュレーションが実行中なら停止
            if (this.isRunning) {
                this.stopSimulation();
            }
        }
        
        // Hキー: ヘルプ表示
        if (e.key === 'h' || e.key === 'H') {
            const helpModal = document.getElementById('help-modal');
            if (helpModal.classList.contains('hidden')) {
                helpModal.classList.remove('hidden');
                helpModal.classList.add('animate-fadeIn');
            } else {
                this.closeHelpModal(helpModal);
            }
        }
        
        // Sキー: シミュレーション開始/停止
        if (e.key === 's' || e.key === 'S') {
            if (this.isRunning) {
                this.stopSimulation();
            } else {
                this.startPlayback();
            }
        }
        
        // Fキー: 全画面表示
        if (e.key === 'f' || e.key === 'F') {
            this.toggleFullscreen();
        }
    }
    
    // シミュレーション停止処理
    async stopSimulation() {
        if (this.isCleaningUp) return;
        
        this.isCleaningUp = true;
        
        // TextAlive Player一時停止
        if (this.player && !this.fallbackActive) {
            try {
                console.log('再生停止リクエスト送信');
                
                // 再生リクエスト中に停止しないように状態チェック
                if (this.playRequestPending) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                this.player.requestPause();
                
                // 確実に停止するためのフォールバック
                setTimeout(() => {
                    if (this.player && this.player.isPlaying) {
                        console.log('遅延停止リクエスト送信');
                        this.player.requestStop();
                    }
                }, 500);
            } catch (e) {
                console.error('TextAlive Player一時停止エラー:', e);
            }
        }
        
        // フォールバック機能停止
        if (this.fallbackTimer) {
            clearInterval(this.fallbackTimer);
            this.fallbackTimer = null;
        }
        
        this.isRunning = false;
        this.playRequestPending = false;
        this.clearLyrics();
        this.activeElements.clear();
        this.renderNetwork();
        this.addLogEntry('再生を停止しました。', 'info');
        
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        
        this.updateSimulationStatus();
        
        this.isCleaningUp = false;
    }
    
    // 再生開始処理
    startPlayback() {
        if (!this.isReady) {
            this.addLogEntry('曲の準備ができていません。しばらくお待ちください。', 'error');
            return;
        }
        
        if (this.isRunning) {
            this.stopSimulation();
            return;
        }
        
        // ユーザー操作があったかチェック、なければ要求
        if (!this.userInteracted) {
            // まだユーザー操作メッセージが表示されていない場合
            if (!document.getElementById('user-interaction-message')) {
                const messageEl = document.createElement('div');
                messageEl.id = 'user-interaction-message';
                messageEl.className = 'fixed top-0 left-0 right-0 bg-pink-500 text-white p-2 text-center z-50';
                messageEl.innerHTML = 'ページ上のどこかをクリックして再生を開始してください';
                
                document.body.appendChild(messageEl);
                
                // 一度だけ実行のために一時的なイベントリスナーを追加
                const handleInteraction = () => {
                    this.userInteracted = true;
                    if (messageEl.parentNode) {
                        messageEl.parentNode.removeChild(messageEl);
                    }
                    
                    document.removeEventListener('click', handleInteraction);
                    document.removeEventListener('keydown', handleInteraction);
                    document.removeEventListener('touchstart', handleInteraction);
                    
                    // 少し遅延させてから再生開始
                    setTimeout(() => {
                        this.actuallyStartPlayback();
                    }, 100);
                };
                
                document.addEventListener('click', handleInteraction);
                document.addEventListener('keydown', handleInteraction);
                document.addEventListener('touchstart', handleInteraction);
                
                this.addLogEntry('再生を開始するには、ページ上で操作してください。', 'info');
                return;
            }
            return;
        }
        
        this.actuallyStartPlayback();
    }
    
    // 実際に再生を開始するメソッド
    async actuallyStartPlayback() {
        console.log('再生を開始します...');
        
        if (this.player && !this.fallbackActive) {
            try {
                // 再生開始中フラグを立てる
                this.playRequestPending = true;
                
                // デバッグ情報
                console.log("再生開始前の状態:");
                console.log("- userInteracted:", this.userInteracted);
                console.log("- player:", this.player);
                console.log("- isReady:", this.isReady);
                
                if (this.player.video) {
                    console.log("- video.phrases:", this.player.video.phrases ? this.player.video.phrases.length : "なし");
                }
                
                // 再生前に確実に停止状態にする
                if (this.player.isPlaying) {
                    await this.player.requestPause();
                    // 少し待機して状態が更新されるのを確認
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                // 再生開始
                await this.player.requestPlay();
                
                // 再生状態のフィードバック
                setTimeout(() => {
                    console.log("再生開始後のプレイヤー状態:", this.player.isPlaying);
                    
                    // 再生が開始されていない場合はフォールバックモードを検討
                    if (!this.player.isPlaying && !this.isRunning && !this.fallbackActive) {
                        console.log("TextAlive Playerでの再生に失敗しました。フォールバックモードへ切り替えます。");
                        this.setupFallbackMode();
                        this.initiateFallbackPlayback();
                    }
                }, 1000);
                
            } catch (error) {
                console.error('TextAlive Player再生エラー:', error);
                this.addLogEntry(`再生エラー: ${error.message}`, 'error');
                this.playRequestPending = false;
                
                // フォールバックモードに切り替え
                if (!this.fallbackActive) {
                    this.setupFallbackMode();
                    this.initiateFallbackPlayback();
                }
                return;
            }
        } else {
            // フォールバックモードでの再生
            this.initiateFallbackPlayback();
        }
        
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // フォールバックモードでの再生開始
    initiateFallbackPlayback() {
        console.log('フォールバックモードで再生を開始');
        this.isRunning = true;
        this.updateSimulationStatus();
        
        // 歌詞送信タイマーを開始
        this.fallbackLyricsIndex = 0;
        this.fallbackStartTime = Date.now();
        
        // 歌詞タイマーをクリア
        if (this.fallbackTimer) clearInterval(this.fallbackTimer);
        
        // 定期的に歌詞をチェックして送信
        this.fallbackTimer = setInterval(() => {
            if (!this.isRunning) return;
            
            const elapsed = Date.now() - this.fallbackStartTime;
            
            // 未送信の歌詞があればチェック
            while (this.fallbackLyricsIndex < this.fallbackLyrics.length) {
                const lyric = this.fallbackLyrics[this.fallbackLyricsIndex];
                
                if (lyric.time <= elapsed) {
                    // 歌詞を送信
                    this.sendFallbackLyric(lyric.text);
                    this.fallbackLyricsIndex++;
                } else {
                    break; // まだ時間が来ていない歌詞
                }
            }
            
            // すべての歌詞を送信し終えたら停止
            if (this.fallbackLyricsIndex >= this.fallbackLyrics.length) {
                // ループするために初期化
                this.fallbackLyricsIndex = 0;
                this.fallbackStartTime = Date.now();
            }
        }, 100);
    }
    
    // フォールバックモード用の歌詞送信
    sendFallbackLyric(text) {
        // 通常の歌詞送信と同じような処理
        this.lyricId++;
        const id = this.lyricId;
        
        // 送信元と送信先を取得
        const sourceSelect = document.getElementById('source');
        const destSelect = document.getElementById('destination');
        
        if (!sourceSelect || !destSelect) return;
        
        const source = sourceSelect.value;
        const destination = destSelect.value;
        
        const lyric = {
            id,
            source,
            destination,
            text: text,
            currentNode: source,
            nextNode: this.getNextHop(source, destination),
            status: 'created',
            createdAt: Date.now(),
            completed: false,
            hops: 0
        };
        
        // 次のホップが無効な場合はエラーを記録して送信しない
        if (!lyric.nextNode) {
            this.addLogEntry(`歌詞 #${id}: 無効なルート設定です。`, 'error');
            return;
        }
        
        this.lyrics.push(lyric);
        this.stats.lyricsCreated++;
        this.addLogEntry(`歌詞 #${id}: 「${lyric.text}」を 端末 ${source} から 端末 ${destination} へ送信します。`, 'info');
        this.updateLyricCounter();
        
        // 歌詞の移動を開始
        this.moveLyric(lyric);
        
        // 鑑賞用歌詞も表示
        this.displayViewerLyric(lyric.text);
    }
    
    // シミュレーション状態表示の更新
    updateSimulationStatus() {
        const statusEl = document.getElementById('simulation-status');
        if (!statusEl) return;
        
        if (this.isRunning) {
            statusEl.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-miku-500 bg-opacity-20 text-miku-300 shadow-sm transition-all duration-300';
            statusEl.innerHTML = '<span class="h-2.5 w-2.5 mr-1.5 rounded-full bg-miku-400 animate-pulse"></span>再生中';
        } else {
            statusEl.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-500 bg-opacity-20 text-pink-300 shadow-sm transition-all duration-300';
            statusEl.innerHTML = '<span class="h-2.5 w-2.5 mr-1.5 rounded-full bg-pink-400"></span>停止中';
        }
    }
    
    // スケール係数の計算
    calculateScaleFactor() {
        const networkEl = document.getElementById('network');
        if (!networkEl) return;
        
        const containerWidth = networkEl.clientWidth;
        const containerHeight = networkEl.clientHeight;
        
        if (containerWidth === 0 || containerHeight === 0) return;
        
        const scaleX = containerWidth / this.baseWidth;
        const scaleY = containerHeight / this.baseHeight;
        
        this.scaleFactor = Math.min(scaleX, scaleY, 1);
        
        // モバイルの場合は追加の縮小
        if (this.isMobile) {
            this.scaleFactor = Math.min(this.scaleFactor * 0.9, 0.8);
        }
        
        // ネットワークを中央に配置
        this.offsetX = (containerWidth - (this.baseWidth * this.scaleFactor)) / 2;
        this.offsetY = (containerHeight - (this.baseHeight * this.scaleFactor)) / 2;
    }
    
    // 位置のスケーリング
    scalePosition(x, y) {
        return {
            x: (x * this.scaleFactor) + this.offsetX,
            y: (y * this.scaleFactor) + this.offsetY
        };
    }
    
    // ネットワークの描画
    renderNetwork() {
        const networkEl = document.getElementById('network');
        if (!networkEl) return;
        
        // 既存の要素をクリア（ピンチズームコンテナは維持）
        const zoomArea = networkEl.querySelector('.zoom-area');
        const zoomIndicator = networkEl.querySelector('.zoom-indicator');
        networkEl.innerHTML = '';
        
        // ズーム関連要素を復元
        if (zoomArea && zoomIndicator) {
            networkEl.appendChild(zoomArea);
            networkEl.appendChild(zoomIndicator);
        }
        
        // まず接続を作成（ノードの下に表示するため）        
        for (const connection of this.connections) {
            const fromNode = this.nodes[connection.from];
            const toNode = this.nodes[connection.to];
            
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
            if (this.activeElements.has(connection.id)) {
                connectionEl.classList.add('active');
            }
            
            connectionEl.style.left = `${fromPos.x}px`;
            connectionEl.style.top = `${fromPos.y}px`;
            connectionEl.style.width = `${length}px`;
            connectionEl.style.transform = `rotate(${angle}rad)`;
            connectionEl.title = `接続: ${connection.from} → ${connection.to}`;
            
            // タッチエリアの拡大
            if (this.isMobile) {
                connectionEl.style.height = '6px';
            }
            
            networkEl.appendChild(connectionEl);
            
            // ポートラベルを表示
            if (connection.portLabel) {
                const midX = fromPos.x + dx / 2;
                const midY = fromPos.y + dy / 2;
                
                const portLabelEl = document.createElement('div');
                portLabelEl.classList.add('port-label');
                portLabelEl.dataset.id = `port-${connection.id}`;
                portLabelEl.dataset.port = connection.portLabel;
                if (this.activeElements.has(`port-${connection.id}`)) {
                    portLabelEl.classList.add('active');
                }
                
                portLabelEl.textContent = connection.portLabel;
                portLabelEl.style.left = `${midX}px`;
                portLabelEl.style.top = `${midY}px`;
                portLabelEl.title = `ポート ${connection.portLabel}: ${connection.from} → ${connection.to}`;
                
                // モバイル用にタッチエリア拡大
                if (this.isMobile) {
                    portLabelEl.style.width = '32px';
                    portLabelEl.style.height = '32px';
                }
                
                networkEl.appendChild(portLabelEl);
            }
        }
        
        // ノードを作成
        for (const [id, node] of Object.entries(this.nodes)) {
            const pos = this.scalePosition(node.x, node.y);
            
            const nodeEl = document.createElement('div');
            nodeEl.classList.add('node');
            nodeEl.dataset.id = id;
            
            if (this.activeElements.has(id)) {
                nodeEl.classList.add('active');
            }
            
            if (node.type === 'terminal') {
                nodeEl.classList.add('terminal');
                nodeEl.textContent = node.label;
                
                // 端末をクリック可能にして送信元/送信先を設定
                nodeEl.addEventListener('click', () => this.handleTerminalClick(id));
                nodeEl.title = `端末 ${id}`;
            } else if (node.type === 'router') {
                nodeEl.classList.add('router');
                
                const iconEl = document.createElement('div');
                iconEl.classList.add('router-icon');
                
                for (let i = 0; i < 4; i++) {
                    const square = document.createElement('div');
                    iconEl.appendChild(square);
                }
                
                const labelEl = document.createElement('div');
                labelEl.textContent = node.label;
                labelEl.classList.add('text-sm');
                
                nodeEl.appendChild(iconEl);
                nodeEl.appendChild(labelEl);
                nodeEl.title = `${node.label}`;
            }
            
            nodeEl.style.left = `${pos.x}px`;
            nodeEl.style.top = `${pos.y}px`;
            
            // ノードのホバー時の接続ハイライト
            nodeEl.addEventListener('mouseenter', () => this.highlightConnections(id));
            nodeEl.addEventListener('mouseleave', () => this.unhighlightConnections(id));
            
            // タッチデバイス用イベント
            nodeEl.addEventListener('touchstart', () => this.highlightConnections(id));
            nodeEl.addEventListener('touchend', () => this.unhighlightConnections(id));
            
            networkEl.appendChild(nodeEl);
        }
        
        // 鑑賞用歌詞コンテナの再追加
        if (this.viewerLyricsContainer && !this.viewerLyricsContainer.parentNode) {
            networkEl.appendChild(this.viewerLyricsContainer);
        }
        
        // モバイル用にタッチターゲットのセットアップ
        if (this.isMobile) {
            this.setupTouchTargets();
        }
    }
    
    // 端末クリック時の処理
    handleTerminalClick(id) {
        const sourceSelect = document.getElementById('source');
        const destSelect = document.getElementById('destination');
        
        if (!sourceSelect || !destSelect) return;
        
        // Shiftキーが押されていれば送信先に設定
        if (window.event && window.event.shiftKey) {
            destSelect.value = id;
        } else {
            // Shiftダブルタップでも送信先に設定（モバイル用）
            const now = new Date().getTime();
            if (this.lastTerminalTap && this.lastTerminalTap.id === id && now - this.lastTerminalTap.time < 500) {
                destSelect.value = id;
            } else {
                // それ以外は送信元に設定
                sourceSelect.value = id;
            }
            
            // タップ情報を保存
            this.lastTerminalTap = { id, time: now };
        }
        
        this.updateActiveTerminals();
    }
    
    // 接続のハイライト表示
    highlightConnections(nodeId) {
        for (const conn of this.connections) {
            if (conn.from === nodeId || conn.to === nodeId) {
                const connEl = document.querySelector(`.connection[data-id="${conn.id}"]`);
                if (connEl) connEl.classList.add('active');
                
                const portEl = document.querySelector(`.port-label[data-id="port-${conn.id}"]`);
                if (portEl) portEl.classList.add('active');
            }
        }
    }
    
    // 接続のハイライト解除
    unhighlightConnections(nodeId) {
        for (const conn of this.connections) {
            if ((conn.from === nodeId || conn.to === nodeId) && !this.activeElements.has(conn.id)) {
                const connEl = document.querySelector(`.connection[data-id="${conn.id}"]`);
                if (connEl) connEl.classList.remove('active');
                
                const portEl = document.querySelector(`.port-label[data-id="port-${conn.id}"]`);
                if (portEl && !this.activeElements.has(`port-${conn.id}`)) {
                    portEl.classList.remove('active');
                }
            }
        }
    }
    
    // ルーティングテーブルの描画 - 4端末構成に更新
    renderRoutingTable() {
        // デスクトップルーティングテーブルを更新
        this.updateRoutingTable('routing-table');
        
        // モバイルルーティングテーブルも更新
        this.updateRoutingTable('mobile-routing-table');
    }
    
    // ルーティングテーブルを更新 - 4端末構成
    updateRoutingTable(tableId) {
        const tableBody = document.querySelector(`#${tableId} tbody`);
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        const sections = [
            { title: 'ルータ X', routes: [
                { dest: '端末 A', port: '1' },
                { dest: '端末 B', port: '2' },
                { dest: '端末 C,D', port: '5' }
            ]},
            { title: 'ルータ Y', routes: [  // ZをYに変更
                { dest: '端末 C', port: '3' },
                { dest: '端末 D', port: '4' },
                { dest: '端末 A,B', port: '5' }
            ]}
        ];
        
        sections.forEach(section => {
            this.addRoutingTableSection(tableBody, section.title);
            section.routes.forEach(route => {
                this.addRoutingTableRow(tableBody, route.dest, route.port);
            });
        });
    }
    
    // ルーティングテーブルのセクション追加 
    addRoutingTableSection(tableBody, title) {
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
    
    // ルーティングテーブルの行追加
    addRoutingTableRow(tableBody, destination, port) {
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
    
    // 次のホップを取得 - 4端末構成
    getNextHop(currentNode, destination) {
        // 端末からルータへの直接接続
        if (currentNode === 'A' || currentNode === 'B') return 'X';
        if (currentNode === 'C' || currentNode === 'D') return 'Y';  // ZをYに変更

        // ルータXからの経路
        if (currentNode === 'X') {
            if (destination === 'A' || destination === 'B') return destination;
            return 'Y';  // ZをYに変更
        }

        // ルータYからの経路（ZをYに変更）
        if (currentNode === 'Y') {  // ZをYに変更
            if (destination === 'C' || destination === 'D') return destination;
            return 'X';
        }

        return null;
    }
    
    // イベントリスナーの設定
    setupEventListeners() {
        const sendBtn = document.getElementById('send-btn');
        const stopBtn = document.getElementById('stop-btn');
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const songSelect = document.getElementById('song-select');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.startPlayback();
            });
            
            // タッチ端末向け改善
            if (this.isMobile) {
                sendBtn.addEventListener('touchstart', () => {
                    sendBtn.classList.add('scale-95', 'opacity-90');
                });
                
                sendBtn.addEventListener('touchend', () => {
                    sendBtn.classList.remove('scale-95', 'opacity-90');
                });
            }
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                if (this.isRunning) {
                    this.stopSimulation();
                }
            });
            
            // タッチ端末向け改善
            if (this.isMobile) {
                stopBtn.addEventListener('touchstart', () => {
                    stopBtn.classList.add('scale-95', 'opacity-90');
                });
                
                stopBtn.addEventListener('touchend', () => {
                    stopBtn.classList.remove('scale-95', 'opacity-90');
                });
            }
        }
        
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
            
            // タッチ端末向け改善
            if (this.isMobile) {
                fullscreenBtn.addEventListener('touchstart', () => {
                    fullscreenBtn.classList.add('scale-95', 'opacity-90');
                });
                
                fullscreenBtn.addEventListener('touchend', () => {
                    fullscreenBtn.classList.remove('scale-95', 'opacity-90');
                });
            }
        }
        
        if (songSelect) {
            songSelect.addEventListener('change', () => {
                const selectedIndex = parseInt(songSelect.value);
                this.changeSong(selectedIndex);
            });
        }
        
        // 送信元と送信先の選択変更を処理
        const sourceSelect = document.getElementById('source');
        const destSelect = document.getElementById('destination');
        
        if (sourceSelect && destSelect) {
            // 選択肢を更新
            this.updateTerminalOptions(sourceSelect);
            this.updateTerminalOptions(destSelect);
            
            sourceSelect.addEventListener('change', () => {
                this.updateActiveTerminals();
            });
            
            destSelect.addEventListener('change', () => {
                this.updateActiveTerminals();
            });
        }
        
        // フルスクリーン変更イベントを処理
        document.addEventListener('fullscreenchange', () => {
            this.calculateScaleFactor();
            this.renderNetwork();
            this.updateFullscreenButton();
        });
        
        document.addEventListener('webkitfullscreenchange', () => {
            this.calculateScaleFactor();
            this.renderNetwork();
            this.updateFullscreenButton();
        });
    }
    
    // ドロップダウンの選択肢を更新
    updateTerminalOptions(selectElement) {
        if (!selectElement) return;
        
        // 既存の選択肢をクリア
        selectElement.innerHTML = '';
        
        // 端末ノードを選択肢として追加
        const terminalNodes = Object.entries(this.nodes)
            .filter(([_, node]) => node.type === 'terminal')
            .map(([id, _]) => id);
            
        terminalNodes.forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `端末 ${id}`;
            selectElement.appendChild(option);
        });
        
        // 初期選択値を設定
        if (terminalNodes.length > 0) {
            if (selectElement.id === 'source') {
                selectElement.value = terminalNodes[0]; // 最初の端末を送信元に
            } else if (selectElement.id === 'destination') {
                selectElement.value = terminalNodes.length > 1 ? terminalNodes[1] : terminalNodes[0]; // 2番目の端末を送信先に
            }
        }
    }
    
    // 選択された端末のハイライト更新
    updateActiveTerminals() {
        const sourceSelect = document.getElementById('source');
        const destSelect = document.getElementById('destination');
        
        if (!sourceSelect || !destSelect) return;
        
        const source = sourceSelect.value;
        const destination = destSelect.value;
        
        // ターミナルのハイライトをリセット
        document.querySelectorAll('.terminal').forEach(el => {
            el.classList.remove('active');
        });
        
        // 選択されたターミナルをハイライト
        const sourceEl = document.querySelector(`.terminal[data-id="${source}"]`);
        const destEl = document.querySelector(`.terminal[data-id="${destination}"]`);
        
        if (sourceEl) sourceEl.classList.add('active');
        if (destEl) destEl.classList.add('active');
    }
    
    // フルスクリーン表示の切り替え
    toggleFullscreen() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        if (!document.fullscreenElement &&
            !document.mozFullScreenElement &&
            !document.webkitFullscreenElement &&
            !document.msFullscreenElement) {
            // フルスクリーンに入る
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
            // フルスクリーンを終了
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
    
    // フルスクリーンボタンの更新
    updateFullscreenButton() {
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        
        if (!fullscreenBtn) return;
        
        if (document.fullscreenElement ||
            document.mozFullScreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement) {
            // フルスクリーンモード
            fullscreenBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                全画面解除
            `;
        } else {
            // 通常モード
            fullscreenBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
                </svg>
                全画面
            `;
        }
    }
    
    // 歌詞送信処理
    sendLyricWord(word) {
        if (!this.isRunning || !word) return;
        
        this.lyricId++;
        const id = this.lyricId;
        
        // 送信元と送信先を取得
        const sourceSelect = document.getElementById('source');
        const destSelect = document.getElementById('destination');
        
        if (!sourceSelect || !destSelect) return;
        
        const source = sourceSelect.value;
        const destination = destSelect.value;
        
        const lyric = {
            id,
            source,
            destination,
            text: word.text,
            currentNode: source,
            nextNode: this.getNextHop(source, destination),
            status: 'created',
            createdAt: Date.now(),
            completed: false,
            hops: 0
        };
        
        // 次のホップが無効な場合はエラーを記録して送信しない
        if (!lyric.nextNode) {
            this.addLogEntry(`歌詞 #${id}: 無効なルート設定です。`, 'error');
            return;
        }
        
        this.lyrics.push(lyric);
        this.stats.lyricsCreated++;
        this.addLogEntry(`歌詞 #${id}: 「${lyric.text}」を 端末 ${source} から 端末 ${destination} へ送信します。`, 'info');
        this.updateLyricCounter();
        
        // 歌詞の移動を開始
        this.moveLyric(lyric);
        
        // 鑑賞用歌詞も表示
        this.displayViewerLyric(lyric.text);
    }
    
    // ポート番号を取得
    getPortNumber(fromNode, toNode) {
        // 接続を検索
        for (const conn of this.connections) {
            if (conn.from === fromNode && conn.to === toNode) {
                return conn.fromPort;
            }
        }
        return null;
    }
    
    // 接続IDを取得
    getConnectionId(fromNode, toNode) {
        // 接続IDを検索
        for (const conn of this.connections) {
            if (conn.from === fromNode && conn.to === toNode) {
                return conn.id;
            }
        }
        return null;
    }
    
    // 歌詞の移動
    moveLyric(lyric) {
        if (!this.isRunning || lyric.completed) return;
        
        const fromNode = this.nodes[lyric.currentNode];
        const toNode = this.nodes[lyric.nextNode];
        
        if (!fromNode || !toNode) {
            this.addLogEntry(`歌詞 #${lyric.id}: 無効なルートです (${lyric.currentNode} -> ${lyric.nextNode})。`, 'error');
            lyric.completed = true;
            this.updateLyricCounter();
            return;
        }
        
        // ホップ数を増やす
        lyric.hops++;
        
        const portNumber = this.getPortNumber(lyric.currentNode, lyric.nextNode);
        const connectionId = this.getConnectionId(lyric.currentNode, lyric.nextNode);
        
        // アクティブな要素をハイライト表示に追加
        this.activeElements.add(lyric.currentNode);
        this.activeElements.add(lyric.nextNode);
        if (connectionId) {
            this.activeElements.add(connectionId);
            this.activeElements.add(`port-${connectionId}`);
        }
        
        // ネットワーク全体を再描画せずに接続を更新
        this.updateActiveConnections();
        
        if (lyric.currentNode !== lyric.source) {
            if (portNumber) {
                this.addLogEntry(`歌詞 #${lyric.id}: ルータ ${lyric.currentNode} が「${lyric.text}」を受信し、ポート ${portNumber} から転送します。`, 'info');
            } else {
                this.addLogEntry(`歌詞 #${lyric.id}: ルータ ${lyric.currentNode} が「${lyric.text}」を転送します。`, 'info');
            }
        }
        
        // ネットワーク要素の取得
        const networkEl = document.getElementById('network');
        if (!networkEl) {
            lyric.completed = true;
            return;
        }
        
        // 歌詞を視覚的に表示
        const lyricEl = document.createElement('div');
        lyricEl.classList.add('packet'); // パケットと同じスタイルを使用
        lyricEl.textContent = lyric.text;
        lyricEl.dataset.id = `lyric-${lyric.id}`;
        lyricEl.title = `歌詞 #${lyric.id}: 「${lyric.text}」 ${lyric.source} → ${lyric.destination}`;
        
        // 日本語の場合、スタイルを調整
        if (lyric.text.length > 5) {
            lyricEl.style.fontSize = '10px';
            lyricEl.style.width = 'auto';
            lyricEl.style.minWidth = '36px';
            lyricEl.style.padding = '0 8px';
        }
        
        // モバイル用に表示を最適化
        if (this.isMobile && lyric.text.length > 3) {
            lyricEl.style.fontSize = '9px';
            lyricEl.style.height = '20px';
            lyricEl.style.padding = '2px 6px';
        }
        
        const fromPos = this.scalePosition(fromNode.x, fromNode.y);
        lyricEl.style.left = `${fromPos.x}px`;
        lyricEl.style.top = `${fromPos.y}px`;
        
        networkEl.appendChild(lyricEl);
        
        // 歌詞移動アニメーションを開始
        this.animateLyric(lyric, lyricEl, fromNode, toNode);
    }
    
    // 歌詞のアニメーション
    animateLyric(lyric, lyricEl, fromNode, toNode) {
        if (!this.isRunning || lyric.completed) {
            try {
                if (lyricEl.parentNode) {
                    lyricEl.parentNode.removeChild(lyricEl);
                }
            } catch (e) {
                console.error('歌詞要素削除エラー:', e);
            }
            return;
        }
        
        const startTime = performance.now();
        const duration = 1000; // 1秒
        
        const animate = (currentTime) => {
            // シミュレーションが停止している場合はアニメーションを中止
            if (!this.isRunning || lyric.completed) {
                try {
                    if (lyricEl.parentNode) {
                        lyricEl.parentNode.removeChild(lyricEl);
                    }
                } catch (e) {
                    console.error('歌詞要素削除エラー:', e);
                }
                // アニメーション追跡から削除
                this.animationFrames.delete(lyric.id);
                return;
            }
            
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const fromPos = this.scalePosition(fromNode.x, fromNode.y);
            const toPos = this.scalePosition(toNode.x, toNode.y);
            
            const x = fromPos.x + (toPos.x - fromPos.x) * progress;
            const y = fromPos.y + (toPos.y - fromPos.y) * progress;
            
            try {
                lyricEl.style.left = `${x}px`;
                lyricEl.style.top = `${y}px`;
            } catch (e) {
                console.error('歌詞位置設定エラー:', e);
                this.animationFrames.delete(lyric.id);
                return;
            }
            
            if (progress < 1) {
                // アニメーション継続
                const frameId = requestAnimationFrame(animate);
                this.animationFrames.set(lyric.id, frameId);
            } else {
                // 歌詞が目標に到達
                try {
                    lyricEl.classList.add('animate-fadeOut');
                    setTimeout(() => {
                        try {
                            if (lyricEl.parentNode) {
                                lyricEl.parentNode.removeChild(lyricEl);
                            }
                        } catch (e) {
                            console.error('歌詞要素削除エラー:', e);
                        }
                    }, 300);
                } catch (e) {
                    console.error('歌詞アニメーション終了エラー:', e);
                }
                
                // アニメーション追跡から削除
                this.animationFrames.delete(lyric.id);
                
                // 歌詞処理を続行
                this.processLyricNextHop(lyric);
            }
        };
        
        // 初回アニメーションフレームを開始し追跡する
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.set(lyric.id, frameId);
    }
    
    // 歌詞の次ホップへの処理
    processLyricNextHop(lyric) {
        if (!this.isRunning || lyric.completed) return;
        
        // 歌詞の状態を更新
        lyric.currentNode = lyric.nextNode;
        
        if (lyric.currentNode === lyric.destination) {
            // 歌詞が最終目的地に到達
            this.stats.lyricsDelivered++;
            this.stats.totalHops += lyric.hops;
            
            // 平均ホップ数の計算
            const avgHops = this.stats.totalHops / this.stats.lyricsDelivered;
            
            this.addLogEntry(`歌詞 #${lyric.id}: 「${lyric.text}」が端末 ${lyric.destination} に到達しました。 (${lyric.hops}ホップ)`, 'success');
            lyric.completed = true;
            this.updateLyricCounter();
            
            // このパケットのアクティブ要素を削除（他のパケットが使用していない場合のみ）
            this.cleanupActiveConnections();
        } else {
            // 次のホップに進む
            const oldNext = lyric.nextNode;
            lyric.nextNode = this.getNextHop(lyric.currentNode, lyric.destination);
            
            // 次のホップが無効な場合は歌詞を完了としてマーク
            if (!lyric.nextNode) {
                this.addLogEntry(`歌詞 #${lyric.id}: 次ホップが見つかりません。歌詞は破棄されます。`, 'error');
                lyric.completed = true;
                this.updateLyricCounter();
                return;
            }
            
            // 他のパケットが使用していない場合、古い接続からアクティブ要素を削除
            const oldConnectionId = this.getConnectionId(lyric.currentNode, oldNext);
            if (oldConnectionId) {
                this.cleanupActiveElement(oldConnectionId);
                this.cleanupActiveElement(`port-${oldConnectionId}`);
            }
            
            // ネットワーク全体を再描画せずに接続を更新
            this.updateActiveConnections();
            
            // メインスレッドのブロックを防ぐためにsetTimeoutを使用して次のホップに進む
            setTimeout(() => {
                if (this.isRunning && !lyric.completed) {
                    this.moveLyric(lyric);
                }
            }, 100);
        }
    }
    
    // アクティブな接続の更新
    updateActiveConnections() {
        // ネットワーク全体を再描画せずに接続を更新
        for (const connection of this.connections) {
            const connEl = document.querySelector(`.connection[data-id="${connection.id}"]`);
            const portEl = document.querySelector(`.port-label[data-id="port-${connection.id}"]`);
            
            if (connEl) {
                if (this.activeElements.has(connection.id)) {
                    connEl.classList.add('active');
                } else {
                    connEl.classList.remove('active');
                }
            }
            
            if (portEl) {
                if (this.activeElements.has(`port-${connection.id}`)) {
                    portEl.classList.add('active');
                } else {
                    portEl.classList.remove('active');
                }
            }
        }
        
        // ノードの状態を更新
        for (const [id, node] of Object.entries(this.nodes)) {
            const nodeEl = document.querySelector(`.node[data-id="${id}"]`);
            if (nodeEl) {
                if (this.activeElements.has(id)) {
                    nodeEl.classList.add('active');
                } else {
                    nodeEl.classList.remove('active');
                }
            }
        }
    }
    
    // アクティブ接続のクリーンアップ
    cleanupActiveConnections() {
        // 要素IDごとの参照カウントを保持
        const referenceCount = new Map();
        
        // 全アクティブ要素の初期参照カウントを0に設定
        for (const element of this.activeElements) {
            referenceCount.set(element, 0);
        }
        
        // 各歌詞がどの要素を使用しているかカウント
        for (const lyric of this.lyrics) {
            if (!lyric.completed) {
                // 現在のノードと歌詞が使用する接続を追跡
                const currentConnectionId = this.getConnectionId(lyric.currentNode, lyric.nextNode);
                
                if (currentConnectionId) {
                    // 接続と関連要素の参照カウントを増やす
                    this.incrementReferenceCount(referenceCount, lyric.currentNode);
                    this.incrementReferenceCount(referenceCount, lyric.nextNode);
                    this.incrementReferenceCount(referenceCount, currentConnectionId);
                    this.incrementReferenceCount(referenceCount, `port-${currentConnectionId}`);
                }
            }
        }
        
        // 参照カウントが0の要素を削除
        for (const [element, count] of referenceCount.entries()) {
            if (count === 0) {
                this.activeElements.delete(element);
            }
        }
        
        // ネットワーク全体を再描画せずに接続を更新
        this.updateActiveConnections();
    }
    
    // 参照カウント増加ヘルパーメソッド
    incrementReferenceCount(countMap, key) {
        if (countMap.has(key)) {
            countMap.set(key, countMap.get(key) + 1);
        } else {
            countMap.set(key, 1);
        }
    }
    
    // 個別のアクティブ要素のクリーンアップ
    cleanupActiveElement(element) {
        let stillActive = false;
        
        // 歌詞がまだこの接続を使用しているか確認
        for (const lyric of this.lyrics) {
            if (!lyric.completed) {
                const currentConnectionId = this.getConnectionId(lyric.currentNode, lyric.nextNode);
                if (currentConnectionId === element || `port-${currentConnectionId}` === element) {
                    stillActive = true;
                    break;
                }
            }
        }
        
        if (!stillActive) {
            this.activeElements.delete(element);
        }
    }
    
    // すべての歌詞をクリア
    clearLyrics() {
        // アニメーションフレームをすべてキャンセル
        for (const [id, frameId] of this.animationFrames.entries()) {
            cancelAnimationFrame(frameId);
        }
        this.animationFrames.clear();
        
        this.lyrics = [];
        this.updateLyricCounter();
        
        // アクティブな要素をクリア
        this.activeElements.clear();
        this.updateActiveConnections();
        
        // すべての歌詞要素を削除
        const networkEl = document.getElementById('network');
        if (!networkEl) return;
        
        const lyricEls = networkEl.querySelectorAll('.packet');
        lyricEls.forEach(el => {
            try {
                el.classList.add('animate-fadeOut');
                setTimeout(() => {
                    try {
                        if (el.parentNode) {
                            el.parentNode.removeChild(el);
                        }
                    } catch (e) {
                        console.error('歌詞要素削除エラー:', e);
                    }
                }, 300);
            } catch (e) {
                console.error('歌詞削除アニメーションエラー:', e);
            }
        });
        
        // 鑑賞用歌詞もクリア
        if (this.viewerLyricsContainer) {
            this.viewerLyricsContainer.innerHTML = '';
        }
        this.displayedViewerLyrics.clear();
    }
    
    // 歌詞カウンターの更新
    updateLyricCounter() {
        const counter = document.getElementById('packet-counter');
        if (counter) {
            const activeCount = this.lyrics.filter(p => !p.completed).length;
            counter.innerHTML = `アクティブな歌詞: <span class="font-bold text-miku-300">${activeCount}</span>`;
        }
    }
    
    // 鑑賞用歌詞を表示
    displayViewerLyric(text) {
        // 既に表示されている場合は何もしない
        if (this.displayedViewerLyrics.has(text)) return;
        if (!this.viewerLyricsContainer) return;

        const viewerChar = document.createElement('span');
        viewerChar.className = 'viewer-lyric-char';
        viewerChar.textContent = text;
        
        // コンテナが空でない場合は1文字分のスペースを追加
        if (this.viewerLyricsContainer.children.length > 0) {
            this.viewerLyricsContainer.appendChild(document.createTextNode(' '));
        }
        
        this.viewerLyricsContainer.appendChild(viewerChar);

        // タイプライター効果のためのディレイ
        requestAnimationFrame(() => {
            viewerChar.classList.add('active');
        });

        // 歌詞要素を追跡
        this.displayedViewerLyrics.set(text, {
            element: viewerChar
        });

        // モバイル用にサイズ調整
        if (this.isMobile) {
            viewerChar.style.fontSize = '18px';
        }

        // フェードアウト効果を適用して削除（8秒から6秒に変更）
        setTimeout(() => {
            viewerChar.classList.add('fade-out');
            setTimeout(() => {
                if (viewerChar.parentNode) {
                    // 直前のスペースがあれば削除
                    const prev = viewerChar.previousSibling;
                    if (prev && prev.nodeType === Node.TEXT_NODE) {
                        prev.remove();
                    }
                    viewerChar.remove();
                }
                this.displayedViewerLyrics.delete(text);
            }, 500);
        }, 5000); // 5000に変更
    }
    
    // ログエントリーを追加
    addLogEntry(message, type = 'info') {
        // ログマネージャーに転送
        this.logManager.addEntry(message, type);
    }
}

// ログマネージャークラス - モバイル対応拡張
class LogManager {
    constructor(containerId = 'log-entries', mobileContainerId = 'mobile-log-entries') {
        this.container = document.getElementById(containerId);
        this.mobileContainer = document.getElementById(mobileContainerId);
        this.pendingEntries = [];
        this.maxEntries = 100;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 定期的なログ更新のみ残す
        this.updateInterval = setInterval(() => this.flushEntries(), 250);
    }

    addEntry(message, type = 'info') {
        this.pendingEntries.push({ message, type, timestamp: new Date() });
    }

    flushEntries() {
        if (!this.pendingEntries.length) return;
        if (!this.container && !this.mobileContainer) return;

        const fragment = document.createDocumentFragment();
        const mobileFragment = document.createDocumentFragment();

        this.pendingEntries.forEach(entry => {
            // デスクトップ用ログエントリー
            if (this.container) {
                const logEntry = this.createLogEntryElement(entry);
                fragment.appendChild(logEntry);
            }
            
            // モバイル用ログエントリー
            if (this.mobileContainer) {
                const mobileLogEntry = this.createLogEntryElement(entry);
                mobileFragment.appendChild(mobileLogEntry);
            }
        });

        // デスクトップログコンテナに追加
        if (this.container) {
            this.container.appendChild(fragment);
            this.limitLogEntries(this.container);
            this.scrollToBottom(this.container);
        }
        
        // モバイルログコンテナに追加
        if (this.mobileContainer) {
            this.mobileContainer.appendChild(mobileFragment);
            this.limitLogEntries(this.mobileContainer);
            this.scrollToBottom(this.mobileContainer);
        }

        this.pendingEntries = [];
    }

    createLogEntryElement(entry) {
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

    limitLogEntries(container) {
        while (container.children.length > this.maxEntries) {
            container.removeChild(container.firstChild);
        }
    }

    scrollToBottom(container) {
        const logContainer = container.parentElement;
        if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    dispose() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// DOMが完全に読み込まれたときにシミュレーションを初期化
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.simulation = new LyricsNetworkSimulation();
        
        // ページアンロード時のクリーンアップ
        window.addEventListener('beforeunload', () => {
            if (window.simulation) {
                window.simulation.dispose();
            }
        });
    } catch (e) {
        console.error('シミュレーションの初期化エラー:', e);
    }

    // サイドバー（ドロワー）閉じるボタンの設定
    const closeDrawerBtn = document.getElementById('close-drawer');
    const drawerEl = document.getElementById('sidebar-drawer');
    const backdropEl = document.getElementById('drawer-backdrop');
    const networkEl = document.getElementById('network');

    if (closeDrawerBtn && drawerEl && backdropEl) {
        // 閉じるボタンクリックでドロワーを閉じる
        closeDrawerBtn.addEventListener('click', () => {
            drawerEl.classList.remove('open');
            backdropEl.classList.remove('open');
        });
        
        // メインコンテンツ領域のクリックでもドロワーを閉じる
        if (networkEl) {
            networkEl.addEventListener('click', (e) => {
                // ピンチズームやパケットクリック処理の妨げにならないよう、
                // ドロワーが開いている場合のみ処理
                if (drawerEl.classList.contains('open')) {
                    drawerEl.classList.remove('open');
                    backdropEl.classList.remove('open');
                }
            });
        }
    }

    // スワイプでドロワーを閉じる機能の強化
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
            
            // 短い時間での下方向のスワイプでドロワーを閉じる
            // しきい値を小さくして操作性向上
            if (deltaY > 30 && deltaTime < 300) {
                drawerEl.classList.remove('open');
                backdropEl.classList.remove('open');
            }
        });
    }
});