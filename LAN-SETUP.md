# Multijugador LAN (versión 3.2)

1. Instala Node.js 18 o posterior.
2. En la carpeta del proyecto, ejecuta `npm install` y después `npm start`.
3. Permite el acceso de Node.js en la red privada si Windows Firewall lo solicita.
4. En el equipo host, abre `http://localhost:3000` y selecciona **Modo Multijugador Wi-Fi (LAN)**.
5. Crea una sala y comparte el QR o el enlace mostrado. Los teléfonos deben usar la misma red Wi-Fi que el host.
6. Cuando se hayan unido entre 6 y 15 jugadores, el host puede iniciar la partida. Cada teléfono recibe únicamente su rol, sus acciones privadas y sus informes.
7. Los Silenciadores y Hackeadores resuelven sus habilidades; los Comunicadores pueden enviar o aplazar su mensaje. El Investigador puede revelar su pista adicional desde el informe, con un cooldown de dos rondas. Cada jugador activo recibe uno de los ocho minijuegos interactivos del modo local; al completarlo se desbloquea su informe privado y solo entonces puede marcarlo como leído.
8. Al terminar todos los informes comienza una discusión compartida. El temporizador se sincroniza en todos los dispositivos; la conversación ocurre entre los jugadores, como en el modo local. No hay chat ni voz integrados.
9. Los jugadores activos se turnan para votar desde sus propios dispositivos. El Alcalde puede activar su voto doble en su turno; el Fraude ve los votos previos y puede anular uno una vez por partida. Las habilidades de voto, los escudos y las restricciones se aplican en el servidor.
10. Todos reciben la revelación. Si la partida continúa, cada jugador activo confirma para comenzar la siguiente ronda; si se cumple una condición de victoria, se muestra el resultado final y las identidades.

La dirección `underground.local` depende del soporte mDNS de la red y del dispositivo. Si no resuelve, usa el enlace directo con la dirección IPv4 local que contiene el QR.

El servidor mantiene el estado oficial de la partida y sincroniza las fases y acciones entre dispositivos. Si un jugador se desconecta durante la partida, su turno pendiente se omite para evitar bloquear el avance; puede recuperar la vista con el mismo enlace en esa pestaña mientras la sala siga activa.
