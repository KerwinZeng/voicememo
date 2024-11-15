/**
 * VoiceMemo 应用主类
 */
class App {
    constructor() {
        this.initialized = false;
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            // 显示加载状态
            this.showLoading();

            // 检查浏览器兼容性
            if (!this.checkCompatibility()) {
                throw new Error('您的浏览器不支持所需的功能，请使用最新版本的Chrome、Firefox或Safari。');
            }

            // 等待所有必要组件初始化
            await Promise.all([
                this.initializeComponents(),
                this.checkPermissions()
            ]);

            // 注册服务工作器（用于离线支持）
            if ('serviceWorker' in navigator) {
                this.registerServiceWorker();
            }

            this.initialized = true;
            this.hideLoading();

        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showError(error.message);
            this.hideLoading();
        }
    }

    /**
     * 检查浏览器兼容性
     */
    checkCompatibility() {
        return !!(
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia &&
            window.MediaRecorder &&
            window.indexedDB
        );
    }

    /**
     * 初始化各个组件
     */
    async initializeComponents() {
        // 组件已在各自的文件中初始化
        // 这里可以添加额外的初始化逻辑
        
        // 添加全局错误处理
        window.addEventListener('error', this.handleError.bind(this));
        window.addEventListener('unhandledrejection', this.handlePromiseError.bind(this));
    }

    /**
     * 检查必要的权限
     */
    async checkPermissions() {
        try {
            // 检查麦克风权限
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            throw new Error('无法访问麦克风，请确保已授予权限。');
        }
    }

    /**
     * 注册服务工作器
     */
    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker 注册成功:', registration);
        } catch (error) {
            console.error('Service Worker 注册失败:', error);
        }
    }

    /**
     * 处理全局错误
     */
    handleError(event) {
        console.error('全局错误:', event.error);
        this.showError('应用发生错误，请刷新页面重试。');
        event.preventDefault();
    }

    /**
     * 处理未捕获的Promise错误
     */
    handlePromiseError(event) {
        console.error('Promise错误:', event.reason);
        this.showError('操作失败，请重试。');
        event.preventDefault();
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        const loading = document.createElement('div');
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">正在加载...</div>
        `;
        document.body.appendChild(loading);
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        const loading = document.querySelector('.loading-overlay');
        if (loading) {
            loading.remove();
        }
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        ui.showError(message);
    }
}

// 创建应用实例
const app = new App();

// 添加加载状态样式
const style = document.createElement('style');
style.textContent = `
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #007AFF;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
    }

    .loading-text {
        color: #333;
        font-size: 16px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .toast {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 24px;
        z-index: 9999;
        animation: fadeInOut ${CONFIG.UI.TOAST_DURATION}ms ease-in-out;
    }

    .toast.error {
        background: rgba(255, 59, 48, 0.9);
    }

    @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, 20px); }
        10% { opacity: 1; transform: translate(-50%, 0); }
        90% { opacity: 1; transform: translate(-50%, 0); }
        100% { opacity: 0; transform: translate(-50%, -20px); }
    }
`;
document.head.appendChild(style); 