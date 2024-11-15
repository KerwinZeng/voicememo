/**
 * IndexedDB 数据库操作类
 */
class DB {
    constructor() {
        this.db = null;
        this.initDB();
    }

    /**
     * 初始化数据库
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.DB.NAME, CONFIG.DB.VERSION);

            request.onerror = (event) => {
                console.error('数据库打开失败:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('数据库连接成功');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建录音记录存储库
                if (!db.objectStoreNames.contains(CONFIG.DB.STORES.RECORDINGS)) {
                    const store = db.createObjectStore(CONFIG.DB.STORES.RECORDINGS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // 创建索引
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('duration', 'duration', { unique: false });
                }
            };
        });
    }

    /**
     * 保存录音记录
     * @param {Object} recording - 录音记录对象
     * @returns {Promise}
     */
    async saveRecording(recording) {
        return this.performTransaction(CONFIG.DB.STORES.RECORDINGS, 'readwrite', (store) => {
            return store.add({
                ...recording,
                timestamp: Date.now()
            });
        });
    }

    /**
     * 获取所有录音记录
     * @returns {Promise<Array>}
     */
    async getAllRecordings() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }

            const transaction = this.db.transaction(CONFIG.DB.STORES.RECORDINGS, 'readonly');
            const store = transaction.objectStore(CONFIG.DB.STORES.RECORDINGS);
            const records = [];
            
            // 使用游标遍历记录
            const request = store.index('timestamp').openCursor(null, 'prev');

            request.onerror = () => {
                reject(new Error('获取记录失败'));
            };

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    // 检查是否已存在相同 ID 的记录
                    if (!records.some(record => record.id === cursor.value.id)) {
                        records.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    resolve(records);
                }
            };

            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    /**
     * 删除录音记录
     * @param {number} id - 记录ID
     * @returns {Promise}
     */
    async deleteRecording(id) {
        return this.performTransaction(CONFIG.DB.STORES.RECORDINGS, 'readwrite', (store) => {
            return store.delete(id);
        });
    }

    /**
     * 执行数据库事务
     * @param {string} storeName - 存储库名称
     * @param {string} mode - 事务模式
     * @param {Function} callback - 回调函数
     * @returns {Promise}
     */
    async performTransaction(storeName, mode, callback) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }

            const transaction = this.db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);

            try {
                const request = callback(store);
                let result;

                // 处理请求结果
                request.onsuccess = (event) => {
                    result = event.target.result;
                };
                
                transaction.oncomplete = () => {
                    resolve(result || []);  // 如果没有结果，返回空数组
                };

                transaction.onerror = (event) => {
                    reject(event.target.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }
}

// 创建数据库实例
const db = new DB(); 