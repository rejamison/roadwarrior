const cvs = require("canvas");
const fs = require("fs");
const rnd = require("./randomizer");
const {createCanvas} = require("canvas");

class BoundaryRect {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    rotate90() {
        return new BoundaryRect(this.x + (this.w / 2) - (this.h / 2), this.y + (this.h / 2) - (this.w / 2), this.h, this.w);
    }

    snap() {
        return new BoundaryRect(Math.round(this.x), Math.round(this.y), Math.round(this.w), Math.round(this.h));
    }

    scale(factor) {
        let mx = (this.w - (this.w * factor)) / 2;
        let my = (this.h - (this.h * factor)) / 2;
        return new BoundaryRect(this.x + mx, this.y + my, this.w * factor, this.h * factor);
    }

    nudge(x, y) {
        return new BoundaryRect(this.x + x, this.y + y, this.w - x, this.h - y);
    }

    move(x, y) {
        return new BoundaryRect(this.x + x, this.y + y, this.w, this.h);
    }

    clone() {
        return Object.assign({}, this);
    }

    shrink(margin) {
        return new BoundaryRect(this.x + margin, this.y + margin, this.w - margin * 2, this.h - margin * 2);
    }

    expand(margin) {
        return new BoundaryRect(this.x - margin, this.y - margin, this.w + margin * 2, this.h + margin * 2);
    }

    cutTop(h) {
        return new BoundaryRect(this.x, this.y + h, this.w, this.h - h);
    }

    cutBottom(h) {
        return new BoundaryRect(this.x, this.y, this.w, this.h - h);
    }

    cutLeft(w) {
        return new BoundaryRect(this.x + w, this.y, this.w - w, this.h);
    }

    cutRight(w) {
        return new BoundaryRect(this.x, this.y, this.w - w, this.h);
    }

    cut(l, r, t, b) {
        return new BoundaryRect(this.x + l, this.y + t, this.w - l - r, this.h - t - b);
    }
}
exports.BoundaryRect = BoundaryRect;

class Card {
    constructor(width, height, bleed, safe, extra, bgColor, dpi) {
        this.height = height;
        this.width = width;
        this.bleed = bleed;
        this.safe = safe;
        this.extra = extra;
        this.margin = this.bleed + this.safe + this.extra;
        this.bgColor = bgColor;
        this.dpi = dpi;
        this.elements = [];

        this.hpx = this.getSizeInPx(this.height)
        this.wpx = this.getSizeInPx(this.width);
        this.mpx = this.getSizeInPx(this.margin);
        this.bpx = this.getSizeInPx(this.bleed);
        this.spx = this.getSizeInPx(this.safe);
        this.epx = this.getSizeInPx(this.extra);

        this.canvas = cvs.createCanvas(this.wpx, this.hpx);
        this.ctx = this.canvas.getContext('2d');

        // draw a background
        this.ctx.save();
        this.ctx.fillStyle = '#' + this.bgColor;
        this.ctx.fillRect(0, 0, this.wpx, this.hpx);
        this.ctx.restore();
    }

    addElement(element) {
        this.elements.push(element);
    }

    draw() {
        this.elements.forEach(element => {
            element.draw();
        })
    }
    
    getSizeInPx(size) {
        return Math.round(size * this.dpi);
    }

    getDrawableBoundRect() {
        return new BoundaryRect(this.mpx, this.mpx, this.wpx - this.mpx * 2, this.hpx - this.mpx * 2);
    }

    getFullBoundRect() {
        return new BoundaryRect(0, 0, this.wpx, this.hpx);
    }

    generatePlayableCanvas() {
        const playable = cvs.createCanvas(this.wpx - this.bpx * 2, this.hpx - this.bpx * 2);
        const ctx = playable.getContext('2d');
        ctx.beginPath();
        ctx.roundRect(
            0,
            0,
            playable.width,
            playable.height,
            playable.width / 24
        );
        ctx.clip();
        ctx.drawImage(this.canvas, this.bpx, this.bpx, playable.width, playable.height, 0, 0, playable.width, playable.height);
        return playable;
    }

