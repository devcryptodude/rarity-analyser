const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const Database = require('better-sqlite3');
const jsondata = require(appRoot + '/modules/jsondata.js');
const fs = require('fs');

let databasePath = appRoot + '/config/' + config.sqlite_file_name;

if (!fs.existsSync(databasePath)) {
  databasePath = appRoot + '/config/database.sqlite.sample';
}

const db = new Database(databasePath);
const outputPath = appRoot + '/config/collection-rarities.json';

fs.truncateSync(outputPath);

const logger = fs.createWriteStream(outputPath, {
  flags: 'a'
});

logger.write("[\n");

let totalDirtypantieCount = db.prepare('SELECT COUNT(id) as dirtypantie_total FROM dirtypantie').get().dirtypantie_total;
let dirtypantie = db.prepare('SELECT dirtypantie.* FROM dirtypantie ORDER BY id').all();

let count = 0;
dirtypantie.forEach(dirtypantie => {
    console.log("Process dirtypantie: #" + dirtypantie.id);
    if ((count+1) == totalDirtypantieCount) {
        logger.write(JSON.stringify(jsondata.dirtypantie(dirtypantie))+"\n");
    } else {
        logger.write(JSON.stringify(jsondata.dirtypantie(dirtypantie))+",\n");
    }
    count++
});

logger.write("]");

logger.end();
