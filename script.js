/* =========================================================
   MUNDO DE EUDORA
   NAVEGAÇÃO SPA + MÚSICA CONTÍNUA + VIRADA DE PÁGINA
   A música fica em um único <audio> e NÃO é recriada
   durante a troca dos capítulos.
========================================================= */

(() => {
    "use strict";

    const PAGE_TURN_TIME = 680;
    const MUSIC_VOLUME = 0.30;
    const MUSIC_KEY = "eudoraMusicEnabled";
    const MUSIC_TIME_KEY = "eudoraMusicTime";

    let changingPage = false;
    let currentPage = getPage();

    const music = document.getElementById("backgroundMusic");
    const musicButton = document.getElementById("musicButton");

    /* =====================================================
       PÁGINA ATUAL
    ===================================================== */

    function getPage() {
        return document.querySelector(
            ".chapter-page, .welcome-page, .final-page"
        );
    }

    function initializePage() {
        currentPage = getPage();

        if (!currentPage) return;

        currentPage.classList.remove(
            "book-page-forward",
            "book-page-back"
        );

        if (currentPage.classList.contains("chapter-page")) {
            currentPage.classList.add("chapter-loaded");
        }

        requestAnimationFrame(() => {
            currentPage.classList.add("book-page-enter");
        });

        currentPage
            .querySelectorAll(".comic-image")
            .forEach((image) => {
                image.addEventListener("click", () => {
                    image.classList.toggle("zoomed");
                });
            });

        attachNavigationLinks();
    }

    /* =====================================================
       MÚSICA — UM ÚNICO ELEMENTO DURANTE TODO O SITE
    ===================================================== */

    function updateMusicButton() {
        if (!musicButton || !music) return;

        if (music.paused) {
            musicButton.textContent = "🔇";
            musicButton.setAttribute("aria-label", "Ativar música");
            musicButton.classList.remove("music-playing");
        } else {
            musicButton.textContent = "♪";
            musicButton.setAttribute("aria-label", "Pausar música");
            musicButton.classList.add("music-playing");
        }
    }

    async function startMusic() {
        if (!music) return;

        try {
            await music.play();
            localStorage.setItem(MUSIC_KEY, "true");
            updateMusicButton();
        } catch (_) {
            updateMusicButton();
        }
    }

    function stopMusic() {
        if (!music) return;

        music.pause();
        localStorage.setItem(MUSIC_KEY, "false");

        try {
            localStorage.setItem(
                MUSIC_TIME_KEY,
                String(music.currentTime)
            );
        } catch (_) {}

        updateMusicButton();
    }

    if (music) {
        music.volume = MUSIC_VOLUME;
        music.loop = true;

        /*
           Só restaura a posição se o navegador realmente
           estiver abrindo o site pela primeira vez ou após
           um recarregamento. Durante as trocas internas,
           o mesmo elemento <audio> continua vivo.
        */
        const savedTime = Number(
            localStorage.getItem(MUSIC_TIME_KEY)
        );

        if (
            Number.isFinite(savedTime) &&
            savedTime > 0 &&
            savedTime < 999999
        ) {
            music.addEventListener(
                "loadedmetadata",
                () => {
                    try {
                        if (savedTime < music.duration) {
                            music.currentTime = savedTime;
                        }
                    } catch (_) {}
                },
                { once: true }
            );
        }

        if (musicButton) {
            musicButton.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();

                if (music.paused) {
                    startMusic();
                } else {
                    stopMusic();
                }
            });
        }

        music.addEventListener("play", updateMusicButton);
        music.addEventListener("pause", updateMusicButton);

        music.addEventListener("timeupdate", () => {
            if (!music.paused) {
                try {
                    localStorage.setItem(
                        MUSIC_TIME_KEY,
                        String(music.currentTime)
                    );
                } catch (_) {}
            }
        });

        updateMusicButton();

        /*
           Se a pessoa já havia ativado a música,
           tentamos continuar ao abrir o site novamente.
        */
        if (localStorage.getItem(MUSIC_KEY) === "true") {
            startMusic();
        }

        /*
           Ajuda a liberar o áudio em navegadores que bloqueiam
           autoplay. Esta interação acontece apenas uma vez.
        */
        const firstInteraction = () => {
            if (
                localStorage.getItem(MUSIC_KEY) !== "false" &&
                music.paused
            ) {
                startMusic();
            }
        };

        document.addEventListener(
            "pointerdown",
            firstInteraction,
            { once: true }
        );

        document.addEventListener(
            "keydown",
            firstInteraction,
            { once: true }
        );
    }

    /* =====================================================
       DIREÇÃO DA VIRADA
    ===================================================== */

    function getDirection(link) {
        const text = (link.textContent || "")
            .trim()
            .toLowerCase();

        const aria = (link.getAttribute("aria-label") || "")
            .toLowerCase();

        const href = (link.getAttribute("href") || "")
            .toLowerCase();

        const combined = `${text} ${aria}`;

        if (
            combined.includes("anterior") ||
            combined.includes("voltar") ||
            combined.includes("início") ||
            combined.includes("inicio") ||
            combined.includes("←") ||
            href.endsWith("index.html")
        ) {
            return "back";
        }

        return "forward";
    }

    /* =====================================================
       LINKS INTERNOS
    ===================================================== */

    function isInternalHTML(href) {
        if (!href) return false;

        if (
            href.startsWith("#") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:") ||
            href.startsWith("javascript:")
        ) {
            return false;
        }

        try {
            const url = new URL(href, window.location.href);

            return (
                url.origin === window.location.origin &&
                /\.html?$/i.test(url.pathname)
            );
        } catch (_) {
            return false;
        }
    }

    /* =====================================================
       CARREGA A PRÓXIMA PÁGINA SEM RECARREGAR O DOCUMENTO
       O <audio> permanece intacto — aqui está a solução
       para a música não sofrer o corte entre capítulos.
    ===================================================== */

    async function navigateTo(link, options = {}) {
        if (changingPage) return;

        const href = link.getAttribute("href");
        if (!isInternalHTML(href)) return;

        const destination = new URL(href, window.location.href);
        const direction = getDirection(link);
        const shouldPushState = options.pushState !== false;

        changingPage = true;

        /* Começa a buscar a próxima página imediatamente. */
        const pageRequest = fetch(destination.href, {
            credentials: "same-origin",
            cache: "no-cache"
        }).then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.text();
        });

        /* Inicia a virada da página atual. */
        if (currentPage) {
            currentPage.classList.remove(
                "book-page-forward",
                "book-page-back"
            );

            void currentPage.offsetWidth;

            currentPage.classList.add(
                direction === "back"
                    ? "book-page-back"
                    : "book-page-forward"
            );
        }

        try {
            const html = await pageRequest;
            const parser = new DOMParser();
            const nextDocument = parser.parseFromString(
                html,
                "text/html"
            );

            const nextPage = nextDocument.querySelector(
                ".chapter-page, .welcome-page, .final-page"
            );

            if (!nextPage) {
                throw new Error("Página principal não encontrada.");
            }

            /* Aguarda o tempo da animação para trocar o conteúdo. */
            await wait(PAGE_TURN_TIME);

            if (shouldPushState) {
                history.pushState({}, "", destination.href);
            }

            /*
               SOMENTE o conteúdo da página é substituído.
               O áudio e o botão de música continuam sendo
               exatamente os mesmos elementos DOM.
            */
            const oldPage = getPage();
            if (oldPage) {
                oldPage.replaceWith(nextPage);
            } else {
                document.body.appendChild(nextPage);
            }

            document.title = nextDocument.title || "Mundo de Eudora";

            /* Garante que o conteúdo fique visível e preparado. */
            initializePage();

            window.scrollTo({
                top: 0,
                left: 0,
                behavior: "instant"
            });

            changingPage = false;
        } catch (error) {
            console.error("Erro ao trocar de página:", error);

            /*
               Fallback: se o Live Server/servidor não permitir
               fetch, ainda abrimos a página normalmente.
            */
            window.location.href = destination.href;
        }
    }

    function wait(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    function attachNavigationLinks() {
        const links = document.querySelectorAll("a[href]");

        links.forEach((link) => {
            if (link.dataset.eudoraNavigation === "true") return;
            if (!isInternalHTML(link.getAttribute("href"))) return;

            link.dataset.eudoraNavigation = "true";

            link.addEventListener("click", (event) => {
                if (
                    event.ctrlKey ||
                    event.metaKey ||
                    event.shiftKey ||
                    event.altKey ||
                    event.button !== 0
                ) {
                    return;
                }

                event.preventDefault();
                navigateTo(link);
            });
        });
    }

    /* =====================================================
       BOTÃO INICIAL
    ===================================================== */

    const enterButton = document.querySelector(".enter-button");

    if (enterButton && music) {
        enterButton.addEventListener("click", () => {
            if (music.paused) {
                startMusic();
            }
        });
    }

    /* =====================================================
       BOTÕES DO NAVEGADOR: VOLTAR / AVANÇAR
       Também mantêm o áudio intacto.
    ===================================================== */

    window.addEventListener("popstate", async () => {
        if (changingPage) return;

        const href = window.location.href;
        const fakeLink = document.createElement("a");
        fakeLink.href = href;
        fakeLink.textContent = "← voltar";

        /* Ao usar o botão do navegador, não criamos outro history state. */
        await navigateTo(fakeLink, { pushState: false });
    });

    /* =====================================================
       ACESSIBILIDADE / REDUCED MOTION
    ===================================================== */

    if (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        document.documentElement.classList.add("reduced-motion");
    }

    /* Inicialização da página atual. */
    initializePage();
})();
