'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/utils/supabase/client.js';
import { useDashboardTheme } from '@/lib/use-dashboard-theme.js';
import { useUser } from '@/lib/user-context.js';
import { DashboardNavbar } from '@/components/dashboard-navbar.js';
import { MobileBottomNav } from '@/components/mobile-bottom-nav.js';

// Mensaje inicial de Andy según docs/andy-system-prompt.md
const ANDY_FIRST_MESSAGE = '¡Hola! Soy Andy, tu asistente del Game Lab 🎮 Contame, ¿qué juego querés crear hoy?';

const SUGGEST_TITLE_PROMPT = 'En base a toda nuestra conversación y el juego que creamos, sugerí un título corto y atractivo, y una descripción de 1-2 oraciones para mostrar en la plataforma. Respondé SOLO con JSON así:\n{"titulo": "...", "descripcion": "..."}';

const CONTINUATION_PROMPT = 'El código HTML que generaste se cortó antes de terminar. Continuá exactamente desde donde quedaste, sin repetir lo que ya escribiste. Empezá desde la última línea de código que mandaste.';

const HTML_INCOMPLETE_WARNING = '⚠️ El juego es muy complejo para generarlo de una vez. Escribime \'generá una versión más compacta\' y lo rehago con código más eficiente.';

// 30 ideas de juegos para inspirar a alumnos de primaria y secundaria (SASS). prompt = texto que se envía al chat al hacer clic.
const IDEAS_JUEGOS = [
  { emoji: '🚀', titulo: 'Naves espaciales', descripcion: 'Dispará a asteroides y enemigos en el espacio', prompt: 'Quiero un juego de naves espaciales donde tenga que esquivar asteroides y disparar a enemigos. Con power-ups y varios niveles.' },
  { emoji: '👻', titulo: 'Fantasmas en el colegio', descripcion: 'Recorré el SASS de noche esquivando fantasmas', prompt: 'Un juego de aventura donde recorro el colegio de noche y tengo que esquivar fantasmas. Que sea un poco de miedo pero divertido.' },
  { emoji: '🏉', titulo: 'Rugby SASS', descripcion: 'Llevá la pelota al try esquivando rivales', prompt: 'Quiero un juego de rugby del SASS. Tengo que llevar la pelota al try esquivando a los rivales. Con teclado o touch.' },
  { emoji: '🧮', titulo: 'Quiz de matemáticas', descripcion: 'Respondé cuentas antes de que se acabe el tiempo', prompt: 'Un juego de preguntas de matemáticas con tiempo. Sumas, restas y multiplicaciones. Que sume puntos por cada respuesta correcta.' },
  { emoji: '🦈', titulo: 'Tiburón hambriento', descripcion: 'Comé peces chicos y crecé, evitá los grandes', prompt: 'Un juego como el del tiburón que come peces y crece. En el mar, con peces chicos y grandes. Si como chicos crezco, si toco grandes pierdo.' },
  { emoji: '🎃', titulo: 'Laberinto de Halloween', descripcion: 'Salí del laberinto antes de que te atrapen', prompt: 'Un laberinto de Halloween donde tengo que encontrar la salida antes de que me atrapen los monstruos. Con coleccionables.' },
  { emoji: '⚽', titulo: 'Penales al arco', descripcion: 'Pateá penales y tratá de meter goles', prompt: 'Juego de penales. Yo pateo al arco y el arquero intenta tapar. Con barras de potencia y dirección. Para celular.' },
  { emoji: '🧩', titulo: 'Rompecabezas de casas', descripcion: 'Armá el escudo de las 4 Houses del SASS', prompt: 'Un rompecabezas con los escudos o colores de las 4 Houses del colegio (William Brown, James Dodds, James Fleming, John Monteith).' },
  { emoji: '🐉', titulo: 'Dragón que escupe fuego', descripcion: 'Volá y quemá castillos enemigos', prompt: 'Un juego donde controlo un dragón que vuela y escupe fuego. Tengo que destruir torres de castillos. Con niveles y jefe final.' },
  { emoji: '🎨', titulo: 'Pintar por números', descripcion: 'Completá dibujos del campus con colores', prompt: 'Juego para pintar por números dibujos del campus o del colegio. Que sea relajado y con colores lindos.' },
  { emoji: '🏑', titulo: 'Hockey sobre césped', descripcion: 'Meté goles con el stick en el arco rival', prompt: 'Juego de hockey sobre césped. Controlo un jugador, tengo que llevar la bocha y meter goles. Con teclado o botones en pantalla.' },
  { emoji: '🦖', titulo: 'Dinosaurio corredor', descripcion: 'Saltá cactus y obstáculos sin parar', prompt: 'Un juego tipo runner donde un dinosaurio corre y tiene que saltar obstáculos. Que sea infinito y vaya aumentando la velocidad.' },
  { emoji: '🗺️', titulo: 'Aventura por el campus', descripcion: 'Explorá edificios y encontrá objetos escondidos', prompt: 'Aventura por el campus del SASS. Recorro diferentes edificios y tengo que encontrar objetos. Con un mapa y misiones.' },
  { emoji: '🧠', titulo: 'Memotest de banderas', descripcion: 'Encontrá las parejas de banderas del mundo', prompt: 'Memotest de banderas de países. Doy vuelta cartas y tengo que encontrar las parejas. Con tiempo o movimientos limitados.' },
  { emoji: '🐧', titulo: 'Pingüino en el hielo', descripcion: 'Deslizate y juntá peces sin caerte', prompt: 'Un pingüino que se desliza por el hielo y tiene que juntar peces. Que sea ágil y con obstáculos.' },
  { emoji: '🎭', titulo: 'Gaitero escocés', descripcion: 'Ayudá al gaitero a llegar al escenario', prompt: 'Un juego con un gaitero escocés (como el del SASS) que tiene que llegar al escenario esquivando obstáculos. Con música o sonidos.' },
  { emoji: '🚗', titulo: 'Carrera de karts', descripcion: 'Corré una vuelta y ganale a los rivales', prompt: 'Carrera de karts en una pista. Tengo que dar una vuelta y llegar primero. Con acelerar, frenar y esquivar.' },
  { emoji: '👾', titulo: 'Invasión de aliens', descripcion: 'Destruí olas de marcianos que bajan', prompt: 'Juego tipo space invaders. Aliens bajan y yo los voy destruyendo con un cañón. Con vidas y niveles.' },
  { emoji: '📚', titulo: 'Quiz de historia', descripcion: 'Respondé preguntas de historia argentina', prompt: 'Quiz de historia argentina. Preguntas de múltiple opción con tiempo. Que sume puntos y tenga 3 vidas.' },
  { emoji: '🦊', titulo: 'Zorro y gallinas', descripcion: 'Atrapá las gallinas antes de que escapen', prompt: 'Un zorro tiene que atrapar gallinas que corren por el corral. Las gallinas se mueven y yo las persigo. Para dos jugadores o contra la compu.' },
  { emoji: '🏰', titulo: 'Defender el castillo', descripcion: 'Lanzá proyectiles a los enemigos que escalan', prompt: 'Tengo que defender un castillo. Enemigos escalan la pared y yo les tiro piedras o flechas. Con upgrades.' },
  { emoji: '🎯', titulo: 'Tiro al blanco', descripcion: 'Apuntá y disparé para sumar puntos', prompt: 'Juego de tiro al blanco. Apunto y disparo, cada anillo suma distinto. Que sea para celular con touch.' },
  { emoji: '🐍', titulo: 'La viborita', descripcion: 'Crecé comiendo y no te choques con tu cola', prompt: 'La viborita clásica: como cosas y crezco. No puedo chocarme con mi cola ni con las paredes. Con niveles de velocidad.' },
  { emoji: '🌍', titulo: 'Quiz de geografía', descripcion: 'Ubicá países en el mapa del mundo', prompt: 'Quiz de geografía: me muestran un país y tengo que ubicarlo en el mapa. O al revés. Con puntaje y vidas.' },
  { emoji: '🦸', titulo: 'Superhéroe del SASS', descripcion: 'Volá por el campus salvando alumnos', prompt: 'Soy un superhéroe del colegio y tengo que rescatar alumnos atrapados en distintos lugares del campus. Con poder de vuelo.' },
  { emoji: '🍕', titulo: 'Pizzería a domicilio', descripcion: 'Llevá pizzas en moto sin que se caigan', prompt: 'Juego de entregar pizzas en moto. Tengo que llegar a tiempo y que no se caigan. Con obstáculos y clientes en el mapa.' },
  { emoji: '🃏', titulo: 'Truco o Uno', descripcion: 'Jugá una mano contra la computadora', prompt: 'Un juego de cartas simple, tipo Truco o Uno, contra la computadora. Con reglas básicas y puntaje.' },
  { emoji: '🎪', titulo: 'Feria del colegio', descripcion: 'Ganá premios en juegos de la kermesse', prompt: 'Minijuegos de feria del colegio: pesca de peces, tiro al blanco, anillos. Que sume puntos y tenga varios juegos.' },
  { emoji: '🦇', titulo: 'Murciélago en la noche', descripcion: 'Volá entre cuevas y comé insectos', prompt: 'Un murciélago que vuela por cuevas y tiene que comer insectos. Que use el sonar para ver. Con obstáculos y tiempo.' },
  { emoji: '🏴', titulo: 'Bandera escocesa', descripcion: 'Armá el tartán y aprendé sobre Escocia', prompt: 'Juego sobre Escocia y el tartán. Armo patrones o elijo la bandera correcta. Que sea educativo y con colores del SASS.' },
  { emoji: '🧲', titulo: 'Bolas magnéticas', descripcion: 'Atraé o repelé bolas para resolver puzzles', prompt: 'Juego de física con bolas que se atraen o repelen según su color. Tengo que hacer que lleguen a cierto lugar.' },
  { emoji: '🌊', titulo: 'Surfista en olas', descripcion: 'Surfeá olas y hacé piruetas para sumar', prompt: 'Un surfista que tiene que esquivar rocas y hacer trucos en las olas. Que tenga físicas de agua y movimiento fluido.' },
  { emoji: '🔬', titulo: 'Laboratorio de ciencias', descripcion: 'Mezclá elementos y creá reacciones', prompt: 'Juego de laboratorio donde mezclo elementos químicos (simples, sin peligro) y tengo que lograr ciertas reacciones. Educativo y visual.' },
  { emoji: '🎸', titulo: 'Guitarra rhythm game', descripcion: 'Tocá las notas en tiempo con la música', prompt: 'Un juego de ritmo tipo Guitar Hero donde tocan notas en pantalla y tengo que presionar en el momento justo. Con canciones simples.' },
  { emoji: '🚂', titulo: 'Tren sin frenos', descripcion: 'Cambiá las vías para que el tren no choque', prompt: 'Un tren va a toda velocidad y tengo que cambiar las vías para que llegue a destino sin chocarse. Con bifurcaciones y tiempo.' },
  { emoji: '🏹', titulo: 'Arquero medieval', descripcion: 'Ajustá el ángulo y disparás flechas', prompt: 'Juego de arquero medieval. Ajusto ángulo y potencia para darle a blancos móviles. Con viento y distancias variables.' },
  { emoji: '🌈', titulo: 'Pinball de colores', descripcion: 'Golpeá bolas del mismo color para explotar', prompt: 'Pinball donde las bolas tienen colores y hay que hacer grupos del mismo color chocar entre sí para sumar puntos.' },
  { emoji: '🐝', titulo: 'Abeja recolectora', descripcion: 'Juntá néctar y evitá las avispas', prompt: 'Una abeja que vuela por el jardín recolectando néctar y tiene que evitar avispas y obstáculos. Con mapa y colmena.' },
  { emoji: '🧱', titulo: 'Destructor de bloques', descripcion: 'Rompé bloques con la pelota rebotando', prompt: 'Juego tipo Breakout donde una pelota rebota y destruye bloques. Los bloques tienen distintos colores y resistencia.' },
  { emoji: '🎲', titulo: 'Dados y estrategia', descripcion: 'Tirá los dados y conquistá el tablero', prompt: 'Juego de tablero con dados. Tiro dados y con el número avanzo o ataco territorios. Simple, como un risk chico.' },
  { emoji: '🌙', titulo: 'Nave lunar', descripcion: 'Aterrizá la nave sin explotar', prompt: 'Simulador de aterrizaje lunar. Tengo que bajar la nave despacio usando los propulsores sin chocarse. Con gravedad y combustible limitado.' },
  { emoji: '🐠', titulo: 'Acuario mágico', descripcion: 'Cuidá tus peces y decorá el acuario', prompt: 'Juego de cuidar un acuario. Alimento peces, limpio el agua, compro decoraciones. Que los peces tengan estados de ánimo.' },
  { emoji: '🏋️', titulo: 'Olimpíadas del SASS', descripcion: 'Competí en deportes clásicos con el colegio', prompt: 'Minijuegos olímpicos del SASS: salto en largo, 100 metros, lanzamiento. Con botones para cada deporte.' },
  { emoji: '🎠', titulo: 'Calesita infinita', descripcion: 'Saltá de calesita en calesita sin caer', prompt: 'Un personaje salta de una calesita giratoria a otra. Tengo que calcular el timing para no caer al vacío.' },
  { emoji: '🔮', titulo: 'Mago de puzzles', descripcion: 'Usá hechizos para resolver acertijos mágicos', prompt: 'Un mago que tiene diferentes hechizos y tiene que usarlos en el orden correcto para resolver puzzles en cada sala.' },
  { emoji: '🐊', titulo: 'Cocodrilo saltarín', descripcion: 'Saltá entre troncos flotantes en el río', prompt: 'Un cocodrilo que tiene que cruzar el río saltando entre troncos que se mueven. Si cae al agua pierde.' },
  { emoji: '🎮', titulo: 'Plataformas clásicas', descripcion: 'Saltá, esquivá y llegá al final del nivel', prompt: 'Plataformer clásico con salto. Tengo que llegar al final del nivel esquivando enemigos y trampas. Con monedas y vidas.' },
  { emoji: '🌵', titulo: 'Vaquero del desierto', descripcion: 'Disparale a los cactus y evitá serpientes', prompt: 'Un vaquero en el desierto que tiene que disparar a cactus animados y evitar serpientes. Estilo western.' },
  { emoji: '🐙', titulo: 'Pulpo escurridizo', descripcion: 'Escapá del acuario usando tus tentáculos', prompt: 'Un pulpo que tiene que escapar del acuario extendiendo tentáculos para agarrarse de superficies. Puzzles de física.' },
  { emoji: '🌺', titulo: 'Jardín zen', descripcion: 'Cuidá plantas y creá un jardín tranquilo', prompt: 'Juego relajante de jardín. Planto flores, riego, podo, y tengo que crear un jardín equilibrado y bello. Sin presión de tiempo.' },
  { emoji: '🤖', titulo: 'Robot reparador', descripcion: 'Arreglá robots rotos con las piezas correctas', prompt: 'Tengo que reparar robots que llegan rotos. Elijo las piezas correctas para cada robot. Que sea como un puzzle de partes.' },
  { emoji: '🏄', titulo: 'Wakeboard extremo', descripcion: 'Hacé piruetas agarrado de la lancha', prompt: 'Juego de wakeboard donde voy agarrado de una lancha y tengo que saltar olas y hacer trucos en el aire.' },
  { emoji: '🌠', titulo: 'Cazador de estrellas', descripcion: 'Juntá constelaciones antes de que amanezca', prompt: 'Tengo que conectar estrellas para formar constelaciones antes de que salga el sol. Con figuras reales del zodíaco.' },
  { emoji: '🦁', titulo: 'Rey de la selva', descripcion: 'Cazá para alimentar a tu manada', prompt: 'Un león que tiene que cazar animales para alimentar a sus cachorros. Con sigilo, velocidad y estrategia.' },
  { emoji: '🎪', titulo: 'Malabarista del circo', descripcion: 'Mantenés pelotas en el aire sin que caigan', prompt: 'Un malabarista que tiene que mantener múltiples pelotas en el aire. Cada vez se agregan más. Con ritmo.' },
  { emoji: '🚁', titulo: 'Helicóptero en la ciudad', descripcion: 'Rescatá personas de edificios en llamas', prompt: 'Piloto un helicóptero y tengo que rescatar personas en distintos puntos de la ciudad. Con física de vuelo y viento.' },
  { emoji: '🌿', titulo: 'Enredadera trepadora', descripcion: 'Hacé crecer tu planta hasta el sol', prompt: 'Una enredadera que tengo que hacer crecer esquivando obstáculos para llegar a la luz del sol. Que sea un puzzle.' },
  { emoji: '🐌', titulo: 'Caracol veloz', descripcion: 'Llegá a la meta antes de secarte', prompt: 'Un caracol que tiene que llegar a la meta recolectando agua en el camino para no secarse. Con obstáculos y rutas.' },
  { emoji: '🎩', titulo: 'Mago y sus trucos', descripcion: 'Hacé aparecer objetos en el orden correcto', prompt: 'Un mago que tiene que hacer aparecer objetos en su galera en el orden que pide el público. Con memoria y velocidad.' },
  { emoji: '🔑', titulo: 'Ladrones y candados', descripcion: 'Abrí la caja fuerte resolviendo el código', prompt: 'Tengo que descifrar combinaciones de candados para abrir cajas fuertes. Cada caja tiene una pista distinta.' },
  { emoji: '🌋', titulo: 'Escapar del volcán', descripcion: 'Corré ladera abajo antes de que te alcance la lava', prompt: 'Un personaje tiene que bajar la ladera de un volcán mientras la lava sube. Que haya plataformas y objetos para esquivar.' },
  { emoji: '🎵', titulo: 'DJ del colegio', descripcion: 'Mezclá ritmos y creá tu canción', prompt: 'Juego de DJ donde tengo que mezclar loops de distintos instrumentos en el momento justo para crear una canción que suene bien.' },
  { emoji: '🐓', titulo: 'Gallinas locas', descripcion: 'Atrapá gallinas que se escapan del gallinero', prompt: 'Las gallinas se escaparon del gallinero y tengo que atraparlas antes de que se vayan. Corren en distintas direcciones.' },
  { emoji: '🌊', titulo: 'Tsunami runner', descripcion: 'Corré hacia adelante y no te alcance la ola', prompt: 'Un runner donde una ola gigante me persigue y tengo que correr esquivando obstáculos para que no me alcance.' },
  { emoji: '🏔️', titulo: 'Escalador de montañas', descripcion: 'Subí la montaña eligiendo la ruta correcta', prompt: 'Un escalador que tiene que subir una montaña eligiendo agarraderos. Si elijo mal me caigo. Con física y stamina.' },
  { emoji: '🎡', titulo: 'Parque de diversiones', descripcion: 'Construí and manejá tu propio parque', prompt: 'Juego de gestión de parque de diversiones. Construyo atracciones, cobro entradas y tengo que mantener a los visitantes contentos.' },
  { emoji: '🦋', titulo: 'Mariposa y flores', descripcion: 'Polinizá flores antes de que el invierno llegue', prompt: 'Una mariposa que tiene que ir de flor en flor polinizando antes de que empiece el invierno. Con mapa y tiempo.' },
  { emoji: '⚡', titulo: 'Tormenta eléctrica', descripcion: 'Conectá los cables antes de que se corte la luz', prompt: 'Tengo que conectar cables en el tablero eléctrico antes de que se acabe el tiempo. Puzzles de circuitos.' },
  { emoji: '🐺', titulo: 'Lobo y ovejas', descripcion: 'Guiá las ovejas al corral antes de que llegue el lobo', prompt: 'Juego donde tengo que guiar ovejas al corral mientras un lobo las persigue. Puedo poner obstáculos para frenar al lobo.' },
  { emoji: '🚀', titulo: 'Estación espacial', descripcion: 'Construí y gestioná tu propia estación', prompt: 'Gestión de estación espacial. Construyo módulos, mantengo el oxígeno y la energía, y recibo astronautas.' },
  { emoji: '🎋', titulo: 'Panda comilón', descripcion: 'Comé bambú y crecé sin caer del árbol', prompt: 'Un panda que come bambú y crece pero el árbol se dobla. Tengo que equilibrar su peso para no caerse.' },
  { emoji: '🌊', titulo: 'Pesca submarina', descripcion: 'Buceá y atrapá peces con tu red', prompt: 'Un buzo que tiene que atrapar peces con una red. Cada pez tiene un valor distinto. Con oxígeno limitado.' },
  { emoji: '🎭', titulo: 'Teatro de sombras', descripcion: 'Formá siluetas con tus manos para actuar', prompt: 'Juego de sombras donde tengo que reproducir siluetas moviendo un personaje. Como un teatro de marionetas.' },
  { emoji: '🦠', titulo: 'Bacterias vs antibióticos', descripcion: 'Sobreviví y multiplicáte evitando los antibióticos', prompt: 'Soy una bacteria que tiene que multiplicarse y sobrevivir a los antibióticos. Que tenga evolución y resistencia.' },
  { emoji: '🏗️', titulo: 'Constructor de puentes', descripcion: 'Diseñá un puente que aguante el peso', prompt: 'Tengo que construir un puente con piezas limitadas que aguante el peso de un vehículo. Puzzle de física estructural.' },
  { emoji: '🎰', titulo: 'Máquina del tiempo', descripcion: 'Combiná símbolos para ganar monedas', prompt: 'Una máquina de tiempo donde combino símbolos históricos. Si acierto la época correcta gano puntos de historia.' },
  { emoji: '🐟', titulo: 'Cardumen sincronizado', descripcion: 'Moví todos los peces en formación sin chocar', prompt: 'Controlo un cardumen de peces y tengo que moverlos todos juntos por laberintos de coral sin que ninguno choque.' },
  { emoji: '🌪️', titulo: 'Tornado recolector', descripcion: 'Girá y absorbé todo lo que esté en tu camino', prompt: 'Controlo un tornado que crece a medida que absorbe objetos. Tengo que absorber todo lo que encuentro en el mapa.' },
  { emoji: '🎪', titulo: 'Acróbatas del circo', descripcion: 'Sincronizá los saltos del equipo acrobático', prompt: 'Tengo que coordinar un equipo de acróbatas que se lanzan entre sí. Presiono en el momento justo para que se atrapen.' },
  { emoji: '🌴', titulo: 'Náufrago en isla', descripcion: 'Sobreviví en la isla y construí una balsa para escapar', prompt: 'Estoy náufrago en una isla y tengo que juntar recursos, construir cosas y sobrevivir hasta poder escapar.' },
  { emoji: '🦅', titulo: 'Águila cazadora', descripcion: 'Planeá y atrapá presas desde las alturas', prompt: 'Un águila que planea en las alturas y tiene que lanzarse en picada para atrapar presas. Con viento y precisión.' },
  { emoji: '🔭', titulo: 'Astrónomo curioso', descripcion: 'Descubrí planetas y nombrá constelaciones', prompt: 'Juego de astronomía donde apunto el telescopio al cielo, descubro planetas y tengo que identificar constelaciones.' },
  { emoji: '🎊', titulo: 'Organizador de fiestas', descripcion: 'Preparás la fiesta perfecta en el menor tiempo', prompt: 'Tengo que organizar una fiesta: comprar comida, decorar, invitar gente. Contra el reloj y con presupuesto limitado.' },
  { emoji: '🐘', titulo: 'Elefante que no olvida', descripcion: 'Repetí secuencias cada vez más largas', prompt: 'Un juego de memoria donde aparecen objetos en secuencia y tengo que repetir el orden exacto. Como Simon Says visual.' },
  { emoji: '🌺', titulo: 'Floristería veloz', descripcion: 'Armá ramos de flores según los pedidos', prompt: 'Una floristería donde llegan pedidos y tengo que armar los ramos con las flores correctas en el menor tiempo posible.' },
  { emoji: '🚒', titulo: 'Bomberos al rescate', descripcion: 'Apagá incendios y rescatá personas', prompt: 'Soy bombero y tengo que apagar incendios en distintos edificios y rescatar personas atrapadas. Con tiempo limitado.' },
  { emoji: '🎑', titulo: 'Jardín japonés', descripcion: 'Diseñá un jardín zen siguiendo las reglas', prompt: 'Juego de diseño de jardín japonés. Tengo que colocar piedras, agua y plantas siguiendo los principios del wabi-sabi.' },
  { emoji: '🐜', titulo: 'Colonia de hormigas', descripcion: 'Guiá a tus hormigas a traer comida al hormiguero', prompt: 'Gestiono una colonia de hormigas. Mando hormigas a buscar comida y tengo que proteger la colonia de otros insectos.' },
  { emoji: '🌊', titulo: 'Corriente marina', descripcion: 'Navegá por las corrientes sin encallarte', prompt: 'Una botella con un mensaje que navega por corrientes marinas. Tengo que usarlas a mi favor para llegar a destino.' },
  { emoji: '🎯', titulo: 'Billar de colores', descripcion: 'Usá los ángulos para meter todas las bolas', prompt: 'Juego de billar simplificado donde tengo que meter bolas de colores en los agujeros usando los ángulos de rebote.' },
  { emoji: '🦒', titulo: 'Jirafa curiosa', descripcion: 'Usá el cuello largo para alcanzar hojas altas', prompt: 'Una jirafa que tiene que usar su cuello para alcanzar hojas en distintas alturas. Puzzles de extensión y equilibrio.' },
  { emoji: '🚜', titulo: 'Granja activa', descripcion: 'Plantá, cosechá y vendé en el mercado', prompt: 'Juego de granja. Planto semillas, riego, cosecho y vendo en el mercado. Cada cultivo tiene su tiempo de crecimiento.' },
  { emoji: '🔒', titulo: 'Escape room', descripcion: 'Resolvé acertijos para salir de la habitación', prompt: 'Un escape room donde tengo que encontrar pistas y resolver acertijos para abrir la puerta y escapar. Con varios puzzles.' },
  { emoji: '🌈', titulo: 'Mezclador de colores', descripcion: 'Combiná colores primarios para crear los que piden', prompt: 'Tengo que mezclar colores primarios para crear el color exacto que me piden. Educativo y visual, que enseñe teoría del color.' },
  { emoji: '🏆', titulo: 'Torneo de houses', descripcion: 'Competí por puntos para tu house del SASS', prompt: 'Juego de competencia entre las 4 Houses del SASS (William Brown, James Dodds, James Fleming, John Monteith). Minijuegos donde gano puntos para mi house.' },
];

