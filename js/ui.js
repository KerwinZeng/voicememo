/**
 * UI 交互控制类
 */
class UI {
    constructor() {
        this.currentPage = 'home';
        this.pageContainer = document.getElementById('page-container');
        this.recordButton = null;
        this.recordStatus = null;
        this.originalText = null;
        this.enhancedText = null;
        this.tagsContainer = null;
        this.historyList = null;
        
        this.init();
    }

    /**
     * 初始化UI
     */
    async init() {
        this.setupNavigationListeners();
        await this.loadPage('home');
        await recorder.init();
    }

    /**
     * 设置导航监听器
     */
    setupNavigationListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });
    }

    /**
     * 切换页面
     * @param {string} page - 页面名称
     */
    async switchPage(page) {
        if (this.currentPage === page) return;

        // 更新导航状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        await this.loadPage(page);
        this.currentPage = page;
    }

    /**
     * 加载页面内容
     * @param {string} page - 页面名称
     */
    async loadPage(page) {
        const template = document.getElementById(`${page}-template`);
        if (!template) return;

        const content = template.content.cloneNode(true);
        this.pageContainer.innerHTML = '';
        this.pageContainer.appendChild(content);

        // 初始化页面特定的元素和事件
        switch (page) {
            case 'home':
                await this.initHomePage();
                break;
            case 'history':
                await this.initHistoryPage();
                break;
            case 'profile':
                await this.initProfilePage();
                break;
        }
    }

    /**
     * 初始化首页
     */
    async initHomePage() {
        this.recordButton = document.getElementById('record-button');
        this.recordStatus = document.getElementById('record-status');
        this.originalText = document.getElementById('original-text');
        this.enhancedText = document.getElementById('enhanced-text');
        this.tagsContainer = document.getElementById('tags-container');

        // 设置录音按钮事件
        this.recordButton.addEventListener('click', () => {
            if (recorder.getRecordingStatus()) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        });

        // 监听录音进度
        document.addEventListener('recordingProgress', (e) => {
            this.updateRecordingStatus(e.detail.formattedDuration);
        });

        // 监听录音完成
        document.addEventListener('recordingComplete', async (e) => {
            // 防止重复调用
            if (!this.isProcessingRecording) {
                this.isProcessingRecording = true;
                try {
                    await this.handleRecordingComplete(e.detail);
                } finally {
                    this.isProcessingRecording = false;
                }
            }
        });

        // 添加录音错误事件监听
        document.addEventListener('recordingError', (e) => {
            this.handleRecordingError(e.detail.error);
        });
    }

    /**
     * 开始录音
     */
    async startRecording() {
        try {
            this.recordButton.classList.add('recording');
            this.originalText.innerHTML = '<p class="placeholder">正在录音...</p>';
            this.enhancedText.innerHTML = '';
            this.tagsContainer.innerHTML = '';
            await recorder.start();
        } catch (error) {
            this.handleRecordingError(error);
        }
    }

    /**
     * 停止录音
     */
    async stopRecording() {
        this.recordButton.classList.remove('recording');
        this.originalText.innerHTML = '<p class="placeholder">正在处理录音...</p>';
        recorder.stop();
    }

    /**
     * 更新录音状态显示
     * @param {string} duration - 格式化后的时长
     */
    updateRecordingStatus(duration) {
        this.recordStatus.textContent = duration;
    }

    /**
     * 处理录音完成事件
     * @param {Object} recording - 录音数据
     */
    async handleRecordingComplete(recording) {
        try {
            // 转写音频
            const transcription = await api.transcribeAudio(recording.blob);
            this.originalText.textContent = transcription;

            // AI增强文本
            const enhanced = await api.enhanceText(transcription);
            
            // 显示增强结果
            this.enhancedText.innerHTML = `
                <h3>优化后的文本：</h3>
                <p>${enhanced.enhancedText}</p>
                <h3>延伸思考：</h3>
                <p>${enhanced.thoughts}</p>
            `;

            // 显示标签
            this.tagsContainer.innerHTML = enhanced.tags
                .map(tag => `<span class="tag">${tag}</span>`)
                .join('');

            // 保存到数据库
            await db.saveRecording({
                ...recording,
                transcription,
                enhanced
            });

        } catch (error) {
            console.error('处理录音失败:', error);
            this.showError('处理录音时出现错误，请重试。');
        }
    }

    /**
     * 初始化历史页面
     */
    async initHistoryPage() {
        this.historyList = document.getElementById('history-list');
        await this.loadHistoryRecords();
    }

    /**
     * 加载历史记录
     */
    async loadHistoryRecords() {
        try {
            const records = await db.getAllRecordings();
            this.historyList.innerHTML = records
                .map(record => this.createHistoryItem(record))
                .join('');
            
            // 添加删除事件监听
            this.historyList.querySelectorAll('.delete-button').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = parseInt(e.target.dataset.id);
                    await this.deleteHistoryItem(id);
                });
            });
        } catch (error) {
            console.error('加载历史记录失败:', error);
            this.showError('加载历史记录失败。');
        }
    }

    /**
     * 创建历史记录项HTML
     * @param {Object} record - 记录数据
     * @returns {string} HTML字符串
     */
    createHistoryItem(record) {
        const date = new Date(record.timestamp).toLocaleString();
        return `
            <div class="history-item" data-id="${record.id}">
                <div class="history-item-header">
                    <span class="timestamp">${date}</span>
                    <button class="delete-button" data-id="${record.id}">删除</button>
                </div>
                <div class="history-item-content">
                    <h4>原始文本：</h4>
                    <p>${record.transcription}</p>
                    <h4>优化后的文本：</h4>
                    <p>${record.enhanced.enhancedText}</p>
                    <div class="tags">
                        ${record.enhanced.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <h4>延伸思考：</h4>
                    <p>${record.enhanced.thoughts}</p>
                </div>
            </div>
        `;
    }

    /**
     * 删除历史记录项
     * @param {number} id - 记录ID
     */
    async deleteHistoryItem(id) {
        try {
            await db.deleteRecording(id);
            const item = this.historyList.querySelector(`[data-id="${id}"]`);
            if (item) {
                item.remove();
            }
        } catch (error) {
            console.error('删除记录失败:', error);
            this.showError('删除记录失败。');
        }
    }

    /**
     * 初始化个人页面
     */
    initProfilePage() {
        // 待实现
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.textContent = message;
        document.body.appendChild(toast);

        // 添加淡入效果
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
        });

        // 自动移除提示
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, CONFIG.UI.TOAST_DURATION);
    }

    handleRecordingError(error) {
        console.error('录音错误:', error);
        this.recordButton.classList.remove('recording');
        this.originalText.innerHTML = '<p class="placeholder">录音失败，请重试</p>';
        this.showError(`录音失败: ${error.message || '未知错误'}`);
        
        // 重置录音状态
        this.recordStatus.textContent = '';
        recorder.stop();
    }
}

// 创建UI实例
const ui = new UI(); 