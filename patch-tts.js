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

function uploadAndUpdateDie(name) {
    return new Promise((resolve, reject) => {
        // sanity check that the files exist
        if(fs.existsSync('var/tts/' + name + '.png')) {
            // sanity check a deck object exists in TTS save
            if(find('Custom_Dice', name).length > 0) {
                const die = find('Custom_Dice', name)[0];
                upload(BUCKET, 'var/tts/' + name + '.png', 'image/png').then((url) => {
                    die.CustomImage.ImageURL = url + '?' + Date.now();
                    resolve();
                }).catch((err) => {
                    reject(err);
                });
            } else {
                console.error("ERROR: Couldn't find die object in TTS save for: " + name);
                reject(new Error("ERROR: Couldn't find die object in TTS save for: " + name));
            }
        } else {
            console.error("ERROR:  Couldn't find PNG files for: " + name);
            reject(new Error("ERROR:  Couldn't find PNG files for: " + name));
        }
    });
}

function uploadAndUpdateToken(name) {
    return new Promise((resolve, reject) => {
        // sanity check that the files exist
        if(fs.existsSync('var/tts/' + name + '.png')) {
            // sanity check a deck object exists in TTS save
            const token = find('Custom_Token', name)[0];
            upload(BUCKET, 'var/tts/' + name + '.png', 'image/png').then((url) => {
                if(find('Custom_Token', name).length > 0) {
                    token.CustomImage.ImageURL = url + '?' + Date.now();
                    resolve();
                } else {
                    // add a new token object to the save
                    console.log("Adding token: " + name);

                    const bag = JSON.parse(fs.readFileSync('assets/token.json'));
                    bag.GUID = '';
                    bag.Transform.posX = bag.Transform.posX + 1;
                    bag.Transform.posZ = bag.Transform.posZ + 1;

                    const token = bag.ContainedObjects[0];
                    token.GUID = '';
                    token.Nickname = name;
                    token.CustomImage.ImageURL = URL + '?' + Date.now();
                    save.ObjectStates.push(bag);
                    resolve();
                }
            }).catch((err) => {
                reject(err);
            });
        } else {
            console.error("ERROR:  Couldn't find PNG files for: " + name);
            reject(new Error("ERROR:  Couldn't find PNG files for: " + name));
        }
    });
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

    promises.push(uploadAndUpdateDie('die_black'));
    promises.push(uploadAndUpdateDie('die_blue'));
    promises.push(uploadAndUpdateDie('die_green'));
    promises.push(uploadAndUpdateDie('die_orange'));
    promises.push(uploadAndUpdateDie('die_purple'));
    promises.push(uploadAndUpdateDie('die_red'));
    promises.push(uploadAndUpdateDie('die_yellow'));

    promises.push(uploadAndUpdateToken('token_boarder'));
    promises.push(uploadAndUpdateToken('token_cooldown'));
    promises.push(uploadAndUpdateToken('token_damage'));
    promises.push(uploadAndUpdateToken('token_delay'));
    promises.push(uploadAndUpdateToken('token_fire'));
    promises.push(uploadAndUpdateToken('token_gas'));
    promises.push(uploadAndUpdateToken('token_grapple'));

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
