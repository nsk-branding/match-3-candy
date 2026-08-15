// === SISTEMA DE MAPA Y NIVELES ===
const TOTAL_NIVELES = 12;
let nivelMaximo = parseInt(localStorage.getItem('candy_nivel_maximo')) || 1;
let nivelActual = 1;
let gameInstance = null;

function getConfigNivel(num) {
    return {
        movimientos: 25,
        objetivoScore: num * 1000
    };
}

function renderizarMapa() {
    const mapContainer = document.getElementById('map');
    const statusText = document.getElementById('status-text');
    mapContainer.innerHTML = '';

    statusText.innerText = `Nivel actual: ${nivelMaximo}`;

    for (let i = 1; i <= TOTAL_NIVELES; i++) {
        const row = document.createElement('div');
        row.className = 'level-row';

        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.innerText = i;

        if (i < nivelMaximo) {
            btn.classList.add('completed');
            btn.onclick = () => iniciarNivel(i);
        } else if (i === nivelMaximo) {
            btn.classList.add('current');
            btn.onclick = () => iniciarNivel(i);
        } else {
            btn.classList.add('locked');
            btn.innerHTML = '<i class="fa-solid fa-lock"></i>';
            btn.onclick = () => {};
        }

        row.appendChild(btn);
        mapContainer.appendChild(row);
    }
}

function iniciarNivel(num) {
    nivelActual = num;
    document.getElementById('map-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    
    document.getElementById('level-title').innerText = `Nivel ${nivelActual}`;
    const config = getConfigNivel(nivelActual);
    document.getElementById('target-text').innerText = `Meta: ${config.objetivoScore} pts`;

    if (!gameInstance) {
        gameInstance = new Phaser.Game(phaserConfig);
    } else {
        gameInstance.scene.stop('Match3Scene');
        gameInstance.scene.start('Match3Scene');
    }
}

function volverAlMapa() {
    document.getElementById('result-modal').classList.remove('active');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('map-screen').classList.add('active');
    
    if (gameInstance) {
        gameInstance.scene.stop('Match3Scene');
    }
    
    renderizarMapa();
}

function reiniciarProgreso() {
    if (confirm('¿Quieres volver al Nivel 1?')) {
        localStorage.removeItem('candy_nivel_maximo');
        nivelMaximo = 1;
        renderizarMapa();
    }
}

document.getElementById('back-to-map-btn').onclick = volverAlMapa;

// === SONIDOS ===
class SoundFX {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    playPop() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.08);
    }

    playBlast() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.15);
    }

    playWin() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(f, this.ctx.currentTime + i * 0.12);
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.12 + 0.25);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + i * 0.12);
            osc.stop(this.ctx.currentTime + i * 0.12 + 0.25);
        });
    }
}
const sfx = new SoundFX();

// === LÓGICA DE JUEGO PHASER 3 ===
const GRID_SIZE = 8;
const TILE_SIZE = 70;
const BOARD_OFFSET_X = 40;
const BOARD_OFFSET_Y = 40;
const NUM_COLORS = 5;
const CANDY_COLORS = [0xff2a75, 0x00f0ff, 0x00ff88, 0xffd700, 0x9d4edd];

class Match3Scene extends Phaser.Scene {
    constructor() { super('Match3Scene'); }

    preload() { this.generateTextures(); }

