const ROLES = {
  Topo: ['Topo Común', 'Traicionero', 'Investigador', 'Alcalde', 'Detective'],
  Minero: ['Minero Común', 'Fraude', 'Hackeador', 'Infiltrado', 'Cómplice', 'Silenciador', 'Comunicador'],
  Neutral: ['Chivo Expiatorio', 'Sobreviviente', 'Mercenario'],
};

const PROBABILIDAD_EVENTO_POR_JUGADOR = 0.05;

const PLANTILLAS_EVENTOS = [
  {
    id: 'pacto-afinidad',
    nombre: 'Pacto de Afinidad',
    requiereObjetivo: true,
    texto: (jugador, objetivo) => `Sentiste una conexión importante con ${objetivo.nombre}. Tu nueva misión: si logras que ambos lleguen vivos al final, ganas la partida inmediatamente.`,
  },
  {
    id: 'guardaespaldas',
    nombre: 'Guardaespaldas Secreto',
    requiereObjetivo: true,
    texto: (jugador, objetivo) => `Debes proteger a ${objetivo.nombre}. Si ${objetivo.nombre} NUNCA es encarcelado durante toda la partida, obtienes victoria personal.`,
  },
  {
    id: 'venganza',
    nombre: 'Venganza',
    requiereObjetivo: true,
    texto: (jugador, objetivo) => `Infiltrados te extorsionan. Tu nueva meta es lograr que ${objetivo.nombre} sea encarcelado en la siguiente votación.`,
  },
  {
    id: 'voto-doble-evento',
    nombre: 'Voto Doble',
    texto: () => 'Tu linterna falló, pero tu voz resuena más fuerte. En la siguiente votación, tu voto valdrá por 2.',
  },
  {
    id: 'amenaza-sombra',
    nombre: 'Amenaza en la Sombra',
    requiereObjetivo: true,
    texto: (jugador, objetivo) => `Has sido amenazado. No puedes votar por ${objetivo.nombre} en la siguiente ronda de votación.`,
  },
  {
    id: 'escudo-temporal',
    nombre: 'Escudo Temporal',
    texto: () => 'Conseguiste un chaleco de protección. Si recibes la mayoría de votos en esta ronda, te salvas de ir a la cárcel una sola vez.',
  },
  {
    id: 'identidad-oculta',
    nombre: 'Identidad Oculta',
    texto: () => 'Un fallo en el sistema borró tus registros. Tu bando no podrá ser detectado por habilidades de otros esta ronda.',
  },
  {
    id: 'efecto-rebote',
    nombre: 'Efecto Rebote',
    requiereObjetivo: true,
    texto: (jugador, objetivo) => `Si ${objetivo.nombre} resulta encarcelado en esta ronda, perderás tu derecho a votar en el siguiente turno.`,
  },
  {
    id: 'caceria',
    nombre: 'Cacería',
    requiereObjetivo: true,
    texto: (jugador, objetivo) => `Sabes demasiado sobre ${objetivo.nombre}. Ganas una victoria personal si logras que lo encarcelen antes de la ronda 3.`,
  },
  {
    id: 'superviviente-solitario',
    nombre: 'Superviviente Solitario',
    texto: () => 'Ignora la meta de tu bando: si logras sobrevivir hasta que queden solo 3 jugadores en la mina, ganas automáticamente.',
  },
];

class Partida {
  constructor({ tiempoDiscusion = 70, bancoPistas = [] } = {}) {
    if (!Number.isInteger(tiempoDiscusion) || tiempoDiscusion <= 0) {
      throw new TypeError('El tiempo de discusión debe ser un entero positivo.');
    }

    if (!Array.isArray(bancoPistas)) {
      throw new TypeError('El banco de pistas debe ser una lista.');
    }

    this.jugadores = [];
    this.minJugadores = 6;
    this.maxJugadores = 15;
    this.faseActual = 'INICIO';
    this.rondaActual = 1;
    this.indiceTurno = 0;
    this.tiempoDiscusion = tiempoDiscusion;
    this.bancoPistas = [...bancoPistas];
    this.ordenTurnos = [];
    this.ordenInformes = [];
    this.resultadoVotacion = null;
    this.registroVotosRonda = [];
  }

  agregarJugador(nombre) {
    if (this.faseActual !== 'INICIO') {
      throw new Error('Solo se pueden agregar jugadores al inicio.');
    }

    if (this.jugadores.length >= this.maxJugadores) {
      throw new Error(`La partida admite como máximo ${this.maxJugadores} jugadores.`);
    }

    const jugador = new globalThis.Jugador(this.jugadores.length + 1, nombre);
    this.jugadores.push(jugador);
    return jugador;
  }