// Frases que Andy muestra mientras está generando el juego
const LOADING_PHRASES = [
  'Pensando en los niveles...',
  'Eligiendo assets de Kenney...',
  'Escribiendo el código Phaser...',
  'Ajustando la dificultad...',
  'Agregando power-ups copados...',
  'Balanceando enemigos y obstáculos...',
  'Chequeando que funcione en celular...',
  'Preparando la pantalla de inicio...',
  'Agregando sonidos imaginarios...',
  'Pensando un jefe final épico...',
  'Acomodando las físicas del juego...',
  'Probando que los controles se sientan bien...',
  'Armando la barra de puntaje...',
  'Buscando un fondo bien fachero...',
  'Afinando la velocidad del personaje...',
  'Revisando que todo sea apto para el SASS...',
  'Imaginando cómo lo vas a mejorar después...',
  'Ordenando el código para que lo entiendas...',
  'Agregando un poquito más de diversión...',
  'Cocinando tu juego en la olla gamer...',
];

/** Elige n elementos al azar de un array sin repetir */
function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/**
 * Misma lógica que en el API: extrae HTML de la respuesta de Andy.
 * Busca ```html ... ``` primero; fallback: <!DOCTYPE html> o <html ... </html>.
 * @returns {{ html: string | null, reply: string }}
 */
