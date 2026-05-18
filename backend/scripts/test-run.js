/**
 * Script: test-run.js
 * Descrizione: Reset + Seed + Avvio server
 */

const { exec, spawn } = require("child_process");
const path = require("path");

function runCommand(command, message) {
    return new Promise((resolve, reject) => {
        console.log(message);

        exec(command, (err, stdout, stderr) => {
            if (err) return reject(err);
            console.log(stdout);
            resolve();
        });
    });
}

async function startServer() {
    console.log("--- > Avvio server...");

    const backendPath = path.join(__dirname, "..", "src");

    spawn("node", ["app.js"], {
        cwd: backendPath,
        stdio: "inherit",
        shell: true
    });
}

(async () => {
    try {
        await runCommand("npm run db:reset", "Reset database...");
        await runCommand("npm run db:seed:first", "Seed iniziale...");
        await startServer();
    } catch (err) {
        console.error("Errore:", err);
    }
})();