    exportPNG(file) {
        const out = fs.createWriteStream(file);
        this.canvas.createPNGStream().pipe(out);
        out.on('finish', () => { console.log('exported card PNG: ' + file) });
    }

    exportScaledPNG(file, pct, excludePrintableArea) {
        let sx = 0;
        let sy = 0;
        let sw = this.wpx;
        let sh = this.hpx;
        let dx = 0;
        let dy = 0;
        let dw = Math.round(sw * pct);
        let dh = Math.round(sh * pct);

        if(excludePrintableArea) {
            sx += this.bpx;
            sy += this.bpx;
            sw -= this.bpx * 2;
            sh -= this.bpx * 2;
        }

        const scaled = cvs.createCanvas(dw, dh);
        const scaledCtx = scaled.getContext('2d');
        scaledCtx.drawImage(this.canvas, sx, sy, sw, sh, dx, dy, dw, dh);

        const out = fs.createWriteStream(file);
        scaled.createPNGStream().pipe(out);
        out.on('finish', () => { console.log('exported scaled card PNG: ' + file) });
    }
}
exports.Card = Card;

class CardElement {
    constructor(parent, boundRect) {
        this.parent = parent;

        if(!boundRect) {
            boundRect = parent.getDrawableBoundRect();
        }

        this.boundRect = boundRect;
    }

    draw() { }
}
exports.CardElement = CardElement;

class Box extends CardElement {
    constructor(parent, boundRect, color) {
        super(parent, boundRect);

        this.color = color;
        this.ctx = this.parent.ctx;
    }

    draw() {
        this.ctx.save();

        this.ctx.fillStyle = '#' + this.color;
        this.ctx.fillRect(this.boundRect.x, this.boundRect.y, this.boundRect.w, this.boundRect.h);

        this.ctx.restore();
    }
}
exports.Box = Box;

class ImageBox extends Box {
    constructor(parent, boundRect, bgColor, image, stretch) {
        super(parent, boundRect, bgColor);

        this.image = image;
        this.stretch = stretch;
    }

    draw() {
        this.ctx.save();

        this.ctx.fillStyle = '#' + this.color;
        this.ctx.fillRect(this.boundRect.x, this.boundRect.y, this.boundRect.w, this.boundRect.h);
        if(this.stretch) {
            this.ctx.drawImage(this.image, this.boundRect.x, this.boundRect.y, this.boundRect.w, this.boundRect.h);
        } else {
            let factor = this.boundRect.w / this.image.width;  // start with width
            if(this.image.height * factor > this.boundRect.h) {  // check if the height fits with this scale factor
                factor = this.boundRect.h / this.image.height;  // if not, use the height scale factor instead
            }
            let w = this.image.width * factor;
            let h = this.image.height * factor;
            let x = this.boundRect.x + ((this.boundRect.w - w) / 2);
            let y = this.boundRect.y + ((this.boundRect.h - h) / 2);

            this.ctx.drawImage(this.image, x, y, w, h);
        }

        this.ctx.restore();
    }
}
exports.ImageBox = ImageBox;