  iniciarPartida({ cantidadMineros, cantidadNeutrales } = {}) {
    if (this.jugadores.length < this.minJugadores) {
      throw new Error(`Se necesitan al menos ${this.minJugadores} jugadores.`);
    }

    this.repartirBandosYRoles({ cantidadMineros, cantidadNeutrales });
    const mercenarios = this.jugadores.filter((jugador) => jugador.rol === 'Mercenario');
    for (const mercenario of mercenarios) {
      const objetivos = this.jugadores.filter((jugador) => jugador.id !== mercenario.id);
      mercenario.objetivoId = this._elegir(objetivos).id;
    }
    this.faseActual = 'ASIGNACION';
    this.ordenTurnos = this._mezclar(this.jugadores);
    this.indiceTurno = 0;
    return this.jugadores;
  }

  repartirBandosYRoles({ cantidadMineros, cantidadNeutrales } = {}) {
    const total = this.jugadores.length;
    const distribucion = this._obtenerDistribucionInicial(total);
    const mineros = cantidadMineros ?? distribucion.mineros;
    const neutrales = cantidadNeutrales ?? distribucion.neutrales;
    const maxMineros = total === 13 ? 4 : Math.floor(total * 0.3);
    const neutralesValidos = total >= 9 && total <= 10
      ? neutrales === 1 || neutrales === 2
      : neutrales === distribucion.neutrales;

    if (!Number.isInteger(mineros) || mineros < distribucion.mineros || mineros > maxMineros
      || !Number.isInteger(neutrales) || !neutralesValidos
      || mineros + neutrales >= total) {
      throw new RangeError('La distribución de bandos no cumple el balance permitido para esta cantidad de jugadores.');
    }

    const identidades = [
      ...Array(mineros).fill('Minero'),
      ...Array(neutrales).fill('Neutral'),
      ...Array(total - mineros - neutrales).fill('Topo'),
    ];
    const rolesPorBando = Object.fromEntries(
      Object.entries(ROLES).map(([bando, roles]) => [bando, this._mezclar(roles)]),
    );
    const indiceRol = { Topo: 0, Minero: 0, Neutral: 0 };

    this._mezclar(identidades).forEach((bando, indice) => {
      const rolesDisponibles = rolesPorBando[bando];
      const rol = rolesDisponibles[indiceRol[bando] % rolesDisponibles.length];
      indiceRol[bando] += 1;
      this.jugadores[indice].asignarIdentidad(bando, rol);
    });

    if (!this.jugadores.some((jugador) => jugador.rol === 'Traicionero')) {
      for (const jugador of this.jugadores) {
        if (jugador.rol === 'Cómplice') {
          jugador.asignarIdentidad(jugador.bando, 'Minero Común');
        }
      }
    }

    return this.jugadores;
  }

  _obtenerDistribucionInicial(total) {
    if (!Number.isInteger(total) || total < this.minJugadores || total > this.maxJugadores) {
      throw new RangeError(`La partida requiere entre ${this.minJugadores} y ${this.maxJugadores} jugadores.`);
    }

    if (total === 6) return { mineros: 1, neutrales: 1 };
    if (total <= 8) return { mineros: 2, neutrales: 1 };
    if (total <= 10) return { mineros: 2, neutrales: 1 };
    if (total <= 12) return { mineros: 3, neutrales: 2 };
    return { mineros: 4, neutrales: 2 };
  }

  generarInformes() {
    if (this.faseActual === 'REVELACION') {
      this.rondaActual += 1;
    }

    const jugadoresActivos = this.jugadores.filter((jugador) => !jugador.estaEncarcelado);

    for (const jugador of jugadoresActivos) {
      jugador.tarjetaRonda = null;
      jugador.informesRonda = [];
      jugador.asignarPista(null);
    }

    this.ordenTurnos = this._mezclar(jugadoresActivos);
    this.ordenInformes = [...this.ordenTurnos];
    this.indiceTurno = 0;
    this.faseActual = 'INFORMES';
    this.registroVotosRonda = [];
    return this.ordenTurnos;
  }

  prepararInformes() {
    if (this.faseActual !== 'INFORMES') {
      throw new Error('Los informes solo se pueden preparar durante esa fase.');
    }

    const jugadoresActivos = this.jugadores.filter((jugador) => !jugador.estaEncarcelado);
    for (const jugador of jugadoresActivos) {
      this._asignarEvento(jugador);
    }
    for (const jugador of jugadoresActivos) {
      if (jugador.tarjetaRonda?.ronda !== this.rondaActual) {
        this.generarTarjeta(jugador);
      }
    }
    return jugadoresActivos.map((jugador) => jugador.tarjetaRonda);
  }

