const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { Bonjour } = require('bonjour-service');
const QRCode = require('qrcode');
const { Server } = require('socket.io');

require('./jugador.js');
require('./partida.js');

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const ROOT = __dirname;
const MIN_PLAYERS = 6;
const MAX_PLAYERS = 15;
const rooms = new Map();
const minigames = [
  'Computadora con frase de acceso',
  'Sintonizador de radio',
  'Tubo neumático',
  'Linterna UV',
  'Teléfono de disco retro',
  'Terminal de números',
  'Proyector de película vintage',
  'Elevador de 9 pisos y mesa de informes',
];
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
  Comunicador: 'Una vez por partida, durante la fase de informes, envías un mensaje anónimo a un jugador vivo.',
  'Chivo Expiatorio': 'Ganas si consigues que te encarcelen por mayoría.',
  Sobreviviente: 'Tu escudo te salva de una votación una vez. Ganas si llegas vivo al final.',
  Mercenario: 'Ganas si logras que tu objetivo sea encarcelado.',
};

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  } catch {
    response.writeHead(400).end('Invalid URL');
    return;
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(ROOT, `.${requestedPath}`);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (['server.js', 'package.json'].includes(path.basename(filePath))) {
    response.writeHead(404).end('Not found');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('File unavailable');
      return;
    }
    const extension = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.mp3': 'audio/mpeg',
      '.svg': 'image/svg+xml',
    };
    response.writeHead(200, {
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(content);
  });
});

const io = new Server(server);

function getLanAddress() {
  const allInterfaces = Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) => (
    (addresses || []).map((entry) => ({ ...entry, interfaceName: name }))
  ));
  const candidates = allInterfaces.filter((entry) => (
    (entry.family === 'IPv4' || entry.family === 4)
    && !entry.internal
    && !entry.address.startsWith('169.254.')
  ));
  const candidate = candidates.find((entry) => /wi-?fi|wireless/i.test(entry.interfaceName))
    || candidates.find((entry) => (
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address)
    ))
    || candidates[0];
  if (!candidate) {
    throw new Error('No se encontró una dirección IPv4 de la red local.');
  }
  return candidate.address;
}

function publishPlayers(room) {
  const players = [...room.players.values()]
    .filter(({ connected }) => connected !== false)
    .map(({ name }) => ({ name }));
  io.to(room.id).emit('room:players', {
    players,
    minimum: MIN_PLAYERS,
    maximum: MAX_PLAYERS,
    canStart: players.length >= MIN_PLAYERS && !room.started,
  });
}

function getPrivateAssignment(player, players, partida) {
  const allies = player.bando === 'Minero'
    ? players.filter((other) => other.id !== player.id
      && (other.bando === 'Minero' || other.rol === 'Traicionero'))
    : [];
  const traitors = player.rol === 'Cómplice'
    ? players.filter((other) => other.rol === 'Traicionero')
    : [];
  const objective = player.rol === 'Mercenario'
    ? players.find((other) => other.id === player.objetivoId)
    : null;
  const report = player.tarjetaRonda;
  return {
    id: player.id,
    name: player.nombre,
    faction: player.bando,
    role: player.rol,
    roleDescription: roleDescriptions[player.rol] || 'Sin descripción disponible.',
    allies: allies.map(({ nombre }) => nombre),
    traitors: traitors.map(({ nombre }) => nombre),
    objective: objective?.nombre || null,
    report: {
      title: report?.titulo || 'Informe',
      clues: report?.informes?.filter(
        (clue) => clue !== report.informeAdicionalRevelado,
      ) || [],
      additionalClue: report?.informeAdicionalRevelado || null,
      investigatorClueAvailable: Boolean(
        report && partida.puedeRevelarPistaInvestigador(player),
      ),
      notesBlocked: player.rol === 'Detective'
        && !partida.puedeUsarHabilidad(player),
      event: report?.evento ? {
        name: report.evento.nombre,
        text: report.evento.texto,
      } : null,
    },
    messages: player.mensajesAnonimos
      .filter((message) => !message.leido)
      .map(({ mensaje, ronda }) => ({ mensaje, ronda })),
    notes: player.rol === 'Detective' ? player.notasDetective : null,
  };
}

