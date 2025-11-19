# 📡 Telegram Extractor

Script sencillo para extraer mensajes del canal *DGI – Dividendos Crecientes* y de sus dos subcanales.
Todo viene ya configurado, solo tienes que ejecutarlo.

* Siempre se pedirá una fecha, y el extractor descargará todos los mensajes desde esa fecha hasta la último.


## 🔧 Requisitos

1. Instalar Node.js
   Descárgalo desde: https://nodejs.org
   (Vale cualquier versión moderna: 18, 20, 22…)

2. Tener una cuenta de Telegram
   El script te pedirá tu teléfono y el código que Telegram te envíe.


## 📥 Instalación

1. Descarga o clona este proyecto.
2. Abre una terminal o consola dentro de la carpeta.
3. Ejecuta:

```bash
npm install
```

## ▶️ Ejecución

Ejecuta:

```bash
npm run start
```

- El programa te pedirá:

    - Elegir el subcanal a extraer:

        - INVERSION_DGI
        - RINCON_DE_PENSAR

    - Introducir la fecha DESDE la que quieres descargar mensajes.

    - Tu número de teléfono.

    - El código que Telegram te envía.

    - Contraseña 2FA (solo si tienes).

## ▶️ Resultados

- Se generará un archivo .json con los mensajes descargados.
- La sesión de Telegram se guarda en session.txt para no volver a iniciar sesión.

✔️ Listo

- Al terminar, verás el número total de mensajes guardados y el nombre del archivo generado.