const { readFileSync, writeFileSync, statSync } = require('fs-extra')
const path = require('path')

function userFilePath(id) {
    return path.join(process.cwd(), 'User', `${id}.json`)
}

function readUserFile(id) {
    try {
        statSync(userFilePath(id))
        const raw = readFileSync(userFilePath(id), 'utf-8')
        return JSON.parse(raw)
    } catch (e) {
        return null
    }
}

function writeUserFile(id, user) {
    writeFileSync(userFilePath(id), JSON.stringify(user, null, 2), 'utf-8')
}

function getSnapshot(id, platform) {
    const u = readUserFile(id)
    return u?.data?.snapshots?.[platform] ?? null
}

function saveSnapshot(id, platform, snapshot) {
    const u = readUserFile(id) ?? { data: { user_id: String(id), snapshots: {} } }
    if (!u.data) u.data = { user_id: String(id) }
    if (!u.data.snapshots) u.data.snapshots = {}
    u.data.snapshots[platform] = snapshot
    writeUserFile(id, u)
}

module.exports = { readUserFile, writeUserFile, getSnapshot, saveSnapshot, userFilePath }