class TextBox extends CardElement {
    constructor(parent, text, font, color, size, margin, align, baseline, boundRect, bgColor) {
        super(parent, boundRect);

        this.text = text;
        this.font = font;
        this.color = color;
        this.size = size;
        this.margin = margin;
        this.sizePx = parent.getSizeInPx(this.size);
        this.marginPx = parent.getSizeInPx(this.margin);
        this.align = align;
        this.baseline = baseline;
        this.ctx = parent.ctx;
        this.bgColor = bgColor;

        this.ctx.save();

        this.ctx.font = this.sizePx + 'px ' + this.font;
        this.ctx.fillStyle = '#' + this.color;
        this.ctx.textAlign = 'left';  // over-ridding so we can manage internally
        this.ctx.textBaseline = 'alphabetic';  // over-ridding so we can manage internally
        this.fontHeight = this.ctx.measureText('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz').actualBoundingBoxAscent;
        this.spaceSize = this.ctx.measureText(' ').width * 0.6;

        // generate chunks of text
        this.blocks = this.text.split('\n');
        this.lineSpacePx = this.fontHeight * 0.9;
        this.lines = [];
        let idx = 0;
        this.blocks.forEach(block => {
            this.lines.push({
                chunks: [],
                width: 0
            });

            this.chunks = [];
            this.words = block.split(' ');
            this.words.forEach(word => {
                const m = this.ctx.measureText(word);
                let chunk = {
                    word: word,
                    width: m.width,
                    height: m.actualBoundingBoxAscent
                };
                this.chunks.push(chunk);
            });
            this.chunks.forEach(chunk => {
                if(this.lines[idx].chunks.length == 0) {
                    this.lines[idx].chunks.push(chunk);
                    this.lines[idx].width += chunk.width;
                } else {
                    if(this.lines[idx].width + chunk.width + this.spaceSize > this.boundRect.w) {
                        this.lines.push({
                            chunks: [],
                            width: 0
                        });
                        idx++;
                    } else {
                        this.lines[idx].width += this.spaceSize;
                    }

                    this.lines[idx].chunks.push(chunk);
                    this.lines[idx].width += chunk.width;
                }
            });

            idx++;
        });

        this.wpx = this.lines.reduce((longest, current) => longest.width > current.width ? longest : current).width;
        this.wpx += this.marginPx * 2;
        this.hpx = (this.lines.length * this.fontHeight) + ((this.lines.length - 1) * this.lineSpacePx);
        this.hpx += this.marginPx * 2;

        this.ctx.restore();
    }

    draw() {
        if(this.bgColor) {
            this.ctx.save();
            this.ctx.fillStyle = '#' + this.bgColor;
            const b = this.getTextBoundRect();
            this.ctx.fillRect(b.x, b.y, b.w, b.h);
            this.ctx.restore();
        }
        this.drawWithHighlightedWords([], this.color);
    }

    drawWithHighlightedWords(fillerWords, highlightColor) {
        this.ctx.save();

        this.ctx.font = this.sizePx + 'px ' + this.font;
        this.ctx.fillStyle = '#' + this.color;
        this.ctx.textAlign = 'left';  // over-ridding so we can manage internally
        this.ctx.textBaseline = 'alphabetic';  // over-ridding so we can manage internally

        // draw the text
        this.ctx.fillStyle = '#' + this.color;
        let x, y;
        if(this.baseline === 'middle') {
            y = this.boundRect.y + (this.boundRect.h / 2) - (this.hpx / 2) + this.marginPx;
        } else if(this.baseline === 'top') {
            y = this.boundRect.y + this.marginPx;
        } else if(this.baseline === 'bottom') {
            y = this.boundRect.y + this.boundRect.h - this.hpx + this.marginPx;
        } else {
            console.log("WARNING: UNRECOGNIZED BASELINE VALUE: " + this.baseline);
            y = this.boundRect.y + this.marginPx;
        }
        this.lines.forEach(line => {
            if(this.align === 'left') {
                x = this.boundRect.x + this.marginPx;
            } else if(this.align === 'right') {
                x = this.boundRect.x + this.boundRect.w - this.marginPx - line.width;
            } else if(this.align === 'center') {
                x = this.boundRect.x + (this.boundRect.w / 2) - (line.width / 2);
            } else {
                console.log("WARNING: UNRECOGNIZED ALIGN VALUE: " + this.align);
                x = this.boundRect.x + this.marginPx;
            }
            line.chunks.forEach(chunk => {
                if(fillerWords.includes(chunk.word.toLowerCase())) {
                    this.ctx.fillStyle = '#' + highlightColor;
                } else {
                    this.ctx.fillStyle = '#' + this.color;
                }
                this.ctx.fillText(chunk.word, x, y + this.fontHeight);

                x += chunk.width + this.spaceSize;
            });
            y += this.fontHeight + this.lineSpacePx;
        });

        this.ctx.restore();
    }

