import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiId = 20395360;
const apiHash = "b957f2911ca84f9c09ef07afdae5c828";
const SESSION_FILE = path.join(__dirname, "../session.txt");
const FILES_REPO = path.join(__dirname, "../filesRepository");

const SUBCHANNELS = {
  INVERSION_DGI: 231729,
  RINCON_DE_PENSAR: 160371,
  ANALISIS_TECNICO: 368125,
  OPCIONES: 216895,
  BROKERS_Y_APPS: 246499,
  OTRAS_ESTRATEGIAS: 160368,
  FONDOS_Y_ETFS: 217065,
  CLUB_LECTURA: 417897,
  NOTICIAS_ANUNCIOS_DGI: 421579,
  FISCALIDAD_INVERSION: 214758,
};

const channelUsername = "DGIDividendosCrecientes";
const BATCH_SIZE = 100;
const BATCH_SAVE = 50;

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
  reactions: msg.reactions?.results?.map((r) => ({
    emoji: r.reaction,
    count: r.count,
  })) || [],
});

class TelegramService {
  constructor() {
    this.client = null;
    this.sessionString = "";
    this.phoneCodeHash = null;
    this.phoneNumber = null;
    this.io = null;

    if (!fs.existsSync(FILES_REPO)) {
      fs.mkdirSync(FILES_REPO, { recursive: true });
    }

    if (fs.existsSync(SESSION_FILE)) {
      console.log("Cargando sesión existente...");
      this.sessionString = fs.readFileSync(SESSION_FILE, "utf8");
    }
    this.session = new StringSession(this.sessionString);
    const createLogger = (level) => (message) => {
        if (typeof message === 'string' && message.includes("Sleeping for") && message.includes("flood wait")) {
            const seconds = message.match(/Sleeping for (\d+)s/)?.[1] || "?";
            this.log(`⏳ Esperando reintento ${seconds}s por flood detectado`);
        }
        // Optional: filter out some verbose logs if needed, or just log everything to console
        // console.log(`[${level.toUpperCase()}] ${message}`);
    };

    const customLogger = {
      info: createLogger('info'),
      warn: createLogger('warn'),
      error: createLogger('error'),
      debug: () => {}, // Ignore debug logs to keep console clean
    };

    this.client = new TelegramClient(this.session, apiId, apiHash, {
      connectionRetries: 5,
      baseLogger: customLogger,
    });
  }

  setSocket(io) {
    this.io = io;
  }

  log(message) {
    console.log(message);
    if (this.io) {
      this.io.emit("log", message);
    }
  }

  async connect() {
    if (!this.client.connected) {
      this.log("Connecting to Telegram...");
      await this.client.connect();
      this.log("Connected.");
    }
    return this.client.connected;
  }

  async sendCode(phoneNumber) {
    await this.connect();
    this.phoneNumber = phoneNumber;
    const result = await this.client.sendCode(
      {
        apiId,
        apiHash,
      },
      phoneNumber
    );
    this.phoneCodeHash = result.phoneCodeHash;
    return true;
  }

