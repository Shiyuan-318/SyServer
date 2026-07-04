// SyServer Website JavaScript
// Apple-style interactions and animations

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavigation();
    initScrollAnimations();
    initSmoothScroll();
    initParallaxEffect();
    initCounterAnimation();

    // Random hero showcase image
    const heroImg = document.getElementById('heroShowcaseImg');
    if (heroImg) {
        const images = ['Picture0.jpg', 'Picture1.jpg'];
        heroImg.src = images[Math.floor(Math.random() * images.length)];
    }
});

// Navigation - morphs from a full-width strip (at the very top) into the
// floating rounded pill once the user starts scrolling down.
function initNavigation() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    // 页面标题元素（活动/Wiki/协议/附魔页有 .wiki-hero-title）
    const pageTitle = document.querySelector('.wiki-hero-title');
    const navTitle = document.getElementById('navPageTitle');

    const updateNavState = () => {
        if (window.pageYOffset > 8) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        // 仅当导航栏存在页面标题占位时才处理
        if (navTitle && pageTitle) {
            // 标题底部相对视口的位置
            const rect = pageTitle.getBoundingClientRect();
            // 当标题底部已滚出视口顶部（被导航栏遮挡）时显示导航栏标题
            const navBottom = nav.getBoundingClientRect().bottom;
            if (rect.bottom < navBottom) {
                nav.classList.add('show-page-title');
            } else {
                nav.classList.remove('show-page-title');
            }
        }
    };

    updateNavState();
    window.addEventListener('scroll', updateNavState, { passive: true });
    window.addEventListener('resize', updateNavState, { passive: true });
}

// Scroll animations using Intersection Observer
function initScrollAnimations() {
    const animateElements = document.querySelectorAll('[data-animate]');

    if (!animateElements.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, {
        root: null,
        rootMargin: '-15% 0px -15% 0px',
        threshold: 0
    });

    animateElements.forEach(el => observer.observe(el));
}

// Smooth scroll for navigation links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const navHeight = document.querySelector('.nav').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Parallax effect for hero section
function initParallaxEffect() {
    const hero = document.querySelector('.hero');
    const blocks = document.querySelectorAll('.block');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * 0.3;
        
        if (scrolled < window.innerHeight) {
            blocks.forEach((block, index) => {
                const speed = 0.1 + (index * 0.05);
                block.style.transform = `translateY(${scrolled * speed}px)`;
            });
        }
    });
}

// Counter animation for stats
function initCounterAnimation() {
    const stats = document.querySelectorAll('.stat-number');
    
    const animateCounter = (element) => {
        const text = element.textContent;
        const number = parseInt(text.replace(/\D/g, ''));
        const suffix = text.replace(/[\d]/g, '');
        
        if (isNaN(number)) return;
        
        let current = 0;
        const increment = number / 50;
        const duration = 1500;
        const stepTime = duration / 50;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= number) {
                element.textContent = text;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current) + suffix;
            }
        }, stepTime);
    };
    
    // Use Intersection Observer to trigger counter animation
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    stats.forEach(stat => observer.observe(stat));
}

