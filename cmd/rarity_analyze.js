const appRoot = require('app-root-path');
const config = require(appRoot + '/config/config.js');
const collectionData = require(appRoot + '/config/' + config.collection_file_name);
const fs = require('fs');
const Database = require('better-sqlite3');
const _ = require('lodash');
const argv = require('minimist')(process.argv.slice(2),{
    string: ['mode'],
});

let mode = argv['mode'];

const databasePath = appRoot + '/config/' + config.sqlite_file_name;

if (mode != 'force') { 
    if (fs.existsSync(databasePath)) {
        console.log("Database exist.");
        return;
    }
}

fs.writeFileSync(databasePath, '', { flag: 'w' });
console.log("Database created.");

const db = new Database(databasePath);

let totalDirtypantie = 0;
let traitTypeId = 0;
let traitDetailTypeId = 0;
let dirtypantieTraitTypeId = 0;
let dirtypantieScoreId = 0;

let traitTypeIdMap = {};
let traitTypeCount = {};
let traitDetailTypeIdMap = {};
let traitDetailTypeCount = {};
let dirtypantieTraitTypeCount = {};

let ignoreTraits = config.ignore_traits.map(ignore_trait => ignore_trait.toLowerCase());

db.exec(
    "CREATE TABLE dirtypantie (" +
        "id INT, " +
        "name TEXT, " +
        "description TEXT, " + 
        "image TEXT, " +
        "external_url TEXT, " +
        "animation_url TEXT " +
    ")"
);

db.exec(
    "CREATE TABLE trait_types (" +
        "id INT, " +
        "trait_type TEXT, " +
        "trait_data_type TEXT, " +
        "dirtypantie_count INT " +
    ")"
);

db.exec(
    "CREATE TABLE trait_detail_types (" +
        "id INT, " +
        "trait_type_id INT, " +
        "trait_detail_type TEXT, " +
        "dirtypantie_count INT " +
    ")"
);

db.exec(
    "CREATE TABLE dirtypantie_traits (" +
        "id INT, " +
        "dirtypantie_id INT, " +
        "trait_type_id INT, " + 
        "value TEXT " +
    ")"
);

db.exec(
    "CREATE TABLE dirtypantie_trait_counts (" +
        "trait_count INT, " +
        "dirtypantie_count INT " +
    ")"
);

let insertDirtypantieStmt = db.prepare("INSERT INTO dirtypantie VALUES (?, ?, ?, ?, ?, ?)");
let insertTraitTypeStmt = db.prepare("INSERT INTO trait_types VALUES (?, ?, ?, ?)");
let insertTraitDetailTypeStmt = db.prepare("INSERT INTO trait_detail_types VALUES (?, ?, ?, ?)");
let insertPuntTraitStmt = db.prepare("INSERT INTO dirtypantie_traits VALUES (?, ?, ?, ?)");