    generateTextures() {
        CANDY_COLORS.forEach((color, idx) => {
            let g = this.make.graphics({x: 0, y: 0, add: false});
            g.fillStyle(color, 1); g.fillRoundedRect(4, 4, 56, 56, 18);
            g.fillStyle(0xffffff, 0.4); g.fillCircle(20, 20, 10);
            g.generateTexture(`candy_${idx}`, 64, 64); g.destroy();

            g = this.make.graphics({x: 0, y: 0, add: false});
            g.fillStyle(color, 1); g.fillRoundedRect(4, 4, 56, 56, 18);
            g.fillStyle(0xffffff, 0.9); g.fillRect(8, 20, 48, 8); g.fillRect(8, 36, 48, 8);
            g.generateTexture(`striped_h_${idx}`, 64, 64); g.destroy();

            g = this.make.graphics({x: 0, y: 0, add: false});
            g.fillStyle(color, 1); g.fillRoundedRect(4, 4, 56, 56, 18);
            g.fillStyle(0xffffff, 0.9); g.fillRect(20, 8, 8, 48); g.fillRect(36, 8, 8, 48);
            g.generateTexture(`striped_v_${idx}`, 64, 64); g.destroy();
        });

        let g = this.make.graphics({x: 0, y: 0, add: false});
        g.fillStyle(0x3d2314, 1); g.fillCircle(32, 32, 28);
        const sprinkles = [0xff0055, 0x00ccff, 0x33ff55, 0xffdd00, 0xff55ff];
        sprinkles.forEach((sc, i) => {
            let angle = (i / sprinkles.length) * Math.PI * 2;
            g.fillStyle(sc, 1); g.fillCircle(32 + Math.cos(angle)*16, 32 + Math.sin(angle)*16, 6);
        });
        g.generateTexture('color_bomb', 64, 64); g.destroy();

        g = this.make.graphics({x: 0, y: 0, add: false});
        g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 8);
        g.generateTexture('sparkle', 16, 16); g.destroy();
    }

    create() {
        const configNivel = getConfigNivel(nivelActual);
        this.score = 0;
        this.moves = configNivel.movimientos;
        this.targetScore = configNivel.objetivoScore;
        this.canMove = true;
        this.gameOver = false;
        this.selectedCandy = null;
        this.board = [];

        this.updateUI();
        this.drawBoardBackground();
        this.createEmitter();
        this.initBoard();

        this.input.on('gameobjectdown', this.onCandyClick, this);
    }

    drawBoardBackground() {
        const bg = this.add.graphics();
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const x = BOARD_OFFSET_X + c * TILE_SIZE;
                const y = BOARD_OFFSET_Y + r * TILE_SIZE;
                bg.fillStyle((r + c) % 2 === 0 ? 0x221545 : 0x180d35, 0.85);
                bg.fillRoundedRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 14);
            }
        }
    }

    createEmitter() {
        this.emitter = this.add.particles(0, 0, 'sparkle', {
            speed: { min: 80, max: 200 }, scale: { start: 1, end: 0 },
            blendMode: 'ADD', lifespan: 400, emitting: false
        });
    }

    initBoard() {
        for (let r = 0; r < GRID_SIZE; r++) {
            this.board[r] = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                let color;
                do { color = Phaser.Math.Between(0, NUM_COLORS - 1); } 
                while (
                    (c >= 2 && this.board[r][c-1].color === color && this.board[r][c-2].color === color) ||
                    (r >= 2 && this.board[r-1][c].color === color && this.board[r-2][c].color === color)
                );
                this.spawnCandy(r, c, color, null);
            }
        }
    }

    spawnCandy(r, c, color, special = null) {
        const x = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
        const y = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;

        let textureKey = `candy_${color}`;
        if (special === 'striped_h') textureKey = `striped_h_${color}`;
        else if (special === 'striped_v') textureKey = `striped_v_${color}`;
        else if (special === 'color_bomb') textureKey = 'color_bomb';

        const sprite = this.add.sprite(x, y - 400, textureKey).setInteractive();
        sprite.setScale(0.9);

        const candy = { r, c, color, special, sprite };
        sprite.candyRef = candy;
        this.board[r][c] = candy;

        this.tweens.add({ targets: sprite, y: y, duration: 350, ease: 'Bounce.easeOut', delay: r * 20 + c * 8 });
        return candy;
    }

    onCandyClick(pointer, sprite) {
        if (!this.canMove || this.moves <= 0 || this.gameOver) return;
        const candy = sprite.candyRef;

        if (!this.selectedCandy) {
            this.selectedCandy = candy;
            this.tweens.add({ targets: sprite, scaleX: 1.08, scaleY: 1.08, duration: 150, yoyo: true, repeat: -1 });
            sfx.playPop();
        } else {
            const first = this.selectedCandy;
            this.tweens.killTweensOf(first.sprite);
            first.sprite.setScale(0.9);

            if (first === candy) { this.selectedCandy = null; return; }

            const isAdjacent = Math.abs(first.r - candy.r) + Math.abs(first.c - candy.c) === 1;

            if (isAdjacent) {
                this.swapCandies(first, candy);
            } else {
                this.selectedCandy = candy;
                this.tweens.add({ targets: sprite, scaleX: 1.08, scaleY: 1.08, duration: 150, yoyo: true, repeat: -1 });
                sfx.playPop();
            }
        }
    }

    swapCandies(c1, c2) {
        this.canMove = false;
        this.selectedCandy = null;

        this.board[c1.r][c1.c] = c2;
        this.board[c2.r][c2.c] = c1;

        const r1 = c1.r, col1 = c1.c;
        c1.r = c2.r; c1.c = c2.c;
        c2.r = r1; c2.c = col1;

        const x1 = BOARD_OFFSET_X + c1.c * TILE_SIZE + TILE_SIZE / 2;
        const y1 = BOARD_OFFSET_Y + c1.r * TILE_SIZE + TILE_SIZE / 2;
        const x2 = BOARD_OFFSET_X + c2.c * TILE_SIZE + TILE_SIZE / 2;
        const y2 = BOARD_OFFSET_Y + c2.r * TILE_SIZE + TILE_SIZE / 2;

        this.tweens.add({ targets: c1.sprite, x: x1, y: y1, duration: 180 });
        this.tweens.add({
            targets: c2.sprite, x: x2, y: y2, duration: 180,
            onComplete: () => this.checkSwapMatches(c1, c2)
        });
    }

    checkSwapMatches(c1, c2) {
        if (c1.special === 'color_bomb' || c2.special === 'color_bomb') {
            const bomb = c1.special === 'color_bomb' ? c1 : c2;
            const other = c1.special === 'color_bomb' ? c2 : c1;
            this.triggerColorBombEffect(bomb, other); return;
        }

        const matches = this.getMatches();

        if (matches.length > 0) {
            this.moves--;
            this.updateUI();
            this.processMatches(matches, c1, c2);
        } else {
            this.board[c1.r][c1.c] = c2;
            this.board[c2.r][c2.c] = c1;
            const r1 = c1.r, col1 = c1.c;
            c1.r = c2.r; c1.c = c2.c;
            c2.r = r1; c2.c = col1;

            const x1 = BOARD_OFFSET_X + c1.c * TILE_SIZE + TILE_SIZE / 2;
            const y1 = BOARD_OFFSET_Y + c1.r * TILE_SIZE + TILE_SIZE / 2;
            const x2 = BOARD_OFFSET_X + c2.c * TILE_SIZE + TILE_SIZE / 2;
            const y2 = BOARD_OFFSET_Y + c2.r * TILE_SIZE + TILE_SIZE / 2;

            this.tweens.add({ targets: c1.sprite, x: x1, y: y1, duration: 180 });
            this.tweens.add({
                targets: c2.sprite, x: x2, y: y2, duration: 180,
                onComplete: () => { this.canMove = true; }
            });
        }
    }

    getMatches() {
        const matches = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            let matchLen = 1;
            for (let c = 0; c < GRID_SIZE; c++) {
                let checkNext = false;
                if (c < GRID_SIZE - 1) {
                    const curr = this.board[r][c], next = this.board[r][c+1];
                    if (curr && next && curr.special !== 'color_bomb' && next.special !== 'color_bomb' && curr.color === next.color) {
                        matchLen++; checkNext = true;
                    }
                }
                if (!checkNext) {
                    if (matchLen >= 3) {
                        const group = [];
                        for (let k = 0; k < matchLen; k++) group.push(this.board[r][c - k]);
                        matches.push({ dir: 'h', group: group, len: matchLen });
                    }
                    matchLen = 1;
                }
            }
        }

        for (let c = 0; c < GRID_SIZE; c++) {
            let matchLen = 1;
            for (let r = 0; r < GRID_SIZE; r++) {
                let checkNext = false;
                if (r < GRID_SIZE - 1) {
                    const curr = this.board[r][c], next = this.board[r+1][c];
                    if (curr && next && curr.special !== 'color_bomb' && next.special !== 'color_bomb' && curr.color === next.color) {
                        matchLen++; checkNext = true;
                    }
                }
                if (!checkNext) {
                    if (matchLen >= 3) {
                        const group = [];
                        for (let k = 0; k < matchLen; k++) group.push(this.board[r - k][c]);
                        matches.push({ dir: 'v', group: group, len: matchLen });
                    }
                    matchLen = 1;
                }
            }
        }
        return matches;
    }

    processMatches(matches, swapC1 = null, swapC2 = null) {
        const toDestroy = new Set();
        const specialsToCreate = [];

        matches.forEach(m => {
            m.group.forEach(candy => toDestroy.add(candy));
            if (m.len >= 5) {
                let spawnTile = m.group.find(c => c === swapC1 || c === swapC2) || m.group[Math.floor(m.group.length / 2)];
                specialsToCreate.push({ tile: spawnTile, type: 'color_bomb', color: 99 });
            } else if (m.len === 4) {
                let spawnTile = m.group.find(c => c === swapC1 || c === swapC2) || m.group[1];
                let specialType = (m.dir === 'h') ? 'striped_h' : 'striped_v';
                specialsToCreate.push({ tile: spawnTile, type: specialType, color: spawnTile.color });
            }
        });

        const finalDestroySet = new Set();
        toDestroy.forEach(candy => this.expandExplosions(candy, finalDestroySet));
        specialsToCreate.forEach(sp => finalDestroySet.delete(sp.tile));

        if (finalDestroySet.size > 5) {
            this.showFloatingText('¡EXCELENTE!', 320, 320);
        }

        this.animateDestruction(finalDestroySet, specialsToCreate);
    }

    expandExplosions(candy, destroySet) {
        if (destroySet.has(candy)) return;
        destroySet.add(candy);

        if (candy.special === 'striped_h' || candy.special === 'striped_v') {
            sfx.playBlast();
            this.cameras.main.shake(120, 0.005);
            if (candy.special === 'striped_h') {
                for (let c = 0; c < GRID_SIZE; c++) if (this.board[candy.r][c]) this.expandExplosions(this.board[candy.r][c], destroySet);
            } else {
                for (let r = 0; r < GRID_SIZE; r++) if (this.board[r][candy.c]) this.expandExplosions(this.board[r][candy.c], destroySet);
            }
        }
    }

    triggerColorBombEffect(bomb, targetCandy) {
        this.moves--;
        this.updateUI();
        sfx.playBlast();
        this.cameras.main.shake(200, 0.008);
        this.showFloatingText('¡GENIAL!', 320, 320);

        const targetColor = targetCandy.color;
        const destroySet = new Set();
        destroySet.add(bomb);

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const tile = this.board[r][c];
                if (tile && (tile.color === targetColor || targetCandy.special === 'color_bomb')) {
                    destroySet.add(tile);
                }
            }
        }

        const finalSet = new Set();
        destroySet.forEach(c => this.expandExplosions(c, finalSet));
        this.animateDestruction(finalSet, []);
    }

    animateDestruction(destroySet, specialsToCreate) {
        this.score += destroySet.size * 60;
        this.updateUI();

        let count = 0;
        const total = destroySet.size;

        if (total === 0) { this.fallAndRefill(); return; }

        destroySet.forEach(candy => {
            const x = BOARD_OFFSET_X + candy.c * TILE_SIZE + TILE_SIZE / 2;
            const y = BOARD_OFFSET_Y + candy.r * TILE_SIZE + TILE_SIZE / 2;

            this.emitter.emitParticleAt(x, y, 6);
            sfx.playPop();

            this.tweens.add({
                targets: candy.sprite, scaleX: 0, scaleY: 0, alpha: 0, duration: 200,
                onComplete: () => {
                    candy.sprite.destroy();
                    this.board[candy.r][candy.c] = null;
                    count++;
                    if (count >= total) {
                        specialsToCreate.forEach(sp => {
                            this.spawnCandy(sp.tile.r, sp.tile.c, sp.color, sp.type);
                        });
                        this.time.delayedCall(100, () => this.fallAndRefill());
                    }
                }
            });
        });
    }

    fallAndRefill() {
        let maxFalls = 0;

        for (let c = 0; c < GRID_SIZE; c++) {
            let emptySpaces = 0;
            for (let r = GRID_SIZE - 1; r >= 0; r--) {
                if (this.board[r][c] === null) emptySpaces++;
                else if (emptySpaces > 0) {
                    const candy = this.board[r][c];
                    const newR = r + emptySpaces;

                    this.board[newR][c] = candy;
                    this.board[r][c] = null;
                    candy.r = newR;

                    const targetY = BOARD_OFFSET_Y + newR * TILE_SIZE + TILE_SIZE / 2;
                    maxFalls = Math.max(maxFalls, emptySpaces);

                    this.tweens.add({ targets: candy.sprite, y: targetY, duration: 180 + emptySpaces * 30, ease: 'Power2' });
                }
            }

            for (let i = 0; i < emptySpaces; i++) {
                const newR = emptySpaces - 1 - i;
                const color = Phaser.Math.Between(0, NUM_COLORS - 1);
                this.spawnCandy(newR, c, color, null);
            }
        }

        this.time.delayedCall(250 + maxFalls * 30, () => {
            const cascadeMatches = this.getMatches();
            if (cascadeMatches.length > 0) {
                this.processMatches(cascadeMatches);
            } else {
                this.canMove = true;
                this.checkGameStatus();
            }
        });
    }

    showFloatingText(msg, x, y) {
        const txt = this.add.text(x, y, msg, {
            fontFamily: 'Outfit', fontSize: '32px', fontWeight: '800', color: '#ffd700',
            stroke: '#ff2a75', strokeThickness: 5
        }).setOrigin(0.5);

        this.tweens.add({
            targets: txt, y: y - 60, alpha: 0, duration: 900, ease: 'Power1',
            onComplete: () => txt.destroy()
        });
    }

    calcularEstrellas(score, target) {
        if (score >= target * 1.6) return 3;
        if (score >= target * 1.3) return 2;
        if (score >= target) return 1;
        return 0;
    }

    checkGameStatus() {
        if (this.gameOver) return;

        if (this.score >= this.targetScore || this.moves <= 0) {
            this.gameOver = true;
            this.canMove = false;

            const estrellas = this.calcularEstrellas(this.score, this.targetScore);
            const gano = estrellas >= 1;

            if (gano) {
                sfx.playWin();
                if (nivelActual === nivelMaximo && nivelMaximo < TOTAL_NIVELES) {
                    nivelMaximo++;
                    localStorage.setItem('candy_nivel_maximo', nivelMaximo);
                }
            }

            this.mostrarModalResultado(gano, estrellas);
        }
    }

    mostrarModalResultado(gano, estrellas) {
        const modal = document.getElementById('result-modal');
        const title = document.getElementById('modal-status');
        const scoreTxt = document.getElementById('modal-score');
        const actionBtn = document.getElementById('modal-action-btn');

        title.innerText = gano ? '¡MUY BIEN!' : '¡CASI!';
        title.style.color = gano ? 'var(--accent-gold)' : 'var(--accent-pink)';
        scoreTxt.innerText = `Puntos: ${this.score}`;

        [1, 2, 3].forEach(i => {
            const starEl = document.getElementById(`star${i}`);
            starEl.classList.remove('active');
            if (i <= estrellas) {
                setTimeout(() => starEl.classList.add('active'), i * 200);
            }
        });

        if (gano) {
            actionBtn.innerHTML = '<i class="fa-solid fa-play"></i> Siguiente Nivel';
            actionBtn.onclick = () => {
                modal.classList.remove('active');
                if (nivelActual < TOTAL_NIVELES) iniciarNivel(nivelActual + 1);
                else volverAlMapa();
            };
        } else {
            actionBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Jugar de nuevo';
            actionBtn.onclick = () => {
                modal.classList.remove('active');
                iniciarNivel(nivelActual);
            };
        }

        modal.classList.add('active');
    }

    updateUI() {
        document.getElementById('score-val').innerText = this.score;
        document.getElementById('moves-val').innerText = this.moves;

        const maxBarScore = this.targetScore * 1.6;
        const pct = Math.min(100, Math.max(0, (this.score / maxBarScore) * 100));
        document.getElementById('progress-fill').style.width = `${pct}%`;

        const estrellas = this.calcularEstrellas(this.score, this.targetScore);
        
        const s1 = document.getElementById('m-star-1');
        const s2 = document.getElementById('m-star-2');
        const s3 = document.getElementById('m-star-3');

        if (estrellas >= 1) s1.classList.add('reached'); else s1.classList.remove('reached');
        if (estrellas >= 2) s2.classList.add('reached'); else s2.classList.remove('reached');
        if (estrellas >= 3) s3.classList.add('reached'); else s3.classList.remove('reached');
    }
}

const phaserConfig = {
    type: Phaser.AUTO,
    width: 640,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#180b30',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: Match3Scene
};

// Carga inicial
renderizarMapa();