function extractHtmlFromResponse(text) {
  if (!text || typeof text !== 'string') return { html: null, reply: text || '' };

  const htmlMatch = text.match(/```html\s*([\s\S]*?)```/i);
  if (htmlMatch) {
    const html = htmlMatch[1].trim();
    const reply = text.replace(htmlMatch[0], '').trim();
    return { html: html || null, reply: reply || 'Listo. Mirá la vista previa.' };
  }

  const startDoctype = text.indexOf('<!DOCTYPE html>');
  const startHtml = text.indexOf('<html');
  let start = -1;
  if (startDoctype !== -1) start = startDoctype;
  if (startHtml !== -1 && (start === -1 || startHtml < start)) start = startHtml;
  if (start === -1) return { html: null, reply: text };

  const endTag = '</html>';
  const lastClose = text.lastIndexOf(endTag);
  if (lastClose === -1) return { html: null, reply: text };

  const html = text.slice(start, lastClose + endTag.length).trim();
  const reply = (text.slice(0, start) + text.slice(lastClose + endTag.length)).trim();
  return { html: html || null, reply: reply || 'Listo. Mirá la vista previa.' };
}

export default function GameLabPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useDashboardTheme();
  const { profile, loading: userLoading } = useUser();

  // Mensajes del chat: { role: 'user' | 'andy', content: string }
  const [messages, setMessages] = useState([]);
  // HTML generado por Andy para mostrar en el iframe (srcdoc)
  const [currentHtml, setCurrentHtml] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const loadingRef = useRef(null);
  const firstGameModalShownRef = useRef(false);
  const [isDesktop, setIsDesktop] = useState(false);
  // Para animar la entrada del iframe cuando aparece el juego generado
  const [iframeRevealed, setIframeRevealed] = useState(false);
  // Índice de la frase de carga actual de Andy
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [enviandoModeracion, setEnviandoModeracion] = useState(false);
  const [enviadoModeracion, setEnviadoModeracion] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [moderacionModalOpen, setModeracionModalOpen] = useState(false);
  const [tituloModal, setTituloModal] = useState('');
  const [descripcionModal, setDescripcionModal] = useState('');
  const [sugiriendoTitulo, setSugiriendoTitulo] = useState(false);

  // 6 ideas al azar para la columna desktop; en mobile se usa el mismo set para el carrusel
  const inspirationCards = useMemo(() => pickRandom(IDEAS_JUEGOS, 6), []);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0f' : '#ffffff';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accent = '#7c3aed';
  // PRD §6.2: color institucional SASS — títulos, elementos primarios
  const institutionalBlue = '#00478E';
  const headerColor = isDark ? text : institutionalBlue;
  const isLoading = sending;

  // Protección de ruta: solo usuarios autenticados
  useEffect(() => {
    if (userLoading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
  }, [userLoading, profile, router]);

  // Mensaje inicial de Andy al montar (una sola vez cuando ya hay perfil)
  useEffect(() => {
    if (!profile || messages.length > 0) return;
    setMessages([{ role: 'andy', content: ANDY_FIRST_MESSAGE }]);
  }, [profile, messages.length]);

  // Scroll al último mensaje cuando se agregan mensajes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Resetear estado de moderación cuando Andy genera un juego nuevo
  useEffect(() => {
    setEnviadoModeracion(false);
  }, [currentHtml]);

  // Modal de bienvenida la primera vez que hay juego generado
  useEffect(() => {
    if (!currentHtml || firstGameModalShownRef.current) return;
    firstGameModalShownRef.current = true;
    setWelcomeModalOpen(true);
  }, [currentHtml]);

  // Mientras Andy está respondiendo, rotar frases de estado cada 2 segundos
  useEffect(() => {
    if (!isLoading) return;
    // Elegir una frase inicial al azar
    setLoadingPhraseIndex((prev) => {
      const next = Math.floor(Math.random() * LOADING_PHRASES.length);
      return next;
    });
    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) => {
        let next = prev;
        while (next === prev && LOADING_PHRASES.length > 1) {
          next = Math.floor(Math.random() * LOADING_PHRASES.length);
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Hacer scroll automático hasta el indicador de carga mientras Andy responde
  useEffect(() => {
    if (isLoading && loadingRef.current) {
      loadingRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoading, loadingPhraseIndex]);

  // Detección de viewport desktop (lg) para mostrar u ocultar tarjetas de inspiración
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    function update() {
      setIsDesktop(mq.matches);
    }
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Cuando hay HTML generado, revelar el iframe tras un frame para que se pinte primero con opacity-0 y luego anime
  useEffect(() => {
    if (!currentHtml) {
      setIframeRevealed(false);
      return;
    }
    const id = requestAnimationFrame(() => setIframeRevealed(true));
    return () => cancelAnimationFrame(id);
  }, [currentHtml]);

  // Ajusta la altura del textarea del input según el contenido, con máximo de 4 líneas aprox.
  function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 4 * 24; // ~4 líneas de 24px
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  /** Envía un mensaje al chat (desde input o desde una tarjeta de inspiración) */
  async function sendMessage(textToSend) {
    if (!(textToSend && typeof textToSend === 'string') || sending) return;
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    setInputValue('');
    setError('');
    const newUserMessage = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, newUserMessage]);
    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSending(false);
        router.replace('/login');
        return;
      }

      const apiMessages = [...messages, newUserMessage].map((m) => ({
        role: m.role === 'andy' ? 'assistant' : 'user',
        content: m.content,
      }));

      const res = await fetch('/api/game-lab/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          newMessage: trimmed,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errData = {};
        try {
          errData = JSON.parse(errText);
        } catch {
          errData = { error: errText || `Error ${res.status}` };
        }
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';
      let streamDone = false;

      function processLines(lines) {
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') return true;
          try {
            const data = JSON.parse(payload);
            if (data.chunk != null && typeof data.chunk === 'string') {
              fullText += data.chunk;
              const htmlBlockMatch = fullText.match(/```html\s*([\s\S]*?)```/i);
              if (htmlBlockMatch) {
                const html = htmlBlockMatch[1].trim();
                if (html) setCurrentHtml(html);
              }
            }
          } catch {
            // ignorar líneas malformadas
          }
        }
        return false;
      }

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            streamDone = processLines(buffer.split('\n'));
          }
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        streamDone = processLines(lines);
      }

      const { html, reply } = extractHtmlFromResponse(fullText);
      const andyReply = reply || 'No pude generar una respuesta. ¿Probamos de nuevo?';
      const hasHtmlStart = /```html|<!DOCTYPE\s+html>|<html\b/i.test(fullText);
      const hasHtmlEnd = fullText.includes('</html>');
      const htmlIncomplete = hasHtmlStart && !hasHtmlEnd;

      if (htmlIncomplete) {
        const apiMessagesContinuation = [
          ...apiMessages,
          { role: 'user', content: CONTINUATION_PROMPT },
        ];
        const res2 = await fetch('/api/game-lab/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: apiMessagesContinuation }),
        });
        let continuacion = '';
        if (res2.ok && res2.body) {
          const reader2 = res2.body.getReader();
          const decoder2 = new TextDecoder();
          let buffer2 = '';
          let streamDone2 = false;
          function processLines2(lines) {
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6).trim();
              if (payload === '[DONE]') return true;
              try {
                const data = JSON.parse(payload);
                if (data.chunk != null && typeof data.chunk === 'string') continuacion += data.chunk;
              } catch {}
            }
            return false;
          }
          while (!streamDone2) {
            const { done, value } = await reader2.read();
            if (done) {
              if (buffer2.trim()) streamDone2 = processLines2(buffer2.split('\n'));
              break;
            }
            buffer2 += decoder2.decode(value, { stream: true });
            const lines = buffer2.split('\n');
            buffer2 = lines.pop() ?? '';
            streamDone2 = processLines2(lines);
          }
        }
        const htmlCompleto = fullText + continuacion;
        if (htmlCompleto.includes('</html>')) {
          const { html: htmlFinal, reply: replyFinal } = extractHtmlFromResponse(htmlCompleto);
          if (htmlFinal && htmlFinal.trim()) setCurrentHtml(htmlFinal.trim());
          setMessages((prev) => [...prev, { role: 'andy', content: replyFinal || andyReply }]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'andy', content: andyReply },
            { role: 'andy', content: HTML_INCOMPLETE_WARNING },
          ]);
        }
      } else {
        setMessages((prev) => [...prev, { role: 'andy', content: andyReply }]);
        if (html && html.trim()) {
          setCurrentHtml(html.trim());
        }
      }
    } catch (err) {
      setError(err?.message || 'Error al enviar. Intentá de nuevo.');
    } finally {
      setSending(false);
      if (inputRef.current) {
        inputRef.current.focus();
        // Resetear altura al enviar para que vuelva al tamaño base
        inputRef.current.style.height = 'auto';
        inputRef.current.style.overflowY = 'hidden';
      }
    }
  }

  function handleSend() {
    sendMessage(inputValue);
  }

  function handleInputChange(e) {
    setInputValue(e.target.value);
    autoResizeTextarea(e.target);
  }

  /** Al hacer clic en una tarjeta de inspiración se envía su prompt y las tarjetas desaparecen */
  function handleInspirationClick(prompt) {
    sendMessage(prompt);
  }

  async function fetchSugerenciaTitulo() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const apiMessages = [...messages, { role: 'user', content: SUGGEST_TITLE_PROMPT }].map((m) => ({
      role: m.role === 'andy' ? 'assistant' : 'user',
      content: m.content,
    }));
    const res = await fetch('/api/game-lab/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ messages: apiMessages }),
    });
    if (!res.ok || !res.body) {
      setSugiriendoTitulo(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') break;
        try {
          const data = JSON.parse(payload);
          if (data.chunk != null && typeof data.chunk === 'string') fullText += data.chunk;
        } catch {}
      }
    }
    const { reply } = extractHtmlFromResponse(fullText);
    try {
      const match = reply.match(/\{[\s\S]*\}/);
      if (match) {
        const obj = JSON.parse(match[0]);
        if (obj.titulo != null) setTituloModal(String(obj.titulo).trim());
        if (obj.descripcion != null) setDescripcionModal(String(obj.descripcion).trim());
      }
    } catch {}
    setSugiriendoTitulo(false);
  }

  function openModeracionModal() {
    if (!currentHtml) return;
    setModeracionModalOpen(true);
    setTituloModal('');
    setDescripcionModal('');
    setError('');
    setSugiriendoTitulo(true);
    fetchSugerenciaTitulo();
  }

  async function confirmarEnviarAModeracion() {
    if (!currentHtml || enviandoModeracion) return;
    setEnviandoModeracion(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setEnviandoModeracion(false);
        router.replace('/login');
        return;
      }
      const res = await fetch('/api/game-lab/moderar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          html: currentHtml,
          title: tituloModal.trim() || 'Juego del Game Lab',
          description: descripcionModal.trim() || 'Generado con Andy en el Game Lab',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      setEnviadoModeracion(true);
      setModeracionModalOpen(false);
    } catch (err) {
      setError(err?.message || 'Error al enviar a moderación. Intentá de nuevo.');
    } finally {
      setEnviandoModeracion(false);
    }
  }

  function enviarAModeracion() {
    openModeracionModal();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (userLoading || !profile) {
    return (
      <div className="min-h-screen font-sans flex flex-col" style={{ background: bg }}>
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: textMuted }}>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans flex flex-col relative" style={{ background: bg }}>
      <DashboardNavbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={async () => {
          const { supabase } = await import('@/utils/supabase/client.js');
          await supabase.auth.signOut();
          router.replace('/login');
        }}
      />

      {/* Contenedor principal: desktop sin juego = max-w 900px centrado, chat 600px + tarjetas 260px gap 32px; desktop con juego = 100% (40% + 60%); mobile = iframe arriba + chat abajo o chat + carrusel */}
      <div
        className={`flex-1 flex flex-col-reverse lg:flex-row pt-14 pb-20 lg:pb-6 ${
          currentHtml ? 'lg:fixed lg:top-[64px] lg:left-0 lg:right-0 lg:bottom-0 lg:overflow-hidden lg:pt-0' : 'lg:pt-16'
        }`}
      >
        <div
          className={`flex-1 flex flex-col-reverse lg:flex-row min-h-0 w-full transition-all duration-300 ease-out ${
            !currentHtml ? 'lg:max-w-[900px] lg:mx-auto lg:px-8 lg:gap-8' : 'lg:h-[calc(100vh-64px)]'
          }`}
        >
          {/* ——— Chat: desktop sin juego = flex-1 centrado max 600px; con juego = 40%; mobile = full ——— */}
          <section
            className={`flex flex-col w-full lg:min-h-0 shrink-0 transition-all duration-300 ease-out ${
              currentHtml
                ? 'lg:w-[40%] lg:max-w-[480px] lg:border-r lg:h-full lg:overflow-hidden'
                : 'lg:flex-1 lg:min-w-0'
            }`}
            style={currentHtml ? { borderColor: border } : undefined}
            aria-label="Chat con Andy"
          >
            <div className={`w-full flex-1 flex flex-col min-h-0 ${!currentHtml ? 'lg:max-w-[600px] lg:mx-auto' : 'lg:overflow-hidden'}`}>
              {/* Header minimalista: una sola línea, sin avatar */}
              <div className="px-4 py-2.5 border-b shrink-0" style={{ borderColor: border, background: bg }}>
                <h1 className="text-sm font-bold" style={{ color: headerColor }}>Game Lab</h1>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4" style={{ background: bg }}>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.role === 'andy' && (
                      <div
                        className="mt-0.5 flex-shrink-0 self-start"
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          backgroundColor: cardBg,
                        }}
                      >
                        <Image
                          src="/images/andy-avatar.png"
                          alt=""
                          width={64}
                          height={64}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    )}
                    <div
                      className="rounded-xl px-4 py-2.5 max-w-[85%] break-words border"
                      style={{
                        background: msg.role === 'user' ? (isDark ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.12)') : cardBg,
                        borderColor: msg.role === 'user' ? 'transparent' : border,
                        color: msg.role === 'andy' ? text : text,
                      }}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3" ref={loadingRef}>
                    <div
                      className="flex-shrink-0 self-start"
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        backgroundColor: cardBg,
                      }}
                    >
                      <Image
                        src="/images/andy-avatar.png"
                        alt=""
                        width={64}
                        height={64}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div className="rounded-xl px-4 py-2.5 border" style={{ background: cardBg, borderColor: border }}>
                      <p className="text-sm animate-pulse" style={{ color: text }}>
                        {LOADING_PHRASES[loadingPhraseIndex]}
                      </p>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input: borde accent en focus; botón vibe-btn-gradient */}
              <div className="p-4 border-t shrink-0" style={{ borderColor: border, background: cardBg }}>
                {error && (
                  <p className="text-sm mb-2" style={{ color: '#ef4444' }}>{error}</p>
                )}
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribí tu idea de juego..."
                    rows={1}
                    className="flex-1 rounded-xl px-4 py-3 text-sm border focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-[#7c3aed] focus:ring-[#7c3aed] transition-colors resize-none"
                    style={{
                      background: isDark ? '#0a0a0f' : '#fff',
                      borderColor: border,
                      color: text,
                    }}
                    disabled={sending}
                    aria-label="Mensaje para Andy"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !inputValue.trim()}
                    className="vibe-btn-gradient rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enviar
                  </button>
                </div>
                {currentHtml && (
                  <div className="mt-3">
                    {enviadoModeracion ? (
                      <p className="text-sm font-medium text-center py-2" style={{ color: '#22c55e' }}>
                        ✅ Enviado a moderación
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={enviarAModeracion}
                        disabled={enviandoModeracion}
                        className="vibe-btn-gradient w-full rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        📨 Mi juego está listo. Enviar a moderación
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile: carrusel de ideas debajo del input */}
              {!isDesktop && messages.length === 1 && !currentHtml && !sending && (
                <div className="px-4 pb-4 shrink-0">
                  <p className="text-xs font-semibold mb-2" style={{ color: textMuted }}>
                    ✨ ¿Sin ideas? Probá estas:
                  </p>
                  <div
                    className="flex gap-3 overflow-x-auto overflow-y-hidden pb-1 scroll-smooth snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {inspirationCards.map((idea, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInspirationClick(idea.prompt)}
                        className="flex-shrink-0 w-[38%] min-w-[140px] snap-start rounded-xl border p-3 text-center transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7c3aed]"
                        style={{
                          background: cardBg,
                          borderColor: border,
                          color: text,
                        }}
                      >
                        <span className="text-2xl block mb-1">{idea.emoji}</span>
                        <span className="text-xs font-bold block leading-tight line-clamp-2" style={{ color: accent }}>{idea.titulo}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ——— Desktop sin juego: columna derecha flotante 260px, tarjetas compactas ——— */}
          {isDesktop && messages.length === 1 && !currentHtml && !sending && (
            <aside
              className="hidden lg:flex flex-col w-[260px] shrink-0 min-h-0 pt-2"
              aria-label="Ideas para arrancar"
            >
              <p className="text-[13px] font-semibold pb-3 mb-3 border-b shrink-0" style={{ color: accent, borderColor: border }}>
                ✨ ¿Sin ideas? Probá estas:
              </p>
              <div className="flex-1 overflow-y-auto space-y-2">
                {inspirationCards.map((idea, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleInspirationClick(idea.prompt)}
                    className="w-full rounded-xl border p-2.5 flex items-center gap-3 text-left min-h-[72px] h-[72px] transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-0"
                    style={{
                      background: cardBg,
                      borderColor: border,
                      ['--tw-ring-color']: accent,
                    }}
                  >
                    <span className="text-2xl flex-shrink-0 leading-none">{idea.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-semibold block leading-tight truncate" style={{ color: accent }}>{idea.titulo}</span>
                      <span className="text-xs block leading-snug line-clamp-2 mt-0.5" style={{ color: textMuted }}>{idea.descripcion}</span>
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* ——— Iframe: desktop solo cuando hay juego (60%); mobile siempre en el flujo (arriba por flex-col-reverse) ——— */}
          <section
            className={`flex-1 flex flex-col min-h-[300px] lg:min-h-0 overflow-hidden transition-all duration-300 ease-out ${
              currentHtml
                ? 'lg:flex-[6] lg:opacity-100 lg:visible lg:h-full lg:overflow-hidden'
                : 'lg:flex-[0] lg:min-w-0 lg:opacity-0 lg:invisible'
            }`}
            aria-label="Vista previa del juego"
          >
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: isDark ? '#0f0f14' : '#f1f5f9' }}>
              <div className="px-4 py-2.5 border-b shrink-0" style={{ borderColor: border, background: bg }}>
                <h2 className="text-sm font-bold" style={{ color: headerColor }}>Vista previa</h2>
              </div>
              <div className="flex-1 p-4 lg:p-6 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 rounded-xl border overflow-hidden min-h-0 flex flex-col" style={{ borderColor: border, background: '#fff' }}>
                {currentHtml ? (
                  <div className="w-full lg:max-w-[480px] mx-auto aspect-[3/4] relative">
                    <iframe
                      title="Vista previa del juego generado"
                      sandbox="allow-scripts"
                      srcDoc={currentHtml}
                      className={`absolute top-0 left-0 w-full h-full border-0 transition-all duration-300 ease-out ${iframeRevealed ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
                    />
                  </div>
                ) : (
                  <div
                    className="w-full flex-1 flex items-center justify-center min-h-[320px]"
                    style={{ color: textMuted }}
                  >
                    <p className="text-sm">El juego aparecerá acá cuando Andy lo genere.</p>
                  </div>
                )}
              </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modal de bienvenida al primer juego */}
      {welcomeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setWelcomeModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-modal-title"
        >
          <div
            className="relative rounded-2xl border shadow-xl max-w-md w-full p-6"
            style={{ background: cardBg, borderColor: border }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setWelcomeModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-lg leading-none hover:opacity-80"
              style={{ color: textMuted }}
              aria-label="Cerrar"
            >
              ×
            </button>
            <h2 id="welcome-modal-title" className="text-lg font-bold pr-8 mb-3" style={{ color: headerColor }}>
              🎮 ¡Tu primer juego está listo!
            </h2>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: text }}>
              Andy es una Inteligencia Artificial que puede cometer errores («Bugs»). El objetivo de SASS Vibe Coding es que aprendas a conversar con la IA: explicá qué salió mal, qué querés cambiar y qué querés mejorar. No hace falta usar lenguaje técnico — hablale de manera completamente natural y descriptiva.
            </p>
            <button
              type="button"
              onClick={() => setWelcomeModalOpen(false)}
              className="vibe-btn-gradient w-full rounded-xl px-4 py-3 text-sm font-bold text-white"
            >
              ¡Entendido, a jugar! 🕹️
            </button>
          </div>
        </div>
      )}

      {/* Modal título y descripción para enviar a moderación */}
      {moderacionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !enviandoModeracion && setModeracionModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="moderacion-modal-title"
        >
          <div
            className="relative rounded-2xl border shadow-xl max-w-md w-full p-6"
            style={{ background: cardBg, borderColor: border }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !enviandoModeracion && setModeracionModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-lg leading-none hover:opacity-80 disabled:opacity-50"
              style={{ color: textMuted }}
              aria-label="Cerrar"
              disabled={enviandoModeracion}
            >
              ×
            </button>
            <h2 id="moderacion-modal-title" className="text-lg font-bold pr-8 mb-4" style={{ color: headerColor }}>
              Enviar a moderación
            </h2>
            {sugiriendoTitulo && (
              <p className="text-sm mb-3 flex items-center gap-2" style={{ color: textMuted }}>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                Andy está sugiriendo título y descripción...
              </p>
            )}
            <label className="block text-sm font-medium mb-1.5" style={{ color: text }}>
              Título del juego
            </label>
            <input
              type="text"
              value={tituloModal}
              onChange={(e) => setTituloModal(e.target.value)}
              placeholder="Ej: Naves espaciales"
              className="w-full rounded-xl px-4 py-2.5 text-sm border mb-4 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
              style={{ background: isDark ? '#0a0a0f' : '#fff', borderColor: border, color: text }}
              disabled={sugiriendoTitulo}
            />
            <label className="block text-sm font-medium mb-1.5" style={{ color: text }}>
              Descripción
            </label>
            <textarea
              value={descripcionModal}
              onChange={(e) => setDescripcionModal(e.target.value)}
              placeholder="Breve descripción para la plataforma"
              rows={3}
              className="w-full rounded-xl px-4 py-2.5 text-sm border mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
              style={{ background: isDark ? '#0a0a0f' : '#fff', borderColor: border, color: text }}
              disabled={sugiriendoTitulo}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => !enviandoModeracion && setModeracionModalOpen(false)}
                className="flex-1 rounded-xl px-4 py-3 text-sm font-bold border"
                style={{ borderColor: border, color: text, background: 'transparent' }}
                disabled={enviandoModeracion}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEnviarAModeracion}
                disabled={enviandoModeracion || sugiriendoTitulo}
                className="flex-1 vibe-btn-gradient rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar y enviar
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav theme={theme} activeTabId="" onTabChange={() => {}} />
    </div>
  );
}
