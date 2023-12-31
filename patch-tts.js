const fs = require('fs');
const { upload } = require('./autil');

const save_file = process.argv[2];

const BUCKET = 'road-warrior';

const save = JSON.parse(fs.readFileSync(save_file));
const stats = JSON.parse(fs.readFileSync('var/stats.json'));
let offset = 0;
const NEW_ITEM_OFFSET = 5;

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

function getLua(path) {
    return fs.readFileSync(path).toString();
}

function uploadStats() {
    return new Promise((resolve, reject) => {
        // sanity check that the files exist
        if(fs.existsSync('var/stats.json')) {
            upload(BUCKET, 'var/stats.json', 'application/json').then((url) => {
                resolve();
            }).catch((err) => {
                reject(err);
            });
        } else {
            console.error("ERROR:  Couldn't find stats JSON file.");
            reject(new Error("ERROR:  Couldn't find stats JSON file."));
        }
    });
}

function uploadAndUpdateDie(name) {
    return new Promise((resolve, reject) => {
        // sanity check that the files exist
        if(fs.existsSync('var/tts/' + name + '.png')) {
            // sanity check a deck object exists in TTS save
            upload(BUCKET, 'var/tts/' + name + '.png', 'image/png').then((url) => {
                if(find('Custom_Dice', name).length > 0) {
                    const die = find('Custom_Dice', name)[0];
                    die.CustomImage.ImageURL = url + '?' + Date.now();
                } else {
                    // add a new token object to the save
                    console.log("Adding die: " + name);

                    const bag = JSON.parse(fs.readFileSync('assets/die.json'));
                    bag.GUID = '';
                    bag.Nickname = 'bag_' + name;
                    bag.Transform.posX = offset;
                    offset += NEW_ITEM_OFFSET;
                    bag.Transform.posZ = 0;

                    const die = bag.ContainedObjects[0];
                    die.GUID = '';
                    die.Nickname = name;
                    die.CustomImage.ImageURL = url + '?' + Date.now();
                    save.ObjectStates.push(bag);
                }

                resolve();
            }).catch((err) => {
                reject(err);
            });
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
                    bag.Transform.posX = offset;
                    offset += NEW_ITEM_OFFSET;
                    bag.Transform.posZ = 0;

                    const token = bag.ContainedObjects[0];
                    token.GUID = '';
                    token.Nickname = name;
                    token.CustomImage.ImageURL = url + '?' + Date.now();
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

function uploadAndUpdatePlayerMat() {
    return new Promise((resolve, reject) => {
        // sanity check that the files exist
        if(fs.existsSync('assets/playermat.png')) {
            // sanity check a deck object exists in TTS save
            const token = find('Custom_Tile', 'playermat')[0];
            upload(BUCKET, 'assets/playermat.png', 'image/png').then((url) => {
                if(find('Custom_Tile', 'playermat').length > 0) {
                    token.CustomImage.ImageURL = url + '?' + Date.now();
                    resolve();
                } else {
                    console.error("ERROR:  Couldn't find playermat TTS object");
                    reject(new Error("ERROR:  Couldn't find playermat TTS object"));
                }
            }).catch((err) => {
                reject(err);
            });
        } else {
            console.error("ERROR:  Couldn't find PNG files for player aids.");
            reject(new Error("ERROR:  Couldn't find PNG files for player aids."));
        }
    });
}

function uploadAndUpdateRoundTracker() {
    return new Promise((resolve, reject) => {
        // sanity check that the files exist
        if(fs.existsSync('assets/roundtracker.png')) {
            // sanity check a deck object exists in TTS save
            const token = find('Custom_Tile', 'roundtracker')[0];
            upload(BUCKET, 'assets/roundtracker.png', 'image/png').then((url) => {
                if(find('Custom_Tile', 'roundtracker').length > 0) {
                    token.CustomImage.ImageURL = url + '?' + Date.now();
                    resolve();
                } else {
                    console.error("ERROR:  Couldn't find playermat TTS object");
                    reject(new Error("ERROR:  Couldn't find playermat TTS object"));
                }
            }).catch((err) => {
                reject(err);
            });
        } else {
            console.error("ERROR:  Couldn't find PNG files for player aids.");
            reject(new Error("ERROR:  Couldn't find PNG files for player aids."));
        }
    });
}

function uploadAndUpdateDeck(type, name, width, cin, din) {
    return new Promise((resolve, reject) => {
        let count = cin > 1 ? cin : 2;  // because TTS has to have at least 2 cards in a deck
        let height = Math.ceil(count / width);  // because TTS has to have at least 2 rows in a deck front image
        if(height === 1) height = 2;
        // sanity check that the files exist
        if(fs.existsSync('var/tts/' + name + '_back.png') && fs.existsSync('var/tts/' + name + '_fronts.png')) {
            // sanity check a deck object exists in TTS save
            let deck = null;
            let deckId = 0;
            if(find('DeckCustom', name).length > 0) {
                deck = find('DeckCustom', name)[0];
                deckId = Object.keys(deck.CustomDeck)[0];
            } else {
                // add a deck object
                deck = JSON.parse(fs.readFileSync('assets/deck.json'));
                deck.GUID = '';
                deck.Nickname = name;
                deck.Transform.posX = offset;
                offset += NEW_ITEM_OFFSET;
                deck.Transform.posZ = 0;

                // find an unused custom deck ID
                const customDeck = deck.CustomDeck["REPLACE_ME"];
                delete deck.CustomDeck["REPLACE_ME"];
                const maxDeckId = save.ObjectStates.reduce((acc, val) => {
                    if(val.CustomDeck && Object.keys(val.CustomDeck)[0]) {
                        return parseInt(Object.keys(val.CustomDeck)[0]) > acc ? parseInt(Object.keys(val.CustomDeck)[0]) : acc;
                    } else {
                        return acc;
                    }
                }, 0);
                deckId = maxDeckId + 1;
                deck.CustomDeck['' + deckId] = customDeck;
                save.ObjectStates.push(deck);

                console.log("Adding deck: " + name);
            }

            upload(BUCKET, 'var/tts/' + name + '_back.png', 'image/png').then((url) => {
                deck.CustomDeck[deckId].BackURL = url + '?' + Date.now();

                upload(BUCKET, 'var/tts/' + name + '_fronts.png', 'image/png').then((url) => {
                    // check if there are the right number of cards in the existing deck
                    if(deck.DeckIDs.length < count) {
                        console.log("Adding cards to: " + name);

                        while(deck.DeckIDs.length < count) {
                            let nextId = deck.DeckIDs.reduce((acc, val) => acc > val ? acc : val, deckId * 100 - 1) + 1;
                            let card = JSON.parse(fs.readFileSync('assets/card.json'));
                            deck.DeckIDs.push(nextId);
                            card.CardID = nextId;
                            card.GUID = '';
                            card.Nickname = '';  // TODO: Add card names?
                            deck.ContainedObjects.push(card);
                        }
                    } else if(deck.DeckIDs.length > count) {
                        console.log("Removing cards from: " + name);
                        while(deck.DeckIDs.length > count) {
                            const rem = deck.DeckIDs.pop();
                            deck.ContainedObjects = deck.ContainedObjects.filter((val) => val.CardID !== rem);
                        }
                    }

                    deck["HideWhenFaceDown"] = false;
                    deck["Tags"] = [name];

                    // ensure that all the cards...
                    let cards = din;
                    deck.ContainedObjects.forEach((card) => {
                        // have a nickname
                        let c = cards.shift();
                        card["Nickname"] = c["Tag"];

                        // have a matching deck object
                        card["CustomDeck"] = deck["CustomDeck"];

                        // have HideWhenFaceDown = false
                        card["HideWhenFaceDown"] = false;

                        // has its deck name as a tag
                        card["Tags"] = [type, name];

                        // don't have any objects inside them
                        delete card["ContainedObjects"];
                    });

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
            console.error("ERROR:  Couldn't find PNG files for: " + name);
            reject(new Error("ERROR:  Couldn't find PNG files for: " + name));
        }
    });
}

/**
 *
 * @param {string} str
 * @returns {string}
 */
function convertToFilename(str) {
    return str.toLowerCase().replace(/[ .-]+/g, '_');
}


function main() {
    const promises = [];

    for(let aiKey in stats.ais) {
        let count = Object.values(stats.ais[aiKey]).reduce((acc, val) => acc + parseInt(val.Qty), 0);
        let deck = Object.values(stats.ais[aiKey]).reduce((acc, val) => {
            for(let i = 0; i < val.Qty; i++) {
                acc.push(val);
            }
            return acc;
        }, []);
        promises.push(uploadAndUpdateDeck('ai', 'ai_' + convertToFilename(aiKey), 5, count, deck));
    }

    promises.push(uploadAndUpdateDeck('initiative', 'initiative', 5, Object.keys(stats.vehicles).length, Object.values(stats.vehicles)));

    for(let itemKey in stats.items) {
        let count = Object.values(stats.items[itemKey]).reduce((acc, val) => acc + parseInt(val.Qty), 0);
        let deck = Object.values(stats.items[itemKey]).reduce((acc, val) => {
            for(let i = 0; i < val.Qty; i++) {
                acc.push(val);
            }
            return acc;
        }, []);
        promises.push(uploadAndUpdateDeck('item', 'item_' + convertToFilename(itemKey), 5, count, deck));
    }

    promises.push(uploadAndUpdateDeck('rule', 'rule', 3, Object.keys(stats.rules).length, Object.values(stats.rules)));

    for(let scenarioKey in stats.scenarios) {
        promises.push(uploadAndUpdateDeck('scenario', 'scenario_' + convertToFilename(scenarioKey), 3, Object.keys(stats.scenarios[scenarioKey]).length, Object.values(stats.scenarios[scenarioKey])));
    }

    for(let dieKey in stats.dice) {
        promises.push(uploadAndUpdateDie(dieKey));
    }

    for(let tokenKey in stats.tokens) {
        promises.push(uploadAndUpdateToken(tokenKey));
    }

    promises.push(uploadAndUpdatePlayerMat());
    promises.push(uploadAndUpdateRoundTracker());
    promises.push(uploadStats());

    Promise.all(promises).then(() => {
        // update the save name
        save.SaveName = save.SaveName.replace(/(.* V)([0-9]+)/, (orig, a, b) => {
            return a + (parseInt(b) + 1);
        });

        save.LuaScript = getLua('scripts/main.lua');
        save.XmlUI = getLua('scripts/main.xml');

        // let uniqueModels = [
        //     "model_semi", "model_tank", "model_jeep", "model_bus", "model_buggy", "model_atv", "model_bike", "model_cadillac", "model_half_bus", "model_horse", "model_roadster", "model_van"
        // ];
        // uniqueModels.forEach((modelTag) => {
        //     let model = find("Custom_Model", modelTag)[0];
        //     model.LuaScript = getLua('scripts/model.lua');
        //     model.XmlUI = getLua('scripts/model.xml');
        // });

        fs.writeFileSync('var/tts/TS_Save_YYY.json', JSON.stringify(save, null, 2));
    }).catch((errs) => {
        console.error(errs);
    });
}

main();
