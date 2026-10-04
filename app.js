/**
 * EquationEditor Application Script
 * Pure Vanilla JS
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Preset Formulas Data ---
    const PRESETS = {
        quad: "A solução da equação de segundo grau $$ax^2 + bx + c = 0$$ é dada por:\n\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$",
        euler: "A famosa Identidade de Euler relaciona cinco das constantes matemáticas mais importantes:\n\n$$e^{i\\pi} + 1 = 0$$",
        gauss: "Função de Densidade de Probabilidade da Distribuição Normal:\n\n$$f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}$$",
        fourier: "Transformada de Fourier em tempo contínuo:\n\n$$\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(t) e^{-2\\pi i t \\xi} dt$$",
        maxwell: "Primeira equação de Maxwell (Lei de Gauss para a Eletrostática):\n\n$$\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}$$",
        limit: "Limite fundamental trigonométrico:\n\n$$\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1$$",
        matrix: "Exemplo de Matriz $2 \\times 2$:\n\n$$A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$",
        integral: "Integral definida fundamental:\n\n$$\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)$$"
    };

    // --- DOM Elements ---
    const editorTextarea = document.getElementById('editor-textarea');
    const previewOutput = document.getElementById('preview-output');
    const presetSelect = document.getElementById('preset-select');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const btnShare = document.getElementById('btn-share');
    const btnSaveHistory = document.getElementById('btn-save-history');
    const btnClearEditor = document.getElementById('btn-clear-editor');
    const btnCopyMarkdown = document.getElementById('btn-copy-markdown');
    const btnCopyLatex = document.getElementById('btn-copy-latex');
    const btnCopyPng = document.getElementById('btn-copy-png');
    const btnDownloadPng = document.getElementById('btn-download-png');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const historyList = document.getElementById('history-list');
    const pngTransparentCheckbox = document.getElementById('png-transparent');
    const toastContainer = document.getElementById('toast-container');

    // --- State Management ---
    const STORAGE_KEY_HISTORY = 'eq_editor_history_v1';
    const STORAGE_KEY_THEME = 'eq_editor_theme';
    let history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');

    // --- Toast Notification Helper ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;

        const icon = type === 'error'
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>';

        toast.innerHTML = `${icon}<span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => toast.remove());
        }, 2800);
    }

    // --- Base64 UTF-8 Helpers for Sharing ---
    function encodeBase64Url(str) {
        try {
            const bytes = new TextEncoder().encode(str);
            let bin = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                bin += String.fromCharCode(bytes[i]);
            }
            return btoa(bin)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        } catch (e) {
            console.error('Encoding error', e);
            return '';
        }
    }

    function decodeBase64Url(str) {
        try {
            str = str.replace(/-/g, '+').replace(/_/g, '/');
            while (str.length % 4) {
                str += '=';
            }
            const bin = atob(str);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) {
                bytes[i] = bin.charCodeAt(i);
            }
            return new TextDecoder().decode(bytes);
        } catch (e) {
            console.error('Decoding error', e);
            return null;
        }
    }

    // --- Markdown & KaTeX Rendering ---
    function renderContent() {
        const text = editorTextarea.value.trim();

        if (!text) {
            previewOutput.innerHTML = '<div class="preview-placeholder">Sua equação/texto renderizado aparecerá aqui...</div>';
            return;
        }

        try {
            // Configure marked parser options if needed
            if (typeof marked !== 'undefined') {
                previewOutput.innerHTML = marked.parse(text);
            } else {
                previewOutput.textContent = text;
            }

            // Render math equations with KaTeX
            if (window.renderMathInElement) {
                window.renderMathInElement(previewOutput, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });
            }
        } catch (err) {
            console.error('Rendering error:', err);
        }
    }

    // --- Real-time Input Event ---
    let renderDebounceTimer;
    editorTextarea.addEventListener('input', () => {
        clearTimeout(renderDebounceTimer);
        renderDebounceTimer = setTimeout(renderContent, 100);
    });

    // --- Insert Text at Cursor Position ---
    function insertAtCursor(textToInsert) {
        const startPos = editorTextarea.selectionStart;
        const endPos = editorTextarea.selectionEnd;
        const originalText = editorTextarea.value;

        editorTextarea.value = originalText.substring(0, startPos) + textToInsert + originalText.substring(endPos);

        // Reposition cursor
        const newCursorPos = startPos + textToInsert.length;
        editorTextarea.focus();
        editorTextarea.setSelectionRange(newCursorPos, newCursorPos);

        renderContent();
    }

    // Symbol Toolbar Click Handling
    document.querySelectorAll('.symbol-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const insertValue = btn.getAttribute('data-insert');
            if (insertValue) {
                insertAtCursor(insertValue);
            }
        });
    });

    // Tutorial Example Formula Handling
    document.querySelectorAll('.example-item').forEach(item => {
        const codeToInsert = item.getAttribute('data-code');
        const insertBtn = item.querySelector('.btn-insert-example');

        const handleInsertion = (e) => {
            e.stopPropagation();
            if (codeToInsert) {
                if (editorTextarea.value.trim().length > 0) {
                    insertAtCursor('\n\n' + codeToInsert);
                } else {
                    editorTextarea.value = codeToInsert;
                    renderContent();
                }
                showToast('Exemplo inserido no editor!');
            }
        };

        if (insertBtn) {
            insertBtn.addEventListener('click', handleInsertion);
        }
        item.addEventListener('click', handleInsertion);
    });

    // Presets Dropdown
    presetSelect.addEventListener('change', (e) => {
        const presetKey = e.target.value;
        if (presetKey && PRESETS[presetKey]) {
            editorTextarea.value = PRESETS[presetKey];
            renderContent();
            presetSelect.value = '';
            showToast('Fórmula predefinida inserida!');
        }
    });

    // --- Theme Toggle ---
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY_THEME, theme);
    }

    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        showToast(`Modo ${newTheme === 'dark' ? 'Escuro' : 'Claro'} ativado`);
    });

    // --- History Persistence Operations ---
    function renderHistory() {
        if (history.length === 0) {
            historyList.innerHTML = '<div class="empty-history">Nenhuma equação salva no histórico.</div>';
            return;
        }

        historyList.innerHTML = '';
        history.slice().reverse().forEach((item, index) => {
            const realIndex = history.length - 1 - index;
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';

            const previewText = item.code.replace(/\n/g, ' ');

            historyItem.innerHTML = `
                <div class="history-item-content" title="Clique para carregar no editor">${escapeHtml(previewText)}</div>
                <div class="history-item-actions">
                    <button class="history-item-btn btn-delete" title="Excluir do histórico" data-index="${realIndex}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            `;

            // Load on item content click
            historyItem.querySelector('.history-item-content').addEventListener('click', () => {
                editorTextarea.value = item.code;
                renderContent();
                showToast('Equação carregada do histórico');
            });

            // Delete item button
            historyItem.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteHistoryItem(realIndex);
            });

            historyList.appendChild(historyItem);
        });
    }

    function saveToHistory(code) {
        if (!code.trim()) return;

        // Prevent duplicate consecutive entries
        if (history.length > 0 && history[history.length - 1].code === code) {
            showToast('Equação já está salva no histórico');
            return;
        }

        history.push({ code, timestamp: Date.now() });
        // Limit history size to 30 entries
        if (history.length > 30) {
            history.shift();
        }

        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
        renderHistory();
        showToast('Salvo no histórico!');
    }

    function deleteHistoryItem(index) {
        history.splice(index, 1);
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
        renderHistory();
        showToast('Item removido do histórico');
    }

    btnClearHistory.addEventListener('click', () => {
        if (history.length === 0) return;
        if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
            history = [];
            localStorage.removeItem(STORAGE_KEY_HISTORY);
            renderHistory();
            showToast('Histórico limpo');
        }
    });

    btnSaveHistory.addEventListener('click', () => {
        saveToHistory(editorTextarea.value);
    });

    btnClearEditor.addEventListener('click', () => {
        if (!editorTextarea.value.trim()) return;
        editorTextarea.value = '';
        renderContent();
        showToast('Editor limpo');
    });

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Copy Code Actions ---
    btnCopyMarkdown.addEventListener('click', async () => {
        const code = editorTextarea.value;
        if (!code) {
            showToast('Nada para copiar!', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(code);
            showToast('Código Markdown copiado!');
        } catch (err) {
            showToast('Falha ao copiar para a área de transferência', 'error');
        }
    });

    btnCopyLatex.addEventListener('click', async () => {
        const code = editorTextarea.value;
        if (!code) {
            showToast('Nada para copiar!', 'error');
            return;
        }

        // Extract raw LaTeX from $$ or $ blocks if present
        let latexCode = code;
        const mathMatches = code.match(/\$\$([\s\S]*?)\$\$|\$([\s\S]*?)\$/g);
        if (mathMatches && mathMatches.length > 0) {
            latexCode = mathMatches.map(m => m.replace(/^\$\$?|\$\$?$/g, '').trim()).join('\n\n');
        }

        try {
            await navigator.clipboard.writeText(latexCode);
            showToast('Código LaTeX copiado!');
        } catch (err) {
            showToast('Falha ao copiar LaTeX', 'error');
        }
    });

    // --- PNG Generation Utilities (html2canvas) ---
    async function generateCanvasFromPreview() {
        if (!editorTextarea.value.trim()) {
            showToast('Não há conteúdo no preview para exportar', 'error');
            return null;
        }

        const isTransparent = pngTransparentCheckbox.checked;
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const computedStyle = getComputedStyle(document.body);
        const cardBgColor = computedStyle.getPropertyValue('--bg-card').trim();

        // Create temporary container for clean canvas rendering
        const clone = previewOutput.cloneNode(true);
        clone.style.width = 'fit-content';
        clone.style.maxWidth = '800px';
        clone.style.padding = '2rem';
        clone.style.position = 'absolute';
        clone.style.top = '-9999px';
        clone.style.left = '-9999px';
        clone.style.backgroundColor = isTransparent ? 'transparent' : cardBgColor;
        document.body.appendChild(clone);

        try {
            const canvas = await html2canvas(clone, {
                backgroundColor: isTransparent ? null : cardBgColor,
                scale: 3, // High DPI / Retina crispness
                useCORS: true,
                logging: false
            });
            document.body.removeChild(clone);
            return canvas;
        } catch (err) {
            if (document.body.contains(clone)) {
                document.body.removeChild(clone);
            }
            console.error('PNG render error:', err);
            showToast('Erro ao gerar imagem PNG', 'error');
            return null;
        }
    }

    btnDownloadPng.addEventListener('click', async () => {
        const canvas = await generateCanvasFromPreview();
        if (!canvas) return;

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `equacao-${Date.now()}.png`;
        link.href = image;
        link.click();
        showToast('PNG baixado com sucesso!');
    });

    btnCopyPng.addEventListener('click', async () => {
        const canvas = await generateCanvasFromPreview();
        if (!canvas) return;

        canvas.toBlob(async (blob) => {
            if (!blob) {
                showToast('Erro ao converter imagem em blob', 'error');
                return;
            }
            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                showToast('Imagem PNG copiada para a área de transferência!');
            } catch (err) {
                console.error('Copy PNG error:', err);
                showToast('O navegador não suporta copiar PNG diretamente. Tente "Baixar PNG".', 'error');
            }
        }, 'image/png');
    });

    // --- Share Link via URL Hash (Base64) ---
    btnShare.addEventListener('click', async () => {
        const code = editorTextarea.value.trim();
        if (!code) {
            showToast('Digite uma equação antes de compartilhar', 'error');
            return;
        }

        const encoded = encodeBase64Url(code);
        const url = `${window.location.origin}${window.location.pathname}#eq=${encoded}`;

        try {
            await navigator.clipboard.writeText(url);
            // Also update location hash
            window.location.hash = `eq=${encoded}`;
            showToast('Link de compartilhamento copiado!');
        } catch (err) {
            showToast('Falha ao copiar link de compartilhamento', 'error');
        }
    });

    function loadFromUrlHash() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#eq=')) {
            const encodedData = hash.replace('#eq=', '');
            const decoded = decodeBase64Url(encodedData);
            if (decoded) {
                editorTextarea.value = decoded;
                renderContent();
                showToast('Equação carregada do link de compartilhamento!');
            }
        }
    }

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        // Ctrl + S or Cmd + S to save to history
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveToHistory(editorTextarea.value);
        }
    });

    // --- Initial Load Routine ---
    renderHistory();
    loadFromUrlHash();
    if (!editorTextarea.value.trim()) {
        // Load default starting equation
        editorTextarea.value = PRESETS.quad;
    }
    renderContent();
});
