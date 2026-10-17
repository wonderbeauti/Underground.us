(() => {
  const roleDescriptions = {
    'Topo Común': 'No tienes poderes especiales. Confía en las pistas y en tu deducción.',
    Traicionero: 'Eres un Topo. Los Mineros te verán como aliado para confundirlos.',
    Investigador: 'Puedes revelar una pista adicional una vez cada dos rondas.',
    Detective: 'Puedes escribir notas privadas. Si te encarcelan, tus notas se revelan a todos.',
    Alcalde: 'Puedes activar una vez por votación que tu voto cuente por dos.',
    'Minero Común': 'Conoces a tus aliados. Protégelos durante la discusión.',
    Fraude: 'Durante tu turno puedes ver los votos anteriores y anular uno una vez por partida.',
    Hackeador: 'En cada fase de informes puedes reemplazar una pista de otro jugador por una falsa.',
    Infiltrado: 'Al ser encarcelado, tu identidad se revelará falsamente como Topo.',
    Cómplice: 'Conoces la identidad del Topo Traicionero.',
    Silenciador: 'Bloqueas la habilidad de otro jugador durante una ronda; puedes volver a usarla cada dos rondas.',
    Comunicador: 'Una vez por partida, durante tu turno de informe puedes enviar un mensaje anónimo a un jugador vivo; lo leerá antes de su informe.',
    'Chivo Expiatorio': 'Ganas si consigues que te encarcelen por mayoría.',
    Sobreviviente: 'Tu escudo te salva de una votación una vez. Ganas si llegas vivo al final.',
    Mercenario: 'Ganas si logras que tu objetivo sea encarcelado.',
  };

  const nombres = [];
  const form = document.querySelector('#add-player-form');
  const nameInput = document.querySelector('#player-name');
  const addPlayerButton = document.querySelector('#add-player');
  const playerList = document.querySelector('#player-list');
  const countOutput = document.querySelector('#player-count');
  const rosterHint = document.querySelector('#roster-hint');
  const formMessage = document.querySelector('#form-message');
  const startButton = document.querySelector('#start-game');
  const addButton = form.querySelector('button');
  const discussionInput = document.querySelector('#discussion-time');
  const discussionOutput = document.querySelector('#discussion-output');
  const setupPanel = document.querySelector('#setup-panel');
  const gamePanel = document.querySelector('#game-panel');
  const localGameContent = document.querySelector('#game-content');
  let gameContent = localGameContent;
  const phaseLabel = document.querySelector('#phase-label');
  const backgroundMusic = document.querySelector('#background-music');
  const musicToggle = document.querySelector('#music-toggle');
  const musicVolume = document.querySelector('#music-volume');
  const musicStatus = document.querySelector('#music-status');
  const modeSelector = document.querySelector('#mode-selector');
  const localModeButton = document.querySelector('#choose-local-mode');
  const lanModeButton = document.querySelector('#choose-lan-mode');
  const localBackButton = document.querySelector('#back-from-local');
  const lanBackButton = document.querySelector('#back-from-lan');
  const lanPanel = document.querySelector('#lan-panel');
  const lanHostView = document.querySelector('#lan-host-view');
  const lanJoinView = document.querySelector('#lan-join-view');
  const lanPlayerWait = document.querySelector('#lan-player-wait');
  const lanPrivateAssignment = document.querySelector('#lan-private-assignment');
  const lanMessage = document.querySelector('#lan-message');
  const lanGameStatus = document.querySelector('#lan-game-status');
  const lanJoinMessage = document.querySelector('#lan-join-message');
  const createLanRoomButton = document.querySelector('#create-lan-room');
  const startLanGameButton = document.querySelector('#start-lan-game');
  const lanDiscussionInput = document.querySelector('#lan-discussion-time');
  const lanDiscussionOutput = document.querySelector('#lan-discussion-output');
  const lanSkipDiscussionButton = document.querySelector('#lan-skip-discussion');
  const lanRoomDetails = document.querySelector('#lan-room-details');
  const lanQr = document.querySelector('#lan-qr');
  const lanDirectLink = document.querySelector('#lan-direct-link');
  const lanPlayerList = document.querySelector('#lan-player-list');
  const lanWaitPlayerList = document.querySelector('#lan-wait-player-list');
  const lanPlayerCount = document.querySelector('#lan-player-count');
  const lanPlayerNameInput = document.querySelector('#lan-player-name');
  const lanJoinRoomCode = document.querySelector('#lan-join-room-code');
  const lanWaitRoomCode = document.querySelector('#lan-wait-room-code');
  let lanSocket;
  let lanSocketPromise;
  let lanRoomId = new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase();
  let lanAssignment;
  let lanPhase;
  let lanPhaseAction;
  let lanVoteTurn;
  let lanFraudAbilityActive = false;
  let lanReveal;
  let lanWaitingMessage;
  let lanReportComplete = false;
  let lanPhaseName;
  let lanMinigameStarted = false;
  let lanReportError = '';
  let modoInformeLan = false;
  let jugadorLocalAntesDeMinijuegoLan;

  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.3;
  musicVolume.value = '0.3';

  function actualizarControlMusica(activada) {
    musicToggle.setAttribute('aria-pressed', String(activada));
    musicToggle.setAttribute('aria-label', activada ? 'Pausar música' : 'Activar música');
    musicToggle.title = activada ? 'Pausar música' : 'Activar música';
    musicStatus.textContent = activada ? 'Música activada' : 'Música pausada';
  }

  function iniciarMusica() {
    if (!backgroundMusic.paused) {
      return Promise.resolve();
    }

    return backgroundMusic.play()
      .then(() => actualizarControlMusica(true))
      .catch(() => {
        musicStatus.textContent = 'No se pudo reproducir la música';
      });
  }

  function crearOndaHabilidad(button, clientX, clientY) {
    const bounds = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const diameter = Math.max(bounds.width, bounds.height) * 1.7;
    ripple.className = 'role-ability-ripple';
    ripple.style.width = `${diameter}px`;
    ripple.style.height = `${diameter}px`;
    ripple.style.left = `${clientX - diameter / 2}px`;
    ripple.style.top = `${clientY - diameter / 2}px`;
    document.body.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  function configurarFeedbackHabilidades(root) {
    root.addEventListener('pointerdown', (event) => {
      const button = event.target.closest('[data-role-ability]');
      if (!button || button.disabled) return;

      button.classList.remove('is-releasing');
      button.classList.add('is-pressed');
      crearOndaHabilidad(button, event.clientX, event.clientY);
    });

    const soltarBoton = (event) => {
      const button = event.target.closest('[data-role-ability]');
      if (!button) return;
      button.classList.remove('is-pressed');
      button.classList.add('is-releasing');
      const bounds = button.getBoundingClientRect();
      const ghost = button.cloneNode(true);
      ghost.removeAttribute('id');
      ghost.removeAttribute('data-role-ability');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.classList.remove('is-pressed', 'is-releasing');
      ghost.classList.add('role-ability-release-ghost');
      ghost.style.left = `${bounds.left}px`;
      ghost.style.top = `${bounds.top}px`;
      ghost.style.width = `${bounds.width}px`;
      ghost.style.height = `${bounds.height}px`;
      ghost.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      document.body.append(ghost);
      ghost.addEventListener('animationend', () => ghost.remove(), { once: true });
      button.addEventListener('animationend', () => {
        button.classList.remove('is-releasing');
      }, { once: true });
    };
    root.addEventListener('pointerup', soltarBoton);
    root.addEventListener('pointercancel', soltarBoton);

    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-role-ability]');
      if (!button || button.disabled) return;

      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(30);
      }
      if (event.detail === 0) {
        const bounds = button.getBoundingClientRect();
        crearOndaHabilidad(button, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      }
    });
  }

  configurarFeedbackHabilidades(localGameContent);
  configurarFeedbackHabilidades(lanPrivateAssignment);

  document.addEventListener('click', iniciarMusica, { once: true });

  musicToggle.addEventListener('click', () => {
    if (backgroundMusic.paused) {
      iniciarMusica();
      return;
    }

    backgroundMusic.pause();
    actualizarControlMusica(false);
  });

  musicVolume.addEventListener('input', () => {
    backgroundMusic.volume = Number(musicVolume.value);
  });

  let partida;
  let jugadorEnTurno;
  let modoPassAndPlay;
  let temporizador;
  let segundosRestantes;

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

  const mezclar = (elementos) => {
    const resultado = [...elementos];
    for (let indice = resultado.length - 1; indice > 0; indice -= 1) {
      const otroIndice = Math.floor(Math.random() * (indice + 1));
      [resultado[indice], resultado[otroIndice]] = [resultado[otroIndice], resultado[indice]];
    }
    return resultado;
  };

  function actualizarLista() {
    playerList.innerHTML = nombres.map((nombre, indice) => `
      <li class="player-item">
        <span>${escapeHtml(nombre)}</span>
        <button class="remove-player" type="button" data-remove="${indice}" aria-label="Quitar a ${escapeHtml(nombre)}" title="Quitar jugador">×</button>
      </li>
    `).join('');

    countOutput.innerHTML = `${nombres.length} <small>/ 15</small>`;
    rosterHint.textContent = nombres.length < 6
      ? `Faltan ${6 - nombres.length} para comenzar`
      : nombres.length === 15 ? 'Cuadrilla completa' : 'Lista para descender';
    startButton.disabled = nombres.length < 6;
    addButton.disabled = nombres.length >= 15;
  }

  function obtenerSocketLan() {
    if (lanSocket?.connected) return Promise.resolve(lanSocket);
    if (lanSocketPromise) return lanSocketPromise;
    if (!['http:', 'https:'].includes(window.location.protocol)) {
      return Promise.reject(new Error('Para jugar por LAN, inicia el servidor con npm start y abre el enlace desde ese servidor.'));
    }

    lanSocketPromise = new Promise((resolve, reject) => {
      const cargarSocket = () => {
        if (typeof window.io !== 'function') {
          reject(new Error('No se pudo cargar Socket.IO. Comprueba que el servidor LAN esté activo.'));
          return;
        }
        lanSocket = window.io({ reconnection: true });
        lanSocket.once('connect', () => resolve(lanSocket));
        lanSocket.once('connect_error', () => reject(new Error('No se pudo conectar con el servidor LAN.')));
        lanSocket.on('room:players', actualizarSalaLan);
        lanSocket.on('room:closed', ({ message }) => {
          lanMessage.textContent = message || 'La sala se cerró.';
          lanJoinMessage.textContent = message || 'La sala se cerró.';
        });
        lanSocket.on('room:phase', actualizarFaseLan);
        lanSocket.on('player:phase-action', (action) => {
          lanAssignment = { ...(lanAssignment || {}), ...action.identity };
          lanPhaseAction = action;
          lanWaitingMessage = null;
          mostrarAsignacionLan();
        });
        lanSocket.on('player:round-report', ({ assignment, minigame }) => {
          lanAssignment = { ...assignment, minigame };
          lanPhaseAction = null;
          lanVoteTurn = null;
          lanWaitingMessage = null;
          lanReportComplete = false;
          lanMinigameStarted = false;
          lanReportError = '';
          mostrarAsignacionLan();
        });
        lanSocket.on('player:vote-turn', (turn) => {
          lanVoteTurn = turn;
          lanFraudAbilityActive = false;
          lanWaitingMessage = null;
          mostrarAsignacionLan();
        });
        lanSocket.on('player:waiting', ({ message }) => {
          cancelarMinijuegoLan();
          lanWaitingMessage = message;
          lanPhaseAction = null;
          lanVoteTurn = null;
          lanReportComplete = true;
          mostrarAsignacionLan();
        });
        lanSocket.on('room:reveal', (reveal) => {
          lanReveal = reveal;
          lanPhaseAction = null;
          lanVoteTurn = null;
          lanWaitingMessage = null;
          mostrarAsignacionLan();
        });
        lanSocket.on('room:started', () => {
          lanMessage.textContent = 'Partida iniciada. Las asignaciones privadas ya se enviaron a los dispositivos.';
        });
        lanSocket.on('connect', () => {
          if (!lanRoomId) return;
          const token = sessionStorage.getItem(`underground-lan-${lanRoomId}`);
          if (token) {
            lanSocket.emit('player:rejoin-room', { roomId: lanRoomId, token }, (result) => {
              if (!result?.ok) {
                sessionStorage.removeItem(`underground-lan-${lanRoomId}`);
                lanJoinMessage.textContent = result?.message || 'No se pudo recuperar la partida.';
                return;
              }
              mostrarJugadorEnSala(result);
            });
          }
        });
      };

      const script = document.createElement('script');
      script.src = `${window.location.origin}/socket.io/socket.io.js`;
      script.onload = cargarSocket;
      script.onerror = () => reject(new Error('No se pudo cargar Socket.IO desde el servidor LAN.'));
      document.head.append(script);
    }).catch((error) => {
      lanSocketPromise = null;
      throw error;
    });
    return lanSocketPromise;
  }

  function actualizarSalaLan({ players, minimum, maximum, canStart }) {
    const items = players.map(({ name }) => `<li class="lan-player-item">${escapeHtml(name)}</li>`).join('');
    lanPlayerList.innerHTML = items || '<li class="lan-player-empty">Esperando a los jugadores…</li>';
    lanWaitPlayerList.innerHTML = items || '<li class="lan-player-empty">Esperando a los jugadores…</li>';
    lanPlayerCount.textContent = `${players.length} / ${maximum}`;
    startLanGameButton.disabled = !canStart;
    startLanGameButton.querySelector('span').textContent = players.length < minimum
      ? `Esperando jugadores (${players.length}/${minimum})`
      : 'Iniciar Partida LAN';
  }

  function mostrarJugadorEnSala(result) {
    lanJoinView.hidden = true;
    lanPlayerWait.hidden = false;
    lanWaitRoomCode.textContent = result.roomId;
    lanJoinMessage.textContent = '';
    sessionStorage.setItem(`underground-lan-${result.roomId}`, result.token);
  }

  function renderizarContenidoAsignacion() {
    const content = lanPrivateAssignment.querySelector('#lan-phase-content');
    if (!content) return;
    const state = lanPhase;
    const roundLabel = state?.round ? ` · RONDA ${state.round}` : '';
    const phaseNames = {
      ACCIONES_SILENCIADOR: 'HABILIDAD DEL SILENCIADOR',
      ACCIONES_HACKEADOR: 'SABOTAJE DE INFORMES',
      MENSAJES: 'MENSAJES ANÓNIMOS',
      INFORMES: 'FASE DE INFORMES',
      DISCUSION: 'DISCUSIÓN',
      VOTACION: 'VOTACIÓN',
      REVELACION: 'REVELACIÓN',
      FIN: 'FIN DE PARTIDA',
    };
    const phaseTitle = phaseNames[state?.phase] || 'PARTIDA LAN';
    const ownRole = lanAssignment?.role
      ? `<div class="lan-private-card">
          <p class="secret-label">${escapeHtml(lanAssignment.faction || '')}</p>
          <h3>${escapeHtml(lanAssignment.role)}</h3>
          <p class="game-copy">${escapeHtml(lanAssignment.roleDescription || '')}</p>
          ${lanAssignment.allies?.length ? `<p class="secret-label">Tus aliados</p><div class="lan-allies">${lanAssignment.allies.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}</div>` : ''}
          ${lanAssignment.traitors?.length ? `<p class="secret-label">Traicionero identificado</p><div class="lan-allies">${lanAssignment.traitors.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}</div>` : ''}
          ${lanAssignment.objective ? `<p class="secret-label">Tu objetivo</p><p class="game-copy">${escapeHtml(lanAssignment.objective)}</p>` : ''}
        </div>`
      : '';
    let contentMarkup = '';

    if (lanPhaseAction) {
      const { type, targets } = lanPhaseAction;
      const details = {
        silencer: ['¿A quién bloqueas?', 'Puedes elegir a cualquier jugador vivo; una habilidad activa no funcionará esta ronda.'],
        hacker: ['¿Qué informe alteras?', 'Una pista del objetivo será reemplazada por una falsa.'],
        communicator: ['Envía una nota anónima', 'El destinatario la recibirá antes de leer su informe.'],
      }[type];
      const targetControl = type === 'communicator'
        ? `<label class="secret-label" for="lan-action-target">Destinatario</label>
           <select class="message-recipient" id="lan-action-target"><option value="">Elige un jugador</option>${targets.map(({ id, name }) => `<option value="${id}">${escapeHtml(name)}</option>`).join('')}</select>
           <label class="secret-label" for="lan-action-message">Mensaje</label>
           <textarea class="detective-notes" id="lan-action-message" maxlength="1000" rows="4" placeholder="Escribe un mensaje..."></textarea>`
        : `<div class="vote-options">${targets.map(({ id, name }) => `<button class="vote-option" type="button" data-role-ability data-lan-action-target="${id}">${escapeHtml(name)}</button>`).join('')}</div>`;
      contentMarkup = `
        <p class="eyebrow">${phaseTitle}${roundLabel}</p>
        <h2 class="game-title">${details[0]}</h2>
        <p class="game-copy">${details[1]}</p>
        ${targetControl}
        <p class="form-message" id="lan-action-error" role="alert"></p>
        ${type === 'communicator' ? '<button class="primary-action" id="lan-send-message" data-role-ability type="button">Enviar mensaje</button>' : ''}
        <button class="primary-action" id="lan-skip-action" type="button">${type === 'communicator' ? 'Enviar más tarde' : 'No usar habilidad'}</button>
      `;
    } else if (state?.phase === 'INFORMES') {
      const messages = lanAssignment?.messages || [];
      const currentPlayer = state.players.find((player) => player.id === lanAssignment?.id);
      contentMarkup = currentPlayer?.active === false
        ? `<p class="eyebrow">${phaseTitle}${roundLabel}</p><h2 class="game-title">Estás fuera de la partida.</h2><p class="game-copy">Espera la revelación de esta ronda.</p>`
        : lanReportComplete
        ? `<p class="eyebrow">${phaseTitle}${roundLabel}</p><h2 class="game-title">Informe completado</h2><p class="game-copy">Esperando a que los demás jugadores terminen (${state.reportsDone}/${state.reportsTotal}).</p>`
        : `
          <p class="eyebrow">${phaseTitle}${roundLabel}</p>
          <h2 class="game-title">Desbloquea tu informe</h2>
          ${messages.map(({ mensaje, ronda }) => `<article class="lan-private-card"><p class="secret-label">Mensaje anónimo · Ronda ${ronda}</p><p class="game-copy">${escapeHtml(mensaje)}</p></article>`).join('')}
          <div class="lan-private-card">
            <p class="secret-label">Minijuego de esta ronda</p>
            <h3>${escapeHtml(lanAssignment?.minigame || '')}</h3>
          </div>
          ${lanReportError ? `<p class="form-message" role="alert">${escapeHtml(lanReportError)}</p>` : ''}
          <p class="game-copy">Completa el minijuego para revelar las pistas de tu informe.</p>
          <button class="primary-action" id="lan-start-minigame" type="button">Jugar y revelar informe</button>
        `;
    } else if (state?.phase === 'DISCUSION') {
      const ready = lanPhaseReady;
      contentMarkup = `
        <p class="eyebrow">${phaseTitle}${roundLabel}</p>
        <h2 class="game-title">Hablen. Escuchen. Duden.</h2>
        <p class="game-copy">La conversación ocurre entre los jugadores, como en el modo local. El temporizador y el paso a votación están sincronizados; no hay chat de texto ni voz integrada.</p>
        <div class="discussion-clock">${formatearTiempo(state.discussionSecondsRemaining)}</div>
        <p class="game-copy">${state.discussionReady}/${state.activeCount} listos para votar.</p>
        <button class="primary-action" id="lan-discussion-ready" type="button" ${ready ? 'disabled' : ''}>${ready ? 'Esperando a los demás…' : 'Listo para votar'}</button>
      `;
    } else if (state?.phase === 'VOTACION') {
      const turn = lanVoteTurn;
      if (!turn) {
        contentMarkup = `<p class="eyebrow">${phaseTitle}${roundLabel}</p><h2 class="game-title">Votación secreta</h2><p class="game-copy">Votos registrados: ${state.votesDone}/${state.votesTotal}. ${state.currentVoter ? `Turno de ${escapeHtml(state.currentVoter)}.` : 'Preparando turno…'}</p>`;
      } else {
        const fraudMarkup = turn.canSeePreviousVotes && turn.previousVotes.length
          ? `<div class="secret-block"><p class="secret-label">Votos anteriores</p>${turn.previousVotes.map((vote) => `<p class="game-copy">${escapeHtml(vote.voterName)} → ${escapeHtml(vote.targetName)}${vote.cancelled ? ' · ANULADO' : ''} ${lanFraudAbilityActive && turn.canCancelVote && !vote.cancelled ? `<button class="vote-option" type="button" data-role-ability data-lan-cancel-vote="${vote.voterId}">Anular</button>` : ''}</p>`).join('')}${turn.canCancelVote && !lanFraudAbilityActive ? '<button class="primary-action" id="use-lan-fraud-vote" data-role-ability type="button">Usar habilidad · anular un voto</button>' : ''}${lanFraudAbilityActive ? '<button class="primary-action" id="cancel-lan-fraud-vote" type="button">No anular</button>' : ''}</div>`
          : '';
        contentMarkup = `
          <p class="eyebrow">${phaseTitle}${roundLabel}</p>
          <h2 class="game-title">${turn.blocked ? 'No puedes votar esta ronda.' : '¿A quién señalas?'}</h2>
          ${turn.doubleVote ? '<p class="game-copy">Tu voto contará por dos.</p>' : ''}
          ${turn.canUseMayorAbility ? '<button class="primary-action" id="use-lan-mayor-vote" data-role-ability type="button">Usar habilidad · voto doble</button>' : ''}
          ${fraudMarkup}
          <p class="form-message" id="lan-vote-error" role="alert"></p>
          <div class="vote-options">${turn.candidates.map(({ id, name }) => `<button class="vote-option" type="button" data-lan-vote="${id}">${escapeHtml(name)}</button>`).join('')}</div>
          ${turn.canVote ? '' : `<p class="game-copy">${turn.blocked ? 'Tu voto está bloqueado.' : 'No tienes objetivos válidos.'}</p><button class="primary-action" id="lan-abstain" type="button">Continuar sin votar</button>`}
        `;
      }
    } else if (state?.phase === 'REVELACION' && lanReveal) {
      const reveal = lanReveal;
      const currentPlayer = state.players.find((player) => player.id === lanAssignment?.id);
      const isActive = currentPlayer?.active !== false;
      const outcome = reveal.imprisoned
        ? `<p class="game-copy"><strong>${escapeHtml(reveal.imprisoned.name)}</strong> fue encarcelado. Era ${escapeHtml(reveal.imprisoned.role)}, ${escapeHtml(reveal.imprisoned.faction)}.</p>${reveal.imprisoned.detectiveNotes !== null ? `<article class="lan-private-card"><p class="secret-label">Libreta del Detective</p><p class="game-copy">${escapeHtml(reveal.imprisoned.detectiveNotes || 'No dejó notas.')}</p></article>` : ''}`
        : reveal.saved
          ? `<p class="game-copy"><strong>${escapeHtml(reveal.saved)}</strong> recibió más votos, pero su escudo lo salvó.</p>`
          : '<p class="game-copy">La votación terminó en empate. Nadie fue encarcelado.</p>';
      const final = reveal.victory
        ? `<p class="result-mark">${escapeHtml(reveal.victory.headline)}</p><h2 class="game-title">La mina tiene dueño.</h2><h3>Ganadores</h3>${reveal.victory.winners.map((winner) => `<article class="lan-private-card"><strong>${escapeHtml(winner.name)} · ${escapeHtml(winner.faction)} · ${escapeHtml(winner.role)}</strong>${winner.reasons.map((reason) => `<p class="game-copy">${escapeHtml(reason)}</p>`).join('')}</article>`).join('')}<h3>Perdedores</h3>${reveal.victory.losers.map((loser) => `<article class="lan-private-card"><strong>${escapeHtml(loser.name)} · ${escapeHtml(loser.faction)} · ${escapeHtml(loser.role)}</strong>${loser.reasons.map((reason) => `<p class="game-copy">${escapeHtml(reason)}</p>`).join('')}</article>`).join('')}<h3>Identidades reveladas</h3>${reveal.identities.map((identity) => `<p class="game-copy">${escapeHtml(identity.name)} — ${escapeHtml(identity.faction)} · ${escapeHtml(identity.role)}</p>`).join('')}`
        : `<h2 class="game-title">La urna ha hablado.</h2>${outcome}${isActive ? `<button class="primary-action" id="lan-next-round" type="button" ${lanNextRoundReady ? 'disabled' : ''}>${lanNextRoundReady ? 'Esperando a los jugadores activos…' : 'Siguiente ronda'}</button>` : '<p class="game-copy">Estás fuera de la partida. Espera a que termine la cuadrilla.</p>'}`;
      contentMarkup = `<p class="eyebrow">${reveal.victory ? 'FIN DE PARTIDA' : phaseTitle}${roundLabel}</p>${reveal.victory ? '' : ''}${final}`;
    } else {
      contentMarkup = `<p class="eyebrow">${phaseTitle}${roundLabel}</p><h2 class="game-title">${escapeHtml(lanWaitingMessage || 'Esperando a los demás jugadores…')}</h2>`;
    }

    content.innerHTML = contentMarkup;
    conectarAccionesLan(content);
  }

  let lanPhaseReady = false;
  let lanNextRoundReady = false;

  function actualizarFaseLan(state) {
    const previousPhase = lanPhaseName;
    lanPhase = state;
    lanPhaseName = state.phase;
    if (previousPhase !== state.phase) {
      if (previousPhase === 'INFORMES') cancelarMinijuegoLan();
      lanPhaseAction = null;
      lanVoteTurn = null;
      lanReportComplete = false;
      lanMinigameStarted = false;
      lanReportError = '';
      lanPhaseReady = false;
      lanNextRoundReady = false;
      if (state.phase !== 'REVELACION') lanReveal = null;
    }
    const labels = {
      ACCIONES_SILENCIADOR: 'Preparando habilidades del Silenciador…',
      ACCIONES_HACKEADOR: 'Preparando sabotajes de informe…',
      MENSAJES: 'Preparando mensajes anónimos…',
      INFORMES: `Informes: ${state.reportsDone}/${state.reportsTotal} completados.`,
      DISCUSION: `Ronda ${state.round}: discusión compartida (${formatearTiempo(state.discussionSecondsRemaining)}).`,
      VOTACION: `Votos registrados: ${state.votesDone}/${state.votesTotal}.`,
      REVELACION: state.victory ? 'La partida terminó.' : `Ronda ${state.round}: revelación.`,
      FIN: 'La partida terminó.',
    };
    lanGameStatus.textContent = labels[state.phase] || 'Partida en curso.';
    lanSkipDiscussionButton.hidden = state.phase !== 'DISCUSION';
    if (!lanPrivateAssignment.hidden
      && !(state.phase === 'INFORMES' && lanMinigameStarted && !lanReportComplete)) {
      mostrarAsignacionLan();
    }
  }

  function mostrarAsignacionLan(assignment = lanAssignment) {
    if (assignment) lanAssignment = assignment;
    lanPlayerWait.hidden = true;
    lanPrivateAssignment.hidden = false;
    const allies = lanAssignment?.allies?.length
      ? `<p class="secret-label">Tus aliados</p><div class="lan-allies">${lanAssignment.allies.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}</div>`
      : '';
    const traitors = lanAssignment?.traitors?.length
      ? `<p class="secret-label">Traicionero identificado</p><div class="lan-allies">${lanAssignment.traitors.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}</div>`
      : '';
    const objective = lanAssignment?.objective
      ? `<p class="secret-label">Tu objetivo</p><p class="game-copy">${escapeHtml(lanAssignment.objective)}</p>`
      : '';
    lanPrivateAssignment.innerHTML = `
      <section class="lan-game">
      <p class="eyebrow">PARTIDA LAN · ${escapeHtml(lanAssignment?.name || '')}</p>
      <div class="lan-private-card">
        <p class="secret-label">${escapeHtml(lanAssignment?.faction || '')}</p>
        <h3>${escapeHtml(lanAssignment?.role || 'Esperando asignación')}</h3>
        <p class="game-copy">${escapeHtml(lanAssignment?.roleDescription || '')}</p>
        ${allies}${traitors}${objective}
      </div>
      <div id="lan-phase-content"></div>
      </section>
    `;
    renderizarContenidoAsignacion();
  }

  function emitirAccionLan(payload, onSuccess) {
    lanSocket.emit('player:submit-phase-action', payload, (result) => {
      if (!result?.ok) {
        const error = lanPrivateAssignment.querySelector('#lan-action-error');
        if (error) error.textContent = result?.message || 'No se pudo registrar la acción.';
        return;
      }
      lanPhaseAction = null;
      lanWaitingMessage = 'Tu acción está lista. Espera a los demás jugadores.';
      onSuccess?.();
      mostrarAsignacionLan();
    });
  }

  function conectarAccionesLan(content) {
    content.querySelectorAll('[data-lan-action-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = lanPhaseAction?.type === 'silencer' ? 'silence' : 'hack';
        emitirAccionLan({ action, targetId: Number(button.dataset.lanActionTarget) });
      });
    });
    content.querySelector('#lan-send-message')?.addEventListener('click', () => {
      emitirAccionLan({
        action: 'send-message',
        targetId: Number(content.querySelector('#lan-action-target').value),
        message: content.querySelector('#lan-action-message').value,
      });
    });
    content.querySelector('#lan-skip-action')?.addEventListener('click', () => {
      emitirAccionLan({ action: 'skip' });
    });
    content.querySelector('#lan-start-minigame')?.addEventListener('click', iniciarMinijuegoLan);
    content.querySelector('#lan-discussion-ready')?.addEventListener('click', () => {
      lanSocket.emit('player:discussion-ready', (result) => {
        if (result?.ok) {
          lanPhaseReady = true;
          mostrarAsignacionLan();
        }
      });
    });
    content.querySelectorAll('[data-lan-cancel-vote]').forEach((button) => {
      button.addEventListener('click', () => {
        lanSocket.emit('player:cancel-vote', { voterId: Number(button.dataset.lanCancelVote) }, (result) => {
          if (!result?.ok) {
            const error = content.querySelector('#lan-vote-error');
            if (error) error.textContent = result.message;
          }
        });
      });
    });
    content.querySelector('#use-lan-fraud-vote')?.addEventListener('click', () => {
      lanFraudAbilityActive = true;
      mostrarAsignacionLan();
    });
    content.querySelector('#use-lan-mayor-vote')?.addEventListener('click', () => {
      lanSocket.emit('player:activate-mayor-vote', (result) => {
        if (!result?.ok) {
          const error = content.querySelector('#lan-vote-error');
          if (error) error.textContent = result.message;
        }
      });
    });
    content.querySelector('#cancel-lan-fraud-vote')?.addEventListener('click', () => {
      lanFraudAbilityActive = false;
      mostrarAsignacionLan();
    });
    content.querySelectorAll('[data-lan-vote]').forEach((button) => {
      button.addEventListener('click', () => submitLanVote(Number(button.dataset.lanVote), content));
    });
    content.querySelector('#lan-abstain')?.addEventListener('click', () => submitLanVote(null, content));
    content.querySelector('#lan-next-round')?.addEventListener('click', () => {
      lanSocket.emit('player:next-round', (result) => {
        if (result?.ok) {
          lanNextRoundReady = true;
          mostrarAsignacionLan();
        }
      });
    });
  }

  function iniciarMinijuegoLan() {
    const minigameNames = [
      'Computadora con frase de acceso',
      'Sintonizador de radio',
      'Tubo neumático',
      'Linterna UV',
      'Teléfono de disco retro',
      'Terminal de números',
      'Proyector de película vintage',
      'Elevador de 9 pisos y mesa de informes',
    ];
    const minigame = minigameNames.indexOf(lanAssignment?.minigame);
    if (minigame < 0 || !lanAssignment?.report || lanPhase?.phase !== 'INFORMES') {
      lanReportError = 'No se pudo iniciar el minijuego asignado. Vuelve a intentarlo.';
      mostrarAsignacionLan();
      return;
    }

    lanMinigameStarted = true;
    modoInformeLan = true;
    jugadorLocalAntesDeMinijuegoLan = jugadorEnTurno;
    const { report } = lanAssignment;
    jugadorEnTurno = {
      id: lanAssignment.id,
      nombre: lanAssignment.name,
      bando: lanAssignment.faction,
      rol: lanAssignment.role,
      notasDetective: lanAssignment.notes || '',
      habilidadBloqueadaRonda: report.notesBlocked ? lanPhase.round : null,
      tarjetaRonda: {
        titulo: report.title || 'Informe confidencial',
        informes: report.clues || [],
        informeAdicionalRevelado: report.additionalClue || null,
        evento: report.event
          ? { nombre: report.event.name, texto: report.event.text }
          : null,
      },
    };
    gameContent = lanPrivateAssignment.querySelector('#lan-phase-content');

    if (minigame === 0) mostrarComputadoraInforme();
    else if (minigame === 1) mostrarRadioInforme();
    else if (minigame === 2) mostrarTuboInforme();
    else if (minigame === 3) mostrarLinternaUV();
    else if (minigame === 4) mostrarTelefonoDisco();
    else if (minigame === 5) mostrarTerminalInforme(5);
    else if (minigame === 6) mostrarProyectorInforme();
    else mostrarElevadorInforme();
  }

  function cancelarMinijuegoLan() {
    if (!modoInformeLan) return;
    modoInformeLan = false;
    gameContent = localGameContent;
    jugadorEnTurno = jugadorLocalAntesDeMinijuegoLan;
    jugadorLocalAntesDeMinijuegoLan = undefined;
    lanMinigameStarted = false;
  }

  function submitLanVote(targetId, content) {
    lanSocket.emit('player:submit-vote', { targetId }, (result) => {
      if (!result?.ok) {
        const error = content.querySelector('#lan-vote-error');
        if (error) error.textContent = result.message;
        return;
      }
      lanVoteTurn = null;
      lanWaitingMessage = 'Voto registrado. Espera la revelación.';
      mostrarAsignacionLan();
    });
  }

  localModeButton.addEventListener('click', () => {
    modeSelector.hidden = true;
    setupPanel.hidden = false;
    nameInput.focus();
  });

  localBackButton.addEventListener('click', () => {
    setupPanel.hidden = true;
    modeSelector.hidden = false;
  });

  lanModeButton.addEventListener('click', async () => {
    modeSelector.hidden = true;
    lanPanel.hidden = false;
    if (lanRoomId) {
      lanHostView.hidden = true;
      lanJoinView.hidden = false;
      lanJoinRoomCode.textContent = lanRoomId;
    }
    try {
      await obtenerSocketLan();
    } catch (error) {
      (lanRoomId ? lanJoinMessage : lanMessage).textContent = error.message;
    }
  });

  lanBackButton.addEventListener('click', () => {
    if (lanRoomId || lanRoomDetails.hidden === false) return;
    lanPanel.hidden = true;
    modeSelector.hidden = false;
  });

  createLanRoomButton.addEventListener('click', async () => {
    createLanRoomButton.disabled = true;
    lanMessage.textContent = 'Creando sala y generando código QR…';
    try {
      const socket = await obtenerSocketLan();
      socket.emit('host:create-room', (result) => {
        if (!result?.ok) {
          createLanRoomButton.disabled = false;
          lanMessage.textContent = result?.message || 'No se pudo crear la sala LAN.';
          return;
        }
        lanRoomId = result.roomId;
        lanQr.src = result.qrDataUrl;
        lanDirectLink.href = result.joinUrl;
        lanDirectLink.textContent = result.joinUrl;
        document.querySelector('#lan-room-code').textContent = result.roomId;
        lanRoomDetails.hidden = false;
        lanMessage.textContent = 'Sala lista. Comparte el QR o el enlace con los jugadores.';
      });
    } catch (error) {
      createLanRoomButton.disabled = false;
      lanMessage.textContent = error.message;
    }
  });

  lanJoinView.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = lanPlayerNameInput.value.trim();
    lanJoinMessage.textContent = 'Conectando a la sala…';
    try {
      const socket = await obtenerSocketLan();
      const token = sessionStorage.getItem(`underground-lan-${lanRoomId}`);
      const evento = token ? 'player:rejoin-room' : 'player:join-room';
      const payload = token ? { roomId: lanRoomId, token } : { roomId: lanRoomId, name };
      socket.emit(evento, payload, (result) => {
        if (!result?.ok) {
          if (token) sessionStorage.removeItem(`underground-lan-${lanRoomId}`);
          lanJoinMessage.textContent = result?.message || 'No se pudo unir a la sala.';
          return;
        }
        mostrarJugadorEnSala(result);
      });
    } catch (error) {
      lanJoinMessage.textContent = error.message;
    }
  });

  startLanGameButton.addEventListener('click', async () => {
    startLanGameButton.disabled = true;
    lanMessage.textContent = 'Asignando roles e informes privados…';
    try {
      const socket = await obtenerSocketLan();
      socket.emit('host:start-room', {
        discussionSeconds: Number(lanDiscussionInput.value),
      }, (result) => {
        if (!result?.ok) {
          lanMessage.textContent = result?.message || 'No se pudo iniciar la partida.';
          startLanGameButton.disabled = false;
          return;
        }
        lanMessage.textContent = 'Partida iniciada. Las asignaciones privadas ya se enviaron a los dispositivos.';
      });
    } catch (error) {
      lanMessage.textContent = error.message;
      startLanGameButton.disabled = false;
    }
  });

  lanDiscussionInput.addEventListener('input', () => {
    lanDiscussionOutput.value = `${lanDiscussionInput.value} s`;
    lanDiscussionOutput.textContent = `${lanDiscussionInput.value} s`;
  });

  lanSkipDiscussionButton.addEventListener('click', () => {
    lanSocket.emit('host:skip-discussion', (result) => {
      if (!result?.ok) lanGameStatus.textContent = result.message;
    });
  });

  if (lanRoomId && ['http:', 'https:'].includes(window.location.protocol)) {
    modeSelector.hidden = true;
    lanPanel.hidden = false;
    lanHostView.hidden = true;
    lanJoinView.hidden = false;
    lanJoinRoomCode.textContent = lanRoomId;
    obtenerSocketLan().catch((error) => {
      lanJoinMessage.textContent = error.message;
    });
  }

  function agregarJugador(event) {
    event?.preventDefault();
    const nombre = nameInput.value.trim();

    if (!nombre) {
      formMessage.textContent = 'Escribe un nombre para añadirlo.';
      nameInput.focus();
      return;
    }
    if (nombres.length >= 15) {
      formMessage.textContent = 'La cuadrilla ya está completa.';
      return;
    }
    if (nombres.some((registrado) => registrado.toLocaleLowerCase() === nombre.toLocaleLowerCase())) {
      formMessage.textContent = 'Ese nombre ya está en la lista.';
      nameInput.focus();
      return;
    }

    nombres.push(nombre);
    nameInput.value = '';
    formMessage.textContent = '';
    actualizarLista();
    nameInput.focus();
  }

  form.addEventListener('submit', agregarJugador);
  addPlayerButton.addEventListener('click', agregarJugador);

  playerList.addEventListener('click', (event) => {
    const boton = event.target.closest('[data-remove]');
    if (!boton) return;
    nombres.splice(Number(boton.dataset.remove), 1);
    formMessage.textContent = '';
    actualizarLista();
  });

  discussionInput.addEventListener('input', () => {
    discussionOutput.value = `${discussionInput.value} s`;
    discussionOutput.textContent = `${discussionInput.value} s`;
  });

  startButton.addEventListener('click', () => {
    try {
      partida = new Partida({
        tiempoDiscusion: Number(discussionInput.value),
      });
      nombres.forEach((nombre) => partida.agregarJugador(nombre));
      partida.iniciarPartida();
      setupPanel.hidden = true;
      gamePanel.hidden = false;
      iniciarTurnos('identidad', partida.jugadores);
    } catch (error) {
      setupPanel.hidden = false;
      formMessage.textContent = error.message;
    }
  });

  function iniciarTurnos(modo, jugadores) {
    modoPassAndPlay = modo;
    if (modo === 'voto') {
      partida.ordenTurnos = partida.iniciarVotacion(jugadores);
    } else if (modo === 'identidad' || modo === 'informe') {
      partida.ordenTurnos = jugadores;
    } else {
      partida.ordenTurnos = mezclar(jugadores);
    }
    partida.indiceTurno = 0;
    jugadorEnTurno = partida.siguienteTurnoPassAndPlay();
    mostrarPase();
  }

  function mostrarPase() {
    const etiquetas = {
      identidad: 'ASIGNACIÓN SECRETA',
      informe: 'INFORME PERSONAL',
      voto: 'VOTACIÓN SECRETA',
      silencio: 'BLOQUEO SECRETO',
      hackeo: 'SABOTAJE SECRETO',
    };
    phaseLabel.textContent = etiquetas[modoPassAndPlay];
    gameContent.innerHTML = `
      <section class="secure-screen">
        <div class="secure-mark" aria-hidden="true">U</div>
        <p class="eyebrow game-eyebrow">${etiquetas[modoPassAndPlay]}</p>
        <h2 class="game-title">Pasa el dispositivo</h2>
        <p class="game-copy">Entrégalo a <strong>${escapeHtml(jugadorEnTurno.nombre)}</strong> sin mostrar la pantalla.</p>
        <button class="primary-action" id="reveal-turn" type="button"><span>Estoy listo</span><span aria-hidden="true">↗</span></button>
      </section>
    `;
    gameContent.querySelector('#reveal-turn').addEventListener('click', mostrarTurnoPrivado);
  }

  function mostrarTurnoPrivado() {
    if (modoPassAndPlay === 'identidad') {
      mostrarIdentidad();
      return;
    }
    if (modoPassAndPlay === 'informe') {
      if (jugadorEnTurno.rol === 'Comunicador'
        && !jugadorEnTurno.comunicadorUsado
        && jugadorEnTurno.comunicadorPospuestoRonda !== partida.rondaActual) {
        mostrarOpcionesComunicador();
        return;
      }
      mostrarInforme();
      return;
    }
    if (modoPassAndPlay === 'silencio') {
      mostrarOpcionesSilenciador();
      return;
    }
    if (modoPassAndPlay === 'hackeo') {
      mostrarOpcionesHackeador();
      return;
    }
    mostrarOpcionesVoto();
  }

  function bloqueRolPrivado() {
    return `
      <div class="private-role">
        <p class="secret-label">Tu rol · ${escapeHtml(jugadorEnTurno.bando)}</p>
        <h3>${escapeHtml(jugadorEnTurno.rol)}</h3>
        <p class="game-copy">${escapeHtml(roleDescriptions[jugadorEnTurno.rol] || 'Sin descripción disponible.')}</p>
      </div>
    `;
  }

  function mostrarIdentidad() {
    const aliados = jugadorEnTurno.bando === 'Minero'
      ? partida.jugadores.filter((jugador) => jugador.id !== jugadorEnTurno.id
        && (jugador.bando === 'Minero' || jugador.rol === 'Traicionero'))
      : [];
    const traicioneros = jugadorEnTurno.rol === 'Cómplice'
      ? partida.jugadores.filter((jugador) => jugador.rol === 'Traicionero')
      : [];
    const objetivoMercenario = jugadorEnTurno.rol === 'Mercenario'
      ? partida.jugadores.find((jugador) => jugador.id === jugadorEnTurno.objetivoId)
      : null;
    const aliadosMarkup = aliados.length
      ? `<p class="secret-label">Tus aliados</p><div class="allies-list">${aliados.map((aliado) => `<span class="ally-tag">${escapeHtml(aliado.nombre)}</span>`).join('')}</div>`
      : '';
    const traicioneroMarkup = traicioneros.length
      ? `<p class="secret-label">Traicionero(s) identificado(s)</p><div class="allies-list">${traicioneros.map((jugador) => `<span class="ally-tag">${escapeHtml(jugador.nombre)}</span>`).join('')}</div>`
      : '';
    const objetivoMarkup = objetivoMercenario
      ? `<p class="secret-label">Tu objetivo</p><div class="allies-list"><span class="ally-tag">${escapeHtml(objetivoMercenario.nombre)}</span></div>`
      : '';

    gameContent.innerHTML = `
      <section class="secure-screen">
        <p class="eyebrow game-eyebrow">IDENTIDAD CONFIDENCIAL</p>
        <div class="secret-block">
          <p class="secret-label">${escapeHtml(jugadorEnTurno.bando)}</p>
          <h2 class="secret-value">${escapeHtml(jugadorEnTurno.rol)}</h2>
          <p class="game-copy">${escapeHtml(roleDescriptions[jugadorEnTurno.rol] || '')}</p>
          ${aliadosMarkup}
          ${traicioneroMarkup}
          ${objetivoMarkup}
          ${jugadorEnTurno.rol === 'Detective' ? bloqueNotasDetective() : ''}
        </div>
        <button class="primary-action" id="hide-secret" type="button"><span>Ocultar y continuar</span><span aria-hidden="true">↗</span></button>
      </section>
    `;
    gameContent.querySelector('#hide-secret').addEventListener('click', completarTurno);
    conectarNotasDetective();
  }

  function bloqueNotasDetective() {
    const habilidadBloqueada = jugadorEnTurno.habilidadBloqueadaRonda === rondaInformeActual();
    return `
      <label class="secret-label" for="detective-notes">Libreta de notas</label>
      <textarea class="detective-notes" id="detective-notes" maxlength="5000" rows="5" placeholder="Escribe tus notas privadas..." ${habilidadBloqueada ? 'disabled' : ''}>${escapeHtml(jugadorEnTurno.notasDetective)}</textarea>
      <p class="game-copy">${habilidadBloqueada ? 'El Silenciador bloqueó tu habilidad de Detective esta ronda.' : 'Tus notas solo se harán públicas si te encarcelan.'}</p>
    `;
  }

  function conectarNotasDetective() {
    const notas = gameContent.querySelector('#detective-notes');
    if (notas) {
      notas.addEventListener('input', () => {
        jugadorEnTurno.notasDetective = notas.value;
      });
    }

    gameContent.querySelector('[data-reveal-investigator-clue]')?.addEventListener('click', (event) => {
      const button = event.currentTarget;
      const section = button.closest('[data-investigator-clue]');
      if (!section) return;

      const mostrarPista = (pista) => {
        section.innerHTML = `
          <p class="secret-label">Pista adicional del Investigador</p>
          <p class="game-copy">${escapeHtml(pista)}</p>
        `;
      };

      button.disabled = true;
      if (modoInformeLan) {
        lanSocket.emit('player:reveal-investigator-clue', (result) => {
          if (!result?.ok) {
            button.disabled = false;
            const error = section.querySelector('#investigator-clue-error');
            if (error) error.textContent = result?.message || 'No se pudo revelar la pista adicional.';
            return;
          }
          lanAssignment.report.additionalClue = result.clue;
          lanAssignment.report.investigatorClueAvailable = false;
          mostrarPista(result.clue);
        });
        return;
      }

      try {
        mostrarPista(partida.revelarPistaInvestigador(jugadorEnTurno));
      } catch (error) {
        button.disabled = false;
        const errorElement = section.querySelector('#investigator-clue-error');
        if (errorElement) errorElement.textContent = error.message;
      }
    });
  }

  function contenidoPistaAdicionalInvestigador() {
    if (jugadorEnTurno?.rol !== 'Investigador') return '';

    const lanReport = modoInformeLan ? lanAssignment?.report : null;
    const revealedClue = lanReport?.additionalClue
      || jugadorEnTurno.tarjetaRonda?.informeAdicionalRevelado;
    if (revealedClue) {
      return `<div class="secret-block"><p class="secret-label">Pista adicional del Investigador</p><p class="game-copy">${escapeHtml(revealedClue)}</p></div>`;
    }

    const canReveal = modoInformeLan
      ? lanReport?.investigatorClueAvailable
      : partida.puedeRevelarPistaInvestigador(jugadorEnTurno);
    if (!canReveal) return '';

    return `
      <div class="secret-block" data-investigator-clue>
        <p class="game-copy">Tienes una pista adicional disponible. Revelarla inicia tu cooldown de dos rondas.</p>
        <button class="primary-action" type="button" data-role-ability data-reveal-investigator-clue>Revelar pista adicional</button>
        <p class="form-message" id="investigator-clue-error" role="alert"></p>
      </div>
    `;
  }

  function mostrarInforme() {
    const tarjeta = jugadorEnTurno.tarjetaRonda;
    const mensajesNoLeidos = jugadorEnTurno.mensajesAnonimos
      .filter((mensaje) => !mensaje.leido);
    if (mensajesNoLeidos.length) {
      gameContent.innerHTML = `
        <section class="secure-screen">
          <p class="eyebrow game-eyebrow">MENSAJE ANÓNIMO RECIBIDO</p>
          ${mensajesNoLeidos.map((mensaje) => `
            <div class="secret-block">
              <p class="secret-label">Mensaje recibido · Ronda ${mensaje.ronda}</p>
              <p class="game-copy message-copy">${escapeHtml(mensaje.mensaje)}</p>
            </div>
          `).join('')}
          ${bloqueRolPrivado()}
          <button class="primary-action" id="continue-to-report" type="button"><span>Continuar al informe</span><span aria-hidden="true">↗</span></button>
        </section>
      `;
      gameContent.querySelector('#continue-to-report').addEventListener('click', () => {
        mensajesNoLeidos.forEach((mensaje) => {
          mensaje.leido = true;
        });
        mostrarTerminalInforme();
      });
      return;
    }
    mostrarTerminalInforme();
  }

  function rondaInformeActual() {
    return modoInformeLan ? lanPhase.round : partida.rondaActual;
  }

  function mostrarTerminalInforme(minijuego = Math.floor(Math.random() * 8)) {
    if (minijuego === 0) {
      mostrarComputadoraInforme();
      return;
    }
    if (minijuego === 1) {
      mostrarRadioInforme();
      return;
    }
    if (minijuego === 2) {
      mostrarTuboInforme();
      return;
    }
    if (minijuego === 3) {
      mostrarLinternaUV();
      return;
    }
    if (minijuego === 4) {
      mostrarTelefonoDisco();
      return;
    }
    if (minijuego === 6) {
      mostrarProyectorInforme();
      return;
    }
    if (minijuego === 7) {
      mostrarElevadorInforme();
      return;
    }
    const cantidadFichas = 4 + Math.floor(Math.random() * 2);
    const fichas = Array.from({ length: 11 }, (_, numero) => numero);
    for (let indice = fichas.length - 1; indice > 0; indice -= 1) {
      const aleatorio = Math.floor(Math.random() * (indice + 1));
      [fichas[indice], fichas[aleatorio]] = [fichas[aleatorio], fichas[indice]];
    }
    const secuencia = fichas.slice(0, cantidadFichas);
    if (secuencia.every((numero, indice) => indice === 0 || secuencia[indice - 1] < numero)) {
      secuencia.push(secuencia.shift());
    }

    gameContent.innerHTML = `
      <section class="secure-screen terminal-screen">
        <p class="eyebrow game-eyebrow">FASE DE INFORMES · RONDA ${rondaInformeActual()}</p>
        ${bloqueRolPrivado()}
        <div class="encrypted-terminal">
          <div class="terminal-heading">
            <span class="terminal-light" aria-hidden="true"></span>
            <p class="secret-label">Terminal Encriptada - Acceso de Cuadrilla</p>
          </div>
          <h2 class="game-title">Informe protegido</h2>
          <p class="game-copy">Ordena las fichas de menor a mayor. Toca una ficha y luego otra para intercambiarlas.</p>
          <div class="number-tiles" id="number-tiles" aria-label="Fichas numéricas"></div>
          <p class="terminal-status" id="terminal-status" role="status" aria-live="polite">Secuencia requerida: menor a mayor</p>
        </div>
      </section>
    `;

    const tilesContainer = gameContent.querySelector('#number-tiles');
    const terminal = gameContent.querySelector('.encrypted-terminal');
    const status = gameContent.querySelector('#terminal-status');
    let selectedIndex = null;
    tilesContainer.style.setProperty('--tile-count', cantidadFichas);

    const actualizarFichas = () => {
      tilesContainer.innerHTML = secuencia.map((numero, indice) => `
        <button
          class="number-tile${indice === selectedIndex ? ' is-selected' : ''}"
          type="button"
          data-tile-index="${indice}"
          aria-label="Número ${numero}, posición ${indice + 1}"
          aria-pressed="${indice === selectedIndex}"
        >${numero}</button>
      `).join('');
    };

    actualizarFichas();
    tilesContainer.addEventListener('click', (event) => {
      const tile = event.target.closest('[data-tile-index]');
      if (!tile || terminal.classList.contains('is-granted')) return;
      const indice = Number(tile.dataset.tileIndex);

      if (selectedIndex === null) {
        selectedIndex = indice;
        actualizarFichas();
        status.textContent = `Ficha ${secuencia[indice]} seleccionada. Elige dónde colocarla.`;
        return;
      }

      if (selectedIndex === indice) {
        selectedIndex = null;
        actualizarFichas();
        status.textContent = 'Secuencia requerida: menor a mayor';
        return;
      }

      [secuencia[selectedIndex], secuencia[indice]] = [secuencia[indice], secuencia[selectedIndex]];
      selectedIndex = null;
      actualizarFichas();
      const ordenada = secuencia.every((numero, posicion) => (
        posicion === 0 || secuencia[posicion - 1] < numero
      ));

      if (ordenada) {
        terminal.classList.add('is-granted');
        status.textContent = 'ACCESO CONCEDIDO · DESCIFRANDO INFORME';
        window.setTimeout(mostrarInformeDesbloqueado, 650);
      } else {
        status.textContent = 'Aún no está ordenado. Sigue intercambiando las fichas.';
      }
    });
  }

  function mostrarProyectorInforme() {
    const duracionGiroMs = 8000 + Math.random() * 2000;
    let anguloAnterior = null;
    let anguloManivela = 0;
    let ultimoMovimiento = 0;
    let ultimoFrame = 0;
    let tiempoActivo = 0;
    let punteroPresionado = false;
    let tecladoPresionado = false;
    let animacionId = 0;
    let apagado = false;
    let porcentajeAnterior = -1;
    let estadoAnterior = '';

    gameContent.innerHTML = `
      <section class="secure-screen projector-scene">
        <p class="eyebrow game-eyebrow">FASE DE INFORMES · RONDA ${rondaInformeActual()}</p>
        ${bloqueRolPrivado()}
        <div class="projector-modal" role="dialog" aria-modal="true" aria-label="Proyector de película vintage">
          <div class="projector-frame">
            <div class="projector-reels" aria-hidden="true">
              <span class="projector-reel"></span>
              <span class="projector-reel"></span>
            </div>
            <div class="projector-screen" id="projector-screen" aria-live="polite">
              <div class="projector-film" aria-hidden="true">
                <div class="projector-film-sequence">
                  <span>UNDERGROUND.US</span>
                  <span>ARCHIVO CONFIDENCIAL</span>
                  <span>RONDA ${rondaInformeActual()}</span>
                </div>
                <div class="projector-film-sequence" aria-hidden="true">
                  <span>UNDERGROUND.US</span>
                  <span>ARCHIVO CONFIDENCIAL</span>
                  <span>RONDA ${rondaInformeActual()}</span>
                </div>
              </div>
              <div class="projector-title-card" id="projector-title-card">
                <p class="projector-presentation">UNDERGROUND.US PRESENTA...</p>
                <p class="projector-subtitle">INFORME CONFIDENCIAL DE LA MINA</p>
                <p class="projector-instruction" id="projector-instruction">Gira la manivela para alinear el fotograma</p>
                <div class="projector-report" id="projector-report">
                  ${contenidoInformePrivado()}
                </div>
                <button class="projector-continue" id="continue-projector-report" type="button" disabled hidden>
                  Continuar y pasar el dispositivo
                </button>
              </div>
            </div>
            <div class="projector-progress" role="progressbar" aria-label="Tiempo de giro acumulado" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <span class="projector-progress-fill" id="projector-progress-fill"></span>
            </div>
            <p class="projector-counter" id="projector-counter" role="status" aria-live="polite">GIRA PARA AVANZAR · 0%</p>
            <div class="projector-crank-area">
              <button class="projector-crank" id="projector-crank" type="button" aria-label="Mantén y gira la manivela para avanzar la película">
                <span class="projector-crank-handle" aria-hidden="true"></span>
              </button>
              <span>GIRA EN CÍRCULOS · EL PROGRESO SE PAUSA AL DETENERTE</span>
            </div>
          </div>
        </div>
      </section>
    `;

    const screen = gameContent.querySelector('#projector-screen');
    const titleCard = gameContent.querySelector('#projector-title-card');
    const instruction = gameContent.querySelector('#projector-instruction');
    const counter = gameContent.querySelector('#projector-counter');
    const crank = gameContent.querySelector('#projector-crank');
    const frame = gameContent.querySelector('.projector-frame');
    const progress = gameContent.querySelector('.projector-progress');
    const progressFill = gameContent.querySelector('#projector-progress-fill');
    const report = gameContent.querySelector('#projector-report');
    const continueButton = gameContent.querySelector('#continue-projector-report');

    const detenerGiro = () => {
      punteroPresionado = false;
      tecladoPresionado = false;
      anguloAnterior = null;
      ultimoMovimiento = 0;
      frame.classList.remove('is-running');
      crank.classList.remove('is-dragging');
    };

    const revelarInforme = () => {
      if (apagado || !gameContent.contains(screen)) return;
      continueButton.hidden = false;
      continueButton.disabled = false;
    };

    continueButton.addEventListener('click', () => {
      if (apagado) return;
      apagado = true;
      window.cancelAnimationFrame(animacionId);
      screen.classList.add('is-powering-off');
      titleCard.classList.add('is-powering-off');
      window.setTimeout(completarTurno, 720);
    });

    const finalizarProyeccion = () => {
      detenerGiro();
      crank.disabled = true;
      progress.setAttribute('aria-valuenow', '100');
      progressFill.style.width = '100%';
      report.style.setProperty('--report-reveal', '100%');
      counter.textContent = 'FOTOGRAMA ALINEADO · 100%';
      instruction.textContent = 'FOTOGRAMA ALINEADO';
      screen.classList.add('is-aligned');
      titleCard.classList.add('is-title-card');
      window.setTimeout(revelarInforme, 1500);
    };

    const actualizarProgreso = (ahora) => {
      if (apagado || !gameContent.contains(screen)) return;
      const giroActivo = tecladoPresionado
        || (punteroPresionado && ahora - ultimoMovimiento <= 140);
      if (ultimoFrame && giroActivo) {
        tiempoActivo += Math.min(ahora - ultimoFrame, 50);
        frame.classList.add('is-running');
      } else {
        frame.classList.remove('is-running');
      }
      ultimoFrame = ahora;

      const porcentaje = Math.min(100, (tiempoActivo / duracionGiroMs) * 100);
      const porcentajeVisible = Math.floor(porcentaje);
      progressFill.style.width = `${porcentaje}%`;
      progress.setAttribute('aria-valuenow', String(porcentajeVisible));
      report.style.setProperty('--report-reveal', `${porcentaje}%`);
      const estado = tiempoActivo === 0
        ? 'GIRA PARA AVANZAR'
        : giroActivo ? 'GIRO ACTIVO' : 'PROGRESO EN PAUSA';
      if (porcentajeVisible !== porcentajeAnterior || estado !== estadoAnterior) {
        counter.textContent = `${estado} · ${porcentajeVisible}%`;
        porcentajeAnterior = porcentajeVisible;
        estadoAnterior = estado;
      }

      if (porcentaje >= 100) {
        finalizarProyeccion();
        return;
      }
      animacionId = window.requestAnimationFrame(actualizarProgreso);
    };
    animacionId = window.requestAnimationFrame(actualizarProgreso);

    crank.addEventListener('pointerdown', (event) => {
      if (crank.disabled || apagado) return;
      event.preventDefault();
      crank.setPointerCapture(event.pointerId);
      const bounds = crank.getBoundingClientRect();
      const centroX = bounds.left + bounds.width / 2;
      const centroY = bounds.top + bounds.height / 2;
      anguloAnterior = Math.atan2(event.clientY - centroY, event.clientX - centroX);
      anguloManivela = anguloAnterior;
      crank.style.setProperty('--crank-angle', `${anguloManivela}rad`);
      crank.classList.add('is-dragging');
      punteroPresionado = true;
    });

    crank.addEventListener('pointermove', (event) => {
      if (!punteroPresionado || anguloAnterior === null || apagado) return;
      const bounds = crank.getBoundingClientRect();
      const anguloActual = Math.atan2(
        event.clientY - (bounds.top + bounds.height / 2),
        event.clientX - (bounds.left + bounds.width / 2),
      );
      let diferencia = anguloActual - anguloAnterior;
      if (diferencia > Math.PI) diferencia -= Math.PI * 2;
      if (diferencia < -Math.PI) diferencia += Math.PI * 2;
      anguloAnterior = anguloActual;
      if (Math.abs(diferencia) >= 0.008) {
        anguloManivela += diferencia;
        crank.style.setProperty('--crank-angle', `${anguloManivela}rad`);
        ultimoMovimiento = performance.now();
        frame.classList.add('is-running');
      }
    });

    crank.addEventListener('pointerup', detenerGiro);
    crank.addEventListener('pointercancel', detenerGiro);
    crank.addEventListener('lostpointercapture', detenerGiro);
    crank.addEventListener('keydown', (event) => {
      if ((event.key === ' ' || event.key === 'Enter') && !crank.disabled) {
        event.preventDefault();
        tecladoPresionado = true;
        ultimoMovimiento = performance.now();
        frame.classList.add('is-running');
      }
    });
    crank.addEventListener('keyup', (event) => {
      if (event.key === ' ' || event.key === 'Enter') detenerGiro();
    });
    crank.addEventListener('blur', detenerGiro);
    conectarNotasDetective();
  }

  function mostrarElevadorInforme() {
    const pisoDestino = 1 + Math.floor(Math.random() * 9);
    let pisoActual = 1;
    let interruptoresActivados = 0;
    let movimientoPiso = null;

    gameContent.innerHTML = `
      <section class="secure-screen elevator-scene">
        <p class="eyebrow game-eyebrow">FASE DE INFORMES · RONDA ${rondaInformeActual()}</p>
        ${bloqueRolPrivado()}
        <div class="elevator-shell">
          <div class="elevator-heading">
            <span class="elevator-status-light" aria-hidden="true"></span>
            <span>ELEVADOR DE LA MINA · CONTROL INDUSTRIAL</span>
          </div>
          <div id="elevator-stage"></div>
        </div>
      </section>
    `;

    const stage = gameContent.querySelector('#elevator-stage');
    mostrarPanelPisos();

    function dibujarIndicador(piso) {
      return `
        <div class="elevator-indicator" aria-label="Indicador del piso ${piso}">
          <div class="elevator-dial">
            <span class="elevator-dial-mark mark-one">1</span>
            <span class="elevator-dial-mark mark-five">5</span>
            <span class="elevator-dial-mark mark-nine">9</span>
            <span class="elevator-needle" style="--needle-angle: ${-90 + (piso - 1) * 22.5}deg"></span>
            <span class="elevator-dial-hub"></span>
          </div>
          <div class="elevator-floor-readout" id="elevator-floor-readout" aria-live="polite">
            <span>PISO</span><strong>${piso}</strong>
          </div>
        </div>
      `;
    }

    function mostrarPanelPisos() {
      stage.innerHTML = `
        <div class="elevator-cabin">
          <div class="elevator-cabin-lamp" aria-hidden="true"><span></span></div>
          <p class="elevator-order">ORDEN DE OPERACIÓN: DIRÍGETE AL PISO ${pisoDestino}</p>
          <div class="elevator-cabin-layout">
            <aside class="elevator-wall-panel">
              <span class="elevator-panel-label">SELECCIÓN<br>DE PISO</span>
              <div class="elevator-floor-buttons" aria-label="Botones de pisos">
                ${Array.from({ length: 9 }, (_, indice) => {
                  const piso = indice + 1;
                  return `<button class="elevator-floor-button" type="button" data-floor="${piso}" aria-label="Piso ${piso}">${piso}</button>`;
                }).join('')}
              </div>
              <p class="elevator-status" id="elevator-status" role="status" aria-live="polite">SELECCIONA EL DESTINO</p>
            </aside>
            <div class="elevator-door-zone">
              <div class="elevator-upper-frame">${dibujarIndicador(pisoActual)}</div>
              <div class="elevator-shaft" id="elevator-shaft">
                <div class="elevator-shaft-depth" aria-hidden="true">
                  <span class="elevator-shaft-light"></span>
                  <span class="elevator-shaft-floor" id="elevator-shaft-floor">PISO ${pisoActual}</span>
                </div>
                <div class="elevator-gate gate-left" aria-hidden="true"></div>
                <div class="elevator-gate gate-right" aria-hidden="true"></div>
              </div>
            </div>
          </div>
          <div class="elevator-cabin-floor" aria-hidden="true"></div>
        </div>
      `;

      const status = stage.querySelector('#elevator-status');
      const shaft = stage.querySelector('#elevator-shaft');
      stage.querySelectorAll('[data-floor]').forEach((boton) => {
        boton.addEventListener('click', () => {
          const pisoSeleccionado = Number(boton.dataset.floor);
          if (pisoSeleccionado !== pisoDestino) {
            status.textContent = 'PISO INCORRECTO · CONSULTA LA ORDEN DE OPERACIÓN';
            shaft.classList.add('has-error');
            window.setTimeout(() => shaft.classList.remove('has-error'), 500);
            return;
          }

          stage.querySelectorAll('[data-floor]').forEach((pisoBoton) => {
            pisoBoton.disabled = true;
          });
          status.textContent = 'PUERTAS CERRÁNDOSE · INICIANDO TRASLADO';
          shaft.classList.add('is-moving', 'is-doors-closed');
          window.setTimeout(() => {
            status.textContent = 'EN TRASLADO · CABINA EN MOVIMIENTO';
            movimientoPiso = window.setInterval(() => {
              if (pisoActual === pisoDestino) {
                window.clearInterval(movimientoPiso);
                movimientoPiso = null;
                shaft.classList.remove('is-moving');
                shaft.classList.add('is-arrived');
                status.textContent = `PISO ${pisoDestino} · PUERTAS ABRIÉNDOSE`;
                window.setTimeout(mostrarPanelEnergia, 700);
                return;
              }

              pisoActual += pisoDestino > pisoActual ? 1 : -1;
              stage.querySelector('#elevator-floor-readout').innerHTML = (
                `<span>PISO</span><strong>${pisoActual}</strong>`
              );
              stage.querySelector('#elevator-floor-readout').setAttribute(
                'aria-label',
                `Piso ${pisoActual}`,
              );
              stage.querySelector('.elevator-indicator').setAttribute(
                'aria-label',
                `Indicador del piso ${pisoActual}`,
              );
              stage.querySelector('#elevator-shaft-floor').textContent = `PISO ${pisoActual}`;
              const needle = stage.querySelector('.elevator-needle');
              needle.style.setProperty('--needle-angle', `${-90 + (pisoActual - 1) * 22.5}deg`);
            }, 360);
          }, 680);
        });
      });
    }

    function mostrarPanelEnergia() {
      stage.innerHTML = `
        <div class="elevator-arrival">
          <span class="elevator-arrival-icon" aria-hidden="true">▥</span>
          <p class="elevator-order">SECTOR PISO ${pisoDestino}: RESTABLECE LA ENERGÍA</p>
          <p class="elevator-copy">Acciona los dos interruptores para devolver la corriente al sector.</p>
          <div class="elevator-switches" aria-label="Interruptores de energía">
            <button class="elevator-switch" type="button" aria-pressed="false">
              <span class="elevator-switch-lever" aria-hidden="true"></span>
              <span>INTERRUPTOR A</span>
            </button>
            <button class="elevator-switch" type="button" aria-pressed="false">
              <span class="elevator-switch-lever" aria-hidden="true"></span>
              <span>INTERRUPTOR B</span>
            </button>
          </div>
          <p class="elevator-status" id="elevator-power-status" role="status" aria-live="polite">ENERGÍA DEL SECTOR: DESCONECTADA · 0/2</p>
        </div>
      `;

      const powerStatus = stage.querySelector('#elevator-power-status');
      stage.querySelectorAll('.elevator-switch').forEach((interruptor) => {
        interruptor.addEventListener('click', () => {
          if (interruptor.getAttribute('aria-pressed') === 'true') return;
          interruptor.setAttribute('aria-pressed', 'true');
          interruptor.classList.add('is-on');
          interruptor.disabled = true;
          interruptoresActivados += 1;
          if (interruptoresActivados < 2) {
            powerStatus.textContent = `INTERRUPTOR ACTIVADO · ENERGÍA DEL SECTOR: ${interruptoresActivados}/2`;
            return;
          }
          powerStatus.textContent = 'ENERGÍA RESTABLECIDA · ILUMINANDO LA OFICINA';
          stage.classList.add('is-energized');
          window.setTimeout(mostrarMesaInforme, 800);
        });
      });
    }

    function mostrarMesaInforme() {
      stage.innerHTML = `
        <div class="elevator-office">
          <div class="elevator-office-lamp" aria-hidden="true"><span></span></div>
          <p class="elevator-order">OFICINA DEL SECTOR · PISO ${pisoDestino}</p>
          <p class="elevator-copy">La lámpara ilumina una carpeta sellada sobre la mesa.</p>
          <div class="elevator-desk">
            <button class="elevator-folder" id="open-elevator-report" type="button" aria-label="Abrir la carpeta del informe confidencial">
              <span class="elevator-folder-tab"></span>
              <span class="elevator-folder-stamp">U—07<br>CONFIDENCIAL</span>
              <span class="elevator-folder-hint">ABRIR INFORME</span>
            </button>
          </div>
        </div>
      `;
      stage.querySelector('#open-elevator-report').addEventListener('click', mostrarInformeEnMesa);
    }

    function mostrarInformeEnMesa() {
      const overlay = document.createElement('div');
      overlay.className = 'elevator-report-overlay';
      overlay.innerHTML = `
        <section class="elevator-report-modal" role="dialog" aria-modal="true" aria-labelledby="elevator-report-title">
          <button class="elevator-report-close" type="button" aria-label="Cerrar informe">×</button>
          <p class="elevator-report-kicker">UNDERGROUND.US · PISO ${pisoDestino}</p>
          <h2 id="elevator-report-title">Informe confidencial</h2>
          <div class="elevator-report-content">${contenidoInformePrivado()}</div>
          <button class="elevator-report-continue" type="button">Continuar y pasar el dispositivo</button>
        </section>
      `;
      stage.append(overlay);
      const cerrarInforme = () => overlay.remove();
      overlay.querySelector('.elevator-report-close').addEventListener('click', cerrarInforme);
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) cerrarInforme();
      });
      overlay.querySelector('.elevator-report-continue').addEventListener('click', completarTurno);
      conectarNotasDetective();
    }
  }

  function mostrarTuboInforme() {
    const ingredientes = [
      { id: 'madera', nombre: 'Madera', icono: '▤' },
      { id: 'carbon', nombre: 'Carbón', icono: '◆' },
      { id: 'fosforo', nombre: 'Fósforo', icono: '✦' },
      { id: 'aceite', nombre: 'Aceite', icono: '◉' },
    ];
    const secuencia = Array.from({ length: 4 }, () => (
      ingredientes[Math.floor(Math.random() * ingredientes.length)]
    ));
    let pasoActual = 0;
    let temporizadorError = null;
    let procesandoIngrediente = false;

    gameContent.innerHTML = `
      <section class="secure-screen tube-game">
        <p class="eyebrow game-eyebrow">FASE DE INFORMES · RONDA ${rondaInformeActual()}</p>
        ${bloqueRolPrivado()}
        <div class="tube-terminal">
          <div class="tube-terminal-heading">
            <span class="terminal-light" aria-hidden="true"></span>
            <p class="secret-label">TUBO NEUMÁTICO · ENCENDIDO DE TERMINAL</p>
          </div>
          <p class="tube-instruction" id="tube-instruction" aria-live="polite"></p>
          <p class="tube-status" id="tube-status" role="status" aria-live="polite">ESPERANDO INGREDIENTE</p>
          <div class="tube-progress" id="tube-progress" aria-label="Progreso de la secuencia"></div>
        </div>
        <div class="tube-workbench">
          <div class="ingredient-tray" aria-label="Bandeja de ingredientes">
            <p class="secret-label">Bandeja de ingredientes</p>
            <div class="ingredient-options">
              ${ingredientes.map((ingrediente) => `
                <button class="ingredient-button" type="button" data-ingredient="${ingrediente.id}">
                  <span class="ingredient-icon" aria-hidden="true">${ingrediente.icono}</span>
                  <span>${ingrediente.nombre}</span>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="inspection-tube" aria-label="Entrada del tubo de inspección">
            <div class="tube-mouth"><span></span></div>
            <p>ENTRADA<br>INSPECCIÓN</p>
          </div>
        </div>
        <div class="paper-dispenser" aria-hidden="true">
          <div class="paper-dispenser-slot"></div>
          <span>ARCHIVO DE INFORMES</span>
        </div>
        <div class="tube-paper" id="tube-paper" aria-hidden="true"></div>
      </section>
    `;

    const instruction = gameContent.querySelector('#tube-instruction');
    const status = gameContent.querySelector('#tube-status');
    const progress = gameContent.querySelector('#tube-progress');
    const game = gameContent.querySelector('.tube-game');
    const paper = gameContent.querySelector('#tube-paper');
    const opciones = gameContent.querySelectorAll('[data-ingredient]');
    const actualizarPaso = () => {
      const ingrediente = secuencia[pasoActual];
      instruction.textContent = `Paso ${pasoActual + 1} de 4: añade ${ingrediente.nombre}`;
      progress.innerHTML = secuencia.map((_, indice) => `
        <span class="tube-step${indice < pasoActual ? ' is-complete' : ''}${indice === pasoActual ? ' is-current' : ''}" aria-label="Paso ${indice + 1}${indice < pasoActual ? ' completado' : ''}"></span>
      `).join('');
    };

    actualizarPaso();
    opciones.forEach((opcion) => {
      opcion.addEventListener('click', () => {
        if (game.classList.contains('is-printing') || procesandoIngrediente) return;

        if (opcion.dataset.ingredient !== secuencia[pasoActual].id) {
          window.clearTimeout(temporizadorError);
          game.classList.add('has-error');
          status.textContent = 'SECUENCIA INCORRECTA // INTENTA DE NUEVO';
          temporizadorError = window.setTimeout(() => {
            game.classList.remove('has-error');
            status.textContent = 'ESPERANDO INGREDIENTE';
          }, 900);
          return;
        }

        window.clearTimeout(temporizadorError);
        game.classList.remove('has-error');
        game.classList.add('has-confirmation');
        procesandoIngrediente = true;
        status.textContent = `✓ ${secuencia[pasoActual].nombre.toUpperCase()} AÑADIDO`;
        progress.children[pasoActual].classList.add('is-complete');
        progress.children[pasoActual].classList.remove('is-current');
        progress.children[pasoActual].setAttribute(
          'aria-label',
          `Paso ${pasoActual + 1} completado`,
        );
        pasoActual += 1;

        if (pasoActual === secuencia.length) {
          game.classList.add('is-printing');
          instruction.textContent = '4 pasos completados';
          status.textContent = 'SECUENCIA COMPLETA // IMPRIMIENDO INFORME';
          window.setTimeout(() => mostrarInformeDesdeTubo(game, paper), 700);
          return;
        }

        window.setTimeout(() => {
          game.classList.remove('has-confirmation');
          procesandoIngrediente = false;
          status.textContent = 'INGREDIENTE CONFIRMADO';
          actualizarPaso();
        }, 420);
      });
    });
  }

  function mostrarInformeDesdeTubo(game, paper) {
    game.classList.add('is-printing');
    paper.innerHTML = `
      <div class="tube-paper-content" role="dialog" aria-modal="true" aria-label="Informe de ronda">
        <p class="tube-paper-heading">UNDERGROUND.US · INFORME DE RONDA ${rondaInformeActual()}</p>
        ${contenidoInformePrivado()}
        <button class="computer-button" id="continue-tube-report" type="button">CONTINUAR Y PASAR EL DISPOSITIVO</button>
      </div>
    `;
    paper.setAttribute('aria-hidden', 'false');
    window.requestAnimationFrame(() => paper.classList.add('is-unfolded'));
    paper.querySelector('#continue-tube-report').addEventListener('click', completarTurno);
    conectarNotasDetective();
  }

  function mostrarLinternaUV() {
    const informes = jugadorEnTurno.tarjetaRonda.informes.join('\n');
    gameContent.innerHTML = `
      <section class="secure-screen uv-scene">
        <p class="eyebrow game-eyebrow">FASE DE INFORMES · RONDA ${rondaInformeActual()}</p>
        ${bloqueRolPrivado()}
        <p class="game-copy uv-instructions">La hoja parece vacía. Mantén presionada la linterna y deslízala sobre la tinta invisible durante 2 segundos.</p>
        <div class="uv-overlay" id="uv-overlay">
          <div class="uv-paper" id="uv-paper">
            <div class="uv-paper-heading">UNDERGROUND.US · ARCHIVO CONFIDENCIAL</div>
            <p class="uv-paper-prompt">INSPECCIÓN UV // DESLIZA LA LUZ SOBRE LA HOJA</p>
            <div class="uv-clue-area" id="uv-clue-area">
            </div>
            <div class="uv-progress-area">
              <div class="uv-progress-heading">
                <span id="uv-status" role="status" aria-live="polite">TINTA INVISIBLE DETECTADA</span>
                <span id="uv-progress-label">0%</span>
              </div>
              <div class="uv-progress-track" role="progressbar" aria-label="Progreso de revelación UV" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <span id="uv-progress-fill"></span>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;

    const overlay = gameContent.querySelector('#uv-overlay');
    const paper = gameContent.querySelector('#uv-paper');
    const clueArea = gameContent.querySelector('#uv-clue-area');
    const status = gameContent.querySelector('#uv-status');
    const progressLabel = gameContent.querySelector('#uv-progress-label');
    const progressFill = gameContent.querySelector('#uv-progress-fill');
    const progressBar = gameContent.querySelector('[role="progressbar"]');
    let punteroActivo = false;
    let punteroSobreTinta = false;
    let ultimoFrame = null;
    let tiempoAcumulado = 0;
    let revelado = false;
    let tintaPreparada = false;

    const prepararTinta = () => {
      if (tintaPreparada) return;
      const textoOculto = document.createElement('p');
      textoOculto.className = 'uv-hidden-text';
      textoOculto.setAttribute('aria-hidden', 'true');
      textoOculto.textContent = informes;
      const textoRevelado = document.createElement('p');
      textoRevelado.className = 'uv-revealed-text';
      textoRevelado.setAttribute('aria-hidden', 'true');
      textoRevelado.textContent = informes;
      clueArea.append(textoOculto, textoRevelado);
      tintaPreparada = true;
    };

    const actualizarPosicionLuz = (event) => {
      const paperRect = paper.getBoundingClientRect();
      const clueRect = clueArea.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      paper.style.setProperty('--uv-x', `${x - paperRect.left}px`);
      paper.style.setProperty('--uv-y', `${y - paperRect.top}px`);
      clueArea.style.setProperty('--uv-text-x', `${x - clueRect.left}px`);
      clueArea.style.setProperty('--uv-text-y', `${y - clueRect.top}px`);
      punteroSobreTinta = x >= clueRect.left && x <= clueRect.right
        && y >= clueRect.top && y <= clueRect.bottom;
      paper.classList.toggle('is-over-ink', punteroActivo && punteroSobreTinta);
    };

    const animarProgreso = (ahora) => {
      if (ultimoFrame !== null && punteroActivo && punteroSobreTinta && !revelado) {
        tiempoAcumulado += Math.min(ahora - ultimoFrame, 100);
      }
      ultimoFrame = ahora;
      const porcentaje = Math.min(100, tiempoAcumulado / 2000 * 100);
      progressFill.style.width = `${porcentaje}%`;
      progressLabel.textContent = `${Math.floor(porcentaje)}%`;
      progressBar.setAttribute('aria-valuenow', String(Math.floor(porcentaje)));

      if (porcentaje >= 100 && !revelado) {
        revelado = true;
        punteroActivo = false;
        paper.classList.remove('is-over-ink', 'is-uv-active');
        paper.classList.add('is-decoded');
        status.textContent = 'TINTA REVELADA // INFORME DESCIFRADO';
        window.setTimeout(() => mostrarInformeUV(overlay), 450);
        return;
      }

      if (!revelado) window.requestAnimationFrame(animarProgreso);
    };

    paper.addEventListener('pointerdown', (event) => {
      if (revelado) return;
      prepararTinta();
      punteroActivo = true;
      ultimoFrame = null;
      paper.classList.add('is-uv-active');
      paper.setPointerCapture(event.pointerId);
      actualizarPosicionLuz(event);
      status.textContent = 'LUZ UV ACTIVA // BUSCA LA TINTA';
    });
    paper.addEventListener('pointermove', (event) => {
      if (!punteroActivo || revelado) return;
      actualizarPosicionLuz(event);
      status.textContent = punteroSobreTinta
        ? 'TINTA DETECTADA // MANTÉN LA LUZ EN EL TEXTO'
        : 'DESLIZA LA LUZ SOBRE LA TINTA';
    });
    const apagarLuz = () => {
      punteroActivo = false;
      ultimoFrame = null;
      paper.classList.remove('is-uv-active', 'is-over-ink');
      if (!revelado) {
        status.textContent = tiempoAcumulado > 0
          ? 'PROGRESO GUARDADO // CONTINÚA BUSCANDO TINTA'
          : 'TINTA INVISIBLE DETECTADA';
      }
    };
    paper.addEventListener('pointerup', apagarLuz);
    paper.addEventListener('pointercancel', apagarLuz);
    paper.addEventListener('lostpointercapture', apagarLuz);
    window.requestAnimationFrame(animarProgreso);
  }

  function mostrarInformeUV(overlay) {
    overlay.innerHTML = `
      <div class="uv-report-card" role="dialog" aria-modal="true" aria-label="Informe revelado con luz ultravioleta">
        <p class="uv-paper-heading">UNDERGROUND.US · ARCHIVO DESCIFRADO</p>
        ${contenidoInformePrivado()}
        <button class="computer-button" id="continue-uv-report" type="button">CONTINUAR Y PASAR EL DISPOSITIVO</button>
      </div>
    `;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.querySelector('#continue-uv-report').addEventListener('click', completarTurno);
    conectarNotasDetective();
  }

  function mostrarTelefonoDisco() {
    const extension = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
    const digitos = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    const anguloTope = 42;
    const anguloPorDigito = (digito) => {
      const indice = digitos.indexOf(String(digito));
      return anguloTope - (indice + 1) * 32;
    };
    const progresoMarcacion = () => extension.map((digito, indice) => (
      `<span class="phone-progress-digit${indice < indiceMarcado ? ' is-marked' : ''}${indice === indiceMarcado ? ' is-current' : ''}">${indice < indiceMarcado ? '★' : indice === indiceMarcado ? digito : '_'}</span>`
    )).join('');
    let indiceMarcado = 0;

    gameContent.innerHTML = `
      <section class="secure-screen phone-scene">
        <p class="eyebrow game-eyebrow">FASE DE INFORMES · RONDA ${rondaInformeActual()}</p>
        ${bloqueRolPrivado()}
        <div class="rotary-phone">
          <div class="phone-topline">
            <span class="phone-led" aria-hidden="true"></span>
            <p class="phone-brand">UNDERGROUND TELEPHONE CO.</p>
            <span class="phone-unit">LÍNEA 04</span>
          </div>
          <h2 class="phone-title">Extensión requerida</h2>
          <p class="phone-extension" aria-label="Extensión confidencial">${extension.map(digito => `<span>${digito}</span>`).join('<b aria-hidden="true">-</b>')}</p>
          <div class="phone-progress" id="phone-progress" aria-label="Dígitos marcados">${progresoMarcacion()}</div>
          <p class="phone-status" id="phone-status" role="status" aria-live="polite">Arrastra cada número en sentido circular hasta el tope metálico.</p>
          <div class="phone-body">
            <div class="phone-earpiece" aria-hidden="true"><span></span><span></span><span></span></div>
            <div class="rotary-dial-frame">
              <div class="rotary-dial" id="rotary-dial" aria-label="Disco giratorio">
                <div class="dial-number-ring" id="dial-number-ring">
                  ${digitos.map((digito) => {
                    const radianes = anguloPorDigito(digito) * Math.PI / 180;
                    const x = 50 + Math.cos(radianes) * 36;
                    const y = 50 + Math.sin(radianes) * 36;
                    return `<button class="dial-hole" type="button" data-dial-digit="${digito}" style="left:${x}%;top:${y}%" aria-label="Arrastra el ${digito} hasta el tope"><span>${digito}</span></button>`;
                  }).join('')}
                </div>
                <div class="dial-center"><span>U</span></div>
              </div>
              <div class="dial-stop" id="dial-stop" aria-hidden="true"><span></span></div>
            </div>
            <div class="phone-mouthpiece" aria-hidden="true"><span></span><span></span><span></span></div>
          </div>
          <p class="phone-hint">Sujeta un número y gíralo alrededor del disco, en dirección al tope.</p>
        </div>
        <div class="phone-report-overlay" id="phone-report-overlay" hidden></div>
      </section>
    `;

    const phone = gameContent.querySelector('.rotary-phone');
    const dial = gameContent.querySelector('#rotary-dial');
    const status = gameContent.querySelector('#phone-status');
    const progress = gameContent.querySelector('#phone-progress');
    const overlay = gameContent.querySelector('#phone-report-overlay');
    let punteroActivo = null;
    let digitoArrastrado = null;
    let ultimoAngulo = 0;
    let giroAcumulado = 0;
    let marcacionActiva = false;

    const normalizarAngulo = (angulo) => (angulo % 360 + 360) % 360;
    const anguloPuntero = (event) => {
      const rect = dial.getBoundingClientRect();
      return normalizarAngulo(Math.atan2(
        event.clientY - (rect.top + rect.height / 2),
        event.clientX - (rect.left + rect.width / 2),
      ) * 180 / Math.PI);
    };
    const actualizarProgreso = () => {
      progress.innerHTML = progresoMarcacion();
    };
    const restablecerDisco = () => {
      marcacionActiva = false;
      dial.classList.remove('is-dragging');
      dial.style.setProperty('--dial-rotation', '0deg');
    };
    const registrarDigito = (digito) => {
      if (marcacionActiva || indiceMarcado >= extension.length) return;
      marcacionActiva = true;
      if (String(digito) !== String(extension[indiceMarcado])) {
        indiceMarcado = 0;
        actualizarProgreso();
        status.textContent = 'Extensión errónea - Reintentando';
        restablecerDisco();
        window.setTimeout(() => {
          if (indiceMarcado === 0) status.textContent = 'Arrastra cada número en sentido circular hasta el tope metálico.';
        }, 1100);
        return;
      }

      indiceMarcado += 1;
      actualizarProgreso();
      if (indiceMarcado === extension.length) {
        status.textContent = 'LLAMADA CONECTADA // DECODIFICANDO MENSAJE';
        phone.classList.add('is-connected');
        restablecerDisco();
        window.setTimeout(mostrarTranscripcionTelefono, 750);
        return;
      }
      status.textContent = `Dígito ${indiceMarcado} de ${extension.length} marcado. Continúa la extensión.`;
      restablecerDisco();
    };

    dial.addEventListener('pointerdown', (event) => {
      const hole = event.target.closest('[data-dial-digit]');
      if (!hole || marcacionActiva || indiceMarcado >= extension.length) return;
      event.preventDefault();
      punteroActivo = event.pointerId;
      digitoArrastrado = hole.dataset.dialDigit;
      ultimoAngulo = anguloPuntero(event);
      giroAcumulado = 0;
      dial.classList.add('is-dragging');
      dial.setPointerCapture(event.pointerId);
      status.textContent = `Girando el ${digitoArrastrado} hacia el tope...`;
    });
    dial.addEventListener('pointermove', (event) => {
      if (event.pointerId !== punteroActivo) return;
      const anguloActual = anguloPuntero(event);
      const diferencia = normalizarAngulo(anguloActual - ultimoAngulo);
      giroAcumulado += diferencia;
      ultimoAngulo = anguloActual;
      dial.style.setProperty('--dial-rotation', `${giroAcumulado}deg`);
    });
    const finalizarMarcacion = (event) => {
      if (event.pointerId !== punteroActivo) return;
      const digito = digitoArrastrado;
      const giroRequerido = normalizarAngulo(anguloTope - anguloPorDigito(digito));
      const desvio = Math.abs(giroAcumulado - giroRequerido);
      punteroActivo = null;
      digitoArrastrado = null;
      if (desvio <= 28) {
        registrarDigito(digito);
      } else {
        status.textContent = 'Lleva el número hasta el tope metálico para marcarlo.';
        restablecerDisco();
      }
    };
    dial.addEventListener('pointerup', finalizarMarcacion);
    dial.addEventListener('pointercancel', (event) => {
      if (event.pointerId !== punteroActivo) return;
      punteroActivo = null;
      digitoArrastrado = null;
      status.textContent = 'Marcación cancelada. Inténtalo de nuevo.';
      restablecerDisco();
    });
    dial.addEventListener('lostpointercapture', (event) => {
      if (event.pointerId === punteroActivo) finalizarMarcacion(event);
    });

    function mostrarTranscripcionTelefono() {
      const informes = jugadorEnTurno.tarjetaRonda.informes.join('\n');
      const tarjeta = jugadorEnTurno.tarjetaRonda;
      overlay.hidden = false;
      overlay.innerHTML = `
        <div class="phone-transcript-card" role="dialog" aria-modal="true" aria-label="Transcripción de llamada confidencial">
          <p class="phone-transcript-heading">TRANSCRIPCIÓN DE LLAMADA CONFIDENCIAL</p>
          <p class="phone-transcript-meta">LÍNEA SEGURA · RONDA ${rondaInformeActual()}</p>
          <div class="phone-typewriter" id="phone-typewriter" aria-live="polite"></div>
          <div id="phone-transcript-extras" hidden>
            ${bloqueRolPrivado()}
            ${contenidoPistaAdicionalInvestigador()}
            ${tarjeta.evento
              ? `<div class="secret-block"><p class="secret-label">${escapeHtml(tarjeta.evento.nombre)}</p><p class="game-copy">${escapeHtml(tarjeta.evento.texto)}</p></div>`
              : ''}
            ${jugadorEnTurno.rol === 'Detective' ? bloqueNotasDetective() : ''}
            <button class="computer-button" id="continue-phone-report" type="button">CONTINUAR Y PASAR EL DISPOSITIVO</button>
          </div>
        </div>
      `;
      const output = overlay.querySelector('#phone-typewriter');
      const extras = overlay.querySelector('#phone-transcript-extras');
      let indice = 0;
      const escribirCaracter = () => {
        if (indice < informes.length) {
          output.textContent += informes[indice];
          indice += 1;
          window.setTimeout(escribirCaracter, 18);
          return;
        }
        output.classList.remove('is-typing');
        extras.hidden = false;
        overlay.querySelector('#continue-phone-report').addEventListener('click', completarTurno);
        conectarNotasDetective();
      };
      output.classList.add('is-typing');
      window.setTimeout(escribirCaracter, 200);
    }
  }

  function mostrarRadioInforme() {
    const frecuenciaObjetivo = 880 + Math.floor(Math.random() * 201);
    const frecuenciaInicial = frecuenciaObjetivo > 980
      ? frecuenciaObjetivo - 35
      : frecuenciaObjetivo + 35;

    gameContent.innerHTML = `
      <section class="secure-screen radio-scene">
        <p class="eyebrow game-eyebrow">FASE DE INFORMES · RONDA ${rondaInformeActual()}</p>
        ${bloqueRolPrivado()}
        <div class="radio-device">
          <div class="radio-heading">
            <span class="radio-power-light" aria-hidden="true"></span>
            <p class="radio-label">SINTONIZADOR DE RADIO DE LA MINA</p>
            <span class="radio-unit">U-07</span>
          </div>
          <div class="radio-display" aria-live="polite">
            <span class="radio-frequency" id="radio-frequency">${(frecuenciaInicial / 10).toFixed(1)}</span>
            <span class="radio-frequency-unit">MHz</span>
          </div>
          <label class="radio-tune-label" for="radio-tuner">Frecuencia de recepción</label>
          <input class="radio-tuner" id="radio-tuner" type="range" min="880" max="1080" step="1" value="${frecuenciaInicial}" aria-describedby="radio-status">
          <div class="radio-scale" aria-hidden="true"><span>88.0</span><span>98.0</span><span>108.0 MHz</span></div>
          <div class="signal-meter">
            <div class="signal-meter-heading">
              <span>NIVEL DE SEÑAL</span>
              <span id="signal-quality">0%</span>
            </div>
            <div class="signal-track" role="progressbar" aria-label="Nivel de señal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <span class="signal-fill" id="signal-fill"></span>
            </div>
          </div>
          <p class="radio-status" id="radio-status" role="status">INTERFERENCIA ALTA // BUSCA UNA SEÑAL MÁS CLARA</p>
          <div class="tune-progress" id="tune-progress" hidden>
            <div class="tune-progress-heading"><span>SINTONIZANDO SEÑAL...</span><span id="tune-countdown">3.0 s</span></div>
            <div class="signal-track tune-track"><span class="tune-progress-fill" id="tune-progress-fill"></span></div>
          </div>
          <p class="radio-hint">Mueve la perilla hasta que la señal se estabilice. Mantén la frecuencia durante 3 segundos.</p>
        </div>
      </section>
    `;

    const tuner = gameContent.querySelector('#radio-tuner');
    const frequencyOutput = gameContent.querySelector('#radio-frequency');
    const qualityOutput = gameContent.querySelector('#signal-quality');
    const signalFill = gameContent.querySelector('#signal-fill');
    const signalTrack = gameContent.querySelector('.signal-track[role="progressbar"]');
    const status = gameContent.querySelector('#radio-status');
    const progress = gameContent.querySelector('#tune-progress');
    const progressFill = gameContent.querySelector('#tune-progress-fill');
    const countdown = gameContent.querySelector('#tune-countdown');
    const tolerancia = 6;
    let inicioSintonizacion = null;
    let temporizadorSintonizacion = null;
    let senalCaptada = false;

    const actualizarRadio = () => {
      if (senalCaptada) return;
      const frecuencia = Number(tuner.value);
      const diferencia = Math.abs(frecuencia - frecuenciaObjetivo);
      const calidad = Math.max(0, Math.round(100 - diferencia * 4));
      const sintonizada = diferencia <= tolerancia;

      frequencyOutput.textContent = (frecuencia / 10).toFixed(1);
      qualityOutput.textContent = `${calidad}%`;
      signalFill.style.width = `${calidad}%`;
      signalTrack.setAttribute('aria-valuenow', String(calidad));
      gameContent.querySelector('.radio-device').classList.toggle('is-clear', sintonizada);

      if (sintonizada) {
        if (inicioSintonizacion === null) {
          inicioSintonizacion = Date.now();
          progress.hidden = false;
          status.textContent = 'SEÑAL ESTABLE // MANTÉN LA FRECUENCIA';
          temporizadorSintonizacion = window.setInterval(() => {
            const transcurrido = Date.now() - inicioSintonizacion;
            const avance = Math.min(100, transcurrido / 3000 * 100);
            progressFill.style.width = `${avance}%`;
            countdown.textContent = `${Math.max(0, (3000 - transcurrido) / 1000).toFixed(1)} s`;
            if (transcurrido >= 3000) {
              window.clearInterval(temporizadorSintonizacion);
              senalCaptada = true;
              tuner.disabled = true;
              status.textContent = 'SEÑAL CAPTADA // TRANSMISIÓN DECODIFICADA';
              gameContent.querySelector('.radio-device').classList.add('is-decoded');
              window.setTimeout(mostrarInformeEnRadio, 500);
            }
          }, 50);
        }
        return;
      }

      if (inicioSintonizacion !== null) {
        window.clearInterval(temporizadorSintonizacion);
        temporizadorSintonizacion = null;
        inicioSintonizacion = null;
        progressFill.style.width = '0%';
        countdown.textContent = '3.0 s';
        progress.hidden = true;
      }
      status.textContent = calidad > 65
        ? 'INTERFERENCIA MODERADA // AJUSTA LA FRECUENCIA'
        : 'INTERFERENCIA ALTA // BUSCA UNA SEÑAL MÁS CLARA';
    };

    tuner.addEventListener('input', actualizarRadio);
    actualizarRadio();
  }

  function mostrarInformeEnRadio() {
    const device = gameContent.querySelector('.radio-device');
    if (!device) return;
    const tarjeta = jugadorEnTurno.tarjetaRonda;
    const informeTexto = tarjeta.informes.join('\n');
    device.innerHTML = `
      <div class="radio-heading">
        <span class="radio-power-light" aria-hidden="true"></span>
        <p class="radio-label">TRANSMISIÓN DECODIFICADA</p>
        <span class="radio-unit">RONDA ${rondaInformeActual()}</span>
      </div>
      <h2 class="radio-report-title">Informe recibido</h2>
      <div class="radio-typewriter" id="radio-typewriter" aria-live="polite"></div>
      <div id="radio-extra-content" hidden>
        ${bloqueRolPrivado()}
        ${contenidoPistaAdicionalInvestigador()}
        ${tarjeta.evento
          ? `<div class="secret-block"><p class="secret-label">${escapeHtml(tarjeta.evento.nombre)}</p><p class="game-copy">${escapeHtml(tarjeta.evento.texto)}</p></div>`
          : ''}
        ${jugadorEnTurno.rol === 'Detective' ? bloqueNotasDetective() : ''}
        <button class="computer-button" id="continue-radio-report" type="button">CONTINUAR Y PASAR EL DISPOSITIVO</button>
      </div>
    `;

    const output = gameContent.querySelector('#radio-typewriter');
    const extras = gameContent.querySelector('#radio-extra-content');
    let indice = 0;
    const escribirCaracter = () => {
      if (indice < informeTexto.length) {
        output.textContent += informeTexto[indice];
        indice += 1;
        window.setTimeout(escribirCaracter, 14);
        return;
      }
      output.classList.remove('is-typing');
      extras.hidden = false;
      gameContent.querySelector('#continue-radio-report').addEventListener('click', completarTurno);
      conectarNotasDetective();
    };

    output.classList.add('is-typing');
    escribirCaracter();
  }

  function mostrarComputadoraInforme() {
    const frases = [
      'Cada paso bajo tierra te acerca a la verdad.',
      'La esperanza también ilumina la mina más oscura.',
      'Quien escucha con atención encuentra el camino.',
      'La confianza se construye incluso en la oscuridad.',
      'Toda gran salida comienza con una pequeña decisión.',
      'La verdad resiste incluso bajo toneladas de piedra.',
      'Avanzar juntos hace más ligero cualquier túnel.',
      'Hasta la noche más larga termina con un nuevo día.',
    ];
    const frase = frases[Math.floor(Math.random() * frases.length)];

    gameContent.innerHTML = `
      <section class="secure-screen computer-scene">
        <p class="eyebrow game-eyebrow">FASE DE INFORMES · RONDA ${rondaInformeActual()}</p>
        <div class="computer-device">
          <div class="computer-bezel">
            <div class="computer-screen" id="computer-screen">
              <div class="computer-topline">
                <span>UNDERGROUND.SYS</span>
                <span>TERMINAL 07 · ${escapeHtml(jugadorEnTurno.nombre)}</span>
              </div>
              <p class="computer-kicker">ACCESO DE CUADRILLA // PROTECCIÓN ACTIVA</p>
              <h2 class="computer-title">Terminal Encriptada</h2>
              <p class="computer-copy">Para recuperar tu informe, escribe exactamente la frase de acceso:</p>
              <blockquote class="access-phrase">${escapeHtml(frase)}</blockquote>
              <label class="computer-label" for="access-phrase-input">FRASE DE ACCESO</label>
              <textarea class="computer-input" id="access-phrase-input" rows="2" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="computer-status"></textarea>
              <p class="computer-status" id="computer-status" role="status" aria-live="polite">ESPERANDO CREDENCIALES...</p>
              <button class="computer-button" id="submit-access-phrase" type="button">DESENCRIPTAR INFORME</button>
            </div>
          </div>
          <div class="computer-neck" aria-hidden="true"></div>
          <div class="computer-foot" aria-hidden="true"></div>
        </div>
        <p class="game-copy computer-hint">La frase debe coincidir exactamente. Puedes copiarla tal como aparece.</p>
      </section>
    `;

    const input = gameContent.querySelector('#access-phrase-input');
    const status = gameContent.querySelector('#computer-status');
    const submit = gameContent.querySelector('#submit-access-phrase');
    const verificarFrase = () => {
      if (input.value !== frase) {
        status.textContent = 'ACCESO DENEGADO // REVISA LA FRASE';
        input.classList.add('has-error');
        input.focus();
        return;
      }

      status.textContent = 'ACCESO CONCEDIDO // DESCIFRANDO...';
      input.classList.remove('has-error');
      submit.disabled = true;
      window.setTimeout(() => mostrarInformeEnComputadora(), 550);
    };

    submit.addEventListener('click', verificarFrase);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        verificarFrase();
      }
    });
  }

  function contenidoInformePrivado() {
    const tarjeta = jugadorEnTurno.tarjetaRonda;
    const informes = tarjeta.informes.map((informe) => (
      `<p class="game-copy">${escapeHtml(informe)}</p>`
    )).join('');
    const evento = tarjeta.evento
      ? `<div class="secret-block"><p class="secret-label">${escapeHtml(tarjeta.evento.nombre)}</p><p class="game-copy">${escapeHtml(tarjeta.evento.texto)}</p></div>`
      : '';
    return `
      ${bloqueRolPrivado()}
      <div class="secret-block">
        <p class="secret-label">${escapeHtml(tarjeta.titulo)}</p>
        ${informes}
        ${contenidoPistaAdicionalInvestigador()}
        ${jugadorEnTurno.rol === 'Detective' ? bloqueNotasDetective() : ''}
      </div>
      ${evento}
    `;
  }

  function mostrarInformeEnComputadora() {
    const screen = gameContent.querySelector('#computer-screen');
    if (!screen) return;
    screen.innerHTML = `
      <div class="computer-topline">
        <span>UNDERGROUND.SYS</span>
        <span>ARCHIVO DESCIFRADO · RONDA ${rondaInformeActual()}</span>
      </div>
      <p class="computer-kicker">ACCESO CONCEDIDO // DATOS CONFIDENCIALES</p>
      <h2 class="computer-title">Informe de ${escapeHtml(jugadorEnTurno.nombre)}</h2>
      ${contenidoInformePrivado()}
      <button class="computer-button" id="continue-computer-report" type="button">CONTINUAR Y PASAR EL DISPOSITIVO</button>
    `;
    gameContent.querySelector('#continue-computer-report').addEventListener('click', completarTurno);
    conectarNotasDetective();
  }

  function mostrarInformeDesbloqueado() {
    gameContent.innerHTML = `
      <section class="secure-screen">
        <p class="eyebrow game-eyebrow">INFORME DE ${escapeHtml(jugadorEnTurno.nombre)}</p>
        ${contenidoInformePrivado()}
        <button class="primary-action" id="hide-secret" type="button"><span>Continuar</span><span aria-hidden="true">↗</span></button>
      </section>
    `;
    gameContent.querySelector('#hide-secret').addEventListener('click', completarTurno);
    conectarNotasDetective();
  }

  function iniciarAccionesSilenciador() {
    const silenciadores = partida.jugadores.filter((jugador) => (
      partida.puedeUsarHabilidadSilenciador(jugador)
    ));
    if (silenciadores.length) {
      iniciarTurnos('silencio', silenciadores);
    } else {
      iniciarAccionesHackeador();
    }
  }

  function iniciarAccionesHackeador() {
    partida.prepararInformes();
    const hackeadores = partida.jugadores.filter((jugador) => (
      !jugador.estaEncarcelado && jugador.rol === 'Hackeador'
      && partida.puedeUsarHabilidad(jugador)
    ));
    if (hackeadores.length) {
      iniciarTurnos('hackeo', hackeadores);
    } else {
      iniciarTurnos('informe', partida.ordenInformes);
    }
  }

  function mostrarOpcionesComunicador() {
    const objetivos = partida.jugadores.filter((jugador) => (
      !jugador.estaEncarcelado && jugador.id !== jugadorEnTurno.id
    ));
    gameContent.innerHTML = `
      <section class="secure-screen">
        <p class="eyebrow game-eyebrow">COMUNICADOR · UN MENSAJE</p>
        ${bloqueRolPrivado()}
        <h2 class="game-title">Envía una nota anónima</h2>
        <label class="secret-label" for="message-recipient">Destinatario</label>
        <select class="message-recipient" id="message-recipient" required>
          <option value="">Elige un jugador vivo</option>
          ${objetivos.map((jugador) => `<option value="${jugador.id}">${escapeHtml(jugador.nombre)}</option>`).join('')}
        </select>
        <label class="secret-label" for="communicator-message">Mensaje</label>
        <textarea class="detective-notes" id="communicator-message" maxlength="1000" rows="4" placeholder="Escribe un mensaje..." required></textarea>
        <p class="game-copy">El destinatario lo recibirá de forma anónima antes de leer su informe. Solo puedes enviar uno por partida.</p>
        <p class="form-message" id="communicator-error" role="alert"></p>
        <button class="primary-action" id="send-communicator-message" data-role-ability type="button"><span>Enviar mensaje</span><span aria-hidden="true">↗</span></button>
        <button class="primary-action" id="skip-communicator" type="button"><span>Enviar más tarde</span><span aria-hidden="true">↗</span></button>
      </section>
    `;
    gameContent.querySelector('#send-communicator-message').addEventListener('click', () => {
      const recipient = gameContent.querySelector('#message-recipient');
      const message = gameContent.querySelector('#communicator-message');
      try {
        const objetivo = partida.jugadores.find((jugador) => jugador.id === Number(recipient.value));
        partida.enviarMensajeComunicador(jugadorEnTurno, objetivo, message.value);
        mostrarInforme();
      } catch (error) {
        gameContent.querySelector('#communicator-error').textContent = error.message;
      }
    });
    gameContent.querySelector('#skip-communicator').addEventListener('click', () => {
      jugadorEnTurno.comunicadorPospuestoRonda = partida.rondaActual;
      mostrarInforme();
    });
  }

  function mostrarOpcionesSilenciador() {
    const objetivos = partida.jugadores.filter((jugador) => (
      partida.puedeSilenciarA(jugadorEnTurno, jugador)
    ));
    if (!partida.puedeUsarHabilidadSilenciador(jugadorEnTurno)) {
      mostrarAccionNoDisponible('La habilidad no está disponible todavía. Puedes volver a usarla cada dos rondas.');
      return;
    }

    gameContent.innerHTML = `
      <section class="secure-screen">
        <p class="eyebrow game-eyebrow">SILENCIADOR · COOLDOWN DE DOS RONDAS</p>
        ${bloqueRolPrivado()}
        <h2 class="game-title">¿A quién bloqueas?</h2>
        <p class="game-copy">Puedes elegir a cualquier jugador vivo. Si su rol no tiene una habilidad activa bloqueable, no habrá efecto. También puedes reservar el poder.</p>
        <div class="vote-options">${objetivos.map((jugador) => `
          <button class="vote-option" type="button" data-role-ability data-silence="${jugador.id}">${escapeHtml(jugador.nombre)}</button>
        `).join('')}</div>
        <button class="primary-action" id="skip-action" type="button"><span>Reservar habilidad</span><span aria-hidden="true">↗</span></button>
      </section>
    `;
    gameContent.querySelectorAll('[data-silence]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const objetivo = partida.jugadores.find((jugador) => jugador.id === Number(boton.dataset.silence));
        partida.silenciarObjetivo(jugadorEnTurno, objetivo);
        completarTurno();
      });
    });
    gameContent.querySelector('#skip-action').addEventListener('click', completarTurno);
  }

  function mostrarOpcionesHackeador() {
    const objetivos = partida.jugadores.filter((jugador) => (
      !jugador.estaEncarcelado && jugador.id !== jugadorEnTurno.id
    ));
    if (!partida.puedeUsarHabilidad(jugadorEnTurno)
      || jugadorEnTurno.hackeoRonda === partida.rondaActual) {
      mostrarAccionNoDisponible('Tu sabotaje no está disponible esta ronda.');
      return;
    }

    gameContent.innerHTML = `
      <section class="secure-screen">
        <p class="eyebrow game-eyebrow">HACKEADOR</p>
        ${bloqueRolPrivado()}
        <h2 class="game-title">¿Qué informe alteras?</h2>
        <p class="game-copy">Una pista del objetivo será sustituida por un informe falso. Puedes no usar la habilidad.</p>
        <div class="vote-options">${objetivos.map((jugador) => `
          <button class="vote-option" type="button" data-role-ability data-hack="${jugador.id}">${escapeHtml(jugador.nombre)}</button>
        `).join('')}</div>
        <button class="primary-action" id="skip-action" type="button"><span>No sabotear</span><span aria-hidden="true">↗</span></button>
      </section>
    `;
    gameContent.querySelectorAll('[data-hack]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const objetivo = partida.jugadores.find((jugador) => jugador.id === Number(boton.dataset.hack));
        partida.sabotearInforme(jugadorEnTurno, objetivo);
        completarTurno();
      });
    });
    gameContent.querySelector('#skip-action').addEventListener('click', completarTurno);
  }

  function mostrarAccionNoDisponible(mensaje) {
    gameContent.innerHTML = `
      <section class="secure-screen">
        <p class="eyebrow game-eyebrow">HABILIDAD NO DISPONIBLE</p>
        ${bloqueRolPrivado()}
        <p class="game-copy">${escapeHtml(mensaje)}</p>
        <button class="primary-action" id="skip-action" type="button"><span>Ocultar y continuar</span><span aria-hidden="true">↗</span></button>
      </section>
    `;
    gameContent.querySelector('#skip-action').addEventListener('click', completarTurno);
  }

  function mostrarOpcionesVoto(mensajePrivado = '', usarHabilidadFraude = false) {
    if (!partida.puedeEmitirVoto(jugadorEnTurno)) {
      gameContent.innerHTML = `
        <section class="secure-screen">
          <p class="eyebrow game-eyebrow">VOTACIÓN CONFIDENCIAL</p>
          ${bloqueRolPrivado()}
          <h2 class="game-title">No puedes votar esta ronda.</h2>
          <button class="primary-action" id="skip-vote" type="button"><span>Ocultar y continuar</span><span aria-hidden="true">↗</span></button>
        </section>
      `;
      gameContent.querySelector('#skip-vote').addEventListener('click', completarTurno);
      return;
    }

    const sospechosos = partida.jugadores.filter((jugador) => (
      !jugador.estaEncarcelado
      && jugador.id !== jugadorEnTurno.id
      && partida.puedeVotarPor(jugadorEnTurno, jugador)
    ));
    const puedeAlterar = partida.puedeAlterarVoto(jugadorEnTurno);
    const historial = jugadorEnTurno.rol === 'Fraude'
      ? partida.obtenerVotosPrevios(jugadorEnTurno)
      : [];
    const historialMarkup = historial.length
      ? `<div class="secret-block">
          <p class="secret-label">Votos emitidos antes que el tuyo</p>
          ${historial.map((voto) => `
            <p class="game-copy">${escapeHtml(voto.votante.nombre)} → ${escapeHtml(voto.objetivo.nombre)}${voto.anulado ? ' · ANULADO' : ''}
              ${usarHabilidadFraude && puedeAlterar && !voto.anulado ? `<button class="vote-option" type="button" data-role-ability data-cancel-vote="${voto.votanteId}">Anular este voto</button>` : ''}
            </p>
          `).join('')}
          ${puedeAlterar && !usarHabilidadFraude ? '<button class="primary-action" id="use-fraud-vote" data-role-ability type="button">Usar habilidad · anular un voto</button>' : ''}
          ${usarHabilidadFraude ? '<button class="primary-action" id="cancel-fraud-vote" type="button">No anular</button>' : ''}
        </div>`
      : '';
    const alcaldePuedePotenciar = jugadorEnTurno.rol === 'Alcalde'
      && partida.puedeUsarHabilidad(jugadorEnTurno)
      && sospechosos.length > 0
      && !jugadorEnTurno.alcaldeVotoPotenciado;
    const alcaldeAviso = jugadorEnTurno.alcaldeVotoPotenciado
      ? '<p class="game-copy">Voto doble activado: tu selección contará por dos.</p>'
      : '';
    gameContent.innerHTML = `
      <section class="secure-screen">
        <p class="eyebrow game-eyebrow">VOTO CONFIDENCIAL</p>
        ${bloqueRolPrivado()}
        <h2 class="game-title">¿A quién señalas?</h2>
        <p class="game-copy">Elige un jugador. Tu voto se mantiene secreto.</p>
        ${alcaldeAviso}
        ${alcaldePuedePotenciar ? '<button class="primary-action" id="use-mayor-vote" data-role-ability type="button"><span>Usar habilidad · voto doble</span><span aria-hidden="true">↗</span></button>' : ''}
        ${mensajePrivado ? `<p class="game-copy">${escapeHtml(mensajePrivado)}</p>` : ''}
        ${historialMarkup}
        <div class="vote-options">${sospechosos.map((jugador) => `
          <button class="vote-option" type="button" data-vote="${jugador.id}">${escapeHtml(jugador.nombre)}</button>
        `).join('')}${sospechosos.length ? '' : '<p class="game-copy">No hay un objetivo disponible; continúa sin votar.</p>'}</div>
        ${sospechosos.length ? '' : '<button class="primary-action" id="skip-vote" type="button"><span>Continuar</span><span aria-hidden="true">↗</span></button>'}
      </section>
    `;
    gameContent.querySelector('#use-mayor-vote')?.addEventListener('click', () => {
      partida.usarHabilidadAlcalde(jugadorEnTurno);
      mostrarOpcionesVoto('Habilidad del Alcalde activada.');
    });
    gameContent.querySelector('#use-fraud-vote')?.addEventListener('click', () => {
      mostrarOpcionesVoto('', true);
    });
    gameContent.querySelector('#cancel-fraud-vote')?.addEventListener('click', () => {
      mostrarOpcionesVoto();
    });
    gameContent.querySelectorAll('[data-cancel-vote]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const votante = partida.jugadores.find((jugador) => (
          jugador.id === Number(boton.dataset.cancelVote)
        ));
        partida.anularVoto(jugadorEnTurno, votante.id);
        mostrarOpcionesVoto(`Anulaste el voto de ${votante.nombre}. Ahora emite el tuyo.`);
      });
    });
    gameContent.querySelector('#skip-vote')?.addEventListener('click', completarTurno);
    gameContent.querySelectorAll('[data-vote]').forEach((boton) => {
      boton.addEventListener('click', () => {
        partida.registrarVoto(jugadorEnTurno, Number(boton.dataset.vote));
        gameContent.innerHTML = `
          <section class="secure-screen">
            <p class="eyebrow game-eyebrow">VOTO REGISTRADO</p>
            <h2 class="game-title">La decisión está sellada.</h2>
            <button class="primary-action" id="next-voter" type="button"><span>Ocultar y continuar</span><span aria-hidden="true">↗</span></button>
          </section>
        `;
        gameContent.querySelector('#next-voter').addEventListener('click', completarTurno);
      });
    });
  }

  function completarTurno() {
    if (modoInformeLan) {
      const notes = jugadorEnTurno?.rol === 'Detective'
        && !lanAssignment?.report?.notesBlocked
        ? jugadorEnTurno.notasDetective
        : undefined;
      modoInformeLan = false;
      gameContent = localGameContent;
      jugadorEnTurno = jugadorLocalAntesDeMinijuegoLan;
      jugadorLocalAntesDeMinijuegoLan = undefined;

      lanSocket.emit('player:complete-report', { notes }, (result) => {
        lanMinigameStarted = false;
        if (!result?.ok) {
          lanReportError = result?.message || 'No se pudo registrar el informe. Vuelve a intentarlo.';
          mostrarAsignacionLan();
          return;
        }
        lanAssignment.notes = notes || lanAssignment.notes;
        lanReportComplete = true;
        lanReportError = '';
        lanWaitingMessage = null;
        mostrarAsignacionLan();
      });
      return;
    }

    const siguiente = partida.siguienteTurnoPassAndPlay();
    if (siguiente) {
      jugadorEnTurno = siguiente;
      mostrarPase();
      return;
    }

    if (modoPassAndPlay === 'identidad') {
      mostrarFinAsignacion();
    } else if (modoPassAndPlay === 'silencio') {
      iniciarAccionesHackeador();
    } else if (modoPassAndPlay === 'hackeo') {
      iniciarTurnos('informe', partida.ordenInformes);
    } else if (modoPassAndPlay === 'informe') {
      iniciarDiscusion();
    } else {
      mostrarResultadoVotacion();
    }
  }

  function mostrarFinAsignacion() {
    phaseLabel.textContent = 'ASIGNACIÓN COMPLETA';
    gameContent.innerHTML = `
      <section>
        <p class="eyebrow game-eyebrow">TODAS LAS IDENTIDADES ENTREGADAS</p>
        <h2 class="game-title">Que comience el descenso.</h2>
        <p class="game-copy">Cada jugador ya conoce su bando y su rol.</p>
        <button class="primary-action" id="begin-reports" type="button"><span>Continuar a informes</span><span aria-hidden="true">↗</span></button>
      </section>
    `;
    gameContent.querySelector('#begin-reports').addEventListener('click', () => {
      partida.generarInformes();
      iniciarAccionesSilenciador();
    });
  }

  function iniciarDiscusion() {
    clearInterval(temporizador);
    phaseLabel.textContent = 'DISCUSIÓN';
    segundosRestantes = partida.tiempoDiscusion;
    gameContent.innerHTML = `
      <section>
        <p class="eyebrow game-eyebrow">PUESTA EN COMÚN</p>
        <h2 class="game-title">Hablen. Escuchen. Duden.</h2>
        <div class="discussion-clock" id="discussion-clock">${formatearTiempo(segundosRestantes)}</div>
        <button class="primary-action" id="begin-vote" type="button"><span>Ir a votación</span><span aria-hidden="true">↗</span></button>
      </section>
    `;
    temporizador = setInterval(() => {
      segundosRestantes -= 1;
      const clock = gameContent.querySelector('#discussion-clock');
      if (clock) clock.textContent = formatearTiempo(segundosRestantes);
      if (segundosRestantes <= 0) comenzarVotacion();
    }, 1000);
    gameContent.querySelector('#begin-vote').addEventListener('click', comenzarVotacion);
  }

  function formatearTiempo(segundos) {
    const minutos = Math.floor(segundos / 60).toString().padStart(2, '0');
    const resto = (segundos % 60).toString().padStart(2, '0');
    return `${minutos}:${resto}`;
  }

  function comenzarVotacion() {
    clearInterval(temporizador);
    const activos = partida.jugadores.filter((jugador) => !jugador.estaEncarcelado);
    iniciarTurnos('voto', activos);
  }

  function mostrarResultadoVotacion() {
    const resultado = partida.procesarVotacion();
    const victoria = partida.verificarCondicionesVictoria();
    phaseLabel.textContent = victoria ? 'FIN DE PARTIDA' : 'REVELACIÓN';
    const notaDetective = resultado.encarcelado?.rol === 'Detective'
      ? `<div class="secret-block detective-reveal"><p class="secret-label">Libreta de notas de ${escapeHtml(resultado.encarcelado.nombre)}</p><p class="game-copy message-copy">${resultado.encarcelado.notasDetective.trim() ? escapeHtml(resultado.encarcelado.notasDetective) : 'No dejó notas.'}</p></div>`
      : '';
    const revelacion = resultado.encarcelado
      ? `<p class="game-copy"><strong>${escapeHtml(resultado.encarcelado.nombre)}</strong> ha sido encarcelado. Era ${escapeHtml(resultado.identidadRevelada.rol)}, ${escapeHtml(resultado.identidadRevelada.bando)}.</p>`
      : resultado.jugadorSalvado
        ? `<p class="game-copy"><strong>${escapeHtml(resultado.jugadorSalvado.nombre)}</strong> recibió más votos, pero su escudo lo salvó de la cárcel.</p>`
        : `<p class="game-copy">La votación terminó en empate. Nadie fue encarcelado.</p>`;

    if (victoria) {
      const textoGanador = victoria.ganador === 'Evento'
        ? `${escapeHtml(victoria.jugador.nombre)} CUMPLIÓ ${escapeHtml(victoria.evento)}`
        : victoria.ganador === 'Topo'
          ? 'LOS TOPOS GANAN'
          : victoria.ganador === 'Minero' ? 'LOS MINEROS GANAN' : `${escapeHtml(victoria.jugador.nombre)} GANA COMO NEUTRAL`;
      const mostrarJugadores = (jugadores) => jugadores.map(({ jugador, motivos }) => `
        <li class="outcome-card">
          <strong>${escapeHtml(jugador.nombre)}</strong>
          <span class="outcome-identity">${escapeHtml(jugador.bando)} · ${escapeHtml(jugador.rol)}</span>
          <ul class="outcome-reasons">${motivos.map((motivo) => `<li>${escapeHtml(motivo)}</li>`).join('')}</ul>
        </li>
      `).join('');
      const ganadores = mostrarJugadores(victoria.ganadores);
      const perdedores = mostrarJugadores(victoria.perdedores);
      gameContent.innerHTML = `
        <section>
          <p class="result-mark">${textoGanador}</p>
          <h2 class="game-title">La mina tiene dueño.</h2>
          ${revelacion}
          ${notaDetective}
          <div class="outcome-groups">
            <section class="outcome-group outcome-winners" aria-labelledby="winners-heading">
              <h3 id="winners-heading">Ganadores (${victoria.ganadores.length})</h3>
              <ul class="outcome-list">${ganadores}</ul>
            </section>
            <section class="outcome-group outcome-losers" aria-labelledby="losers-heading">
              <h3 id="losers-heading">Perdedores (${victoria.perdedores.length})</h3>
              <ul class="outcome-list">${perdedores}</ul>
            </section>
          </div>
          <button class="primary-action" id="restart-game" type="button"><span>Jugar de nuevo</span><span aria-hidden="true">↗</span></button>
        </section>
      `;
      gameContent.querySelector('#restart-game').addEventListener('click', () => window.location.reload());
      return;
    }

    gameContent.innerHTML = `
      <section>
        <p class="eyebrow game-eyebrow">REVELACIÓN</p>
        <h2 class="game-title">La urna ha hablado.</h2>
        ${revelacion}
        ${notaDetective}
        <button class="primary-action" id="next-round" type="button"><span>Siguiente ronda</span><span aria-hidden="true">↗</span></button>
      </section>
    `;
    gameContent.querySelector('#next-round').addEventListener('click', () => {
      partida.generarInformes();
      iniciarAccionesSilenciador();
    });
  }

  actualizarLista();
})();