# 📡 Telegram Extractor

Script sencillo para extraer mensajes del canal *DGI – Dividendos Crecientes* y de sus dos subcanales.
Todo viene ya configurado, solo hay que ejecutarlo.

* Siempre se pedirá una fecha, y el extractor descargará todos los mensajes desde esa fecha hasta la último.


## 🔧 Prerequisitos

Desde la consola o terminal del sistema operativo (cmd o powershell en windows, terminal en Linux o Macos...)

1. Instalar Node.js
   Descárgalo desde: https://nodejs.org
   (Vale cualquier versión moderna: 18, 20, 22…)

2. Tener una cuenta de Telegram
   Para validar al usuario el script pedirá el teléfono (34XXXXXXXXX) y el código que Telegram envíe.


## 📥 Instalación (primera vez)

1. Descargar o clonar este proyecto.
2. Abrir una terminal o consola dentro de la carpeta.
3. Instalar dependencias. Ejecutar:

```bash
npm install
```

## ▶️ Ejecución

Ejecuta:

```bash
npm run start
```

- El programa pedirá:

    - Elegir el subcanal a extraer:

        - INVERSION_DGI
        - RINCON_DE_PENSAR

    - Introducir la fecha DESDE la que se quieren descargar los mensajes en formato dd/MM/YYYY.

    - Tu número de teléfono, el código que Telegram te envía, contraseña 2FA (solo si hace falta). Este paso sólo lo pedirá la primera vez y la sesión se guardará para posteriores ejecuciones.

## ▶️ Resultados

- Se generará un archivo .json con los mensajes descargados.
- La sesión de Telegram se guarda en session.txt para no volver a iniciar sesión.

✔️ Listo

- Al terminar, verás el número total de mensajes guardados y el nombre del archivo generado.

## Generar informe en Gemini (o cualquier otra IA que sea capaz de procesar archivos json)

- Adjuntar archivo json
- Definir prompt deseado. Ejemplo:

```
Hazme un resumen ejecutivo de la actividad semanal (del 10 de noviembre al 16 de noviembre) de este canal de inversion (información en el archivo json adjunto):
-> Debates sobre la estrategia: enumera los pricipales debates y las diferentes posturas en ellos. 
-> Nombra empresas que hayan tenido grandes debates sobre el negocio, resultados u otros datos relevantes, y si hay alguna conclusión en ellos.
-> Nombra empresas que hayan tenido pequeños debates
-> Enumera resultados y noticias de empresas de esta semana
-> Principales noticias sobre inversión, economía o inversores que no se haya nombrado antes.
-> Empresas más compradas y vendidas
-> Sentimiento del canal y la evolución durante la semana
-> Usuarios más activos
-> Saludos: saluda o haz mención a los usuarios que hayan hecho referencia a Gemini o este resumen
```