// Button click feedback
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        // Create ripple effect
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
        `;
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// Add ripple animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Minecraft block hover effect
document.querySelectorAll('.block').forEach(block => {
    block.addEventListener('mouseenter', function() {
        this.style.animation = 'none';
        this.style.transform = 'scale(1.1) rotateY(10deg)';
        this.style.transition = 'transform 0.3s ease';
    });
    
    block.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1) rotateY(0deg)';
        setTimeout(() => {
            this.style.animation = 'float 3s ease-in-out infinite';
        }, 300);
    });
});

// Feature card tilt effect
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});

// Server card hover effect with image zoom
document.querySelectorAll('.server-card').forEach(card => {
    const image = card.querySelector('.minecraft-landscape');
    
    card.addEventListener('mouseenter', function() {
        if (image) {
            image.style.transform = 'scale(1.05)';
            image.style.transition = 'transform 0.5s ease';
        }
    });
    
    card.addEventListener('mouseleave', function() {
        if (image) {
            image.style.transform = 'scale(1)';
        }
    });
});

// Screenshot Slider for Survival Server
function initScreenshotSlider() {
    const slider = document.querySelector('.screenshot-slider');
    if (!slider) return;
    
    const screenshots = slider.querySelectorAll('.server-screenshot');
    const dots = slider.querySelectorAll('.dot');
    let currentIndex = 0;
    let autoPlayInterval;
    
    function showScreenshot(index) {
        screenshots.forEach((img, i) => {
            img.classList.toggle('active', i === index);
        });
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        currentIndex = index;
    }
    
    function nextScreenshot() {
        const nextIndex = (currentIndex + 1) % screenshots.length;
        showScreenshot(nextIndex);
    }
    
    // Auto play
    function startAutoPlay() {
        autoPlayInterval = setInterval(nextScreenshot, 4000);
    }
    
    function stopAutoPlay() {
        clearInterval(autoPlayInterval);
    }
    
    // Dot click events
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showScreenshot(index);
            stopAutoPlay();
            startAutoPlay();
        });
    });
    
    // Pause on hover
    slider.addEventListener('mouseenter', stopAutoPlay);
    slider.addEventListener('mouseleave', startAutoPlay);
    
    // Start auto play
    startAutoPlay();
}

// Initialize screenshot slider when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initScreenshotSlider();
});

// Copy QQ number to clipboard
function copyQQNumber() {
    navigator.clipboard.writeText('250904271').then(() => {
        // Show tooltip
        const tooltip = document.createElement('div');
        tooltip.textContent = '已复制到剪贴板';
        tooltip.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            animation: fadeInUp 0.3s ease;
        `;
        document.body.appendChild(tooltip);

        setTimeout(() => {
            tooltip.style.animation = 'fadeOutDown 0.3s ease';
            setTimeout(() => tooltip.remove(), 300);
        }, 2000);
    });
}

const qqNumber = document.querySelector('.qq-number');
if (qqNumber) {
    qqNumber.style.cursor = 'pointer';
    qqNumber.addEventListener('click', copyQQNumber);
}

// Add tooltip animations
const tooltipStyle = document.createElement('style');
tooltipStyle.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes fadeOutDown {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
        }
    }
