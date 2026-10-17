const assert = require('node:assert/strict');
const { test } = require('node:test');

require('./jugador.js');
require('./partida.js');

const rolesBase = [
  ['Topo', 'Topo Común'],
  ['Topo', 'Topo Común'],
  ['Topo', 'Topo Común'],
  ['Minero', 'Minero Común'],
  ['Minero', 'Minero Común'],
  ['Neutral', 'Chivo Expiatorio'],
];

function crearPartida(roles = rolesBase) {
  const partida = new globalThis.Partida();
  for (let indice = 0; indice < roles.length; indice += 1) {
    partida.agregarJugador(`Jugador ${indice + 1}`);
  }
  partida.iniciarPartida();
  partida.jugadores.forEach((jugador, indice) => {
    jugador.asignarIdentidad(...roles[indice]);
  });
  return partida;
}

function conAleatoriedadFija(callback) {
  const aleatorioOriginal = Math.random;
  Math.random = () => 0.999999;
  try {
    callback();
  } finally {
    Math.random = aleatorioOriginal;
  }
}

function prepararVotacion(partida) {
  partida.generarInformes();
  partida.prepararInformes();
  partida.iniciarVotacion(partida.jugadores);
}

test('Investigador revela una pista adicional con dos rondas de cooldown', () => {
  conAleatoriedadFija(() => {
    const partida = crearPartida([
      ['Topo', 'Investigador'],
      ...rolesBase.slice(1),
    ]);
    partida.generarInformes();
    partida.prepararInformes();

    const investigador = partida.jugadores[0];
    assert.equal(investigador.tarjetaRonda.informes.length, 1);
    assert.ok(investigador.tarjetaRonda.informeAdicional);
    assert.notEqual(investigador.tarjetaRonda.informes[0], investigador.tarjetaRonda.informeAdicional);
    assert.equal(partida.puedeRevelarPistaInvestigador(investigador), true);

    const pistaAdicional = partida.revelarPistaInvestigador(investigador);
    assert.equal(investigador.tarjetaRonda.informes.length, 2);
    assert.equal(investigador.tarjetaRonda.informes[1], pistaAdicional);
    assert.equal(partida.puedeRevelarPistaInvestigador(investigador), false);

    partida.faseActual = 'REVELACION';
    partida.generarInformes();
    partida.prepararInformes();
    assert.equal(partida.puedeRevelarPistaInvestigador(investigador), false);

    partida.faseActual = 'REVELACION';
    partida.generarInformes();
    partida.prepararInformes();
    assert.equal(partida.puedeRevelarPistaInvestigador(investigador), true);
  });
});

test('Las pistas normales y adicionales nunca mencionan al jugador que las recibe', () => {
  conAleatoriedadFija(() => {
    const partida = crearPartida([
      ['Topo', 'Investigador'],
      ...rolesBase.slice(1),
    ]);
    partida.generarInformes();
    partida.prepararInformes();

    for (const jugador of partida.jugadores) {
      assert.ok(jugador.tarjetaRonda.informes.length > 0);
      for (const informe of jugador.tarjetaRonda.informes) {
        assert.ok(
          !informe.includes(jugador.nombre),
          `${jugador.nombre} aparece en su propio informe: ${informe}`,
        );
      }
      if (jugador.tarjetaRonda.informeAdicional) {
        assert.ok(!jugador.tarjetaRonda.informeAdicional.includes(jugador.nombre));
      }
    }
  });
});

test('Los informes generados no sugieren ubicaciones ni movimientos inexistentes', () => {
  const partida = crearPartida();
  const receptor = partida.jugadores[0];
  let siguienteAleatorio = 0;
  const aleatorioOriginal = Math.random;
  Math.random = () => {
    siguienteAleatorio = (siguienteAleatorio + 137) % 997;
    return siguienteAleatorio / 997;
  };

  try {
    for (let indice = 0; indice < 250; indice += 1) {
      const informe = partida._generarInforme([], receptor);
      assert.match(informe, /Topo|Minero|mismo bando|rol especial/i);
      assert.ok(!informe.includes(receptor.nombre), `El informe menciona al receptor: ${informe}`);
      assert.doesNotMatch(
        informe,
        /galer[ií]a|zona|merode|cerca|panel|nivel|t[uú]nel|pasos|siguiendo|activo en/i,
      );
      if (/fotografía|huella dactilar/i.test(informe)) {
        assert.match(informe, /bando (?:Minero|Topo)/i);
      }
    }
  } finally {
    Math.random = aleatorioOriginal;
  }
});

