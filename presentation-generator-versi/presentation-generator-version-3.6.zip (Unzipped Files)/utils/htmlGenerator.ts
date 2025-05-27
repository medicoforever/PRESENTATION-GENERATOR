// utils/htmlGenerator.ts

export const validThemes = ['black', 'white', 'league', 'beige', 'sky', 'night', 'serif', 'simple', 'solarized', 'blood', 'moon'];
// validTransitions export removed, as specific transition list is now part of AI prompt.

export const generateFullRevealHtmlPage = (
  coreSlidesHtml: string, // This is the <div class="reveal"><div class="slides">...</div></div>
  theme: string
  // transition parameter removed
): string => {
  const safeTheme = validThemes.includes(theme) ? theme : 'sky'; 
  // safeTransition removed

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Presentation</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/reset.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/reveal.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/theme/${safeTheme}.min.css" id="theme">
    <script src="https://unpkg.com/react@17/umd/react.development.js" crossOrigin="anonymous"></script>
    <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js" crossOrigin="anonymous"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        /* Ensure html, body take full height for reveal to work correctly */
        html, body {
            height: 100%;
            margin: 0;
            overflow: hidden; /* Prevent body scrollbars, reveal handles its own */
        }
        .reveal .slides section {
            overflow-y: auto !important; /* Essential for scrolling */
            max-height: 100vh !important; /* Constrain height to viewport */
            height: 100% !important; /* Make section take full slide height */
            padding: 20px !important; 
            box-sizing: border-box !important; /* Consistent box model */
        }
        /* Custom scrollbar styling (Webkit) */
        .reveal .slides section::-webkit-scrollbar { width: 8px; }
        .reveal .slides section::-webkit-scrollbar-track { background: rgba(128,128,128,0.1); border-radius: 4px; }
        .reveal .slides section::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 4px; }
        .reveal .slides section::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.5); }
        
        .reveal .slides section h1,
        .reveal .slides section h2,
        .reveal .slides section h3,
        .reveal .slides section p,
        .reveal .slides section ul,
        .reveal .slides section ol,
        .reveal .slides section li, 
        .reveal .slides section div,
        .reveal .slides section span, 
        .reveal .slides section blockquote, 
        .reveal .slides section figure, 
        .reveal .slides section img, 
        .reveal .slides section pre {
            margin-bottom: 1em !important; 
            overflow-wrap: break-word !important; 
            max-width: 100% !important; 
            box-sizing: border-box !important; 
        }

        .reveal .slides section img {
            display: block; 
            height: auto !important;   
        }

        .reveal .slides section pre {
            white-space: pre-wrap;  
            overflow-x: auto;       
        }
        
        .reveal .slides section > *:last-child {
            margin-bottom: 0 !important;
        }

        /* Image Zoom Styles */
        #zoom-modal {
            display: none; /* Initially hidden, controlled by JS */
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.85);
            z-index: 20000; /* Higher than Reveal's controls and scroll controls */
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        }
        #zoom-modal.visible {
            display: flex; /* Use flex for centering */
            opacity: 1;
        }
        #zoomed-image {
            max-width: 90vw;
            max-height: 90vh;
            display: block;
            margin: auto;
            border-radius: 5px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.5);
            transform: scale(0.8);
            transition: transform 0.3s ease-in-out;
        }
        #zoom-modal.visible #zoomed-image {
            transform: scale(1);
        }
        #zoom-close-btn {
            position: absolute;
            top: 15px;
            right: 25px;
            color: #ffffff;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
            line-height: 1;
            text-shadow: 0 1px 3px rgba(0,0,0,0.3);
            z-index: 20001; /* Above the image */
        }
        #zoom-close-btn:hover {
            color: #cccccc;
        }
        .reveal .slides section img.zoomable-image {
            cursor: zoom-in;
        }
        body.zoom-modal-open {
            overflow: hidden; /* Prevent body scroll when modal is open */
        }
    </style>
