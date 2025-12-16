(function() {
    // --- 调试 HUD ---
    const debugEl = document.createElement('div');
    debugEl.style.cssText = 'position:fixed; top:50px; right:10px; z-index:999999; background:rgba(0,0,0,0.8); color:#0f0; padding:8px; font-size:11px; pointer-events:none; max-width:200px; word-break:break-all; border-radius:4px; font-family:monospace;';
    debugEl.innerHTML = 'Status: Init...';
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
            // 严格检查 alpha 通道：如果 alpha 为 0，视为无效
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
            img.src = url.replace(/['"]/g, ''); // 清理 url('...')
            
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    // 只取顶部 10 像素进行分析
                    canvas.width = 1;
                    canvas.height = 1;
                    const ctx = canvas.getContext('2d');
                    // 绘制图片顶部 (sourceY=0)
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
        if (isProcessingImage) return; // 避免重复触发

        const x = window.innerWidth / 2;
        const y = 1; // 稍微向下一点，避开极其边缘的遮罩
        
        const elements = document.elementsFromPoint(x, y);
        
        let candidateColor = null;
        let candidateSource = 'Default';
        let foundImage = false;

        for (let el of elements) {
            const style = window.getComputedStyle(el);

            // 1. 过滤透明度极低的幽灵层
            const opacity = parseFloat(style.opacity);
            if (opacity < 0.1) continue;

            // 2. 优先检查背景图 (URL)
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none') {
                // 情况A: 渐变
                if (bgImage.includes('gradient')) {
                    const grad = ColorUtils.extractGradient(bgImage);
                    if (grad) {
                        candidateColor = grad;
                        candidateSource = `${el.tagName} (Gradient)`;
                        break;
                    }
                } 
                // 情况B: 真实图片 URL
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
                                // 图片提取失败（可能跨域），回退到继续找背景色
                                log('Img CORS Fail, finding next layer...');
                            }
                        });
                        foundImage = true;
                        break; // 暂停主循环，等待图片回调
                    }
                }
            }

            // 3. 检查背景色 (如果不是完全透明)
            const bgColor = style.backgroundColor;
            const hex = ColorUtils.rgbToHex(bgColor);
            // 只有当背景色不透明度足够高时才采纳
            // 简单的 rgbToHex 已经过滤了 alpha=0，但我们需要过滤半透明
            // 这里假设 alpha > 0.5 才是有效背景，否则可能是叠加层
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

        // 设置 Meta
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = "theme-color";
            document.head.appendChild(meta);
        }
        meta.content = color;

        // 更新 HUD
        log(`Color: ${color}<br>Src: ${source}<br>Time: ${new Date().toLocaleTimeString()}`);
    }

    // 启动
    function loop() {
        requestAnimationFrame(() => {
            detectColor();
            // 降频执行，节省 Canvas 开销
            setTimeout(loop, 1000); 
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loop);
    } else {
        loop();
    }
    
    // 滚动时立即触发一次
    window.addEventListener('scroll', () => detectColor());

    console.log('Dynamic Status Bar V5 (Image Engine) Loaded');
})();
