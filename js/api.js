/**
 * API 调用类
 */
class API {
    constructor() {
        this.baseURL = CONFIG.API.BASE_URL;
        this.apiKey = CONFIG.API.KEY;
    }

    /**
     * 发送HTTP请求
     * @param {string} endpoint - API端点
     * @param {Object} options - 请求选项
     * @returns {Promise}
     */
    async fetchAPI(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API请求错误:', error);
            throw error;
        }
    }

    /**
     * 将音频转换为文字
     * @param {Blob} audioBlob - 音频数据
     * @returns {Promise<string>}
     */
    async transcribeAudio(audioBlob) {
        try {
            console.log('音频数据大小:', audioBlob.size);
            console.log('音频类型:', audioBlob.type);

            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.wav');
            formData.append('model', 'FunAudioLLM/SenseVoiceSmall');
            formData.append('language', 'zh');
            formData.append('response_format', 'json');

            // 打印 FormData 内容
            for (let pair of formData.entries()) {
                console.log('FormData 字段:', pair[0], pair[1]);
            }

            const response = await this.fetchAPI(CONFIG.API.ENDPOINTS.TRANSCRIPTION, {
                method: 'POST',
                headers: {
                    // 移除 Content-Type header，让浏览器自动设置正确的 boundary
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData
            });

            if (response && response.text) {
                return response.text;
            } else {
                console.error('API响应格式错误:', response);
                throw new Error('转写结果格式错误');
            }
        } catch (error) {
            console.error('音频转写失败:', error);
            throw error;
        }
    }

    /**
     * 将 webm 格式转换为 mp3 格式
     * @param {Blob} webmBlob - webm 格式的音频数据
     * @returns {Promise<Blob>} mp3 格式的音频数据
     */
    async convertToMp3(webmBlob) {
        try {
            // 创建音频上下文
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 将 Blob 转换为 ArrayBuffer
            const arrayBuffer = await webmBlob.arrayBuffer();
            
            // 解码音频数据
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // 创建离线音频上下文
            const offlineAudioContext = new OfflineAudioContext({
                numberOfChannels: 1,
                length: audioBuffer.length,
                sampleRate: 16000 // Silicon Flow API 推荐的采样率
            });
            
            // 创建音频源
            const source = offlineAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineAudioContext.destination);
            source.start();
            
            // 渲染音频
            const renderedBuffer = await offlineAudioContext.startRendering();
            
            // 将 AudioBuffer 转换为 WAV 格式
            const wavBlob = this.audioBufferToWav(renderedBuffer);
            
            return new Blob([wavBlob], { type: 'audio/wav' });
        } catch (error) {
            console.error('音频格式转换失败:', error);
            throw new Error('音频格式转换失败');
        }
    }

    /**
     * 将 AudioBuffer 转换为 WAV 格式
     * @param {AudioBuffer} buffer - 音频缓冲区
     * @returns {Blob} WAV 格式的音频数据
     */
    audioBufferToWav(buffer) {
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numberOfChannels * bytesPerSample;
        
        const data = buffer.getChannelData(0);
        const samples = new Int16Array(data.length);
        
        // 将浮点音频数据转换为 16 位整数
        for (let i = 0; i < data.length; i++) {
            const s = Math.max(-1, Math.min(1, data[i]));
            samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // 创建 WAV 文件头
        const wavBuffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(wavBuffer);
        
        // WAV 文件头
        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(view, 36, 'data');
        view.setUint32(40, samples.length * 2, true);
        
        // 写入音频数据
        const samplesData = new Int16Array(wavBuffer, 44, samples.length);
        samplesData.set(samples);
        
        return new Blob([wavBuffer], { type: 'audio/wav' });
    }

    /**
     * 使用AI优化文本
     * @param {string} text - 原始文本
     * @returns {Promise<Object>}
     */
    async enhanceText(text) {
        const response = await this.fetchAPI(CONFIG.API.ENDPOINTS.CHAT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.AI.MODEL,
                messages: [
                    {
                        role: 'system',
                        content: CONFIG.AI.SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                max_tokens: CONFIG.AI.MAX_TOKENS,
                temperature: CONFIG.AI.TEMPERATURE,
                tools: [
                    {
                    type: "function",
                    function: {
                        description: "",
                        name: "ZK_VOICEMEMO",
                        parameters: {},
                        strict: true
                    }
                    }
                ]
            })
        });

        // 解析AI响应
        return this.parseAIResponse(response.choices[0].message.content);
    }

    /**
     * 解析AI响应文本
     * @param {string} response - AI响应文本
     * @returns {Object} 解析后的结果
     */
    parseAIResponse(response) {
        try {
            const sections = response.split('\n\n');
            const result = {
                enhancedText: '',
                tags: [],
                thoughts: ''
            };

            sections.forEach(section => {
                if (section.startsWith('优化后的文本：')) {
                    result.enhancedText = section.replace('优化后的文本：\n', '').trim();
                } else if (section.startsWith('相关标签：')) {
                    const tagsText = section.replace('相关标\n', '').trim();
                    result.tags = tagsText.match(/#[\u4e00-\u9fa5a-zA-Z0-9]+/g) || [];
                } else if (section.startsWith('延伸思考：')) {
                    result.thoughts = section.replace('延伸思考：\n', '').trim();
                }
            });

            return result;
        } catch (error) {
            console.error('AI响应解析错误:', error);
            throw new Error('AI响应格式错误');
        }
    }
}

// 确保在全局作用域中创建 API 实例
if (typeof window !== 'undefined') {
    window.api = new API();
    console.log('API 实例已初始化');
} 