  generarTarjeta(jugador) {
    if (!jugador || jugador.estaEncarcelado) {
      throw new Error('Solo un jugador activo puede recibir una tarjeta.');
    }

    if (jugador.tarjetaRonda?.ronda === this.rondaActual) {
      return jugador.tarjetaRonda;
    }

    this._asignarEvento(jugador);
    const informes = [this._generarInforme([], jugador)];
    const informeAdicional = this.puedeUsarHabilidad(jugador)
      && jugador.rol === 'Investigador'
      && (jugador.investigadorUltimaRonda === null
        || this.rondaActual - jugador.investigadorUltimaRonda >= 2)
      ? this._generarInforme(informes, jugador)
      : null;

    const evento = jugador.evento?.ronda === this.rondaActual ? jugador.evento : null;

    jugador.informesRonda = informes;
    jugador.asignarPista(informes.join('\n'));
    jugador.tarjetaRonda = {
      tipo: 'informe',
      titulo: informes.length > 1 ? 'Informes' : 'Informe',
      informes,
      informeAdicional,
      evento,
      texto: informes.join('\n'),
      ronda: this.rondaActual,
    };
    return jugador.tarjetaRonda;
  }

  _asignarEvento(jugador) {
    if (this.rondaActual <= 1
      || jugador.eventoRecibido
      || Math.random() >= PROBABILIDAD_EVENTO_POR_JUGADOR) {
      return;
    }

    const candidatos = PLANTILLAS_EVENTOS.filter((evento) => (
      !evento.requiereObjetivo
      || this.jugadores.some((activo) => !activo.estaEncarcelado && activo.id !== jugador.id)
    ));
    const plantilla = this._elegir(candidatos);
    const objetivo = plantilla.requiereObjetivo
      ? this._elegir(this.jugadores.filter((activo) => (
        !activo.estaEncarcelado && activo.id !== jugador.id
      )))
      : null;
    jugador.eventoRecibido = true;
    jugador.evento = {
      id: plantilla.id,
      nombre: plantilla.nombre,
      texto: plantilla.texto(jugador, objetivo),
      objetivoId: objetivo?.id ?? null,
      ronda: this.rondaActual,
      usado: false,
    };
  }

  puedeUsarHabilidad(jugador) {
    return Boolean(jugador)
      && !jugador.estaEncarcelado
      && jugador.habilidadBloqueadaRonda !== this.rondaActual;
  }

  puedeSilenciarA(silenciador, objetivo) {
    return this.faseActual === 'INFORMES'
      && silenciador?.rol === 'Silenciador'
      && this.puedeUsarHabilidadSilenciador(silenciador)
      && Boolean(objetivo)
      && objetivo.id !== silenciador.id
      && !objetivo.estaEncarcelado
      && objetivo.habilidadBloqueadaRonda !== this.rondaActual;
  }

  puedeUsarHabilidadSilenciador(silenciador) {
    return Boolean(silenciador)
      && silenciador.rol === 'Silenciador'
      && this.puedeUsarHabilidad(silenciador)
      && (silenciador.silenciadorUltimaRonda === null
        || this.rondaActual - silenciador.silenciadorUltimaRonda >= 2);
  }

  silenciarObjetivo(silenciador, objetivo) {
    if (!this.puedeSilenciarA(silenciador, objetivo)) {
      throw new Error('El Silenciador no puede bloquear a ese jugador en este momento.');
    }

    objetivo.habilidadBloqueadaRonda = this.rondaActual;
    silenciador.silenciadorUltimaRonda = this.rondaActual;
  }

  usarHabilidadAlcalde(alcalde) {
    if (this.faseActual !== 'VOTACION'
      || alcalde?.rol !== 'Alcalde'
      || !this.puedeUsarHabilidad(alcalde)
      || !this.puedeEmitirVoto(alcalde)
      || alcalde.alcaldeVotoPotenciado
      || alcalde.votoEmitido !== null) {
      throw new Error('El Alcalde no puede activar el voto doble en este momento.');
    }

    alcalde.alcaldeVotoPotenciado = true;
  }

  sabotearInforme(hackeador, objetivo) {
    if (this.faseActual !== 'INFORMES'
      || hackeador?.rol !== 'Hackeador'
      || !this.puedeUsarHabilidad(hackeador)
      || hackeador.hackeoRonda === this.rondaActual
      || !objetivo
      || objetivo.id === hackeador.id
      || objetivo.estaEncarcelado
      || objetivo.tarjetaRonda?.ronda !== this.rondaActual) {
      throw new Error('El Hackeador no puede alterar ese informe en este momento.');
    }

    const falsedad = 'Informe manipulado: un análisis erróneo vincula a un jugador desconocido con el bando Minero.';
    objetivo.informesRonda[0] = falsedad;
    objetivo.tarjetaRonda.informes = [...objetivo.informesRonda];
    objetivo.tarjetaRonda.texto = objetivo.informesRonda.join('\n');
    objetivo.pistaRonda = objetivo.tarjetaRonda.texto;
    hackeador.hackeoRonda = this.rondaActual;
  }