test('Silenciador muestra objetivos vivos y vuelve a estar disponible cada dos rondas', () => {
  conAleatoriedadFija(() => {
    const partida = crearPartida([
      ['Minero', 'Silenciador'],
      ['Topo', 'Alcalde'],
      ...rolesBase.slice(2),
    ]);
    partida.generarInformes();
    assert.equal(partida.puedeSilenciarA(partida.jugadores[0], partida.jugadores[2]), true);
    partida.silenciarObjetivo(partida.jugadores[0], partida.jugadores[1]);
    partida.prepararInformes();
    assert.throws(
      () => partida.silenciarObjetivo(partida.jugadores[0], partida.jugadores[2]),
      /no puede bloquear/,
    );
    partida.iniciarVotacion(partida.jugadores);
    assert.throws(
      () => partida.usarHabilidadAlcalde(partida.jugadores[1]),
      /no puede activar/,
    );
    partida.registrarVoto(partida.jugadores[1], partida.jugadores[2].id);
    const resultado = partida.procesarVotacion();
    assert.equal(resultado.conteo[partida.jugadores[2].id], 1);

    partida.faseActual = 'REVELACION';
    partida.generarInformes();
    assert.equal(partida.puedeUsarHabilidadSilenciador(partida.jugadores[0]), false);
    partida.faseActual = 'REVELACION';
    partida.generarInformes();
    assert.equal(partida.puedeUsarHabilidadSilenciador(partida.jugadores[0]), true);
  });
});

test('Hackeador reemplaza una de las pistas del objetivo por una falsa', () => {
  conAleatoriedadFija(() => {
    const partida = crearPartida([
      ['Minero', 'Hackeador'],
      ['Topo', 'Investigador'],
      ...rolesBase.slice(2),
    ]);
    partida.generarInformes();
    partida.prepararInformes();
    const hacker = partida.jugadores[0];
    const objetivo = partida.jugadores[1];
    partida.sabotearInforme(hacker, objetivo);
    assert.equal(objetivo.informesRonda.length, 1);
    assert.ok(objetivo.tarjetaRonda.informeAdicional);
    assert.match(objetivo.informesRonda[0], /Informe manipulado/);
    assert.ok(!objetivo.informesRonda[0].includes(objetivo.nombre));
    assert.equal(hacker.hackeoRonda, partida.rondaActual);
  });
});

test('Fraude anula un voto previo y el voto del Alcalde pesa dos', () => {
  conAleatoriedadFija(() => {
    const partida = crearPartida([
      ['Topo', 'Topo Común'],
      ['Minero', 'Fraude'],
      ['Topo', 'Alcalde'],
      ['Minero', 'Minero Común'],
      ['Topo', 'Topo Común'],
      ['Neutral', 'Chivo Expiatorio'],
    ]);
    prepararVotacion(partida);
    const [primero, fraude, alcalde] = partida.ordenTurnos;
    const objetivoAnterior = partida.jugadores[3];
    const objetivoFraude = partida.jugadores[4];
    partida.registrarVoto(primero, objetivoAnterior.id);
    assert.equal(partida.puedeAlterarVoto(fraude), true);
    assert.equal(partida.obtenerVotosPrevios(fraude)[0].objetivo.id, objetivoAnterior.id);
    partida.anularVoto(fraude, primero.id);
    partida.registrarVoto(fraude, objetivoFraude.id);
    partida.usarHabilidadAlcalde(alcalde);
    partida.registrarVoto(alcalde, objetivoFraude.id);
    const resultado = partida.procesarVotacion();
    assert.equal(resultado.conteo[objetivoAnterior.id], undefined);
    assert.equal(resultado.conteo[objetivoFraude.id], 3);
  });
});