    getTextBoundRect() {
        let x, y;
        if(this.align === 'center') {
            x = this.boundRect.x + this.boundRect.w / 2 - this.wpx / 2;
        } else if(this.align === 'right') {
            x = this.boundRect.x + this.boundRect.w - this.wpx;
        } else {
            x = this.boundRect.x;
        }
        if(this.baseline === 'middle') {
            y = this.boundRect.y + this.boundRect.h / 2 - this.hpx / 2;
        } else if(this.baseline === 'top' || this.baseline === 'hanging') {
            y = this.boundRect.y;
        } else {
            y = this.boundRect.y + this.boundRect.h - this.hpx;
        }

        return new BoundaryRect(x, y, this.wpx, this.hpx);
    }
}
exports.TextBox = TextBox;

class RotatedTextBox extends TextBox {
    constructor(parent, text, font, color, size, margin, align, baseline, boundRect, bgColor, rotation) {
        super(parent, text, font, color, size, margin, align, baseline, boundRect, bgColor);

        this.rotation = rotation;
    }

    draw() {
        this.ctx.save();

        let ox = this.boundRect.x + this.boundRect.w / 2;
        let oy = this.boundRect.y + this.boundRect.h / 2;
        this.ctx.translate(ox, oy);
        this.ctx.rotate(this.rotation);
        this.ctx.translate(-ox, -oy);

        super.draw();

        this.ctx.restore();
    }
}
exports.RotatedTextBox = RotatedTextBox;

class HighlightedTextBox extends TextBox {
    constructor(parent, text, font, color, size, margin, align, baseline, fillerWords, highlightColor, boundRect) {
        super(parent, text, font, color, size, margin, align, baseline, boundRect);

        this.fillerWords = fillerWords;
        this.highlightColor = highlightColor;
    }

    draw() {
        this.drawWithHighlightedWords(this.fillerWords, this.highlightColor);
    }
}
exports.HighlightedTextBox = HighlightedTextBox;

class GridCard extends Card {
    constructor(width, height, bleed, safe, extra, bgColor, dpi, cellSize, cellMargin, cellPalette) {
        super(width, height, bleed, safe, extra, bgColor, dpi);

        this.cellSize = cellSize;
        this.cellMargin = cellMargin;
        this.cellPalette = cellPalette;

        this.cspx = this.getSizeInPx(this.cellSize);
        this.cmpx = this.getSizeInPx(this.cellMargin);
        this.cwpx = this.cspx + this.cmpx;

        // calculate the grid sizes
        this.dwpx = this.wpx - this.mpx * 2;
        this.dhpx = this.hpx - this.mpx * 2;
        this.gwpx = this.dwpx - (this.dwpx % this.cwpx);
        this.gwpx = (this.dwpx - this.gwpx - this.cspx) > this.cspx ? this.gwpx + this.cspx : this.gwpx - this.cmpx;  // check if there's enough room to sneak in another pip
        this.ghpx = this.dhpx - (this.dhpx % this.cwpx);
        this.ghpx = (this.dhpx - this.ghpx - this.cmpx) > this.cspx ? this.ghpx + this.cspx : this.ghpx - this.cmpx;  // check if there's enough room to sneak in another pip
        this.cheatX = Math.round((this.dwpx - this.gwpx) / 2);
        this.cheatY = Math.round((this.dhpx - this.ghpx) / 2);

        // draw a random grid of pips
        this.drawRandomBGGrid();
    }

