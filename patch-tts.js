const fs = require('fs');

const save_file = process.argv[2];

const save = JSON.parse(fs.readFileSync(save_file));

const ai_carver_biker = find('DeckCustom', 'ai_carver_biker')[0];
ai_carver_biker.CustomDeck[Object.keys(ai_carver_biker.CustomDeck)[0]].FaceURL = 'TESTING';

console.log(JSON.stringify(find('DeckCustom', 'ai_carver_biker'), null, 2));

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
