# 📡 Telegram Extractor

Script sencillo para extraer mensajes del canal *DGI – Dividendos Crecientes* y de sus dos subcanales.
Ahora incluye una interfaz web para visualizar y gestionar las descargas.

## 🔧 Prerequisitos

Desde la consola o terminal del sistema operativo (cmd o powershell en windows, terminal en Linux o Macos...)

1. Instalar Node.js
   Descárgalo desde: https://nodejs.org
   (Vale cualquier versión moderna: 18, 20, 22…)

2. Tener una cuenta de Telegram
   Para validar al usuario el script pedirá el teléfono (+34XXXXXXXXX) y el código que Telegram envíe.

## 📥 Instalación (primera vez)

1. Descargar o clonar este proyecto.
2. Abrir una terminal o consola dentro de la carpeta.
3. Instalar dependencias de todo el proyecto (servidor y cliente). Ejecutar:

```bash
npm run install:all
```

## ▶️ Ejecución

Ejecuta el siguiente comando para iniciar tanto el servidor como el cliente web:

```bash
npm start
```

Esto abrirá automáticamente:
- **Servidor**: En segundo plano conectándose a Telegram.
- **Cliente Web**: Normalmente en `http://localhost:5173` (o el puerto que asigne Vite).

Cuando el servidor esté ejecutándose en la terminal, puedes detenerlo con:

**Ctrl + C** (funciona en Windows, macOS y Linux)

### Uso desde la Web

1.  **Conexión**:
    -   Si es la primera vez, la propia web te pedirá tu número de teléfono y el código que te envíe Telegram (no hace falta mirar la terminal).
    -   Una vez autenticado, la sesión se guarda en el servidor y no hará falta en posteriores ejecuciones.
2.  **Interfaz**:
    -   Selecciona el subcanal:
        -   INVERSION_DGI
        -   RINCON_DE_PENSAR
        -   ANALISIS_TECNICO
        -   OPCIONES
        -   BROKERS_Y_APPS
        -   OTRAS_ESTRATEGIAS
        -   FONTOS_Y_ETFS
        -   CLUB_LECTURA
        -   NOTICIAS_ANUNCIOS_DGI
        -   FISCALIDAD_INVERSION
    -   Elige la fecha de inicio.
    -   Pulsa "Extraer Mensajes".

## ▶️ Resultados

-   Los mensajes descargados aparecerán automáticamente en la tabla **"Archivos Generados"**.
-   Desde ahí puedes **descargar** el archivo `.json` a tu ordenador o eliminarlo.
-   Podrás ver el progreso detallado en la sección de "Logs de Extracción".

## Generar informe con IA (Gemini, ChatGPT, etc.)

La aplicación web incluye un botón **"Ver Ejemplo de Prompt"** que te muestra una plantilla lista para copiar y pegar en tu IA favorita junto con el archivo JSON generado.

Elabora un **resumen ejecutivo completo** sobre la actividad del canal de inversión, basándote en la información contenida en el **archivo JSON adjunto** y el periodo de sus mensajes. Tu resumen debe incluir:

1. **Debates estratégicos**
   - Identifica los principales debates sobre estrategias de inversión.
   - Expón las diferentes posturas que surgieron en cada debate.

2. **Empresas con debates relevantes**
   - Lista las empresas que protagonizaron **grandes debates** relacionados con su modelo de negocio, resultados, riesgos, perspectivas u otros datos importantes.
   - Indica si se alcanzó alguna conclusión, consenso o tendencia dominante.

3. **Empresas con debates menores**
   - Enumera las compañías que tuvieron discusiones breves, superficiales o con poca participación.

4. **Resultados empresariales y noticias de la semana**
   - Resume todos los resultados financieros, actualizaciones y noticias relevantes de empresas mencionadas durante la semana.

5. **Noticias macro y del sector inversor**
   - Incluye las principales noticias sobre economía, mercados globales, política monetaria o inversores conocidos que **no se hayan mencionado en apartados anteriores**.

6. **Actividad de compra/venta del canal**
   - Enumera las empresas más compradas y las más vendidas durante la semana.

7. **Análisis de sentimiento del canal**
   - Describe el sentimiento general (positivo, negativo, mixto, eufórico, temeroso, etc.).
   - Explica cómo evolucionó a lo largo de la semana.

8. **Usuarios destacados**
   - Identifica a los usuarios con mayor actividad o contribuciones relevantes.

9. **Saludos personalizados**
   - Realiza un saludo o mención especial a los usuarios que hayan hecho referencia a **Gemini** o al propio **resumen semanal**.

Asegúrate de que el resumen sea **claro, estructurado y conciso, orientado a que un usuario que no haya podido estar al día del canal pueda saber a alto nivel qué se ha estado hablando**.