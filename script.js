// 曲のデータ
const songsData = [
    { id: 1, title: "ストリートライト", artist: "加賀(ネギシャワーP)", apiToken: "HmfsoBVch26BmLCm", songUrl: "https://piapro.jp/t/ULcJ/20250205120202" },
    { id: 2, title: "アリフレーション", artist: "雨良 Amala", apiToken: "rdja5JxMEtcYmyKP", songUrl: "https://piapro.jp/t/SuQO/20250127235813" },
    { id: 3, title: "インフォーマルダイブ", artist: "99piano", apiToken: "CqbpJNJHwoGvXhlD", songUrl: "https://piapro.jp/t/Ppc9/20241224135843" },
    { id: 4, title: "ハロー、フェルミ。", artist: "ど～ぱみん", apiToken: "o1B1ZygOqyhK5B3D", songUrl: "https://piapro.jp/t/oTaJ/20250204234235" },
    { id: 5, title: "パレードレコード", artist: "きさら", apiToken: "G8MU8Wf87RotH8OR", songUrl: "https://piapro.jp/t/GCgy/20250202202635" },
    { id: 6, title: "ロンリーラン", artist: "海風太陽", apiToken: "fI0SyBEEBzlB2f5C", songUrl: "https://piapro.jp/t/CyPO/20250128183915" }
];

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
        // フィルターコントロールのイベントリスナー
        const filterSelect = document.getElementById('log-filter');
        const mobileFilterSelect = document.getElementById('mobile-log-filter');
        
        if (filterSelect) {
            filterSelect.addEventListener('change', () => this.applyFilter(filterSelect.value));
        }
        
        if (mobileFilterSelect) {
            mobileFilterSelect.addEventListener('change', () => this.applyFilter(mobileFilterSelect.value));
        }

        // クリアボタンのイベントリスナー
        const clearBtn = document.getElementById('clear-log');
        const mobileClearBtn = document.getElementById('mobile-clear-log');
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLogs());
        }
        
        if (mobileClearBtn) {
            mobileClearBtn.addEventListener('click', () => this.clearLogs());
        }

        // 定期的なログ更新
        this.updateInterval = setInterval(() => this.flushEntries(), 250);
    }

    // ログを追加
    addEntry(message, type = 'info') {
        this.pendingEntries.push({ message, type, timestamp: new Date() });
    }

    // 保留中のエントリーをDOMに反映
    flushEntries() {
        if (!this.pendingEntries.length) return;
        if (!this.container && !this.mobileContainer) return;

        const fragment = document.createDocumentFragment();
        const mobileFragment = document.createDocumentFragment();
        const currentFilter = document.getElementById('log-filter')?.value || 'all';
        const mobileFilter = document.getElementById('mobile-log-filter')?.value || 'all';

        this.pendingEntries.forEach(entry => {
            // デスクトップ用ログエントリー
            if (this.container) {
                const logEntry = this.createLogEntryElement(entry, currentFilter);
                fragment.appendChild(logEntry);
            }
            
            // モバイル用ログエントリー
            if (this.mobileContainer) {
                const mobileLogEntry = this.createLogEntryElement(entry, mobileFilter);
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
    
    // ログエントリーの要素を作成
    createLogEntryElement(entry, currentFilter) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${entry.type} flex items-start`;
        
        // フィルター適用
        if (currentFilter !== 'all' && entry.type !== currentFilter) {
            logEntry.classList.add('log-filtered');
        }

        // アイコンとメッセージを含む内部要素
        const iconSpan = document.createElement('span');
        iconSpan.className = `log-icon ${this.getIconClass(entry.type)}`;
        iconSpan.textContent = this.getIcon(entry.type);

        const messageDiv = document.createElement('div');
        messageDiv.className = 'log-message';
        messageDiv.textContent = entry.message;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-timestamp';
        timeSpan.textContent = entry.timestamp.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });

        logEntry.appendChild(iconSpan);
        logEntry.appendChild(messageDiv);
        logEntry.appendChild(timeSpan);
        
        return logEntry;
    }

    // ログエントリーの数を制限
    limitLogEntries(container) {
        while (container.children.length > this.maxEntries) {
            container.removeChild(container.firstChild);
        }
    }

    // 一番下にスクロール
    scrollToBottom(container) {
        const logContainer = container.parentElement;
        if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    // フィルターを適用
    applyFilter(filterType) {
        // デスクトップログにフィルター適用
        if (this.container) {
            const entries = this.container.querySelectorAll('.log-entry');
            this.applyFilterToEntries(entries, filterType);
        }
        
        // モバイルログにもフィルター適用
        if (this.mobileContainer) {
            const mobileEntries = this.mobileContainer.querySelectorAll('.log-entry');
            this.applyFilterToEntries(mobileEntries, filterType);
        }
    }
    
    // エントリー集合にフィルターを適用
    applyFilterToEntries(entries, filterType) {
        entries.forEach(entry => {
            if (filterType === 'all') {
                entry.classList.remove('log-filtered');
            } else {
                entry.classList.toggle('log-filtered', !entry.classList.contains(filterType));
            }
        });
    }

    // ログをクリア
    clearLogs() {
        // デスクトップログクリア
        if (this.container) {
            this.clearLogContainer(this.container);
        }
        
        // モバイルログクリア
        if (this.mobileContainer) {
            this.clearLogContainer(this.mobileContainer);
        }
    }
    
    // コンテナのログをクリア
    clearLogContainer(container) {
        const defaultMessage = document.createElement('div');
        defaultMessage.className = 'text-gray-400 italic p-2';
        defaultMessage.textContent = 'ログがクリアされました...';
        container.innerHTML = '';
        container.appendChild(defaultMessage);
    }

    // タイプに基づくアイコンを取得
    getIcon(type) {
        switch (type) {
            case 'error': return '✖';
            case 'success': return '✓';
            case 'system': return 'ℹ';
            default: return '●';
        }
    }

    // タイプに基づくアイコンクラスを取得
    getIconClass(type) {
        switch (type) {
            case 'error': return 'bg-red-100 text-red-500';
            case 'success': return 'bg-accent-100 text-accent-500';
            case 'system': return 'bg-gray-100 text-gray-500';
            default: return 'bg-primary-100 text-primary-500';
        }
    }

    // リソース解放
    dispose() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

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
        
        // TextAlive API関連
        this.player = null;              // TextAlive Player
        this.app = null;                 // TextAlive App
        this.isReady = false;            // 準備完了フラグ
        this.selectedSongIndex = 0;      // 選択された曲のインデックス
        this.isTextAliveLoaded = false;  // TextAlive API読み込み完了フラグ
        
        // ロード画面
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'fixed inset-0 flex items-center justify-center bg-space-900 bg-opacity-90 z-50';
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
    }
    
    // TextAlive API読み込み
    async loadTextAliveAPI() {
        // APIがロードされるまで待機する関数
        const waitForTextAliveAPI = () => {
            return new Promise((resolve, reject) => {
                // すでにロードされている場合
                if (window.TextAliveApp) {
                    resolve();
                    return;
                }
                
                // ロードされるのを待つ
                let checkCount = 0;
                const checkInterval = setInterval(() => {
                    if (window.TextAliveApp) {
                        clearInterval(checkInterval);
                        resolve();
                        return;
                    }
                    
                    // 30秒（150×200ms）経過してもロードされなければエラー
                    checkCount++;
                    if (checkCount > 150) {
                        clearInterval(checkInterval);
                        reject(new Error("TextAlive APIのロードがタイムアウトしました"));
                    }
                }, 200);
            });
        };

        try {
            // すでにロード済みならスキップ
            const existingScript = document.querySelector('script[src*="textalive-app-api"]');
            if (!existingScript) {
                // スクリプトをロード
                this.addLogEntry('TextAlive APIスクリプトを読み込み中...', 'system');
                const script = document.createElement('script');
                script.src = "https://unpkg.com/textalive-app-api/dist/index.js";
                script.async = true;
                document.head.appendChild(script);
            }
            
            // APIがロードされるまで待機
            await waitForTextAliveAPI();
            console.log('TextAlive APIスクリプトのロードが完了しました');
            this.isTextAliveLoaded = true;
            
            // 初期化処理
            console.log('TextAlive API初期化開始');
            this.addLogEntry('TextAlive API初期化中...', 'system');
            
            this.app = new window.TextAliveApp({
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
            
            // プレイヤー取得
            this.player = this.app.player;
            
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
            
            await this.app.createFromSongUrl(initialSong.songUrl, {
                video: {
                    apiKey: initialSong.apiToken
                }
            });
            
            console.log('TextAlive API初期化成功');
        
        } catch (error) {
            console.error('TextAlive API初期化エラー:', error);
            this.addLogEntry(`TextAlive API初期化エラー: ${error.message}`, 'error');
            this.removeLoadingOverlay();
        }
    }
    
    // TextAlive App準備完了ハンドラ
    handleAppReady(app) {
        console.log('TextAlive App準備完了:', app);
        this.addLogEntry('TextAlive App準備完了', 'system');
    }
    
    // TextAlive Video準備完了ハンドラ
    handleVideoReady(v) {
        console.log('楽曲準備完了:', v);
        console.log('ライセンス情報:', this.player.data.song.license);
        
        this.isReady = true;
        this.addLogEntry(`曲「${this.player.data.song.name}」の準備完了`, 'success');
        this.updateLyricCounter();
        
        // ロード画面を削除
        this.removeLoadingOverlay();
        
        // 歌詞データを取得
        if (this.player.video && this.player.video.firstPhrase) {
            this.addLogEntry(`歌詞データを読み込みました: ${this.player.video.phrases.length}フレーズ`, 'info');
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
        if (!this.player || !this.player.video) return;
        
        const phrase = this.player.findPhrase(position);
        if (!phrase) return;
        
        const word = this.player.video.findWord(position);
        
        // 単語単位で歌詞を流す
        if (word && this.isRunning && word.startTime <= position && !word.processed) {
            // この単語をまだ処理していない場合、ネットワークに流す
            this.sendLyricWord(word);
            word.processed = true;
        }
    }
    
    // 再生開始ハンドラ
    handlePlay() {
        this.addLogEntry('再生開始', 'success');
        this.isRunning = true;
        this.updateSimulationStatus();
        
        // 歌詞処理状態をリセット
        if (this.player && this.player.video) {
            this.player.video.phrases.forEach(phrase => {
                phrase.words.forEach(word => {
                    word.processed = false;
                });
            });
        }
    }
    
    // 一時停止ハンドラ
    handlePause() {
        this.addLogEntry('再生一時停止', 'info');
        this.isRunning = false;
        this.updateSimulationStatus();
    }
    
    // 停止ハンドラ
    handleStop() {
        this.addLogEntry('再生停止', 'info');
        this.isRunning = false;
        this.clearLyrics();
        this.updateSimulationStatus();
    }
    
    // 曲変更処理
    async changeSong(songIndex) {
        if (songIndex === this.selectedSongIndex || !this.app || !this.player) return;
        
        // 現在の再生を停止
        this.player.pause();
        this.isRunning = false;
        this.clearLyrics();
        
        // ロード画面を表示
        document.body.appendChild(this.loadingOverlay);
        this.isReady = false;
        
        try {
            // 新しい曲を読み込む
            const selectedSong = songsData[songIndex];
            this.selectedSongIndex = songIndex;
            
            this.addLogEntry(`曲「${selectedSong.title}」を読み込み中...`, 'system');
            
            await this.app.createFromSongUrl(selectedSong.songUrl, {
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
    }
    
    // ウィンドウサイズ変更ハンドラー
    handleResize() {
        this.calculateScaleFactor();
        this.renderNetwork();
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
                const tabContents = document.querySelectorAll('#sidebar-drawer .tab-content');
                tabContents.forEach(content => {
                    if (content.id === targetId) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            });
        });
        
        // モバイルドロワー
        const toggleDrawerBtn = document.getElementById('toggle-drawer');
        const drawerEl = document.getElementById('sidebar-drawer');
        const backdropEl = document.getElementById('drawer-backdrop');
        
        if (toggleDrawerBtn && drawerEl) {
            toggleDrawerBtn.addEventListener('click', () => {
                drawerEl.classList.toggle('open');
                if (backdropEl) backdropEl.classList.toggle('open');
            });
        }
        
        if (backdropEl) {
            backdropEl.addEventListener('click', () => {
                if (drawerEl) drawerEl.classList.remove('open');
                backdropEl.classList.remove('open');
            });
        }
        
        const drawerHandle = document.querySelector('.drawer-handle');
        if (drawerHandle && drawerEl) {
            drawerHandle.addEventListener('click', () => {
                drawerEl.classList.toggle('open');
                if (backdropEl) backdropEl.classList.toggle('open');
            });
        }
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
    }
    
    // ノード位置の初期化
    initializeNodes() {
        const baseScale = 1.2; // スケールを20%増加
        this.nodes = {
            // 端末ノード
            A: { x: 80 * baseScale, y: 150 * baseScale, type: 'terminal', label: 'A' },
            B: { x: 80 * baseScale, y: 350 * baseScale, type: 'terminal', label: 'B' },
            C: { x: 80 * baseScale, y: 520 * baseScale, type: 'terminal', label: 'C' },
            D: { x: 700 * baseScale, y: 150 * baseScale, type: 'terminal', label: 'D' },
            E: { x: 700 * baseScale, y: 450 * baseScale, type: 'terminal', label: 'E' },
            
            // ルータノード
            X: { x: 300 * baseScale, y: 180 * baseScale, type: 'router', label: 'ルータ X' },
            Y: { x: 300 * baseScale, y: 420 * baseScale, type: 'router', label: 'ルータ Y' },
            Z: { x: 550 * baseScale, y: 300 * baseScale, type: 'router', label: 'ルータ Z' }
        };

        // 基準サイズも更新
        this.baseWidth = 800 * baseScale;
        this.baseHeight = 700 * baseScale;
    }
    
    // ノード間の接続を作成
    createConnections() {
        this.connections = [
            // 端末AとルータXの接続
            { from: 'A', to: 'X', fromPort: null, toPort: 1, portLabel: 1, id: 'A-X' },
            
            // 端末BとルータXの接続
            { from: 'B', to: 'X', fromPort: null, toPort: 2, portLabel: 2, id: 'B-X' },
            
            // 端末CとルータYの接続
            { from: 'C', to: 'Y', fromPort: null, toPort: 3, portLabel: 3, id: 'C-Y' },
            
            // 端末DとルータZの接続
            { from: 'D', to: 'Z', fromPort: null, toPort: 7, portLabel: 7, id: 'D-Z' },
            
            // 端末EとルータZの接続
            { from: 'E', to: 'Z', fromPort: null, toPort: 8, portLabel: 8, id: 'E-Z' },
            
            // ルータXとルータZの接続
            { from: 'X', to: 'Z', fromPort: 6, toPort: 6, portLabel: 6, id: 'X-Z' },
            
            // ルータYとルータZの接続
            { from: 'Y', to: 'Z', fromPort: 5, toPort: 5, portLabel: 5, id: 'Y-Z' },
            
            // ルータXとルータYの接続
            { from: 'X', to: 'Y', fromPort: 4, toPort: 4, portLabel: 4, id: 'X-Y' }
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
    stopSimulation() {
        if (this.isCleaningUp) return;
        
        this.isCleaningUp = true;
        
        // TextAlive Player一時停止
        if (this.player) {
            this.player.pause();
        }
        
        this.isRunning = false;
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
        if (!this.isReady || !this.player) {
            this.addLogEntry('曲の準備ができていません。しばらくお待ちください。', 'error');
            return;
        }
        
        if (this.isRunning) {
            this.stopSimulation();
            return;
        }
        
        // TextAlive Player再生
        this.player.play();
        
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
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
        
        // 既存の要素をクリア
        networkEl.innerHTML = '';
        
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
            
            networkEl.appendChild(nodeEl);
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
            // それ以外は送信元に設定
            sourceSelect.value = id;
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
    
    // ルーティングテーブルの描画
    renderRoutingTable() {
        // デスクトップルーティングテーブルを更新
        this.updateRoutingTable('routing-table');
        
        // モバイルルーティングテーブルも更新
        this.updateRoutingTable('mobile-routing-table');
    }
    
    // ルーティングテーブルを更新
    updateRoutingTable(tableId) {
        const tableBody = document.querySelector(`#${tableId} tbody`);
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        const sections = [
            { title: 'ルータ X', routes: [
                { dest: '端末 A', port: '1' },
                { dest: '端末 B', port: '2' },
                { dest: '端末 C', port: '4' },
                { dest: '端末 D,E', port: '6' }
            ]},
            { title: 'ルータ Y', routes: [
                { dest: '端末 C', port: '3' },
                { dest: '端末 A,B', port: '4' },
                { dest: '端末 D,E', port: '5' }
            ]},
            { title: 'ルータ Z', routes: [
                { dest: '端末 D', port: '7' },
                { dest: '端末 E', port: '8' },
                { dest: '端末 A,B', port: '6' },
                { dest: '端末 C', port: '5' }
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
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                if (this.isRunning) {
                    this.stopSimulation();
                }
            });
        }
        
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
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
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                全画面解除
            `;
        } else {
            // 通常モード
            fullscreenBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    }
    
    // 次のホップを取得
    getNextHop(currentNode, destination) {
        // 端末からルータへの直接接続
        if (currentNode === 'A' || currentNode === 'B') return 'X';
        if (currentNode === 'C') return 'Y';
        if (currentNode === 'D' || currentNode === 'E') return 'Z';

        // ルータXからの経路
        if (currentNode === 'X') {
            if (destination === 'A' || destination === 'B') return destination;
            if (destination === 'C') return 'Y';
            return 'Z'; // D,E宛て
        }

        // ルータYからの経路
        if (currentNode === 'Y') {
            if (destination === 'C') return destination;
            return 'Z'; // その他宛て
        }

        // ルータZからの経路
        if (currentNode === 'Z') {
            if (destination === 'D' || destination === 'E') return destination;
            if (destination === 'C') return 'Y';
            return 'X'; // A,B宛て
        }

        return null;
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
    }
    
    // 歌詞カウンターの更新
    updateLyricCounter() {
        const counter = document.getElementById('packet-counter');
        if (counter) {
            const activeCount = this.lyrics.filter(p => !p.completed).length;
            counter.innerHTML = `アクティブな歌詞: <span class="font-bold text-miku-300">${activeCount}</span>`;
        }
    }
    
    // ログエントリーを追加
    addLogEntry(message, type = 'info') {
        // ログマネージャーに転送
        this.logManager.addEntry(message, type);
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
});