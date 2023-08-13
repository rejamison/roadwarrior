const fs = require('fs');
const { upload } = require('./autil');

const save_file = process.argv[2];

const BUCKET = 'road-warrior';

const save = JSON.parse(fs.readFileSync(save_file));
function find(name, nickname) {
    const objs = [];
    save.ObjectStates.forEach((o) => {
        if(o.Name === name && o.Nickname === nickname) {
            objs.push(o);
        } else {
            // check the contained objects
            if(o.ContainedObjects) {
                o.ContainedObjects.forEach((o2) => {
                    if(o2.Name === name && o2.Nickname === nickname) {
                        objs.push(o2);
                    }
                });
            }
        }
    });
    return objs;
}

function uploadAndUpdateDeck(name, width, height) {
    return new Promise((resolve, reject) => {
        // sanity check that the files exist
        if(fs.existsSync('var/tts/' + name + '_back.png') && fs.existsSync('var/tts/' + name + '_fronts.png')) {
            // sanity check a deck object exists in TTS save
            if(find('DeckCustom', name).length > 0) {
                const deck = find('DeckCustom', name)[0];
                const deckId = Object.keys(deck.CustomDeck)[0];
                upload(BUCKET, 'var/tts/' + name + '_back.png', 'image/png').then((url) => {
                    deck.CustomDeck[deckId].BackURL = url + '?' + Date.now();

                    upload(BUCKET, 'var/tts/' + name + '_fronts.png', 'image/png').then((url) => {
                        deck.CustomDeck[deckId].FaceURL = url + '?' + Date.now();
                        deck.CustomDeck[deckId].NumWidth = width;
                        deck.CustomDeck[deckId].NumHeight = height;
                        resolve();
                    }).catch((err) => {
                        reject(err);
                    });
                }).catch((err) => {
                    reject(err);
                });
            } else {
                console.error("ERROR: Couldn't find deck object in TTS save for: " + name);
                reject(new Error("ERROR: Couldn't find deck object in TTS save for: " + name));
            }
        } else {
            console.error("ERROR:  Couldn't find PNG files for: " + name);
            reject(new Error("ERROR:  Couldn't find PNG files for: " + name));
        }
    });
}

function main() {
    const promises = [];

    promises.push(uploadAndUpdateDeck('ai_carver_hunter', 5, 2));
    promises.push(uploadAndUpdateDeck('ai_carver_meat_wagon', 5, 2));
    promises.push(uploadAndUpdateDeck('ai_roadie_biker', 5, 2));
    promises.push(uploadAndUpdateDeck('ai_roadie_bus', 5, 2));
    promises.push(uploadAndUpdateDeck('ai_roadie_dune_buggy', 5, 2));
    promises.push(uploadAndUpdateDeck('ai_roadie_wyld_horsemen', 5, 2));
    promises.push(uploadAndUpdateDeck('ai_u_r_of_f_scout', 5, 2));
    promises.push(uploadAndUpdateDeck('initiative', 5, 6));
    promises.push(uploadAndUpdateDeck('item_0_tier', 5, 6));
    promises.push(uploadAndUpdateDeck('item_1_tier', 5, 5));
    promises.push(uploadAndUpdateDeck('item_2_tier', 5, 3));
    promises.push(uploadAndUpdateDeck('item_3_tier', 5, 2));
    promises.push(uploadAndUpdateDeck('item_starter', 5, 2));
    promises.push(uploadAndUpdateDeck('rule', 3, 6));
    promises.push(uploadAndUpdateDeck('scenario_0_tier', 3, 2));
    promises.push(uploadAndUpdateDeck('scenario_1_tier', 3, 2));
    promises.push(uploadAndUpdateDeck('scenario_2_tier', 3, 2));
    promises.push(uploadAndUpdateDeck('scenario_3_tier', 3, 2));

    Promise.all(promises).then(() => {
//        console.log(JSON.stringify(find('DeckCustom', 'ai_carver_hunter'), null, 2));

        // update the save name
        save.SaveName = save.SaveName.replace(/(.* V)([0-9]+)/, (orig, a, b) => {
            return a + (parseInt(b) + 1);
        });
        fs.writeFileSync('var/tts/TS_Save_YYY.json', JSON.stringify(save, null, 2));
    }).catch((errs) => {
        console.error(errs);
    });
}

main();
