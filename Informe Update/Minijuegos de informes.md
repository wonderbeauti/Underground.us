# INFORME UPDATE — versión 2.2

**Estado:** lanzado  
**Versión objetivo:** 2.2  
**Propósito:** documentar el balance de roles, su compatibilidad local/LAN y el feedback táctil sin sonido, además de las interacciones que desbloquean los informes privados.

## Roles y feedback de habilidades — versión 2.2

- Se eliminó el Vigía para evitar que su función de información se solape con la del Investigador.
- El Investigador recibe una pista base y puede revelar una pista adicional con un botón. Después de usarla, debe esperar una ronda completa antes de volver a usarla.
- El Alcalde decide durante su turno de votación si activa el voto doble; sin activarlo, su voto cuenta por uno.
- El Silenciador muestra a todos los jugadores vivos como posibles objetivos y puede volver a usar su habilidad cada dos rondas.
- El Fraude puede consultar los votos anteriores durante su turno y activar una anulación una sola vez por partida.
- Estos cambios de roles y sus acciones están implementados tanto en el modo local como en el multijugador LAN.
- Los botones de habilidad se hunden al presionarlos, emiten una onda luminosa, rebotan suavemente al soltarlos y solicitan una vibración discreta de 30 ms cuando el dispositivo la admite.
- **No se añade sonido** al feedback de habilidades.

## Compatibilidad local y LAN

- Los ocho minijuegos interactivos de esta actualización también están disponibles en el multijugador LAN. Cada jugador activo completa su reto antes de que se revele su informe privado.
- Los roles, minijuegos, reglas y correcciones aplicables deben mantenerse coherentes entre el modo local y LAN.

## Flujo común

1. En la fase de informes, cada jugador activo toma su turno privado.
2. Si el jugador es el Comunicador y aún no ha usado su habilidad, puede enviar un mensaje anónimo a otro jugador o aplazarlo. En ambos casos, continúa con su informe en el mismo turno.
3. Si tiene un mensaje anónimo sin leer, primero lo lee y pulsa **Continuar al informe**.
4. Al continuar, se selecciona al azar uno de los ocho minijuegos disponibles con la misma probabilidad. El mensaje no altera la distribución.
5. El jugador completa el reto para revelar su informe de la ronda.
6. El informe puede incluir una o varias pistas, un evento secreto de ese jugador y, para el Detective, su libreta privada. Las pistas se refieren a otros jugadores, nunca a quien recibe el informe; los eventos secretos se conservan por separado.
7. Tras leerlo, el jugador pulsa el botón de continuar para pasar el dispositivo.

## Selección aleatoria de minijuegos

En cada turno de informe, los ocho minijuegos disponibles tienen la misma probabilidad de ser seleccionados. La elección se realiza de nuevo para cada jugador y no muestra ni utiliza porcentajes configurables:

- Terminal de números
- Computadora con frase de acceso
- Sintonizador de radio
- Tubo neumático
- Linterna UV
- Teléfono de disco retro
- Proyector de película vintage
- Elevador de 9 pisos y mesa de informes

La selección ocurre después de leer el mensaje del Comunicador, si lo hay.

## 1. Terminal de números

- Muestra el título **Terminal Encriptada - Acceso de Cuadrilla**.
- Selecciona entre cuatro y cinco fichas numéricas distintas de `0` a `10`.
- La secuencia se mezcla y se muestra en fichas táctiles.
- Se toca una ficha y luego otra para intercambiar sus posiciones.
- El objetivo es ordenar todos los valores de menor a mayor.
- Si la secuencia se ordena, aparece **Acceso concedido** y, tras una breve animación, se revela el informe.
- El informe se muestra en una pantalla privada con el botón **Continuar**.

## 2. Computadora con frase de acceso

- Muestra una computadora dibujada con HTML y CSS, con una pantalla azul y tipografía monoespaciada de terminal retro.
- Presenta una frase inspiradora aleatoria relacionada con la mina, la confianza, la esperanza o la verdad.
- El jugador debe introducir exactamente la frase mostrada. Se comprueba el texto completo, incluidos espacios y puntuación.
- Una respuesta diferente recibe **Acceso denegado** y permite volver a intentarlo.
- Una respuesta exacta muestra **Acceso concedido** y revela el informe dentro de la misma pantalla azul.
- El informe y el botón para continuar permanecen dentro del monitor. El contenido del monitor tiene scroll vertical y espacio inferior.

## 3. Sintonizador de Radio de la Mina

- Presenta un control deslizante de frecuencia, lectura en MHz, indicador de interferencia, barra de señal y barra de progreso.
- Cada turno elige una frecuencia objetivo al azar entre `88.0` y `108.0 MHz`.
- La señal se considera estable a una distancia máxima de `0.6 MHz` respecto del objetivo. Cuanto más cerca esté la perilla, mejor es la señal.
- Al entrar en el rango correcto comienza un temporizador visual de tres segundos.
- Si la perilla sale del rango antes de completar los tres segundos, el progreso se reinicia.
- Al mantener la frecuencia estable durante tres segundos, la radio confirma **Señal captada / Transmisión decodificada**.
- El informe aparece carácter por carácter en la pantalla de la radio, seguido por los datos adicionales pertinentes y el botón para continuar.

## 4. Tubo Neumático / Encendido de Terminal