    drawRandomBGGrid() {
        this.ctx.save();

        for(let x = this.cheatX + this.mpx; x < this.mpx + this.dwpx - this.cspx; x += this.cwpx) {
            for(let y = this.cheatY + this.mpx; y < this.mpx + this.dhpx - this.cspx; y += this.cwpx) {
                if(rnd.random() < 0.4) {
                    let roll = rnd.random();
                    if(roll < 0.79) {
                        this.ctx.fillStyle = '#' + this.cellPalette[0];
                    } else if(roll < 0.91) {
                        this.ctx.fillStyle = '#' + this.cellPalette[1];
                    } else if(roll < 0.97) {
                        this.ctx.fillStyle = '#' + this.cellPalette[2];
                    } else {
                        this.ctx.fillStyle = '#' + this.cellPalette[3];
                    }

                    // pip
                    this.ctx.beginPath();
                    this.ctx.arc(x + this.cspx / 2, y + this.cspx / 2, this.cspx / 2, 0, Math.PI * 2, false);
                    this.ctx.closePath();
                    this.ctx.fill();
                }
            }
        }

        this.ctx.restore();
    }

    deletePips(bounds) {
        this.ctx.save();

        // clone the boundary so we can manipulate a local version
        const b = bounds.clone();
        b.x = Math.round(b.x);
        b.y = Math.round(b.y);
        b.w = Math.round(b.w);
        b.h = Math.round(b.h);

        // find a position and height/width that completely cover dots
        let lSpill = (b.x - this.mpx - this.cheatX) % this.cwpx;
        b.x -= lSpill;
        b.w += lSpill;
        let rSpill = ((b.w) % this.cwpx);
        b.w += rSpill == 0 ? 0 : this.cwpx - rSpill;
        let tSpill = (b.y - this.mpx - this.cheatY) % this.cwpx;
        b.y -= tSpill;
        b.h += tSpill;
        let bSpill = ((b.h) % this.cwpx);
        b.h += bSpill == 0 ? 0 : this.cwpx - bSpill;

        // draw the box
        this.ctx.fillStyle = '#' + this.bgColor;

        // just a rectangle
        // ctx.fillRect(offset_x + b.x, offset_y + b.y, b.w - 1, b.h - 1); // -1 to account for aliasing

        // cut corners for a more rounded effect
        this.ctx.fillRect(b.x + this.cwpx, b.y, b.w - this.cwpx * 2 - 1, b.h - 1); // -1 to account for aliasing
        this.ctx.fillRect(b.x, b.y + this.cwpx, b.w - 1, b.h - this.cwpx * 2 - 1); // -1 to account for aliasing

        // draw the calculated background for debug
        // this.ctx.strokeStyle = 'green';
        // this.ctx.strokeRect(b.x, b.y, b.w, b.h);
        // this.ctx.strokeStyle = 'blue';
        // this.ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);

        this.ctx.restore();
    }
}
exports.GridCard = GridCard;

class Sheet {
    constructor(cards) {
        this.cards = cards;
    }

    exportPNG(file, columns) {
        if(this.cards && this.cards.length > 0) {
            const rows = Math.ceil(this.cards.length / columns);
            const cardWpx = this.cards[0].wpx;
            const cardHpx = this.cards[0].hpx;

            const sheetCanvas = cvs.createCanvas(cardWpx * columns, cardHpx * rows);
            const ctx = sheetCanvas.getContext('2d');

            let i = 0;
            this.cards.forEach(card => {
                const c = (i % columns);
                const r = Math.floor(i / columns);

                ctx.drawImage(card.canvas, c * cardWpx, r * cardHpx);
                i++;
            });

            const out = fs.createWriteStream(file);
            sheetCanvas.createPNGStream().pipe(out);
            out.on('finish', () => { console.log('exported sheet PNG: ' + file) });
        }
    }

