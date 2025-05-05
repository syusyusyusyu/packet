// ショートカットツールチップの表示
document.addEventListener('DOMContentLoaded', function() {
    const helpBtn = document.getElementById('help-btn');
    const tooltip = document.getElementById('shortcut-tooltip');
    
    if (helpBtn && tooltip) {
        // マウスオーバーでツールチップを表示
        helpBtn.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
        });
        
        // マウスアウトでツールチップを非表示
        helpBtn.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
        
        // タッチデバイス用
        helpBtn.addEventListener('touchstart', () => {
            if (tooltip.style.display === 'block') {
                tooltip.style.display = 'none';
            } else {
                tooltip.style.display = 'block';
                setTimeout(() => {
                    tooltip.style.display = 'none';
                }, 3000);
            }
        });
        
        // 初回読み込み時に一時的に表示して非表示に
        setTimeout(() => {
            tooltip.style.display = 'block';
            setTimeout(() => {
                tooltip.style.display = 'none';
            }, 3000);
        }, 2000);
    }
    
    // タブ切り替え処理
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // タブボタンの切り替え
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // タブコンテンツの切り替え
            tabContents.forEach(content => {
                if (content.id === tabId) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
    
    // モバイル用のタブ切り替え処理
    const mobileTabButtons = document.querySelectorAll('.mobile-tab-button');
    
    mobileTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // タブボタンの切り替え
            mobileTabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // タブコンテンツの切り替え
            const mobileTabContents = document.querySelectorAll('#mobile-tabs-container .tab-content');
            mobileTabContents.forEach(content => {
                if (content.id === tabId) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
    
    // ログ同期（通常とモバイル両方に反映させる）
    function syncLogs(sourceLogId, targetLogId) {
        const sourceLog = document.getElementById(sourceLogId);
        const targetLog = document.getElementById(targetLogId);
        
        if (sourceLog && targetLog) {
            // ソース側に新規エントリが追加されたらターゲットにもコピー
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // 追加されたノードをターゲットにもコピー
                        mutation.addedNodes.forEach((node) => {
                            targetLog.appendChild(node.cloneNode(true));
                        });
                    }
                });
            });
            
            observer.observe(sourceLog, { childList: true });
        }
    }
    
    // ルーティングテーブル同期
    function syncRoutingTables() {
        const desktopTable = document.getElementById('routing-table');
        const mobileTable = document.getElementById('mobile-routing-table');
        
        if (desktopTable && mobileTable) {
            const observer = new MutationObserver((mutations) => {
                // 内容が変更されたらモバイルテーブルの内容を更新
                mobileTable.innerHTML = desktopTable.innerHTML;
            });
            
            observer.observe(desktopTable, { childList: true, subtree: true });
        }
    }
    
    // モバイルでのログ表示高さを調整
    function adjustMobileLogHeight() {
        const mobileLogContainer = document.getElementById('mobile-log-container');
        if (mobileLogContainer) {
            // 画面高さの1/3を最大高さとして設定
            const maxHeight = Math.max(200, window.innerHeight / 3);
            mobileLogContainer.style.maxHeight = `${maxHeight}px`;
        }
    }
    
    // ウィンドウサイズ変更時にログの高さを調整
    window.addEventListener('resize', adjustMobileLogHeight);
    adjustMobileLogHeight();
    
    // ネットワーク可視化エリアのサイズ固定
    function setupFixedNetwork() {
        const network = document.getElementById('network');
        if (network) {
            // ピンチズーム時にネットワークが動かないようにする
            const zoomArea = document.querySelector('.zoom-area');
            
            if (zoomArea) {
                zoomArea.addEventListener('touchmove', (e) => {
                    if (e.touches.length === 1) {
                        // シングルタッチ時のみイベントをキャンセル
                        e.preventDefault();
                    }
                }, { passive: false });
            }
        }
    }
    
    // モバイル用のピンチズーム機能を修正
    function setupMobileZoom() {
        const network = document.getElementById('network');
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const zoomArea = document.querySelector('.zoom-area');
        const zoomIndicator = document.querySelector('.zoom-indicator');
        
        if (!network || !zoomArea) return;
        
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let startX = 0;
        let startY = 0;
        let lastTapTime = 0;
        let startPinchDistance = 0;
        let isPinching = false;
        
        // 変換適用関数
        function applyTransform() {
            const transformValue = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            network.querySelector('.network-content').style.transform = transformValue;
        }
        
        // ズームインボタン
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                scale = Math.min(scale * 1.2, 3);
                applyTransform();
            });
        }
        
        // ズームアウトボタン
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                scale = Math.max(scale / 1.2, 0.5);
                translateX = scale === 0.5 ? 0 : translateX;
                translateY = scale === 0.5 ? 0 : translateY;
                applyTransform();
            });
        }
        
        // タッチ操作
        zoomArea.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // ピンチ開始
                isPinching = true;
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                startPinchDistance = Math.hypot(
                    touch1.clientX - touch2.clientX,
                    touch1.clientY - touch2.clientY
                );
            } else if (e.touches.length === 1) {
                // ダブルタップ検出
                const touch = e.touches[0];
                
                // ダブルタップ検出
                const now = new Date().getTime();
                const timeSince = now - lastTapTime;
                
                if (timeSince < 300 && timeSince > 0) {
                    // ダブルタップ
                    e.preventDefault();
                    
                    if (scale > 1.4) {
                        // ズームアウト
                        scale = 1;
                        translateX = 0;
                        translateY = 0;
                        
                        // ズームアウトインジケーター
                        showZoomIndicator(touch.clientX, touch.clientY, 'out');
                    } else {
                        // ズームイン
                        scale = 2;
                        
                        // ズームインインジケーター
                        showZoomIndicator(touch.clientX, touch.clientY, 'in');
                    }
                    
                    applyTransform();
                }
                
                lastTapTime = now;
            }
        });
        
        // ズームインジケーター表示
        function showZoomIndicator(x, y, type) {
            if (!zoomIndicator) return;
            
            zoomIndicator.style.left = `${x}px`;
            zoomIndicator.style.top = `${y}px`;
            zoomIndicator.classList.remove('zoom-in', 'zoom-out');
            void zoomIndicator.offsetWidth; // リフロー強制でアニメーションリセット
            
            zoomIndicator.classList.add(`zoom-${type}`);
            
            // アニメーション終了後クラス削除
            setTimeout(() => {
                zoomIndicator.classList.remove('zoom-in', 'zoom-out');
            }, 400);
        }
    }
    
    // 各機能をセットアップ
    setupFixedNetwork();
    setupMobileZoom();
    
    // デスクトップからモバイルへのログ同期
    const logObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                const mobileLogEntries = document.getElementById('mobile-log-entries');
                if (mobileLogEntries) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // 要素ノードの場合のみ
                            mobileLogEntries.appendChild(node.cloneNode(true));
                        }
                    });
                }
            }
        });
    });
    
    const logEntries = document.getElementById('log-entries');
    if (logEntries) {
        logObserver.observe(logEntries, { childList: true });
    }
    
    // ルーティングテーブル同期
    const routingObserver = new MutationObserver((mutations) => {
        const mobileRoutingTable = document.getElementById('mobile-routing-table');
        const routingTable = document.getElementById('routing-table');
        
        if (mobileRoutingTable && routingTable) {
            mobileRoutingTable.innerHTML = routingTable.innerHTML;
        }
    });
    
    const routingTable = document.getElementById('routing-table');
    if (routingTable) {
        routingObserver.observe(routingTable, { childList: true, subtree: true });
    }
});

