// === SISTEMA DE MAPA Y NIVELES ===
const TOTAL_NIVELES = 12;
let nivelMaximo = parseInt(localStorage.getItem('mamita_nivel_maximo')) || 1;
let nivelActual = 1;
let gameInstance = null;

function getConfigNivel(num) {
    return {
        movimientos: Math.max(25 - num, 10),
        objetivoScore: num * 1000
    };
}

function renderizarMapa() {
    const mapContainer = document.getElementById('map');
    const statusText = document.getElementById('status-text');
    mapContainer.innerHTML = '';

    statusText.innerText = `Nivel más alto: ${nivelMaximo}`;

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
            btn.innerHTML = '<i class="fa-solid fa-lock" style="font-size: 22px;"></i>';
            btn.onclick = () => alert('¡Completa los niveles anteriores primero!');
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
    
    // Pausamos la escena de Phaser al volver al mapa
    if (gameInstance) {
        gameInstance.scene.stop('Match3Scene');
    }
    
    renderizarMapa();
}

function reiniciarProgreso() {
    if (confirm('¿Quieres volver a empezar desde el Nivel 1?')) {
        localStorage.removeItem('mamita_nivel_maximo');
        nivelMaximo = 1;
        renderizarMapa();
    }
}

document.getElementById('back-to-map-btn').onclick = volverAlMapa;

// === AUDIO WEBAUDIO ===
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
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.08);
    }
    playStripedBlast() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.3);
    }
    playColorBombBlast() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(now + 0.5);
    }
}
const sfx = new SoundFX();

// === LÓGICA DE JUEGO PHASER 3 ===
const GRID_SIZE = 8;
const TILE_SIZE = 70;
const BOARD_OFFSET_X = 40;
const BOARD_OFFSET_Y = 40;
const NUM_COLORS = 5;
const CANDY_COLORS = [0xff3366, 0x3399ff, 0x33cc66, 0xffcc00, 0xaa33ff];

class Match3Scene extends Phaser.Scene {
    constructor() { super('Match3Scene'); }

    preload() { this.generateTextures(); }