let count1 = config.collection_id_from;
collectionData.forEach(element => {

    if (element.id != undefined) {
        element.id = element.id.toString();
    }
    if (_.isEmpty(element.id)) {
        element['id'] = count1;
    }
    if (_.isEmpty(element.name)) {
        element['name'] = config.collection_name + ' #' + element.id;
    }
    if (!element.name.includes('#'+element.id)) {
        element['name'] = element['name'] + ' #' + (count1 + config.collection_id_from);
    }
    if (_.isEmpty(element.description)) {
        element['description'] = '';
    }
    if (_.isEmpty(element.external_url)) {
        element['external_url'] = '';
    }
    if (_.isEmpty(element.animation_url)) {
        element['animation_url'] = '';
    }

    console.log("Prepare dirtypantie: #" + element.id);
    
    insertDirtypantieStmt.run(element.id, element.name, element.description, element.image, element.external_url, element.animation_url);

    let thisDirtypantieTraitTypes = [];

    if (_.isEmpty(element.attributes) && !_.isEmpty(element.traits)) {
        element.attributes = [];
        for (const [key, value] of Object.entries(element.traits)) {
            element.attributes.push(
                {
                    trait_type: key,
                    value: value
                }
            );
        }
    }

    // fake data for date
    /*
    element.attributes.push({
        value: '2456221590',
        trait_type: 'date',
        display_type: 'date',
    });
    */

    element.attributes.forEach(attribute => {

        if (attribute.value) {
            attribute.value = attribute.value.toString();
        }

        if (_.isEmpty(attribute.trait_type) || _.isEmpty(attribute.value) || attribute.value.toLowerCase() == 'none' || attribute.value.toLowerCase() == 'nothing' || attribute.value.toLowerCase() == '0') {
            return;
        }

        // Trait type
        if (!traitTypeCount.hasOwnProperty(attribute.trait_type)) {
            let traitDataType = 'string';
            if (!_.isEmpty(attribute.display_type) && attribute.display_type.toLowerCase() == 'date') {
                traitDataType = 'date';
            }
            insertTraitTypeStmt.run(traitTypeId, _.startCase(attribute.trait_type), traitDataType, 0);
            traitTypeIdMap[attribute.trait_type] = traitTypeId;
            traitTypeId = traitTypeId + 1;
            if (!ignoreTraits.includes(attribute.trait_type.toLowerCase())) {
                traitTypeCount[attribute.trait_type] = 0 + 1;
            } else {
                traitTypeCount[attribute.trait_type] = 0;
            }
        } else {
            if (!ignoreTraits.includes(attribute.trait_type.toLowerCase())) {
                traitTypeCount[attribute.trait_type] = traitTypeCount[attribute.trait_type] + 1;
            } else {
                traitTypeCount[attribute.trait_type] = 0;
            }
        }

        // Trait detail type
        if (!traitDetailTypeCount.hasOwnProperty(attribute.trait_type+'|||'+attribute.value)) {
            insertTraitDetailTypeStmt.run(traitDetailTypeId, traitTypeIdMap[attribute.trait_type], attribute.value, 0);
            traitDetailTypeIdMap[attribute.trait_type+'|||'+attribute.value] = traitDetailTypeId;
            traitDetailTypeId = traitDetailTypeId + 1;
            if (!ignoreTraits.includes(attribute.trait_type.toLowerCase())) {
                traitDetailTypeCount[attribute.trait_type+'|||'+attribute.value] = 0 + 1;
            } else {
                traitDetailTypeCount[attribute.trait_type+'|||'+attribute.value] = 0;
            }
        } else {
            if (!ignoreTraits.includes(attribute.trait_type.toLowerCase())) {
                traitDetailTypeCount[attribute.trait_type+'|||'+attribute.value] = traitDetailTypeCount[attribute.trait_type+'|||'+attribute.value] + 1; 
            } else {
                traitDetailTypeCount[attribute.trait_type+'|||'+attribute.value] = 0;
            }  
        }

        insertPuntTraitStmt.run(dirtypantieTraitTypeId, element.id, traitTypeIdMap[attribute.trait_type], attribute.value);  
        dirtypantieTraitTypeId = dirtypantieTraitTypeId + 1;
        
        if (!ignoreTraits.includes(attribute.trait_type.toLowerCase())) {
            thisDirtypantieTraitTypes.push(attribute.trait_type);
        }
    });

    if (!dirtypantieTraitTypeCount.hasOwnProperty(thisDirtypantieTraitTypes.length)) {
        dirtypantieTraitTypeCount[thisDirtypantieTraitTypes.length] = 0 + 1;
    } else {
        dirtypantieTraitTypeCount[thisDirtypantieTraitTypes.length] = dirtypantieTraitTypeCount[thisDirtypantieTraitTypes.length] + 1;
    }

    totalDirtypantie = totalDirtypantie + 1;
    count1 = count1 + 1;
});