function getRecord(room, playerId) {
  return room.players.get(Number(playerId));
}

function emitPlayer(record, event, payload) {
  if (record?.socketId) io.to(record.socketId).emit(event, payload);
}

function getActivePlayers(room) {
  return room.partida.jugadores.filter((player) => !player.estaEncarcelado);
}

function getRoomState(room) {
  const active = getActivePlayers(room);
  const completedReports = room.reportDone?.size ?? 0;
  const discussionSecondsRemaining = room.phase === 'DISCUSION'
    ? Math.max(0, Math.ceil((room.discussionEndsAt - Date.now()) / 1000))
    : 0;
  return {
    roomId: room.id,
    phase: room.phase,
    round: room.partida?.rondaActual ?? 0,
    players: [...room.players.values()].map(({ id, name, jugador, connected }) => ({
      id,
      name,
      active: jugador ? !jugador.estaEncarcelado : true,
      connected: connected !== false,
    })),
    activeCount: active.length,
    reportsDone: completedReports,
    reportsTotal: room.phase === 'INFORMES' ? active.length : 0,
    discussionSecondsRemaining,
    discussionReady: room.discussionReady?.size ?? 0,
    votesDone: room.voteIndex ?? 0,
    votesTotal: room.voteOrder?.length ?? 0,
    currentVoter: room.voteOrder?.[room.voteIndex]?.nombre ?? null,
    nextRoundReady: room.nextRoundReady?.size ?? 0,
    victory: Boolean(room.reveal?.victory),
  };
}

function publishRoomState(room) {
  io.to(room.id).emit('room:phase', getRoomState(room));
}

function clearDiscussionTimer(room) {
  if (room.discussionInterval) {
    clearInterval(room.discussionInterval);
    room.discussionInterval = null;
  }
}

function sendActionPrompt(room, playerId, type) {
  const record = getRecord(room, playerId);
  if (!record?.connected) return;
  const player = record.jugador;
  const targets = type === 'silencer'
    ? room.partida.jugadores.filter((target) => room.partida.puedeSilenciarA(player, target))
    : room.partida.jugadores.filter((target) => (
      !target.estaEncarcelado && target.id !== player.id
    ));
  emitPlayer(record, 'player:phase-action', {
    type,
    round: room.partida.rondaActual,
    identity: {
      id: player.id,
      name: player.nombre,
      faction: player.bando,
      role: player.rol,
      roleDescription: roleDescriptions[player.rol] || 'Sin descripción disponible.',
    },
    targets: targets.map(({ id, nombre }) => ({ id, name: nombre })),
  });
}

function beginPlayerActionPhase(room, type) {
  const roles = {
    silencer: 'Silenciador',
    hacker: 'Hackeador',
    communicator: 'Comunicador',
  };
  room.phase = type === 'silencer'
    ? 'ACCIONES_SILENCIADOR'
    : type === 'hacker' ? 'ACCIONES_HACKEADOR' : 'MENSAJES';
  room.actionType = type;
  room.pendingActions = new Set(room.partida.jugadores
    .filter((player) => (
      !player.estaEncarcelado
      && getRecord(room, player.id)?.connected
      && player.rol === roles[type]
      && (type !== 'silencer' || room.partida.puedeUsarHabilidadSilenciador(player))
      && (type !== 'hacker' || (
        room.partida.puedeUsarHabilidad(player)
        && player.hackeoRonda !== room.partida.rondaActual
      ))
      && (type !== 'communicator' || (
        room.partida.puedeUsarHabilidad(player) && !player.comunicadorUsado
      ))
    ))
    .map((player) => player.id));
  publishRoomState(room);

  if (room.pendingActions.size === 0) {
    finishPlayerActionPhase(room);
    return;
  }
  for (const playerId of room.pendingActions) {
    sendActionPrompt(room, playerId, type);
  }
}

