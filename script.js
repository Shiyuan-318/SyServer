// SyServer Website JavaScript
// Apple-style interactions and animations

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavigation();
    initScrollAnimations();
    initSmoothScroll();
    initParallaxEffect();
    initCounterAnimation();
    initOnlinePlayers();

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

    // 移动端汉堡菜单
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && nav && navLinks) {
        let closeTimer = null;

        const openMenu = () => {
            clearTimeout(closeTimer);
            // 第一步：display:flex 让面板出现（此时 opacity:0、transform 偏移）
            nav.classList.add('menu-open');
            navToggle.setAttribute('aria-expanded', 'true');
            // 第二步：下一帧再加 is-shown，触发 opacity/transform 过渡
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    navLinks.classList.add('is-shown');
                });
            });
        };

        const closeMenu = () => {
            // 第一步：移除 is-shown，触发淡出动画
            navLinks.classList.remove('is-shown');
            navToggle.setAttribute('aria-expanded', 'false');
            // 第二步：等淡出动画跑完，再 display:none
            clearTimeout(closeTimer);
            closeTimer = setTimeout(() => {
                nav.classList.remove('menu-open');
            }, 450);
        };

        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (nav.classList.contains('menu-open') && navLinks.classList.contains('is-shown')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        // 点击菜单链接后关闭菜单
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // 点击导航栏外部关闭菜单
        document.addEventListener('click', (e) => {
            if (nav.classList.contains('menu-open') && !nav.contains(e.target)) {
                closeMenu();
            }
        });

        // 窗口变大到桌面端时关闭菜单
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                clearTimeout(closeTimer);
                navLinks.classList.remove('is-shown');
                nav.classList.remove('menu-open');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
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

// 查询 Minecraft 服务器在线人数（通过国内 MCStatus API 自动解析 SRV 记录）
// 根据当前页面自动选择对应的服务器地址：
//   - 主页 / survival.html → 生存服 sy1.top
//   - bedwars.html → 起床战争服 mc1-v4.msst2031.cn
function initOnlinePlayers() {
    const span = document.getElementById('onlineCount');
    const dot = document.getElementById('uptimeDot');
    const indicator = document.getElementById('uptimeIndicator');
    if (!span) return;

    // 根据页面路径选服务器地址
    const page = window.location.pathname.split('/').pop();
    // 主页同时查生存服和起床服，显示总在线人数；其他页面只查对应服
    const isHome = page === '' || page === 'index.html';
    let serverHosts;
    if (isHome) {
        serverHosts = ['sy1.top', 'mc1-v4.msst2031.cn'];
    } else if (page === 'bedwars.html') {
        serverHosts = ['mc1-v4.msst2031.cn'];
    } else {
        serverHosts = ['sy1.top'];
    }

    let timer = null;

    const updateUI = (online, count) => {
        if (online) {
            span.textContent = `在线 ${count} 人`;
            if (dot) {
                dot.style.background = '';
                dot.style.animation = '';
            }
            if (indicator) indicator.style.background = '';
        } else {
            span.textContent = '离线';
            if (dot) {
                dot.style.background = '#86868b';
                dot.style.animation = 'none';
            }
            if (indicator) indicator.style.background = 'rgba(255, 255, 255, 0.05)';
        }
    };

    // 查询单个服务器，返回在线人数（离线返回 0）
    const queryOne = async (host) => {
        try {
            const res = await fetch(`https://yun.tbedu.top:16666/3/${host}`);
            if (!res.ok) return 0;
            const data = await res.json();
            if (data.online && data.players) return data.players.online;
            return 0;
        } catch (e) {
            return 0;
        }
    };

    const fetchOnline = async () => {
        // 并发查询所有服务器
        const counts = await Promise.all(serverHosts.map(queryOne));
        const total = counts.reduce((a, b) => a + b, 0);
        // 至少有一个服务器在线就显示总人数；全部离线才显示离线
        updateUI(total > 0, total);
    };

    fetchOnline();
    // 每 60 秒刷新一次（API 自身有约 5 分钟缓存，不会触发频率限制）
    timer = setInterval(fetchOnline, 60000);

    // 页面隐藏时暂停刷新，可见时立即刷新一次
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (timer) { clearInterval(timer); timer = null; }
        } else {
            fetchOnline();
            if (!timer) timer = setInterval(fetchOnline, 60000);
        }
    });
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

