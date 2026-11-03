1. Sujeto Menor: `Jugador`
Representa la ficha individual de cada participante y almacena su estado y entradas dentro de la partida.

### Atributos (Entradas y Datos del Jugador):
- `id`: Identificador único asignado automáticamente (Número).
- `nombre`: Nombre del participante ingresado en el formulario (Texto - Entrada de teclado).
- `bando`: Bando asignado aleatoriamente por el sistema ('Topo', 'Minero' o 'Neutral') (Texto).
- `rol`: Rol y habilidad especial asignada (Texto).
- `pistaRonda`: Mensaje o informe secreto que le toca leer en la ronda actual (Texto).
- `informesRonda`: Lista de pistas secretas preparadas para la ronda.
- `votoEmitido`: ID del jugador seleccionado en la pantalla de votación (Número - Entrada por botón).
- `estaEncarcelado`: Estado que indica si fue eliminado de la partida (Booleano: false/true).
- `habilidadBloqueadaRonda`: Número de ronda en que el Silenciador bloquea su habilidad, si aplica.
- `investigadorUltimaRonda` y `silenciadorUltimaRonda`: Última ronda en que se usó la habilidad con cooldown.
- `alcaldeVotoPotenciado`: Indica si el Alcalde activó el voto doble en la votación actual.
- `fraudeAlteracionUsada`: Indica si el Fraude ya anuló un voto en esta partida.
- `escudoSobrevivienteUsado`: Indica si el Sobreviviente ya consumió su protección única.

### Métodos (Acciones y Procesos Individuales):
- `constructor(id, nombre)`: Recibe el ID y el nombre inicial para crear la ficha del jugador.
- `asignarIdentidad(bando, rol)`: Almacena en el jugador el bando y rol elegidos aleatoriamente.
- `asignarPista(pista)`: Guarda la pista o informe que debe mostrarse en su pantalla de seguridad.
- `registrarVoto(idSospechoso)`: Recibe la selección del botón de votación y la guarda en `votoEmitido`.
- `encarcelar()`: Cambia el atributo `estaEncarcelado` a `true` cuando el jugador es eliminado.

---

## 2. Sujeto Mayor: `Partida` (Sujeto Orquestador)
Representa la memoria global del juego, administra a todos los jugadores y procesa las salidas.

### Atributos (Memoria y Estado Global):
- `jugadores`: Arreglo/Lista que almacena las instancias del Sujeto Menor (`Jugador[]`).
- `minJugadores`: Límite mínimo para iniciar la partida (Constante = 6).
- `maxJugadores`: Límite máximo permitido (Constante = 15).
- `faseActual`: Controla la pantalla y el flujo actual ('INICIO', 'ASIGNACION', 'INFORMES', 'DISCUSION', 'VOTACION', 'REVELACION').
- `indiceTurno`: Contador para saber a qué jugador le toca el botón de seguridad en el pass-and-play.
- `ordenInformes`: Orden aleatorio reservado para repartir informes, incluso mientras se ejecutan las acciones secretas.
- `registroVotosRonda`: Registro de votos emitidos y anulados durante la votación actual.
- `tiempoDiscusion`: Tiempo en segundos para la cuenta regresiva (Configurable, valor inicial = 70).
- `bancoPistas`: Lista global de frases y eventos disponibles para repartir.

### Métodos (Procesos Mayores y Generación de Salidas):
- `constructor()`: Inicializa el arreglo de memoria `jugadores` vacío y establece la fase en 'INICIO'.
- `agregarJugador(nombre)`: **[Proceso de Entrada]** Valida el nombre, verifica el rango de 6 a 15 jugadores, crea un nuevo `Jugador` y lo guarda en la memoria.
- `iniciarPartida()`: **[Proceso]** Verifica que existan al menos 6 jugadores registrados y cambia la fase a 'ASIGNACION'.
- `repartirBandosYRoles()`: **[Proceso]** Genera aleatoriamente los roles de Topos, Mineros y Neutrales y llama al método `asignarIdentidad` de cada jugador.
- `generarInformes()` y `prepararInformes()`: **[Proceso]** Preparan la ronda, aplican las habilidades que alteran informes y reparten las pistas secretas.
- `revelarPistaInvestigador()`: **[Habilidad Investigador]** Revela una pista adicional y aplica dos rondas de cooldown.
- `silenciarObjetivo()` y `sabotearInforme()`: **[Habilidades]** Bloquean la habilidad de un jugador durante la ronda o reemplazan una de sus pistas por una falsa.
- `siguienteTurnoPassAndPlay()`: **[Proceso]** Incrementa `indiceTurno` para mostrar la pantalla de seguridad al siguiente jugador.
- `iniciarVotacion()` y `registrarVoto()`: **[Proceso]** Aleatorizan el orden de voto, validan el objetivo y registran el voto secreto.
- `obtenerVotosPrevios()` y `anularVoto()`: **[Habilidad Fraude]** Permiten consultar los votos previos y cancelar uno por partida.
- `usarHabilidadAlcalde()` y `procesarVotacion()`: **[Proceso y Salida]** Permiten activar el voto doble opcional y cuentan los votos ponderados, resuelven escudos e identidades y encarcelan al más votado.
- `verificarCondicionesVictoria()`: **[Proceso y Salida Final]** Evalúa si los Topos encarcelaron a los Mineros o si los Mineros lograron encarcelar a un Topo para declarar al bando ganador.