function finishPlayerActionPhase(room) {
  if (room.actionType === 'silencer') {
    room.partida.prepararInformes();
    beginPlayerActionPhase(room, 'hacker');
    return;
  }
  if (room.actionType === 'hacker') {
    beginPlayerActionPhase(room, 'communicator');
    return;
  }
  beginReportPhase(room);
}

function beginReportPhase(room) {
  room.phase = 'INFORMES';
  room.actionType = null;
  room.pendingActions = new Set();
  room.reportDone = new Set();
  for (const player of getActivePlayers(room)) {
    const record = getRecord(room, player.id);
    if (!record.connected) {
      room.reportDone.add(player.id);
      continue;
    }
    record.minigame = minigames[crypto.randomInt(minigames.length)];
    emitPlayer(record, 'player:round-report', {
      assignment: getPrivateAssignment(player, room.partida.jugadores, room.partida),
      minigame: record.minigame,
    });
  }
  publishRoomState(room);
  if (room.reportDone.size === getActivePlayers(room).length) beginDiscussion(room);
}

function beginDiscussion(room) {
  if (room.phase !== 'INFORMES') return;
  room.phase = 'DISCUSION';
  room.discussionReady = new Set([...room.players.values()]
    .filter((record) => !record.connected && record.jugador && !record.jugador.estaEncarcelado)
    .map((record) => record.id));
  room.discussionEndsAt = Date.now() + room.partida.tiempoDiscusion * 1000;
  publishRoomState(room);
  clearDiscussionTimer(room);
  room.discussionInterval = setInterval(() => {
    if (Date.now() >= room.discussionEndsAt) {
      beginVoting(room);
    } else {
      publishRoomState(room);
    }
  }, 1000);
}

function beginVoting(room) {
  if (room.phase !== 'DISCUSION') return;
  clearDiscussionTimer(room);
  room.partida.iniciarVotacion(getActivePlayers(room));
  room.phase = 'VOTACION';
  room.voteOrder = [...room.partida.ordenTurnos];
  room.voteIndex = 0;
  publishRoomState(room);
  sendCurrentVoteTurn(room);
}

function getVoteCandidates(room, voter) {
  return room.partida.jugadores.filter((target) => (
    !target.estaEncarcelado
    && target.id !== voter.id
    && room.partida.puedeVotarPor(voter, target)
  ));
}

function sendCurrentVoteTurn(room) {
  const voter = room.voteOrder[room.voteIndex];
  if (!voter) {
    resolveVoting(room);
    return;
  }
  const record = getRecord(room, voter.id);
  if (!record?.connected) {
    room.voteIndex += 1;
    sendCurrentVoteTurn(room);
    return;
  }
  const candidates = getVoteCandidates(room, voter);
  const canVote = room.partida.puedeEmitirVoto(voter) && candidates.length > 0;
  const previousVotes = room.partida.obtenerVotosPrevios(voter)
    .map((vote) => ({
    voterId: vote.votanteId,
    voterName: vote.votante.nombre,
    targetName: vote.objetivo.nombre,
    cancelled: vote.anulado,
    }));
  emitPlayer(record, 'player:vote-turn', {
    round: room.partida.rondaActual,
    canVote,
    candidates: candidates.map(({ id, nombre }) => ({ id, name: nombre })),
    canCancelVote: room.partida.puedeAlterarVoto(voter),
    canSeePreviousVotes: voter.rol === 'Fraude',
    previousVotes,
    canUseMayorAbility: canVote && voter.rol === 'Alcalde'
      && room.partida.puedeUsarHabilidad(voter)
      && !voter.alcaldeVotoPotenciado,
    doubleVote: (voter.rol === 'Alcalde'
      && voter.alcaldeVotoPotenciado
      && room.partida.puedeUsarHabilidad(voter))
      || (voter.evento?.id === 'voto-doble-evento'
        && voter.evento.ronda === room.partida.rondaActual && !voter.evento.usado),
    blocked: !room.partida.puedeEmitirVoto(voter),
  });
  publishRoomState(room);
}

