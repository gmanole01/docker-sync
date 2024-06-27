const syncDirectory = require("sync-directory");
const anymatch = require("anymatch");
const nodePath = require("path");
const fs = require("fs");

function cleanup(callback) {
  const noop = () => {};

  callback = callback || noop;

  process.on("cleanup", callback);

  process.on("exit", function () {
    process.emit("cleanup");
  });

  process.on("SIGINT", function () {
    process.exit(2);
  });

  process.on("SIGTERM", function () {
    process.exit(2);
  });

  process.on("SIGHUP", function () {
    process.exit(2);
  });

  process.on("uncaughtException", function (e) {
    process.exit(3);
  });
}

const HEALTHCHECK_FILE = "/.docker-sync-healthcheck";

function removeHealthCheckFile() {
  if (!fs.existsSync(HEALTHCHECK_FILE)) {
    return;
  }
  fs.unlinkSync(HEALTHCHECK_FILE);
}

function createHealthCheckFile() {
  removeHealthCheckFile();
  fs.writeFileSync(HEALTHCHECK_FILE, ".", { encoding: "utf-8" });
}

cleanup(() => {
  removeHealthCheckFile();
});

const SRC = "/from";
const DEST = "/to";

console.log("Syncing...");

function getIgnored() {
  const a = process.env.DOCKER_SYNC_IGNORED;
  if (!a || !a.length) {
    return [];
  }
  return a.split(",").map((i) => i.trim());
}

const IGNORED = getIgnored();

function relativize(p) {
  if (!p.startsWith(SRC.replace(/\/+$/, ""))) {
    return null;
  }
  return p.substring(SRC.length).replace(/^\/+/, "").trim();
}

syncDirectory(SRC, DEST, {
  watch: true,
  chokidarWatchOptions: {
    ignored: [
      (path) => {
        const relative = relativize(path);
        if (relative === null) {
          return true;
        }
        if (!relative) {
          return false;
        }
        return anymatch(IGNORED, relative, {
          dot: true,
        });
      },
    ],
    usePolling: true,
    interval: 100,
    binaryInterval: 300,
  },

  exclude(_fp) {
    const fp = _fp.replace(/^\/+/, "");
    return anymatch(IGNORED, fp, {
      dot: true,
    });
  },

  afterEachSync({ eventType, nodeType, relativePath, srcPath, targetPath }) {
    console.log(`Synced ${relativize(srcPath)}`);
  },

  beforeInitialSync() {
    removeHealthCheckFile();

    console.log("Running initial sync...");
  },
  afterInitialSync() {
    createHealthCheckFile();

    console.log("Initial sync done...");
  },
});