  enviarMensajeComunicador(comunicador, objetivo, mensaje) {
    if (this.faseActual !== 'INFORMES'
      || comunicador?.rol !== 'Comunicador'
      || !this.puedeUsarHabilidad(comunicador)
      || comunicador.comunicadorUsado
      || !objetivo
      || objetivo.estaEncarcelado
      || objetivo.id === comunicador.id
      || !this.jugadores.includes(objetivo)
      || typeof mensaje !== 'string'
      || !mensaje.trim()) {
      throw new Error('El Comunicador no puede enviar ese mensaje en este momento.');
    }

    objetivo.mensajesAnonimos.push({
      mensaje: mensaje.trim(),
      ronda: this.rondaActual,
      leido: false,
    });
    comunicador.comunicadorUsado = true;
  }

  puedeRevelarPistaInvestigador(investigador) {
    return this.faseActual === 'INFORMES'
      && Boolean(investigador)
      && investigador.rol === 'Investigador'
      && this.puedeUsarHabilidad(investigador)
      && investigador.tarjetaRonda?.ronda === this.rondaActual
      && Boolean(investigador.tarjetaRonda.informeAdicional)
      && (investigador.investigadorUltimaRonda === null
        || this.rondaActual - investigador.investigadorUltimaRonda >= 2);
  }

  revelarPistaInvestigador(investigador) {
    if (!this.puedeRevelarPistaInvestigador(investigador)) {
      throw new Error('La pista adicional del Investigador no está disponible en este momento.');
    }

    const pista = investigador.tarjetaRonda.informeAdicional;
    investigador.tarjetaRonda.informes.push(pista);
    investigador.tarjetaRonda.texto = investigador.tarjetaRonda.informes.join('\n');
    investigador.informesRonda = [...investigador.tarjetaRonda.informes];
    investigador.pistaRonda = investigador.tarjetaRonda.texto;
    investigador.tarjetaRonda.informeAdicionalRevelado = pista;
    investigador.tarjetaRonda.informeAdicional = null;
    investigador.investigadorUltimaRonda = this.rondaActual;
    return pista;
  }

  _generarInforme(informesExcluidos = [], jugadorExcluido = null) {
    const activos = this.jugadores.filter((jugador) => (
      !jugador.estaEncarcelado && jugador.id !== jugadorExcluido?.id
    ));
    const pares = this._combinaciones(activos, 2);
    const ternas = this._combinaciones(activos, 3);
    const individuales = activos.map((jugador) => [jugador]);
    const detectables = (jugador) => !(
      jugador.evento?.id === 'identidad-oculta'
      && jugador.evento.ronda === this.rondaActual
    );
    const plantillas = [
      {
        grupos: pares.filter((grupo) => (
          grupo.every(detectables) && grupo.some((jugador) => jugador.bando === 'Topo')
        )),
        crear: ([jugador1, jugador2]) => `Análisis de identidades: hay un 50% de probabilidad de que ${jugador1.nombre} o ${jugador2.nombre} sea un Topo.`,
      },
      {
        grupos: ternas.filter((grupo) => (
          grupo.every(detectables) && grupo.some((jugador) => jugador.bando === 'Minero')
        )),
        crear: ([jugador1, jugador2, jugador3]) => `Análisis de herramientas: al menos uno entre ${jugador1.nombre}, ${jugador2.nombre} o ${jugador3.nombre} pertenece al bando Minero.`,
      },
      {
        grupos: individuales.filter(([jugador]) => (
          jugador.bando === 'Minero' && detectables(jugador)
        )),
        crear: ([jugador]) => `Fotografía analizada: ${jugador.nombre} aparece con insignias identificadas como propias del bando Minero.`,
      },
      {
        grupos: individuales.filter(([jugador]) => (
          jugador.bando === 'Topo' && detectables(jugador)
        )),
        crear: ([jugador]) => `Huella dactilar de ${jugador.nombre}: coincide con el registro biométrico del bando Topo.`,
      },
      {
        grupos: pares.filter(([jugador1, jugador2]) => (
          jugador1.bando !== jugador2.bando && detectables(jugador1) && detectables(jugador2)
        )),
        crear: ([jugador1, jugador2]) => `Registro confidencial: ${jugador1.nombre} NO es del mismo bando que ${jugador2.nombre}.`,
      },
      {
        grupos: pares.filter(([jugador1, jugador2]) => (
          jugador1.bando === jugador2.bando && detectables(jugador1) && detectables(jugador2)
        )),
        crear: ([jugador1, jugador2]) => `Informe topográfico: el bando de ${jugador1.nombre} coincide con el de ${jugador2.nombre}.`,
      },
      {
        grupos: individuales,
        crear: ([jugador1]) => `Documento clasificado: hay un 30% de probabilidad de que ${jugador1.nombre} sea un rol especial.`,
      },
    ].filter((plantilla) => plantilla.grupos.length > 0);

    const opcionesPosibles = plantillas.flatMap((plantilla) => (
      plantilla.grupos.map((grupo) => plantilla.crear(grupo))
    ));
    if (opcionesPosibles.length === 0) {
      return 'No se encontraron pistas concluyentes sobre otros jugadores.';
    }

    const opciones = opcionesPosibles.filter((informe) => !informesExcluidos.includes(informe));
    const disponibles = opciones.length ? opciones : opcionesPosibles;
    return this._elegir(disponibles);
  }