test('El voto doble del Alcalde solo cuenta por dos si activa su habilidad', () => {
  conAleatoriedadFija(() => {
    const crearConAlcalde = () => crearPartida([
      ['Topo', 'Alcalde'],
      ...rolesBase.slice(1),
    ]);
    const partidaNormal = crearConAlcalde();
    prepararVotacion(partidaNormal);
    const alcaldeNormal = partidaNormal.jugadores[0];
    const objetivoNormal = partidaNormal.jugadores[1];
    partidaNormal.registrarVoto(alcaldeNormal, objetivoNormal.id);
    assert.equal(partidaNormal.procesarVotacion().conteo[objetivoNormal.id], 1);

    const partidaPotenciada = crearConAlcalde();
    prepararVotacion(partidaPotenciada);
    const alcaldePotenciado = partidaPotenciada.jugadores[0];
    const objetivoPotenciado = partidaPotenciada.jugadores[1];
    partidaPotenciada.usarHabilidadAlcalde(alcaldePotenciado);
    partidaPotenciada.registrarVoto(alcaldePotenciado, objetivoPotenciado.id);
    assert.equal(partidaPotenciada.procesarVotacion().conteo[objetivoPotenciado.id], 2);
  });
});

test('Fraude puede consultar los votos anteriores aunque ya gastó su anulación', () => {
  conAleatoriedadFija(() => {
    const partida = crearPartida([
      ['Topo', 'Topo Común'],
      ['Minero', 'Fraude'],
      ...rolesBase.slice(2),
    ]);
    prepararVotacion(partida);
    const fraude = partida.jugadores[1];
    const objetivo = partida.jugadores[4];
    partida.registrarVoto(partida.jugadores[0], objetivo.id);
    assert.equal(partida.obtenerVotosPrevios(fraude).length, 1);
    partida.anularVoto(fraude, partida.jugadores[0].id);
    assert.equal(fraude.fraudeAlteracionUsada, true);
    assert.equal(partida.obtenerVotosPrevios(fraude)[0].anulado, true);
    partida.registrarVoto(fraude, objetivo.id);
    partida.procesarVotacion();

    partida.generarInformes();
    partida.prepararInformes();
    partida.iniciarVotacion(partida.jugadores.filter((jugador) => !jugador.estaEncarcelado));
    partida.registrarVoto(partida.jugadores[0], objetivo.id);
    assert.equal(partida.puedeAlterarVoto(fraude), false);
    assert.equal(partida.obtenerVotosPrevios(fraude).length, 1);
  });
});

test('Infiltrado muestra su falsa identidad salvo que haya sido silenciado', () => {
  conAleatoriedadFija(() => {
    const partida = crearPartida([
      ['Minero', 'Infiltrado'],
      ...rolesBase.slice(1),
    ]);
    prepararVotacion(partida);
    partida.registrarVoto(partida.jugadores[1], partida.jugadores[0].id);
    assert.deepEqual(
      partida.procesarVotacion().identidadRevelada,
      { bando: 'Topo', rol: 'Topo Común' },
    );

    const partidaSilenciada = crearPartida([
      ['Minero', 'Silenciador'],
      ['Minero', 'Infiltrado'],
      ...rolesBase.slice(2),
    ]);
    partidaSilenciada.generarInformes();
    partidaSilenciada.silenciarObjetivo(
      partidaSilenciada.jugadores[0],
      partidaSilenciada.jugadores[1],
    );
    partidaSilenciada.prepararInformes();
    partidaSilenciada.iniciarVotacion(partidaSilenciada.jugadores);
    partidaSilenciada.registrarVoto(
      partidaSilenciada.jugadores[2],
      partidaSilenciada.jugadores[1].id,
    );
    assert.deepEqual(
      partidaSilenciada.procesarVotacion().identidadRevelada,
      { bando: 'Minero', rol: 'Infiltrado' },
    );
  });
});