// 星の背景アニメーション
document.addEventListener('DOMContentLoaded', function() {
    // 流れ星のアニメーションをランダム化
    const meteors = document.querySelectorAll('.meteor');
    meteors.forEach(meteor => {
        const randomDelay = Math.random() * 10;
        const randomDuration = 2 + Math.random() * 3;
        meteor.style.setProperty('--delay', randomDelay);
        meteor.style.animationDuration = `${randomDuration}s`;
        
        // 位置をランダム化
        meteor.style.top = `${Math.random() * 70}%`;
        meteor.style.left = `${70 + Math.random() * 30}%`;
        
        // アニメーションを開始
        setTimeout(() => {
            meteor.style.opacity = '1';
        }, randomDelay * 1000);
    });
    
    // ミニ星のアニメーションをランダム化
    const stars = document.querySelectorAll('.floating-star');
    stars.forEach(star => {
        const randomDelay = Math.random() * 5;
        const randomDuration = 4 + Math.random() * 4;
        star.style.setProperty('--delay', randomDelay);
        star.style.animationDuration = `${randomDuration}s`;
    });
    
    // ポートラベルを星に変更
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                const portLabels = document.querySelectorAll('.port-label');
                portLabels.forEach(label => {
                    if (!label.classList.contains('star-converted')) {
                        label.classList.add('star-label', 'star-converted');
                        label.classList.remove('port-label');
                    }
                });
            }
        });
    });
    
    observer.observe(document.getElementById('network'), { childList: true, subtree: true });
});

// ヘルプモーダルの背景クリック対応をすべてのブラウザで動作するよう修正
document.addEventListener('DOMContentLoaded', function () {
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');
    const closeHelpBtn = document.getElementById('close-help-btn');

    if (helpModal) {
        helpModal.addEventListener('click', function (e) {
            if (e.target === helpModal || e.target === closeHelp || e.target === closeHelpBtn) {
                helpModal.classList.add('hidden');
            }
        });
    }
});