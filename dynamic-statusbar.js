(function() {
    function rgbToHex(color) {
        if (!color || color === 'transparent') return null;
        if (color.startsWith('#')) return color;
        
        const rgb = color.match(/\d+/g);
        if (!rgb || rgb.length < 3) return null;
        
        // 忽略完全透明的颜色
        if (rgb.length === 4 && parseInt(rgb[3]) === 0) return null;

        return '#' + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
    }

    /**
     * 获取指定元素在视觉上的最终背景色
     * 如果当前元素透明，则向上查找父元素
     */
    function getVisualBackgroundColor(element) {
        let current = element;
        while (current) {
            const style = window.getComputedStyle(current);
            const bgColor = style.backgroundColor;
            
            // 检查是否有背景图或渐变 (作为辅助判断，虽然 theme-color 只能设纯色)
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none') {
                console.log('Detected background-image on:', current);
                // 如果有背景图但背景色透明，这通常比较棘手。
                // 此时通常应该信任该元素的 backgroundColor (如果非透明) 或者继续向上找
            }

            // 转换为 Hex 并验证是否有效
            const hex = rgbToHex(bgColor);
            if (hex) {
                return hex;
            }
            current = current.parentElement;
        }
        return '#ffffff'; // 最终回退
    }

    function detectColor() {
        // 采样点策略：
        // 取顶部状态栏下方一点的位置 (x: 50%, y: 10px)
        // 这样能避开完全透明的固定定位 Header，直接取到页面内容的主色
        // 或者如果 Header 有色，也能取到 Header 颜色
        const x = window.innerWidth / 2;
        const y = 5; // 顶部边缘，最接近状态栏的地方
        
        const topElement = document.elementFromPoint(x, y);
        
        if (!topElement) return '#ffffff';
        
        return getVisualBackgroundColor(topElement);
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
            // console.log('Dynamic Status Bar: Color set to', color);
        }
    }

    function update() {
        requestAnimationFrame(() => {
            const color = detectColor();
            setMetaThemeColor(color);
        });
    }

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', update);
    } else {
        update();
    }

    // 深度监听：不仅监听 DOM 变化，也监听滚动
    // 因为滚动可能会让不同颜色的区块进入顶部状态栏区域
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['style', 'class'] 
    });
    
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                update();
                ticking = false;
            });
            ticking = true;
        }
    });

    console.log('Dynamic status bar (Visual Mode) initialized.');
})();
