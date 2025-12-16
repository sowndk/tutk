(function() {
    // --- 调试面板 ---
    const debugEl = document.createElement('div');
    debugEl.style.cssText = 'position:fixed; top:50px; right:10px; z-index:999999; background:rgba(0,0,0,0.8); color:#0f0; padding:5px; font-size:10px; pointer-events:none; max-width:150px; word-break:break-all;';
    debugEl.innerHTML = 'Status: Init...';
    // 如需关闭调试面板，注释下行
    document.documentElement.appendChild(debugEl);

    function log(msg) {
        debugEl.innerHTML = msg;
    }

    // --- 颜色工具 ---
    const ColorUtils = {
        rgbToHex: function(color) {
            if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
            if (color.startsWith('#')) return color;
            const rgb = color.match(/\d+/g);
            if (!rgb || rgb.length < 3) return null;
            if (rgb.length === 4 && parseInt(rgb[3]) === 0) return null; // 完全透明
            return '#' + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
        },
        extractGradient: function(str) {
            if (!str || str === 'none' || !str.includes('gradient')) return null;
            // 简单粗暴：提取第一个 hex 或 rgb
            const match = str.match(/(#[0-9a-fA-F]{3,8}|rgba?\([\d\s,.]+\))/);
            return match ? (this.rgbToHex(match[0]) || match[0]) : null;
        }
    };

    function detectColor() {
        const x = window.innerWidth / 2;
        const y = 10; // 避开边缘
        
        // 关键：获取该点下的所有层叠元素 (从上到下)
        const elements = document.elementsFromPoint(x, y);
        
        let finalColor = null;
        let foundSource = 'Default';

        for (let el of elements) {
            const style = window.getComputedStyle(el);
            
            // 1. 检查渐变/背景图
            const bgImage = style.backgroundImage;
            const gradientColor = ColorUtils.extractGradient(bgImage);
            if (gradientColor) {
                finalColor = gradientColor;
                foundSource = el.tagName + '.' + el.className + ' (Gradient)';
                break;
            }

            // 2. 检查背景色
            const bgColor = style.backgroundColor;
            const hex = ColorUtils.rgbToHex(bgColor);
            if (hex) {
                finalColor = hex;
                foundSource = el.tagName + '.' + el.className + ' (BgColor)';
                break;
            }
        }
        
        // 如果没找到，默认白色
        finalColor = finalColor || '#ffffff';

        // 更新调试面板
        log(`Color: ${finalColor}<br>Source: ${foundSource}<br>Layers: ${elements.length}`);
        
        return finalColor;
    }

    function setMetaThemeColor(color) {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = "theme-color";
            document.head.appendChild(meta);
        }
        if (meta.content !== color) {
            meta.content = color;
        }
    }

    function update() {
        requestAnimationFrame(() => {
            try {
                const color = detectColor();
                setMetaThemeColor(color);
            } catch (e) {
                log('Error: ' + e.message);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', update);
    } else {
        update();
    }

    // 监听
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    window.addEventListener('scroll', update);
    
    console.log('Dynamic Status Bar V4 (X-Ray) Loaded');
})();