function serializeReveal(room, result, victory) {
  const imprisoned = result.encarcelado;
  return {
    round: room.partida.rondaActual,
    imprisoned: imprisoned ? {
      name: imprisoned.nombre,
      role: result.identidadRevelada.rol,
      faction: result.identidadRevelada.bando,
      detectiveNotes: imprisoned.rol === 'Detective' ? imprisoned.notasDetective : null,
    } : null,
    saved: result.jugadorSalvado?.nombre ?? null,
    tie: !imprisoned && !result.jugadorSalvado,
    victory: victory ? {
      winner: victory.ganador,
      headline: victory.ganador === 'Evento'
        ? `${victory.jugador.nombre} cumplió ${victory.evento}`
        : victory.ganador === 'Topo'
          ? 'Los Topos ganan'
          : victory.ganador === 'Minero'
            ? 'Los Mineros ganan'
            : `${victory.jugador.nombre} gana como Neutral`,
      winners: victory.ganadores.map(({ jugador, motivos }) => ({
        name: jugador.nombre,
        faction: jugador.bando,
        role: jugador.rol,
        reasons: motivos,
      })),
      losers: victory.perdedores.map(({ jugador, motivos }) => ({
        name: jugador.nombre,
        faction: jugador.bando,
        role: jugador.rol,
        reasons: motivos,
      })),
    } : null,
    identities: victory
      ? room.partida.jugadores.map((player) => ({
        name: player.nombre,
        faction: player.bando,
        role: player.rol,
      }))
      : null,
  };
}

function resolveVoting(room) {
  const result = room.partida.procesarVotacion();
  const victory = room.partida.verificarCondicionesVictoria();
  room.phase = 'REVELACION';
  room.reveal = serializeReveal(room, result, victory);
  room.nextRoundReady = new Set([...room.players.values()]
    .filter((record) => !record.connected && record.jugador && !record.jugador.estaEncarcelado)
    .map((record) => record.id));
  publishRoomState(room);
  io.to(room.id).emit('room:reveal', room.reveal);
}

function beginNextRound(room) {
  if (room.phase !== 'REVELACION' || room.reveal?.victory) return;
  const activeIds = new Set(getActivePlayers(room).map((player) => player.id));
  if (![...activeIds].every((id) => room.nextRoundReady.has(id))) return;
  room.partida.generarInformes();
  room.reveal = null;
  beginPlayerActionPhase(room, 'silencer');
}

function syncPlayer(room, record) {
  if (!room.started || !record?.jugador) return;
  const player = record.jugador;
  if (room.phase === 'INFORMES') {
    if (player.estaEncarcelado) {
      emitPlayer(record, 'player:waiting', { message: 'Estás fuera de la partida. Espera la revelación.' });
    } else if (room.reportDone.has(player.id)) {
      emitPlayer(record, 'player:waiting', { message: 'Informe completado. Espera a los demás jugadores.' });
    } else {
      emitPlayer(record, 'player:round-report', {
        assignment: getPrivateAssignment(player, room.partida.jugadores, room.partida),
        minigame: record.minigame,
      });
    }
  } else if (room.phase === 'ACCIONES_SILENCIADOR'
    || room.phase === 'ACCIONES_HACKEADOR'
    || room.phase === 'MENSAJES') {
    const type = room.actionType;
    if (room.pendingActions.has(player.id)) {
      sendActionPrompt(room, player.id, type);
    } else {
      emitPlayer(record, 'player:waiting', { message: 'Tu acción está lista. Espera a los demás jugadores.' });
    }
  } else if (room.phase === 'DISCUSION') {
    emitPlayer(record, 'player:waiting', { message: 'La discusión está en curso.' });
  } else if (room.phase === 'VOTACION') {
    if (room.voteOrder[room.voteIndex]?.id === player.id) sendCurrentVoteTurn(room);
    else emitPlayer(record, 'player:waiting', { message: 'Espera tu turno de votación.' });
  } else if (room.phase === 'REVELACION') {
    emitPlayer(record, 'room:reveal', room.reveal);
  }
}