`;
document.head.appendChild(tooltipStyle);

// Preload animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');

    // Animate hero showcase (centered screenshot) + bottom strip on the homepage
    const showcase = document.querySelector('.hero-showcase');
    if (showcase) {
        showcase.style.opacity = '0';
        showcase.style.transform = 'translateY(28px) scale(0.985)';
        showcase.style.transition = 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';

        requestAnimationFrame(() => {
            setTimeout(() => {
                showcase.style.opacity = '1';
                showcase.style.transform = 'translateY(0) scale(1)';
            }, 100);
        });
    }

    const bottomBar = document.querySelector('.hero-bottom-bar');
    if (bottomBar) {
        bottomBar.style.opacity = '0';
        bottomBar.style.transform = 'translateY(20px)';
        bottomBar.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s';

        requestAnimationFrame(() => {
            setTimeout(() => {
                bottomBar.style.opacity = '1';
                bottomBar.style.transform = 'translateY(0)';
            }, 160);
        });
    }
});

// Reduced motion preference
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.block').forEach(block => {
        block.style.animation = 'none';
    });
}

// Wiki accordion
document.querySelectorAll('.wiki-header').forEach(header => {
    header.addEventListener('click', function() {
        const item = this.parentElement;
        const isActive = item.classList.contains('active');

        // Close all items
        document.querySelectorAll('.wiki-item').forEach(i => {
            i.classList.remove('active');
        });

        // Toggle clicked item
        if (!isActive) {
            item.classList.add('active');
        }
    });
});

// ===== 活动页日历 =====
(function() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;

    const titleEl = document.getElementById('calendarTitle');
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const shell = document.querySelector('.calendar-shell');
    const detailEmpty = document.getElementById('detailEmpty');
    const detailContent = document.getElementById('detailContent');
    const detailTraffic = document.getElementById('detailTraffic');
    const detailClose = document.getElementById('detailClose');

    // 活动数据
    const events = [
        {
            date: '2026-07-16',
            title: 'GameDay',
            desc: '依托即将发布的全新 SyPlugin 系列插件，在生存服中进行小游戏大赛。',
            badge: '即将到来'
        },
        {
            date: '2026-08-08',
            title: '建筑节',
            desc: '在任意位置建设新建筑，看看谁建的更好？',
            badge: '即将到来'
        },
        {
            date: '2026-08-20',
            title: 'SyServer两周年庆典',
            desc: '与 SyServer 共度两周年，感谢一路相伴的每一位玩家，更多精彩内容敬请期待。',
            badge: '即将到来'
        },
        {
            date: '2026-12-31',
            title: '2027跨年活动',
            desc: '跨年夜与好友齐聚 SyServer，共同迎接 2027 年的到来，活动详情即将公布。',
            badge: '筹备中'
        }
    ];

    // 用对象索引活动，方便查找
    const eventMap = {};
    events.forEach(e => { eventMap[e.date] = e; });

    const today = new Date();
    const todayStr = formatDate(today);

    // 当前显示的月份
    let viewYear = 2026;
    let viewMonth = 6; // 0-based，6 = 7月

    function formatDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // 获取农历显示文字
    function getLunarText(year, month, day) {
        try {
            if (typeof Lunar === 'undefined') return '';
            const lunar = Lunar.fromYmd(year, month, day);
            const dayText = lunar.getDayInChinese();
            // 如果是初一，显示月份；否则显示日
            if (lunar.getDay() === 1) {
                return lunar.getMonthInChinese() + '月';
            }
            // 节气优先
            const jieQi = lunar.getJieQi();
            if (jieQi) return jieQi;
            // 节日
            const festivals = lunar.getFestivals();
            if (festivals.length > 0) return festivals[0];
            return dayText;
        } catch (e) {
            return '';
        }
    }

    // 计算距离某天还有几天（返回负数表示已过）
    function daysUntil(dateStr) {
        const target = new Date(dateStr + 'T00:00:00');
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const diff = target - now;
        return Math.round(diff / (1000 * 60 * 60 * 24));
    }

    function render() {
        titleEl.textContent = `${viewYear}年 ${viewMonth + 1}月`;
        calendarGrid.innerHTML = '';

        // 当月第一天是星期几
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

        // 生成 42 格（6 行 × 7 列）
        const cells = [];
        // 上月剩余
        for (let i = firstDay - 1; i >= 0; i--) {
            cells.push({ day: daysInPrevMonth - i, otherMonth: true, monthOffset: -1 });
        }
        // 本月
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push({ day: d, otherMonth: false, monthOffset: 0 });
        }
        // 下月补齐
        let nextDay = 1;
        while (cells.length < 42) {
            cells.push({ day: nextDay++, otherMonth: true, monthOffset: 1 });
        }

        cells.forEach(cell => {
            const el = document.createElement('div');
            el.className = 'cal-day';
            if (cell.otherMonth) el.classList.add('other-month');

            // 计算真实日期
            let realYear = viewYear;
            let realMonth = viewMonth + cell.monthOffset;
            if (realMonth < 0) { realMonth = 11; realYear--; }
            if (realMonth > 11) { realMonth = 0; realYear++; }
            const dateStr = `${realYear}-${String(realMonth + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;

            // 公历
            const solar = document.createElement('span');
            solar.className = 'solar';
            solar.textContent = cell.day;
            el.appendChild(solar);

            // 农历
            const lunarText = getLunarText(realYear, realMonth + 1, cell.day);
            if (lunarText) {
                const lunar = document.createElement('span');
                lunar.className = 'lunar';
                lunar.textContent = lunarText;
                el.appendChild(lunar);
            }

            // 今天
            if (dateStr === todayStr && !cell.otherMonth) {
                el.classList.add('today');
            }

            // 有活动
            if (eventMap[dateStr]) {
                el.classList.add('has-event');
                el.dataset.date = dateStr;
                const dot = document.createElement('span');
                dot.className = 'event-dot';
                el.appendChild(dot);

                el.addEventListener('click', () => selectDate(dateStr, el));
            }

            calendarGrid.appendChild(el);
        });
    }

    function selectDate(dateStr, el) {
        // 清除之前的选中
        document.querySelectorAll('.cal-day.selected').forEach(d => d.classList.remove('selected'));
        el.classList.add('selected');

        const ev = eventMap[dateStr];
        if (!ev) return;

        shell.classList.add('has-detail');
        detailEmpty.style.display = 'none';
        detailContent.hidden = false;
        detailTraffic.hidden = false;

        // 清除 closeDetail 残留的脱离文档流样式，恢复正常布局
        detailContent.style.position = '';
        detailContent.style.inset = '';
        detailContent.style.padding = '';
        detailContent.style.opacity = '';
        detailTraffic.style.opacity = '';
        clearTimeout(closeDetail._timer);

        // 解析日期
        const [y, m, d] = dateStr.split('-').map(Number);

        // 农历
        let lunarDisplay = '';
        try {
            if (typeof Lunar !== 'undefined') {
                const lunar = Lunar.fromYmd(y, m, d);
                const monthStr = lunar.getMonthInChinese() + '月';
                let dayStr = lunar.getDayInChinese();
                const jieQi = lunar.getJieQi();
                if (jieQi) dayStr = jieQi;
                const festivals = lunar.getFestivals();
                lunarDisplay = ` · ${monthStr}${dayStr}`;
                if (festivals.length > 0) lunarDisplay = ` · ${festivals[0]}`;
            }
        } catch (e) {}

        // 倒计时
        const days = daysUntil(dateStr);
        let countdownHtml = '';
        if (days > 0) {
            countdownHtml = `
                <div class="detail-countdown">
                    <span>距离活动还有</span>
                    <span class="countdown-num">${days}</span>
                    <span>天</span>
                </div>
            `;
        } else if (days === 0) {
            countdownHtml = `
                <div class="detail-countdown">
                    <span class="countdown-num">今天</span>
                </div>
            `;
        } else {
            countdownHtml = `
                <div class="detail-countdown countdown-past">
                    <span>活动已结束</span>
                    <span class="countdown-num">${Math.abs(days)}</span>
                    <span>天</span>
                </div>
            `;
        }

        detailContent.innerHTML = `
            <div class="detail-date-row">
                <span class="detail-day">${d}</span>
                <span class="detail-month-year">${y}年${m}月${lunarDisplay}</span>
            </div>
            <span class="detail-badge ${ev.badge === '筹备中' ? 'future' : ''}">${ev.badge}</span>
            <h2 class="detail-title">${ev.title}</h2>
            <div class="detail-divider"></div>
            <p class="detail-desc">${ev.desc}</p>
            <div class="detail-meta">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                <span>${y}.${String(m).padStart(2,'0')}.${String(d).padStart(2,'0')}</span>
            </div>
            ${countdownHtml}
        `;
    }

    // 关闭详情
    function closeDetail() {
        shell.classList.remove('has-detail');
        document.querySelectorAll('.cal-day.selected').forEach(d => d.classList.remove('selected'));

        // 让内容脱离文档流后再淡出，避免容器收缩时内容换行撑高详情区域
        detailContent.style.position = 'absolute';
        detailContent.style.inset = '0';
        detailContent.style.padding = '32px';
        detailContent.style.opacity = '0';
        detailTraffic.style.opacity = '0';

        // 容器收缩完成后，清理内容并恢复空状态
        clearTimeout(closeDetail._timer);
        closeDetail._timer = setTimeout(() => {
            detailContent.hidden = true;
            detailContent.style.opacity = '';
            detailContent.style.position = '';
            detailContent.style.inset = '';
            detailContent.style.padding = '';
            detailTraffic.hidden = true;
            detailTraffic.style.opacity = '';
            detailEmpty.style.display = '';
        }, 600);
    }

    if (detailClose) {
        detailClose.addEventListener('click', closeDetail);
    }

    prevBtn.addEventListener('click', () => {
        viewMonth--;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        render();
    });

    nextBtn.addEventListener('click', () => {
        viewMonth++;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        render();
    });

    render();
})();

