"use strict";

const container = document.getElementById("monitor-container");
const screenEl = document.getElementById("screen");
const crt = document.getElementById("crt");
const iframe = document.getElementById("monitor-screen");
const powerBtn = document.getElementById("power");

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
crt.appendChild(canvas);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let width = 0;
let height = 0;
let frame = 0;
let running = true;
let powered = true;
let rafId = 0;

const noiseCanvas = document.createElement("canvas");
noiseCanvas.width = 160;
noiseCanvas.height = 90;
const noiseCtx = noiseCanvas.getContext("2d");
const noiseImage = noiseCtx.createImageData(noiseCanvas.width, noiseCanvas.height);

function updateScale() {
    const rect = screenEl.getBoundingClientRect();
    const virtualW = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--virtual-w")
    );
    container.style.setProperty("--scale", (rect.width / virtualW).toString());
    document.documentElement.style.setProperty("--scale", (rect.width / virtualW).toString());
}

function resize() {
    const rect = crt.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    width = rect.width;
    height = rect.height;

    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    updateScale();
}

function drawNoise() {
    const d = noiseImage.data;

    for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = Math.random() < 0.5 ? 18 : 0;
    }

    noiseCtx.putImageData(noiseImage, 0, 0);
}

function drawInterference(time) {
    const cycle = time % 7000;
    if (cycle < 350) {
        const progress = cycle / 350;
        const y = progress * (height + 60) - 30;
        const bandHeight = 8 + Math.sin(time * 0.02) * 4;
        const g = ctx.createLinearGradient(0, y - bandHeight, 0, y + bandHeight);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.5, "rgba(255,255,255,0.055)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, y - bandHeight, width, bandHeight * 2);
    }

    if (Math.random() < 0.008) {
        ctx.fillStyle = "rgba(210, 230, 255, 0.07)";
        ctx.fillRect(0, Math.random() * height, width, 1 + Math.random() * 2);
    }
}

function render(time) {
    rafId = requestAnimationFrame(render);
    frame++;
    ctx.clearRect(0, 0, width, height);

    if (frame % 3 === 0) drawNoise();

    ctx.globalAlpha = 0.16;
    ctx.drawImage(noiseCanvas, 0, 0, width, height);
    ctx.globalAlpha = 1;

    drawInterference(time);
}

function start() {
    if (running || reducedMotion.matches || !powered) return;
    running = true;
    rafId = requestAnimationFrame(render);
}

function stop() {
    running = false;
    cancelAnimationFrame(rafId);
}

function setPower(on) {
    powered = on;
    container.classList.toggle("off", !on);
    screenEl.classList.remove("on", "off");
    void screenEl.offsetWidth;
    screenEl.classList.add(on ? "on" : "off");

    if (on) {
        start();
    } else {
        window.setTimeout(() => { if (!powered) stop(); }, 500);
    }
}

powerBtn.addEventListener("click", () => setPower(!powered));

new ResizeObserver(resize).observe(container);
window.addEventListener("resize", resize);

document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop(); else start();
});

reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
        stop();
        ctx.clearRect(0, 0, width, height);
    } else {
        start();
    }
});

resize();
drawNoise();
screenEl.classList.add("on");

if (reducedMotion.matches) {
    running = false;
} else {
    rafId = requestAnimationFrame(render);
}