  siguienteTurnoPassAndPlay() {
    if (this.indiceTurno >= this.ordenTurnos.length) {
      return null;
    }

    return this.ordenTurnos[this.indiceTurno++];
  }

  puedeVotarPor(votante, objetivo) {
    if (!this.puedeEmitirVoto(votante)) {
      return false;
    }

    return !(
      votante.evento?.id === 'amenaza-sombra'
      && votante.evento.ronda === this.rondaActual
      && votante.evento.objetivoId === objetivo.id
    );
  }

  puedeEmitirVoto(votante) {
    return Boolean(votante)
      && !votante.estaEncarcelado
      && votante.votoBloqueadoRonda !== this.rondaActual;
  }

  iniciarVotacion(jugadoresActivos) {
    if (this.faseActual !== 'INFORMES' || !Array.isArray(jugadoresActivos)) {
      throw new Error('La votación solo puede comenzar después de los informes.');
    }

    this.ordenTurnos = this._mezclar(jugadoresActivos.filter((jugador) => (
      !jugador.estaEncarcelado
    )));
    this.indiceTurno = 0;
    this.registroVotosRonda = [];
    for (const jugador of jugadoresActivos) {
      jugador.votoEmitido = null;
      jugador.alcaldeVotoPotenciado = false;
    }
    this.faseActual = 'VOTACION';
    return this.ordenTurnos;
  }

  registrarVoto(votante, objetivoId) {
    if (this.faseActual !== 'VOTACION' || !this.puedeEmitirVoto(votante)) {
      throw new Error('Este jugador no puede votar en este momento.');
    }

    const objetivo = this.jugadores.find((jugador) => jugador.id === objetivoId);
    if (!objetivo || objetivo.estaEncarcelado || objetivo.id === votante.id
      || !this.puedeVotarPor(votante, objetivo)) {
      throw new Error('El objetivo seleccionado no es válido para este voto.');
    }

    if (votante.votoEmitido !== null) {
      throw new Error('Este jugador ya emitió su voto en esta ronda.');
    }

    votante.registrarVoto(objetivo.id);
    this.registroVotosRonda.push({
      votanteId: votante.id,
      objetivoId: objetivo.id,
      anulado: false,
    });
  }

  puedeAlterarVoto(fraude) {
    const indiceFraude = this.ordenTurnos.findIndex((jugador) => jugador.id === fraude?.id);
    return this.faseActual === 'VOTACION'
      && fraude?.rol === 'Fraude'
      && indiceFraude > 0
      && this.puedeUsarHabilidad(fraude)
      && !fraude.fraudeAlteracionUsada
      && this.registroVotosRonda.some((voto) => (
        !voto.anulado
        && this.ordenTurnos.findIndex((jugador) => jugador.id === voto.votanteId) < indiceFraude
      ));
  }

  obtenerVotosPrevios(fraude) {
    if (this.faseActual !== 'VOTACION' || fraude?.rol !== 'Fraude') {
      return [];
    }

    const indiceFraude = this.ordenTurnos.findIndex((jugador) => jugador.id === fraude.id);
    return this.registroVotosRonda
      .filter((voto) => (
        this.ordenTurnos.findIndex((jugador) => jugador.id === voto.votanteId) < indiceFraude
      ))
      .map((voto) => ({
        ...voto,
        votante: this.jugadores.find((jugador) => jugador.id === voto.votanteId),
        objetivo: this.jugadores.find((jugador) => jugador.id === voto.objetivoId),
      }));
  }

  anularVoto(fraude, votanteId) {
    if (!this.puedeAlterarVoto(fraude)) {
      throw new Error('El Fraude no puede alterar una urna en este momento.');
    }

    const voto = this.registroVotosRonda.find((registro) => (
      registro.votanteId === votanteId
      && this.ordenTurnos.findIndex((jugador) => jugador.id === registro.votanteId)
        < this.ordenTurnos.findIndex((jugador) => jugador.id === fraude.id)
      && !registro.anulado
    ));
    if (!voto || voto.votanteId === fraude.id) {
      throw new Error('Solo se puede anular un voto previo válido.');
    }

    const votante = this.jugadores.find((jugador) => jugador.id === voto.votanteId);
    votante.votoEmitido = null;
    voto.anulado = true;
    fraude.fraudeAlteracionUsada = true;
  }