// ===== 完整版 Wiki (allwiki) 交互 =====
(function() {
    const sidebar = document.getElementById('allwikiSidebar');
    if (!sidebar) return;

    const toc = document.getElementById('allwikiToc');
    const tocLinks = Array.from(toc.querySelectorAll('.toc-link'));
    const sections = tocLinks
        .map(link => document.getElementById(link.dataset.section))
        .filter(Boolean);
    const searchInput = document.getElementById('wikiSearch');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const content = document.getElementById('allwikiContent');
    const backTop = document.getElementById('backTop');

    // 1. 目录点击：平滑滚动到对应章节，并关闭移动端目录
    tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(link.dataset.section);
            if (!target) return;
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // 关闭移动端目录
            sidebar.classList.remove('open');
            // 更新选中状态
            tocLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // 2. 滚动时高亮当前所在章节
    let currentActive = null;
    const highlightObserver = new IntersectionObserver((entries) => {
        // 找到当前最靠近视口顶部、且可见的章节
        const visible = entries
            .filter(entry => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
            const id = visible[0].target.id;
            if (currentActive !== id) {
                currentActive = id;
                tocLinks.forEach(l => {
                    l.classList.toggle('active', l.dataset.section === id);
                });
                // 让活跃项保持在目录可视区域内
                // 仅在桌面端执行：移动端侧边栏折叠为抽屉式（overflow: hidden，不可自身滚动），
                // 此时调用 scrollIntoView 会误触发整个页面向上滚动，导致滑动异常
                const isDesktop = window.matchMedia('(min-width: 769px)').matches;
                if (isDesktop) {
                    const activeLink = toc.querySelector('.toc-link.active');
                    if (activeLink) {
                        const linkRect = activeLink.getBoundingClientRect();
                        const sidebarRect = sidebar.getBoundingClientRect();
                        if (linkRect.bottom > sidebarRect.bottom - 8) {
                            activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        } else if (linkRect.top < sidebarRect.top + 8) {
                            activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        }
                    }
                }
            }
        }
    }, {
        root: null,
        rootMargin: '-96px 0px -60% 0px',
        threshold: 0
    });

    sections.forEach(section => highlightObserver.observe(section));

    // 3. 指令复制按钮
    document.querySelectorAll('.cmd-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const codeEl = btn.parentElement.querySelector('code');
            if (!codeEl) return;
            const text = codeEl.textContent;
            const showCopied = () => {
                const original = btn.textContent;
                btn.textContent = '已复制';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = original;
                    btn.classList.remove('copied');
                }, 1500);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(showCopied).catch(() => fallbackCopy(text, showCopied));
            } else {
                fallbackCopy(text, showCopied);
            }
        });
    });

    function fallbackCopy(text, cb) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); cb && cb(); } catch (e) {}
        document.body.removeChild(ta);
    }

    // 4. FAQ 折叠
    document.querySelectorAll('.faq-item').forEach(item => {
        const q = item.querySelector('.faq-q');
        if (!q) return;
        q.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            // 关闭其他项（手风琴效果）
            document.querySelectorAll('.faq-item.open').forEach(other => {
                if (other !== item) other.classList.remove('open');
            });
            item.classList.toggle('open', !isOpen);
        });
    });

    // 5. 目录搜索过滤
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const kw = searchInput.value.trim().toLowerCase();
            tocLinks.forEach(link => {
                const text = link.querySelector('.toc-text').textContent.toLowerCase();
                const match = !kw || text.indexOf(kw) !== -1;
                link.classList.toggle('hidden', !match);
            });
            // 隐藏完全没有匹配项的分组标题
            toc.querySelectorAll('.toc-group').forEach(group => {
                const hasVisible = group.querySelector('.toc-link:not(.hidden)');
                group.style.display = hasVisible ? '' : 'none';
            });
        });
    }

    // 6. 移动端目录切换
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // 7. 返回顶部
    if (backTop) {
        backTop.addEventListener('click', (e) => {
            e.preventDefault();
            content.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
})();