io.on('connection', (socket) => {
  socket.on('host:create-room', async (...args) => {
    const acknowledge = typeof args.at(-1) === 'function' ? args.at(-1) : () => {};
    try {
      if (socket.data.roomId) {
        throw new Error('Este dispositivo ya administra una sala.');
      }
      let roomId;
      do {
        roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
      } while (rooms.has(roomId));

      const ip = getLanAddress();
      const joinUrl = new URL('/', `http://${ip}:${PORT}`);
      joinUrl.searchParams.set('room', roomId);
      const qrDataUrl = await QRCode.toDataURL(joinUrl.toString(), {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 280,
      });
      const room = {
        id: roomId,
        hostSocketId: socket.id,
        players: new Map(),
        started: false,
        discussionInterval: null,
      };
      rooms.set(roomId, room);
      socket.data.roomId = roomId;
      socket.join(roomId);
      acknowledge({
        ok: true,
        roomId,
        qrDataUrl,
        joinUrl: `http://underground.local:${PORT}/?room=${roomId}`,
      });
      publishPlayers(room);
    } catch (error) {
      acknowledge({ ok: false, message: error.message });
    }
  });

  socket.on('player:join-room', (payload = {}, callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    const { roomId, name } = payload && typeof payload === 'object' ? payload : {};
    const room = rooms.get(String(roomId || '').trim().toUpperCase());
    const safeName = typeof name === 'string' ? name.trim() : '';
    if (!room) {
      acknowledge({ ok: false, message: 'No se encontró esa sala. Pide al host un QR o enlace nuevo.' });
      return;
    }
    if (safeName.length < 1 || safeName.length > 24) {
      acknowledge({ ok: false, message: 'El apodo debe tener entre 1 y 24 caracteres.' });
      return;
    }
    if (room.started
      || [...room.players.values()].filter(({ connected }) => connected !== false).length >= MAX_PLAYERS) {
      acknowledge({
        ok: false,
        message: room.started
          ? 'La partida ya comenzó; no se pueden unir más jugadores.'
          : 'La sala está completa (15 jugadores).',
      });
      return;
    }
    if ([...room.players.values()].some((player) => (
      player.name.toLocaleLowerCase() === safeName.toLocaleLowerCase()
    ))) {
      acknowledge({ ok: false, message: 'Ese apodo ya está en la sala.' });
      return;
    }

    const usedIds = new Set(room.players.keys());
    let id = 1;
    while (usedIds.has(id)) id += 1;
    const record = {
      id,
      socketId: socket.id,
      name: safeName,
      token: crypto.randomBytes(24).toString('hex'),
      connected: true,
    };
    room.players.set(id, record);
    socket.data.roomId = room.id;
    socket.data.playerId = id;
    socket.join(room.id);
    acknowledge({ ok: true, roomId: room.id, name: safeName, token: record.token });
    publishPlayers(room);
  });

  socket.on('player:rejoin-room', (payload = {}, callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    const room = rooms.get(String(payload.roomId || '').trim().toUpperCase());
    const record = room && [...room.players.values()].find((player) => (
      player.token === payload.token
    ));
    if (!room || !record || (room.started && !record.jugador)) {
      acknowledge({ ok: false, message: 'No se pudo recuperar esta partida. Solicita un enlace nuevo al host.' });
      return;
    }
    record.socketId = socket.id;
    record.connected = true;
    socket.data.roomId = room.id;
    socket.data.playerId = record.id;
    socket.join(room.id);
    acknowledge({ ok: true, roomId: room.id, name: record.name, token: record.token });
    publishPlayers(room);
    publishRoomState(room);
    syncPlayer(room, record);
  });

  socket.on('player:sync-request', (callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    const room = rooms.get(socket.data.roomId);
    const record = room && getRecord(room, socket.data.playerId);
    if (!record || record.socketId !== socket.id) {
      acknowledge({ ok: false, message: 'No estás conectado a una partida.' });
      return;
    }
    publishRoomState(room);
    syncPlayer(room, record);
    acknowledge({ ok: true });
  });

  socket.on('host:start-room', (...args) => {
    const acknowledge = typeof args.at(-1) === 'function' ? args.at(-1) : () => {};
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || room.hostSocketId !== socket.id) {
      acknowledge({ ok: false, message: 'Solo el host puede iniciar esta sala.' });
      return;
    }
    if (room.started) {
      acknowledge({ ok: false, message: 'La partida ya comenzó.' });
      return;
    }
    const connectedPlayers = [...room.players.values()].filter(({ connected }) => connected !== false);
    if (connectedPlayers.length < MIN_PLAYERS || connectedPlayers.length > MAX_PLAYERS) {
      acknowledge({ ok: false, message: `Se necesitan entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores conectados.` });
      return;
    }

    try {
      const discussionSeconds = Number(args[0]?.discussionSeconds) || 70;
      const partida = new globalThis.Partida({ tiempoDiscusion: discussionSeconds });
      room.players = new Map(connectedPlayers.map((record, index) => {
        record.id = index + 1;
        const playerSocket = io.sockets.sockets.get(record.socketId);
        if (playerSocket) playerSocket.data.playerId = record.id;
        return [record.id, record];
      }));
      connectedPlayers.forEach(({ name }) => partida.agregarJugador(name));
      partida.iniciarPartida();
      partida.generarInformes();
      connectedPlayers.forEach((record, index) => {
        record.jugador = partida.jugadores[index];
      });
      room.started = true;
      room.partida = partida;
      beginPlayerActionPhase(room, 'silencer');
      io.to(room.id).emit('room:started');
      publishPlayers(room);
      acknowledge({ ok: true });
    } catch (error) {
      acknowledge({ ok: false, message: error.message });
    }
  });

  socket.on('player:submit-phase-action', (payload = {}, callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    const room = rooms.get(socket.data.roomId);
    const record = room && getRecord(room, socket.data.playerId);
    if (!room || record?.socketId !== socket.id || !room.pendingActions?.has(record.id)) {
      acknowledge({ ok: false, message: 'No tienes una acción pendiente en esta fase.' });
      return;
    }
    try {
      const { action, targetId, message } = payload;
      const player = record.jugador;
      if (action === 'silence' && room.actionType === 'silencer') {
        room.partida.silenciarObjetivo(
          player,
          room.partida.jugadores.find((candidate) => candidate.id === Number(targetId)),
        );
      } else if (action === 'hack' && room.actionType === 'hacker') {
        room.partida.sabotearInforme(
          player,
          room.partida.jugadores.find((candidate) => candidate.id === Number(targetId)),
        );
      } else if (action === 'send-message' && room.actionType === 'communicator') {
        room.partida.enviarMensajeComunicador(
          player,
          room.partida.jugadores.find((candidate) => candidate.id === Number(targetId)),
          message,
        );
      } else if (action !== 'skip') {
        throw new Error('La acción no corresponde a esta fase.');
      }
      room.pendingActions.delete(record.id);
      acknowledge({ ok: true });
      publishRoomState(room);
      if (room.pendingActions.size === 0) finishPlayerActionPhase(room);
    } catch (error) {
      acknowledge({ ok: false, message: error.message });
    }
  });

  socket.on('player:complete-report', (payload = {}, callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    const room = rooms.get(socket.data.roomId);
    const record = room && getRecord(room, socket.data.playerId);
    if (!room || room.phase !== 'INFORMES' || record?.socketId !== socket.id
      || record.jugador.estaEncarcelado || room.reportDone.has(record.id)) {
      acknowledge({ ok: false, message: 'No puedes completar un informe en este momento.' });
      return;
    }
    if (payload.notes !== undefined && typeof payload.notes !== 'string') {
      acknowledge({ ok: false, message: 'Las notas del Detective no son válidas.' });
      return;
    }
    if (payload.notes !== undefined && record.jugador.rol !== 'Detective') {
      acknowledge({ ok: false, message: 'Solo el Detective puede guardar estas notas.' });
      return;
    }
    if (payload.notes !== undefined && !room.partida.puedeUsarHabilidad(record.jugador)) {
      acknowledge({ ok: false, message: 'La habilidad del Detective está bloqueada esta ronda.' });
      return;
    }
    if (typeof payload.notes === 'string') {
      record.jugador.notasDetective = payload.notes.slice(0, 5000);
    }
    record.jugador.mensajesAnonimos.forEach((message) => {
      if (message.ronda <= room.partida.rondaActual) message.leido = true;
    });
    room.reportDone.add(record.id);
    acknowledge({ ok: true });
    publishRoomState(room);
    if (room.reportDone.size === getActivePlayers(room).length) beginDiscussion(room);
  });

  socket.on('player:reveal-investigator-clue', (callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    const room = rooms.get(socket.data.roomId);
    const record = room && getRecord(room, socket.data.playerId);
    if (!room || room.phase !== 'INFORMES' || record?.socketId !== socket.id
      || record.jugador.estaEncarcelado || room.reportDone.has(record.id)) {
      acknowledge({ ok: false, message: 'No puedes revelar una pista en este momento.' });
      return;
    }
    try {
      const clue = room.partida.revelarPistaInvestigador(record.jugador);
      acknowledge({ ok: true, clue });
    } catch (error) {
      acknowledge({ ok: false, message: error.message });
    }
  });

  socket.on('player:discussion-ready', (callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    const room = rooms.get(socket.data.roomId);
    const record = room && getRecord(room, socket.data.playerId);
    if (!room || room.phase !== 'DISCUSION' || record?.socketId !== socket.id
      || record.jugador.estaEncarcelado) {
      acknowledge({ ok: false, message: 'No puedes avanzar la discusión en este momento.' });
      return;
    }
    room.discussionReady.add(record.id);
    acknowledge({ ok: true });
    publishRoomState(room);
    if (room.discussionReady.size === getActivePlayers(room).length) beginVoting(room);
  });

  socket.on('host:skip-discussion', (callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    const room = rooms.get(socket.data.roomId);
    if (!room || room.hostSocketId !== socket.id || room.phase !== 'DISCUSION') {
      acknowledge({ ok: false, message: 'Solo el host puede finalizar la discusión.' });
      return;
    }
    beginVoting(room);
    acknowledge({ ok: true });
  });

  socket.on('player:cancel-vote', (payload = {}, callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    const room = rooms.get(socket.data.roomId);
    const record = room && getRecord(room, socket.data.playerId);
    const voter = room?.voteOrder?.[room.voteIndex];
    if (!room || room.phase !== 'VOTACION' || record?.socketId !== socket.id
      || voter?.id !== record.id) {
      acknowledge({ ok: false, message: 'No es tu turno para alterar un voto.' });
      return;
    }
    try {
      room.partida.anularVoto(voter, Number(payload.voterId));
      acknowledge({ ok: true });
      sendCurrentVoteTurn(room);
    } catch (error) {
      acknowledge({ ok: false, message: error.message });
    }
  });

  socket.on('player:activate-mayor-vote', (callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    const room = rooms.get(socket.data.roomId);
    const record = room && getRecord(room, socket.data.playerId);
    const voter = room?.voteOrder?.[room.voteIndex];
    if (!room || room.phase !== 'VOTACION' || record?.socketId !== socket.id
      || voter?.id !== record.id) {
      acknowledge({ ok: false, message: 'No es tu turno para activar esta habilidad.' });
      return;
    }
    try {
      room.partida.usarHabilidadAlcalde(voter);
      acknowledge({ ok: true });
      sendCurrentVoteTurn(room);
    } catch (error) {
      acknowledge({ ok: false, message: error.message });
    }
  });

  socket.on('player:submit-vote', (payload = {}, callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    const room = rooms.get(socket.data.roomId);
    const record = room && getRecord(room, socket.data.playerId);
    const voter = room?.voteOrder?.[room.voteIndex];
    if (!room || room.phase !== 'VOTACION' || record?.socketId !== socket.id
      || voter?.id !== record.id) {
      acknowledge({ ok: false, message: 'No es tu turno de votar.' });
      return;
    }
    try {
      const candidates = getVoteCandidates(room, voter);
      if (payload.targetId === null || payload.targetId === undefined) {
        if (room.partida.puedeEmitirVoto(voter) && candidates.length > 0) {
          throw new Error('Debes elegir a un jugador válido.');
        }
      } else {
        room.partida.registrarVoto(voter, Number(payload.targetId));
      }
      room.voteIndex += 1;
      acknowledge({ ok: true });
      if (room.voteIndex >= room.voteOrder.length) resolveVoting(room);
      else sendCurrentVoteTurn(room);
    } catch (error) {
      acknowledge({ ok: false, message: error.message });
    }
  });

  socket.on('player:next-round', (callback) => {
    const acknowledge = typeof callback === 'function' ? callback : () => {};
    const room = rooms.get(socket.data.roomId);
    const record = room && getRecord(room, socket.data.playerId);
    if (!room || room.phase !== 'REVELACION' || room.reveal?.victory
      || record?.socketId !== socket.id || record.jugador.estaEncarcelado) {
      acknowledge({ ok: false, message: 'No puedes iniciar otra ronda en este momento.' });
      return;
    }
    room.nextRoundReady.add(record.id);
    acknowledge({ ok: true });
    publishRoomState(room);
    beginNextRound(room);
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.hostSocketId === socket.id) {
      clearDiscussionTimer(room);
      io.to(room.id).emit('room:closed', { message: 'El host cerró la sala.' });
      rooms.delete(room.id);
      return;
    }
    const record = getRecord(room, socket.data.playerId);
    if (record?.socketId === socket.id) {
      record.connected = false;
      if (!room.started) {
        publishPlayers(room);
        return;
      }
      if (room.started && !record.jugador.estaEncarcelado) {
        if (room.pendingActions?.has(record.id)) {
          room.pendingActions.delete(record.id);
          if (room.pendingActions.size === 0) finishPlayerActionPhase(room);
        }
        if (room.phase === 'INFORMES') {
          room.reportDone.add(record.id);
          if (room.reportDone.size === getActivePlayers(room).length) beginDiscussion(room);
        } else if (room.phase === 'DISCUSION') {
          room.discussionReady.add(record.id);
          if (room.discussionReady.size === getActivePlayers(room).length) beginVoting(room);
        } else if (room.phase === 'VOTACION'
          && room.voteOrder[room.voteIndex]?.id === record.id) {
          room.voteIndex += 1;
          sendCurrentVoteTurn(room);
        } else if (room.phase === 'REVELACION' && !room.reveal?.victory) {
          room.nextRoundReady.add(record.id);
          beginNextRound(room);
        }
      }
    }
    publishPlayers(room);
    if (room.started) publishRoomState(room);
  });
});

const bonjour = new Bonjour();
const service = bonjour.publish({
  name: 'Underground.us',
  type: 'http',
  port: PORT,
  host: 'underground.local',
});

server.listen(PORT, HOST, () => {
  console.log(`Underground.us LAN activo en http://underground.local:${PORT}`);
  try {
    console.log(`Dirección de esta red: http://${getLanAddress()}:${PORT}`);
  } catch (error) {
    console.error(error.message);
  }
});

function shutdown() {
  service.stop();
  bonjour.destroy();
  io.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
