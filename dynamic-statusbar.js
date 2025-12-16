(function() {
    /**
     * 将 RGB/RGBA 转换为 Hex 格式，忽略透明度以适配 theme-color
     */
    function rgbToHex(color) {
        if (!color) return null;
        if (color.startsWith('#')) return color;
        
        const rgb = color.match(/\d+/g);
        if (!rgb || rgb.length < 3) return null;
        
        return '#' + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
    }

    /**
     * 获取当前视图的主要背景色
     */
    function getEffectiveBackgroundColor() {
        let element = document.body;
        let bg = window.getComputedStyle(element).backgroundColor;
        
        // 如果 body 透明，向下一级查找第一个非透明的大容器
        if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
            const children = document.body.children;
            for (let i = 0; i < children.length; i++) {
                const el = children[i];
                // 忽略脚本和隐藏元素
                if (el.tagName === 'SCRIPT' || el.style.display === 'none') continue;
                
                const childBg = window.getComputedStyle(el).backgroundColor;
                if (childBg !== 'rgba(0, 0, 0, 0)' && childBg !== 'transparent') {
                    // 只有当元素占据一定面积时才采纳
                    const rect = el.getBoundingClientRect();
                    if (rect.width > window.innerWidth * 0.8 && rect.height > 100) {
                        bg = childBg;
                        break;
                    }
                }
            }
        }
        return rgbToHex(bg) || '#ffffff'; // 默认回退到白色
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
            console.log('Status bar color updated to:', color);
        }
    }

    function update() {
        requestAnimationFrame(() => {
            const color = getEffectiveBackgroundColor();
            setMetaThemeColor(color);
        });
    }

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', update);
    } else {
        update();
    }

    // 监听 Body 样式变化
    const observer = new MutationObserver(update);
    observer.observe(document.body, { 
        attributes: true, 
        attributeFilter: ['style', 'class'],
        childList: true // 监听子元素变化以应对动态加载
    });
    
    // 监听滚动（处理渐变背景或多色块页面）
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

    console.log('Dynamic status bar initialized.');
})();