    generateTextures() {
        CANDY_COLORS.forEach((color, idx) => {
            let g = this.make.graphics({x: 0, y: 0, add: false});
            g.fillStyle(color, 1); g.fillRoundedRect(4, 4, 56, 56, 16);
            g.fillStyle(0xffffff, 0.4); g.fillCircle(20, 20, 10);
            g.generateTexture(`candy_${idx}`, 64, 64); g.destroy();

            g = this.make.graphics({x: 0, y: 0, add: false});
            g.fillStyle(color, 1); g.fillRoundedRect(4, 4, 56, 56, 16);
            g.fillStyle(0xffffff, 0.9); g.fillRect(8, 18, 48, 8); g.fillRect(8, 38, 48, 8);
            g.fillStyle(0xffffff, 0.4); g.fillCircle(20, 14, 6);
            g.generateTexture(`striped_h_${idx}`, 64, 64); g.destroy();

            g = this.make.graphics({x: 0, y: 0, add: false});
            g.fillStyle(color, 1); g.fillRoundedRect(4, 4, 56, 56, 16);
            g.fillStyle(0xffffff, 0.9); g.fillRect(18, 8, 8, 48); g.fillRect(38, 8, 8, 48);
            g.fillStyle(0xffffff, 0.4); g.fillCircle(14, 20, 6);
            g.generateTexture(`striped_v_${idx}`, 64, 64); g.destroy();
        });

        let g = this.make.graphics({x: 0, y: 0, add: false});
        g.fillStyle(0x3d2314, 1); g.fillCircle(32, 32, 28);
        const sprinkles = [0xff0055, 0x00ccff, 0x33ff55, 0xffdd00, 0xff55ff, 0xffffff];
        sprinkles.forEach((sc, i) => {
            let angle = (i / sprinkles.length) * Math.PI * 2;
            g.fillStyle(sc, 1); g.fillCircle(32 + Math.cos(angle)*16, 32 + Math.sin(angle)*16, 6);
        });
        g.fillStyle(0xffffff, 0.9); g.fillCircle(32, 32, 6);
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
                bg.fillStyle((r + c) % 2 === 0 ? 0x1f153a : 0x170e2e, 0.8);
                bg.fillRoundedRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 12);
            }
        }
    }

    createEmitter() {
        this.emitter = this.add.particles(0, 0, 'sparkle', {
            speed: { min: 100, max: 300 }, scale: { start: 1, end: 0 },
            blendMode: 'ADD', lifespan: 500, emitting: false
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

        this.tweens.add({ targets: sprite, y: y, duration: 400, ease: 'Bounce.easeOut', delay: r * 30 + c * 10 });
        return candy;
    }

    onCandyClick(pointer, sprite) {
        if (!this.canMove || this.moves <= 0 || this.gameOver) return;
        const candy = sprite.candyRef;

        if (!this.selectedCandy) {
            this.selectedCandy = candy;
            this.tweens.add({ targets: sprite, scaleX: 1.1, scaleY: 1.1, duration: 150, yoyo: true, repeat: -1 });
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
                this.tweens.add({ targets: sprite, scaleX: 1.1, scaleY: 1.1, duration: 150, yoyo: true, repeat: -1 });
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

        this.tweens.add({ targets: c1.sprite, x: x1, y: y1, duration: 200 });
        this.tweens.add({
            targets: c2.sprite, x: x2, y: y2, duration: 200,
            onComplete: () => this.checkSwapMatches(c1, c2)
        });
    }

    checkSwapMatches(c1, c2) {
        if (c1.special === 'color_bomb' && c2.special === 'color_bomb') {
            this.triggerDoubleColorBomb(c1, c2); return;
        }

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

            this.tweens.add({ targets: c1.sprite, x: x1, y: y1, duration: 200 });
            this.tweens.add({
                targets: c2.sprite, x: x2, y: y2, duration: 200,
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

        this.animateDestruction(finalDestroySet, specialsToCreate);
    }

    expandExplosions(candy, destroySet) {
        if (destroySet.has(candy)) return;
        destroySet.add(candy);

        if (candy.special === 'striped_h') {
            this.triggerLineFX(candy.r, candy.c, 'h'); sfx.playStripedBlast();
            for (let c = 0; c < GRID_SIZE; c++) {
                const target = this.board[candy.r][c];
                if (target) this.expandExplosions(target, destroySet);
            }
        } else if (candy.special === 'striped_v') {
            this.triggerLineFX(candy.r, candy.c, 'v'); sfx.playStripedBlast();
            for (let r = 0; r < GRID_SIZE; r++) {
                const target = this.board[r][candy.c];
                if (target) this.expandExplosions(target, destroySet);
            }
        }
    }

    triggerLineFX(r, c, dir) {
        const fx = this.add.graphics();
        fx.fillStyle(0xffffff, 0.9);
        const centerX = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
        const centerY = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;

        if (dir === 'h') fx.fillRect(BOARD_OFFSET_X, centerY - 12, GRID_SIZE * TILE_SIZE, 24);
        else fx.fillRect(centerX - 12, BOARD_OFFSET_Y, 24, GRID_SIZE * TILE_SIZE);

        this.cameras.main.shake(150, 0.008);
        this.tweens.add({ targets: fx, alpha: 0, duration: 300, onComplete: () => fx.destroy() });
    }

    triggerColorBombEffect(bomb, targetCandy) {
        this.moves--;
        this.updateUI();

        const targetColor = targetCandy.color;
        const destroySet = new Set();
        destroySet.add(bomb);

        const bombX = BOARD_OFFSET_X + bomb.c * TILE_SIZE + TILE_SIZE / 2;
        const bombY = BOARD_OFFSET_Y + bomb.r * TILE_SIZE + TILE_SIZE / 2;

        sfx.playColorBombBlast();
        this.cameras.main.shake(250, 0.012);

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const tile = this.board[r][c];
                if (tile && (tile.color === targetColor || targetCandy.special === 'color_bomb')) {
                    destroySet.add(tile);
                    const tx = BOARD_OFFSET_X + c * TILE_SIZE + TILE_SIZE / 2;
                    const ty = BOARD_OFFSET_Y + r * TILE_SIZE + TILE_SIZE / 2;

                    const line = this.add.graphics();
                    line.lineStyle(4, CANDY_COLORS[targetColor] || 0xffea00, 1);
                    line.lineBetween(bombX, bombY, tx, ty);
                    this.tweens.add({ targets: line, alpha: 0, duration: 400, onComplete: () => line.destroy() });
                }
            }
        }

        const finalSet = new Set();
        destroySet.forEach(c => this.expandExplosions(c, finalSet));
        this.animateDestruction(finalSet, []);
    }

    triggerDoubleColorBomb(b1, b2) {
        this.moves--;
        this.updateUI();
        sfx.playColorBombBlast();
        this.cameras.main.shake(400, 0.02);

        const destroySet = new Set();
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.board[r][c]) destroySet.add(this.board[r][c]);
            }
        }
        this.animateDestruction(destroySet, []);
    }

    animateDestruction(destroySet, specialsToCreate) {
        this.score += destroySet.size * 50;
        this.updateUI();

        let count = 0;
        const total = destroySet.size;

        if (total === 0) { this.fallAndRefill(); return; }

        destroySet.forEach(candy => {
            const x = BOARD_OFFSET_X + candy.c * TILE_SIZE + TILE_SIZE / 2;
            const y = BOARD_OFFSET_Y + candy.r * TILE_SIZE + TILE_SIZE / 2;

            this.emitter.emitParticleAt(x, y, 8);

            this.tweens.add({
                targets: candy.sprite, scaleX: 0, scaleY: 0, alpha: 0, duration: 250,
                onComplete: () => {
                    candy.sprite.destroy();
                    this.board[candy.r][candy.c] = null;
                    count++;
                    if (count >= total) {
                        specialsToCreate.forEach(sp => {
                            this.spawnCandy(sp.tile.r, sp.tile.c, sp.color, sp.type);
                        });
                        this.time.delayedCall(150, () => this.fallAndRefill());
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

                    this.tweens.add({ targets: candy.sprite, y: targetY, duration: 250 + emptySpaces * 40, ease: 'Power2' });
                }
            }

            for (let i = 0; i < emptySpaces; i++) {
                const newR = emptySpaces - 1 - i;
                const color = Phaser.Math.Between(0, NUM_COLORS - 1);
                this.spawnCandy(newR, c, color, null);
            }
        }

        this.time.delayedCall(350 + maxFalls * 40, () => {
            const cascadeMatches = this.getMatches();
            if (cascadeMatches.length > 0) {
                this.processMatches(cascadeMatches);
            } else {
                this.canMove = true;
                this.checkGameStatus();
            }
        });
    }

    checkGameStatus() {
        if (this.gameOver) return;

        if (this.score >= this.targetScore || this.moves <= 0) {
            this.gameOver = true;
            this.canMove = false;

            const gano = this.score >= this.targetScore;
            let estrellas = 0;

            if (gano) {
                estrellas = 1;
                if (this.score >= this.targetScore * 1.4) estrellas = 2;
                if (this.score >= this.targetScore * 1.8) estrellas = 3;

                if (nivelActual === nivelMaximo && nivelMaximo < TOTAL_NIVELES) {
                    nivelMaximo++;
                    localStorage.setItem('mamita_nivel_maximo', nivelMaximo);
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

        title.innerText = gano ? '¡GANASTE!' : '¡SIN TURNOS!';
        title.style.color = gano ? 'var(--accent-gold)' : 'var(--accent-pink)';
        scoreTxt.innerText = `Puntos: ${this.score} / ${this.targetScore}`;

        [1, 2, 3].forEach(i => {
            const starEl = document.getElementById(`star${i}`);
            starEl.classList.remove('active');
            if (i <= estrellas) {
                setTimeout(() => starEl.classList.add('active'), i * 300);
            }
        });

        if (gano) {
            actionBtn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Siguiente Nivel';
            actionBtn.onclick = () => {
                modal.classList.remove('active');
                if (nivelActual < TOTAL_NIVELES) iniciarNivel(nivelActual + 1);
                else volverAlMapa();
            };
        } else {
            actionBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Intentar de nuevo';
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

        const maxBarScore = this.targetScore * 1.8;
        const pct = Math.min(100, Math.max(0, (this.score / maxBarScore) * 100));
        document.getElementById('progress-fill').style.width = `${pct}%`;

        const s1 = document.getElementById('m-star-1');
        const s2 = document.getElementById('m-star-2');
        const s3 = document.getElementById('m-star-3');

        if (this.score >= this.targetScore) s1.classList.add('reached');
        else s1.classList.remove('reached');

        if (this.score >= this.targetScore * 1.4) s2.classList.add('reached');
        else s2.classList.remove('reached');

        if (this.score >= this.targetScore * 1.8) s3.classList.add('reached');
        else s3.classList.remove('reached');
    }
}

const phaserConfig = {
    type: Phaser.AUTO,
    width: 640,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#0d071e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: Match3Scene
};

// Carga inicial exclusivamente del mapa
renderizarMapa();