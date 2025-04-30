// ログマネージャークラス
class LogManager {
    constructor(containerId = 'log-entries') {
        this.container = document.getElementById(containerId);
        this.pendingEntries = [];
        this.maxEntries = 100;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // フィルターコントロールのイベントリスナー
        const filterSelect = document.getElementById('log-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => this.applyFilter(filterSelect.value));
        }

        // クリアボタンのイベントリスナー
        const clearBtn = document.getElementById('clear-log');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLogs());
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
        if (!this.pendingEntries.length || !this.container) return;

        const fragment = document.createDocumentFragment();
        const currentFilter = document.getElementById('log-filter')?.value || 'all';

        this.pendingEntries.forEach(entry => {
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
            fragment.appendChild(logEntry);
        });

        this.container.appendChild(fragment);
        this.limitLogEntries();
        this.scrollToBottom();
        this.pendingEntries = [];
    }

    // ログエントリーの数を制限
    limitLogEntries() {
        while (this.container.children.length > this.maxEntries) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    // 一番下にスクロール
    scrollToBottom() {
        const logContainer = this.container.parentElement;
        if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    // フィルターを適用
    applyFilter(filterType) {
        const entries = this.container.querySelectorAll('.log-entry');
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
        if (this.container) {
            const defaultMessage = document.createElement('div');
            defaultMessage.className = 'text-gray-400 italic p-2';
            defaultMessage.textContent = 'ログがクリアされました...';
            this.container.innerHTML = '';
            this.container.appendChild(defaultMessage);
        }
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

// ネットワークトポロジーとルーティングシミュレーション
class NetworkSimulation {
    constructor() {
        // 基本設定
        this.nodes = {};                 // ノード情報を格納
        this.connections = [];           // ノード間の接続情報
        this.packets = [];               // パケット情報
        this.packetId = 0;               // パケットID（自動増加）
        this.isRunning = false;          // シミュレーション実行中かどうか
        this.isCleaningUp = false;       // クリーンアップ処理中フラグ
        this.sendInterval = null;        // 定期送信用インターバル
        this.sendRate = 1000;            // 送信間隔（ミリ秒）
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
            packetsCreated: 0,
            packetsDelivered: 0,
            totalHops: 0
        };
        
        // ログマネージャーの初期化
        this.logManager = new LogManager('log-entries');
        
        // データ初期化
        this.initializeNodes();
        this.createConnections();
        
        // UI初期化
        this.initUI();
        this.setupEventListeners();
        this.renderNetwork();
        this.renderRoutingTable();
        this.updatePacketCounter();
        this.updateActiveTerminals();
        
        // ウィンドウサイズ変更時の処理
        this.resizeHandler = this.handleResize.bind(this);
        window.addEventListener('resize', this.resizeHandler);
        
        // キーボードショートカット
        this.keydownHandler = this.handleKeyboardShortcuts.bind(this);
        document.addEventListener('keydown', this.keydownHandler);
        
        // ヘルプモーダル
        this.setupHelpModal();

        // サイドバーコントロール
        this.setupSidebarControls();
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
        
        // ログマネージャーの解放
        this.logManager.dispose();
        
        // UIクリア
        this.clearPackets();
        
        // メモリリークを防ぐためにDOM参照をクリア
        this.nodes = {};
        this.connections = [];
        this.packets = [];
        this.activeElements.clear();
    }
    
    // ウィンドウサイズ変更ハンドラー
    handleResize() {
        this.calculateScaleFactor();
        this.renderNetwork();
        
        // モバイルビューでのサイドバー状態リセット
        if (window.innerWidth >= 768) {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.querySelector('.sidebar-backdrop');
            if (sidebar) sidebar.classList.remove('collapsed');
            if (backdrop) backdrop.classList.remove('active');
        }
    }

    setupSidebarControls() {
        const collapseBtn = document.getElementById('collapse-sidebar');
        const sidebar = document.getElementById('sidebar');
        
        if (collapseBtn && sidebar) {
            collapseBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                
                // モバイル用バックドロップの追加
                if (window.innerWidth < 768) {
                    let backdrop = document.querySelector('.sidebar-backdrop');
                    if (!backdrop) {
                        backdrop = document.createElement('div');
                        backdrop.className = 'sidebar-backdrop';
                        document.body.appendChild(backdrop);
                    }
                    backdrop.classList.toggle('active');
                    
                    // バックドロップクリックでサイドバーを閉じる
                    backdrop.addEventListener('click', () => {
                        sidebar.classList.add('collapsed');
                        backdrop.classList.remove('active');
                    });
                }
            });
        }
        
        // ウィンドウリサイズ時のレイアウト調整
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    // UIコンポーネントの初期化
    initUI() {
        this.calculateScaleFactor();
        
        // ログの初期メッセージ
        this.addLogEntry('ネットワークルーティングシミュレーションを初期化しました。', 'system');
        this.addLogEntry('「送信開始」ボタンをクリックしてシミュレーションを開始します。', 'system');
        this.addLogEntry('「H」キーを押すとヘルプが表示されます。', 'system');
        
        // パケットレートの初期値を設定
        const packetRateSelect = document.getElementById('packet-rate');
        if (packetRateSelect) {
            this.sendRate = parseInt(packetRateSelect.value);
        }
        
        // シミュレーションの状態表示を更新
        this.updateSimulationStatus();
    }
    
    // ノード位置の初期化
    initializeNodes() {
        const baseScale = 1.2; // スケールを20%増加
        this.nodes = {
            // 左側の端末グループ
            A: { x: 80 * baseScale, y: 150 * baseScale, type: 'terminal', label: 'A' },
            B: { x: 80 * baseScale, y: 350 * baseScale, type: 'terminal', label: 'B' },
            
            // 上部の端末グループ
            C: { x: 300 * baseScale, y: 80 * baseScale, type: 'terminal', label: 'C' },
            D: { x: 500 * baseScale, y: 80 * baseScale, type: 'terminal', label: 'D' },
            
            // 右側の端末グループ
            E: { x: 720 * baseScale, y: 150 * baseScale, type: 'terminal', label: 'E' },
            F: { x: 720 * baseScale, y: 350 * baseScale, type: 'terminal', label: 'F' },
            
            // 下部の端末グループ
            G: { x: 300 * baseScale, y: 520 * baseScale, type: 'terminal', label: 'G' },
            H: { x: 500 * baseScale, y: 520 * baseScale, type: 'terminal', label: 'H' },
            
            // ルータ（菱形配置）
            W: { x: 250 * baseScale, y: 250 * baseScale, type: 'router', label: 'ルータ W' },
            X: { x: 400 * baseScale, y: 180 * baseScale, type: 'router', label: 'ルータ X' },
            Y: { x: 400 * baseScale, y: 420 * baseScale, type: 'router', label: 'ルータ Y' },
            Z: { x: 550 * baseScale, y: 250 * baseScale, type: 'router', label: 'ルータ Z' }
        };

        // 基準サイズも更新
        this.baseWidth = 800 * baseScale;
        this.baseHeight = 700 * baseScale;
    }
    
    // ノード間の接続を作成
    createConnections() {
        this.connections = [
            // 左側端末とルータWの接続
            { from: 'A', to: 'W', fromPort: null, toPort: 1, portLabel: 1, id: 'A-W' },
            { from: 'B', to: 'W', fromPort: null, toPort: 2, portLabel: 2, id: 'B-W' },
            
            // 上部端末とルータXの接続
            { from: 'C', to: 'X', fromPort: null, toPort: 3, portLabel: 3, id: 'C-X' },
            { from: 'D', to: 'X', fromPort: null, toPort: 4, portLabel: 4, id: 'D-X' },
            
            // 右側端末とルータZの接続
            { from: 'E', to: 'Z', fromPort: null, toPort: 5, portLabel: 5, id: 'E-Z' },
            { from: 'F', to: 'Z', fromPort: null, toPort: 6, portLabel: 6, id: 'F-Z' },
            
            // 下部端末とルータYの接続
            { from: 'G', to: 'Y', fromPort: null, toPort: 7, portLabel: 7, id: 'G-Y' },
            { from: 'H', to: 'Y', fromPort: null, toPort: 8, portLabel: 8, id: 'H-Y' },
            
            // ルータ間の接続（菱形状）
            { from: 'W', to: 'X', fromPort: 9, toPort: 9, portLabel: 9, id: 'W-X' },
            { from: 'X', to: 'Z', fromPort: 10, toPort: 10, portLabel: 10, id: 'X-Z' },
            { from: 'Z', to: 'Y', fromPort: 11, toPort: 11, portLabel: 11, id: 'Z-Y' },
            { from: 'Y', to: 'W', fromPort: 12, toPort: 12, portLabel: 12, id: 'Y-W' }
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
                const source = document.getElementById('source').value;
                const destination = document.getElementById('destination').value;
                
                if (source === destination) {
                    this.addLogEntry('同一端末に送信することはできません。', 'error');
                    return;
                }
                
                this.startContinuousSending(source, destination);
                
                const sendBtn = document.getElementById('send-btn');
                if (sendBtn) {
                    sendBtn.disabled = true;
                    sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
                this.updateSimulationStatus();
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
        
        this.stopContinuousSending();
        this.clearPackets();
        this.activeElements.clear();
        this.renderNetwork();
        this.addLogEntry('シミュレーションを停止しました。', 'info');
        
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        
        this.updateSimulationStatus();
        
        this.isCleaningUp = false;
    }
    
    // シミュレーション状態表示の更新
    updateSimulationStatus() {
        const statusEl = document.getElementById('simulation-status');
        if (!statusEl) return;
        
        if (this.isRunning) {
            statusEl.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent-100 text-accent-800 shadow-sm transition-all duration-300';
            statusEl.innerHTML = '<span class="h-2.5 w-2.5 mr-1.5 rounded-full bg-accent-500 animate-pulse"></span>実行中';
        } else {
            statusEl.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 shadow-sm transition-all duration-300';
            statusEl.innerHTML = '<span class="h-2.5 w-2.5 mr-1.5 rounded-full bg-red-400"></span>停止中';
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
        const tableBody = document.querySelector('#routing-table tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        const sections = [
            { title: 'ルータ W', routes: [
                { dest: '端末 A', port: '1' },
                { dest: '端末 B', port: '2' },
                { dest: '端末 C,D', port: '9' },
                { dest: '端末 E,F', port: '9' },
                { dest: '端末 G,H', port: '12' }
            ]},
            { title: 'ルータ X', routes: [
                { dest: '端末 C', port: '3' },
                { dest: '端末 D', port: '4' },
                { dest: '端末 A,B', port: '9' },
                { dest: '端末 E,F', port: '10' },
                { dest: '端末 G,H', port: '10' }
            ]},
            { title: 'ルータ Y', routes: [
                { dest: '端末 G', port: '7' },
                { dest: '端末 H', port: '8' },
                { dest: '端末 A,B', port: '12' },
                { dest: '端末 C,D', port: '12' },
                { dest: '端末 E,F', port: '11' }
            ]},
            { title: 'ルータ Z', routes: [
                { dest: '端末 E', port: '5' },
                { dest: '端末 F', port: '6' },
                { dest: '端末 A,B', port: '10' },
                { dest: '端末 C,D', port: '10' },
                { dest: '端末 G,H', port: '11' }
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
        row.classList.add('bg-gray-50');
        const cell = document.createElement('td');
        cell.setAttribute('colspan', '2');
        cell.classList.add('px-4', 'py-2.5', 'font-medium', 'text-primary-700', 'text-center', 'border-t', 'border-b', 'border-gray-200');
        cell.textContent = title;
        row.appendChild(cell);
        tableBody.appendChild(row);
    }
    
    // ルーティングテーブルの行追加
    addRoutingTableRow(tableBody, destination, port) {
        if (!tableBody) return;
        
        const row = document.createElement('tr');
        row.classList.add('hover:bg-gray-50', 'transition-colors');
        
        const destCell = document.createElement('td');
        destCell.classList.add('px-4', 'py-2.5', 'border-b', 'border-gray-200', 'text-sm');
        destCell.textContent = destination;
        
        const portCell = document.createElement('td');
        portCell.classList.add('px-4', 'py-2.5', 'border-b', 'border-gray-200', 'text-sm', 'font-medium', 'text-primary-600');
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
        const packetRateSelect = document.getElementById('packet-rate');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                const source = document.getElementById('source').value;
                const destination = document.getElementById('destination').value;
                
                if (source === destination) {
                    this.addLogEntry('同一端末に送信することはできません。', 'error');
                    return;
                }
                
                // 連続送信を開始
                this.startContinuousSending(source, destination);
                
                // ボタン状態を更新
                sendBtn.disabled = true;
                sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
                
                // シミュレーション状態を更新
                this.updateSimulationStatus();
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
        
        if (packetRateSelect) {
            packetRateSelect.addEventListener('change', () => {
                this.sendRate = parseInt(packetRateSelect.value);
                if (this.isRunning) {
                    // 新しいレートで再開
                    const source = this.currentSource;
                    const destination = this.currentDestination;
                    this.stopContinuousSending();
                    this.startContinuousSending(source, destination);
                    this.addLogEntry(`送信間隔を ${this.sendRate}ミリ秒に変更しました。`, 'info');
                }
            });
        }
        
        // 送信元と送信先の選択変更を処理
        const sourceSelect = document.getElementById('source');
        const destSelect = document.getElementById('destination');
        
        if (sourceSelect && destSelect) {
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
    
    // 連続送信の開始
    startContinuousSending(source, destination) {
        if (this.isRunning) {
            this.stopContinuousSending();
        }
        
        this.isRunning = true;
        this.currentSource = source;
        this.currentDestination = destination;
        
        // 統計情報をリセット
        this.stats.packetsCreated = 0;
        this.stats.packetsDelivered = 0;
        this.stats.totalHops = 0;
        
        // 最初のパケットをすぐに送信
        this.sendPacket(source, destination);
        
        // 連続送信用インターバルを設定
        this.sendInterval = setInterval(() => {
            if (this.isRunning) {
                // 現在の送信元/送信先を取得
                const sourceSelect = document.getElementById('source');
                const destSelect = document.getElementById('destination');
                
                if (sourceSelect && destSelect) {
                    const currentSource = sourceSelect.value;
                    const currentDest = destSelect.value;
                    
                    // アクティブなパケットの最大数を制限
                    if (this.packets.filter(p => !p.completed).length < 20) {
                        this.sendPacket(currentSource, currentDest);
                    }
                }
            }
        }, this.sendRate);
        
        // 完了したパケットを定期的にクリーンアップ
        this.cleanupInterval = setInterval(() => {
            this.cleanupCompletedPackets();
        }, 10000); // 10秒ごと
        
        this.addLogEntry(`端末 ${source} から 端末 ${destination} への連続送信を開始しました。間隔: ${this.sendRate}ミリ秒`, 'info');
    }
    
    // 連続送信の停止
    stopContinuousSending() {
        this.isRunning = false;
        this.currentSource = null;
        this.currentDestination = null;
        
        if (this.sendInterval) {
            clearInterval(this.sendInterval);
            this.sendInterval = null;
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        // アニメーションフレームをすべてキャンセル
        for (const [id, frameId] of this.animationFrames.entries()) {
            cancelAnimationFrame(frameId);
        }
        this.animationFrames.clear();
    }
    
    // 完了したパケットのクリーンアップ
    cleanupCompletedPackets() {
        if (!this.isRunning) return;
        
        const now = Date.now();
        
        // 完了または停滞したパケットを削除
        for (let i = this.packets.length - 1; i >= 0; i--) {
            const packet = this.packets[i];
            if (packet.completed || now - packet.createdAt > 30000) { // 30秒タイムアウト
                // パケットに関連するアニメーションフレームをキャンセル
                if (this.animationFrames.has(packet.id)) {
                    cancelAnimationFrame(this.animationFrames.get(packet.id));
                    this.animationFrames.delete(packet.id);
                }
                
                this.packets.splice(i, 1);
            }
        }
        
        this.updatePacketCounter();
    }
    
    // パケットの送信
    sendPacket(source, destination) {
        if (!this.isRunning) return;
        
        this.packetId++;
        const id = this.packetId;
        
        const packet = {
            id,
            source,
            destination,
            currentNode: source,
            nextNode: this.getNextHop(source, destination),
            status: 'created',
            createdAt: Date.now(),
            completed: false,
            hops: 0
        };
        
        // 次のホップが無効な場合はエラーを記録して送信しない
        if (!packet.nextNode) {
            this.addLogEntry(`パケット #${id}: 無効なルート設定です。`, 'error');
            return;
        }
        
        this.packets.push(packet);
        this.stats.packetsCreated++;
        this.addLogEntry(`パケット #${id}: 端末 ${source} から 端末 ${destination} へ送信します。`, 'info');
        this.updatePacketCounter();
        
        // パケットの移動を開始
        this.movePacket(packet);
    }
    
    // 次のホップを取得
    getNextHop(currentNode, destination) {
        const LEFT_TERMINALS = ['A', 'B'];
        const TOP_TERMINALS = ['C', 'D'];
        const RIGHT_TERMINALS = ['E', 'F'];
        const BOTTOM_TERMINALS = ['G', 'H'];

        // 端末からルータへの直接接続
        if (LEFT_TERMINALS.includes(currentNode)) return 'W';
        if (TOP_TERMINALS.includes(currentNode)) return 'X';
        if (RIGHT_TERMINALS.includes(currentNode)) return 'Z';
        if (BOTTOM_TERMINALS.includes(currentNode)) return 'Y';

        // ルータWからの経路
        if (currentNode === 'W') {
            if (LEFT_TERMINALS.includes(destination)) return destination;
            if (TOP_TERMINALS.includes(destination) || RIGHT_TERMINALS.includes(destination)) return 'X';
            return 'Y'; // G, H宛て
        }

        // ルータXからの経路
        if (currentNode === 'X') {
            if (TOP_TERMINALS.includes(destination)) return destination;
            if (RIGHT_TERMINALS.includes(destination)) return 'Z';
            if (LEFT_TERMINALS.includes(destination)) return 'W';
            return 'Z'; // G, H宛て
        }

        // ルータYからの経路
        if (currentNode === 'Y') {
            if (BOTTOM_TERMINALS.includes(destination)) return destination;
            if (LEFT_TERMINALS.includes(destination)) return 'W';
            return 'Z'; // その他宛て
        }

        // ルータZからの経路
        if (currentNode === 'Z') {
            if (RIGHT_TERMINALS.includes(destination)) return destination;
            if (BOTTOM_TERMINALS.includes(destination)) return 'Y';
            return 'X'; // その他宛て
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
    
    // パケットの移動
    movePacket(packet) {
        if (!this.isRunning || packet.completed) return;
        
        const fromNode = this.nodes[packet.currentNode];
        const toNode = this.nodes[packet.nextNode];
        
        if (!fromNode || !toNode) {
            this.addLogEntry(`パケット #${packet.id}: 無効なルートです (${packet.currentNode} -> ${packet.nextNode})。`, 'error');
            packet.completed = true;
            this.updatePacketCounter();
            return;
        }
        
        // ホップ数を増やす
        packet.hops++;
        
        const portNumber = this.getPortNumber(packet.currentNode, packet.nextNode);
        const connectionId = this.getConnectionId(packet.currentNode, packet.nextNode);
        
        // アクティブな要素をハイライト表示に追加
        this.activeElements.add(packet.currentNode);
        this.activeElements.add(packet.nextNode);
        if (connectionId) {
            this.activeElements.add(connectionId);
            this.activeElements.add(`port-${connectionId}`);
        }
        
        // ネットワーク全体を再描画せずに接続を更新
        this.updateActiveConnections();
        
        if (packet.currentNode !== packet.source) {
            if (portNumber) {
                this.addLogEntry(`パケット #${packet.id}: ルータ ${packet.currentNode} がパケットを受信し、ポート ${portNumber} から転送します。`, 'info');
            } else {
                this.addLogEntry(`パケット #${packet.id}: ルータ ${packet.currentNode} がパケットを転送します。`, 'info');
            }
        }
        
        // ネットワーク要素の取得
        const networkEl = document.getElementById('network');
        if (!networkEl) {
            packet.completed = true;
            return;
        }
        
        // パケットを視覚的に表示
        const packetEl = document.createElement('div');
        packetEl.classList.add('packet');
        packetEl.textContent = packet.id;
        packetEl.dataset.id = `packet-${packet.id}`;
        packetEl.title = `パケット #${packet.id}: ${packet.source} → ${packet.destination}`;
        
        const fromPos = this.scalePosition(fromNode.x, fromNode.y);
        packetEl.style.left = `${fromPos.x}px`;
        packetEl.style.top = `${fromPos.y}px`;
        
        networkEl.appendChild(packetEl);
        
        // パケット移動アニメーションを開始
        this.animatePacket(packet, packetEl, fromNode, toNode);
    }
    
    // パケットのアニメーション
    animatePacket(packet, packetEl, fromNode, toNode) {
        if (!this.isRunning || packet.completed) {
            try {
                if (packetEl.parentNode) {
                    packetEl.parentNode.removeChild(packetEl);
                }
            } catch (e) {
                console.error('パケット要素削除エラー:', e);
            }
            return;
        }
        
        const startTime = performance.now();
        const duration = 1000; // 1秒
        
        const animate = (currentTime) => {
            // シミュレーションが停止している場合はアニメーションを中止
            if (!this.isRunning || packet.completed) {
                try {
                    if (packetEl.parentNode) {
                        packetEl.parentNode.removeChild(packetEl);
                    }
                } catch (e) {
                    console.error('パケット要素削除エラー:', e);
                }
                // アニメーション追跡から削除
                this.animationFrames.delete(packet.id);
                return;
            }
            
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const fromPos = this.scalePosition(fromNode.x, fromNode.y);
            const toPos = this.scalePosition(toNode.x, toNode.y);
            
            const x = fromPos.x + (toPos.x - fromPos.x) * progress;
            const y = fromPos.y + (toPos.y - fromPos.y) * progress;
            
            try {
                packetEl.style.left = `${x}px`;
                packetEl.style.top = `${y}px`;
            } catch (e) {
                console.error('パケット位置設定エラー:', e);
                this.animationFrames.delete(packet.id);
                return;
            }
            
            if (progress < 1) {
                // アニメーション継続
                const frameId = requestAnimationFrame(animate);
                this.animationFrames.set(packet.id, frameId);
            } else {
                // パケットが目標に到達
                try {
                    packetEl.classList.add('animate-fadeOut');
                    setTimeout(() => {
                        try {
                            if (packetEl.parentNode) {
                                packetEl.parentNode.removeChild(packetEl);
                            }
                        } catch (e) {
                            console.error('パケット要素削除エラー:', e);
                        }
                    }, 300);
                } catch (e) {
                    console.error('パケットアニメーション終了エラー:', e);
                }
                
                // アニメーション追跡から削除
                this.animationFrames.delete(packet.id);
                
                // パケット処理を続行
                this.processPacketNextHop(packet);
            }
        };
        
        // 初回アニメーションフレームを開始し追跡する
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.set(packet.id, frameId);
    }
    
    // パケットの次ホップへの処理
    processPacketNextHop(packet) {
        if (!this.isRunning || packet.completed) return;
        
        // パケットの状態を更新
        packet.currentNode = packet.nextNode;
        
        if (packet.currentNode === packet.destination) {
            // パケットが最終目的地に到達
            this.stats.packetsDelivered++;
            this.stats.totalHops += packet.hops;
            
            // 平均ホップ数の計算
            const avgHops = this.stats.totalHops / this.stats.packetsDelivered;
            
            this.addLogEntry(`パケット #${packet.id}: 端末 ${packet.destination} に到達しました。 (${packet.hops}ホップ)`, 'success');
            packet.completed = true;
            this.updatePacketCounter();
            
            // このパケットのアクティブ要素を削除（他のパケットが使用していない場合のみ）
            this.cleanupActiveConnections();
        } else {
            // 次のホップに進む
            const oldNext = packet.nextNode;
            packet.nextNode = this.getNextHop(packet.currentNode, packet.destination);
            
            // 次のホップが無効な場合はパケットを完了としてマーク
            if (!packet.nextNode) {
                this.addLogEntry(`パケット #${packet.id}: 次ホップが見つかりません。パケットは破棄されます。`, 'error');
                packet.completed = true;
                this.updatePacketCounter();
                return;
            }
            
            // 他のパケットが使用していない場合、古い接続からアクティブ要素を削除
            const oldConnectionId = this.getConnectionId(packet.currentNode, oldNext);
            if (oldConnectionId) {
                this.cleanupActiveElement(oldConnectionId);
                this.cleanupActiveElement(`port-${oldConnectionId}`);
            }
            
            // ネットワーク全体を再描画せずに接続を更新
            this.updateActiveConnections();
            
            // メインスレッドのブロックを防ぐためにsetTimeoutを使用して次のホップに進む
            setTimeout(() => {
                if (this.isRunning && !packet.completed) {
                    this.movePacket(packet);
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
        
        // 各パケットがどの要素を使用しているかカウント
        for (const packet of this.packets) {
            if (!packet.completed) {
                // 現在のノードとパケットが使用する接続を追跡
                const currentConnectionId = this.getConnectionId(packet.currentNode, packet.nextNode);
                
                if (currentConnectionId) {
                    // 接続と関連要素の参照カウントを増やす
                    this.incrementReferenceCount(referenceCount, packet.currentNode);
                    this.incrementReferenceCount(referenceCount, packet.nextNode);
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
        
        // パケットがまだこの接続を使用しているか確認
        for (const packet of this.packets) {
            if (!packet.completed) {
                const currentConnectionId = this.getConnectionId(packet.currentNode, packet.nextNode);
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
    
    // すべてのパケットをクリア
    clearPackets() {
        // アニメーションフレームをすべてキャンセル
        for (const [id, frameId] of this.animationFrames.entries()) {
            cancelAnimationFrame(frameId);
        }
        this.animationFrames.clear();
        
        this.packets = [];
        this.updatePacketCounter();
        
        // すべてのパケット要素を削除
        const networkEl = document.getElementById('network');
        if (!networkEl) return;
        
        const packetEls = networkEl.querySelectorAll('.packet');
        packetEls.forEach(el => {
            try {
                el.classList.add('animate-fadeOut');
                setTimeout(() => {
                    try {
                        if (el.parentNode) {
                            el.parentNode.removeChild(el);
                        }
                    } catch (e) {
                        console.error('パケット要素削除エラー:', e);
                    }
                }, 300);
            } catch (e) {
                console.error('パケット削除アニメーションエラー:', e);
            }
        });
    }
    
    // パケットカウンターの更新
    updatePacketCounter() {
        const counter = document.getElementById('packet-counter');
        if (counter) {
            const activeCount = this.packets.filter(p => !p.completed).length;
            counter.innerHTML = `アクティブパケット: <span class="font-bold text-primary-600">${activeCount}</span>`;
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
        window.simulation = new NetworkSimulation();
        
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