const cvs = require("canvas");
const fs = require("fs");
const rnd = require("./randomizer.js");
const Cardistry = require('./cardistry.js');
const {Card, BoundaryRect, GridCard, RotatedTextBox, TextBox, ImageManager} = require("./cardistry");
const {loadImage} = require("canvas");

// setup the randomizer
rnd.seed(Date.now().toString());
// rnd.seed('1673045739034');
console.log('initializing with seed ' + rnd.getSeedString());

// register fonts
cvs.registerFont('lib/rokkitt/static/Rokkitt-Bold.ttf', {family: 'Rokkitt Bold'});
cvs.registerFont('lib/rokkitt/static/Rokkitt-Light.ttf', {family: 'Rokkitt Light'});

// load images
const im = new ImageManager();
im.loadImage('attack', 'assets/noun-fight-1279715.png');
im.loadImage('fire', 'assets/noun-fire-4798412.png');
im.loadImage('shield', 'assets/noun-shield-3000252.png');
im.loadImage('black-die', 'assets/noun-cube-5842799-000000.png');
im.loadImage('green-die', 'assets/noun-cube-5842799-71D358.png');
im.loadImage('blue-die', 'assets/noun-cube-5842799-00449F.png');
im.loadImage('purple-die', 'assets/noun-cube-5842799-C462DD.png');
im.loadImage('gray-die', 'assets/noun-cube-5842799-D3D3D3.png');
im.loadImage('red-die', 'assets/noun-cube-5842799-FF001C.png');
im.loadImage('orange-die', 'assets/noun-cube-5842799-FF824A.png');
im.loadImage('yellow-die', 'assets/noun-cube-5842799-FFD65B.png');

const card_bleed = 0.125;
const card_safe = 0.125;
const card_height = 2.48 + card_bleed * 2;
const card_width = 1.61 + card_bleed * 2;
const card_extra = 0.05;
const text_size = (card_height - 0.6) / 10.5;
const text_margin = text_size * 0.23;
const d6_width = 0.5;
const d6_height = 0.5;

class RoadWarriorItemCard extends Cardistry.Card {
    constructor(dpi, bgColor, title, body, img) {
        super(card_width, card_height, card_bleed, card_safe, card_extra, bgColor, dpi);

        this.img = img;

        // title
        this.addElement(new Cardistry.TextBox(
            this,
            title,
            'Rokkitt Bold',
            '000000',
            text_size,
            0,
            'left',
            'middle',
            this.getDrawableBoundRect().cutBottomPct(0.8),
            this.bgColor));
        this.addElement(new Cardistry.ImageBox(
            this,
            this.getDrawableBoundRect().cutPct(0, 0, 0.2, 0.4),
            'FFFFFF',
            this.img,
            false
        ));
        this.addElement(new Cardistry.TextBox(
            this,
            body,
            'Rokkitt Bold',
            '000000',
            text_size * 0.66,
            0,
            'left',
            'middle',
            this.getDrawableBoundRect().cutTopPct(0.6),
            this.bgColor
        ));
    }
}

// TODO:  Make dark dice icons white...
class RoadWarriorDie extends Cardistry.Sheet {
    constructor(bgColor, faces) {
        let cards = [];
        for(const face of faces) {
            let die = new Cardistry.DieFace(d6_width, d6_height, 0, 0, 0, bgColor, 300, face);
            die.draw();
            cards.push(die);
        }

        super(cards);
    }
}


im.ready(() => {
    let card = new RoadWarriorItemCard(
        300,
        'FFFFFF',
        'Test Card',
        "This is a test card body...",
        im.get('shield')
    );
    card.draw();
    card.exportScaledPNG('test.png', 1, true);

    let yellow_d6 = new RoadWarriorDie('FFD65B', [
        [],
        [im.get('attack')],
        [im.get('attack'), im.get('fire')],
        [im.get('attack'), im.get('attack')],
        [im.get('attack')],
        [im.get('shield')]
    ]);
    yellow_d6.exportPNG('var/d6_yellow.png', 3);

    let blue_d6 = new RoadWarriorDie('00449F', [
        [],
        [im.get('shield'), im.get('shield')],
        [im.get('shield')],
        [im.get('shield')],
        [im.get('shield')],
        [im.get('attack')]
    ]);
    blue_d6.exportPNG('var/d6_blue.png', 3);

    let green_d6 = new RoadWarriorDie('71D358', [
        [],
        [im.get('shield'), im.get('fire')],
        [im.get('shield'), im.get('shield')],
        [im.get('shield'), im.get('shield')],
        [im.get('attack'), im.get('shield')],
        [im.get('shield')],
    ]);
    green_d6.exportPNG('var/d6_green.png', 3);

    let black_d6 = new RoadWarriorDie('000000', [
        [],
        [im.get('shield')],
        [im.get('shield')],
        [im.get('shield'), im.get('attack')],
        [im.get('attack')],
        [im.get('attack')],

    ]);
    black_d6.exportPNG('var/d6_black.png', 3);

    let orange_d6 = new RoadWarriorDie('FF824A', [
        [],
        [im.get('attack')],
        [im.get('attack'), im.get('fire'), im.get('attack')],
        [im.get('attack'), im.get('attack'), im.get('attack')],
        [im.get('attack'), im.get('fire')],
        [im.get('shield')]
    ]);
    orange_d6.exportPNG('var/d6_orange.png', 3);

    let red_d6 = new RoadWarriorDie('FF001C', [
        [im.get('attack')],
        [im.get('attack')],
        [im.get('attack'), im.get('fire'), im.get('attack')],
        [im.get('attack'), im.get('attack'), im.get('attack')],
        [im.get('attack'), im.get('fire'), im.get('shield')],
        [im.get('shield'), im.get('attack')]
    ]);
    red_d6.exportPNG('var/d6_red.png', 3);

    let purple_d6 = new RoadWarriorDie('C462DD', [
        [],
        [im.get('fire')],
        [im.get('attack'), im.get('fire')],
        [im.get('attack'), im.get('attack'), im.get('fire')],
        [im.get('attack'), im.get('fire'), im.get('fire')],
        [im.get('shield')]
    ]);
    purple_d6.exportPNG('var/d6_purple.png', 3);
});