console.log(traitTypeCount);
let updateTraitTypeStmt = db.prepare("UPDATE trait_types SET dirtypantie_count = :dirtypantie_count WHERE id = :id");
for(let traitType in traitTypeCount)
{
    let thisTraitTypeCount = traitTypeCount[traitType];
    let traitTypeId = traitTypeIdMap[traitType];
    updateTraitTypeStmt.run({
        dirtypantie_count: thisTraitTypeCount,
        id: traitTypeId
    });
}
console.log(traitDetailTypeCount);
let updateTraitDetailTypeStmt = db.prepare("UPDATE trait_detail_types SET dirtypantie_count = :dirtypantie_count WHERE id = :id");
for(let traitDetailType in traitDetailTypeCount)
{
    let thisTraitDetailTypeCount = traitDetailTypeCount[traitDetailType];
    let traitDetailTypeId = traitDetailTypeIdMap[traitDetailType];
    updateTraitDetailTypeStmt.run({
        dirtypantie_count: thisTraitDetailTypeCount,
        id: traitDetailTypeId
    });
}
console.log(dirtypantieTraitTypeCount);
let insertDirtypantieTraitContStmt = db.prepare("INSERT INTO dirtypantie_trait_counts VALUES (?, ?)");
for(let countType in dirtypantieTraitTypeCount)
{
    let thisTypeCount = dirtypantieTraitTypeCount[countType];
    insertDirtypantieTraitContStmt.run(countType, thisTypeCount);
}

let createScoreTableStmt = "CREATE TABLE dirtypantie_scores ( id INT, dirtypantie_id INT, ";
let insertDirtypantieScoreStmt = "INSERT INTO dirtypantie_scores VALUES (:id, :dirtypantie_id, ";

for (let i = 0; i < traitTypeId; i++) {
    createScoreTableStmt = createScoreTableStmt + "trait_type_" + i + "_percentile DOUBLE, trait_type_" + i + "_rarity DOUBLE, trait_type_" + i + "_value TEXT, ";
    insertDirtypantieScoreStmt = insertDirtypantieScoreStmt + ":trait_type_" + i + "_percentile, :trait_type_" + i + "_rarity, :trait_type_" + i + "_value, ";
}

createScoreTableStmt = createScoreTableStmt + "trait_count INT,  trait_count_percentile DOUBLE, trait_count_rarity DOUBLE, rarity_sum DOUBLE, rarity_rank INT)";
insertDirtypantieScoreStmt = insertDirtypantieScoreStmt + ":trait_count,  :trait_count_percentile, :trait_count_rarity, :rarity_sum, :rarity_rank)";

db.exec(createScoreTableStmt);
insertDirtypantieScoreStmt = db.prepare(insertDirtypantieScoreStmt);

