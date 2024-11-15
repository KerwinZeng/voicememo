const CACHE_NAME = 'voicememo-v1';
const CACHE_FILES = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/icons.css',
    '/js/config.js',
    '/js/db.js',
    '/js/recorder.js',
    '/js/api.js',
    '/js/ui.js',
    '/js/app.js'
];

// 安装服务工作器
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('缓存文件中...');
                return cache.addAll(CACHE_FILES);
            })
    );
});

// 激活服务工作器
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 处理请求
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 如果在缓存中找到响应，则返回缓存的响应
                if (response) {
                    return response;
                }

                // 否则发送网络请求
                return fetch(event.request)
                    .then(response => {
                        // 检查是否收到有效的响应
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 克隆响应
                        const responseToCache = response.clone();

                        // 将响应添加到缓存
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    });
            })
    );
}); 