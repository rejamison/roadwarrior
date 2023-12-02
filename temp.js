const fs = require('fs');

const stats = JSON.parse(fs.readFileSync('var/stats.json'));

Object.values(stats.scenarios).forEach(sd => {
    Object.values(sd).forEach(s => {
        let line = '"' + s['Tag'] + '","' + s['Player Pos']['x'] + ',' + s['Player Pos']['y'] + '","';
        s['Model Tags'].forEach(m => {
            line += m.tag + '(' + m.x + ',' + m.y + '),\n'
        })
        line = line.substring(0, line.length - 2);
        line += '"';
        console.log(line);
    })
});