/**
 * VoiceMemo 应用配置文件
 */
const CONFIG = {
    // API配置
    API: {
        BASE_URL: 'https://api.siliconflow.cn',
        KEY: 'sk-vtvoluysdwgrfviurahfdgtfwjttquloimowvtbimcymdvjn',
        ENDPOINTS: {
            TRANSCRIPTION: '/v1/audio/transcriptions',
            CHAT: '/v1/chat/completions'
        }
    },

    // 数据库配置
    DB: {
        NAME: 'voicememo_db',
        VERSION: 1,
        STORES: {
            RECORDINGS: 'recordings'
        }
    },

    // 录音配置
    RECORDER: {
        AUDIO_TYPE: 'audio/webm;codecs=opus',
        TIME_SLICE: 1000, // 1秒
        MAX_DURATION: 300000, // 5分钟
        CONSTRAINTS: {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100,
                channelCount: 1
            }
        }
    },

    // AI文本优化配置
    AI: {
        MODEL: 'deepseek-ai/DeepSeek-V2.5',
        MAX_TOKENS: 2000,
        TEMPERATURE: 0.7,
        SYSTEM_PROMPT: `你是一个文本优化助手，请帮助优化用户的语音转文字内容，使其更加通顺、准确。
        同时，请分析文本内容，提供三个相关的标签，格式为：#标签1 #标签2 #标签3
        最后，请给出关于这个话题的一个思考方向或建议。
        
        请按以下格式返回：
        优化后的文本：
        [优化后的文本内容]
        
        相关标签：
        [#标签1 #标签2 #标签3]
        
        延伸思考：
        [相关的思考或建议]`
    },

    // UI配置
    UI: {
        ANIMATION_DURATION: 300,
        TOAST_DURATION: 3000
    }
};

// 防止配置被修改
Object.freeze(CONFIG); 