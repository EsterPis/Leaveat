const { exec, spawn } = require("child_process");
const path = require("path");

// 1) Reset DB
function resetDB() {
    return new Promise((resolve, reject) => {
        console.log("🔄 Reset del database...");
        exec("npm run db:reset", (err, stdout) => {
            if (err) return reject(err);
            console.log(stdout);
            resolve();
        });
    });
}

// 2) First Seed
function seedDB() {
    return new Promise((resolve, reject) => {
        console.log("🌱 Import dei dati iniziali...");
        exec("npm run db:seed:first", (err, stdout) => {
            if (err) return reject(err);
            console.log(stdout);
            resolve();
        });
    });
}

// 3) Avvio server con spawn (PROCESSO PERSISTENTE)
function startServer() {
    return new Promise((resolve) => {
        console.log("🚀 Avvio del server...");

        const backendPath = path.join(__dirname, "..", "src");
        const server = spawn("node", ["app.js"], {
            cwd: backendPath,
            stdio: "inherit", // mostra i log in tempo reale!
            shell: true
        });

        console.log("✅ Server avviato correttamente");

        // Non chiudiamo la Promise: lasciamo il processo attivo
        // per mantenere il server vivo come da terminale
    });
}

(async () => {
    try {
        await resetDB();
        await seedDB();
        await startServer();
    } catch (err) {
        console.error("❌ Errore:", err);
    }
})();
