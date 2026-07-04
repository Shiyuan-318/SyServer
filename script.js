// SyServer Website JavaScript
// Apple-style interactions and animations

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavigation();
    initScrollAnimations();
    initSmoothScroll();
    initParallaxEffect();
    initCounterAnimation();

    // Three.js 粒子背景（等模块加载完成）
    if (window.THREE) {
        initCommunityParticles();
    } else {
        window.addEventListener('three-ready', initCommunityParticles);
    }

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

    const updateNavState = () => {
        if (window.pageYOffset > 8) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
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
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1
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

const qqCopyBtn = document.getElementById('qqCopyBtn');
if (qqCopyBtn) {
    qqCopyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        copyQQNumber();
        this.classList.add('copied');
        setTimeout(() => this.classList.remove('copied'), 2000);
    });
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

// Three.js particle background for community section
function initCommunityParticles() {
    const canvas = document.getElementById('communityCanvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const section = canvas.parentElement;
    let width = section.offsetWidth;
    let height = section.offsetHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 50;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 创建粒子系统
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 120;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

        const colorChoice = Math.random();
        if (colorChoice < 0.5) {
            colors[i * 3] = 0.0;
            colors[i * 3 + 1] = 0.44;
            colors[i * 3 + 2] = 0.89;
        } else if (colorChoice < 0.8) {
            colors[i * 3] = 0.37;
            colors[i * 3 + 1] = 0.36;
            colors[i * 3 + 2] = 0.9;
        } else {
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 1.0;
            colors[i * 3 + 2] = 1.0;
        }

        sizes[i] = Math.random() * 2 + 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 鼠标交互
    let mouseX = 0;
    let mouseY = 0;
    section.addEventListener('mousemove', (e) => {
        const rect = section.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    });

    let animationId = null;

    function animate() {
        animationId = requestAnimationFrame(animate);

        particles.rotation.y += 0.0008;
        particles.rotation.x += 0.0003;

        // 鼠标视差
        camera.position.x += (mouseX * 10 - camera.position.x) * 0.05;
        camera.position.y += (-mouseY * 10 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        // 粒子上下浮动
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3 + 1] += Math.sin(Date.now() * 0.0005 + i) * 0.01;
        }
        geometry.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
    }

    // 只在社区区域可见时才渲染
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!animationId) animate();
            } else {
                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            }
        });
    }, { threshold: 0 });

    observer.observe(section);

    // 窗口大小变化时重新调整
    window.addEventListener('resize', () => {
        width = section.offsetWidth;
        height = section.offsetHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });
}
