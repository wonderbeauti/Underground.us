class Jugador {
  constructor(id, nombre) {
    if (id === undefined || id === null) {
      throw new TypeError('El jugador necesita un identificador.');
    }

    if (typeof nombre !== 'string' || !nombre.trim()) {
      throw new TypeError('El nombre del jugador no puede estar vacío.');
    }

    this.id = id;
    this.nombre = nombre.trim();
    this.bando = null;
    this.rol = null;
    this.pistaRonda = null;
    this.tarjetaRonda = null;
    this.informesRonda = [];
    this.votoEmitido = null;
    this.estaEncarcelado = false;
    this.eventoRecibido = false;
    this.evento = null;
    this.objetivoId = null;
    this.votoBloqueadoRonda = null;
    this.escudoSobrevivienteUsado = false;
    this.habilidadBloqueadaRonda = null;
    this.silenciadorUltimaRonda = null;
    this.investigadorUltimaRonda = null;
    this.alcaldeVotoPotenciado = false;
    this.fraudeAlteracionUsada = false;
    this.hackeoRonda = null;
    this.notasDetective = '';
    this.comunicadorUsado = false;
    this.comunicadorPospuestoRonda = null;
    this.mensajesAnonimos = [];
  }

  asignarIdentidad(bando, rol) {
    const bandosValidos = ['Topo', 'Minero', 'Neutral'];

    if (!bandosValidos.includes(bando)) {
      throw new TypeError(`Bando no válido: ${bando}`);
    }

    if (typeof rol !== 'string' || !rol.trim()) {
      throw new TypeError('El rol no puede estar vacío.');
    }

    this.bando = bando;
    this.rol = rol.trim();
  }

  asignarPista(pista) {
    this.pistaRonda = pista;
  }

  registrarVoto(idSospechoso) {
    if (this.estaEncarcelado) {
      throw new Error('Un jugador encarcelado no puede votar.');
    }

    this.votoEmitido = idSospechoso;
  }

  encarcelar() {
    this.estaEncarcelado = true;
  }
}

globalThis.Jugador = Jugador;