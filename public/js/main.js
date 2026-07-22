document.addEventListener('DOMContentLoaded', () => {
  // Initialize network
  Network.init();
  
  // Check URL for room code (joining via shared link)
  const urlParams = new URLSearchParams(window.location.search);
  const paramCode = urlParams.get('room');
  const pathMatch = window.location.pathname.match(/\/room\/([A-Z0-9]{4})/i);
  const autoCode = (paramCode || (pathMatch ? pathMatch[1] : '')).toUpperCase();

  if (autoCode && autoCode.length === 4) {
    const codeInput = document.getElementById('join-code-input');
    if (codeInput) codeInput.value = autoCode;

    setTimeout(() => {
      const name = getPlayerName();
      if (name) {
        localStorage.setItem('playerName', name);
        Network.joinRoom(autoCode, name);
      }
    }, 600);
  }
  
  // Load saved player name from localStorage
  const savedName = localStorage.getItem('playerName');
  if (savedName) {
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) nameInput.value = savedName;
  }
  
  // Button event listeners
  // Create Game
  const btnCreate = document.getElementById('btn-create-game');
  if (btnCreate) btnCreate.addEventListener('click', () => {
    const name = getPlayerName();
    if (!name) return;
    localStorage.setItem('playerName', name);
    Network.createRoom(name);
  });
  
  // Join Game
  const btnJoin = document.getElementById('btn-join-game');
  if (btnJoin) btnJoin.addEventListener('click', () => {
    const name = getPlayerName();
    const codeInput = document.getElementById('join-code-input');
    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
    if (!name) return;
    if (!code || code.length !== 4) {
      UI.showNotification('Please enter a valid 4-character room code', 'warning');
      return;
    }
    localStorage.setItem('playerName', name);
    Network.joinRoom(code, name);
  });
  
  // Add Bot (host only)
  const btnAddBot = document.getElementById('btn-add-bot');
  if (btnAddBot) btnAddBot.addEventListener('click', () => {
    Network.socket.emit('add-bot');
  });
  
  // Start Game (host only)
  const btnStart = document.getElementById('btn-start-game');
  if (btnStart) btnStart.addEventListener('click', () => {
    Network.startGame();
  });
  
  // Copy Link
  const btnCopy = document.getElementById('btn-copy-link');
  if (btnCopy) btnCopy.addEventListener('click', () => {
    const linkEl = document.getElementById('shareable-link');
    const link = linkEl ? linkEl.textContent : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        UI.showNotification('Link copied!', 'success');
      });
    }
  });
  
  // Draw Cards (Button & Draw Pile Deck)
  const btnDraw = document.getElementById('btn-draw-cards');
  if (btnDraw) btnDraw.addEventListener('click', () => {
    Network.drawCards();
  });

  const drawPile = document.getElementById('draw-pile');
  if (drawPile) {
    drawPile.style.cursor = 'pointer';
    drawPile.addEventListener('click', () => {
      if (UI.isMyTurn() && UI.currentState && UI.currentState.phase === 'DRAW') {
        Network.drawCards();
      }
    });
  }
  
  // End Turn
  const btnEnd = document.getElementById('btn-end-turn');
  if (btnEnd) btnEnd.addEventListener('click', () => {
    Network.endTurn();
  });
  
  // Card Action Modal buttons
  const btnPlayProp = document.getElementById('btn-play-as-property');
  if (btnPlayProp) btnPlayProp.addEventListener('click', () => {
    UI.handlePlayAsProperty();
  });
  const btnPlayBank = document.getElementById('btn-play-as-bank');
  if (btnPlayBank) btnPlayBank.addEventListener('click', () => {
    UI.handlePlayAsBank();
  });
  const btnPlayAction = document.getElementById('btn-play-as-action');
  if (btnPlayAction) btnPlayAction.addEventListener('click', () => {
    UI.handlePlayAsAction();
  });
  
  // Action Response Modal
  const btnAccept = document.getElementById('btn-accept-action');
  if (btnAccept) btnAccept.addEventListener('click', () => {
    Network.respondToAction(true);
    UI.hideAllModals();
  });
  const btnCounter = document.getElementById('btn-counter-action');
  if (btnCounter) btnCounter.addEventListener('click', () => {
    UI.handleCounter();
  });
  
  // Payment confirm
  const btnConfirmPay = document.getElementById('btn-confirm-payment');
  if (btnConfirmPay) btnConfirmPay.addEventListener('click', () => {
    UI.handleConfirmPayment();
  });
  
  // Discard confirm
  const btnConfirmDiscard = document.getElementById('btn-confirm-discard');
  if (btnConfirmDiscard) btnConfirmDiscard.addEventListener('click', () => {
    UI.handleConfirmDiscard();
  });
  
  // Play Again
  const btnPlayAgain = document.getElementById('btn-play-again');
  if (btnPlayAgain) btnPlayAgain.addEventListener('click', () => {
    window.location.reload();
  });
  
  // Leave Room
  const btnLeave = document.getElementById('btn-leave-room');
  if (btnLeave) btnLeave.addEventListener('click', () => {
    window.location.href = '/';
  });
  
  // Rules
  const btnShowRules = document.getElementById('btn-show-rules');
  if (btnShowRules) btnShowRules.addEventListener('click', () => {
    UI.showScreen('rules-screen');
  });
  const btnCloseRules = document.getElementById('btn-close-rules');
  if (btnCloseRules) btnCloseRules.addEventListener('click', () => {
    UI.showScreen('title-screen');
  });
  
  // Wire up ALL .btn-cancel and close buttons across every modal
  document.addEventListener('click', (e) => {
    if (e.target && (e.target.classList.contains('btn-cancel') || e.target.classList.contains('btn-close'))) {
      e.preventDefault();
      e.stopPropagation();
      UI.hideAllModals();
    }
  });

  // Modal overlay click to close
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') {
        UI.hideAllModals();
      }
    });
  }

  // Chat Form submit
  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      if (input && input.value.trim()) {
        window.Network.sendChatMessage(input.value.trim());
        input.value = '';
      }
    });
  }

  // Chat Toggle / Close
  const chatHeader = document.getElementById('chat-header');
  const chatToggle = document.getElementById('btn-toggle-chat');
  const chatBox = document.getElementById('game-chat-box');
  
  if (chatBox) {
    const toggleChat = () => {
      const isCollapsed = chatBox.classList.toggle('collapsed');
      if (chatToggle) {
        chatToggle.textContent = isCollapsed ? '💬' : '✖';
      }
      if (!isCollapsed) {
        const badge = document.getElementById('chat-unread-badge');
        if (badge) {
          badge.textContent = '0';
          badge.classList.add('hidden');
        }
      }
    };

    if (chatToggle) {
      chatToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChat();
      });
    }

    if (chatHeader) {
      chatHeader.addEventListener('click', (e) => {
        if (e.target.id !== 'chat-input' && e.target.id !== 'btn-send-chat') {
          toggleChat();
        }
      });
    }
  }
});

function getPlayerName() {
  const input = document.getElementById('player-name-input');
  const name = input ? input.value.trim() : '';
  return name || ('Player ' + Math.floor(100 + Math.random() * 900));
}
