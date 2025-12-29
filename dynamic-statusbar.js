(function() {
    // ==========================================
    // Fix: 视口高度修正 (修复切换应用后的缝隙/白边问题)
    // ==========================================
    function fixViewportLayout() {
        const screen = document.getElementById('phone-screen');
        if (screen) {
            // 获取当前的实际可视高度
            const realHeight = window.innerHeight;
            
            // 强制设置容器高度，不再依赖不稳定的 100vh
            screen.style.height = realHeight + 'px';
            
            // 强制重置滚动位置，防止因系统UI挤压导致的偏移
            window.scrollTo(0, 0);
        }
    }

    // 1. 初始化时立即修正
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixViewportLayout);
    } else {
        fixViewportLayout();
    }

    // 2. 监听尺寸变化 (横竖屏、软键盘)
    window.addEventListener('resize', () => {
        fixViewportLayout();
        // 某些浏览器 resize 事件触发频繁，防抖动不是必须但延迟再次确认更稳妥
        setTimeout(fixViewportLayout, 100);
    });

    // 3. 监听可见性变化 (核心修复：切换APP回来时触发)
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            fixViewportLayout();
            // 延迟多次执行，以等待系统UI动画（如状态栏滑出）完全结束
            setTimeout(fixViewportLayout, 200);
            setTimeout(fixViewportLayout, 500);
        }
    });

    // ==========================================
    // 原有逻辑：动态状态栏颜色检测
    // ==========================================
    
    // --- 调试 HUD (默认关闭) ---
    const debugEl = document.createElement('div');
    debugEl.style.cssText = 'position:fixed; top:50px; right:10px; z-index:999999; background:rgba(0,0,0,0.8); color:#0f0; padding:8px; font-size:11px; pointer-events:none; max-width:200px; word-break:break-all; border-radius:4px; font-family:monospace; display:none;'; 
    // 如需开启调试，将 display:none 改为 display:block 并取消下一行的注释
    // document.documentElement.appendChild(debugEl);

    function log(msg) { debugEl.innerHTML = msg; }

    // --- 核心工具集 ---
    const ColorUtils = {
        // 将颜色转为 Hex，支持 RGB/RGBA
        rgbToHex: function(color) {
            if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
            if (color.startsWith('#')) return color;
            const rgb = color.match(/\d+/g);
            if (!rgb || rgb.length < 3) return null;
            if (rgb.length === 4 && parseFloat(rgb[3]) === 0) return null;
            return '#' + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
        },

        // 提取渐变色
        extractGradient: function(str) {
            if (!str || str === 'none' || !str.includes('gradient')) return null;
            const match = str.match(/(#[0-9a-fA-F]{3,8}|rgba?\([\d\s,.]+\))/);
            return match ? (this.rgbToHex(match[0]) || match[0]) : null;
        },

        // 提取 URL 图片的主色 (异步)
        extractImageColor: function(url, callback) {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url.replace(/['"]/g, ''); 
            
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1;
                    canvas.height = 1;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, img.width / 2, 0, 1, 1, 0, 0, 1, 1);
                    const p = ctx.getImageData(0, 0, 1, 1).data;
                    const hex = '#' + ((1 << 24) + (p[0] << 16) + (p[1] << 8) + p[2]).toString(16).slice(1);
                    callback(hex);
                } catch (e) {
                    console.error('Canvas access failed (CORS?):', e);
                    callback(null);
                }
            };
            img.onerror = () => callback(null);
        }
    };

    // --- 主逻辑 ---
    let lastSetColor = '';
    let isProcessingImage = false;

    function detectColor() {
        if (isProcessingImage) return; 

        const x = window.innerWidth / 2;
        const y = 1; // 顶部采样点
        
        const elements = document.elementsFromPoint(x, y);
        
        let candidateColor = null;
        let candidateSource = 'Default';
        let foundImage = false;

        for (let el of elements) {
            const style = window.getComputedStyle(el);

            if (parseFloat(style.opacity) < 0.1) continue;

            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none') {
                if (bgImage.includes('gradient')) {
                    const grad = ColorUtils.extractGradient(bgImage);
                    if (grad) {
                        candidateColor = grad;
                        candidateSource = `${el.tagName} (Gradient)`;
                        break;
                    }
                } 
                else if (bgImage.includes('url')) {
                    const urlMatch = bgImage.match(/url\((.*?)\)/);
                    if (urlMatch && urlMatch[1]) {
                        log('Analysing Image...');
                        isProcessingImage = true;
                        ColorUtils.extractImageColor(urlMatch[1], (hex) => {
                            isProcessingImage = false;
                            if (hex) {
                                applyColor(hex, `${el.tagName} (Image)`);
                            } else {
                                log('Img CORS Fail, finding next layer...');
                            }
                        });
                        foundImage = true;
                        break; 
                    }
                }
            }

            const bgColor = style.backgroundColor;
            const hex = ColorUtils.rgbToHex(bgColor);
            if (hex) {
                const alpha = bgColor.match(/rgba?\(.*,\s*([\d.]+)\)/);
                if (!alpha || parseFloat(alpha[1]) > 0.5) {
                    candidateColor = hex;
                    candidateSource = `${el.tagName} (BgColor)`;
                    break;
                }
            }
        }
        
        if (!foundImage) {
            applyColor(candidateColor || '#ffffff', candidateSource);
        }
    }

    function applyColor(color, source) {
        if (color === lastSetColor) return;
        lastSetColor = color;

        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = "theme-color";
            document.head.appendChild(meta);
        }
        meta.content = color;

        log(`Color: ${color}<br>Src: ${source}<br>Time: ${new Date().toLocaleTimeString()}`);
    }

    // 启动检测循环
    function loop() {
        requestAnimationFrame(() => {
            detectColor();
            setTimeout(loop, 1000); 
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loop);
    } else {
        loop();
    }
    
    window.addEventListener('scroll', () => detectColor());

    console.log('Dynamic Status Bar V5.1 (With Viewport Fix) Loaded');
})();