</head>
<body>
    <div id="scroll-controls" style="position: fixed; top: 50%; right: 15px; z-index: 10000; transform: translateY(-50%); display: flex; flex-direction: column; gap: 10px;">
        <button id="scroll-up-btn" aria-label="Scroll slide content up" style="background: rgba(0,0,0,0.6); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">&uarr;</button>
        <button id="scroll-down-btn" aria-label="Scroll slide content down" style="background: rgba(0,0,0,0.6); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">&darr;</button>
    </div>

    ${coreSlidesHtml}

    <div id="zoom-modal">
        <span id="zoom-close-btn" aria-label="Close zoomed image">&times;</span>
        <img id="zoomed-image" src="" alt="Zoomed image">
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/reveal.min.js"></script>
    <script>
        function isElementScrollable(el) {
            if (!el) return false;
            return el.scrollHeight > el.clientHeight;
        }

        function updateScrollControlsVisibility() {
            const currentSlide = Reveal.getCurrentSlide();
            const controls = document.getElementById('scroll-controls');
            if (controls && currentSlide && currentSlide.matches('.reveal .slides section')) {
                const scrollable = isElementScrollable(currentSlide);
                controls.style.display = scrollable ? 'flex' : 'none';
            } else if (controls) {
                controls.style.display = 'none';
            }
        }
        
        document.addEventListener('wheel', function(event) {
            const currentSlide = Reveal.getCurrentSlide();
            if (!currentSlide || !currentSlide.matches('.reveal .slides section')) return;

            let targetElement = event.target;
            let isTargetInsideCurrentSlide = false;
            while(targetElement) {
                if (targetElement === currentSlide) {
                    isTargetInsideCurrentSlide = true;
                    break;
                }
                targetElement = targetElement.parentElement;
            }
            if (!isTargetInsideCurrentSlide) return;

            const currentScrollTop = currentSlide.scrollTop;
            const maxScrollTop = currentSlide.scrollHeight - currentSlide.clientHeight;

            if (event.deltaY > 0) { 
                if (currentScrollTop < maxScrollTop) {
                    event.preventDefault(); 
                    currentSlide.scrollTop = Math.min(currentScrollTop + 60, maxScrollTop);
                }
            } else { 
                if (currentScrollTop > 0) {
                    event.preventDefault(); 
                    currentSlide.scrollTop = Math.max(currentScrollTop - 60, 0);
                }
            }
        }, { passive: false });

        const scrollUpBtn = document.getElementById('scroll-up-btn');
        const scrollDownBtn = document.getElementById('scroll-down-btn');

        if (scrollUpBtn) {
            scrollUpBtn.addEventListener('click', function(e) {
                e.stopPropagation(); 
                const currentSlide = Reveal.getCurrentSlide();
                if (currentSlide && currentSlide.matches('.reveal .slides section')) {
                    currentSlide.scrollTop = Math.max(0, currentSlide.scrollTop - (currentSlide.clientHeight * 0.8));
                }
            });
        }
        if (scrollDownBtn) {
            scrollDownBtn.addEventListener('click', function(e) {
                e.stopPropagation(); 
                const currentSlide = Reveal.getCurrentSlide();
                if (currentSlide && currentSlide.matches('.reveal .slides section')) {
                     currentSlide.scrollTop = Math.min(currentSlide.scrollHeight - currentSlide.clientHeight, currentSlide.scrollTop + (currentSlide.clientHeight * 0.8));
                }
            });
        }
        
        Reveal.initialize({
            hash: true, 
            controls: true, 
            progress: true, 
            center: false, 
            width: "100%", 
            height: "100%", 
            margin: 0, 
            minScale: 1, 
            maxScale: 1, 
            transition: 'none', // Set global to 'none', rely on per-slide data-transition
            transitionSpeed: 'default', 
            autoScroll: false, 
            touch: true, 
            loop: false, 
            rtl: false, 
            navigationMode: 'default', 
            shuffle: false,
            fragments: true, 
            fragmentInURL: false, 
            embedded: false, 
            help: true, 
            pause: true,
            showNotes: false, 
            autoPlayMedia: null, 
            preloadIframes: null, 
            autoAnimate: true,
            autoAnimateEasing: 'ease', 
            autoAnimateDuration: 1.0,
            autoAnimateUnmatched: false, 
            dependencies: [] 
        });

        // --- Image Zoom Functionality START ---
        const zoomModal = document.getElementById('zoom-modal');
        const zoomedImage = document.getElementById('zoomed-image');
        const zoomCloseBtn = document.getElementById('zoom-close-btn');
        const revealSlidesContainer = document.querySelector('.reveal .slides');

        function openZoomModal(imgElement) {
            if (imgElement && zoomModal && zoomedImage) {
                zoomedImage.src = imgElement.src;
                zoomedImage.alt = imgElement.alt || 'Zoomed image';
                zoomModal.classList.add('visible');
                document.body.classList.add('zoom-modal-open');
            }
        }

        function closeZoomModal() {
            if (zoomModal) {
                zoomModal.classList.remove('visible');
                document.body.classList.remove('zoom-modal-open');
                // Delay clearing src until after fade out transition
                setTimeout(() => {
                    if (zoomedImage && !zoomModal.classList.contains('visible')) {
                        zoomedImage.src = ''; 
                        zoomedImage.alt = '';
                    }
                }, 300); // Match CSS transition duration (0.3s)
            }
        }

        if (zoomCloseBtn) {
            zoomCloseBtn.addEventListener('click', closeZoomModal);
        }

        if (zoomModal) {
            zoomModal.addEventListener('click', function(event) {
                if (event.target === zoomModal) { // Click on backdrop
                    closeZoomModal();
                }
            });
        }

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && zoomModal && zoomModal.classList.contains('visible')) {
                closeZoomModal();
            }
        });
        
        function setupZoomableImages(container) {
            if (!container) return;
            // Select img elements that are direct children of p, figure, div or the section itself,
            // are not already processed, and are not inside an anchor tag.
            // Also ensure they have an src attribute.
            const images = container.querySelectorAll(
                'section > img:not(.zoomable-image-processed):not(a > img)[src], p > img:not(.zoomable-image-processed):not(a > img)[src], figure > img:not(.zoomable-image-processed):not(a > img)[src], div > img:not(.zoomable-image-processed):not(a > img)[src]'
            );
            images.forEach(img => {
                // Double check not in anchor, and has src (though selector should handle src)
                // and not a background image for the section.
                const section = img.closest('section');
                const sectionBgImage = section ? section.getAttribute('data-background-image') : null;
                
                if (img.src && !img.closest('a') && (!sectionBgImage || sectionBgImage !== img.src) ) { 
                    img.classList.add('zoomable-image');
                    img.classList.add('zoomable-image-processed');
                    img.setAttribute('role', 'button');
                    img.setAttribute('aria-label', 'Zoom image: ' + (img.alt || 'Image'));
                }
            });
        }
        
        if (revealSlidesContainer) {
            revealSlidesContainer.addEventListener('click', function(event) {
                let target = event.target;
                // Traverse up to find if the click originated from or within a zoomable image
                while (target && target !== revealSlidesContainer) {
                    if (target.tagName === 'IMG' && target.classList.contains('zoomable-image')) {
                        if (target.closest('a')) { // Do not zoom if image is part of a link
                            return; 
                        }
                        openZoomModal(target);
                        event.preventDefault(); 
                        event.stopPropagation();
                        return; // Exit once handled
                    }
                    target = target.parentElement;
                }
            });
        }

        Reveal.on('ready', event => {
            updateScrollControlsVisibility();
            setupZoomableImages(revealSlidesContainer); // Process all slides initially
        });
        Reveal.on('slidechanged', event => {
            updateScrollControlsVisibility();
            if (event.currentSlide) {
                setupZoomableImages(event.currentSlide); // Process only the current slide
            }
        });
        
        Reveal.on('fragmentshown', event => {
            const fragment = event.fragment;
            if (!fragment) return;
            const currentSlide = fragment.closest('section');

            if (currentSlide) { // Process images in the section of the shown fragment
                setupZoomableImages(currentSlide);
            }

            // --- Existing fragment scroll logic ---
            if (!currentSlide || !(fragment instanceof HTMLElement) || fragment.offsetParent === null) {
                return; 
            }

            const originalInlineTransition = fragment.style.transition;
            const originalInlineOpacity = fragment.style.opacity;

            fragment.style.transition = 'none'; 
            fragment.style.opacity = '0';
            
            void fragment.offsetWidth; // Force reflow

            const slideViewTop = currentSlide.scrollTop;
            const slideViewBottom = currentSlide.scrollTop + currentSlide.clientHeight;
            const fragmentTop = fragment.offsetTop;
            const fragmentBottom = fragment.offsetTop + fragment.offsetHeight;
            
            const PADDING = 20; 

            let needsScroll = false;
            let targetScrollValue = currentSlide.scrollTop; 

            if (fragmentBottom > slideViewBottom - PADDING) {
                let tempTargetScrollTop = fragmentTop - currentSlide.clientHeight + fragment.offsetHeight + PADDING;
                tempTargetScrollTop = Math.min(tempTargetScrollTop, currentSlide.scrollHeight - currentSlide.clientHeight);
                tempTargetScrollTop = Math.max(0, tempTargetScrollTop);

                if (tempTargetScrollTop > slideViewTop && Math.abs(tempTargetScrollTop - slideViewTop) >= 1) {
                    needsScroll = true;
                    targetScrollValue = tempTargetScrollTop;
                }
            }
            else if (fragmentTop < slideViewTop + PADDING) {
                let tempTargetScrollTop = fragmentTop - PADDING;
                tempTargetScrollTop = Math.min(tempTargetScrollTop, currentSlide.scrollHeight - currentSlide.clientHeight);
                tempTargetScrollTop = Math.max(0, tempTargetScrollTop);

                if (tempTargetScrollTop < slideViewTop && Math.abs(tempTargetScrollTop - slideViewTop) >= 1) {
                    needsScroll = true;
                    targetScrollValue = tempTargetScrollTop;
                }
            }
            
            const SCROLL_ANIMATION_DURATION = 400; 
            const USER_PERCEPTION_DELAY = 50;   

            let effectiveDelay = USER_PERCEPTION_DELAY; 

            if (needsScroll) {
                effectiveDelay = SCROLL_ANIMATION_DURATION; 
                currentSlide.scrollTo({
                    top: targetScrollValue,
                    behavior: 'smooth'
                });
            }

            setTimeout(() => {
                fragment.style.transition = originalInlineTransition; 
                fragment.style.opacity = originalInlineOpacity;     
            }, effectiveDelay);
            // --- End existing fragment scroll logic ---
        });

        window.addEventListener('resize', () => {
            updateScrollControlsVisibility();
            // Re-check zoomable images as layout changes might affect visibility or new images might fit criteria.
            // For simplicity, re-scan the current slide.
            const currentSlide = Reveal.getCurrentSlide();
            if (currentSlide) {
                // Reset processed state for current slide to re-evaluate if necessary, or simply call setup.
                // A more robust approach might involve more complex state management if performance becomes an issue.
                // For now, just re-running setup is okay for typical presentation sizes.
                // To avoid full re-scan, better to adjust modal size if open, or rely on CSS for responsiveness.
                // Current setup should make images zoomable on load/change/fragment, so resize might not need it unless images are dynamically added/removed on resize itself.
            }
        });
        // --- Image Zoom Functionality END ---
    </script>
</body>
</html>`;
};