  async signIn(code) {
    try {
      await this.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: this.phoneNumber,
          phoneCodeHash: this.phoneCodeHash,
          phoneCode: code,
        })
      );
      this.saveSession();
      return { success: true };
    } catch (e) {
      if (e.message.includes("SESSION_PASSWORD_NEEDED")) {
        return { success: false, error: "PASSWORD_NEEDED" };
      }
      throw e;
    }
  }

  async checkPassword(password) {
    await this.client.signIn({
      password: password,
      phoneNumber: this.phoneNumber,
      phoneCodeHash: this.phoneCodeHash,
    });
    this.saveSession();
    return true;
  }

  saveSession() {
    fs.writeFileSync(SESSION_FILE, this.client.session.save());
    this.log("✅ Sesión guardada.");
  }

  async getStatus() {
    await this.connect();
    const authorized = await this.client.checkAuthorization();
    return { authorized };
  }

  async extract(subchannelName, startDateStr, endDateStr) {
    await this.connect(); // Ensure connection

    if (!SUBCHANNELS[subchannelName]) {
      throw new Error("Subcanal no válido");
    }
    const mainMessageId = SUBCHANNELS[subchannelName];

    // Parse dates
    const [startDay, startMonth, startYear] = startDateStr.split("/").map(Number);
    const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0));

    let endDate = null;
    if (endDateStr) {
      const [endDay, endMonth, endYear] = endDateStr.split("/").map(Number);
      endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59));
    }

    const execDateStr = new Date().toISOString().split("T")[0];
    const startDateIso = startDate.toISOString().split("T")[0];
    const JSON_FILE = path.join(FILES_REPO, `${subchannelName}_${startDateIso}_${execDateStr}.json`);
    const fileName = path.basename(JSON_FILE);

    this.log(`\n📂 Subcanal: ${subchannelName}`);
    this.log(`📅 Fecha desde: ${startDate.toISOString()}`);
    this.log(`💾 Archivo de salida: ${fileName}\n`);

    const startTime = Date.now();

    const entity = await this.client.getEntity(channelUsername);
    this.log(`Obteniendo mensaje principal ID: ${subchannelName}`);
    const mainMsgArr = await this.client.getMessages(entity, { ids: mainMessageId });

    if (!mainMsgArr.length) {
      throw new Error("No se encontró el mensaje principal");
    }
    const mainMsg = mainMsgArr[0];

    let results = [];
    if (fs.existsSync(JSON_FILE)) {
      results = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
    }

    const saveJson = () => {
      results.sort((a, b) => new Date(a.date) - new Date(b.date));
      fs.writeFileSync(JSON_FILE, JSON.stringify(results, null, 2), "utf8");
      this.log(`💾 Guardando... (${results.length} mensajes)`);
    };

    const mainMsgDate = new Date(mainMsg.date * 1000);
    if (
      mainMsgDate >= startDate &&
      (!endDate || mainMsgDate <= endDate) &&
      !results.find((m) => m.id === mainMsg.id)
    ) {
      results.push(createMsgObj(mainMsg));
      saveJson();
      this.log("🟢 Mensaje principal guardado.");
    }

    this.log("\n🔍 Descargando mensajes del canal...");

    let offsetId = 0;
    const allMessages = new Map();

    while (true) {
      const batch = await this.client.getMessages(entity, {
        limit: BATCH_SIZE,
        offsetId,
        reverse: false,
      });

      if (!batch || batch.length === 0) break;

      let batchMinId = Infinity;
      let stopExtraction = false;
      let addedInBatch = 0;
      let discardedInBatch = 0;

      for (const msg of batch) {
        if (msg.id < batchMinId) batchMinId = msg.id; // Track min ID for pagination

        if (!msg.date) continue;
        const msgDate = new Date(msg.date * 1000);

        if (msgDate < startDate) {
            stopExtraction = true;
            break;
        }

        if (endDate && msgDate > endDate) {
            discardedInBatch++;
            continue;
        }

        allMessages.set(msg.id, msg);
        // We don't know if it's "added" to results yet, but it's "kept" for processing.
        // The actual adding happens in the next loop.
        // However, the user wants to know what happened in THIS scanning step.
        // Let's count "kept" vs "discarded by date".
        // Actually, the "added" count the user asks for might be "messages that passed the date filter".
        addedInBatch++;
      }

      // Log progress
      if (batch.length > 0 && batch[0].date) {
         const currentMsgDate = new Date(batch[0].date * 1000).toISOString().split('T')[0];
         // Simplified log: Date | In Range | Out of Range
         this.log(`⏳ Escaneando ${currentMsgDate} | En rango: ${addedInBatch} | Ignorados: ${discardedInBatch}`);
      }

      if (stopExtraction) {
          this.log("⏹️ Se alcanzó la fecha límite. Deteniendo escaneo.");
          break;
      }

      if (batchMinId === Infinity) {
          this.log("⚠️ Batch procesado sin ID válido. Deteniendo.");
          break;
      }

      offsetId = batchMinId;
      await sleep(500);
    }

    this.log(`\n📊 Resumen de escaneo:`);
    this.log(`   - Mensajes totales leídos: ${allMessages.size}`);
    this.log(`   - Filtrando por subcanal (ID: ${mainMessageId})...`);

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
      if (newAdded > 0) this.log(`🔄 Hilos: +${newAdded} respuestas vinculadas.`);
    } while (newAdded > 0);

    saveJson();

    const durationMin = ((Date.now() - startTime) / 60000).toFixed(2);
    this.log("\n====================================");
    this.log("     ✅ EXTRACCIÓN FINALIZADA");
    this.log("====================================");
    this.log(`📦 Mensajes guardados (Subcanal): ${results.length}`);
    this.log(`🗑️ Mensajes descartados (Otros temas): ${allMessages.size - results.length}`);

    // Daily breakdown
    this.log("\n📅 Desglose por día:");
    const dailyCounts = {};
    results.forEach(msg => {
        const date = msg.date.split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    Object.keys(dailyCounts).sort().forEach(date => {
        this.log(`   - ${date}: ${dailyCounts[date]}`);
    });
    this.log(""); // Empty line

    this.log(`⏱️ Duración total: ${durationMin} minutos`);

    return {
      count: results.length,
      file: fileName,
      duration: durationMin,
    };
  }

  getFiles() {
    if (!fs.existsSync(FILES_REPO)) return [];
    const files = fs.readdirSync(FILES_REPO).filter(f => f.endsWith(".json"));
    return files.map(f => {
      const stats = fs.statSync(path.join(FILES_REPO, f));
      return {
        name: f,
        size: stats.size,
        date: stats.mtime,
      };
    });
  }

  deleteFile(filename) {
    const filePath = path.join(FILES_REPO, filename);
    if (!filePath.startsWith(FILES_REPO) || !filename.endsWith(".json")) {
      throw new Error("Invalid file");
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  getFilePath(filename) {
    return path.join(FILES_REPO, filename);
  }
}

export default new TelegramService();