- Presenta una terminal con instrucciones, progreso de cuatro pasos, una bandeja táctil y una entrada de inspección.
- Los ingredientes son **Madera**, **Carbón**, **Fósforo** y **Aceite**.
- Se genera una secuencia aleatoria de cuatro ingredientes; cada paso indica cuál añadir.
- Al acertar, el paso se marca en verde y se avanza al siguiente.
- Si el ingrediente es incorrecto, la terminal muestra **Secuencia incorrecta** y vuelve a permitir el intento del paso actual; no se pierde el progreso anterior.
- Al completar los cuatro pasos, una hoja de informe sale del dispensador y se despliega.
- La hoja se muestra en una tarjeta modal centrada con fondo oscurecido, texto legible, scroll propio y el botón **Continuar y pasar el dispositivo** al final.

## 5. Linterna de Luz UV (Tinta Invisible)

- Presenta una hoja aparentemente en blanco con tinta invisible y una luz UV circular que sigue el dedo o cursor.
- El texto de la pista no se inserta en la hoja ni aparece en el árbol accesible hasta que se activa la luz.
- El jugador mantiene presionada la hoja y desliza la luz sobre el área de tinta; el texto solo se ve dentro del haz.
- El progreso acumula el tiempo que la luz se mantiene sobre el texto y se pausa al soltarla o salir del área.
- Al completar dos segundos, la hoja revela la tinta y muestra el informe privado completo en una tarjeta modal centrada.
- El informe incluye el rol, las pistas, el evento y las notas del Detective cuando correspondan, además del botón para continuar.

## 6. Teléfono de Disco Retro

- Presenta un teléfono retro dibujado con HTML y CSS, un disco giratorio, agujeros numerados del 0 al 9 y un tope metálico.
- En cada turno se genera una extensión aleatoria de cinco dígitos que se muestra en la terminal.
- Para marcar, el jugador arrastra el número correspondiente en sentido circular hasta el tope; el disco vuelve a su posición original con una animación.
- La terminal muestra cinco posiciones de progreso. Un dígito incorrecto presenta **Extensión errónea - Reintentando** y reinicia toda la marcación.
- Al marcar los cinco dígitos en orden, aparece **Llamada conectada // Decodificando mensaje**.
- El informe se muestra en un modal centrado y desplazable bajo el título **Transcripción de llamada confidencial**; el texto aparece con efecto teletipo, seguido del rol, datos adicionales y el botón para continuar.
- Este minijuego no utiliza efectos de audio.

## 7. Proyector de Película Vintage

- Presenta una pantalla de proyección centrada, con estética beige/sepia, marco de película y tipografía Cinzel y Special Elite cargadas desde Google Fonts.
- Indica **Gira la manivela para alinear el fotograma**. El jugador arrastra la manivela en círculos; también puede mantener pulsada la tecla Espacio o Intro como alternativa accesible.
- Cada turno requiere entre ocho y diez segundos de movimiento activo acumulado. El progreso solo avanza mientras se detecta el giro y se pausa, sin reiniciarse, al detener la manivela.
- Mientras gira, la tira de película y las bobinas se mueven continuamente. Una barra sutil indica el progreso de 0 a 100 %.
- Desde el inicio del giro se proyectan **UNDERGROUND.US PRESENTA...** e **INFORME CONFIDENCIAL DE LA MINA**, con un leve parpadeo de proyector mientras la película avanza.
- El cuerpo del informe, con el rol, las pistas, el evento y las notas del Detective cuando correspondan, se revela gradualmente en sincronía con la barra de progreso.
- Al alcanzar el 100 %, la película se detiene en el fotograma alineado, termina de mostrarse el informe y, tras una pausa de 1,5 segundos, aparece el botón para continuar.
- El botón **Continuar y pasar el dispositivo** apaga la proyección con una transición antes de pasar al siguiente jugador.
- El marco se adapta a móviles y limita el ancho del proyector a 520 px.

## 8. Elevador de 9 Pisos y Mesa de Informes

- Genera en cada turno una orden de operación aleatoria para un piso del 1 al 9. El elevador parte del piso 1 y muestra un indicador analógico y el número de piso actual.
- La cabina se muestra en primera persona a pantalla completa dentro del espacio de juego: jaula metálica desgastada, lámpara cálida en la esquina superior derecha, botonera pequeña incrustada en la pared izquierda e indicador analógico centrado sobre las grandes puertas de rejilla.
- Presenta nueve botones industriales en una cuadrícula compacta. Un piso incorrecto muestra una señal de error sin avanzar; al elegir el destino correcto se deshabilitan los botones y se cierran las puertas de rejilla, que ocupan la mayor parte de la vista.
- Tras cerrarse las puertas, la cabina tiembla durante el traslado y tanto el número de piso como la aguja avanzan paso a paso hasta el destino. Al llegar, las puertas se abren y aparece la tarea del sector.
- El jugador debe activar los dos interruptores de palanca. Cuando ambos están encendidos, la escena cambia a la oficina del piso y una lámpara de mina ilumina la mesa; esta pantalla final conserva su diseño.
- Al tocar la carpeta sellada de la mesa, se despliega un modal adaptable con scroll para el informe privado, los datos adicionales y el botón **Continuar y pasar el dispositivo**.
- En celulares, la botonera del elevador pasa sobre las puertas y amplía cada botón a un área táctil de al menos 44 px.
- No utiliza sonido; los efectos de audio quedan para una actualización posterior.

## Privacidad y compatibilidad

- El informe solo se muestra al jugador cuyo turno privado está activo.
- Los modales de informes se ajustan al viewport del teléfono y permiten desplazarse cuando el contenido supera la altura disponible.
- El flujo funciona en la aplicación abierta directamente desde el archivo HTML local (`file://`); los minijuegos no requieren imágenes ni dependencias externas.
- La interfaz se adapta a pantallas móviles. Los controles de fichas e ingredientes son botones táctiles y los informes extensos tienen desplazamiento propio.