test('El escudo del Sobreviviente se usa una sola vez', () => {
  conAleatoriedadFija(() => {
    const partida = crearPartida([
      ['Topo', 'Topo Común'],
      ['Minero', 'Minero Común'],
      ['Topo', 'Topo Común'],
      ['Minero', 'Minero Común'],
      ['Topo', 'Topo Común'],
      ['Neutral', 'Sobreviviente'],
    ]);
    prepararVotacion(partida);
    partida.registrarVoto(partida.jugadores[0], partida.jugadores[5].id);
    partida.registrarVoto(partida.jugadores[1], partida.jugadores[5].id);
    assert.equal(partida.procesarVotacion().jugadorSalvado.id, partida.jugadores[5].id);
    assert.equal(partida.jugadores[5].escudoSobrevivienteUsado, true);

    partida.generarInformes();
    partida.prepararInformes();
    partida.iniciarVotacion(partida.jugadores.filter((jugador) => !jugador.estaEncarcelado));
    partida.registrarVoto(partida.jugadores[0], partida.jugadores[5].id);
    partida.registrarVoto(partida.jugadores[1], partida.jugadores[5].id);
    assert.equal(partida.procesarVotacion().encarcelado.id, partida.jugadores[5].id);
  });
});

test('Mercenario gana cuando su objetivo es encarcelado', () => {
  conAleatoriedadFija(() => {
    const partida = crearPartida([
      ['Topo', 'Topo Común'],
      ['Minero', 'Minero Común'],
      ['Topo', 'Topo Común'],
      ['Minero', 'Minero Común'],
      ['Topo', 'Topo Común'],
      ['Neutral', 'Mercenario'],
    ]);
    partida.jugadores[5].objetivoId = partida.jugadores[0].id;
    prepararVotacion(partida);
    for (const votante of partida.jugadores.slice(1, 4)) {
      partida.registrarVoto(votante, partida.jugadores[0].id);
    }
    partida.procesarVotacion();
    assert.equal(partida.verificarCondicionesVictoria().jugador.id, partida.jugadores[5].id);
  });
});

test('Mercenario recibe un objetivo activo distinto de sí mismo al iniciar', () => {
  const aleatorioOriginal = Math.random;
  Math.random = () => 0;
  try {
    const partida = new globalThis.Partida();
    for (let indice = 0; indice < 10; indice += 1) {
      partida.agregarJugador(`Jugador ${indice + 1}`);
    }
    partida.iniciarPartida({ cantidadNeutrales: 2 });
    const mercenario = partida.jugadores.find((jugador) => jugador.rol === 'Mercenario');
    assert.ok(mercenario);
    assert.ok(mercenario.objetivoId);
    assert.notEqual(mercenario.objetivoId, mercenario.id);
    assert.ok(partida.jugadores.some((jugador) => jugador.id === mercenario.objetivoId));
  } finally {
    Math.random = aleatorioOriginal;
  }
});

test('La distribución predeterminada respeta el mapeo de bandos de 6 a 15 jugadores', () => {
  const distribucionesEsperadas = [
    [6, 1, 1],
    [7, 2, 1],
    [8, 2, 1],
    [9, 2, 1],
    [10, 2, 1],
    [11, 3, 2],
    [12, 3, 2],
    [13, 4, 2],
    [14, 4, 2],
    [15, 4, 2],
  ];

  for (const [total, minerosEsperados, neutralesEsperados] of distribucionesEsperadas) {
    const partida = new globalThis.Partida();
    for (let indice = 0; indice < total; indice += 1) {
      partida.agregarJugador(`Jugador ${indice + 1}`);
    }

    partida.iniciarPartida();

    assert.equal(partida.jugadores.filter((jugador) => jugador.bando === 'Minero').length, minerosEsperados);
    assert.equal(partida.jugadores.filter((jugador) => jugador.bando === 'Neutral').length, neutralesEsperados);
    assert.equal(
      partida.jugadores.filter((jugador) => jugador.bando === 'Topo').length,
      total - minerosEsperados - neutralesEsperados,
    );
    assert.ok(minerosEsperados / total <= 0.3 || total === 13);
  }
});

