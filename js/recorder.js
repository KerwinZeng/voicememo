/**
 * 录音功能类
 */
class Recorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.startTime = null;
        this.duration = 0;
        this.timer = null;
    }

    /**
     * 请求麦克风权限并初始化录音器
     * @returns {Promise}
     */
    async init() {
        try {
            // 检查浏览器是否支持录音
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('您的浏览器不支持录音功能');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });

            // 检查是否支持 MediaRecorder
            if (!window.MediaRecorder) {
                throw new Error('您的浏览器不支持 MediaRecorder');
            }

            // 检查是否支持指定的音频格式
            if (!MediaRecorder.isTypeSupported(CONFIG.RECORDER.AUDIO_TYPE)) {
                throw new Error(`您的浏览器不支持 ${CONFIG.RECORDER.AUDIO_TYPE} 格式`);
            }

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: CONFIG.RECORDER.AUDIO_TYPE,
                audioBitsPerSecond: 128000
            });

            this.setupEventListeners();
            return true;
        } catch (error) {
            console.error('麦克风初始化失败:', error);
            throw new Error(`无法访问麦克风: ${error.message}`);
        }
    }

    /**
     * 设置录音器事件监听
     */
    setupEventListeners() {
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            this.stopTimer();
            this.isRecording = false;
            
            // 触发录音完成事件
            const audioBlob = new Blob(this.audioChunks, { type: CONFIG.RECORDER.AUDIO_TYPE });
            const recording = {
                blob: audioBlob,
                duration: this.duration,
                timestamp: Date.now()
            };
            
            document.dispatchEvent(new CustomEvent('recordingComplete', { 
                detail: recording 
            }));
        };

        // 添加错误处理
        this.mediaRecorder.onerror = (event) => {
            console.error('录音错误:', event.error);
            this.stop();
            document.dispatchEvent(new CustomEvent('recordingError', {
                detail: { error: event.error }
            }));
        };
    }

    /**
     * 开始录音
     */
    start() {
        if (this.isRecording) return;
        
        try {
            this.audioChunks = [];
            this.startTime = Date.now();
            this.duration = 0;
            this.isRecording = true;
            
            this.mediaRecorder.start(CONFIG.RECORDER.TIME_SLICE);
            this.startTimer();

            setTimeout(() => {
                if (this.isRecording) {
                    this.stop();
                }
            }, CONFIG.RECORDER.MAX_DURATION);
        } catch (error) {
            console.error('开始录音失败:', error);
            this.isRecording = false;
            throw error;
        }
    }

    /**
     * 停止录音
     */
    stop() {
        if (!this.isRecording) return;
        
        try {
            this.mediaRecorder.stop();
            this.stopTimer();
            this.isRecording = false;
        } catch (error) {
            console.error('停止录音失败:', error);
            this.isRecording = false;
            throw error;
        }
    }

    /**
     * 开始计时器
     */
    startTimer() {
        this.timer = setInterval(() => {
            this.duration = Date.now() - this.startTime;
            
            // 触发录音时长更新事件
            document.dispatchEvent(new CustomEvent('recordingProgress', {
                detail: {
                    duration: this.duration,
                    formattedDuration: this.formatDuration(this.duration)
                }
            }));
        }, 100);
    }

    /**
     * 停止计时器
     */
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * 格式化时长显示
     * @param {number} ms - 毫秒数
     * @returns {string} 格式化后的时间字符串
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * 获取录音状态
     * @returns {boolean}
     */
    getRecordingStatus() {
        return this.isRecording;
    }

    /**
     * 获取当前录音时长
     * @returns {number}
     */
    getCurrentDuration() {
        return this.duration;
    }
}

// 创建录音器实例
const recorder = new Recorder(); 