    exportScaledPNG(file, columns, pct, excludePrintableArea, includeHashMarks) {
        if(this.cards && this.cards.length > 0) {
            const rows = Math.ceil(this.cards.length / columns);
            const cardWpx = this.cards[0].wpx;
            const cardHpx = this.cards[0].hpx;
            const bleedPx = this.cards[0].bpx;
            let sx = 0;
            let sy = 0;
            let sw = this.cards[0].wpx;
            let sh = this.cards[0].hpx;
            let dx = 0;
            let dy = 0;
            let dw = Math.round(cardWpx * pct);
            let dh = Math.round(cardHpx * pct);

            if(excludePrintableArea) {
                sx += bleedPx;
                sy += bleedPx;
                sw -= bleedPx * 2;
                sh -= bleedPx * 2;
            }

            const sheetCanvas = cvs.createCanvas(dw * columns, dh * rows);
            const ctx = sheetCanvas.getContext('2d');

            let i = 0;
            this.cards.forEach(card => {
                const c = (i % columns);
                const r = Math.floor(i / columns);

                ctx.drawImage(card.canvas, sx, sy, sw, sh, c * dw, r * dh, dw, dh);

                if(includeHashMarks) {
                    ctx.strokeStyle = "#888888";
                    ctx.strokeRect(c * dw, r * dh, dw, dh);
                }

                i++;
            });

            if(includeHashMarks) {
                let margin = 75;
                const printableCanvas = cvs.createCanvas(dw * columns + margin + margin, dh * rows + margin + margin);
                const pctx = printableCanvas.getContext('2d');
                pctx.strokeStyle = "#888888";
                for(let x = 0; x < columns + 1; x++) {
                    pctx.strokeRect(x * dw + margin - 1, 0, 2, printableCanvas.height);
                }
                for(let y = 0; y < rows + 1; y++) {
                    pctx.strokeRect(0, y * dh + margin - 1, printableCanvas.width, 2);
                }

                pctx.drawImage(sheetCanvas, margin, margin);

                const out = fs.createWriteStream(file);
                printableCanvas.createPNGStream().pipe(out);
                out.on('finish', () => { console.log('exported sheet PNG: ' + file) });
            } else {
                const out = fs.createWriteStream(file);
                sheetCanvas.createPNGStream().pipe(out);
                out.on('finish', () => { console.log('exported sheet PNG: ' + file) });
            }
        }
    }
}
exports.Sheet = Sheet;

class Showcase extends Sheet {
    constructor(cards, widthPx, marginPx, bgColor) {
        super(cards);
        this.bgColor = bgColor;
        this.widthPx = widthPx;
        this.marginPx = marginPx;

        // figure out the scale needed to fit all the cards
        const card_wpx = this.cards[0].wpx - this.cards[0].bpx * 2;
        const card_hpx = this.cards[0].hpx - this.cards[0].bpx * 2;
        const px_for_card = widthPx - (marginPx * 2) - ((cards.length - 1) * marginPx);
        this.scaleFactor = (px_for_card / cards.length) / card_wpx;

        this.heightPx = (card_hpx * this.scaleFactor) + (this.marginPx * 2);
    }

    exportPNG(file) {
        const canvas = cvs.createCanvas(this.widthPx, this.heightPx);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#' + this.bgColor;
        ctx.fillRect(0, 0, this.widthPx, this.heightPx);

        let i = 0;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.shadowColor = '#444444';
        ctx.shadowBlur = 10;
        this.cards.forEach(card => {
            const playable = card.generatePlayableCanvas();
            // add a bit of jiggle to make them feel more natural
            ctx.save();
            ctx.translate(this.marginPx + (playable.width * this.scaleFactor + this.marginPx) * i + playable.width / 2, this.marginPx + playable.height / 2);
            ctx.rotate(rnd.random() * (Math.PI / 256 - Math.PI / 128));

            ctx.drawImage(playable,
                0, 0, playable.width, playable.height,
                -playable.width / 2, -playable.height / 2, playable.width * this.scaleFactor, playable.height * this.scaleFactor);
            i++;

            ctx.restore();
        });

        // write the file
        const out = fs.createWriteStream(file);
        canvas.createPNGStream().pipe(out);
        out.on('finish', () => { console.log('exported showcase PNG: ' + file) });
    }
}
exports.Showcase = Showcase;