let count2 = config.collection_id_from;
collectionData.forEach(element => {
    
    if (element.id != undefined) {
        element.id = element.id.toString();
    }
    if (_.isEmpty(element.id)) {
        element['id'] = count2;
    }

    console.log("Analyze dirtypantie: #" + element.id);

    let thisDirtypantieTraitTypes = [];
    let thisDirtypantieDetailTraits = {};

    if (_.isEmpty(element.attributes) && !_.isEmpty(element.traits)) {
        element.attributes = [];
        for (const [key, value] of Object.entries(element.traits)) {
            element.attributes.push(
                {
                    trait_type: key,
                    value: value
                }
            );
        }
    }

    element.attributes.forEach(attribute => {

        if (attribute.value) {
            attribute.value = attribute.value.toString();
        }
        
        if (_.isEmpty(attribute.trait_type) || _.isEmpty(attribute.value) || attribute.value.toLowerCase() == 'none' || attribute.value.toLowerCase() == 'nothing' || attribute.value.toLowerCase() == '0') {
            return;
        }

        thisDirtypantieTraitTypes.push(attribute.trait_type);
        thisDirtypantieDetailTraits[attribute.trait_type] = attribute.value;
    });

    let dirtypantieScore = {};
    let raritySum = 0;
    dirtypantieScore['id'] = dirtypantieScoreId;
    dirtypantieScore['dirtypantie_id'] = element.id;
    for(let traitType in traitTypeCount)
    {
        
        if (thisDirtypantieTraitTypes.includes(traitType)) {
            // has trait
            let traitDetailType = thisDirtypantieDetailTraits[traitType];
            let thisTraitDetailTypeCount = traitDetailTypeCount[traitType+'|||'+traitDetailType];
            let traitTypeId = traitTypeIdMap[traitType];
            if (!ignoreTraits.includes(traitType.toLowerCase())) {
                dirtypantieScore['trait_type_' + traitTypeId + '_percentile'] = thisTraitDetailTypeCount/totalDirtypantie;
                dirtypantieScore['trait_type_' + traitTypeId + '_rarity'] = totalDirtypantie/thisTraitDetailTypeCount;
                raritySum = raritySum + totalDirtypantie/thisTraitDetailTypeCount;
            } else {
                dirtypantieScore['trait_type_' + traitTypeId + '_percentile'] = 0;
                dirtypantieScore['trait_type_' + traitTypeId + '_rarity'] = 0;
                raritySum = raritySum + 0;
            }
            dirtypantieScore['trait_type_' + traitTypeId + '_value'] = traitDetailType;
        } else {   
            // missing trait
            let thisTraitTypeCount = traitTypeCount[traitType];
            let traitTypeId = traitTypeIdMap[traitType];
            if (!ignoreTraits.includes(traitType.toLowerCase())) {
                dirtypantieScore['trait_type_' + traitTypeId + '_percentile'] = (totalDirtypantie-thisTraitTypeCount)/totalDirtypantie;
                dirtypantieScore['trait_type_' + traitTypeId + '_rarity'] = totalDirtypantie/(totalDirtypantie-thisTraitTypeCount);
                raritySum = raritySum + totalDirtypantie/(totalDirtypantie-thisTraitTypeCount);
            } else {
                dirtypantieScore['trait_type_' + traitTypeId + '_percentile'] = 0;
                dirtypantieScore['trait_type_' + traitTypeId + '_rarity'] = 0;
                raritySum = raritySum + 0;
            }
            dirtypantieScore['trait_type_' + traitTypeId + '_value'] = 'None';
        }
    }


    thisDirtypantieTraitTypes = thisDirtypantieTraitTypes.filter(thisDirtypantieTraitType => !ignoreTraits.includes(thisDirtypantieTraitType));
    let thisDirtypantieTraitTypeCount = thisDirtypantieTraitTypes.length;

    dirtypantieScore['trait_count'] = thisDirtypantieTraitTypeCount;
    dirtypantieScore['trait_count_percentile'] = dirtypantieTraitTypeCount[thisDirtypantieTraitTypeCount]/totalDirtypantie;
    dirtypantieScore['trait_count_rarity'] = totalDirtypantie/dirtypantieTraitTypeCount[thisDirtypantieTraitTypeCount];
    raritySum = raritySum + totalDirtypantie/dirtypantieTraitTypeCount[thisDirtypantieTraitTypeCount];
    dirtypantieScore['rarity_sum'] = raritySum;
    dirtypantieScore['rarity_rank'] = 0;

    insertDirtypantieScoreStmt.run(dirtypantieScore);

    dirtypantieScoreId = dirtypantieScoreId + 1;
    count2 = count2 + 1;
});

const dirtypantieScoreStmt = db.prepare('SELECT rarity_sum FROM dirtypantie_scores WHERE dirtypantie_id = ?');
const dirtypantieRankStmt = db.prepare('SELECT COUNT(id) as higherRank FROM dirtypantie_scores WHERE rarity_sum > ?');
let updatDirtypantieRankStmt = db.prepare("UPDATE dirtypantie_scores SET rarity_rank = :rarity_rank WHERE dirtypantie_id = :dirtypantie_id");

let count3 = config.collection_id_from;
collectionData.forEach(element => {
    if (element.id != undefined) {
        element.id = element.id.toString();
    }
    if (_.isEmpty(element.id)) {
        element['id'] = count3;
    }

    console.log("Ranking dirtypantie: #" + element.id);
    let dirtypantieScore = dirtypantieScoreStmt.get(element.id);
    let dirtypantieRank = dirtypantieRankStmt.get(dirtypantieScore.rarity_sum);
    updatDirtypantieRankStmt.run({
        rarity_rank: dirtypantieRank.higherRank+1,
        dirtypantie_id: element.id
    });
    count3 = count3 + 1;
});