  procesarVotacion() {
    if (this.faseActual !== 'VOTACION') {
      throw new Error('No se puede procesar una votación que no ha comenzado.');
    }

    const votos = new Map();

    for (const votante of this.jugadores) {
      if (votante.estaEncarcelado || votante.votoEmitido === null) {
        continue;
      }

      if (!this.puedeEmitirVoto(votante)) {
        continue;
      }

      const objetivo = this.jugadores.find((jugador) => jugador.id === votante.votoEmitido);
      if (!objetivo || objetivo.estaEncarcelado || objetivo.id === votante.id) {
        continue;
      }

      if (!this.puedeVotarPor(votante, objetivo)) {
        continue;
      }

      const votoDobleEvento = votante.evento?.id === 'voto-doble-evento'
        && votante.evento.ronda === this.rondaActual && !votante.evento.usado;
      const votoAlcalde = votante.rol === 'Alcalde'
        && votante.alcaldeVotoPotenciado
        && this.puedeUsarHabilidad(votante);
      const peso = votoAlcalde || votoDobleEvento ? 2 : 1;
      if (votoDobleEvento) {
        votante.evento.usado = true;
      }
      votos.set(objetivo, (votos.get(objetivo) ?? 0) + peso);
    }

    const mayorVotado = Math.max(0, ...votos.values());
    const empatados = [...votos.entries()]
      .filter(([, cantidad]) => cantidad === mayorVotado && mayorVotado > 0)
      .map(([jugador]) => jugador);
    let encarcelado = empatados.length === 1 ? empatados[0] : null;
    let jugadorSalvado = null;

    if (encarcelado) {
      const eventoEscudo = encarcelado.evento?.id === 'escudo-temporal'
        && encarcelado.evento.ronda === this.rondaActual
        && !encarcelado.evento.usado;
      const escudoSobreviviente = encarcelado.rol === 'Sobreviviente'
        && this.puedeUsarHabilidad(encarcelado)
        && !encarcelado.escudoSobrevivienteUsado;

      if (eventoEscudo || escudoSobreviviente) {
        jugadorSalvado = encarcelado;
        if (eventoEscudo) encarcelado.evento.usado = true;
        if (escudoSobreviviente) encarcelado.escudoSobrevivienteUsado = true;
        encarcelado = null;
      }
    }

    if (encarcelado) {
      encarcelado.encarcelar();
    }
    const identidadRevelada = encarcelado
      ? (encarcelado.rol === 'Infiltrado'
        && encarcelado.habilidadBloqueadaRonda !== this.rondaActual
        ? { bando: 'Topo', rol: 'Topo Común' }
        : { bando: encarcelado.bando, rol: encarcelado.rol })
      : null;

    for (const jugador of this.jugadores) {
      if (jugador.evento?.id === 'efecto-rebote'
        && jugador.evento.ronda === this.rondaActual
        && jugador.evento.objetivoId === encarcelado?.id) {
        jugador.votoBloqueadoRonda = this.rondaActual + 1;
      }

      if (jugador.evento?.id === 'venganza'
        && jugador.evento.ronda === this.rondaActual) {
        jugador.evento.usado = encarcelado?.id === jugador.evento.objetivoId;
      }
    }

    for (const jugador of this.jugadores) {
      jugador.votoEmitido = null;
    }

    const conteo = Object.fromEntries(
      [...votos.entries()].map(([jugador, cantidad]) => [jugador.id, cantidad]),
    );
    this.resultadoVotacion = {
      encarcelado,
      jugadorSalvado,
      empatados,
      conteo,
      identidadRevelada,
    };
    this.faseActual = 'REVELACION';
    return this.resultadoVotacion;
  }