test('La configuración de Mineros se limita al máximo permitido por jugadores', () => {
  const crearConCantidad = (total, cantidadMineros) => {
    const partida = new globalThis.Partida();
    for (let indice = 0; indice < total; indice += 1) {
      partida.agregarJugador(`Jugador ${indice + 1}`);
    }
    return () => partida.iniciarPartida({ cantidadMineros });
  };

  assert.throws(crearConCantidad(9, 3), /balance permitido/);
  assert.doesNotThrow(crearConCantidad(10, 3));
  assert.throws(crearConCantidad(12, 4), /balance permitido/);
});

test('Chivo Expiatorio gana únicamente al recibir la mayoría de los votos y ser encarcelado', () => {
  conAleatoriedadFija(() => {
    const partida = crearPartida();
    prepararVotacion(partida);
    const chivo = partida.jugadores[5];
    for (const votante of partida.jugadores.slice(0, 3)) {
      partida.registrarVoto(votante, chivo.id);
    }
    const resultado = partida.procesarVotacion();
    assert.equal(resultado.encarcelado.id, chivo.id);
    const victoria = partida.verificarCondicionesVictoria();
    assert.equal(victoria.jugador.id, chivo.id);
    assert.equal(victoria.ganadores[0].jugador.id, chivo.id);
    assert.match(victoria.ganadores[0].motivos[0], /encarcelado con la mayoría/);
    assert.equal(victoria.perdedores.length, 5);
  });
});

test('El resultado final separa ganadores de bando y explica las derrotas', () => {
  const partida = crearPartida();
  partida.jugadores[0].encarcelar();
  partida.jugadores[1].encarcelar();
  partida.jugadores[5].encarcelar();
  partida.resultadoVotacion = { conteo: {}, encarcelado: partida.jugadores[5] };

  const victoria = partida.verificarCondicionesVictoria();

  assert.equal(victoria.ganador, 'Minero');
  assert.deepEqual(
    victoria.ganadores.map(({ jugador }) => jugador.id),
    [4, 5],
  );
  assert.ok(victoria.ganadores.every(({ motivos }) => motivos.some((motivo) => /Victoria de bando/.test(motivo))));
  assert.deepEqual(
    victoria.perdedores.map(({ jugador }) => jugador.id),
    [1, 2, 3, 6],
  );
  assert.ok(victoria.perdedores.some(({ jugador, motivos }) => (
    jugador.id === 3 && motivos.some((motivo) => /Derrota de bando/.test(motivo))
  )));
});

test('Los Topos ganan al eliminar a los Mineros aunque queden Neutrales vivos', () => {
  const partida = crearPartida();
  partida.jugadores[3].encarcelar();
  partida.jugadores[4].encarcelar();
  partida.resultadoVotacion = { conteo: {}, encarcelado: partida.jugadores[4] };

  const victoria = partida.verificarCondicionesVictoria();

  assert.equal(victoria.ganador, 'Topo');
  assert.deepEqual(
    victoria.ganadores.map(({ jugador }) => jugador.id),
    [1, 2, 3],
  );
  assert.ok(victoria.ganadores.every(({ motivos }) => /no quedan Mineros vivos/.test(motivos[0])));
});

test('Los Mineros necesitan paridad con Topos y Neutrales vivos', () => {
  const partida = crearPartida();
  partida.jugadores[0].encarcelar();
  partida.resultadoVotacion = { conteo: {}, encarcelado: partida.jugadores[0] };

  assert.equal(partida.verificarCondicionesVictoria(), null);

  partida.jugadores[5].encarcelar();
  partida.resultadoVotacion.encarcelado = partida.jugadores[5];
  const victoria = partida.verificarCondicionesVictoria();

  assert.equal(victoria.ganador, 'Minero');
  assert.deepEqual(
    victoria.ganadores.map(({ jugador }) => jugador.id),
    [4, 5],
  );
});

