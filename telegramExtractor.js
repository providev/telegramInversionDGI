import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import input from "input";
import fs from "fs";

const apiId = 20395360;
const apiHash = "b957f2911ca84f9c09ef07afdae5c828";
const SESSION_FILE = "./session.txt";

const SUBCHANNELS = {
  INVERSION_DGI: 231729,
  RINCON_DE_PENSAR: 160371,
};

const channelUsername = "DGIDividendosCrecientes";
const BATCH_SIZE = 100;
const BATCH_SAVE = 50;

let sessionString = "";
if (fs.existsSync(SESSION_FILE)) {
  console.log("Cargando sesión existente...");
  sessionString = fs.readFileSync(SESSION_FILE, "utf8");
}
const session = new StringSession(sessionString);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createMsgObj = (msg) => ({
  id: msg.id,
  date: new Date(msg.date * 1000).toISOString(),
  message: msg.message || "",
  sender:
    msg.sender?.username ||
    `${msg.sender?.firstName || ""} ${msg.sender?.lastName || ""}`.trim() ||
    "desconocido",
  replyToId: msg.replyToMsgId || null,
});

async function main() {
  console.log("====================================");
  console.log("   📡 Extracción de mensajes Telegram");
  console.log("====================================\n");

  // 🔹 Selección del subcanal
  console.log("Selecciona el subcanal:");
  console.log("1) INVERSION_DGI");
  console.log("2) RINCON_DE_PENSAR");
  let choice;
  while (true) {
    choice = await input.text("Introduce 1 o 2: ");
    if (choice === "1" || choice === "2") break;
    console.log("Opción no válida. Introduce 1 o 2.");
  }
  const subchannelName =
    choice === "1" ? "INVERSION_DGI" : "RINCON_DE_PENSAR";
  const mainMessageId = SUBCHANNELS[subchannelName];

  // 🔹 Solicitar fecha DESDE
  let startDate;
  while (true) {
    const startDateInput = await input.text(
      "Introduce la fecha DESDE (DD/MM/YYYY): "
    );
    const [day, month, year] = startDateInput.split("/").map(Number);
    if (
      !isNaN(day) &&
      !isNaN(month) &&
      !isNaN(year) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12
    ) {
      startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      break;
    } else {
      console.log(
        "⚠️  Formato inválido. Usa DD/MM/YYYY, por ejemplo 27/10/2025"
      );
    }
  }

  // 🔹 Solicitar fecha HASTA (opcional)
  let endDate = null;
  const endDateInputRaw = await input.text(
    "Introduce la fecha HASTA (DD/MM/YYYY) o deja vacía: "
  );
  if (endDateInputRaw.trim() !== "") {
    const [day, month, year] = endDateInputRaw.split("/").map(Number);
    if (
      !isNaN(day) &&
      !isNaN(month) &&
      !isNaN(year) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12
    ) {
      endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
    } else {
      console.log(
        "⚠️  Formato inválido de HASTA. Se ignorará y se tomarán todos los mensajes recientes."
      );
    }
  }

  // 🔹 Construcción del nombre del archivo de salida
  const startDateStr = startDate.toISOString().split("T")[0];
  const execDateStr = new Date().toISOString().split("T")[0];
  const JSON_FILE = `./${subchannelName}_${startDateStr}_${execDateStr}.json`;

  console.log(`\n📂 Subcanal: ${subchannelName}`);
  console.log(`📅 Fecha desde: ${startDate.toISOString()}`);
  console.log(
    `📅 Fecha hasta: ${endDate ? endDate.toISOString() : "sin límite"}`
  );
  console.log(`💾 Archivo de salida: ${JSON_FILE}\n`);

  const startTime = Date.now();

  // 🔹 Inicializar cliente Telegram
  console.log("Iniciando cliente de Telegram...");
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () =>
      await input.text("Introduce tu número de teléfono (34XXXXXXXXX): "),
    password: async () => await input.text("Contraseña 2FA (si tienes): "),
    phoneCode: async () => await input.text("Código recibido en Telegram: "),
    onError: (err) => console.log("Error de login:", err),
  });

  fs.writeFileSync(SESSION_FILE, client.session.save());
  console.log("✅ Login exitoso. Sesión guardada.\n");

  const entity = await client.getEntity(channelUsername);
  console.log("Obteniendo mensaje principal ID:", subchannelName);
  const mainMsgArr = await client.getMessages(entity, { ids: mainMessageId });
  if (!mainMsgArr.length) {
    console.error("❌ No se encontró el mensaje principal");
    await client.disconnect();
    return;
  }
  const mainMsg = mainMsgArr[0];

  // 🔹 Cargar resultados previos si existen
  let results = [];
  if (fs.existsSync(JSON_FILE)) {
    results = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
  }

  const saveJson = () => {
    results.sort((a, b) => new Date(a.date) - new Date(b.date));
    fs.writeFileSync(JSON_FILE, JSON.stringify(results, null, 2), "utf8");
    console.log(
      `💾 Archivo actualizado: ${JSON_FILE} (total: ${results.length})`
    );
  };

  // Guardar el mensaje principal si aplica
  const mainMsgDate = new Date(mainMsg.date * 1000);
  if (
    mainMsgDate >= startDate &&
    (!endDate || mainMsgDate <= endDate) &&
    !results.find((m) => m.id === mainMsg.id)
  ) {
    results.push(createMsgObj(mainMsg));
    saveJson();
    console.log("🟢 Mensaje principal guardado.");
  }

  console.log("\n🔍 Descargando mensajes del canal...");

  let offsetId = 0;
  const allMessages = new Map();

  while (true) {
    const batch = await client.getMessages(entity, {
      limit: BATCH_SIZE,
      offsetId,
      reverse: false,
    });
    if (!batch || batch.length === 0) break;

    let minIdInBatch = Infinity;
    for (const msg of batch) {
      if (!msg.date) continue;
      const msgDate = new Date(msg.date * 1000);
      if (msgDate < startDate) continue; // fuera de rango
      if (endDate && msgDate > endDate) continue; // fuera de rango superior
      allMessages.set(msg.id, msg);
      if (msg.id < minIdInBatch) minIdInBatch = msg.id;
    }

    if (minIdInBatch === Infinity) break;
    offsetId = minIdInBatch - 1;
    await sleep(500);
  }

  console.log("🧩 Procesando mensajes y replies...");

  const savedIds = new Set(results.map((m) => m.id));
  let newAdded;

  do {
    newAdded = 0;
    for (const msg of allMessages.values()) {
      if (savedIds.has(msg.id)) continue;

      const msgDate = new Date(msg.date * 1000);
      if (msgDate < startDate) continue;
      if (endDate && msgDate > endDate) continue;

      if (
        msg.replyToMsgId === mainMessageId ||
        savedIds.has(msg.replyToMsgId)
      ) {
        const obj = createMsgObj(msg);
        results.push(obj);
        savedIds.add(msg.id);
        newAdded++;
        if (results.length % BATCH_SAVE === 0) saveJson();
      }
    }
  } while (newAdded > 0);

  saveJson();

  // 🔹 Cierre limpio y resumen
  const durationMin = ((Date.now() - startTime) / 60000).toFixed(2);

  console.log("\n====================================");
  console.log("     ✅ EXTRACCIÓN FINALIZADA");
  console.log("====================================");
  console.log(`📦 Total de mensajes guardados: ${results.length}`);
  console.log(`💾 Archivo generado: ${JSON_FILE}`);
  console.log(
    `📅 Desde: ${startDate.toISOString()}  Hasta: ${
      endDate ? endDate.toISOString() : execDateStr
    }`
  );
  console.log(`⏱️ Duración total: ${durationMin} minutos`);
  console.log("====================================\n");

  try {
    await client.disconnect();
    console.log("🔌 Cliente desconectado correctamente.\n");
  } catch (err) {
    console.warn(
      "⚠️  Advertencia: el cliente ya estaba desconectado o la conexión expiró."
    );
  }

  console.log("🎉 Proceso completado sin errores críticos.\n");
}

main().catch((err) => {
  if (err && err.message && !err.message.includes("TIMEOUT")) {
    console.error("❌ Error inesperado:", err.message || err);
  }
});