  verificarCondicionesVictoria() {
    const activos = this.jugadores.filter((jugador) => !jugador.estaEncarcelado);
    const toposActivos = activos.filter((jugador) => jugador.bando === 'Topo').length;
    const minerosActivos = activos.filter((jugador) => jugador.bando === 'Minero').length;
    const neutralesActivos = activos.filter((jugador) => jugador.bando === 'Neutral').length;
    const votosEmitidos = Object.values(this.resultadoVotacion?.conteo ?? {})
      .reduce((total, cantidad) => total + cantidad, 0);
    const encarcelado = this.resultadoVotacion?.encarcelado;
    const victoriaTopo = minerosActivos === 0;
    const victoriaMinero = minerosActivos >= toposActivos + neutralesActivos;
    const victoriaChivo = this.jugadores.find((jugador) => (
      jugador.rol === 'Chivo Expiatorio'
      && encarcelado?.id === jugador.id
      && (this.resultadoVotacion?.conteo?.[jugador.id] ?? 0) > votosEmitidos / 2
    ));
    const victoriaMercenario = this.jugadores.find((jugador) => (
      jugador.rol === 'Mercenario' && encarcelado?.id === jugador.objetivoId
    ));
    const finPorBando = victoriaTopo || victoriaMinero;
    let victoriaEvento = this._buscarVictoriaEvento(
      activos,
      finPorBando || victoriaChivo || victoriaMercenario,
    );
    const finDePartida = finPorBando || victoriaChivo || victoriaMercenario || victoriaEvento.length > 0;
    if (victoriaEvento.length && finDePartida) {
      victoriaEvento = this._buscarVictoriaEvento(activos, finDePartida);
    }
    const neutralGanador = victoriaChivo || victoriaMercenario
      || ((finPorBando && activos.find((jugador) => jugador.rol === 'Sobreviviente')) ?? null);

    if (!victoriaEvento.length && !neutralGanador && !finPorBando) {
      return null;
    }

    const razonesPorJugador = new Map();
    const agregarMotivo = (jugador, motivo) => {
      if (!razonesPorJugador.has(jugador.id)) razonesPorJugador.set(jugador.id, []);
      razonesPorJugador.get(jugador.id).push(motivo);
    };

    if (victoriaTopo) {
      for (const jugador of activos.filter((activo) => activo.bando === 'Topo')) {
        agregarMotivo(jugador, 'Victoria de bando: no quedan Mineros vivos.');
      }
    }

    if (victoriaMinero) {
      for (const jugador of activos.filter((activo) => activo.bando === 'Minero')) {
        agregarMotivo(jugador, 'Victoria de bando: los Mineros alcanzaron la paridad o mayoría frente a Topos y Neutrales vivos.');
      }
    }

    if (victoriaChivo) {
      agregarMotivo(victoriaChivo, 'Victoria por rol: fue encarcelado con la mayoría de los votos.');
    }

    if (victoriaMercenario) {
      const objetivo = this.jugadores.find((jugador) => jugador.id === victoriaMercenario.objetivoId);
      agregarMotivo(
        victoriaMercenario,
        `Victoria por rol: logró que ${objetivo?.nombre ?? 'su objetivo'} fuera encarcelado.`,
      );
    }

    if (finPorBando) {
      for (const jugador of activos.filter((activo) => activo.rol === 'Sobreviviente')) {
        agregarMotivo(jugador, 'Victoria por rol: llegó con vida al final de la partida.');
      }
    }

    for (const { jugador, evento } of victoriaEvento) {
      agregarMotivo(jugador, this._motivoVictoriaEvento(evento));
    }

    const ganadores = this.jugadores
      .filter((jugador) => razonesPorJugador.has(jugador.id))
      .map((jugador) => ({ jugador, motivos: razonesPorJugador.get(jugador.id) }));
    const ganadoresIds = new Set(ganadores.map(({ jugador }) => jugador.id));
    const perdedores = this.jugadores
      .filter((jugador) => !ganadoresIds.has(jugador.id))
      .map((jugador) => ({ jugador, motivos: this._motivosDerrota(jugador, {
        activos,
        victoriaTopo,
        victoriaMinero,
        victoriaChivo,
        victoriaMercenario,
        finPorBando,
        finDePartida,
      }) }));

    this.faseActual = 'FIN';
    if (victoriaEvento.length) {
      const principal = victoriaEvento[0];
      return {
        ganador: 'Evento',
        jugador: principal.jugador,
        evento: principal.evento.nombre,
        ganadores,
        perdedores,
      };
    }

    if (neutralGanador) {
      return { ganador: 'Neutral', jugador: neutralGanador, ganadores, perdedores };
    }

    return { ganador: victoriaTopo ? 'Topo' : 'Minero', ganadores, perdedores };
  }

  _buscarVictoriaEvento(activos, finDePartida) {
    const encarceladoId = this.resultadoVotacion?.encarcelado?.id;
    const candidatos = this.jugadores.filter((jugador) => jugador.evento);
    return candidatos.filter((jugador) => {
      const evento = jugador.evento;
      const objetivoActivo = activos.some((activo) => activo.id === evento.objetivoId);

      if (evento.id === 'venganza') {
        return evento.ronda === this.rondaActual && encarceladoId === evento.objetivoId;
      }
      if (evento.id === 'caceria') {
        return this.rondaActual < 3 && encarceladoId === evento.objetivoId;
      }
      if (evento.id === 'superviviente-solitario') {
        return activos.length <= 3 && activos.some((activo) => activo.id === jugador.id);
      }
      if (evento.id === 'pacto-afinidad') {
        return finDePartida && objetivoActivo && activos.some((activo) => activo.id === jugador.id);
      }
      if (evento.id === 'guardaespaldas') {
        return finDePartida && objetivoActivo;
      }
      return false;
    }).map((jugador) => ({ jugador, evento: jugador.evento }));
  }

  _motivoVictoriaEvento(evento) {
    const objetivo = this.jugadores.find((candidato) => candidato.id === evento.objetivoId);
    const nombreObjetivo = objetivo ? ` ${objetivo.nombre}` : '';
    const razones = {
      'venganza': `Victoria por evento ${evento.nombre}: logró que${nombreObjetivo} fuera encarcelado en la siguiente votación.`,
      'caceria': `Victoria por evento ${evento.nombre}: logró que${nombreObjetivo} fuera encarcelado antes de la ronda 3.`,
      'superviviente-solitario': `Victoria por evento ${evento.nombre}: sobrevivió cuando quedaban 3 jugadores o menos.`,
      'pacto-afinidad': `Victoria por evento ${evento.nombre}: ambos llegaron vivos al final.`,
      'guardaespaldas': `Victoria por evento ${evento.nombre}: su protegido${nombreObjetivo} llegó sin ser encarcelado.`,
    };
    return razones[evento.id] ?? `Victoria por evento ${evento.nombre}.`;
  }

