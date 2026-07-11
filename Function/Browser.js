const puppeteer = require('puppeteer')

// 봇 프로세스당 puppeteer 브라우저 1개 공유 + 유휴 자동 종료.
let browserPromise = null
let idleTimer = null
const IDLE_MS = 10 * 60_000

function armIdleShutdown() {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
        idleTimer = null
        shutdownBrowser().catch(() => { })
    }, IDLE_MS)
    idleTimer.unref?.()
}

async function getBrowser() {
    if (browserPromise) {
        try {
            const b = await browserPromise
            const alive = typeof b?.connected === 'boolean' ? b.connected : b?.isConnected?.()
            if (alive) return b
        } catch (_) { /* recover below */ }
        browserPromise = null
    }
    browserPromise = puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
    return browserPromise
}

// html 문자열을 렌더해서 PNG 버퍼 반환. selector 지정 시 그 요소만 스크린샷.
async function renderHTMLToPNG(html, { width = 1200, height = 1600, deviceScaleFactor = 2, selector = null, timeout = 20_000 } = {}) {
    // 렌더 시작 전 유휴 타이머를 즉시 취소 — 진행 중인 렌더 도중 browser 가 닫히지 않게.
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
    const browser = await getBrowser()
    const p = await browser.newPage()
    try {
        await p.setViewport({ width, height, deviceScaleFactor })
        await p.setContent(html, { waitUntil: 'networkidle0', timeout })
        const el = selector ? await p.$(selector) : null
        const buf = await (el ? el.screenshot({ type: 'png' }) : p.screenshot({ type: 'png', fullPage: true }))
        return buf
    } finally {
        await p.close().catch(() => { })
        armIdleShutdown()
    }
}

async function shutdownBrowser() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
    if (!browserPromise) return
    const b = browserPromise
    browserPromise = null
    try {
        const bi = await b
        await bi.close()
        console.log('[browser] 유휴 종료')
    } catch (_) { }
}

module.exports = { renderHTMLToPNG, shutdownBrowser }
