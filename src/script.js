const syncDirectory = require("sync-directory");
const anymatch = require("anymatch");
const express = require('express');

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

let initialSyncDone = false;

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
    console.log("Running initial sync...");
  },
  afterInitialSync() {
    initialSyncDone = true;

    console.log("Initial sync done...");
  },
});

const app = express();
app.get('/', (req, res) => {
  console.log('Healthcheck verify');
  res.send(initialSyncDone ? 'yes' : 'no').end();
});

app.listen(3000, () => {
  console.log('Healthcheck server running...');
});