  _motivosDerrota(jugador, contexto) {
    const motivos = [];
    const evento = jugador.evento;
    const objetivo = evento
      ? this.jugadores.find((candidato) => candidato.id === evento.objetivoId)
      : null;
    const encarceladoId = this.resultadoVotacion?.encarcelado?.id;

    if (evento?.id === 'venganza'
      && !(evento.ronda === this.rondaActual && encarceladoId === evento.objetivoId)) {
      motivos.push(`No cumplió el evento Venganza: ${objetivo?.nombre ?? 'su objetivo'} no fue encarcelado en la votación requerida.`);
    } else if (evento?.id === 'caceria'
      && !(this.rondaActual < 3 && encarceladoId === evento.objetivoId)) {
      motivos.push(`No cumplió el evento Cacería: ${objetivo?.nombre ?? 'su objetivo'} no fue encarcelado antes de la ronda 3.`);
    } else if (evento?.id === 'superviviente-solitario'
      && !(contexto.activos.length <= 3 && contexto.activos.includes(jugador))) {
      motivos.push(contexto.activos.includes(jugador)
        ? 'No cumplió el evento Superviviente Solitario: la partida terminó antes de que quedaran 3 jugadores activos.'
        : 'No cumplió el evento Superviviente Solitario: fue encarcelado antes de que quedaran 3 jugadores activos.');
    } else if (evento?.id === 'pacto-afinidad'
      && !(contexto.finDePartida
        && contexto.activos.some((activo) => activo.id === jugador.id)
        && contexto.activos.some((activo) => activo.id === evento.objetivoId))) {
      motivos.push(`No cumplió el evento Pacto de Afinidad: ${objetivo?.nombre ?? 'su objetivo'} y él debían llegar vivos al final.`);
    } else if (evento?.id === 'guardaespaldas'
      && !(contexto.finDePartida && contexto.activos.some((activo) => activo.id === evento.objetivoId))) {
      motivos.push(`No cumplió el evento Guardaespaldas Secreto: ${objetivo?.nombre ?? 'su protegido'} no llegó vivo al final.`);
    }

    if (jugador.bando === 'Topo' && !contexto.victoriaTopo) {
      motivos.push('Derrota de bando: todavía quedan Mineros vivos.');
    } else if (jugador.bando === 'Minero' && !contexto.victoriaMinero) {
      motivos.push('Derrota de bando: los Mineros no alcanzaron la paridad o mayoría frente a Topos y Neutrales vivos.');
    } else if (jugador.bando === 'Neutral') {
      if (jugador.rol === 'Chivo Expiatorio' && !contexto.victoriaChivo) {
        motivos.push('Derrota por rol: no fue encarcelado con la mayoría de los votos.');
      } else if (jugador.rol === 'Mercenario' && !contexto.victoriaMercenario) {
        motivos.push('Derrota por rol: su objetivo no fue encarcelado.');
      } else if (jugador.rol === 'Sobreviviente') {
        motivos.push(contexto.activos.includes(jugador)
          ? 'Derrota por rol: sobrevivió, pero la partida terminó sin una victoria de bando.'
          : 'Derrota por rol: fue encarcelado antes del final de la partida.');
      } else if (!motivos.length) {
        motivos.push('Derrota por rol: no cumplió una condición de victoria individual.');
      }
    } else if (jugador.estaEncarcelado) {
      motivos.push('Fue encarcelado y no obtuvo una victoria individual.');
    } else if (!motivos.length) {
      motivos.push('Su bando no obtuvo la victoria y no cumplió una condición individual.');
    }

    return motivos;
  }

  _combinaciones(elementos, cantidad, inicio = 0, actual = [], resultado = []) {
    if (actual.length === cantidad) {
      resultado.push(actual);
      return resultado;
    }

    for (let indice = inicio; indice <= elementos.length - (cantidad - actual.length); indice += 1) {
      this._combinaciones(elementos, cantidad, indice + 1, [...actual, elementos[indice]], resultado);
    }

    return resultado;
  }

  _elegir(elementos) {
    return elementos[Math.floor(Math.random() * elementos.length)];
  }

  _mezclar(elementos) {
    const mezclados = [...elementos];

    for (let indice = mezclados.length - 1; indice > 0; indice -= 1) {
      const aleatorio = Math.floor(Math.random() * (indice + 1));
      [mezclados[indice], mezclados[aleatorio]] = [mezclados[aleatorio], mezclados[indice]];
    }

    return mezclados;
  }
}

globalThis.Partida = Partida;