test('El resultado final incluye a todos los jugadores que cumplen una victoria por evento', () => {
  const partida = crearPartida();
  const objetivo = partida.jugadores[0];
  partida.jugadores[1].evento = {
    id: 'venganza',
    nombre: 'Venganza',
    ronda: partida.rondaActual,
    objetivoId: objetivo.id,
  };
  partida.jugadores[2].evento = {
    id: 'caceria',
    nombre: 'Cacería',
    objetivoId: objetivo.id,
  };
  partida.resultadoVotacion = { conteo: {}, encarcelado: objetivo };
  objetivo.encarcelar();

  const victoria = partida.verificarCondicionesVictoria();

  assert.equal(victoria.ganador, 'Evento');
  assert.deepEqual(
    victoria.ganadores.map(({ jugador }) => jugador.id),
    [2, 3],
  );
  assert.ok(victoria.ganadores.every(({ motivos }) => motivos[0].includes('Victoria por evento')));
  assert.equal(victoria.perdedores.length, 4);
});

test('El Comunicador entrega un mensaje anónimo una sola vez a un jugador vivo', () => {
  const partida = crearPartida();
  const comunicador = partida.jugadores[0];
  const receptor = partida.jugadores[1];
  comunicador.asignarIdentidad('Minero', 'Comunicador');
  partida.faseActual = 'INFORMES';

  partida.enviarMensajeComunicador(comunicador, receptor, 'Confía en el jugador 4.');

  assert.deepEqual(receptor.mensajesAnonimos, [{
    mensaje: 'Confía en el jugador 4.',
    ronda: partida.rondaActual,
    leido: false,
  }]);
  assert.equal(comunicador.comunicadorUsado, true);
  assert.throws(
    () => partida.enviarMensajeComunicador(comunicador, receptor, 'Otro mensaje'),
    /no puede enviar/,
  );
});

test('El Comunicador no puede enviar mensajes vacíos, a sí mismo ni a jugadores encarcelados', () => {
  const partida = crearPartida();
  const comunicador = partida.jugadores[0];
  const receptor = partida.jugadores[1];
  comunicador.asignarIdentidad('Minero', 'Comunicador');
  partida.faseActual = 'INFORMES';

  assert.throws(
    () => partida.enviarMensajeComunicador(comunicador, receptor, '   '),
    /no puede enviar/,
  );
  assert.throws(
    () => partida.enviarMensajeComunicador(comunicador, comunicador, 'Mensaje'),
    /no puede enviar/,
  );
  receptor.encarcelar();
  assert.throws(
    () => partida.enviarMensajeComunicador(comunicador, receptor, 'Mensaje'),
    /no puede enviar/,
  );
  assert.equal(comunicador.comunicadorUsado, false);
});

test('El Detective conserva sus notas para revelarlas si es encarcelado', () => {
  const partida = crearPartida();
  const detective = partida.jugadores[0];
  detective.asignarIdentidad('Topo', 'Detective');
  detective.notasDetective = 'El jugador 3 se contradijo.';
  detective.encarcelar();

  assert.equal(detective.notasDetective, 'El jugador 3 se contradijo.');
  assert.equal(detective.estaEncarcelado, true);
});

test('Los eventos no aparecen en la primera ronda y tienen una probabilidad del 5%', () => {
  const partida = crearPartida();
  const aleatorioOriginal = Math.random;

  try {
    Math.random = () => 0;
    partida._asignarEvento(partida.jugadores[0]);
    assert.equal(partida.jugadores[0].evento, null);

    partida.rondaActual = 2;
    Math.random = () => 0.05;
    partida._asignarEvento(partida.jugadores[1]);
    assert.equal(partida.jugadores[1].evento, null);

    Math.random = () => 0.049;
    partida._asignarEvento(partida.jugadores[2]);
    assert.ok(partida.jugadores[2].evento);
  } finally {
    Math.random = aleatorioOriginal;
  }
});
